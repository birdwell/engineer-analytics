import React, { useState, useEffect } from 'react';
import { Loader2, AlertTriangle, Activity, BarChart3, TrendingUp } from 'lucide-react';
import { DashboardData } from '../../types/gitlab';
import { calculateReviewMetrics, AnalyticsResult } from '../../utils/analytics';
import { getAnalyticsCacheInfo, clearAnalyticsCache } from '../../utils/analyticsCache';
import AnalyticsHeader from './AnalyticsHeader';
import AnalyticsMetrics from './AnalyticsMetrics';
import PerformanceInsights from './PerformanceInsights';

interface AnalyticsProps {
  data: DashboardData;
  onBack: () => void;
  token?: string;
  projectId?: string;
}

export default function Analytics({ data, onBack, token, projectId }: AnalyticsProps) {
  const [analytics, setAnalytics] = useState<AnalyticsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState<string>('');
  const [selectedTimeframe, setSelectedTimeframe] = useState<'7d' | '30d' | '90d'>('30d');
  const [error, setError] = useState<string | null>(null);
  const [cacheInfo, setCacheInfo] = useState<{ cached: boolean; lastUpdated: Date | null; timeframes: string[] }>({ 
    cached: false, 
    lastUpdated: null, 
    timeframes: [] 
  });

  useEffect(() => {
    if (token && projectId) {
      const info = getAnalyticsCacheInfo(projectId);
      setCacheInfo(info);
      loadAnalytics();
    } else {
      setError('Missing authentication credentials');
      setLoading(false);
    }
  }, [token, projectId, selectedTimeframe]);

  const loadAnalytics = async () => {
    if (!token || !projectId) return;
    
    setLoading(true);
    setError(null);
    setLoadingProgress('Initializing team analysis...');
    
    try {
      // Add timeout to the entire analytics calculation
      const analyticsPromise = calculateReviewMetrics(token, projectId, data.mergeRequests, selectedTimeframe);
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Analytics calculation timeout after 60 seconds')), 60000)
      );
      
      const result = await Promise.race([analyticsPromise, timeoutPromise]);
      setAnalytics(result);
      setLoadingProgress('');
      
      const info = getAnalyticsCacheInfo(projectId);
      setCacheInfo(info);
    } catch (error) {
      console.error('Failed to load analytics:', error);
      setError(error instanceof Error ? error.message : 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const handleClearCache = () => {
    if (projectId) {
      clearAnalyticsCache(projectId);
      const info = getAnalyticsCacheInfo(projectId);
      setCacheInfo(info);
      loadAnalytics();
    }
  };

  const getTimeframeLabel = (timeframe: '7d' | '30d' | '90d'): string => {
    switch (timeframe) {
      case '7d': return 'Last 7 Days';
      case '30d': return 'Last 30 Days';
      case '90d': return 'Last 90 Days';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnalyticsHeader
          onBack={onBack}
          selectedTimeframe={selectedTimeframe}
          onTimeframeChange={setSelectedTimeframe}
          loading={loading}
          cacheInfo={cacheInfo}
          onClearCache={handleClearCache}
        />

        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
            <div className="text-center">
              <div className="w-12 h-12 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Analyzing Team Metrics</h3>
              <p className="text-gray-600 mb-4">
                {loadingProgress || 'Processing merge request data and calculating team insights...'}
              </p>
              
              <div className="max-w-md mx-auto bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-start space-x-3">
                  <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    <p className="font-semibold mb-1">What we're analyzing:</p>
                    <ul className="text-left space-y-1">
                      <li>• Merge request velocity and timing</li>
                      <li>• Code review patterns and collaboration</li>
                      <li>• Team workload distribution</li>
                    </ul>
                    <p className="text-xs mt-3 text-blue-600">
                      This may take up to 60 seconds for large projects.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
            <div className="text-center max-w-md mx-auto">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Analytics Error</h3>
              <p className="text-gray-600 mb-6">{error}</p>
              <button
                onClick={loadAnalytics}
                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                <Activity className="w-4 h-4 mr-2" />
                Retry Analysis
              </button>
            </div>
          </div>
        ) : analytics ? (
          <div className="space-y-8">
            {/* Summary Card */}
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl border border-indigo-200 p-6">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <BarChart3 className="w-6 h-6 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-indigo-900 mb-2">Analysis Summary</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-indigo-800">Total MRs:</span>
                      <span className="ml-2 text-indigo-700">{analytics.totalMRsAnalyzed}</span>
                    </div>
                    <div>
                      <span className="font-medium text-indigo-800">Merged:</span>
                      <span className="ml-2 text-indigo-700">{analytics.mergedMRsAnalyzed}</span>
                    </div>
                    <div>
                      <span className="font-medium text-indigo-800">Open:</span>
                      <span className="ml-2 text-indigo-700">{analytics.openMRsAnalyzed}</span>
                    </div>
                  </div>
                  <p className="text-sm text-indigo-700 mt-2">
                    Analysis covers <span className="font-medium">{getTimeframeLabel(selectedTimeframe).toLowerCase()}</span>
                    {cacheInfo.cached && <span className="font-medium"> • Data cached for improved performance</span>}
                  </p>
                </div>
              </div>
            </div>

            <AnalyticsMetrics analytics={analytics} />
            <PerformanceInsights />
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
            <div className="text-center text-gray-500">
              <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Analytics Data Available</h3>
              <p className="text-gray-600">Ensure you have the necessary permissions to access MR data</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}