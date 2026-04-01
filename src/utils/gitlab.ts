import { MergeRequest, EngineerStats, DashboardData, MRComplexity } from '../types/gitlab';
import { getCachedComplexity, setCachedComplexity } from './complexityCache';
import { gitlabGet, gitlabGetSafe, gitlabGetAllPages, runBatch } from './gitlabApi';

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

const groupPathCache = new Map<string, boolean>();

export async function fetchProjectPath(token: string, projectId: string): Promise<string> {
  if (projectId.includes('/')) return projectId;

  const project = await gitlabGetSafe<{ path_with_namespace: string }>(
    `/projects/${encodeURIComponent(projectId)}`,
    token,
    { path_with_namespace: projectId },
    { cacheTtl: 300_000 }
  );
  return project.path_with_namespace;
}

export async function isGroupPath(token: string, path: string): Promise<boolean> {
  const cached = groupPathCache.get(path);
  if (cached !== undefined) return cached;

  try {
    await gitlabGet(`/groups/${encodeURIComponent(path)}`, token, { cacheTtl: 300_000 });
    groupPathCache.set(path, true);
    return true;
  } catch {
    groupPathCache.set(path, false);
    return false;
  }
}

export async function fetchMergeRequests(
  token: string,
  projectId: string
): Promise<MergeRequest[]> {
  const isGroup = await isGroupPath(token, projectId);

  if (isGroup) {
    return fetchGroupMergeRequests(token, projectId);
  }
  return fetchSingleProjectMergeRequests(token, projectId);
}

async function fetchSingleProjectMergeRequests(
  token: string,
  projectId: string
): Promise<MergeRequest[]> {
  const mrs = await gitlabGetAllPages<MergeRequest>(
    `/projects/${encodeURIComponent(projectId)}/merge_requests?state=opened&order_by=updated_at&sort=desc`,
    token
  );
  return mrs;
}

async function fetchGroupMergeRequests(
  token: string,
  groupPath: string
): Promise<MergeRequest[]> {
  const mrs = await gitlabGetAllPages<MergeRequest>(
    `/groups/${encodeURIComponent(groupPath)}/merge_requests?state=opened&order_by=updated_at&sort=desc&include_subgroups=true`,
    token
  );
  return mrs;
}

export async function fetchMRComplexity(
  token: string,
  projectId: string,
  mrIid: number,
  actualProjectId?: number | string
): Promise<MRComplexity> {
  const targetProjectId = actualProjectId || projectId;
  const cacheKey = `${targetProjectId}_${mrIid}`;
  const cached = getCachedComplexity(cacheKey, mrIid);
  if (cached) return cached;

  try {
    const data = await gitlabGet<{ changes?: Array<{ diff?: string }> }>(
      `/projects/${encodeURIComponent(String(targetProjectId))}/merge_requests/${mrIid}/changes`,
      token,
      { timeoutMs: 12_000 }
    );

    const changes = data.changes || [];
    let filesChanged = changes.length;
    let linesAdded = 0;
    let linesDeleted = 0;

    for (const change of changes) {
      if (change.diff) {
        const lines = change.diff.split('\n');
        for (const line of lines) {
          if (line.charCodeAt(0) === 43 && line.charCodeAt(1) !== 43) linesAdded++;
          else if (line.charCodeAt(0) === 45 && line.charCodeAt(1) !== 45) linesDeleted++;
        }
      }
    }

    const complexityScore = calculateComplexityScore(filesChanged, linesAdded, linesDeleted);
    const complexity: MRComplexity = {
      id: mrIid,
      filesChanged,
      linesAdded,
      linesDeleted,
      totalLines: linesAdded + linesDeleted,
      complexityScore
    };

    setCachedComplexity(cacheKey, complexity);
    return complexity;
  } catch {
    const defaultComplexity: MRComplexity = {
      id: mrIid,
      filesChanged: 1,
      linesAdded: 10,
      linesDeleted: 5,
      totalLines: 15,
      complexityScore: 1.0
    };
    setCachedComplexity(cacheKey, defaultComplexity);
    return defaultComplexity;
  }
}

function calculateComplexityScore(filesChanged: number, linesAdded: number, linesDeleted: number): number {
  const totalLines = linesAdded + linesDeleted;
  let score = 0;
  score += filesChanged * 0.3;
  score += Math.log10(Math.max(totalLines, 1)) * 0.5;
  score += (linesDeleted / Math.max(totalLines, 1)) * 0.3;
  if (totalLines > 500) score += (totalLines - 500) / 1000;
  if (filesChanged > 5) score += (filesChanged - 5) * 0.1;
  return Math.max(0.1, Math.min(score, 10));
}

