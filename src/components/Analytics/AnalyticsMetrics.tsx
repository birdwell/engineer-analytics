import React from 'react';
import { Eye, GitMerge, Users, Activity } from 'lucide-react';
import { AnalyticsResult } from '../../utils/analytics';

interface AnalyticsMetricsProps {
  analytics: AnalyticsResult;
}

export default function AnalyticsMetrics({ analytics }: AnalyticsMetricsProps) {
  const formatDuration = (hours: number): string => {
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours < 24) return `${Math.round(hours)}h`;
    const days = Math.floor(hours / 24);
    const remainingHours = Math.round(hours % 24);
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  };

  const getPerformanceColor = (value: number, thresholds: { good: number; warning: number }): string => {
    if (value <= thresholds.good) return 'border-green-400 bg-green-50';
    if (value <= thresholds.warning) return 'border-yellow-400 bg-yellow-50';
    return 'border-red-400 bg-red-50';
  };

  const getPerformanceTextColor = (value: number, thresholds: { good: number; warning: number }): string => {
    if (value <= thresholds.good) return 'text-green-700';
    if (value <= thresholds.warning) return 'text-yellow-700';
    return 'text-red-700';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div className={`bg-white rounded-xl shadow-sm border-2 p-6 ${getPerformanceColor(analytics.avgTimeToFirstReview, { good: 4, warning: 24 })}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
            <Eye className="w-5 h-5 text-indigo-600" />
          </div>
          <div className={`text-2xl font-bold ${getPerformanceTextColor(analytics.avgTimeToFirstReview, { good: 4, warning: 24 })}`}>
            {analytics.avgTimeToFirstReview > 0 ? formatDuration(analytics.avgTimeToFirstReview) : 'N/A'}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Time to Review Request</h3>
          <p className="text-xs text-gray-600">Average time until reviewers are assigned</p>
        </div>
      </div>

      <div className={`bg-white rounded-xl shadow-sm border-2 p-6 ${analytics.avgTimeToMerge > 0 ? getPerformanceColor(analytics.avgTimeToMerge, { good: 48, warning: 168 }) : 'border-gray-200 bg-gray-50'}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <GitMerge className="w-5 h-5 text-green-600" />
          </div>
          <div className={`text-2xl font-bold ${analytics.avgTimeToMerge > 0 ? getPerformanceTextColor(analytics.avgTimeToMerge, { good: 48, warning: 168 }) : 'text-gray-500'}`}>
            {analytics.avgTimeToMerge > 0 ? formatDuration(analytics.avgTimeToMerge) : 'N/A'}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Time to Merge</h3>
          <p className="text-xs text-gray-600">
            Average time from creation to merge
            {analytics.mergedMRsAnalyzed === 0 && (
              <span className="block text-red-600 mt-1">No merged MRs in timeframe</span>
            )}
          </p>
        </div>
      </div>

      <div className={`bg-white rounded-xl shadow-sm border-2 p-6 ${getPerformanceColor(analytics.avgReviewCycles, { good: 2, warning: 4 })}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <Users className="w-5 h-5 text-purple-600" />
          </div>
          <div className={`text-2xl font-bold ${getPerformanceTextColor(analytics.avgReviewCycles, { good: 2, warning: 4 })}`}>
            {analytics.avgReviewCycles.toFixed(1)}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Reviewers per MR</h3>
          <p className="text-xs text-gray-600">Average number of reviewers assigned</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border-2 border-indigo-200 bg-indigo-50 p-6">
        <div className="flex items-center justify-between mb-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
            <Activity className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-indigo-700">
            {analytics.totalMRsAnalyzed}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-1">MRs Analyzed</h3>
          <p className="text-xs text-gray-600">Total merge requests in analysis</p>
        </div>
      </div>
    </div>
  );
}