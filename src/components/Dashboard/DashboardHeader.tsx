import React from 'react';
import { RefreshCw, LogOut, Loader2, Database, BarChart3, Users, Folder, GitBranch } from 'lucide-react';

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
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
      {/* Main Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
        <div className="flex items-center space-x-4 mb-4 lg:mb-0">
          {/* Logo/Icon */}
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
            <GitBranch className="w-6 h-6 text-white" />
          </div>
          
          {/* Title and Project Info */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">GitLab MR Dashboard</h1>
            <p className="text-sm text-gray-600">
              Monitor merge request activity and review assignments with complexity analysis
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onShowAnalytics}
            className="inline-flex items-center px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-medium rounded-lg shadow-sm hover:from-indigo-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Team Analytics
          </button>
          
          <button
            onClick={onDisconnect}
            className="inline-flex items-center px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Disconnect
          </button>
          
          <button
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Project Info and Status Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        {/* Project Badge */}
        {projectPath && (
          <div className="flex items-center space-x-3 mb-3 sm:mb-0">
            <div className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200">
              {isGroup ? (
                <Users className="w-4 h-4 text-indigo-600" />
              ) : (
                <Folder className="w-4 h-4 text-indigo-600" />
              )}
              <span className="text-sm font-medium text-indigo-700">
                {isGroup ? 'Group' : 'Project'}
              </span>
              <div className="w-1 h-1 bg-indigo-400 rounded-full"></div>
              <span className="text-sm font-semibold text-indigo-800 max-w-xs truncate">
                {projectPath}
              </span>
            </div>
            
            {isGroup && (
              <div className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full border border-blue-200">
                Multi-Repository Analysis
              </div>
            )}
          </div>
        )}

        {/* Status Indicators */}
        <div className="flex items-center space-x-3">
          {enhancementLoading && (
            <div className="flex items-center space-x-2 px-3 py-1.5 bg-amber-50 text-amber-700 text-sm font-medium rounded-lg border border-amber-200">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Loading complexity data...</span>
            </div>
          )}
          
          {hasComplexityData && (
            <div className="flex items-center space-x-2 px-3 py-1.5 bg-green-50 text-green-700 text-sm font-medium rounded-lg border border-green-200">
              <Database className="w-4 h-4" />
              <span>{cacheStats.cached}/{cacheStats.total} cached</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}