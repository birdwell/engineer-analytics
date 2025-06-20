import React from 'react';
import { BarChart3, Clock, Users, Code } from 'lucide-react';

export default function PerformanceInsights() {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Team Performance Insights</h2>
          <p className="text-gray-600">Key metrics for understanding team velocity and collaboration</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <h3 className="font-medium text-gray-900 flex items-center space-x-2">
            <Clock className="w-4 h-4 text-blue-500" />
            <span>Time Metrics</span>
          </h3>
          <div className="text-sm text-gray-600 space-y-2">
            <div>• <strong>Review Request:</strong> Time until reviewers are assigned</div>
            <div>• <strong>Merge Time:</strong> Total time from creation to merge</div>
            <div>• <strong>Target:</strong> &lt;4h for review requests, &lt;48h for merges</div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-medium text-gray-900 flex items-center space-x-2">
            <Users className="w-4 h-4 text-purple-500" />
            <span>Collaboration</span>
          </h3>
          <div className="text-sm text-gray-600 space-y-2">
            <div>• <strong>Reviewers:</strong> Average number of reviewers per MR</div>
            <div>• <strong>Comments:</strong> Discussion and feedback volume</div>
            <div>• <strong>Target:</strong> 2-3 reviewers for good coverage</div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-medium text-gray-900 flex items-center space-x-2">
            <Code className="w-4 h-4 text-green-500" />
            <span>Code Quality</span>
          </h3>
          <div className="text-sm text-gray-600 space-y-2">
            <div>• <strong>Size:</strong> Lines added/deleted per MR</div>
            <div>• <strong>Scope:</strong> Number of files changed</div>
            <div>• <strong>Target:</strong> Smaller, focused changes</div>
          </div>
        </div>
      </div>
    </div>
  );
}