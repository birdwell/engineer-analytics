import React, { useState, useEffect } from 'react';
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
  const [isGroup, setIsGroup] = useState<boolean>(false);

  // Detect if this is a group analysis
  useEffect(() => {
    const detectGroupAnalysis = async () => {
      if (token && projectId) {
        try {
          // Try to fetch as a group first
          const groupResponse = await fetch(
            `https://gitlab.com/api/v4/groups/${encodeURIComponent(projectId)}`,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            }
          );
          
          setIsGroup(groupResponse.ok);
        } catch (error) {
          setIsGroup(false);
        }
      }
    };

    detectGroupAnalysis();
  }, [token, projectId]);

  // Fixed calculations
  const totalMRs = data.mergeRequests.length; // All MRs (draft + non-draft)
  const totalOpenMRs = data.mergeRequests.filter(mr => !mr.draft).length; // Non-draft MRs
  const totalDraftMRs = data.mergeRequests.filter(mr => mr.draft).length; // Draft MRs
  
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
          projectPath={projectPath}
          isGroup={isGroup}
        />

        {nextReviewer && (
          <NextReviewerCard
            nextReviewer={nextReviewer}
            hasComplexityData={hasComplexityData}
          />
        )}

        <StatsOverview
          totalMRs={totalMRs}
          totalOpenMRs={totalOpenMRs}
          totalDraftMRs={totalDraftMRs}
          isGroup={isGroup}
          projectPath={projectPath}
        />

        {/* Review Distribution Chart */}
        <div className="mb-8">
          <PieChart
            data={data.reviewDistribution}
            title={`Review Assignment Distribution${isGroup ? ' (All Group Projects)' : ''}`}
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
            isGroup={isGroup}
          />
        </div>

        <CalculationExplanation />
      </div>
    </div>
  );
}