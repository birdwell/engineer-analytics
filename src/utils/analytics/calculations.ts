import { GitLabMR, GitLabNote, GitLabChanges, MRMetrics, TeamAnalytics } from './types';

/**
 * Calculate time difference in hours between two ISO date strings
 */
export function calculateHoursDifference(start: string, end: string): number {
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  return Math.max(0, (endTime - startTime) / (1000 * 60 * 60));
}

/**
 * Check if a note is a human review comment (not system or automated)
 */
export function isHumanReviewComment(note: GitLabNote, authorId: number): boolean {
  if (note.system) return false;
  if (note.author.id === authorId) return false;
  if (note.body.trim().length === 0) return false;
  
  // Filter out automated comments
  const body = note.body.toLowerCase();
  const automatedKeywords = [
    'automatically', 'pipeline', 'build', 'ci/cd', 'merge request',
    'approved this merge request', 'mentioned in', 'changed the description',
    'added', 'removed', 'assigned', 'unassigned', 'requested review',
    'marked as draft', 'marked as ready'
  ];
  
  return !automatedKeywords.some(keyword => body.includes(keyword));
}

/**
 * Parse diff to count lines added and deleted
 */
export function parseDiffStats(diff: string): { added: number; deleted: number } {
  const lines = diff.split('\n');
  let added = 0;
  let deleted = 0;
  
  for (const line of lines) {
    if (line.startsWith('+') && !line.startsWith('+++')) {
      added++;
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      deleted++;
    }
  }
  
  return { added, deleted };
}

/**
 * Find the first time a review was requested (when reviewers were added)
 */
export function findTimeToFirstReview(mr: GitLabMR, notes: GitLabNote[]): number | undefined {
  // Look for system notes about reviewer assignment
  const reviewerAssignmentNote = notes.find(note => 
    note.system && 
    note.body.toLowerCase().includes('requested review') ||
    note.body.toLowerCase().includes('assigned') && note.body.toLowerCase().includes('reviewer')
  );
  
  if (reviewerAssignmentNote) {
    return calculateHoursDifference(mr.created_at, reviewerAssignmentNote.created_at);
  }
  
  // If no explicit reviewer assignment found, check if MR has reviewers
  // and assume they were assigned at creation if not draft
  if (mr.reviewers && mr.reviewers.length > 0 && !mr.draft) {
    return 0; // Reviewers assigned at creation
  }
  
  return undefined;
}

/**
 * Calculate comprehensive metrics for a single MR
 */
export function calculateMRMetrics(
  mr: GitLabMR, 
  notes: GitLabNote[], 
  changes?: GitLabChanges
): MRMetrics {
  // Count human review comments
  const humanComments = notes.filter(note => isHumanReviewComment(note, mr.author.id));
  
  // Calculate code change metrics
  let linesAdded = 0;
  let linesDeleted = 0;
  let filesChanged = 0;
  
  if (changes?.changes) {
    filesChanged = changes.changes.length;
    
    for (const change of changes.changes) {
      if (change.diff) {
        const stats = parseDiffStats(change.diff);
        linesAdded += stats.added;
        linesDeleted += stats.deleted;
      }
    }
  }
  
  // Calculate time metrics
  let timeToMerge: number | undefined;
  let draftDuration: number | undefined;
  let reviewDuration: number | undefined;
  
  if (mr.state === 'merged' && mr.merged_at) {
    timeToMerge = calculateHoursDifference(mr.created_at, mr.merged_at);
    
    // Look for draft status changes in notes
    const draftToReadyNote = notes.find(note => 
      note.system && note.body.toLowerCase().includes('marked as ready')
    );
    
    if (draftToReadyNote) {
      draftDuration = calculateHoursDifference(mr.created_at, draftToReadyNote.created_at);
      reviewDuration = calculateHoursDifference(draftToReadyNote.created_at, mr.merged_at);
    } else if (mr.draft) {
      // If currently draft, all time is draft time
      draftDuration = timeToMerge;
      reviewDuration = 0;
    } else {
      // Assume non-draft MRs were ready for review from creation
      reviewDuration = timeToMerge;
      draftDuration = 0;
    }
  }
  
  const timeToFirstReview = findTimeToFirstReview(mr, notes);
  
  return {
    id: mr.id,
    iid: mr.iid,
    title: mr.title,
    author: mr.author.name,
    createdAt: mr.created_at,
    mergedAt: mr.merged_at,
    state: mr.state,
    webUrl: mr.web_url,
    isDraft: mr.draft || false,
    timeToMerge,
    reviewerCount: mr.reviewers?.length || 0,
    commentCount: humanComments.length,
    linesAdded,
    linesDeleted,
    filesChanged,
    draftDuration,
    reviewDuration,
    timeToFirstReview
  };
}

/**
 * Group MRs by week for trend analysis
 */
export function groupMRsByWeek(mrMetrics: MRMetrics[]): Map<string, MRMetrics[]> {
  const weekGroups = new Map<string, MRMetrics[]>();
  
  for (const mr of mrMetrics) {
    const date = new Date(mr.createdAt);
    // Get Monday of the week
    const monday = new Date(date);
    monday.setDate(date.getDate() - date.getDay() + 1);
    const weekKey = monday.toISOString().split('T')[0];
    
    if (!weekGroups.has(weekKey)) {
      weekGroups.set(weekKey, []);
    }
    weekGroups.get(weekKey)!.push(mr);
  }
  
  return weekGroups;
}

/**
 * Calculate team analytics from MR metrics
 */
