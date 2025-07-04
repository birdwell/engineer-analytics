import React from 'react';
import { ArrowLeft, Database, Clock } from 'lucide-react';

interface AnalyticsHeaderProps {
  onBack: () => void;
  selectedTimeframe: '7d' | '30d' | '90d';
  onTimeframeChange: (timeframe: '7d' | '30d' | '90d') => void;
  loading: boolean;
  cacheInfo: { cached: boolean; lastUpdated: Date | null; timeframes: string[] };
  onClearCache: () => void;
}

export default function AnalyticsHeader({
  onBack,
  selectedTimeframe,
  onTimeframeChange,
  loading,
  cacheInfo,
  onClearCache
}: AnalyticsHeaderProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
      {/* Top Row - Back Button and Title */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </button>
          
          <div className="h-6 w-px bg-gray-300"></div>
          
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Team Analytics</h1>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-3">
          {cacheInfo.cached && (
            <button
              onClick={onClearCache}
              disabled={loading}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
            >
              <Database className="w-4 h-4 mr-2" />
              Clear Cache
            </button>
          )}
          
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Timeframe:</label>
            <select
              value={selectedTimeframe}
              onChange={(e) => onTimeframeChange(e.target.value as '7d' | '30d' | '90d')}
              disabled={loading}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 bg-white"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bottom Row - Description and Status */}
      <div className="flex items-center justify-between">
        <p className="text-gray-600">
          Comprehensive team metrics for merge request velocity and collaboration patterns
        </p>
        
        {cacheInfo.cached && (
          <div className="flex items-center space-x-2 text-sm text-green-700 bg-green-50 px-3 py-1.5 rounded-lg border border-green-200">
            <Database className="w-4 h-4" />
            <span className="font-medium">Cached data</span>
            {cacheInfo.lastUpdated && (
              <span className="text-green-600 flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>{cacheInfo.lastUpdated.toLocaleTimeString()}</span>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}