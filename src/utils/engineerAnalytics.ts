import { MergeRequest } from '../types/gitlab';
import { getCachedEngineerData, setCachedEngineerData } from './engineerCache';
import { analyzeCommentsFromNotes, type CommentAnalysisResult } from './commentAnalysis';
import { calculateResponseTimeFromNotes, type ResponseTimeMetrics } from './responseTimeAnalysis';
import { fetchNotesForMRs, getHumanNotes, type FetchedMRNotes } from './notesFetcher';
import { gitlabGetAllPages } from './gitlabApi';

export interface EngineerMRHistory {
  authoredMRs: MergeRequest[];
  reviewedMRs: MergeRequest[];
  mergedMRs: MergeRequest[];
  weeklyStats: Array<{
    week: string;
    authored: number;
    reviewed: number;
    merged: number;
  }>;
  avgCommentsPerAuthoredMR: number;
  avgReviewCyclesAsAuthor: number;
  avgTimeToMerge: number;
  avgResponseTime: number;
  totalComments: number;
  commentAnalysis: CommentAnalysisResult;
  responseTimeMetrics: ResponseTimeMetrics;
}

function getTimeframeCutoff(timeframe: '7d' | '30d' | '90d'): Date {
  const now = new Date();
  const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
  return new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
}

const EMPTY_COMMENT_ANALYSIS: CommentAnalysisResult = {
  totalComments: 0,
  categorizedComments: {},
  topIssues: [],
  recommendations: [],
  overallScore: 100
};

const EMPTY_RESPONSE_METRICS: ResponseTimeMetrics = {
  avgResponseTime: 0,
  medianResponseTime: 0,
  fastestResponse: 0,
  slowestResponse: 0,
  responseRate: 0,
  totalComments: 0,
  respondedComments: 0,
  unresolvedComments: 0,
  responseTimeDistribution: {
    under1Hour: 0,
    under4Hours: 0,
    under24Hours: 0,
    under3Days: 0,
    over3Days: 0
  },
  commentsByDay: []
};

export async function fetchEngineerMRHistory(
  token: string,
  projectId: string,
  username: string,
  timeframe: '7d' | '30d' | '90d' = '30d'
): Promise<EngineerMRHistory> {
  const cached = getCachedEngineerData(projectId, username, timeframe);
  if (cached) return cached;

  const encodedProjectId = encodeURIComponent(projectId);
  const cutoff = getTimeframeCutoff(timeframe).toISOString();

  const [authoredMRs, allMRs] = await Promise.all([
    gitlabGetAllPages<MergeRequest>(
      `/projects/${encodedProjectId}/merge_requests?author_username=${username}&updated_after=${cutoff}&order_by=updated_at&sort=desc`,
      token, { timeoutMs: 20_000 }
    ),
    gitlabGetAllPages<MergeRequest>(
      `/projects/${encodedProjectId}/merge_requests?updated_after=${cutoff}&order_by=updated_at&sort=desc`,
      token, { timeoutMs: 20_000 }
    )
  ]);

  const reviewedMRs = allMRs.filter(mr =>
    mr.reviewers?.some(r => r.username === username) &&
    mr.author.username !== username
  );
  const mergedMRs = authoredMRs.filter(mr => mr.state === 'merged');

  const mrIidsToAnalyze = authoredMRs.slice(0, 20).map(mr => mr.iid);
  const notesMap = await fetchNotesForMRs(token, encodedProjectId, mrIidsToAnalyze, true);

  const weeklyStats = calculateWeeklyStats(authoredMRs, reviewedMRs, mergedMRs, timeframe);
  const detailedMetrics = computeDetailedMetrics(authoredMRs.slice(0, 20), username, notesMap);
  const commentAnalysis = analyzeCommentsFromNotes(notesMap, mrIidsToAnalyze, username);
  const responseTimeMetrics = calculateResponseTimeFromNotes(notesMap, mrIidsToAnalyze, username);

  const result: EngineerMRHistory = {
    authoredMRs,
    reviewedMRs,
    mergedMRs,
    weeklyStats,
    commentAnalysis,
    responseTimeMetrics,
    ...detailedMetrics
  };

  setCachedEngineerData(projectId, username, timeframe, result);
  return result;
}

