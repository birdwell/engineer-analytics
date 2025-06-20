import { clearComplexityCache } from './complexityCache';
import { clearAnalyticsCache } from './analyticsCache';

interface StoredCredentials {
  token: string;
  projectId: string;
  projectPath?: string;
  timestamp: number;
}

const STORAGE_KEY = 'gitlab_dashboard_credentials';
const EXPIRY_DAYS = 30; // Credentials expire after 30 days for security

export function saveCredentials(token: string, projectId: string, projectPath?: string): void {
  const credentials: StoredCredentials = {
    token,
    projectId,
    projectPath,
    timestamp: Date.now()
  };
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(credentials));
  } catch (error) {
    console.warn('Failed to save credentials to localStorage:', error);
  }
}

export function loadCredentials(): { token: string; projectId: string; projectPath?: string } | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    
    const credentials: StoredCredentials = JSON.parse(stored);
    
    // Check if credentials have expired
    const daysSinceStored = (Date.now() - credentials.timestamp) / (1000 * 60 * 60 * 24);
    if (daysSinceStored > EXPIRY_DAYS) {
      clearCredentials();
      return null;
    }
    
    return {
      token: credentials.token,
      projectId: credentials.projectId,
      projectPath: credentials.projectPath
    };
  } catch (error) {
    console.warn('Failed to load credentials from localStorage:', error);
    clearCredentials();
    return null;
  }
}

export function clearCredentials(): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    let projectId: string | undefined;
    
    if (stored) {
      try {
        const credentials: StoredCredentials = JSON.parse(stored);
        projectId = credentials.projectId;
      } catch {
        // If we can't parse, just clear everything
      }
    }
    
    localStorage.removeItem(STORAGE_KEY);
    
    // Also clear complexity and analytics cache for this project when clearing credentials
    if (projectId) {
      clearComplexityCache(projectId);
      clearAnalyticsCache(projectId);
    }
  } catch (error) {
    console.warn('Failed to clear credentials from localStorage:', error);
  }
}

export function hasStoredCredentials(): boolean {
  return loadCredentials() !== null;
}