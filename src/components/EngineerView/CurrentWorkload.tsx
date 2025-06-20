import React from 'react';
import { Eye, GitBranch, FileText, Target } from 'lucide-react';
import { EngineerStats } from '../../types/gitlab';
import { calculateWorkloadScore } from '../../utils/gitlab';

interface CurrentWorkloadProps {
  engineer: EngineerStats;
}

export default function CurrentWorkload({ engineer }: CurrentWorkloadProps) {
  const workloadScore = calculateWorkloadScore(engineer);

  const getWorkloadColor = (score: number): string => {
    if (score < 10) return 'text-green-700 bg-green-50 border-green-200';
    if (score < 20) return 'text-yellow-700 bg-yellow-50 border-yellow-200';
    return 'text-red-700 bg-red-50 border-red-200';
  };

  const getWorkloadStatus = (score: number): string => {
    if (score < 10) return 'Light Load';
    if (score < 20) return 'Moderate Load';
    return 'Heavy Load';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Current Workload</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="text-center">
          <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <Eye className="w-6 h-6 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{engineer.assignedReviews}</div>
          <div className="text-sm text-gray-600">Pending Reviews</div>
        </div>

        <div className="text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <GitBranch className="w-6 h-6 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{engineer.openMRs}</div>
          <div className="text-sm text-gray-600">Open MRs</div>
        </div>

        <div className="text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <FileText className="w-6 h-6 text-gray-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{engineer.draftMRs}</div>
          <div className="text-sm text-gray-600">Draft MRs</div>
        </div>

        <div className="text-center">
          <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <Target className="w-6 h-6 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{workloadScore.toFixed(1)}</div>
          <div className="text-sm text-gray-600">Workload Score</div>
          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-2 border ${getWorkloadColor(workloadScore)}`}>
            {getWorkloadStatus(workloadScore)}
          </div>
        </div>
      </div>

      {engineer.reviewComplexity > 0 && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700">Review Complexity:</span>
            <span className="font-semibold text-gray-900">{engineer.reviewComplexity.toFixed(1)}</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-1">
            <span className="font-medium text-gray-700">Author Complexity:</span>
            <span className="font-semibold text-gray-900">{engineer.authorComplexity.toFixed(1)}</span>
          </div>
        </div>
      )}
    </div>
  );
}