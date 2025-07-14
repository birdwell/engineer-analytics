import React, { useState, useEffect } from 'react';
import TokenForm from './components/TokenForm';
import Dashboard from './components/Dashboard';
import { fetchBasicDashboardData, fetchEnhancedDashboardData } from './utils/gitlab';
import { saveCredentials, loadCredentials, clearCredentials, hasStoredCredentials } from './utils/storage';
import { DashboardData } from './types/gitlab';

type AppView = 'dashboard' | 'analytics';

function App() {
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [enhancementLoading, setEnhancementLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [credentials, setCredentials] = useState<{ token: string; projectId: string; projectPath?: string } | null>(null);
  const [initializing, setInitializing] = useState(true);

  // Load stored credentials on app start
  useEffect(() => {
    const initializeApp = async () => {
      try {
        const storedCredentials = loadCredentials();
        if (storedCredentials) {
          setCredentials(storedCredentials);
          // Auto-connect with stored credentials
          await handleConnect(storedCredentials.token, storedCredentials.projectId, storedCredentials.projectPath, false);
        }
      } catch (error) {
        console.error('Failed to initialize app:', error);
        setError('Failed to initialize application');
      } finally {
        setInitializing(false);
      }
    };

    initializeApp();
  }, []);

  const handleConnect = async (token: string, projectId: string, projectPath?: string, saveToStorage = true) => {
    setLoading(true);
    setError(null);

    try {
      console.log('Connecting to GitLab...');
      
      // Fast initial load with basic data
      const basicData = await fetchBasicDashboardData(token, projectId);
      console.log('Basic data loaded:', basicData);
      
      setDashboardData(basicData);
      setCredentials({ token, projectId, projectPath });
      
      if (saveToStorage) {
        saveCredentials(token, projectId, projectPath);
      }
      
      setIsConnected(true);
      setLoading(false);
      setInitializing(false);

      // Then enhance with complexity data in the background
      setEnhancementLoading(true);
      try {
        console.log('Loading complexity data...');
        const enhancedData = await fetchEnhancedDashboardData(token, projectId, basicData);
        console.log('Enhanced data loaded:', enhancedData);
        setDashboardData(enhancedData);
      } catch (enhancementError) {
        console.warn('Failed to load complexity data:', enhancementError);
        // Keep the basic data if enhancement fails
      } finally {
        setEnhancementLoading(false);
      }
    } catch (err) {
      console.error('Connection failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect to GitLab');
      // Clear invalid credentials
      if (hasStoredCredentials()) {
        clearCredentials();
      }
      setLoading(false);
      setInitializing(false);
    }
  };

  const handleRefresh = async () => {
    if (!credentials) return;
    
    setLoading(true);
    setError(null);

    try {
      console.log('Refreshing data...');
      
      // Fast refresh with basic data first
      const basicData = await fetchBasicDashboardData(credentials.token, credentials.projectId);
      setDashboardData(basicData);
      setLoading(false);

      // Then enhance with complexity data
      setEnhancementLoading(true);
      try {
        const enhancedData = await fetchEnhancedDashboardData(credentials.token, credentials.projectId, basicData);
        setDashboardData(enhancedData);
      } catch (enhancementError) {
        console.warn('Failed to refresh complexity data:', enhancementError);
      } finally {
        setEnhancementLoading(false);
      }
    } catch (err) {
      console.error('Refresh failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh data');
      // If refresh fails due to auth, clear stored credentials
      if (err instanceof Error && err.message.includes('401')) {
        clearCredentials();
        setIsConnected(false);
        setCredentials(null);
        setDashboardData(null);
      }
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    clearCredentials();
    setIsConnected(false);
    setCredentials(null);
    setDashboardData(null);
    setError(null);
    setEnhancementLoading(false);
    setCurrentView('dashboard');
  };
  
  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
  };

  // Show loading spinner during initialization
  if (initializing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-emerald-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isConnected || !dashboardData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-emerald-50 flex items-center justify-center p-4">
        <TokenForm 
          onSubmit={(token, projectId, projectPath) => handleConnect(token, projectId, projectPath, true)} 
          loading={loading} 
          error={error}
          hasStoredCredentials={hasStoredCredentials()}
        />
      </div>
    );
  }

  return (
    <Dashboard
      data={dashboardData}
      onRefresh={handleRefresh}
      onDisconnect={handleDisconnect}
      loading={loading}
      enhancementLoading={enhancementLoading}
      projectId={credentials?.projectId}
      projectPath={credentials?.projectPath}
      token={credentials?.token}
    />
  );
}

export default App;