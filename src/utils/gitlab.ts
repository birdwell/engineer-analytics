import { MergeRequest, EngineerStats, DashboardData, MRComplexity } from '../types/gitlab';
import { getCachedComplexity, setCachedComplexity } from './complexityCache';

const API_BASE = 'https://gitlab.com/api/v4';

// Hardcoded list of potential reviewers (only for recommendations)
const POTENTIAL_REVIEWERS = [
  'mahents.piwowar',
  'andrew.duncan.contractor',
  'andrew.kovalchuk.contractor',
  'jason.boyett',
  'james.streets',
  'jonathan.sweeney',
  'pius.businge',
  'rami.syriani'
];

// Cache for project path lookups
const projectPathCache = new Map<string, string>();

export async function fetchProjectPath(token: string, projectId: string): Promise<string> {
  // If it's already in path format, return as-is
  if (projectId.includes('/')) {
    return projectId;
  }

  // Check cache first
  if (projectPathCache.has(projectId)) {
    return projectPathCache.get(projectId)!;
  }

  try {
    const response = await fetch(
      `${API_BASE}/projects/${encodeURIComponent(projectId)}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch project info: ${response.status}`);
    }

    const project = await response.json();
    const fullPath = project.path_with_namespace;
    
    // Cache the result
    projectPathCache.set(projectId, fullPath);
    
    return fullPath;
  } catch (error) {
    console.warn('Failed to fetch project path:', error);
    // Return the original projectId as fallback
    return projectId;
  }
}

async function isGroupPath(token: string, path: string): Promise<boolean> {
  try {
    // Try to fetch as a group first
    const groupResponse = await fetch(
      `${API_BASE}/groups/${encodeURIComponent(path)}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    return groupResponse.ok;
  } catch (error) {
    return false;
  }
}

async function fetchGroupProjects(token: string, groupPath: string): Promise<any[]> {
  try {
    console.log(`Fetching projects for group: ${groupPath}`);
    
    const allProjects: any[] = [];
    let page = 1;
    const perPage = 100;
    
    while (true) {
      const response = await fetch(
        `${API_BASE}/groups/${encodeURIComponent(groupPath)}/projects?per_page=${perPage}&page=${page}&include_subgroups=true&archived=false`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch group projects: ${response.status}`);
      }

      const projects = await response.json();
      if (projects.length === 0) break;
      
      allProjects.push(...projects);
      console.log(`Fetched ${projects.length} projects from page ${page}, total: ${allProjects.length}`);
      
      if (projects.length < perPage) break;
      page++;
    }
    
    console.log(`Found ${allProjects.length} total projects in group ${groupPath}`);
    return allProjects;
  } catch (error) {
    console.error('Failed to fetch group projects:', error);
    throw error;
  }
}

export async function fetchMergeRequests(
  token: string,
  projectId: string
): Promise<MergeRequest[]> {
  console.log('Dashboard: Fetching current open MRs...');
  
  try {
    // Check if this is a group path
    const isGroup = await isGroupPath(token, projectId);
    
    if (isGroup) {
      console.log(`Detected group path: ${projectId}, fetching MRs from all projects in group`);
      return await fetchGroupMergeRequests(token, projectId);
    } else {
      console.log(`Detected project path: ${projectId}, fetching MRs from single project`);
      return await fetchSingleProjectMergeRequests(token, projectId);
    }
  } catch (error) {
    console.error('Dashboard: Failed to fetch MRs:', error);
    throw error;
  }
}

async function fetchSingleProjectMergeRequests(
  token: string,
  projectId: string
): Promise<MergeRequest[]> {
  const response = await fetch(
    `${API_BASE}/projects/${encodeURIComponent(projectId)}/merge_requests?state=opened&per_page=100`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`GitLab API error: ${response.status} ${response.statusText}`);
  }

  const mrs = await response.json();
  console.log(`Dashboard: Found ${mrs.length} open MRs in project`);
  
  // Log breakdown for debugging
  const openMRs = mrs.filter((mr: any) => !mr.draft);
  const draftMRs = mrs.filter((mr: any) => mr.draft);
  console.log(`Dashboard: ${openMRs.length} open (non-draft), ${draftMRs.length} draft MRs`);
  
  return mrs;
}

