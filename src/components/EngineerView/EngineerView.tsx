import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, TrendingUp, GitMerge, Clock, Eye, Code, Target, Calendar, BarChart3 } from 'lucide-react';
import { EngineerStats, MergeRequest } from '../../types/gitlab';
import { calculateWorkloadScore } from '../../utils/gitlab';
import { fetchEngineerMRHistory, EngineerMRHistory } from '../../utils/engineerAnalytics';
import { getEngineerCacheInfo, clearEngineerCache } from '../../utils/engineerCache';
import EngineerHeader from './EngineerHeader';
import CurrentWorkload from './CurrentWorkload';
import MRMetrics from './MRMetrics';
import ReviewMetrics from './ReviewMetrics';
import ResponseTimeMetrics from './ResponseTimeMetrics';
import TrendCharts from './TrendCharts';
import RecentActivity from './RecentActivity';
import ImprovementSuggestions from './ImprovementSuggestions';
import CommentAnalysis from './CommentAnalysis';

interface EngineerViewProps {
  engineer: EngineerStats;
  onBack: () => void;
  token?: string;
  projectId?: string;
  allMRs: MergeRequest[];
}

export default function EngineerView({ engineer, onBack, token, projectId, allMRs }: EngineerViewProps) {
  const [loading, setLoading] = useState(true);
  const [mrHistory, setMRHistory] = useState<EngineerMRHistory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'7d' | '30d' | '90d'>('30d');
  const [cacheInfo, setCacheInfo] = useState<{ cached: boolean; lastUpdated: Date | null; timeframes: string[] }>({ 
    cached: false, 
    lastUpdated: null, 
    timeframes: [] 
  });

  useEffect(() => {
    if (token && projectId) {
      const info = getEngineerCacheInfo(projectId, engineer.user.username);
      setCacheInfo(info);
      loadEngineerData();
    } else {
      setError('Missing authentication credentials');
      setLoading(false);
    }
  }, [engineer.user.id, selectedTimeframe]);

  const loadEngineerData = async () => {
    if (!token || !projectId) return;
    
    setLoading(true);
    setError(null);

    try {
      const history = await fetchEngineerMRHistory(token, projectId, engineer.user.username, selectedTimeframe);
      setMRHistory(history);
      
      const info = getEngineerCacheInfo(projectId, engineer.user.username);
      setCacheInfo(info);
    } catch (err) {
      console.error('Failed to load engineer data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load engineer data');
      
      // Fallback to basic data from current MRs
      const authoredMRs = allMRs.filter(mr => mr.author.id === engineer.user.id);
      const reviewedMRs = allMRs.filter(mr => 
        mr.reviewers.some(reviewer => reviewer.id === engineer.user.id)
      );
      const mergedMRs = authoredMRs.filter(mr => mr.state === 'merged');

      setMRHistory({
        authoredMRs,
        reviewedMRs,
        mergedMRs,
        weeklyStats: [],
        avgCommentsPerAuthoredMR: 0,
        avgReviewCyclesAsAuthor: 0,
        avgTimeToMerge: 0,
        avgResponseTime: 0,
        totalComments: 0,
        commentAnalysis: {
          totalComments: 0,
          categorizedComments: {},
          topIssues: [],
          recommendations: [],
          overallScore: 100
        },
        responseTimeMetrics: {
          avgResponseTime: 0,
          medianResponseTime: 0,
          fastestResponse: 0,
          slowestResponse: 0,
          responseRate: 0,
          totalComments: 0,
          respondedComments: 0,
          unresolvedComments: 0,
          responseTimeDistribution: {
            under1Hour: 0,
            under4Hours: 0,
            under24Hours: 0,
            under3Days: 0,
            over3Days: 0
          },
          commentsByDay: []
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClearCache = () => {
    if (projectId) {
      clearEngineerCache(projectId, engineer.user.username);
      const info = getEngineerCacheInfo(projectId, engineer.user.username);
      setCacheInfo(info);
      loadEngineerData();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
            <div className="text-center">
              <div className="w-12 h-12 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Engineer Analytics</h3>
              <p className="text-gray-600">
                Analyzing performance data for {engineer.user.name} ({selectedTimeframe})...
              </p>
              <div className="max-w-md mx-auto bg-blue-50 rounded-lg p-4 border border-blue-200 mt-6">
                <div className="flex items-start space-x-3">
                  <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    <p className="font-semibold mb-1">What we're analyzing:</p>
                    <ul className="text-left space-y-1">
                      <li>• Authored and reviewed merge requests</li>
                      <li>• Comment patterns and review cycles</li>
                      <li>• Time to merge and response metrics</li>
                      <li>• Response time to reviewer feedback</li>
                      <li>• Software engineering insights from feedback</li>
                      <li>• Weekly activity trends</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <EngineerHeader 
            engineer={engineer} 
            onBack={onBack}
            selectedTimeframe={selectedTimeframe}
            onTimeframeChange={setSelectedTimeframe}
            loading={loading}
            cacheInfo={cacheInfo}
            onClearCache={handleClearCache}
          />
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
            <div className="text-center max-w-md mx-auto">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Data</h3>
              <p className="text-gray-600 mb-6">{error}</p>
              <button
                onClick={loadEngineerData}
                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!mrHistory) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <EngineerHeader 
          engineer={engineer} 
          onBack={onBack}
          selectedTimeframe={selectedTimeframe}
          onTimeframeChange={setSelectedTimeframe}
          loading={loading}
          cacheInfo={cacheInfo}
          onClearCache={handleClearCache}
        />

        <div className="space-y-8">
          <CurrentWorkload engineer={engineer} />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <MRMetrics 
              authoredMRs={mrHistory.authoredMRs}
              mergedMRs={mrHistory.mergedMRs}
              avgCommentsPerAuthoredMR={mrHistory.avgCommentsPerAuthoredMR}
              avgReviewCyclesAsAuthor={mrHistory.avgReviewCyclesAsAuthor}
              avgTimeToMerge={mrHistory.avgTimeToMerge}
              totalComments={mrHistory.totalComments}
            />
            <ReviewMetrics 
              reviewedMRs={mrHistory.reviewedMRs}
              engineer={engineer}
              avgResponseTime={mrHistory.avgResponseTime}
              totalComments={mrHistory.totalComments}
            />
          </div>

          {/* Response Time Analysis */}
          <ResponseTimeMetrics metrics={mrHistory.responseTimeMetrics} />

          {/* Comment Analysis Section */}
          <CommentAnalysis analysis={mrHistory.commentAnalysis} />

          {mrHistory.weeklyStats.length > 0 && (
            <TrendCharts weeklyStats={mrHistory.weeklyStats} />
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <RecentActivity 
              authoredMRs={mrHistory.authoredMRs}
              reviewedMRs={mrHistory.reviewedMRs}
            />
            <ImprovementSuggestions 
              engineer={engineer}
              mrHistory={mrHistory}
            />
          </div>
        </div>
      </div>
    </div>
  );
}