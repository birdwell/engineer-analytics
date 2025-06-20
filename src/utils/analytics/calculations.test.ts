import { describe, it, expect } from 'vitest';
import { 
  calculateHoursDifference, 
  isHumanReviewComment, 
  parseDiffStats,
  calculateMRMetrics,
  calculateTeamAnalytics
} from './calculations';
import { GitLabMR, GitLabNote, GitLabChanges, MRMetrics } from './types';

describe('calculateHoursDifference', () => {
  it('should calculate correct hour difference', () => {
    const start = '2024-01-01T10:00:00Z';
    const end = '2024-01-01T12:30:00Z';
    
    expect(calculateHoursDifference(start, end)).toBe(2.5);
  });
  
  it('should return 0 for negative differences', () => {
    const start = '2024-01-01T12:00:00Z';
    const end = '2024-01-01T10:00:00Z';
    
    expect(calculateHoursDifference(start, end)).toBe(0);
  });
});

describe('isHumanReviewComment', () => {
  const authorId = 123;
  
  it('should return false for system notes', () => {
    const note: GitLabNote = {
      id: 1,
      author: { id: 456, name: 'Reviewer', username: 'reviewer' },
      created_at: '2024-01-01T10:00:00Z',
      body: 'Some comment',
      system: true
    };
    
    expect(isHumanReviewComment(note, authorId)).toBe(false);
  });
  
  it('should return false for author comments', () => {
    const note: GitLabNote = {
      id: 1,
      author: { id: 123, name: 'Author', username: 'author' },
      created_at: '2024-01-01T10:00:00Z',
      body: 'Some comment',
      system: false
    };
    
    expect(isHumanReviewComment(note, authorId)).toBe(false);
  });
  
  it('should return false for empty comments', () => {
    const note: GitLabNote = {
      id: 1,
      author: { id: 456, name: 'Reviewer', username: 'reviewer' },
      created_at: '2024-01-01T10:00:00Z',
      body: '   ',
      system: false
    };
    
    expect(isHumanReviewComment(note, authorId)).toBe(false);
  });
  
  it('should return false for automated comments', () => {
    const note: GitLabNote = {
      id: 1,
      author: { id: 456, name: 'Reviewer', username: 'reviewer' },
      created_at: '2024-01-01T10:00:00Z',
      body: 'Pipeline passed automatically',
      system: false
    };
    
    expect(isHumanReviewComment(note, authorId)).toBe(false);
  });
  
  it('should return true for valid human review comments', () => {
    const note: GitLabNote = {
      id: 1,
      author: { id: 456, name: 'Reviewer', username: 'reviewer' },
      created_at: '2024-01-01T10:00:00Z',
      body: 'This looks good to me!',
      system: false
    };
    
    expect(isHumanReviewComment(note, authorId)).toBe(true);
  });
});

describe('parseDiffStats', () => {
  it('should correctly parse diff statistics', () => {
    const diff = `@@ -1,3 +1,4 @@
 line 1
-old line
+new line
+added line
 line 3`;
    
    const stats = parseDiffStats(diff);
    
    expect(stats.added).toBe(2);
    expect(stats.deleted).toBe(1);
  });
  
  it('should ignore diff headers', () => {
    const diff = `--- a/file.txt
+++ b/file.txt
@@ -1,1 +1,2 @@
 existing line
+new line`;
    
    const stats = parseDiffStats(diff);
    
    expect(stats.added).toBe(1);
    expect(stats.deleted).toBe(0);
  });
});

describe('calculateMRMetrics', () => {
  const mockMR: GitLabMR = {
    id: 1,
    iid: 100,
    title: 'Test MR',
    author: { id: 123, name: 'Author', username: 'author' },
    created_at: '2024-01-01T10:00:00Z',
    merged_at: '2024-01-01T14:00:00Z',
    state: 'merged',
    web_url: 'https://gitlab.com/test/mr/100',
    reviewers: [
      { id: 456, name: 'Reviewer 1', username: 'reviewer1' },
      { id: 789, name: 'Reviewer 2', username: 'reviewer2' }
    ]
  };
  
  it('should calculate basic MR metrics', () => {
    const notes: GitLabNote[] = [
      {
        id: 1,
        author: { id: 456, name: 'Reviewer 1', username: 'reviewer1' },
        created_at: '2024-01-01T12:00:00Z',
        body: 'This looks good!',
        system: false
      }
    ];
    
    const changes: GitLabChanges = {
      changes: [
        {
          diff: '+new line\n-old line',
          new_file: false,
          renamed_file: false,
          deleted_file: false
        }
      ]
    };
    
    const metrics = calculateMRMetrics(mockMR, notes, changes);
    
    expect(metrics.id).toBe(1);
    expect(metrics.iid).toBe(100);
    expect(metrics.title).toBe('Test MR');
    expect(metrics.author).toBe('Author');
    expect(metrics.state).toBe('merged');
    expect(metrics.reviewerCount).toBe(2);
    expect(metrics.commentCount).toBe(1);
    expect(metrics.linesAdded).toBe(1);
    expect(metrics.linesDeleted).toBe(1);
    expect(metrics.filesChanged).toBe(1);
    expect(metrics.timeToMerge).toBe(4); // 4 hours
  });
  
  it('should handle MRs without changes data', () => {
    const metrics = calculateMRMetrics(mockMR, []);
    
    expect(metrics.linesAdded).toBe(0);
    expect(metrics.linesDeleted).toBe(0);
    expect(metrics.filesChanged).toBe(0);
  });
});