async function fetchGroupMergeRequests(
  token: string,
  groupPath: string
): Promise<MergeRequest[]> {
  const projects = await fetchGroupProjects(token, groupPath);
  const allMRs: MergeRequest[] = [];
  
  console.log(`Fetching MRs from ${projects.length} projects in group...`);
  
  // Fetch MRs from each project in parallel (in batches to avoid overwhelming the API)
  const batchSize = 5;
  for (let i = 0; i < projects.length; i += batchSize) {
    const batch = projects.slice(i, i + batchSize);
    console.log(`Processing project batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(projects.length/batchSize)}`);
    
    const batchPromises = batch.map(async (project) => {
      try {
        const response = await fetch(
          `${API_BASE}/projects/${project.id}/merge_requests?state=opened&per_page=100`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            signal: AbortSignal.timeout(10000) // 10 second timeout per project
          }
        );

        if (response.ok) {
          const mrs = await response.json();
          console.log(`  ${project.name}: ${mrs.length} MRs`);
          return mrs;
        } else {
          console.warn(`  ${project.name}: Failed to fetch MRs (${response.status})`);
          return [];
        }
      } catch (error) {
        console.warn(`  ${project.name}: Error fetching MRs:`, error);
        return [];
      }
    });

    const batchResults = await Promise.allSettled(batchPromises);
    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        allMRs.push(...result.value);
      } else {
        console.warn(`Failed to fetch MRs for project ${batch[index].name}:`, result.reason);
      }
    });

    // Small delay between batches
    if (i + batchSize < projects.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  console.log(`Dashboard: Found ${allMRs.length} total open MRs across ${projects.length} projects`);
  
  // Log breakdown for debugging
  const openMRs = allMRs.filter((mr: any) => !mr.draft);
  const draftMRs = allMRs.filter((mr: any) => mr.draft);
  console.log(`Dashboard: ${openMRs.length} open (non-draft), ${draftMRs.length} draft MRs`);
  
  return allMRs;
}

export async function fetchMRComplexity(
  token: string,
  projectId: string,
  mrIid: number,
  actualProjectId?: number
): Promise<MRComplexity> {
  // For group analysis, we need to use the actual project ID for the API call
  const targetProjectId = actualProjectId || projectId;
  
  // Check cache first - use a composite key for group scenarios
  const cacheKey = actualProjectId ? `${actualProjectId}_${mrIid}` : `${projectId}_${mrIid}`;
  const cached = getCachedComplexity(cacheKey, mrIid);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(
      `${API_BASE}/projects/${encodeURIComponent(targetProjectId)}/merge_requests/${mrIid}/changes`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      // If we can't fetch changes, return a default complexity
      const defaultComplexity = {
        id: mrIid,
        filesChanged: 1,
        linesAdded: 10,
        linesDeleted: 5,
        totalLines: 15,
        complexityScore: 1.0
      };
      
      // Cache the default complexity to avoid repeated API calls
      setCachedComplexity(cacheKey, defaultComplexity);
      return defaultComplexity;
    }

    const data = await response.json();
    const changes = data.changes || [];
    
    let filesChanged = changes.length;
    let linesAdded = 0;
    let linesDeleted = 0;

    changes.forEach((change: any) => {
      if (change.diff) {
        const lines = change.diff.split('\n');
        lines.forEach((line: string) => {
          if (line.startsWith('+') && !line.startsWith('+++')) {
            linesAdded++;
          } else if (line.startsWith('-') && !line.startsWith('---')) {
            linesDeleted++;
          }
        });
      }
    });

    const totalLines = linesAdded + linesDeleted;
    
    // Calculate complexity score based on multiple factors
    const complexityScore = calculateComplexityScore(filesChanged, linesAdded, linesDeleted);

    const complexity = {
      id: mrIid,
      filesChanged,
      linesAdded,
      linesDeleted,
      totalLines,
      complexityScore
    };

    // Cache the complexity data
    setCachedComplexity(cacheKey, complexity);
    
    return complexity;
  } catch (error) {
    console.warn('Failed to fetch MR complexity:', error);
    // Return default complexity if API call fails
    const defaultComplexity = {
      id: mrIid,
      filesChanged: 1,
      linesAdded: 10,
      linesDeleted: 5,
      totalLines: 15,
      complexityScore: 1.0
    };
    
    // Cache the default complexity to avoid repeated failures
    setCachedComplexity(cacheKey, defaultComplexity);
    return defaultComplexity;
  }
}

function calculateComplexityScore(filesChanged: number, linesAdded: number, linesDeleted: number): number {
  const totalLines = linesAdded + linesDeleted;
  
  // Base complexity factors
  let score = 0;
  
  // File count impact (more files = more context switching)
  score += filesChanged * 0.3;
  
  // Line count impact (logarithmic scale to prevent extreme values)
  score += Math.log10(Math.max(totalLines, 1)) * 0.5;
  
  // Deletion complexity (deletions often require more understanding)
  score += (linesDeleted / Math.max(totalLines, 1)) * 0.3;
  
  // Large change penalty (changes over 500 lines are significantly harder)
  if (totalLines > 500) {
    score += (totalLines - 500) / 1000;
  }
  
  // Multiple file penalty (changes across many files are harder to review)
  if (filesChanged > 5) {
    score += (filesChanged - 5) * 0.1;
  }
  
  // Ensure minimum complexity of 0.1 and reasonable maximum
  return Math.max(0.1, Math.min(score, 10));
}

