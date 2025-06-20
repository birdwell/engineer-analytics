export interface GitLabMR {
  id: number;
  iid: number;
  title: string;
  author: {
    id: number;
    name: string;
    username: string;
  };
  created_at: string;
  updated_at?: string;
  merged_at?: string;
  state: 'opened' | 'merged' | 'closed';
  web_url: string;
  reviewers: Array<{
    id: number;
    name: string;
    username: string;
  }>;
  draft?: boolean;
}

export interface GitLabNote {
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

export interface GitLabChanges {
  changes: Array<{
    diff: string;
    new_file: boolean;
    renamed_file: boolean;
    deleted_file: boolean;
  }>;
}

export interface MRMetrics {
  id: number;
  iid: number;
  title: string;
  author: string;
  createdAt: string;
  mergedAt?: string;
  state: 'opened' | 'merged' | 'closed';
  webUrl: string;
  isDraft: boolean;
  timeToMerge?: number; // hours from open to merge
  reviewerCount: number;
  commentCount: number;
  linesAdded: number;
  linesDeleted: number;
  filesChanged: number;
  draftDuration?: number; // hours spent in draft
  reviewDuration?: number; // hours from ready-for-review to merge
  timeToFirstReview?: number; // hours to first review request
}

export interface TeamAnalytics {
  // Time-based metrics
  avgTimeToMerge: number; // Average time from open to merge (excluding draft time)
  avgTimeToFirstReview: number; // Average time until first review is requested
  avgDraftDuration: number; // Average time MRs spend in draft
  avgReviewDuration: number; // Average time from ready-for-review to merge
  
  // Review metrics
  avgReviewersPerMR: number;
  avgCommentsPerMR: number;
  
  // Code metrics
  avgLinesAddedPerMR: number;
  avgLinesDeletedPerMR: number;
  avgFilesChangedPerMR: number;
  
  // Trend data (by week)
  weeklyTrends: Array<{
    week: string;
    mergedMRs: number;
    avgTimeToMerge: number;
    avgLinesChanged: number;
    avgReviewers: number;
  }>;
  
  // Distribution data
  mrsBySize: {
    small: number; // < 100 lines
    medium: number; // 100-500 lines
    large: number; // 500-1000 lines
    xlarge: number; // > 1000 lines
  };
  
  mrsByReviewers: {
    none: number;
    one: number;
    two: number;
    three: number;
    fourPlus: number;
  };
  
  // Sample MRs for context
  fastestMerges: MRMetrics[];
  slowestMerges: MRMetrics[];
  largestMRs: MRMetrics[];
  
  // Summary stats
  totalMRsAnalyzed: number;
  mergedMRsAnalyzed: number;
  openMRsAnalyzed: number;
  draftMRsAnalyzed: number;
}

// Legacy interface for backward compatibility
export interface AnalyticsResult {
  avgTimeToFirstReview: number;
  avgTimeToMerge: number;
  avgReviewCycles: number;
  reviewerStats: Array<{
    name: string;
    username: string;
    totalReviews: number;
    avgResponseTime: number;
    fastestResponse: number;
    slowestResponse: number;
    reviewedMRs: Array<{
      id: number;
      iid: number;
      title: string;
      webUrl: string;
      responseTime: number;
    }>;
  }>;
  fastestReviews: Array<{
    mr: GitLabMR;
    responseTime: number;
    reviewer: string;
  }>;
  slowestReviews: Array<{
    mr: GitLabMR;
    responseTime: number;
    reviewer: string;
  }>;
  totalMRsAnalyzed: number;
  mergedMRsAnalyzed: number;
  openMRsAnalyzed: number;
  reviewEvents: any[];
}