import React from 'react';
import { ChevronUp, ChevronDown, GitPullRequest, Eye, FileText, Target, Code, TrendingUp, Loader2 } from 'lucide-react';

type SortField = 'name' | 'openMRs' | 'draftMRs' | 'assignedReviews' | 'reviewComplexity' | 'workloadScore' | 'total';
type SortDirection = 'asc' | 'desc';

interface TableHeaderProps {
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  hasComplexityData: boolean;
  enhancementLoading: boolean;
}

function SortButton({
  field,
  children,
  sortField,
  sortDirection,
  onSort,
}: {
  field: SortField;
  children: React.ReactNode;
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
}) {
  return (
    <button
      onClick={() => onSort(field)}
      className="flex items-center space-x-1 hover:text-gray-900 transition-colors group"
    >
      <span>{children}</span>
      <div className="flex flex-col">
        <ChevronUp 
          className={`w-3 h-3 ${
            sortField === field && sortDirection === 'asc' 
              ? 'text-indigo-600' 
              : 'text-gray-400 group-hover:text-gray-600'
          }`} 
        />
        <ChevronDown 
          className={`w-3 h-3 -mt-1 ${
            sortField === field && sortDirection === 'desc' 
              ? 'text-indigo-600' 
              : 'text-gray-400 group-hover:text-gray-600'
          }`} 
        />
      </div>
    </button>
  );
}

export default function TableHeader({ 
  sortField, 
  sortDirection, 
  onSort, 
  hasComplexityData, 
  enhancementLoading 
}: TableHeaderProps) {
  return (
    <thead className="bg-gray-50">
      <tr>
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          <SortButton field="name" sortField={sortField} sortDirection={sortDirection} onSort={onSort}>Engineer</SortButton>
        </th>
        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
          <SortButton field="openMRs" sortField={sortField} sortDirection={sortDirection} onSort={onSort}>
            <div className="flex items-center space-x-1">
              <GitPullRequest className="w-4 h-4" />
              <span>Open MRs</span>
            </div>
          </SortButton>
        </th>
        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
          <SortButton field="draftMRs" sortField={sortField} sortDirection={sortDirection} onSort={onSort}>
            <div className="flex items-center space-x-1">
              <FileText className="w-4 h-4" />
              <span>Draft MRs</span>
            </div>
          </SortButton>
        </th>
        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
          <SortButton field="assignedReviews" sortField={sortField} sortDirection={sortDirection} onSort={onSort}>
            <div className="flex items-center space-x-1">
              <Eye className="w-4 h-4" />
              <span>Reviews</span>
            </div>
          </SortButton>
        </th>
        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
          <SortButton field="reviewComplexity" sortField={sortField} sortDirection={sortDirection} onSort={onSort}>
            <div className="flex items-center space-x-1">
              <Code className="w-4 h-4" />
              <span>Review Complexity</span>
              {!hasComplexityData && enhancementLoading && (
                <Loader2 className="w-3 h-3 animate-spin ml-1" />
              )}
            </div>
          </SortButton>
        </th>
        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
          <SortButton field="workloadScore" sortField={sortField} sortDirection={sortDirection} onSort={onSort}>
            <div className="flex items-center space-x-1">
              <Target className="w-4 h-4" />
              <span>Workload Score</span>
            </div>
          </SortButton>
        </th>
        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
          <SortButton field="total" sortField={sortField} sortDirection={sortDirection} onSort={onSort}>
            <div className="flex items-center space-x-1">
              <TrendingUp className="w-4 h-4" />
              <span>Total Activity</span>
            </div>
          </SortButton>
        </th>
      </tr>
    </thead>
  );
}