export async function fetchAllMRComplexities(
  token: string,
  projectId: string,
  mergeRequests: MergeRequest[]
): Promise<MRComplexity[]> {
  const complexities: MRComplexity[] = [];
  const uncachedMRs: MergeRequest[] = [];
  
  // Check if this is a group analysis
  const isGroup = await isGroupPath(token, projectId);
  
  // First, check which MRs we already have cached
  for (const mr of mergeRequests) {
    const cacheKey = isGroup ? `${mr.project_id || projectId}_${mr.iid}` : `${projectId}_${mr.iid}`;
    const cached = getCachedComplexity(cacheKey, mr.iid);
    if (cached) {
      complexities.push(cached);
    } else {
      uncachedMRs.push(mr);
    }
  }
  
  // Only fetch complexity for uncached MRs
  if (uncachedMRs.length > 0) {
    console.log(`Loading complexity for ${uncachedMRs.length} MRs (${complexities.length} cached)`);
    
    // Fetch complexities in smaller batches to avoid overwhelming the API
    const batchSize = 5;
    for (let i = 0; i < uncachedMRs.length; i += batchSize) {
      const batch = uncachedMRs.slice(i, i + batchSize);
      const batchPromises = batch.map(mr => 
        fetchMRComplexity(
          token, 
          projectId, 
          mr.iid, 
          isGroup ? (mr as any).project_id : undefined
        )
      );
      
      try {
        const batchResults = await Promise.allSettled(batchPromises);
        
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            complexities.push(result.value);
          } else {
            console.warn(`Failed to fetch complexity for MR ${batch[index].iid}:`, result.reason);
            // Add default complexity for failed requests
            const defaultComplexity = {
              id: batch[index].iid,
              filesChanged: 1,
              linesAdded: 10,
              linesDeleted: 5,
              totalLines: 15,
              complexityScore: 1.0
            };
            complexities.push(defaultComplexity);
            const cacheKey = isGroup ? `${(batch[index] as any).project_id || projectId}_${batch[index].iid}` : `${projectId}_${batch[index].iid}`;
            setCachedComplexity(cacheKey, defaultComplexity);
          }
        });
      } catch (error) {
        console.warn('Failed to fetch batch of MR complexities:', error);
        // Add default complexities for the entire batch
        batch.forEach(mr => {
          const defaultComplexity = {
            id: mr.iid,
            filesChanged: 1,
            linesAdded: 10,
            linesDeleted: 5,
            totalLines: 15,
            complexityScore: 1.0
          };
          complexities.push(defaultComplexity);
          const cacheKey = isGroup ? `${(mr as any).project_id || projectId}_${mr.iid}` : `${projectId}_${mr.iid}`;
          setCachedComplexity(cacheKey, defaultComplexity);
        });
      }
      
      // Small delay between batches
      if (i + batchSize < uncachedMRs.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  } else {
    console.log(`All ${complexities.length} MR complexities loaded from cache`);
  }
  
  // Sort complexities to match the original MR order
  const complexityMap = new Map(complexities.map(c => [c.id, c]));
  return mergeRequests.map(mr => complexityMap.get(mr.iid)).filter(Boolean) as MRComplexity[];
}

function isEligibleReviewer(username: string): boolean {
  return POTENTIAL_REVIEWERS.includes(username);
}

export function processEngineerStats(
  mergeRequests: MergeRequest[], 
  mrComplexities: MRComplexity[] = []
): EngineerStats[] {
  const userMap = new Map<number, EngineerStats>();
  const complexityMap = new Map<number, MRComplexity>();
  
  // Create complexity lookup map
  mrComplexities.forEach(complexity => {
    complexityMap.set(complexity.id, complexity);
  });

  // Initialize all users from authors and reviewers (no filtering here)
  mergeRequests.forEach(mr => {
    // Add author (always include authors)
    if (!userMap.has(mr.author.id)) {
      userMap.set(mr.author.id, {
        user: mr.author,
        openMRs: 0,
        draftMRs: 0,
        assignedReviews: 0,
        reviewComplexity: 0,
        authorComplexity: 0,
      });
    }

    // Add all reviewers (no filtering for stats display)
    mr.reviewers.forEach(reviewer => {
      if (!userMap.has(reviewer.id)) {
        userMap.set(reviewer.id, {
          user: reviewer,
          openMRs: 0,
          draftMRs: 0,
          assignedReviews: 0,
          reviewComplexity: 0,
          authorComplexity: 0,
        });
      }
    });

    // Add all assignees (no filtering for stats display)
    mr.assignees.forEach(assignee => {
      if (!userMap.has(assignee.id)) {
        userMap.set(assignee.id, {
          user: assignee,
          openMRs: 0,
          draftMRs: 0,
          assignedReviews: 0,
          reviewComplexity: 0,
          authorComplexity: 0,
        });
      }
    });
  });

  // Count MRs, reviews, and calculate complexity for all users
  mergeRequests.forEach(mr => {
    const complexity = complexityMap.get(mr.iid) || { complexityScore: 1.0 };
    
    // Count open MRs and draft MRs by author
    const authorStats = userMap.get(mr.author.id);
    if (authorStats) {
      if (mr.draft) {
        authorStats.draftMRs++;
      } else {
        authorStats.openMRs++;
      }
      authorStats.authorComplexity += complexity.complexityScore;
    }

    // Count assigned reviews and their complexity for all reviewers
    mr.reviewers.forEach(reviewer => {
      const reviewerStats = userMap.get(reviewer.id);
      if (reviewerStats) {
        reviewerStats.assignedReviews++;
        reviewerStats.reviewComplexity += complexity.complexityScore;
      }
    });
  });

  return Array.from(userMap.values()).sort((a, b) => {
    const aWorkload = calculateWorkloadScore(a);
    const bWorkload = calculateWorkloadScore(b);
    return bWorkload - aWorkload;
  });
}

