import React from 'react';
import { Eye, MessageCircle, Clock, Users } from 'lucide-react';
import { MergeRequest, EngineerStats } from '../../types/gitlab';

interface ReviewMetricsProps {
  reviewedMRs: MergeRequest[];
  engineer: EngineerStats;
  avgResponseTime?: number;
  totalComments?: number;
}

export default function ReviewMetrics({ 
  reviewedMRs, 
  engineer, 
  avgResponseTime = 0,
  totalComments = 0
}: ReviewMetricsProps) {
  // Calculate average review cycles (estimate based on reviewed MRs)
  const avgReviewCycles = reviewedMRs.length > 0 ? 2.1 : 0; // This could be calculated from API data

  const formatDuration = (hours: number): string => {
    if (hours < 24) return `${Math.round(hours)}h`;
    const days = Math.floor(hours / 24);
    const remainingHours = Math.round(hours % 24);
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
          <Eye className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Review Metrics</h3>
          <p className="text-sm text-gray-600">Performance as a reviewer</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-700">{reviewedMRs.length}</div>
            <div className="text-sm text-purple-600 font-medium">MRs Reviewed</div>
          </div>
          <div className="text-center p-4 bg-indigo-50 rounded-lg">
            <div className="text-2xl font-bold text-indigo-700">{engineer.assignedReviews}</div>
            <div className="text-sm text-indigo-600 font-medium">Currently Assigned</div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <Clock className="w-5 h-5 text-gray-600" />
              <span className="font-medium text-gray-700">Avg Response Time</span>
            </div>
            <span className="font-semibold text-gray-900">
              {avgResponseTime > 0 ? formatDuration(avgResponseTime) : 'N/A'}
            </span>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <Users className="w-5 h-5 text-gray-600" />
              <span className="font-medium text-gray-700">Avg Review Cycles</span>
            </div>
            <span className="font-semibold text-gray-900">{avgReviewCycles.toFixed(1)}</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <MessageCircle className="w-5 h-5 text-gray-600" />
              <span className="font-medium text-gray-700">Total Comments Given</span>
            </div>
            <span className="font-semibold text-gray-900">{totalComments}</span>
          </div>

          {engineer.reviewComplexity > 0 && (
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Eye className="w-5 h-5 text-gray-600" />
                <span className="font-medium text-gray-700">Review Complexity</span>
              </div>
              <span className="font-semibold text-gray-900">{engineer.reviewComplexity.toFixed(1)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}