describe('calculateTeamAnalytics', () => {
  const mockMRMetrics: MRMetrics[] = [
    {
      id: 1, iid: 100, title: 'MR 1', author: 'Author 1', createdAt: '2024-01-01T10:00:00Z',
      mergedAt: '2024-01-01T12:00:00Z', state: 'merged', webUrl: 'url1', isDraft: false,
      timeToMerge: 2, reviewerCount: 2, commentCount: 3, linesAdded: 50, linesDeleted: 10,
      filesChanged: 3, reviewDuration: 2, draftDuration: 0
    },
    {
      id: 2, iid: 101, title: 'MR 2', author: 'Author 2', createdAt: '2024-01-01T10:00:00Z',
      mergedAt: '2024-01-01T16:00:00Z', state: 'merged', webUrl: 'url2', isDraft: false,
      timeToMerge: 6, reviewerCount: 1, commentCount: 1, linesAdded: 100, linesDeleted: 20,
      filesChanged: 5, reviewDuration: 6, draftDuration: 0
    },
    {
      id: 3, iid: 102, title: 'MR 3', author: 'Author 3', createdAt: '2024-01-01T10:00:00Z',
      state: 'opened', webUrl: 'url3', isDraft: false, reviewerCount: 3, commentCount: 2,
      linesAdded: 25, linesDeleted: 5, filesChanged: 2
    }
  ];
  
  it('should calculate correct team analytics', () => {
    const analytics = calculateTeamAnalytics(mockMRMetrics);
    
    expect(analytics.totalMRsAnalyzed).toBe(3);
    expect(analytics.mergedMRsAnalyzed).toBe(2);
    expect(analytics.openMRsAnalyzed).toBe(1);
    expect(analytics.avgTimeToMerge).toBe(4); // (2 + 6) / 2
    expect(analytics.avgReviewersPerMR).toBe(2); // (2 + 1 + 3) / 3
    expect(analytics.avgCommentsPerMR).toBe(2); // (3 + 1 + 2) / 3
    expect(analytics.avgLinesAddedPerMR).toBe(58.33333333333333); // (50 + 100 + 25) / 3
    expect(analytics.avgLinesDeletedPerMR).toBe(11.666666666666666); // (10 + 20 + 5) / 3
    expect(analytics.avgFilesChangedPerMR).toBe(3.3333333333333335); // (3 + 5 + 2) / 3
  });
  
  it('should handle empty metrics array', () => {
    const analytics = calculateTeamAnalytics([]);
    
    expect(analytics.totalMRsAnalyzed).toBe(0);
    expect(analytics.mergedMRsAnalyzed).toBe(0);
    expect(analytics.openMRsAnalyzed).toBe(0);
    expect(analytics.avgTimeToMerge).toBe(0);
    expect(analytics.avgReviewersPerMR).toBe(0);
    expect(analytics.avgCommentsPerMR).toBe(0);
  });
  
  it('should calculate size distribution correctly', () => {
    const analytics = calculateTeamAnalytics(mockMRMetrics);
    
    expect(analytics.mrsBySize.small).toBe(1); // MR 3: 30 lines total
    expect(analytics.mrsBySize.medium).toBe(2); // MR 1: 60 lines, MR 2: 120 lines
    expect(analytics.mrsBySize.large).toBe(0);
    expect(analytics.mrsBySize.xlarge).toBe(0);
  });
  
  it('should calculate reviewer distribution correctly', () => {
    const analytics = calculateTeamAnalytics(mockMRMetrics);
    
    expect(analytics.mrsByReviewers.none).toBe(0);
    expect(analytics.mrsByReviewers.one).toBe(1); // MR 2
    expect(analytics.mrsByReviewers.two).toBe(1); // MR 1
    expect(analytics.mrsByReviewers.three).toBe(1); // MR 3
    expect(analytics.mrsByReviewers.fourPlus).toBe(0);
  });
});