export function calculateWorkloadScore(stats: EngineerStats): number {
  // Enhanced workload calculation that includes complexity
  const baseScore = (stats.assignedReviews * 2) + stats.openMRs + (stats.draftMRs * 0.5);
  const complexityBonus = (stats.reviewComplexity * 0.5) + (stats.authorComplexity * 0.3);
  
  return baseScore + complexityBonus;
}

export function createReviewDistribution(engineerStats: EngineerStats[]) {
  const colors = [
    '#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
  ];

  // Show all reviewers in the distribution chart (no filtering)
  return engineerStats
    .filter(stat => stat.assignedReviews > 0)
    .sort((a, b) => b.assignedReviews - a.assignedReviews)
    .map((stat, index) => ({
      name: stat.user.name,
      value: stat.assignedReviews,
      color: colors[index % colors.length],
    }));
}

export function getNextReviewer(engineerStats: EngineerStats[]): EngineerStats | null {
  if (engineerStats.length === 0) return null;

  // Filter to only eligible reviewers for recommendations
  const eligibleReviewers = engineerStats.filter(stat => 
    isEligibleReviewer(stat.user.username)
  );

  if (eligibleReviewers.length === 0) return null;

  // Calculate workload score (lower is better for assignment)
  const reviewersWithScore = eligibleReviewers.map(stat => ({
    ...stat,
    workloadScore: calculateWorkloadScore(stat)
  }));

  // Sort by workload score (ascending - least loaded first)
  reviewersWithScore.sort((a, b) => a.workloadScore - b.workloadScore);

  return reviewersWithScore[0];
}

// Fast initial load - just basic data without complexity
export async function fetchBasicDashboardData(
  token: string,
  projectId: string
): Promise<DashboardData> {
  try {
    console.log('Fetching basic dashboard data...');
    const mergeRequests = await fetchMergeRequests(token, projectId);
    console.log(`Loaded ${mergeRequests.length} merge requests`);
    
    const engineerStats = processEngineerStats(mergeRequests, []); // No complexity data initially
    const reviewDistribution = createReviewDistribution(engineerStats);
    console.log(`Processed stats for ${engineerStats.length} engineers`);

    return {
      mergeRequests,
      engineerStats,
      reviewDistribution,
      mrComplexities: [], // Empty initially
    };
  } catch (error) {
    console.error('Failed to fetch basic dashboard data:', error);
    throw error;
  }
}

// Enhanced load - adds complexity data
export async function fetchEnhancedDashboardData(
  token: string,
  projectId: string,
  basicData: DashboardData
): Promise<DashboardData> {
  try {
    console.log('Fetching enhanced dashboard data with complexity...');
    const mrComplexities = await fetchAllMRComplexities(token, projectId, basicData.mergeRequests);
    console.log(`Loaded complexity data for ${mrComplexities.length} MRs`);
    
    const engineerStats = processEngineerStats(basicData.mergeRequests, mrComplexities);
    const reviewDistribution = createReviewDistribution(engineerStats);

    return {
      mergeRequests: basicData.mergeRequests,
      engineerStats,
      reviewDistribution,
      mrComplexities,
    };
  } catch (error) {
    console.error('Failed to fetch enhanced dashboard data:', error);
    // Return basic data if enhancement fails
    return basicData;
  }
}

export async function fetchDashboardData(
  token: string,
  projectId: string
): Promise<DashboardData> {
  // For backward compatibility, use the basic load
  return fetchBasicDashboardData(token, projectId);
}