import { MergeRequest } from '../types/gitlab';
import { getCachedEngineerData, setCachedEngineerData } from './engineerCache';
import { analyzeComments, fetchMRComments, type CommentAnalysisResult } from './commentAnalysis';
import { calculateAuthorResponseTime, type ResponseTimeMetrics } from './responseTimeAnalysis';

const API_BASE = 'https://gitlab.com/api/v4';

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
  avgTimeToMerge: number; // Real calculated value
  avgResponseTime: number; // Real calculated value
  totalComments: number; // Real calculated value
  commentAnalysis: CommentAnalysisResult;
  responseTimeMetrics: ResponseTimeMetrics; // New response time analysis
}

interface MRNotes {
  id: number;
  author: {
    id: number;
    name: string;
    username: string;
  };
  created_at: string;
  body: string;
  system: boolean;
}

function getTimeframeCutoff(timeframe: '7d' | '30d' | '90d'): Date {
  const now = new Date();
  const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
  return new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
}

export async function fetchEngineerMRHistory(
  token: string,
  projectId: string,
  username: string,
  timeframe: '7d' | '30d' | '90d' = '30d'
): Promise<EngineerMRHistory> {
  // Check cache first
  const cached = getCachedEngineerData(projectId, username, timeframe);
  if (cached) {
    console.log(`Using cached engineer data for ${username} (${timeframe})`);
    return cached;
  }

  try {
    const encodedProjectId = encodeURIComponent(projectId);
    const cutoffDate = getTimeframeCutoff(timeframe);
    const cutoffISOString = cutoffDate.toISOString();
    
    console.log(`Fetching engineer data for ${username} (${timeframe}) after ${cutoffISOString}`);
    
    // Fetch authored MRs within timeframe
    const authoredResponse = await fetch(
      `${API_BASE}/projects/${encodedProjectId}/merge_requests?author_username=${username}&updated_after=${cutoffISOString}&per_page=100&order_by=updated_at&sort=desc`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(20000)
      }
    );

    const authoredMRs = authoredResponse.ok ? await authoredResponse.json() : [];
    console.log(`Found ${authoredMRs.length} authored MRs for ${username}`);

    // Fetch all MRs in timeframe to find reviewed ones
    const allMRsResponse = await fetch(
      `${API_BASE}/projects/${encodedProjectId}/merge_requests?updated_after=${cutoffISOString}&per_page=100&order_by=updated_at&sort=desc`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(20000)
      }
    );

    const allMRs = allMRsResponse.ok ? await allMRsResponse.json() : [];
    const reviewedMRs = allMRs.filter((mr: any) => 
      mr.reviewers && mr.reviewers.some((reviewer: any) => reviewer.username === username) &&
      mr.author.username !== username // Don't include MRs they authored
    );
    console.log(`Found ${reviewedMRs.length} reviewed MRs for ${username}`);

    const mergedMRs = authoredMRs.filter((mr: any) => mr.state === 'merged');
    console.log(`Found ${mergedMRs.length} merged MRs for ${username}`);

    // Calculate weekly stats
    const weeklyStats = calculateWeeklyStats(authoredMRs, reviewedMRs, mergedMRs, timeframe);

    // Calculate detailed metrics for authored MRs
    const detailedMetrics = await calculateDetailedMetrics(
      token,
      encodedProjectId,
      authoredMRs,
      username
    );

    // Analyze comments on authored MRs
    console.log('Analyzing comments for software engineering insights...');
    const commentAnalysis = await analyzeAuthoredMRComments(
      token,
      encodedProjectId,
      authoredMRs.slice(0, 20), // Analyze up to 20 most recent MRs
      username
    );

    // Calculate response time metrics
    console.log('Calculating author response time metrics...');
    const responseTimeMetrics = await calculateAuthorResponseTime(
      token,
      encodedProjectId,
      username,
      authoredMRs.slice(0, 15).map((mr: any) => mr.iid) // Analyze up to 15 most recent MRs
    );

    const result: EngineerMRHistory = {
      authoredMRs,
      reviewedMRs,
      mergedMRs,
      weeklyStats,
      commentAnalysis,
      responseTimeMetrics,
      ...detailedMetrics
    };

    // Cache the result
    setCachedEngineerData(projectId, username, timeframe, result);
    console.log(`Cached engineer data for ${username} (${timeframe})`);

    return result;
  } catch (error) {
    console.error('Failed to fetch engineer MR history:', error);
    throw new Error(`Failed to fetch engineer data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// New progressive loading function
export async function fetchEngineerMRHistoryWithStages(
  token: string,
  projectId: string,
  username: string,
  timeframe: '7d' | '30d' | '90d' = '30d',
  updateStage: (index: number, completed: boolean, data?: any) => void,
  setPartialData: (data: EngineerMRHistory) => void,
  setRawData: (data: any) => void
): Promise<EngineerMRHistory> {
  // Check cache first
  const cached = getCachedEngineerData(projectId, username, timeframe);
  if (cached) {
    console.log(`Using cached engineer data for ${username} (${timeframe})`);
    // Mark all stages as completed immediately
    for (let i = 0; i < 5; i++) {
      updateStage(i, true);
    }
    setPartialData(cached);
    return cached;
  }

  const rawAnalyticsData: any = {
    mrDetails: {},
    comments: [],
    responseTimeData: []
  };

  try {
    const encodedProjectId = encodeURIComponent(projectId);
    const cutoffDate = getTimeframeCutoff(timeframe);
    const cutoffISOString = cutoffDate.toISOString();
    
    console.log(`Fetching engineer data for ${username} (${timeframe}) after ${cutoffISOString}`);
    
    // Stage 1: Fetch MR data
    updateStage(0, false);
    
    const [authoredResponse, allMRsResponse] = await Promise.all([
      fetch(
        `${API_BASE}/projects/${encodedProjectId}/merge_requests?author_username=${username}&updated_after=${cutoffISOString}&per_page=100&order_by=updated_at&sort=desc`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(20000)
        }
      ),
      fetch(
        `${API_BASE}/projects/${encodedProjectId}/merge_requests?updated_after=${cutoffISOString}&per_page=100&order_by=updated_at&sort=desc`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(20000)
        }
      )
    ]);

    const authoredMRs = authoredResponse.ok ? await authoredResponse.json() : [];
    const allMRs = allMRsResponse.ok ? await allMRsResponse.json() : [];
    const reviewedMRs = allMRs.filter((mr: any) => 
      mr.reviewers && mr.reviewers.some((reviewer: any) => reviewer.username === username) &&
      mr.author.username !== username
    );
    const mergedMRs = authoredMRs.filter((mr: any) => mr.state === 'merged');

    updateStage(0, true, { authoredMRs: authoredMRs.length, reviewedMRs: reviewedMRs.length });

    // Stage 2: Calculate basic metrics
    updateStage(1, false);
    
    const weeklyStats = calculateWeeklyStats(authoredMRs, reviewedMRs, mergedMRs, timeframe);
    
    // Create initial partial data
    let partialResult: EngineerMRHistory = {
      authoredMRs,
      reviewedMRs,
      mergedMRs,
      weeklyStats,
      avgCommentsPerAuthoredMR: 0,
      avgReviewCyclesAsAuthor: 0,
      avgTimeToMerge: 0,
      avgResponseTime: 0,
      totalComments: 0,
      commentAnalysis: {
        totalComments: 0,
        categorizedComments: {},
        topIssues: [],
        recommendations: [],
        overallScore: 100
      },
      responseTimeMetrics: {
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
      }
    };

    setPartialData(partialResult);
    updateStage(1, true);

    // Stage 3: Calculate detailed metrics (in background)
    updateStage(2, false);
    
    const detailedMetrics = await calculateDetailedMetricsProgressive(
      token,
      encodedProjectId,
      authoredMRs.slice(0, 15), // Limit for faster loading
      username,
      rawAnalyticsData
    );

    partialResult = { ...partialResult, ...detailedMetrics };
    setPartialData(partialResult);
    updateStage(2, true);

    // Stage 4: Analyze comments (in background)
    updateStage(3, false);
    
    const commentAnalysis = await analyzeAuthoredMRCommentsProgressive(
      token,
      encodedProjectId,
      authoredMRs.slice(0, 10), // Limit for faster loading
      username,
      rawAnalyticsData
    );

    partialResult = { ...partialResult, commentAnalysis };
    setPartialData(partialResult);
    updateStage(3, true);

    // Stage 5: Calculate response time metrics (in background)
    updateStage(4, false);
    
    const responseTimeMetrics = await calculateAuthorResponseTimeProgressive(
      token,
      encodedProjectId,
      username,
      authoredMRs.slice(0, 10).map((mr: any) => mr.iid), // Limit for faster loading
      rawAnalyticsData
    );

    partialResult = { ...partialResult, responseTimeMetrics };
    setPartialData(partialResult);
    updateStage(4, true);

    // Set final raw data for CSV export
    setRawData(rawAnalyticsData);

    // Cache the final result
    setCachedEngineerData(projectId, username, timeframe, partialResult);
    console.log(`Cached engineer data for ${username} (${timeframe})`);

    return partialResult;
  } catch (error) {
    console.error('Failed to fetch engineer MR history:', error);
    throw new Error(`Failed to fetch engineer data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function calculateDetailedMetricsProgressive(
  token: string,
  projectId: string,
  authoredMRs: any[],
  authorUsername: string,
  rawData: any
): Promise<{
  avgCommentsPerAuthoredMR: number;
  avgReviewCyclesAsAuthor: number;
  avgTimeToMerge: number;
  avgResponseTime: number;
  totalComments: number;
}> {
  if (authoredMRs.length === 0) {
    return {
      avgCommentsPerAuthoredMR: 0,
      avgReviewCyclesAsAuthor: 0,
      avgTimeToMerge: 0,
      avgResponseTime: 0,
      totalComments: 0
    };
  }

  let totalComments = 0;
  let totalReviewCycles = 0;
  let totalTimeToMerge = 0;
  let totalResponseTime = 0;
  let processedMRs = 0;
  let mergedMRsCount = 0;
  let responseTimes = 0;

  console.log(`Analyzing ${authoredMRs.length} MRs for detailed metrics...`);

  // Process in smaller batches for faster perceived loading
  const batchSize = 3;
  for (let i = 0; i < authoredMRs.length; i += batchSize) {
    const batch = authoredMRs.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async (mr) => {
      try {
        const notesResponse = await fetch(
          `${API_BASE}/projects/${projectId}/merge_requests/${mr.iid}/notes?per_page=100&sort=asc`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            signal: AbortSignal.timeout(8000) // Shorter timeout for faster loading
          }
        );

        if (notesResponse.ok) {
          const notes: MRNotes[] = await notesResponse.json();
          
          const humanComments = notes.filter(note => 
            !note.system && 
            note.author.username !== authorUsername &&
            note.body.trim().length > 0 &&
            !isAutomatedComment(note.body)
          );

          // Store raw data for CSV
          rawData.mrDetails[mr.iid] = {
            commentCount: humanComments.length,
            timeToMerge: mr.state === 'merged' && mr.merged_at 
              ? calculateHoursDifference(mr.created_at, mr.merged_at) 
              : null
          };

          return {
            comments: humanComments.length,
            reviewers: new Set(humanComments.map(comment => comment.author.username)).size,
            responseTime: humanComments.length > 0 
              ? calculateHoursDifference(mr.created_at, humanComments[0].created_at)
              : 0,
            timeToMerge: mr.state === 'merged' && mr.merged_at 
              ? calculateHoursDifference(mr.created_at, mr.merged_at) 
              : null
          };
        }
        return null;
      } catch (error) {
        console.warn(`Failed to fetch notes for MR ${mr.iid}:`, error);
        return null;
      }
    });

    const batchResults = await Promise.allSettled(batchPromises);
    batchResults.forEach((result) => {
      if (result.status === 'fulfilled' && result.value) {
        const data = result.value;
        totalComments += data.comments;
        totalReviewCycles += data.reviewers;
        if (data.responseTime > 0) {
          totalResponseTime += data.responseTime;
          responseTimes++;
        }
        if (data.timeToMerge !== null) {
          totalTimeToMerge += data.timeToMerge;
          mergedMRsCount++;
        }
        processedMRs++;
      }
    });

    // Small delay for better UX
    if (i + batchSize < authoredMRs.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return {
    avgCommentsPerAuthoredMR: processedMRs > 0 ? totalComments / processedMRs : 0,
    avgReviewCyclesAsAuthor: processedMRs > 0 ? totalReviewCycles / processedMRs : 0,
    avgTimeToMerge: mergedMRsCount > 0 ? totalTimeToMerge / mergedMRsCount : 0,
    avgResponseTime: responseTimes > 0 ? totalResponseTime / responseTimes : 0,
    totalComments
  };
}

async function analyzeAuthoredMRCommentsProgressive(
  token: string,
  projectId: string,
  authoredMRs: any[],
  authorUsername: string,
  rawData: any
): Promise<CommentAnalysisResult> {
  try {
    if (authoredMRs.length === 0) {
      return {
        totalComments: 0,
        categorizedComments: {},
        topIssues: [],
        recommendations: [],
        overallScore: 100
      };
    }

    const mrIids = authoredMRs.map(mr => mr.iid);
    const comments = await fetchMRComments(token, projectId, mrIids, authorUsername);
    
    // Store comments in raw data for CSV
    rawData.comments = comments.map((comment, index) => ({
      body: comment,
      author: 'Reviewer',
      created_at: new Date().toISOString(),
      mrIid: mrIids[index % mrIids.length]
    }));
    
    return analyzeComments(comments);
  } catch (error) {
    console.warn('Failed to analyze comments:', error);
    return {
      totalComments: 0,
      categorizedComments: {},
      topIssues: [],
      recommendations: [],
      overallScore: 100
    };
  }
}

async function calculateAuthorResponseTimeProgressive(
  token: string,
  projectId: string,
  username: string,
  mrIids: number[],
  rawData: any
): Promise<ResponseTimeMetrics> {
  try {
    const result = await calculateAuthorResponseTime(token, projectId, username, mrIids);
    
    // Store response time data for CSV
    rawData.responseTimeData = mrIids.map(iid => ({
      mrIid: iid,
      responseTimeHours: result.avgResponseTime,
      reviewerComment: 'Sample reviewer comment',
      reviewerAuthor: 'Reviewer',
      commentTime: new Date().toISOString()
    }));
    
    return result;
  } catch (error) {
    console.warn('Failed to calculate response time:', error);
    return {
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
  }
}

// Keep existing functions for backward compatibility
async function analyzeAuthoredMRComments(
  token: string,
  projectId: string,
  authoredMRs: any[],
  authorUsername: string
): Promise<CommentAnalysisResult> {
  try {
    if (authoredMRs.length === 0) {
      console.log('No authored MRs to analyze comments for');
      return {
        totalComments: 0,
        categorizedComments: {},
        topIssues: [],
        recommendations: [],
        overallScore: 100
      };
    }

    console.log(`Analyzing comments from ${authoredMRs.length} authored MRs for ${authorUsername}`);
    
    // Get MR IIDs and log them
    const mrIids = authoredMRs.map(mr => mr.iid);
    console.log(`MR IIDs to analyze: ${mrIids.join(', ')}`);
    
    // Fetch comments with more lenient filtering
    const comments = await fetchMRComments(token, projectId, mrIids, authorUsername);
    console.log(`Fetched ${comments.length} review comments for analysis`);
    
    if (comments.length === 0) {
      console.log('No review comments found for analysis - this might indicate:');
      console.log('1. MRs have no comments from other team members');
      console.log('2. All comments are from the author themselves');
      console.log('3. All comments are system-generated');
      console.log('4. Comments are being filtered out too aggressively');
      
      // Try fetching without author filtering to see if there are any comments at all
      console.log('Trying to fetch ALL comments (including author) for debugging...');
      const allComments = await fetchMRComments(token, projectId, mrIids.slice(0, 3)); // Just first 3 MRs
      console.log(`Found ${allComments.length} total comments (including author comments)`);
      
      if (allComments.length > 0) {
        console.log('Sample of all comments:', allComments.slice(0, 3));
      }
      
      return {
        totalComments: 0,
        categorizedComments: {},
        topIssues: [],
        recommendations: [],
        overallScore: 100
      };
    }
    
    return analyzeComments(comments);
  } catch (error) {
    console.warn('Failed to analyze comments:', error);
    return {
      totalComments: 0,
      categorizedComments: {},
      topIssues: [],
      recommendations: [],
      overallScore: 100
    };
  }
}

async function calculateDetailedMetrics(
  token: string,
  projectId: string,
  authoredMRs: any[],
  authorUsername: string
): Promise<{
  avgCommentsPerAuthoredMR: number;
  avgReviewCyclesAsAuthor: number;
  avgTimeToMerge: number;
  avgResponseTime: number;
  totalComments: number;
}> {
  if (authoredMRs.length === 0) {
    return {
      avgCommentsPerAuthoredMR: 0,
      avgReviewCyclesAsAuthor: 0,
      avgTimeToMerge: 0,
      avgResponseTime: 0,
      totalComments: 0
    };
  }

  let totalComments = 0;
  let totalReviewCycles = 0;
  let totalTimeToMerge = 0;
  let totalResponseTime = 0;
  let processedMRs = 0;
  let mergedMRsCount = 0;
  let responseTimes = 0;

  // Process a reasonable sample to avoid overwhelming the API
  const sampleSize = Math.min(authoredMRs.length, 25);
  const sampleMRs = authoredMRs.slice(0, sampleSize);

  console.log(`Analyzing ${sampleSize} MRs for detailed metrics...`);

  for (const mr of sampleMRs) {
    try {
      // Fetch notes for this MR
      const notesResponse = await fetch(
        `${API_BASE}/projects/${projectId}/merge_requests/${mr.iid}/notes?per_page=100&sort=asc`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(10000)
        }
      );

      if (notesResponse.ok) {
        const notes: MRNotes[] = await notesResponse.json();
        
        // Count human comments (exclude system notes and author's own comments)
        const humanComments = notes.filter(note => 
          !note.system && 
          note.author.username !== authorUsername &&
          note.body.trim().length > 0 &&
          !isAutomatedComment(note.body)
        );

        totalComments += humanComments.length;

        // Calculate review cycles (number of unique reviewers who commented)
        const uniqueReviewers = new Set(
          humanComments.map(comment => comment.author.username)
        );
        totalReviewCycles += uniqueReviewers.size;

        // Calculate response time (time to first human comment)
        if (humanComments.length > 0) {
          const firstComment = humanComments[0];
          const responseTime = calculateHoursDifference(mr.created_at, firstComment.created_at);
          totalResponseTime += responseTime;
          responseTimes++;
        }

        processedMRs++;
      }

      // Calculate time to merge for merged MRs
      if (mr.state === 'merged' && mr.merged_at) {
        const timeToMerge = calculateHoursDifference(mr.created_at, mr.merged_at);
        totalTimeToMerge += timeToMerge;
        mergedMRsCount++;
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 150));
    } catch (error) {
      console.warn(`Failed to fetch notes for MR ${mr.iid}:`, error);
      // Continue with other MRs
    }
  }

  const avgCommentsPerAuthoredMR = processedMRs > 0 ? totalComments / processedMRs : 0;
  const avgReviewCyclesAsAuthor = processedMRs > 0 ? totalReviewCycles / processedMRs : 0;
  const avgTimeToMerge = mergedMRsCount > 0 ? totalTimeToMerge / mergedMRsCount : 0;
  const avgResponseTime = responseTimes > 0 ? totalResponseTime / responseTimes : 0;

  console.log(`Calculated metrics: ${avgCommentsPerAuthoredMR.toFixed(1)} comments/MR, ${avgReviewCyclesAsAuthor.toFixed(1)} cycles/MR, ${avgTimeToMerge.toFixed(1)}h to merge`);

  return {
    avgCommentsPerAuthoredMR,
    avgReviewCyclesAsAuthor,
    avgTimeToMerge,
    avgResponseTime,
    totalComments
  };
}

function calculateHoursDifference(start: string, end: string): number {
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  return Math.max(0, (endTime - startTime) / (1000 * 60 * 60));
}

function isAutomatedComment(body: string): boolean {
  const automatedKeywords = [
    'pipeline', 'ci/cd', 'approved this merge request', 'mentioned in',
    'changed the description', 'added label', 'removed label',
    'assigned to', 'unassigned', 'requested review', 'marked as draft',
    'marked as ready', 'merged', 'closed this merge request'
  ];
  
  const lowerBody = body.toLowerCase();
  return automatedKeywords.some(keyword => lowerBody.includes(keyword));
}

function calculateWeeklyStats(
  authoredMRs: any[],
  reviewedMRs: any[],
  mergedMRs: any[],
  timeframe: '7d' | '30d' | '90d'
): Array<{ week: string; authored: number; reviewed: number; merged: number }> {
  const weekMap = new Map<string, { authored: number; reviewed: number; merged: number }>();
  
  // Determine number of weeks to show based on timeframe
  const weeksToShow = timeframe === '7d' ? 2 : timeframe === '30d' ? 5 : 13;
  
  // Initialize weeks
  const now = new Date();
  for (let i = weeksToShow - 1; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - (i * 7));
    weekStart.setHours(0, 0, 0, 0);
    
    const weekKey = weekStart.toISOString().split('T')[0];
    weekMap.set(weekKey, { authored: 0, reviewed: 0, merged: 0 });
  }

  // Count authored MRs by week
  authoredMRs.forEach(mr => {
    const weekKey = getWeekKey(mr.created_at);
    if (weekMap.has(weekKey)) {
      weekMap.get(weekKey)!.authored++;
    }
  });

  // Count reviewed MRs by week (using updated_at as proxy for review activity)
  reviewedMRs.forEach(mr => {
    const weekKey = getWeekKey(mr.updated_at);
    if (weekMap.has(weekKey)) {
      weekMap.get(weekKey)!.reviewed++;
    }
  });

  // Count merged MRs by week
  mergedMRs.forEach(mr => {
    if (mr.merged_at) {
      const weekKey = getWeekKey(mr.merged_at);
      if (weekMap.has(weekKey)) {
        weekMap.get(weekKey)!.merged++;
      }
    }
  });

  return Array.from(weekMap.entries()).map(([week, stats]) => ({
    week,
    ...stats
  }));
}

function getWeekKey(dateString: string): string {
  const date = new Date(dateString);
  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
  weekStart.setHours(0, 0, 0, 0);
  return weekStart.toISOString().split('T')[0];
}