export async function fetchEngineerMRHistoryWithStages(
  token: string,
  projectId: string,
  username: string,
  timeframe: '7d' | '30d' | '90d' = '30d',
  updateStage: (index: number, completed: boolean, data?: any) => void,
  setPartialData: (data: EngineerMRHistory) => void,
  setRawData: (data: any) => void
): Promise<EngineerMRHistory> {
  const cached = getCachedEngineerData(projectId, username, timeframe);
  if (cached) {
    for (let i = 0; i < 5; i++) updateStage(i, true);
    setPartialData(cached);
    return cached;
  }

  const rawAnalyticsData: any = { mrDetails: {}, comments: [], responseTimeData: [] };

  const encodedProjectId = encodeURIComponent(projectId);
  const cutoff = getTimeframeCutoff(timeframe).toISOString();

  // Stage 1: Fetch MR data
  updateStage(0, false);
  const [authoredMRs, allMRs] = await Promise.all([
    gitlabGetAllPages<MergeRequest>(
      `/projects/${encodedProjectId}/merge_requests?author_username=${username}&updated_after=${cutoff}&order_by=updated_at&sort=desc`,
      token, { timeoutMs: 20_000 }
    ),
    gitlabGetAllPages<MergeRequest>(
      `/projects/${encodedProjectId}/merge_requests?updated_after=${cutoff}&order_by=updated_at&sort=desc`,
      token, { timeoutMs: 20_000 }
    )
  ]);

  const reviewedMRs = allMRs.filter(mr =>
    mr.reviewers?.some(r => r.username === username) &&
    mr.author.username !== username
  );
  const mergedMRs = authoredMRs.filter(mr => mr.state === 'merged');
  updateStage(0, true, { authoredMRs: authoredMRs.length, reviewedMRs: reviewedMRs.length });

  // Stage 2: Basic metrics
  updateStage(1, false);
  const weeklyStats = calculateWeeklyStats(authoredMRs, reviewedMRs, mergedMRs, timeframe);

  let partialResult: EngineerMRHistory = {
    authoredMRs, reviewedMRs, mergedMRs, weeklyStats,
    avgCommentsPerAuthoredMR: 0, avgReviewCyclesAsAuthor: 0,
    avgTimeToMerge: 0, avgResponseTime: 0, totalComments: 0,
    commentAnalysis: EMPTY_COMMENT_ANALYSIS,
    responseTimeMetrics: EMPTY_RESPONSE_METRICS
  };
  setPartialData(partialResult);
  updateStage(1, true);

  // Stage 3: Fetch ALL notes once (this is the key optimization)
  updateStage(2, false);
  const mrSlice = authoredMRs.slice(0, 20);
  const mrIids = mrSlice.map(mr => mr.iid);
  const notesMap = await fetchNotesForMRs(token, encodedProjectId, mrIids, true);

  const detailedMetrics = computeDetailedMetrics(mrSlice, username, notesMap);
  for (const mr of mrSlice) {
    rawAnalyticsData.mrDetails[mr.iid] = {
      commentCount: detailedMetrics.totalComments,
      timeToMerge: mr.state === 'merged' && (mr as any).merged_at
        ? hoursDiff(mr.created_at, (mr as any).merged_at)
        : null
    };
  }

  partialResult = { ...partialResult, ...detailedMetrics };
  setPartialData(partialResult);
  updateStage(2, true);

  // Stage 4: Analyze comments (from pre-fetched notes - instant)
  updateStage(3, false);
  const commentAnalysis = analyzeCommentsFromNotes(notesMap, mrIids, username);
  partialResult = { ...partialResult, commentAnalysis };
  setPartialData(partialResult);
  updateStage(3, true);

  // Stage 5: Response time analysis (from pre-fetched notes - instant)
  updateStage(4, false);
  const responseTimeMetrics = calculateResponseTimeFromNotes(notesMap, mrIids, username);
  partialResult = { ...partialResult, responseTimeMetrics };
  setPartialData(partialResult);
  updateStage(4, true);

  setRawData(rawAnalyticsData);
  setCachedEngineerData(projectId, username, timeframe, partialResult);
  return partialResult;
}

