import type { MRComplexity } from '../types/gitlab';
import { isRecord, parseAs, parseJson } from './json';

interface CachedComplexity {
  data: MRComplexity;
  timestamp: number;
  projectId: string;
}

function isCachedComplexity(value: unknown): value is CachedComplexity {
  return isRecord(value)
    && typeof value.timestamp === 'number'
    && typeof value.projectId === 'string'
    && isRecord(value.data);
}

const CACHE_KEY_PREFIX = 'gitlab_mr_complexity_';
const CACHE_EXPIRY_HOURS = 24; // Cache complexity data for 24 hours

export function getCachedComplexity(projectId: string, mrIid: number): MRComplexity | null {
  try {
    const cacheKey = `${CACHE_KEY_PREFIX}${projectId}_${mrIid}`;
    const cached = localStorage.getItem(cacheKey);
    
    if (!cached) return null;
    
    const cachedData = parseAs(cached, isCachedComplexity);
    if (!cachedData) return null;
    
    // Check if cache has expired
    const hoursSinceCached = (Date.now() - cachedData.timestamp) / (1000 * 60 * 60);
    if (hoursSinceCached > CACHE_EXPIRY_HOURS) {
      localStorage.removeItem(cacheKey);
      return null;
    }
    
    // Verify the cached data is for the correct project
    if (cachedData.projectId !== projectId) {
      localStorage.removeItem(cacheKey);
      return null;
    }
    
    return cachedData.data;
  } catch (error) {
    console.warn('Failed to load cached complexity:', error);
    return null;
  }
}

export function setCachedComplexity(projectId: string, complexity: MRComplexity): void {
  try {
    const cacheKey = `${CACHE_KEY_PREFIX}${projectId}_${complexity.id}`;
    const cachedData: CachedComplexity = {
      data: complexity,
      timestamp: Date.now(),
      projectId
    };
    
    localStorage.setItem(cacheKey, JSON.stringify(cachedData));
  } catch (error) {
    console.warn('Failed to cache complexity data:', error);
    // If localStorage is full or unavailable, continue without caching
  }
}

export function clearComplexityCache(projectId?: string): void {
  try {
    const keys = Object.keys(localStorage);
    const keysToRemove = keys.filter(key => {
      if (!key.startsWith(CACHE_KEY_PREFIX)) return false;
      
      if (projectId) {
        // Only remove cache entries for the specific project
        try {
          const cached = localStorage.getItem(key);
          if (cached) {
            const parsed = parseJson(cached);
            if (!isRecord(parsed)) return true;
            return parsed.projectId === projectId;
          }
        } catch {
          // If we can't parse it, remove it anyway
          return true;
        }
      }
      
      return true; // Remove all complexity cache if no specific project
    });
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.warn('Failed to clear complexity cache:', error);
  }
}

export function getCacheStats(projectId: string): { cached: number; total: number } {
  try {
    const keys = Object.keys(localStorage);
    const projectCacheKeys = keys.filter(key => {
      if (!key.startsWith(CACHE_KEY_PREFIX)) return false;
      
      try {
        const cached = localStorage.getItem(key);
        if (cached) {
          const parsed = parseJson(cached);
          return isRecord(parsed) && parsed.projectId === projectId;
        }
      } catch {
        return false;
      }
      
      return false;
    });
    
    return {
      cached: projectCacheKeys.length,
      total: projectCacheKeys.length // This will be updated when we know the total MRs
    };
  } catch (error) {
    console.warn('Failed to get cache stats:', error);
    return { cached: 0, total: 0 };
  }
}