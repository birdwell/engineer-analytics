import React from 'react';
import { Clock, GitMerge, Eye, ExternalLink } from 'lucide-react';
import { MergeRequest } from '../../types/gitlab';

interface RecentActivityProps {
  authoredMRs: MergeRequest[];
  reviewedMRs: MergeRequest[];
}

export default function RecentActivity({ authoredMRs, reviewedMRs }: RecentActivityProps) {
  // Combine and sort recent activity
  const recentAuthored = authoredMRs
    .slice(0, 3)
    .map(mr => ({ ...mr, type: 'authored' as const }));
  
  const recentReviewed = reviewedMRs
    .slice(0, 3)
    .map(mr => ({ ...mr, type: 'reviewed' as const }));

  const recentActivity = [...recentAuthored, ...recentReviewed]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5);

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return `${Math.round(diffInHours)}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
          <Clock className="w-5 h-5 text-gray-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
          <p className="text-sm text-gray-600">Latest merge requests and reviews</p>
        </div>
      </div>

      <div className="space-y-4">
        {recentActivity.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No recent activity found</p>
          </div>
        ) : (
          recentActivity.map((item) => (
            <div key={`${item.type}-${item.id}`} className="flex items-center space-x-4 p-3 hover:bg-gray-50 rounded-lg transition-colors">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                item.type === 'authored' ? 'bg-blue-100' : 'bg-purple-100'
              }`}>
                {item.type === 'authored' ? (
                  <GitMerge className={`w-4 h-4 ${item.type === 'authored' ? 'text-blue-600' : 'text-purple-600'}`} />
                ) : (
                  <Eye className="w-4 h-4 text-purple-600" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    item.type === 'authored' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-purple-100 text-purple-800'
                  }`}>
                    {item.type === 'authored' ? 'Authored' : 'Reviewed'}
                  </span>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    item.state === 'merged' 
                      ? 'bg-green-100 text-green-800'
                      : item.draft
                      ? 'bg-gray-100 text-gray-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {item.state === 'merged' ? 'Merged' : item.draft ? 'Draft' : 'Open'}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-900 truncate mt-1">
                  {item.title}
                </p>
                <p className="text-xs text-gray-500">
                  !{item.iid} • {formatTimeAgo(item.updated_at)}
                </p>
              </div>
              
              <a
                href={item.web_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          ))
        )}
      </div>
    </div>
  );
}