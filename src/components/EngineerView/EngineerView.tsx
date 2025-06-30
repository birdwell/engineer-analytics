import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, TrendingUp, GitMerge, Clock, Eye, Code, Target, Calendar, BarChart3, Download } from 'lucide-react';
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

interface LoadingStage {
  stage: string;
  completed: boolean;
  data?: any;
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
  const [loadingStages, setLoadingStages] = useState<LoadingStage[]>([
    { stage: 'Fetching MR data', completed: false },
    { stage: 'Calculating basic metrics', completed: false },
    { stage: 'Analyzing comments', completed: false },
    { stage: 'Computing response times', completed: false },
    { stage: 'Generating insights', completed: false }
  ]);
  const [rawAnalyticsData, setRawAnalyticsData] = useState<any>(null);

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

  const updateLoadingStage = (stageIndex: number, completed: boolean, data?: any) => {
    setLoadingStages(prev => prev.map((stage, index) => 
      index === stageIndex ? { ...stage, completed, data } : stage
    ));
  };

  const loadEngineerData = async () => {
    if (!token || !projectId) return;
    
    setLoading(true);
    setError(null);
    setLoadingStages(prev => prev.map(stage => ({ ...stage, completed: false, data: undefined })));

    try {
      const history = await fetchEngineerMRHistoryProgressive(
        token, 
        projectId, 
        engineer.user.username, 
        selectedTimeframe,
        updateLoadingStage,
        setMRHistory,
        setRawAnalyticsData
      );
      
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

  const downloadCSV = () => {
    if (!rawAnalyticsData || !mrHistory) {
      alert('No data available for download');
      return;
    }

    const csvData = generateCSVData(mrHistory, rawAnalyticsData, engineer);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${engineer.user.username}_analytics_${selectedTimeframe}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
            <div className="text-center">
              <div className="w-12 h-12 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Engineer Analytics</h3>
              <p className="text-gray-600 mb-6">
                Analyzing performance data for {engineer.user.name} ({selectedTimeframe})...
              </p>
              
              {/* Progressive Loading Stages */}
              <div className="max-w-md mx-auto space-y-3">
                {loadingStages.map((stage, index) => (
                  <div key={index} className="flex items-center space-x-3 text-sm">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                      stage.completed 
                        ? 'bg-green-500 text-white' 
                        : index === loadingStages.findIndex(s => !s.completed)
                        ? 'bg-indigo-500 text-white animate-pulse'
                        : 'bg-gray-200'
                    }`}>
                      {stage.completed ? '✓' : index + 1}
                    </div>
                    <span className={`${
                      stage.completed 
                        ? 'text-green-700 font-medium' 
                        : index === loadingStages.findIndex(s => !s.completed)
                        ? 'text-indigo-700 font-medium'
                        : 'text-gray-500'
                    }`}>
                      {stage.stage}
                    </span>
                  </div>
                ))}
              </div>

              {/* Show partial data if available */}
              {mrHistory && (
                <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-sm text-blue-800">
                    <p className="font-semibold mb-2">Partial data loaded:</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>Authored MRs: {mrHistory.authoredMRs.length}</div>
                      <div>Reviewed MRs: {mrHistory.reviewedMRs.length}</div>
                      <div>Merged MRs: {mrHistory.mergedMRs.length}</div>
                      <div>Comments: {mrHistory.totalComments}</div>
                    </div>
                  </div>
                </div>
              )}
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
        <div className="flex items-center justify-between mb-8">
          <EngineerHeader 
            engineer={engineer} 
            onBack={onBack}
            selectedTimeframe={selectedTimeframe}
            onTimeframeChange={setSelectedTimeframe}
            loading={loading}
            cacheInfo={cacheInfo}
            onClearCache={handleClearCache}
          />
          
          {/* CSV Download Button */}
          {rawAnalyticsData && (
            <button
              onClick={downloadCSV}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              Download CSV
            </button>
          )}
        </div>

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

// Progressive loading function
async function fetchEngineerMRHistoryProgressive(
  token: string,
  projectId: string,
  username: string,
  timeframe: '7d' | '30d' | '90d',
  updateStage: (index: number, completed: boolean, data?: any) => void,
  setPartialData: (data: EngineerMRHistory) => void,
  setRawData: (data: any) => void
): Promise<EngineerMRHistory> {
  const { fetchEngineerMRHistoryWithStages } = await import('../../utils/engineerAnalytics');
  
  return fetchEngineerMRHistoryWithStages(
    token,
    projectId,
    username,
    timeframe,
    updateStage,
    setPartialData,
    setRawData
  );
}

// CSV generation function
function generateCSVData(mrHistory: EngineerMRHistory, rawData: any, engineer: EngineerStats): string {
  const headers = [
    'Data Type',
    'MR IID',
    'MR Title',
    'MR State',
    'Created At',
    'Merged At',
    'Author',
    'Reviewers',
    'Comments Count',
    'Lines Added',
    'Lines Deleted',
    'Files Changed',
    'Time to Merge (hours)',
    'Response Time (hours)',
    'Comment Body',
    'Comment Author',
    'Comment Created At',
    'Comment Category',
    'Complexity Score'
  ];

  const rows: string[] = [headers.join(',')];

  // Add MR data
  mrHistory.authoredMRs.forEach(mr => {
    const mrData = rawData.mrDetails?.[mr.iid] || {};
    rows.push([
      'Authored MR',
      mr.iid,
      `"${mr.title.replace(/"/g, '""')}"`,
      mr.state,
      mr.created_at,
      mr.merged_at || '',
      mr.author.name,
      mr.reviewers.map(r => r.name).join(';'),
      mrData.commentCount || 0,
      mrData.linesAdded || 0,
      mrData.linesDeleted || 0,
      mrData.filesChanged || 0,
      mrData.timeToMerge || '',
      mrData.responseTime || '',
      '',
      '',
      '',
      '',
      mrData.complexityScore || ''
    ].map(field => typeof field === 'string' && field.includes(',') ? `"${field}"` : field).join(','));
  });

  mrHistory.reviewedMRs.forEach(mr => {
    rows.push([
      'Reviewed MR',
      mr.iid,
      `"${mr.title.replace(/"/g, '""')}"`,
      mr.state,
      mr.created_at,
      mr.merged_at || '',
      mr.author.name,
      mr.reviewers.map(r => r.name).join(';'),
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      ''
    ].map(field => typeof field === 'string' && field.includes(',') ? `"${field}"` : field).join(','));
  });

  // Add comment data
  if (rawData.comments) {
    rawData.comments.forEach((comment: any) => {
      rows.push([
        'Comment',
        comment.mrIid || '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        `"${comment.body.replace(/"/g, '""')}"`,
        comment.author,
        comment.created_at,
        comment.category || '',
        ''
      ].map(field => typeof field === 'string' && field.includes(',') ? `"${field}"` : field).join(','));
    });
  }

  // Add response time data
  if (rawData.responseTimeData) {
    rawData.responseTimeData.forEach((response: any) => {
      rows.push([
        'Response Time',
        response.mrIid || '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        response.responseTimeHours || '',
        `"${response.reviewerComment.replace(/"/g, '""')}"`,
        response.reviewerAuthor,
        response.commentTime,
        '',
        ''
      ].map(field => typeof field === 'string' && field.includes(',') ? `"${field}"` : field).join(','));
    });
  }

  // Add summary metrics
  rows.push([
    'Summary Metric',
    'Avg Comments per MR',
    mrHistory.avgCommentsPerAuthoredMR.toString(),
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    ''
  ].join(','));

  rows.push([
    'Summary Metric',
    'Avg Time to Merge',
    mrHistory.avgTimeToMerge.toString(),
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    ''
  ].join(','));

  rows.push([
    'Summary Metric',
    'Avg Response Time',
    mrHistory.avgResponseTime.toString(),
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    ''
  ].join(','));

  return rows.join('\n');
}