import React from 'react';
import { User } from 'lucide-react';
import { EngineerStats } from '../../types/gitlab';
import { calculateWorkloadScore } from '../../utils/gitlab';

interface TableRowProps {
  stat: EngineerStats;
  hasComplexityData: boolean;
  enhancementLoading: boolean;
  onReviewClick: (username: string, userName: string, assignedReviews: number) => void;
  onEngineerClick?: (engineer: EngineerStats) => void;
}

export default function TableRow({ 
  stat, 
  hasComplexityData, 
  enhancementLoading, 
  onReviewClick,
  onEngineerClick
}: TableRowProps) {
  const workloadScore = calculateWorkloadScore(stat);
  const totalActivity = stat.openMRs + stat.draftMRs + stat.assignedReviews;

  // Helper functions for color classes
  const getOpenMRsColorClasses = (count: number): string => {
    if (count < 3) return 'bg-green-100 text-green-800';
    else if (count === 3) return 'bg-yellow-100 text-yellow-800';
    else return 'bg-red-100 text-red-800';
  };

  const getDraftMRsColorClasses = (): string => {
    return 'bg-gray-100 text-gray-800';
  };

  const getReviewsColorClasses = (count: number): string => {
    if (count < 4) return 'bg-green-100 text-green-800';
    else if (count === 4) return 'bg-yellow-100 text-yellow-800';
    else return 'bg-red-100 text-red-800';
  };

  const getReviewComplexityColorClasses = (score: number): string => {
    if (score <= 2) return 'bg-green-100 text-green-800';
    else if (score <= 5) return 'bg-yellow-100 text-yellow-800';
    else return 'bg-red-100 text-red-800';
  };

  const getWorkloadScoreColorClasses = (score: number): string => {
    if (score < 10) return 'bg-green-100 text-green-800';
    else if (score >= 10 && score <= 19) return 'bg-yellow-100 text-yellow-800';
    else return 'bg-red-100 text-red-800';
  };

  const getTotalActivityColorClasses = (total: number): string => {
    if (total <= 5) return 'bg-green-100 text-green-800';
    else if (total <= 10) return 'bg-yellow-100 text-yellow-800';
    else return 'bg-red-100 text-red-800';
  };

  const handleNameClick = () => {
    if (onEngineerClick) {
      onEngineerClick(stat);
    }
  };

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            {stat.user.avatar_url ? (
              <img
                className="h-10 w-10 rounded-full"
                src={stat.user.avatar_url}
                alt={stat.user.name}
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                <User className="h-5 w-5 text-gray-600" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div 
              className={`text-sm font-medium text-gray-900 truncate ${
                onEngineerClick ? 'cursor-pointer hover:text-indigo-600 hover:underline' : ''
              }`}
              onClick={handleNameClick}
            >
              {stat.user.name}
            </div>
            <div className="text-sm text-gray-500 truncate">
              @{stat.user.username}
            </div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-center">
        <div className="flex items-center justify-center">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getOpenMRsColorClasses(stat.openMRs)}`}>
            {stat.openMRs}
          </span>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-center">
        <div className="flex items-center justify-center">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getDraftMRsColorClasses()}`}>
            {stat.draftMRs}
          </span>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-center">
        <div className="flex items-center justify-center">
          {stat.assignedReviews > 0 ? (
            <button
              onClick={() => onReviewClick(stat.user.username, stat.user.name, stat.assignedReviews)}
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium hover:opacity-80 transition-opacity cursor-pointer ${getReviewsColorClasses(stat.assignedReviews)}`}
              title={`Click to view ${stat.assignedReviews} assigned review${stat.assignedReviews !== 1 ? 's' : ''} in GitLab`}
            >
              <span>{stat.assignedReviews}</span>
            </button>
          ) : (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getReviewsColorClasses(stat.assignedReviews)}`}>
              {stat.assignedReviews}
            </span>
          )}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-center">
        <div className="flex items-center justify-center">
          {hasComplexityData ? (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getReviewComplexityColorClasses(stat.reviewComplexity)}`}>
              {stat.reviewComplexity.toFixed(1)}
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
              {enhancementLoading ? '...' : '0.0'}
            </span>
          )}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-center">
        <div className="flex items-center justify-center">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getWorkloadScoreColorClasses(workloadScore)}`}>
            {workloadScore.toFixed(1)}
          </span>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-center">
        <div className="flex items-center justify-center">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTotalActivityColorClasses(totalActivity)}`}>
            {totalActivity}
          </span>
        </div>
      </td>
    </tr>
  );
}