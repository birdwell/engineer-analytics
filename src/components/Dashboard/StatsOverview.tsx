import React from 'react';
import { GitBranch, Eye, FileText, Users, ExternalLink } from 'lucide-react';

interface StatsOverviewProps {
  totalMRs: number;
  totalOpenMRs: number;
  totalDraftMRs: number;
  isGroup?: boolean;
  projectPath?: string;
}

export default function StatsOverview({ 
  totalMRs,
  totalOpenMRs, 
  totalDraftMRs, 
  isGroup,
  projectPath 
}: StatsOverviewProps) {
  const getGitLabMRUrl = (filter: 'all' | 'open' | 'draft') => {
    if (!projectPath) return null;
    
    const baseUrl = isGroup 
      ? `https://gitlab.com/groups/${projectPath}/-/merge_requests`
      : `https://gitlab.com/${projectPath}/-/merge_requests`;
    
    const params = new URLSearchParams({
      sort: 'updated_desc',
      first_page_size: '20'
    });
    
    switch (filter) {
      case 'all':
        params.set('state', 'opened');
        break;
      case 'open':
        params.set('state', 'opened');
        params.set('draft', 'no'); // Exclude drafts
        break;
      case 'draft':
        params.set('state', 'opened');
        params.set('draft', 'yes');
        break;
    }
    
    return `${baseUrl}?${params.toString()}`;
  };

  const handleCardClick = (filter: 'all' | 'open' | 'draft', count: number) => {
    if (count === 0) {
      return; // Don't navigate if there are no items
    }
    
    const url = getGitLabMRUrl(filter);
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const getCardClasses = (count: number) => {
    const baseClasses = "bg-white rounded-xl shadow-lg p-6 transition-all duration-200";
    
    if (count === 0) {
      return `${baseClasses} opacity-75`;
    }
    
    return `${baseClasses} hover:shadow-xl hover:-translate-y-1 cursor-pointer group`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      {/* Total Merge Requests Card */}
      <div 
        className={getCardClasses(totalMRs)}
        onClick={() => handleCardClick('all', totalMRs)}
        title={totalMRs > 0 ? "Click to view all merge requests in GitLab" : "No merge requests"}
      >
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
              <GitBranch className="w-5 h-5 text-indigo-600" />
            </div>
          </div>
          <div className="ml-4 flex-1">
            <div className="flex items-center space-x-2">
              <div className="text-3xl font-bold text-gray-900">{totalMRs}</div>
              {totalMRs > 0 && (
                <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-all duration-200" />
              )}
            </div>
            <div className="text-sm font-medium text-gray-600">
              Total Merge Requests
              {isGroup && (
                <span className="block text-xs text-indigo-600 mt-1">Across all group projects</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Open Merge Requests Card (Non-Draft) */}
      <div 
        className={getCardClasses(totalOpenMRs)}
        onClick={() => handleCardClick('open', totalOpenMRs)}
        title={totalOpenMRs > 0 ? "Click to view open (non-draft) merge requests in GitLab" : "No open merge requests"}
      >
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
              <Eye className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <div className="ml-4 flex-1">
            <div className="flex items-center space-x-2">
              <div className="text-3xl font-bold text-gray-900">{totalOpenMRs}</div>
              {totalOpenMRs > 0 && (
                <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-green-600 opacity-0 group-hover:opacity-100 transition-all duration-200" />
              )}
            </div>
            <div className="text-sm font-medium text-gray-600">
              Open Merge Requests
              {isGroup && (
                <span className="block text-xs text-indigo-600 mt-1">Non-draft MRs across all projects</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Draft Merge Requests Card */}
      <div 
        className={getCardClasses(totalDraftMRs)}
        onClick={() => handleCardClick('draft', totalDraftMRs)}
        title={totalDraftMRs > 0 ? "Click to view draft merge requests in GitLab" : "No draft merge requests"}
      >
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-gray-200 transition-colors">
              <FileText className="w-5 h-5 text-gray-600" />
            </div>
          </div>
          <div className="ml-4 flex-1">
            <div className="flex items-center space-x-2">
              <div className="text-3xl font-bold text-gray-900">{totalDraftMRs}</div>
              {totalDraftMRs > 0 && (
                <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-all duration-200" />
              )}
            </div>
            <div className="text-sm font-medium text-gray-600">
              Draft Merge Requests
              {isGroup && (
                <span className="block text-xs text-indigo-600 mt-1">Across all group projects</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}