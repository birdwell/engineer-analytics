import React, { useState } from 'react';
import { DashboardData, EngineerStats } from '../../types/gitlab';
import { getNextReviewer } from '../../utils/gitlab';
import { getCacheStats } from '../../utils/complexityCache';
import PieChart from '../PieChart';
import MRTable from '../MRTable';
import EngineerView from '../EngineerView/EngineerView';
import DashboardHeader from './DashboardHeader';
import NextReviewerCard from './NextReviewerCard';
import StatsOverview from './StatsOverview';
import CalculationExplanation from './CalculationExplanation';

interface DashboardProps {
  data: DashboardData;
  onRefresh: () => void;
  onDisconnect: () => void;
  onShowAnalytics: () => void;
  loading: boolean;
  enhancementLoading?: boolean;
  projectId?: string;
  projectPath?: string;
  token?: string;
}

export default function Dashboard({ 
  data, 
  onRefresh, 
  onDisconnect, 
  onShowAnalytics, 
  loading, 
  enhancementLoading = false, 
  projectId, 
  projectPath, 
  token 
}: DashboardProps) {
  const [selectedEngineer, setSelectedEngineer] = useState<EngineerStats | null>(null);

  const totalOpenMRs = data.mergeRequests.filter(mr => !mr.draft).length;
  const totalDraftMRs = data.mergeRequests.filter(mr => mr.draft).length;
  const totalReviews = data.engineerStats.reduce((sum, stat) => sum + stat.assignedReviews, 0);
  const nextReviewer = getNextReviewer(data.engineerStats);
  const hasComplexityData = data.mrComplexities.length > 0;

  // Get cache statistics for the current project
  const cacheStats = React.useMemo(() => {
    if (hasComplexityData) {
      return { cached: data.mrComplexities.length, total: data.mergeRequests.length };
    }
    return { cached: 0, total: data.mergeRequests.length };
  }, [hasComplexityData, data.mrComplexities.length, data.mergeRequests.length]);

  const handleEngineerClick = (engineer: EngineerStats) => {
    setSelectedEngineer(engineer);
  };

  const handleBackToDashboard = () => {
    setSelectedEngineer(null);
  };

  // Show individual engineer view if selected
  if (selectedEngineer) {
    return (
      <EngineerView
        engineer={selectedEngineer}
        onBack={handleBackToDashboard}
        token={token}
        projectId={projectId}
        allMRs={data.mergeRequests}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DashboardHeader
          onRefresh={onRefresh}
          onDisconnect={onDisconnect}
          onShowAnalytics={onShowAnalytics}
          loading={loading}
          enhancementLoading={enhancementLoading}
          hasComplexityData={hasComplexityData}
          cacheStats={cacheStats}
        />

        {nextReviewer && (
          <NextReviewerCard
            nextReviewer={nextReviewer}
            hasComplexityData={hasComplexityData}
          />
        )}

        <StatsOverview
          totalOpenMRs={totalOpenMRs}
          totalDraftMRs={totalDraftMRs}
          totalReviews={totalReviews}
        />

        {/* Review Distribution Chart */}
        <div className="mb-8">
          <PieChart
            data={data.reviewDistribution}
            title="Review Assignment Distribution"
          />
        </div>

        {/* Engineer Statistics Table */}
        <div className="mb-8">
          <MRTable 
            engineerStats={data.engineerStats} 
            hasComplexityData={hasComplexityData}
            enhancementLoading={enhancementLoading}
            mergeRequests={data.mergeRequests}
            projectId={projectId}
            projectPath={projectPath}
            token={token}
            onEngineerClick={handleEngineerClick}
          />
        </div>

        <CalculationExplanation />
      </div>
    </div>
  );
}