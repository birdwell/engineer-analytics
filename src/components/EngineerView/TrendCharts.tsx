import React from 'react';
import { TrendingUp, GitMerge, Eye, BarChart3 } from 'lucide-react';

interface TrendChartsProps {
  weeklyStats: Array<{
    week: string;
    authored: number;
    reviewed: number;
    merged: number;
  }>;
}

export default function TrendCharts({ weeklyStats }: TrendChartsProps) {
  const maxValue = Math.max(
    ...weeklyStats.flatMap(stat => [stat.authored, stat.reviewed, stat.merged])
  );

  const getBarHeight = (value: number): string => {
    return `${(value / maxValue) * 100}%`;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Activity Trends</h3>
          <p className="text-sm text-gray-600">Weekly activity over time</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-sm font-medium text-gray-700">Authored</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
            <span className="text-sm font-medium text-gray-700">Reviewed</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm font-medium text-gray-700">Merged</span>
          </div>
        </div>

        <div className="h-64 flex items-end space-x-2">
          {weeklyStats.map((stat, index) => (
            <div key={index} className="flex-1 flex flex-col items-center space-y-1">
              <div className="w-full flex items-end space-x-1 h-48">
                <div 
                  className="flex-1 bg-blue-500 rounded-t"
                  style={{ height: getBarHeight(stat.authored) }}
                  title={`Authored: ${stat.authored}`}
                ></div>
                <div 
                  className="flex-1 bg-purple-500 rounded-t"
                  style={{ height: getBarHeight(stat.reviewed) }}
                  title={`Reviewed: ${stat.reviewed}`}
                ></div>
                <div 
                  className="flex-1 bg-green-500 rounded-t"
                  style={{ height: getBarHeight(stat.merged) }}
                  title={`Merged: ${stat.merged}`}
                ></div>
              </div>
              <div className="text-xs text-gray-600 text-center">
                {new Date(stat.week).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}