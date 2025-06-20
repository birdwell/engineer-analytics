interface CachedAnalytics {
  data: ReviewMetrics;
  timestamp: number;
  projectId: string;
  timeframe: string;
}

interface ReviewMetrics {
  avgTimeToFirstReview: number;
  avgTimeToMerge: number;
  avgReviewCycles: number;
  fastestReviews: any[];
  slowestReviews: any[];
  reviewerResponseTimes: any[];
  totalMRsAnalyzed: number;
  mergedMRsAnalyzed: number;
  openMRsAnalyzed: number;
}

const CACHE_KEY_PREFIX = 'gitlab_analytics_';
const CACHE_EXPIRY_HOURS = 2; // Cache analytics for 2 hours

export function getCachedAnalytics(
  projectId: string, 
  timeframe: '7d' | '30d' | '90d'
): ReviewMetrics | null {
  try {
    const cacheKey = `${CACHE_KEY_PREFIX}${projectId}_${timeframe}`;
    const cached = localStorage.getItem(cacheKey);
    
    if (!cached) return null;
    
    const cachedData: CachedAnalytics = JSON.parse(cached);
    
    // Check if cache has expired
    const hoursSinceCached = (Date.now() - cachedData.timestamp) / (1000 * 60 * 60);
    if (hoursSinceCached > CACHE_EXPIRY_HOURS) {
      localStorage.removeItem(cacheKey);
      return null;
    }
    
    // Verify the cached data is for the correct project and timeframe
    if (cachedData.projectId !== projectId || cachedData.timeframe !== timeframe) {
      localStorage.removeItem(cacheKey);
      return null;
    }
    
    return cachedData.data;
  } catch (error) {
    console.warn('Failed to load cached analytics:', error);
    return null;
  }
}

export function setCachedAnalytics(
  projectId: string, 
  timeframe: '7d' | '30d' | '90d',
  data: ReviewMetrics
): void {
  try {
    const cacheKey = `${CACHE_KEY_PREFIX}${projectId}_${timeframe}`;
    const cachedData: CachedAnalytics = {
      data,
      timestamp: Date.now(),
      projectId,
      timeframe
    };
    
    localStorage.setItem(cacheKey, JSON.stringify(cachedData));
  } catch (error) {
    console.warn('Failed to cache analytics data:', error);
    // If localStorage is full or unavailable, continue without caching
  }
}

export function clearAnalyticsCache(projectId?: string): void {
  try {
    const keys = Object.keys(localStorage);
    const keysToRemove = keys.filter(key => {
      if (!key.startsWith(CACHE_KEY_PREFIX)) return false;
      
      if (projectId) {
        // Only remove cache entries for the specific project
        try {
          const cached = localStorage.getItem(key);
          if (cached) {
            const cachedData: CachedAnalytics = JSON.parse(cached);
            return cachedData.projectId === projectId;
          }
        } catch {
          // If we can't parse it, remove it anyway
          return true;
        }
      }
      
      return true; // Remove all analytics cache if no specific project
    });
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.warn('Failed to clear analytics cache:', error);
  }
}

export function getAnalyticsCacheInfo(projectId: string): { 
  cached: boolean; 
  lastUpdated: Date | null;
  timeframes: string[];
} {
  try {
    const keys = Object.keys(localStorage);
    const projectCacheKeys = keys.filter(key => {
      if (!key.startsWith(CACHE_KEY_PREFIX)) return false;
      
      try {
        const cached = localStorage.getItem(key);
        if (cached) {
          const cachedData: CachedAnalytics = JSON.parse(cached);
          return cachedData.projectId === projectId;
        }
      } catch {
        return false;
      }
      
      return false;
    });
    
    if (projectCacheKeys.length === 0) {
      return { cached: false, lastUpdated: null, timeframes: [] };
    }
    
    // Find the most recent cache entry
    let mostRecentTimestamp = 0;
    const timeframes: string[] = [];
    
    projectCacheKeys.forEach(key => {
      try {
        const cached = localStorage.getItem(key);
        if (cached) {
          const cachedData: CachedAnalytics = JSON.parse(cached);
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
    console.warn('Failed to get analytics cache info:', error);
    return { cached: false, lastUpdated: null, timeframes: [] };
  }
}