export async function fetchAllMRComplexities(
  token: string,
  projectId: string,
  mergeRequests: MergeRequest[],
  isGroup?: boolean
): Promise<MRComplexity[]> {
  const resolvedIsGroup = isGroup ?? await isGroupPath(token, projectId);
  const complexities: MRComplexity[] = [];
  const uncachedMRs: MergeRequest[] = [];

  for (const mr of mergeRequests) {
    const pid = resolvedIsGroup ? ((mr as any).project_id || projectId) : projectId;
    const cacheKey = `${pid}_${mr.iid}`;
    const cached = getCachedComplexity(cacheKey, mr.iid);
    if (cached) {
      complexities.push(cached);
    } else {
      uncachedMRs.push(mr);
    }
  }

  if (uncachedMRs.length > 0) {
    const fetched = await runBatch(
      uncachedMRs,
      mr => fetchMRComplexity(
        token,
        projectId,
        mr.iid,
        resolvedIsGroup ? (mr as any).project_id : undefined
      ),
      10,
      30
    );
    complexities.push(...fetched);
  }

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

  for (const c of mrComplexities) complexityMap.set(c.id, c);

  for (const mr of mergeRequests) {
    if (!userMap.has(mr.author.id)) {
      userMap.set(mr.author.id, {
        user: mr.author, openMRs: 0, draftMRs: 0,
        assignedReviews: 0, reviewComplexity: 0, authorComplexity: 0,
      });
    }
    for (const reviewer of mr.reviewers) {
      if (!userMap.has(reviewer.id)) {
        userMap.set(reviewer.id, {
          user: reviewer, openMRs: 0, draftMRs: 0,
          assignedReviews: 0, reviewComplexity: 0, authorComplexity: 0,
        });
      }
    }
    for (const assignee of mr.assignees) {
      if (!userMap.has(assignee.id)) {
        userMap.set(assignee.id, {
          user: assignee, openMRs: 0, draftMRs: 0,
          assignedReviews: 0, reviewComplexity: 0, authorComplexity: 0,
        });
      }
    }
  }

  for (const mr of mergeRequests) {
    const complexity = complexityMap.get(mr.iid) || { complexityScore: 1.0 };
    const authorStats = userMap.get(mr.author.id);
    if (authorStats) {
      if (mr.draft) authorStats.draftMRs++;
      else authorStats.openMRs++;
      authorStats.authorComplexity += complexity.complexityScore;
    }
    for (const reviewer of mr.reviewers) {
      const reviewerStats = userMap.get(reviewer.id);
      if (reviewerStats) {
        reviewerStats.assignedReviews++;
        reviewerStats.reviewComplexity += complexity.complexityScore;
      }
    }
  }

  return Array.from(userMap.values()).sort((a, b) =>
    calculateWorkloadScore(b) - calculateWorkloadScore(a)
  );
}

export function calculateWorkloadScore(stats: EngineerStats): number {
  return (stats.assignedReviews * 2) + stats.openMRs + (stats.draftMRs * 0.5)
    + (stats.reviewComplexity * 0.5) + (stats.authorComplexity * 0.3);
}

export function createReviewDistribution(engineerStats: EngineerStats[]) {
  const colors = [
    '#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
  ];

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
  const eligible = engineerStats.filter(s => isEligibleReviewer(s.user.username));
  if (eligible.length === 0) return null;

  return eligible.reduce((min, s) =>
    calculateWorkloadScore(s) < calculateWorkloadScore(min) ? s : min
  , eligible[0]);
}

export async function fetchBasicDashboardData(
  token: string,
  projectId: string
): Promise<DashboardData> {
  const mergeRequests = await fetchMergeRequests(token, projectId);
  const engineerStats = processEngineerStats(mergeRequests, []);
  const reviewDistribution = createReviewDistribution(engineerStats);

  return { mergeRequests, engineerStats, reviewDistribution, mrComplexities: [] };
}

export async function fetchEnhancedDashboardData(
  token: string,
  projectId: string,
  basicData: DashboardData
): Promise<DashboardData> {
  try {
    const isGroup = await isGroupPath(token, projectId);
    const mrComplexities = await fetchAllMRComplexities(token, projectId, basicData.mergeRequests, isGroup);
    const engineerStats = processEngineerStats(basicData.mergeRequests, mrComplexities);
    const reviewDistribution = createReviewDistribution(engineerStats);

    return {
      mergeRequests: basicData.mergeRequests,
      engineerStats,
      reviewDistribution,
      mrComplexities,
    };
  } catch {
    return basicData;
  }
}

export async function fetchDashboardData(
  token: string,
  projectId: string
): Promise<DashboardData> {
  return fetchBasicDashboardData(token, projectId);
}
