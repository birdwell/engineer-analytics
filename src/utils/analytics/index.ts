import { fetchMRsInTimeframe, fetchMRNotes, fetchMRChanges } from './dataFetcher';
import { calculateMRMetrics, calculateTeamAnalytics } from './calculations';
import { TeamAnalytics, AnalyticsResult } from './types';
import { getCachedAnalytics, setCachedAnalytics } from '../analyticsCache';

export * from './types';
export * from './calculations';

/**
 * Main function to calculate team analytics
 */
export async function calculateReviewMetrics(
  token: string,
  projectId: string,
  dashboardMRs: any[], // Legacy parameter for compatibility
  timeframe: '7d' | '30d' | '90d' = '30d'
): Promise<AnalyticsResult> {
  console.log(`Starting team analytics calculation for ${timeframe}`);
  console.log(`Project ID: ${projectId}`);
  
  // Check cache first
  const cached = getCachedAnalytics(projectId, timeframe);
  if (cached) {
    console.log('Using cached analytics data');
    return convertLegacyToResult(cached);
  }
  
  try {
    // Step 1: Fetch all MRs in timeframe with timeout
    console.log('Step 1: Fetching MRs...');
    const fetchPromise = fetchMRsInTimeframe(token, projectId, timeframe);
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('MR fetch timeout after 45 seconds')), 45000)
    );
    
    const mrs = await Promise.race([fetchPromise, timeoutPromise]);
    console.log(`Found ${mrs.length} MRs to analyze`);
    
    if (mrs.length === 0) {
      console.log('No MRs found in timeframe');
      return createEmptyResult();
    }
    
    // Step 2: Analyze MRs with smart sampling for performance
    console.log('Step 2: Analyzing MR metrics...');
    const mrMetrics = [];
    
    // For large datasets, we'll analyze a representative sample for detailed metrics
    // but still count all MRs for accurate totals
    const maxDetailedAnalysis = 50; // Increased from 20
    const shouldSample = mrs.length > maxDetailedAnalysis;
    
    let mrsToAnalyze: typeof mrs;
    if (shouldSample) {
      // Sample MRs: take recent ones, some random ones, and ensure we get both merged and open
      const recentMRs = mrs.slice(0, Math.floor(maxDetailedAnalysis * 0.6)); // 60% recent
      const mergedMRs = mrs.filter(mr => mr.state === 'merged').slice(0, Math.floor(maxDetailedAnalysis * 0.3)); // 30% merged
      const openMRs = mrs.filter(mr => mr.state === 'opened').slice(0, Math.floor(maxDetailedAnalysis * 0.1)); // 10% open
      
      // Combine and deduplicate
      const combinedSet = new Set();
      mrsToAnalyze = [...recentMRs, ...mergedMRs, ...openMRs].filter(mr => {
        if (combinedSet.has(mr.id)) return false;
        combinedSet.add(mr.id);
        return true;
      }).slice(0, maxDetailedAnalysis);
      
      console.log(`Sampling ${mrsToAnalyze.length} MRs for detailed analysis from ${mrs.length} total`);
    } else {
      mrsToAnalyze = mrs;
      console.log(`Analyzing all ${mrsToAnalyze.length} MRs`);
    }
    
    const batchSize = 5;
    
    for (let i = 0; i < mrsToAnalyze.length; i += batchSize) {
      const batch = mrsToAnalyze.slice(i, i + batchSize);
      const batchNum = Math.floor(i/batchSize) + 1;
      const totalBatches = Math.ceil(mrsToAnalyze.length/batchSize);
      
      console.log(`Processing batch ${batchNum}/${totalBatches} (MRs ${i + 1}-${Math.min(i + batchSize, mrsToAnalyze.length)})`);
      
      const batchPromises = batch.map(async (mr) => {
        try {
          console.log(`  Analyzing MR !${mr.iid}: ${mr.title.substring(0, 50)}...`);
          
          // Create timeout for each MR analysis
          const analysisPromise = Promise.all([
            fetchMRNotes(token, projectId, mr.iid),
            fetchMRChanges(token, projectId, mr.iid)
          ]).then(([notes, changes]) => {
            const metrics = calculateMRMetrics(mr, notes, changes);
            console.log(`  MR !${mr.iid}: ${metrics.commentCount} comments, ${metrics.linesAdded + metrics.linesDeleted} lines, ${metrics.reviewerCount} reviewers`);
            return metrics;
          });
          
          const timeoutPromise = new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error(`MR ${mr.iid} analysis timeout`)), 15000)
          );
          
          return await Promise.race([analysisPromise, timeoutPromise]);
        } catch (error) {
          console.warn(`Failed to analyze MR ${mr.iid}:`, error);
          // Return basic metrics without detailed analysis
          return calculateMRMetrics(mr, []);
        }
      });
      
      const batchResults = await Promise.allSettled(batchPromises);
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          mrMetrics.push(result.value);
        } else {
          console.warn(`Failed to process MR ${batch[index].iid}:`, result.reason);
          // Add basic metrics for failed MRs
          mrMetrics.push(calculateMRMetrics(batch[index], []));
        }
      });
      
      // Shorter delay between batches
      if (i + batchSize < mrsToAnalyze.length) {
        console.log('  Waiting 200ms before next batch...');
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    console.log(`Analyzed ${mrMetrics.length} MRs in detail`);
    
    // Step 3: Calculate team analytics
    console.log('Step 3: Calculating team metrics...');
    const teamAnalytics = calculateTeamAnalytics(mrMetrics);
    
    // Override totals with actual counts from all fetched MRs
    const actualMergedCount = mrs.filter(mr => mr.state === 'merged').length;
    const actualOpenCount = mrs.filter(mr => mr.state === 'opened').length;
    const actualTotalCount = mrs.length;
    
    console.log('Team analytics calculation complete:', {
      totalMRs: actualTotalCount,
      mergedMRs: actualMergedCount,
      openMRs: actualOpenCount,
      analyzedInDetail: mrMetrics.length,
      avgTimeToMerge: `${teamAnalytics.avgTimeToMerge.toFixed(1)}h`,
      avgTimeToFirstReview: `${teamAnalytics.avgTimeToFirstReview.toFixed(1)}h`,
      avgReviewers: teamAnalytics.avgReviewersPerMR.toFixed(1),
      avgComments: teamAnalytics.avgCommentsPerMR.toFixed(1),
      avgLinesAdded: teamAnalytics.avgLinesAddedPerMR.toFixed(0),
      avgLinesDeleted: teamAnalytics.avgLinesDeletedPerMR.toFixed(0)
    });
    
    // Convert to legacy format for compatibility
    const result: AnalyticsResult = {
      avgTimeToFirstReview: teamAnalytics.avgTimeToFirstReview,
      avgTimeToMerge: teamAnalytics.avgTimeToMerge,
      avgReviewCycles: teamAnalytics.avgReviewersPerMR,
      reviewerStats: [], // No individual reviewer stats in team analytics
      fastestReviews: teamAnalytics.fastestMerges.map(mr => ({
        mr: {
          id: mr.id,
          iid: mr.iid,
          title: mr.title,
          author: { id: 0, name: mr.author, username: '' },
          created_at: mr.createdAt,
          merged_at: mr.mergedAt,
          state: mr.state,
          web_url: mr.webUrl,
          reviewers: []
        },
        responseTime: mr.timeToMerge || 0,
        reviewer: 'Team'
      })),
      slowestReviews: teamAnalytics.slowestMerges.map(mr => ({
        mr: {
          id: mr.id,
          iid: mr.iid,
          title: mr.title,
          author: { id: 0, name: mr.author, username: '' },
          created_at: mr.createdAt,
          merged_at: mr.mergedAt,
          state: mr.state,
          web_url: mr.webUrl,
          reviewers: []
        },
        responseTime: mr.timeToMerge || 0,
        reviewer: 'Team'
      })),
      totalMRsAnalyzed: actualTotalCount, // Use actual total count
      mergedMRsAnalyzed: actualMergedCount, // Use actual merged count
      openMRsAnalyzed: actualOpenCount, // Use actual open count
      reviewEvents: [] // No individual events in team analytics
    };
    
    // Cache the result
    const legacyResult = {
      avgTimeToFirstReview: result.avgTimeToFirstReview,
      avgTimeToMerge: result.avgTimeToMerge,
      avgReviewCycles: result.avgReviewCycles,
      fastestReviews: result.fastestReviews.map(r => r.mr),
      slowestReviews: result.slowestReviews.map(r => r.mr),
      reviewerResponseTimes: [],
      totalMRsAnalyzed: result.totalMRsAnalyzed,
      mergedMRsAnalyzed: result.mergedMRsAnalyzed,
      openMRsAnalyzed: result.openMRsAnalyzed
    };
    setCachedAnalytics(projectId, timeframe, legacyResult);
    
    return result;
  } catch (error) {
    console.error('Team analytics calculation failed:', error);
    throw new Error(`Team analytics calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function createEmptyResult(): AnalyticsResult {
  return {
    avgTimeToFirstReview: 0,
    avgTimeToMerge: 0,
    avgReviewCycles: 0,
    reviewerStats: [],
    fastestReviews: [],
    slowestReviews: [],
    totalMRsAnalyzed: 0,
    mergedMRsAnalyzed: 0,
    openMRsAnalyzed: 0,
    reviewEvents: []
  };
}

function convertLegacyToResult(legacy: any): AnalyticsResult {
  return {
    avgTimeToFirstReview: legacy.avgTimeToFirstReview || 0,
    avgTimeToMerge: legacy.avgTimeToMerge || 0,
    avgReviewCycles: legacy.avgReviewCycles || 0,
    reviewerStats: [],
    fastestReviews: (legacy.fastestReviews || []).map((mr: any) => ({
      mr,
      responseTime: mr.timeToMerge || 0,
      reviewer: 'Team'
    })),
    slowestReviews: (legacy.slowestReviews || []).map((mr: any) => ({
      mr,
      responseTime: mr.timeToMerge || 0,
      reviewer: 'Team'
    })),
    totalMRsAnalyzed: legacy.totalMRsAnalyzed || 0,
    mergedMRsAnalyzed: legacy.mergedMRsAnalyzed || 0,
    openMRsAnalyzed: legacy.openMRsAnalyzed || 0,
    reviewEvents: []
  };
}