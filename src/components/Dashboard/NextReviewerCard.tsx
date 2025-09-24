import React from 'react';
import { Users } from 'lucide-react';
import { EngineerStats } from '../../types/gitlab';
import { calculateWorkloadScore } from '../../utils/gitlab';
import { getEngineerTitle } from '../../utils/engineerTitles';

interface NextReviewerCardProps {
  nextReviewer: EngineerStats;
  hasComplexityData: boolean;
}

export default function NextReviewerCard({ nextReviewer, hasComplexityData }: NextReviewerCardProps) {
  const engineerTitle = getEngineerTitle(nextReviewer.user.username);
  
  return (
    <div className="mb-8">
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-2">Recommended Next Reviewer</h3>
            <div className="flex items-center space-x-3">
              {nextReviewer.user.avatar_url ? (
                <img
                  className="h-14 w-14 rounded-full border-2 border-white border-opacity-50"
                  src={nextReviewer.user.avatar_url}
                  alt={nextReviewer.user.name}
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-white bg-opacity-20 flex items-center justify-center">
                  <Users className="h-5 w-5" />
                </div>
              )}
              <div>
                <div className="text-base font-medium">{nextReviewer.user.name} (@{nextReviewer.user.username})</div>
                {engineerTitle && (
                  <div className="text-sm text-indigo-200 font-medium">{engineerTitle}</div>
                )}
                <div className="text-sm text-indigo-100 mt-1">
                  <span className="font-medium">{nextReviewer.assignedReviews} reviews</span>, <span className="font-medium">{nextReviewer.openMRs} open MRs</span>, <span className="font-medium">{nextReviewer.draftMRs} drafts</span>
                </div>
                {hasComplexityData && (
                  <div className="text-sm text-indigo-200 mt-1">
                    Review complexity: <span className="font-medium">{nextReviewer.reviewComplexity.toFixed(1)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-indigo-100 font-medium">Workload Score</div>
            <div className="text-3xl font-bold">
              {calculateWorkloadScore(nextReviewer).toFixed(1)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}