export function calculateTeamAnalytics(mrMetrics: MRMetrics[]): TeamAnalytics {
  const mergedMRs = mrMetrics.filter(mr => mr.state === 'merged' && mr.timeToMerge !== undefined);
  const openMRs = mrMetrics.filter(mr => mr.state === 'opened');
  const draftMRs = mrMetrics.filter(mr => mr.isDraft);
  
  // Time-based metrics (only for merged MRs)
  const avgTimeToMerge = mergedMRs.length > 0
    ? mergedMRs.reduce((sum, mr) => sum + (mr.timeToMerge || 0), 0) / mergedMRs.length
    : 0;
    
  const avgTimeToFirstReview = mrMetrics.filter(mr => mr.timeToFirstReview !== undefined).length > 0
    ? mrMetrics.reduce((sum, mr) => sum + (mr.timeToFirstReview || 0), 0) / mrMetrics.filter(mr => mr.timeToFirstReview !== undefined).length
    : 0;
    
  const avgDraftDuration = mergedMRs.filter(mr => mr.draftDuration && mr.draftDuration > 0).length > 0
    ? mergedMRs.reduce((sum, mr) => sum + (mr.draftDuration || 0), 0) / mergedMRs.filter(mr => mr.draftDuration && mr.draftDuration > 0).length
    : 0;
    
  const avgReviewDuration = mergedMRs.filter(mr => mr.reviewDuration && mr.reviewDuration > 0).length > 0
    ? mergedMRs.reduce((sum, mr) => sum + (mr.reviewDuration || 0), 0) / mergedMRs.filter(mr => mr.reviewDuration && mr.reviewDuration > 0).length
    : 0;
  
  // Review metrics (all MRs)
  const avgReviewersPerMR = mrMetrics.length > 0
    ? mrMetrics.reduce((sum, mr) => sum + mr.reviewerCount, 0) / mrMetrics.length
    : 0;
    
  const avgCommentsPerMR = mrMetrics.length > 0
    ? mrMetrics.reduce((sum, mr) => sum + mr.commentCount, 0) / mrMetrics.length
    : 0;
  
  // Code metrics (all MRs)
  const avgLinesAddedPerMR = mrMetrics.length > 0
    ? mrMetrics.reduce((sum, mr) => sum + mr.linesAdded, 0) / mrMetrics.length
    : 0;
    
  const avgLinesDeletedPerMR = mrMetrics.length > 0
    ? mrMetrics.reduce((sum, mr) => sum + mr.linesDeleted, 0) / mrMetrics.length
    : 0;
    
  const avgFilesChangedPerMR = mrMetrics.length > 0
    ? mrMetrics.reduce((sum, mr) => sum + mr.filesChanged, 0) / mrMetrics.length
    : 0;
  
  // Weekly trends
  const weekGroups = groupMRsByWeek(mrMetrics);
  const weeklyTrends = Array.from(weekGroups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12) // Last 12 weeks
    .map(([week, mrs]) => {
      const mergedInWeek = mrs.filter(mr => mr.state === 'merged');
      return {
        week,
        mergedMRs: mergedInWeek.length,
        avgTimeToMerge: mergedInWeek.length > 0
          ? mergedInWeek.reduce((sum, mr) => sum + (mr.timeToMerge || 0), 0) / mergedInWeek.length
          : 0,
        avgLinesChanged: mrs.length > 0
          ? mrs.reduce((sum, mr) => sum + mr.linesAdded + mr.linesDeleted, 0) / mrs.length
          : 0,
        avgReviewers: mrs.length > 0
          ? mrs.reduce((sum, mr) => sum + mr.reviewerCount, 0) / mrs.length
          : 0
      };
    });
  
  // Size distribution
  const mrsBySize = {
    small: mrMetrics.filter(mr => (mr.linesAdded + mr.linesDeleted) < 100).length,
    medium: mrMetrics.filter(mr => {
      const total = mr.linesAdded + mr.linesDeleted;
      return total >= 100 && total < 500;
    }).length,
    large: mrMetrics.filter(mr => {
      const total = mr.linesAdded + mr.linesDeleted;
      return total >= 500 && total < 1000;
    }).length,
    xlarge: mrMetrics.filter(mr => (mr.linesAdded + mr.linesDeleted) >= 1000).length
  };
  
  // Reviewer distribution
  const mrsByReviewers = {
    none: mrMetrics.filter(mr => mr.reviewerCount === 0).length,
    one: mrMetrics.filter(mr => mr.reviewerCount === 1).length,
    two: mrMetrics.filter(mr => mr.reviewerCount === 2).length,
    three: mrMetrics.filter(mr => mr.reviewerCount === 3).length,
    fourPlus: mrMetrics.filter(mr => mr.reviewerCount >= 4).length
  };
  
  // Sample MRs for context
  const fastestMerges = mergedMRs
    .sort((a, b) => (a.timeToMerge || 0) - (b.timeToMerge || 0))
    .slice(0, 5);
    
  const slowestMerges = mergedMRs
    .sort((a, b) => (b.timeToMerge || 0) - (a.timeToMerge || 0))
    .slice(0, 5);
    
  const largestMRs = mrMetrics
    .sort((a, b) => (b.linesAdded + b.linesDeleted) - (a.linesAdded + a.linesDeleted))
    .slice(0, 5);
  
  return {
    avgTimeToMerge,
    avgTimeToFirstReview,
    avgDraftDuration,
    avgReviewDuration,
    avgReviewersPerMR,
    avgCommentsPerMR,
    avgLinesAddedPerMR,
    avgLinesDeletedPerMR,
    avgFilesChangedPerMR,
    weeklyTrends,
    mrsBySize,
    mrsByReviewers,
    fastestMerges,
    slowestMerges,
    largestMRs,
    totalMRsAnalyzed: mrMetrics.length,
    mergedMRsAnalyzed: mergedMRs.length,
    openMRsAnalyzed: openMRs.length,
    draftMRsAnalyzed: draftMRs.length
  };
}