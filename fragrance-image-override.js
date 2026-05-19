import { supabase } from './supabase.js';

const OVERRIDE_CACHE_KEY = 'fragrance_image_overrides_cache';
const OVERRIDE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function normalizeForMatching(str) {
  if (!str) return '';
  return str
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\u2019|\u2018|'/g, '')
    .replace(/['"]/g, '')
    .replace(/\s*&\s*/g, ' and ')
    .replace(/\s+/g, ' ');
}

export function makeOverrideKey(brand, name) {
  return normalizeForMatching(brand) + '::' + normalizeForMatching(name);
}

let _overrideMapPromise = null;

function _getCachedOverrideMap() {
  try {
    const raw = sessionStorage.getItem(OVERRIDE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.t > OVERRIDE_CACHE_TTL) return null;
    return new Map(parsed.entries);
  } catch (_) {
    return null;
  }
}

function _setCachedOverrideMap(map) {
  try {
    sessionStorage.setItem(OVERRIDE_CACHE_KEY, JSON.stringify({
      t: Date.now(),
      entries: Array.from(map.entries())
    }));
  } catch (_) {}
}

export function clearOverrideCache() {
  try { sessionStorage.removeItem(OVERRIDE_CACHE_KEY); } catch (_) {}
  _overrideMapPromise = null;
}

export async function loadAllImageOverrides() {
  const cached = _getCachedOverrideMap();
  if (cached) return cached;

  if (_overrideMapPromise) return _overrideMapPromise;

  _overrideMapPromise = (async () => {
    try {
      const { data, error } = await supabase
        .from('fragrance_image_overrides')
        .select('brand_normalized, name_normalized, image_url, brand, name');

      if (error) {
        console.error('Error loading image overrides:', error);
        return new Map();
      }

      const overrideMap = new Map();
      if (data && Array.isArray(data)) {
        data.forEach(row => {
          const key1 = makeOverrideKey(row.brand || row.brand_normalized, row.name || row.name_normalized);
          const key2 = `${row.brand_normalized}::${row.name_normalized}`;
          overrideMap.set(key1, row.image_url);
          if (key1 !== key2) overrideMap.set(key2, row.image_url);
        });
      }

      _setCachedOverrideMap(overrideMap);
      return overrideMap;
    } catch (err) {
      console.error('Unexpected error loading image overrides:', err);
      return new Map();
    } finally {
      _overrideMapPromise = null;
    }
  })();

  return _overrideMapPromise;
}

export function applyImageOverrideFromMap(fragrance, overrideMap) {
  if (!fragrance || !fragrance.brand || !fragrance.name || !overrideMap) {
    return fragrance;
  }
  try {
    const key = makeOverrideKey(fragrance.brand, fragrance.name);
    const overrideUrl = overrideMap.get(key);
    if (overrideUrl) {
      return { ...fragrance, image: overrideUrl };
    }
    return fragrance;
  } catch (err) {
    console.error('Error applying image override from map:', err);
    return fragrance;
  }
}

export async function applyImageOverride(fragrance) {
  if (!fragrance || !fragrance.brand || !fragrance.name) {
    return fragrance;
  }
  try {
    const overrideMap = await loadAllImageOverrides();
    return applyImageOverrideFromMap(fragrance, overrideMap);
  } catch (err) {
    console.error('Unexpected error applying image override:', err);
    return fragrance;
  }
}

export async function isUserAdmin(user) {
  if (!user || !user.email) return false;
  try {
    const { data, error } = await supabase
      .from('admin_users')
      .select('id')
      .eq('email', user.email.toLowerCase())
      .maybeSingle();
    if (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
    return !!data;
  } catch (err) {
    console.error('Unexpected error checking admin status:', err);
    return false;
  }
}

export async function saveImageOverride(brand, name, imageUrl, userId) {
  if (!brand || !name || !imageUrl || !userId) {
    return { success: false, error: 'Missing required parameters' };
  }
  try {
    const { data, error } = await supabase
      .from('fragrance_image_overrides')
      .upsert({
        brand: brand.trim(),
        name: name.trim(),
        image_url: imageUrl.trim(),
        updated_by: userId,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'brand_normalized,name_normalized'
      })
      .select();

    if (error) {
      console.error('Error saving image override:', error);
      return { success: false, error: error.message };
    }

    clearOverrideCache();
    return { success: true, data };
  } catch (err) {
    console.error('Unexpected error saving image override:', err);
    return { success: false, error: err.message };
  }
}
