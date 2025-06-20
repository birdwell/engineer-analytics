import React from 'react';
import { Lightbulb, TrendingUp, Clock, Users, Code, Target, MessageCircle } from 'lucide-react';
import { EngineerStats } from '../../types/gitlab';
import { calculateWorkloadScore } from '../../utils/gitlab';
import { EngineerMRHistory } from '../../utils/engineerAnalytics';

interface ImprovementSuggestionsProps {
  engineer: EngineerStats;
  mrHistory: EngineerMRHistory;
}

export default function ImprovementSuggestions({ engineer, mrHistory }: ImprovementSuggestionsProps) {
  const workloadScore = calculateWorkloadScore(engineer);
  const mergeRate = mrHistory.authoredMRs.length > 0 
    ? (mrHistory.mergedMRs.length / mrHistory.authoredMRs.length) * 100 
    : 0;

  const suggestions = [];

  // Workload-based suggestions
  if (workloadScore > 20) {
    suggestions.push({
      icon: Target,
      color: 'text-red-600 bg-red-100',
      title: 'High Workload Alert',
      description: 'Consider focusing on completing current reviews before taking on new ones.',
      priority: 'high'
    });
  } else if (workloadScore < 5) {
    suggestions.push({
      icon: TrendingUp,
      color: 'text-green-600 bg-green-100',
      title: 'Capacity Available',
      description: 'You have bandwidth to take on additional reviews or MRs.',
      priority: 'low'
    });
  }

  // Review-based suggestions
  if (engineer.assignedReviews > 5) {
    suggestions.push({
      icon: Clock,
      color: 'text-orange-600 bg-orange-100',
      title: 'Review Backlog',
      description: 'Prioritize completing pending reviews to unblock team members.',
      priority: 'high'
    });
  }

  // MR authoring suggestions
  if (engineer.openMRs > 3) {
    suggestions.push({
      icon: Code,
      color: 'text-blue-600 bg-blue-100',
      title: 'Multiple Open MRs',
      description: 'Consider focusing on getting existing MRs merged before opening new ones.',
      priority: 'medium'
    });
  }

  if (engineer.draftMRs > 2) {
    suggestions.push({
      icon: Users,
      color: 'text-purple-600 bg-purple-100',
      title: 'Draft MRs Pending',
      description: 'Mark draft MRs as ready for review when they\'re complete.',
      priority: 'medium'
    });
  }

  // Comments and review cycle suggestions
  if (mrHistory.avgCommentsPerAuthoredMR > 5) {
    suggestions.push({
      icon: MessageCircle,
      color: 'text-yellow-600 bg-yellow-100',
      title: 'High Comment Volume',
      description: 'Consider breaking down MRs into smaller, more focused changes to reduce review overhead.',
      priority: 'medium'
    });
  }

  if (mrHistory.avgReviewCyclesAsAuthor > 3) {
    suggestions.push({
      icon: Users,
      color: 'text-orange-600 bg-orange-100',
      title: 'Multiple Review Cycles',
      description: 'Self-review your MRs more thoroughly before requesting reviews to reduce back-and-forth.',
      priority: 'medium'
    });
  }

  // Complexity-based suggestions
  if (engineer.reviewComplexity > 10) {
    suggestions.push({
      icon: Target,
      color: 'text-indigo-600 bg-indigo-100',
      title: 'Complex Reviews',
      description: 'You\'re handling complex reviews. Consider breaking them into smaller chunks.',
      priority: 'medium'
    });
  }

  // Merge rate suggestions
  if (mergeRate < 70 && mrHistory.authoredMRs.length > 2) {
    suggestions.push({
      icon: TrendingUp,
      color: 'text-yellow-600 bg-yellow-100',
      title: 'Merge Rate Opportunity',
      description: 'Focus on addressing feedback quickly to improve merge success rate.',
      priority: 'medium'
    });
  }

  // Positive feedback for good metrics
  if (mrHistory.avgCommentsPerAuthoredMR <= 3 && mrHistory.avgReviewCyclesAsAuthor <= 2) {
    suggestions.push({
      icon: TrendingUp,
      color: 'text-green-600 bg-green-100',
      title: 'Excellent MR Quality!',
      description: 'Your MRs require minimal review cycles and comments. Keep up the great work!',
      priority: 'low'
    });
  }

  // Default positive suggestion if no issues
  if (suggestions.length === 0) {
    suggestions.push({
      icon: TrendingUp,
      color: 'text-green-600 bg-green-100',
      title: 'Great Work!',
      description: 'Your workload and activity levels look well-balanced. Keep it up!',
      priority: 'low'
    });
  }

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'high': return 'border-red-200 bg-red-50';
      case 'medium': return 'border-yellow-200 bg-yellow-50';
      default: return 'border-green-200 bg-green-50';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
          <Lightbulb className="w-5 h-5 text-yellow-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Improvement Suggestions</h3>
          <p className="text-sm text-gray-600">Personalized recommendations</p>
        </div>
      </div>

      <div className="space-y-4">
        {suggestions.map((suggestion, index) => (
          <div 
            key={index} 
            className={`p-4 rounded-lg border ${getPriorityColor(suggestion.priority)}`}
          >
            <div className="flex items-start space-x-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${suggestion.color}`}>
                <suggestion.icon className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-1">{suggestion.title}</h4>
                <p className="text-sm text-gray-700">{suggestion.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-semibold text-gray-900 mb-2">Quick Stats Summary</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Workload Score:</span>
            <span className="ml-2 font-medium text-gray-900">{workloadScore.toFixed(1)}</span>
          </div>
          <div>
            <span className="text-gray-600">Merge Rate:</span>
            <span className="ml-2 font-medium text-gray-900">{mergeRate.toFixed(1)}%</span>
          </div>
          <div>
            <span className="text-gray-600">Avg Comments:</span>
            <span className="ml-2 font-medium text-gray-900">{mrHistory.avgCommentsPerAuthoredMR.toFixed(1)}</span>
          </div>
          <div>
            <span className="text-gray-600">Avg Review Cycles:</span>
            <span className="ml-2 font-medium text-gray-900">{mrHistory.avgReviewCyclesAsAuthor.toFixed(1)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}