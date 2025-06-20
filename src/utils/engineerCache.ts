interface CachedEngineerData {
  data: import('./engineerAnalytics').EngineerMRHistory;
  timestamp: number;
  projectId: string;
  username: string;
  timeframe: string;
}

const CACHE_KEY_PREFIX = 'gitlab_engineer_';
const CACHE_EXPIRY_HOURS = 1; // Cache engineer data for 1 hour

export function getCachedEngineerData(
  projectId: string, 
  username: string,
  timeframe: '7d' | '30d' | '90d'
): import('./engineerAnalytics').EngineerMRHistory | null {
  try {
    const cacheKey = `${CACHE_KEY_PREFIX}${projectId}_${username}_${timeframe}`;
    const cached = localStorage.getItem(cacheKey);
    
    if (!cached) return null;
    
    const cachedData: CachedEngineerData = JSON.parse(cached);
    
    // Check if cache has expired
    const hoursSinceCached = (Date.now() - cachedData.timestamp) / (1000 * 60 * 60);
    if (hoursSinceCached > CACHE_EXPIRY_HOURS) {
      localStorage.removeItem(cacheKey);
      return null;
    }
    
    // Verify the cached data is for the correct project, user, and timeframe
    if (cachedData.projectId !== projectId || 
        cachedData.username !== username || 
        cachedData.timeframe !== timeframe) {
      localStorage.removeItem(cacheKey);
      return null;
    }
    
    // Ensure backward compatibility: add missing fields if they don't exist
    if (!cachedData.data.commentAnalysis) {
      cachedData.data.commentAnalysis = {
        totalComments: 0,
        categorizedComments: {},
        topIssues: [],
        recommendations: [],
        overallScore: 100
      };
    }
    
    if (!cachedData.data.responseTimeMetrics) {
      cachedData.data.responseTimeMetrics = {
        avgResponseTime: 0,
        medianResponseTime: 0,
        fastestResponse: 0,
        slowestResponse: 0,
        responseRate: 0,
        totalComments: 0,
        respondedComments: 0,
        unresolvedComments: 0,
        responseTimeDistribution: {
          under1Hour: 0,
          under4Hours: 0,
          under24Hours: 0,
          under3Days: 0,
          over3Days: 0
        },
        commentsByDay: []
      };
    }
    
    return cachedData.data;
  } catch (error) {
    console.warn('Failed to load cached engineer data:', error);
    return null;
  }
}

export function setCachedEngineerData(
  projectId: string, 
  username: string,
  timeframe: '7d' | '30d' | '90d',
  data: import('./engineerAnalytics').EngineerMRHistory
): void {
  try {
    const cacheKey = `${CACHE_KEY_PREFIX}${projectId}_${username}_${timeframe}`;
    const cachedData: CachedEngineerData = {
      data,
      timestamp: Date.now(),
      projectId,
      username,
      timeframe
    };
    
    localStorage.setItem(cacheKey, JSON.stringify(cachedData));
  } catch (error) {
    console.warn('Failed to cache engineer data:', error);
    // If localStorage is full or unavailable, continue without caching
  }
}

export function clearEngineerCache(projectId?: string, username?: string): void {
  try {
    const keys = Object.keys(localStorage);
    const keysToRemove = keys.filter(key => {
      if (!key.startsWith(CACHE_KEY_PREFIX)) return false;
      
      if (projectId || username) {
        try {
          const cached = localStorage.getItem(key);
          if (cached) {
            const cachedData: CachedEngineerData = JSON.parse(cached);
            return (!projectId || cachedData.projectId === projectId) &&
                   (!username || cachedData.username === username);
          }
        } catch {
          return true;
        }
      }
      
      return true;
    });
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.warn('Failed to clear engineer cache:', error);
  }
}

export function getEngineerCacheInfo(projectId: string, username: string): { 
  cached: boolean; 
  lastUpdated: Date | null;
  timeframes: string[];
} {
  try {
    const keys = Object.keys(localStorage);
    const userCacheKeys = keys.filter(key => {
      if (!key.startsWith(CACHE_KEY_PREFIX)) return false;
      
      try {
        const cached = localStorage.getItem(key);
        if (cached) {
          const cachedData: CachedEngineerData = JSON.parse(cached);
          return cachedData.projectId === projectId && cachedData.username === username;
        }
      } catch {
        return false;
      }
      
      return false;
    });
    
    if (userCacheKeys.length === 0) {
      return { cached: false, lastUpdated: null, timeframes: [] };
    }
    
    let mostRecentTimestamp = 0;
    const timeframes: string[] = [];
    
    userCacheKeys.forEach(key => {
      try {
        const cached = localStorage.getItem(key);
        if (cached) {
          const cachedData: CachedEngineerData = JSON.parse(cached);
          if (cachedData.timestamp > mostRecentTimestamp) {
            mostRecentTimestamp = cachedData.timestamp;
          }
          timeframes.push(cachedData.timeframe);
        }
      } catch {
        // Ignore invalid cache entries
      }
    });
    
    return {
      cached: true,
      lastUpdated: new Date(mostRecentTimestamp),
      timeframes
    };
  } catch (error) {
    console.warn('Failed to get engineer cache info:', error);
    return { cached: false, lastUpdated: null, timeframes: [] };
  }
}