function computeDetailedMetrics(
  authoredMRs: MergeRequest[],
  authorUsername: string,
  notesMap: Map<number, FetchedMRNotes>
): {
  avgCommentsPerAuthoredMR: number;
  avgReviewCyclesAsAuthor: number;
  avgTimeToMerge: number;
  avgResponseTime: number;
  totalComments: number;
} {
  if (authoredMRs.length === 0) {
    return {
      avgCommentsPerAuthoredMR: 0, avgReviewCyclesAsAuthor: 0,
      avgTimeToMerge: 0, avgResponseTime: 0, totalComments: 0
    };
  }

  let totalComments = 0;
  let totalCycles = 0;
  let totalMergeTime = 0;
  let totalResponseTime = 0;
  let processed = 0;
  let mergedCount = 0;
  let responseCount = 0;

  for (const mr of authoredMRs) {
    const data = notesMap.get(mr.iid);
    if (!data) continue;

    const human = getHumanNotes(data.notes, authorUsername);
    totalComments += human.length;
    totalCycles += new Set(human.map(n => n.author.username)).size;

    if (human.length > 0) {
      totalResponseTime += hoursDiff(mr.created_at, human[0].created_at);
      responseCount++;
    }

    if (mr.state === 'merged' && (mr as any).merged_at) {
      totalMergeTime += hoursDiff(mr.created_at, (mr as any).merged_at);
      mergedCount++;
    }

    processed++;
  }

  return {
    avgCommentsPerAuthoredMR: processed > 0 ? totalComments / processed : 0,
    avgReviewCyclesAsAuthor: processed > 0 ? totalCycles / processed : 0,
    avgTimeToMerge: mergedCount > 0 ? totalMergeTime / mergedCount : 0,
    avgResponseTime: responseCount > 0 ? totalResponseTime / responseCount : 0,
    totalComments
  };
}

function hoursDiff(start: string, end: string): number {
  return Math.max(0, (new Date(end).getTime() - new Date(start).getTime()) / 3_600_000);
}

function calculateWeeklyStats(
  authoredMRs: any[],
  reviewedMRs: any[],
  mergedMRs: any[],
  timeframe: '7d' | '30d' | '90d'
): Array<{ week: string; authored: number; reviewed: number; merged: number }> {
  const weekMap = new Map<string, { authored: number; reviewed: number; merged: number }>();
  const weeksToShow = timeframe === '7d' ? 2 : timeframe === '30d' ? 5 : 13;
  const now = new Date();

  for (let i = weeksToShow - 1; i >= 0; i--) {
    const ws = new Date(now);
    ws.setDate(now.getDate() - (i * 7));
    ws.setHours(0, 0, 0, 0);
    weekMap.set(ws.toISOString().split('T')[0], { authored: 0, reviewed: 0, merged: 0 });
  }

  for (const mr of authoredMRs) {
    const key = getWeekKey(mr.created_at);
    if (weekMap.has(key)) weekMap.get(key)!.authored++;
  }
  for (const mr of reviewedMRs) {
    const key = getWeekKey(mr.updated_at);
    if (weekMap.has(key)) weekMap.get(key)!.reviewed++;
  }
  for (const mr of mergedMRs) {
    if (mr.merged_at) {
      const key = getWeekKey(mr.merged_at);
      if (weekMap.has(key)) weekMap.get(key)!.merged++;
    }
  }

  return Array.from(weekMap.entries()).map(([week, stats]) => ({ week, ...stats }));
}

function getWeekKey(dateString: string): string {
  const date = new Date(dateString);
  const ws = new Date(date);
  ws.setDate(date.getDate() - date.getDay());
  ws.setHours(0, 0, 0, 0);
  return ws.toISOString().split('T')[0];
}
