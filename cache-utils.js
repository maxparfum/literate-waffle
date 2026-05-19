/**
 * Client-side caching utilities for MaxParfum
 * Implements localStorage caching with version control
 */

const CACHE_VERSION = '1.0.0';
const CACHE_KEY_PREFIX = 'maxparfum_cache_';
const CACHE_VERSION_KEY = 'maxparfum_cache_version';

/**
 * Get cached data from localStorage
 * @param {string} key - Cache key
 * @returns {any|null} Cached data or null if not found/expired
 */
export function getCache(key) {
  try {
    const cacheKey = `maxparfum_cache_${key}`;
    const raw = localStorage.getItem(cacheKey);
    if (!raw) return null;

    const payload = JSON.parse(raw);
    if (!payload || !payload.t || !payload.ttl) return null;

    const expired = (Date.now() - payload.t) > payload.ttl;
    if (expired) {
      localStorage.removeItem(cacheKey);
      return null;
    }

    return payload.data ?? null;
  } catch {
    return null;
  }
}
/**
 * Store data in localStorage cache
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 */
export function setCache(key, data, ttlMs = 1000 * 60 * 60 * 24) {
  try {
    const payload = {
      t: Date.now(),
      ttl: ttlMs,
      data
    };

    const cacheKey = `maxparfum_cache_${key}`;
    const serialized = JSON.stringify(payload);

    // If too big, skip caching (prevents QuotaExceededError)
    // localStorage is usually ~5MB per origin.
    if (serialized.length > 4_000_000) {
      console.warn(`⚠️ Cache skipped (too large): ${cacheKey} (${serialized.length} chars)`);
      return false;
    }

    localStorage.setItem(cacheKey, serialized);
    return true;
  } catch (err) {
    // QuotaExceeded or storage blocked — do NOT crash app
    console.warn('Cache write error (skipping cache):', err);
    return false;
  }
}

/**
 * Clear all MaxParfum cache entries
 */
export function clearAllCache() {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(CACHE_KEY_PREFIX) || key === CACHE_VERSION_KEY) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error('Cache clear error:', error);
  }
}

/**
 * Fetch with caching
 * @param {string} url - URL to fetch
 * @param {string} cacheKey - Cache key
 * @returns {Promise<any>} Fetched data
 */
export async function fetchWithCache(url, key, ttlMs = 1000 * 60 * 60 * 24) {
  const cached = getCache(key);
  if (cached) return cached;

  console.log(`📡 Fetching ${key} from network`);
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);

  const data = await res.json();

  // Best-effort cache write (will auto-skip if too large)
  setCache(key, data, ttlMs);

  return data;
}
