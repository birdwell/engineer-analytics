import React from 'react';
import { RefreshCw, LogOut, Loader2, Database, BarChart3, Users, Folder } from 'lucide-react';

interface DashboardHeaderProps {
  onRefresh: () => void;
  onDisconnect: () => void;
  onShowAnalytics: () => void;
  loading: boolean;
  enhancementLoading: boolean;
  hasComplexityData: boolean;
  cacheStats: { cached: number; total: number };
  projectPath?: string;
  isGroup?: boolean;
}

export default function DashboardHeader({
  onRefresh,
  onDisconnect,
  onShowAnalytics,
  loading,
  enhancementLoading,
  hasComplexityData,
  cacheStats,
  projectPath,
  isGroup
}: DashboardHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
      <div>
        <div className="flex items-center space-x-3 mb-2">
          <h1 className="text-3xl font-bold text-gray-900">GitLab MR Dashboard</h1>
          {projectPath && (
            <div className="flex items-center space-x-2 px-3 py-1 bg-indigo-50 rounded-full border border-indigo-200">
              {isGroup ? (
                <Users className="w-4 h-4 text-indigo-600" />
              ) : (
                <Folder className="w-4 h-4 text-indigo-600" />
              )}
              <span className="text-sm font-medium text-indigo-700">
                {isGroup ? 'Group' : 'Project'}: {projectPath}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-4">
          <p className="text-base text-gray-600">
            Monitor merge request activity and review assignments with complexity analysis
            {isGroup && (
              <span className="block text-indigo-600 font-medium mt-1">
                Analyzing all repositories in the group
              </span>
            )}
          </p>
          {enhancementLoading && (
            <div className="flex items-center space-x-2 text-sm text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="font-medium">Loading complexity data...</span>
            </div>
          )}
          {hasComplexityData && (
            <div className="flex items-center space-x-2 text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">
              <Database className="w-4 h-4" />
              <span className="font-medium">{cacheStats.cached}/{cacheStats.total} cached</span>
            </div>
          )}
        </div>
      </div>
      <div className="mt-4 sm:mt-0 flex items-center space-x-3">
        <button
          onClick={onShowAnalytics}
          className="inline-flex items-center px-4 py-2 border border-indigo-300 rounded-lg shadow-sm text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
        >
          <BarChart3 className="w-4 h-4 mr-2" />
          Analytics
        </button>
        <button
          onClick={onDisconnect}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Disconnect
        </button>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>
    </div>
  );
}