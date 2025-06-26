import { GitLabMR, GitLabNote, GitLabChanges } from './types';

const API_BASE = 'https://gitlab.com/api/v4';

async function isGroupPath(token: string, path: string): Promise<boolean> {
  try {
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

export async function fetchMRsInTimeframe(
  token: string,
  projectId: string,
  timeframe: '7d' | '30d' | '90d'
): Promise<GitLabMR[]> {
  const cutoffDate = getTimeframeCutoff(timeframe);
  const cutoffISOString = cutoffDate.toISOString();

  console.log(`Fetching MRs updated after ${cutoffISOString}`);

  try {
    // Check if this is a group path
    const isGroup = await isGroupPath(token, projectId);
    
    if (isGroup) {
      console.log(`Detected group path: ${projectId}, fetching MRs from all projects in group`);
      return await fetchGroupMRsInTimeframe(token, projectId, cutoffISOString);
    } else {
      console.log(`Detected project path: ${projectId}, fetching MRs from single project`);
      return await fetchSingleProjectMRsInTimeframe(token, projectId, cutoffISOString);
    }
  } catch (error) {
    console.error('Failed to fetch MRs:', error);
    throw new Error(`Failed to fetch MRs: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function fetchSingleProjectMRsInTimeframe(
  token: string,
  projectId: string,
  cutoffISOString: string
): Promise<GitLabMR[]> {
  const allMRs: GitLabMR[] = [];
  const states = ['opened', 'merged'];
  const perPage = 100;
  const maxPages = 10;

  const encodedProjectId = encodeURIComponent(projectId);
  console.log(`Using encoded project ID: ${encodedProjectId}`);

  for (const state of states) {
    console.log(`Fetching ${state} MRs...`);
    
    for (let page = 1; page <= maxPages; page++) {
      const params = new URLSearchParams({
        state,
        updated_after: cutoffISOString,
        per_page: perPage.toString(),
        page: page.toString(),
        order_by: 'updated_at',
        sort: 'desc'
      });
      
      const url = `${API_BASE}/projects/${encodedProjectId}/merge_requests?${params.toString()}`;
      console.log(`Fetching page ${page} for ${state} MRs...`);
      
      try {
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(15000)
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Failed to fetch ${state} MRs page ${page}: ${response.status} - ${errorText}`);
          break;
        }

        const mrs = await response.json();
        if (mrs.length === 0) {
          console.log(`  No more MRs found for ${state} on page ${page}`);
          break;
        }

        allMRs.push(...mrs);
        console.log(`  Added ${mrs.length} MRs from page ${page} (${state}). Total so far: ${allMRs.length}`);
        
        if (mrs.length < perPage) {
          console.log(`  Reached end of ${state} MRs (got ${mrs.length} < ${perPage})`);
          break;
        }
      } catch (fetchError) {
        console.error(`Network error fetching ${state} MRs page ${page}:`, fetchError);
        break;
      }
    }
  }

  return filterAndDeduplicateMRs(allMRs, getTimeframeCutoff(getTimeframeFromCutoff(cutoffISOString)));
}

async function fetchGroupMRsInTimeframe(
  token: string,
  groupPath: string,
  cutoffISOString: string
): Promise<GitLabMR[]> {
  const projects = await fetchGroupProjects(token, groupPath);
  const allMRs: GitLabMR[] = [];
  
  console.log(`Fetching MRs from ${projects.length} projects in group...`);
  
  // Fetch MRs from each project in parallel (in batches)
  const batchSize = 5;
  for (let i = 0; i < projects.length; i += batchSize) {
    const batch = projects.slice(i, i + batchSize);
    console.log(`Processing project batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(projects.length/batchSize)}`);
    
    const batchPromises = batch.map(async (project) => {
      try {
        const projectMRs = await fetchSingleProjectMRsInTimeframe(token, project.id.toString(), cutoffISOString);
        console.log(`  ${project.name}: ${projectMRs.length} MRs`);
        return projectMRs;
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

  return filterAndDeduplicateMRs(allMRs, getTimeframeCutoff(getTimeframeFromCutoff(cutoffISOString)));
}

function filterAndDeduplicateMRs(allMRs: GitLabMR[], cutoffDate: Date): GitLabMR[] {
  // Remove duplicates
  const uniqueMRs = allMRs.reduce((acc, mr) => {
    if (!acc.find(existing => existing.id === mr.id)) {
      acc.push(mr);
    }
    return acc;
  }, [] as GitLabMR[]);

  console.log(`Fetched ${uniqueMRs.length} unique MRs (from ${allMRs.length} total including duplicates)`);
  
  // Filter MRs to only include those actually within the timeframe
  const filteredMRs = uniqueMRs.filter(mr => {
    const mrDate = new Date(mr.updated_at || mr.created_at);
    return mrDate >= cutoffDate;
  });
  
  console.log(`Filtered to ${filteredMRs.length} MRs actually within timeframe`);
  return filteredMRs;
}

export async function fetchMRNotes(
  token: string,
  projectId: string,
  mrIid: number
): Promise<GitLabNote[]> {
  try {
    const encodedProjectId = encodeURIComponent(projectId);
    
    const response = await fetch(
      `${API_BASE}/projects/${encodedProjectId}/merge_requests/${mrIid}/notes?per_page=100&sort=asc`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(8000)
      }
    );

    if (!response.ok) {
      console.warn(`Failed to fetch notes for MR ${mrIid}: ${response.status}`);
      return [];
    }

    return response.json();
  } catch (error) {
    console.warn(`Error fetching notes for MR ${mrIid}:`, error);
    return [];
  }
}

export async function fetchMRChanges(
  token: string,
  projectId: string,
  mrIid: number
): Promise<GitLabChanges | null> {
  try {
    const encodedProjectId = encodeURIComponent(projectId);
    
    const response = await fetch(
      `${API_BASE}/projects/${encodedProjectId}/merge_requests/${mrIid}/changes`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(8000)
      }
    );

    if (!response.ok) {
      console.warn(`Failed to fetch changes for MR ${mrIid}: ${response.status}`);
      return null;
    }

    return response.json();
  } catch (error) {
    console.warn(`Error fetching changes for MR ${mrIid}:`, error);
    return null;
  }
}

function getTimeframeCutoff(timeframe: '7d' | '30d' | '90d'): Date {
  const now = new Date();
  const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
  return new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
}

function getTimeframeFromCutoff(cutoffISOString: string): '7d' | '30d' | '90d' {
  const cutoffDate = new Date(cutoffISOString);
  const now = new Date();
  const daysDiff = (now.getTime() - cutoffDate.getTime()) / (1000 * 60 * 60 * 24);
  
  if (daysDiff <= 7) return '7d';
  if (daysDiff <= 30) return '30d';
  return '90d';
}