import React from 'react';
import { GitBranch, Eye, FileText, Users } from 'lucide-react';

interface StatsOverviewProps {
  totalOpenMRs: number;
  totalDraftMRs: number;
  totalReviews: number;
  isGroup?: boolean;
}

export default function StatsOverview({ totalOpenMRs, totalDraftMRs, totalReviews, isGroup }: StatsOverviewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <GitBranch className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <div className="ml-4">
            <div className="text-3xl font-bold text-gray-900">{totalOpenMRs}</div>
            <div className="text-sm font-medium text-gray-600">
              Open Merge Requests{isGroup && (
                <span className="block text-xs text-indigo-600">Across all group projects</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-gray-600" />
            </div>
          </div>
          <div className="ml-4">
            <div className="text-3xl font-bold text-gray-900">{totalDraftMRs}</div>
            <div className="text-sm font-medium text-gray-600">
              Draft Merge Requests{isGroup && (
                <span className="block text-xs text-indigo-600">Across all group projects</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Eye className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          <div className="ml-4">
            <div className="text-3xl font-bold text-gray-900">{totalReviews}</div>
            <div className="text-sm font-medium text-gray-600">
              Pending Reviews{isGroup && (
                <span className="block text-xs text-indigo-600">Across all group projects</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}