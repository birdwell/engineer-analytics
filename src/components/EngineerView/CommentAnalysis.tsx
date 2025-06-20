import React from 'react';
import { MessageSquare, TrendingUp, AlertTriangle, CheckCircle, BookOpen, Target, Lightbulb } from 'lucide-react';

interface CommentAnalysisProps {
  analysis: {
    totalComments: number;
    categorizedComments: {
      [category: string]: {
        count: number;
        percentage: number;
        examples: string[];
        principle: string;
        description: string;
        severity: 'low' | 'medium' | 'high';
      };
    };
    topIssues: Array<{
      category: string;
      count: number;
      percentage: number;
      principle: string;
      severity: 'low' | 'medium' | 'high';
    }>;
    recommendations: Array<{
      principle: string;
      description: string;
      actionItems: string[];
      priority: 'high' | 'medium' | 'low';
    }>;
    overallScore: number;
  };
}

export default function CommentAnalysis({ analysis }: CommentAnalysisProps) {
  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-700 bg-green-100 border-green-200';
    if (score >= 60) return 'text-yellow-700 bg-yellow-100 border-yellow-200';
    return 'text-red-700 bg-red-100 border-red-200';
  };

  const getSeverityColor = (severity: 'low' | 'medium' | 'high'): string => {
    switch (severity) {
      case 'high': return 'text-red-700 bg-red-100 border-red-200';
      case 'medium': return 'text-yellow-700 bg-yellow-100 border-yellow-200';
      case 'low': return 'text-blue-700 bg-blue-100 border-blue-200';
    }
  };

  const getPriorityIcon = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'medium': return <Target className="w-4 h-4 text-yellow-600" />;
      case 'low': return <Lightbulb className="w-4 h-4 text-blue-600" />;
    }
  };

  if (analysis.totalComments === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-gray-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Comment Analysis</h3>
            <p className="text-sm text-gray-600">Software engineering insights from MR feedback</p>
          </div>
        </div>

        <div className="text-center py-8 text-gray-500">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg font-medium">No Comments to Analyze</p>
          <p className="text-sm mt-1">No review comments found in the selected timeframe</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Comment Analysis</h3>
            <p className="text-sm text-gray-600">Software engineering insights from {analysis.totalComments} review comments</p>
          </div>
        </div>

        {/* Overall Score */}
        <div className={`px-4 py-2 rounded-lg border ${getScoreColor(analysis.overallScore)}`}>
          <div className="text-center">
            <div className="text-2xl font-bold">{analysis.overallScore}</div>
            <div className="text-xs font-medium">Code Quality Score</div>
          </div>
        </div>
      </div>

      {/* Top Issues */}
      {analysis.topIssues.length > 0 && (
        <div className="mb-6">
          <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
            <TrendingUp className="w-4 h-4 mr-2 text-indigo-600" />
            Most Common Feedback Areas
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {analysis.topIssues.slice(0, 4).map((issue, index) => (
              <div key={index} className={`p-3 rounded-lg border ${getSeverityColor(issue.severity)}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">{issue.category}</span>
                  <span className="text-xs font-semibold">{issue.count} comments</span>
                </div>
                <div className="text-xs opacity-80">{issue.principle}</div>
                <div className="mt-2">
                  <div className="w-full bg-white bg-opacity-50 rounded-full h-1.5">
                    <div 
                      className="h-1.5 rounded-full bg-current opacity-60"
                      style={{ width: `${Math.min(issue.percentage, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      <div>
        <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
          <BookOpen className="w-4 h-4 mr-2 text-green-600" />
          Engineering Improvement Recommendations
        </h4>
        <div className="space-y-4">
          {analysis.recommendations.slice(0, 3).map((rec, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-0.5">
                  {getPriorityIcon(rec.priority)}
                </div>
                <div className="flex-1">
                  <h5 className="font-semibold text-gray-900 mb-1">{rec.principle}</h5>
                  <p className="text-sm text-gray-600 mb-3">{rec.description}</p>
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-gray-700 mb-1">Action Items:</div>
                    {rec.actionItems.slice(0, 3).map((item, itemIndex) => (
                      <div key={itemIndex} className="flex items-start space-x-2 text-xs text-gray-600">
                        <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Comment Examples */}
      {analysis.topIssues.length > 0 && analysis.topIssues[0].count > 0 && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h5 className="font-medium text-gray-900 mb-2">Recent Feedback Examples</h5>
          <div className="space-y-2">
            {Object.entries(analysis.categorizedComments)
              .filter(([_, data]) => data.examples.length > 0)
              .slice(0, 2)
              .map(([category, data]) => (
                <div key={category} className="text-sm">
                  <span className="font-medium text-gray-700">{category}:</span>
                  <div className="ml-4 text-gray-600 italic">
                    "{data.examples[0]}"
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}