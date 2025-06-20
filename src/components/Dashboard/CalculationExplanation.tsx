import React from 'react';
import { Calculator, Info } from 'lucide-react';

export default function CalculationExplanation() {
  return (
    <div className="bg-white rounded-xl shadow-lg p-8">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
          <Calculator className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">How Scores Are Calculated</h2>
          <p className="text-base text-gray-600 mt-1">Understanding the complexity and workload metrics</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Review Complexity */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Info className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Review Complexity Score</h3>
          </div>
          
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-gray-700 mb-3 font-medium">
              Measures the difficulty of reviewing a merge request based on code changes:
            </p>
            
            <div className="space-y-2 text-sm text-gray-700">
              <div className="flex items-start space-x-2">
                <span className="text-blue-600 font-mono font-bold">•</span>
                <span><span className="font-semibold">File Count Impact:</span> Number of files × 0.3</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-blue-600 font-mono font-bold">•</span>
                <span><span className="font-semibold">Line Changes:</span> log₁₀(total lines) × 0.5</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-blue-600 font-mono font-bold">•</span>
                <span><span className="font-semibold">Deletion Complexity:</span> (deleted lines / total lines) × 0.3</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-blue-600 font-mono font-bold">•</span>
                <span><span className="font-semibold">Large Change Penalty:</span> Extra points for changes &gt; 500 lines</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-blue-600 font-mono font-bold">•</span>
                <span><span className="font-semibold">Multi-file Penalty:</span> Extra points for changes &gt; 5 files</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-blue-200">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded">0.1-2.0: Simple</span>
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded">2.1-5.0: Moderate</span>
                <span className="px-2 py-1 bg-red-100 text-red-800 rounded">5.1+: Complex</span>
              </div>
            </div>
          </div>
        </div>

        {/* Workload Score */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Info className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">Workload Score</h3>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-4">
            <p className="text-sm text-gray-700 mb-3 font-medium">
              Combines quantity and complexity to measure total engineer workload:
            </p>
            
            <div className="space-y-2 text-sm text-gray-700">
              <div className="flex items-start space-x-2">
                <span className="text-purple-600 font-mono font-bold">•</span>
                <span className="font-semibold">Base Score:</span>
              </div>
              <div className="ml-4 space-y-1 text-xs text-gray-600">
                <div>- Assigned Reviews × 2</div>
                <div>- Open MRs × 1</div>
                <div>- Draft MRs × 0.5</div>
              </div>
              
              <div className="flex items-start space-x-2 mt-2">
                <span className="text-purple-600 font-mono font-bold">•</span>
                <span className="font-semibold">Complexity Bonus:</span>
              </div>
              <div className="ml-4 space-y-1 text-xs text-gray-600">
                <div>- Review Complexity × 0.5</div>
                <div>- Author Complexity × 0.3</div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-purple-200">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded">0-9: Light Load</span>
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded">10-19: Moderate</span>
                <span className="px-2 py-1 bg-red-100 text-red-800 rounded">20+: Heavy Load</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Notes */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-semibold text-gray-900 mb-3">📝 Additional Notes</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
          <div>
            <span className="font-semibold">Reviewer Recommendations:</span> Only considers engineers from the predefined reviewer list for next reviewer suggestions.
          </div>
          <div>
            <span className="font-semibold">Caching:</span> Complexity data is cached for 24 hours to improve performance and reduce API calls.
          </div>
          <div>
            <span className="font-semibold">Color Coding:</span> Open MRs are color-coded: 3 = yellow warning, 3+ = red alert.
          </div>
          <div>
            <span className="font-semibold">Data Freshness:</span> Basic data loads instantly, complexity analysis enhances in the background.
          </div>
        </div>
      </div>
    </div>
  );
}