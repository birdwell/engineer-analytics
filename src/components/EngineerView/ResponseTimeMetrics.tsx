import React from 'react';
import { Clock, MessageCircle, TrendingUp, CheckCircle, AlertCircle, BarChart3 } from 'lucide-react';
import { ResponseTimeMetrics as ResponseTimeMetricsType } from '../../utils/responseTimeAnalysis';

interface ResponseTimeMetricsProps {
  metrics: ResponseTimeMetricsType;
}

export default function ResponseTimeMetrics({ metrics }: ResponseTimeMetricsProps) {
  const formatDuration = (hours: number): string => {
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours < 24) return `${Math.round(hours)}h`;
    const days = Math.floor(hours / 24);
    const remainingHours = Math.round(hours % 24);
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  };

  const getResponseRateColor = (rate: number): string => {
    if (rate >= 80) return 'text-green-700 bg-green-100 border-green-200';
    if (rate >= 60) return 'text-yellow-700 bg-yellow-100 border-yellow-200';
    return 'text-red-700 bg-red-100 border-red-200';
  };

  const getResponseTimeColor = (hours: number): string => {
    if (hours <= 4) return 'text-green-700 bg-green-100 border-green-200';
    if (hours <= 24) return 'text-yellow-700 bg-yellow-100 border-yellow-200';
    return 'text-red-700 bg-red-100 border-red-200';
  };

  if (metrics.totalComments === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
            <Clock className="w-5 h-5 text-gray-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Response Time Analysis</h3>
            <p className="text-sm text-gray-600">How quickly you respond to feedback</p>
          </div>
        </div>

        <div className="text-center py-8 text-gray-500">
          <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg font-medium">No Comments to Analyze</p>
          <p className="text-sm mt-1">No reviewer comments found in the selected timeframe</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
          <Clock className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Response Time Analysis</h3>
          <p className="text-sm text-gray-600">How quickly you respond to feedback</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className={`text-center p-4 rounded-lg border ${getResponseTimeColor(metrics.avgResponseTime)}`}>
            <div className="text-2xl font-bold">{formatDuration(metrics.avgResponseTime)}</div>
            <div className="text-sm font-medium">Avg Response Time</div>
          </div>
          <div className={`text-center p-4 rounded-lg border ${getResponseRateColor(metrics.responseRate)}`}>
            <div className="text-2xl font-bold">{metrics.responseRate.toFixed(1)}%</div>
            <div className="text-sm font-medium">Response Rate</div>
          </div>
        </div>

        {/* Detailed Metrics */}
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <TrendingUp className="w-5 h-5 text-gray-600" />
              <span className="font-medium text-gray-700">Median Response Time</span>
            </div>
            <span className="font-semibold text-gray-900">{formatDuration(metrics.medianResponseTime)}</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="font-medium text-gray-700">Fastest Response</span>
            </div>
            <span className="font-semibold text-gray-900">{formatDuration(metrics.fastestResponse)}</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="font-medium text-gray-700">Slowest Response</span>
            </div>
            <span className="font-semibold text-gray-900">{formatDuration(metrics.slowestResponse)}</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <MessageCircle className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-gray-700">Comments Responded To</span>
            </div>
            <span className="font-semibold text-gray-900">
              {metrics.respondedComments} / {metrics.totalComments}
            </span>
          </div>
        </div>

        {/* Response Time Distribution */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900 flex items-center">
            <BarChart3 className="w-4 h-4 mr-2 text-indigo-600" />
            Response Time Distribution
          </h4>
          
          <div className="space-y-2">
            {[
              { label: 'Under 1 hour', count: metrics.responseTimeDistribution.under1Hour, color: 'bg-green-500' },
              { label: '1-4 hours', count: metrics.responseTimeDistribution.under4Hours, color: 'bg-blue-500' },
              { label: '4-24 hours', count: metrics.responseTimeDistribution.under24Hours, color: 'bg-yellow-500' },
              { label: '1-3 days', count: metrics.responseTimeDistribution.under3Days, color: 'bg-orange-500' },
              { label: 'Over 3 days', count: metrics.responseTimeDistribution.over3Days, color: 'bg-red-500' }
            ].map((item, index) => {
              const percentage = metrics.respondedComments > 0 
                ? (item.count / metrics.respondedComments) * 100 
                : 0;
              
              return (
                <div key={index} className="flex items-center space-x-3">
                  <div className="w-20 text-sm text-gray-600">{item.label}</div>
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${item.color}`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <div className="w-12 text-sm font-medium text-gray-900 text-right">
                    {item.count}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Performance Insights */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h5 className="font-medium text-blue-900 mb-2">💡 Response Time Insights</h5>
          <div className="text-sm text-blue-800 space-y-1">
            {metrics.avgResponseTime <= 4 && (
              <p>• Excellent responsiveness! You typically respond within 4 hours.</p>
            )}
            {metrics.avgResponseTime > 24 && (
              <p>• Consider setting aside time daily to respond to feedback more quickly.</p>
            )}
            {metrics.responseRate >= 80 && (
              <p>• Great engagement! You respond to most comments you receive.</p>
            )}
            {metrics.responseRate < 60 && (
              <p>• Try to acknowledge all feedback, even with a brief response.</p>
            )}
            {metrics.responseTimeDistribution.under1Hour > 0 && (
              <p>• You've shown you can respond very quickly when needed.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}