import React, { useState } from 'react';
import { Key, GitBranch, AlertCircle, Shield, Folder, Users } from 'lucide-react';

interface TokenFormProps {
  onSubmit: (token: string, projectId: string, projectPath?: string) => void;
  loading: boolean;
  error: string | null;
  hasStoredCredentials: boolean;
}

export default function TokenForm({ onSubmit, loading, error, hasStoredCredentials }: TokenFormProps) {
  const [token, setToken] = useState('');
  const [projectPath, setProjectPath] = useState('');
  const [analysisType, setAnalysisType] = useState<'project' | 'group'>('project');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (token.trim() && projectPath.trim()) {
      // Use projectPath as the projectId since we only have project path now
      onSubmit(token.trim(), projectPath.trim(), projectPath.trim());
    }
  };

  const isFormValid = token.trim() && projectPath.trim();

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4">
            <GitBranch className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">GitLab MR Dashboard</h1>
          <p className="text-base text-gray-600">
            Connect to your GitLab project or group to view merge request insights
          </p>
        </div>

        {hasStoredCredentials && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start space-x-3">
            <Shield className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-blue-800">Stored Credentials Found</h3>
              <div className="text-sm text-blue-700 mt-1">
                Your previous credentials were found but may have expired. Please enter them again to reconnect.
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-red-800">Connection Error</h3>
              <div className="text-sm text-red-700 mt-1">{error}</div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="token" className="block text-sm font-semibold text-gray-700 mb-2">
              Personal Access Token
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Key className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="password"
                id="token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-sm"
                placeholder="glpat-xxxxxxxxxxxxxxxxxxxx"
                required
              />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Create a token in GitLab → Settings → Access Tokens
            </p>
          </div>

          {/* Analysis Type Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Analysis Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAnalysisType('project')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  analysisType === 'project'
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Folder className="w-4 h-4" />
                  <span className="text-sm font-medium">Single Project</span>
                </div>
                <p className="text-xs mt-1 opacity-75">Analyze one repository</p>
              </button>
              
              <button
                type="button"
                onClick={() => setAnalysisType('group')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  analysisType === 'group'
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4" />
                  <span className="text-sm font-medium">Group</span>
                </div>
                <p className="text-xs mt-1 opacity-75">Analyze all group repos</p>
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="projectPath" className="block text-sm font-semibold text-gray-700 mb-2">
              {analysisType === 'project' ? 'Project Path' : 'Group Path'}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                {analysisType === 'project' ? (
                  <Folder className="h-5 w-5 text-gray-400" />
                ) : (
                  <Users className="h-5 w-5 text-gray-400" />
                )}
              </div>
              <input
                type="text"
                id="projectPath"
                value={projectPath}
                onChange={(e) => setProjectPath(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-sm"
                placeholder={
                  analysisType === 'project' 
                    ? "group/project-name" 
                    : "group-name"
                }
                required
              />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              {analysisType === 'project' ? (
                <>Full project path (e.g., lifechurch/youversion/user-applications/flutter/youversion-flutter)</>
              ) : (
                <>Group name or path (e.g., lifechurch/youversion)</>
              )}
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || !isFormValid}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Connecting...</span>
              </div>
            ) : (
              `Connect to GitLab ${analysisType === 'group' ? 'Group' : 'Project'}`
            )}
          </button>
        </form>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-start space-x-3">
            <Shield className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Security Notice</h3>
              <div className="text-sm text-gray-600 mt-1">
                Your credentials are stored securely in your browser's local storage and automatically expire after 30 days. They are never sent to any external servers except GitLab's API.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}