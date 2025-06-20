import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { EngineerStats } from '../../types/gitlab';
import { calculateWorkloadScore } from '../../utils/gitlab';
import TableHeader from './TableHeader';
import TableRow from './TableRow';

interface MRTableProps {
  engineerStats: EngineerStats[];
  hasComplexityData?: boolean;
  enhancementLoading?: boolean;
  mergeRequests?: any[];
  projectId?: string;
  projectPath?: string;
  token?: string;
  onEngineerClick?: (engineer: EngineerStats) => void;
}

type SortField = 'name' | 'openMRs' | 'draftMRs' | 'assignedReviews' | 'reviewComplexity' | 'workloadScore' | 'total';
type SortDirection = 'asc' | 'desc';

export default function MRTable({ 
  engineerStats, 
  hasComplexityData = false, 
  enhancementLoading = false,
  mergeRequests = [],
  projectId = '',
  projectPath = '',
  token = '',
  onEngineerClick
}: MRTableProps) {
  const [sortField, setSortField] = useState<SortField>('workloadScore');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'name' ? 'asc' : 'desc');
    }
  };

  // Helper function to create GitLab URL for reviewer's assigned MRs
  const createReviewerUrl = (username: string) => {
    if (!projectId && !projectPath) {
      console.warn('Missing project ID and project path for URL construction');
      return null;
    }

    // Use projectPath if available, otherwise use projectId
    const projectIdentifier = projectPath || projectId;
    
    return `https://gitlab.com/${projectIdentifier}/-/merge_requests/?sort=updated_desc&state=opened&reviewer_username=${username}&first_page_size=20`;
  };

  // Helper function to handle review click
  const handleReviewClick = (username: string, userName: string, assignedReviews: number) => {
    if (assignedReviews === 0) {
      alert(`${userName} has no assigned reviews.`);
      return;
    }

    if (!projectId && !projectPath) {
      alert('Project configuration missing. Unable to open GitLab URL.');
      return;
    }

    try {
      const reviewerUrl = createReviewerUrl(username);
      
      if (reviewerUrl) {
        window.open(reviewerUrl, '_blank');
      } else {
        alert('Unable to construct GitLab URL. Please check your project configuration.');
      }
    } catch (error) {
      console.error('Failed to open reviewer URL:', error);
      alert('Failed to open GitLab URL. Please try again.');
    }
  };

  const sortedStats = [...engineerStats].sort((a, b) => {
    let aValue: number | string;
    let bValue: number | string;

    switch (sortField) {
      case 'name':
        aValue = a.user.name.toLowerCase();
        bValue = b.user.name.toLowerCase();
        break;
      case 'openMRs':
        aValue = a.openMRs;
        bValue = b.openMRs;
        break;
      case 'draftMRs':
        aValue = a.draftMRs;
        bValue = b.draftMRs;
        break;
      case 'assignedReviews':
        aValue = a.assignedReviews;
        bValue = b.assignedReviews;
        break;
      case 'reviewComplexity':
        aValue = a.reviewComplexity;
        bValue = b.reviewComplexity;
        break;
      case 'workloadScore':
        aValue = calculateWorkloadScore(a);
        bValue = calculateWorkloadScore(b);
        break;
      case 'total':
        aValue = a.openMRs + a.draftMRs + a.assignedReviews;
        bValue = b.openMRs + b.draftMRs + b.assignedReviews;
        break;
      default:
        aValue = 0;
        bValue = 0;
    }

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    return sortDirection === 'asc' 
      ? (aValue as number) - (bValue as number)
      : (bValue as number) - (aValue as number);
  });

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Engineer Statistics</h2>
            <p className="text-sm text-gray-600 mt-1">
              {hasComplexityData 
                ? 'Workload analysis including MR complexity based on file changes and line modifications'
                : 'Basic workload analysis - complexity data loading in background'
              }
              {onEngineerClick && (
                <span className="block text-indigo-600 font-medium mt-1">
                  Click on engineer names to view detailed individual analytics
                </span>
              )}
            </p>
          </div>
          {enhancementLoading && (
            <div className="flex items-center space-x-2 text-sm text-indigo-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Loading complexity...</span>
            </div>
          )}
        </div>
      </div>
      
      {engineerStats.length === 0 ? (
        <div className="p-12 text-center text-gray-500">
          No engineer data found
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <TableHeader
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
              hasComplexityData={hasComplexityData}
              enhancementLoading={enhancementLoading}
            />
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedStats.map((stat) => (
                <TableRow
                  key={stat.user.id}
                  stat={stat}
                  hasComplexityData={hasComplexityData}
                  enhancementLoading={enhancementLoading}
                  onReviewClick={handleReviewClick}
                  onEngineerClick={onEngineerClick}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}