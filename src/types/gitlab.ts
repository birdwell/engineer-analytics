export interface GitLabUser {
  id: number;
  name: string;
  username: string;
  avatar_url: string;
}

export interface MergeRequest {
  id: number;
  iid: number;
  title: string;
  state: 'opened' | 'closed' | 'merged';
  draft: boolean;
  author: GitLabUser;
  assignees: GitLabUser[];
  reviewers: GitLabUser[];
  created_at: string;
  updated_at: string;
  web_url: string;
  changes_count?: string;
  diff_refs?: {
    base_sha: string;
    head_sha: string;
    start_sha: string;
  };
}

export interface MRComplexity {
  id: number;
  filesChanged: number;
  linesAdded: number;
  linesDeleted: number;
  totalLines: number;
  complexityScore: number;
}

export interface EngineerStats {
  user: GitLabUser;
  openMRs: number;
  draftMRs: number;
  assignedReviews: number;
  reviewComplexity: number; // Total complexity of assigned reviews
  authorComplexity: number; // Total complexity of authored MRs
}

export interface DashboardData {
  mergeRequests: MergeRequest[];
  engineerStats: EngineerStats[];
  reviewDistribution: { name: string; value: number; color: string }[];
  mrComplexities: MRComplexity[];
}