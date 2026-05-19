// community-activity.js — Community Pulse helper for MaxParfum
// Queries community_activity_feed view (backed by activity_events + public.users).
// Never queries profiles. All user fields come from the view.

import { supabase } from './supabase.js';

// ─── Fragrance name resolution ───────────────────────────────────────────────

// Loaded once on first call, shared across all resolutions on the page.
let _fragrancesDb = null;
async function _loadFragrancesDb() {
  if (_fragrancesDb !== null) return _fragrancesDb;
  try {
    const res = await fetch('./fragrances_merged.json');
    _fragrancesDb = await res.json();
  } catch (_) {
    _fragrancesDb = [];
  }
  return _fragrancesDb;
}
function _prettyWords(value) {
  if (!value) return '';

  const keepLower = new Set([
    'de', 'du', 'des', 'of', 'and', 'the', 'for', 'by', 'a', 'an', 'le', 'la'
  ]);

  const forceUpper = new Set([
    'jpg', 'ysl', 'edt', 'edp', 'dna', 'vip'
  ]);

  return String(value)
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((word, index) => {
      if (!word) return '';

      return word
        .split('-')
        .map(part => {
          const clean = part.toLowerCase();

          if (forceUpper.has(clean)) return clean.toUpperCase();
          if (index !== 0 && keepLower.has(clean)) return clean;

          return clean.charAt(0).toUpperCase() + clean.slice(1);
        })
        .join('-');
    })
    .join(' ');
}

function _prettyFragranceLabel(brand, name) {
  const b = _prettyWords(brand);
  const n = _prettyWords(name);

  if (b && n) {
    if (n.toLowerCase().startsWith(b.toLowerCase())) return n;
    return `${b} ${n}`;
  }

  return n || b || null;
}
function _fragNameFromRow(row) {
  const brand = row.fragrance_brand || (row.metadata && row.metadata.fragrance_brand);
  const name  = row.fragrance_name  || (row.metadata && row.metadata.fragrance_name);

  return _prettyFragranceLabel(brand, name);
}

function _normalizeFragranceIdPart(text) {
  if (!text) return '';

  return String(text)
    .trim()
    .toLowerCase()
    .replace(/\s*&\s*/g, ' and ')
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function _makeCanonicalFragranceId(brand, name) {
  const b = _normalizeFragranceIdPart(brand);
  const n = _normalizeFragranceIdPart(name);

  if (b && n) return `${b}-${n}`;
  return n || b || '';
}

function _resolveFromDb(fragId, db) {
  if (!fragId || !db || !db.length) return null;

  const id = _normalizeFragranceIdPart(fragId);

  const match = db.find(f => {
    if (!f) return false;

    const rawId = _normalizeFragranceIdPart(f.id);
    if (rawId && rawId === id) return true;

    const canonical = _makeCanonicalFragranceId(f.brand, f.name);
    if (canonical && canonical === id) return true;

    const nameOnly = _normalizeFragranceIdPart(f.name);
    if (nameOnly && nameOnly === id) return true;

    return false;
  });

  if (!match) return null;

 const b = (match.brand || '').trim();
const n = (match.name || '').trim();

return _prettyFragranceLabel(b, n);
}

// ─── Activity type labels ────────────────────────────────────────────────────

function _stars(row) {
  const v = row.metadata && (row.metadata.rating ?? row.metadata.rating_value);
  if (v == null || v === '') return '';
  return `${parseFloat(v).toFixed(1)} stars`;
}

function _scentleGuesses(row) {
  const g = row.metadata && (row.metadata.guesses_count ?? row.metadata.guesses);
  if (!g) return '';
  return ` in ${g} ${g === 1 ? 'guess' : 'guesses'}`;
}

// ─── Actor display name ───────────────────────────────────────────────────────

// Account-required types: never show "Someone"
const ACCOUNT_REQUIRED = new Set(['rating', 'review', 'collection_add', 'forum_thread', 'forum_reply']);

function _actorName(row) {
  const name = row.username || row.display_name;
  if (name) return '@' + name.replace(/^@/, '');

  const isAccountRequired = ACCOUNT_REQUIRED.has(row.activity_type) ||
    (row.activity_type === 'scentle_complete' && row.user_id);

  return isAccountRequired ? 'MaxParfum member' : 'Someone';
}

export function avatarHtml(avatarUrl, actor) {
  const initial = actor && actor.length > 1
    ? actor.replace('@', '').charAt(0).toUpperCase()
    : '?';
  if (avatarUrl) {
    return `<img class="cp-avatar" src="${avatarUrl}" alt="${initial}" loading="lazy">`;
  }
  let hue = 38;
  for (let i = 0; i < actor.length; i++) hue = (hue + actor.charCodeAt(i) * 7) % 360;
  return `<div class="cp-avatar cp-avatar-initial" style="--av-hue:${hue}">${initial}</div>`;
}

// ─── Format a view row into a display object ─────────────────────────────────

// Synchronous fast path — used when the fragrances DB is already loaded.
function _buildAction(row, resolvedFragName) {
  const type = row.activity_type;
  const frag = resolvedFragName || 'a fragrance';

  if (type === 'rating') {
    const s = _stars(row);
    return `Rated ${frag}${s ? ' ' + s : ''}`;
  }

  if (type === 'review') {
    return `Reviewed ${frag}`;
  }

  if (type === 'collection_add') {
    return `Added ${frag} to their collection`;
  }

  if (type === 'battle_vote') {
    return `Played Fragrance Battle`;
  }

  if (type === 'forum_thread') {
    return `Started a discussion`;
  }

  if (type === 'forum_reply') {
    return `Replied to a discussion`;
  }

  if (type === 'scentle_complete') {
    return `Completed today's Scentle${_scentleGuesses(row)}`;
  }

  return `Did something with ${frag}`;
}

// Async version that resolves fragrance name from JSON if needed.
export async function formatActivityItemAsync(row) {
  const actor     = _actorName(row);
  const avatarUrl = row.avatar_url || null;

  // battle_vote never needs a fragrance name
  let resolvedFragName = null;
  if (row.activity_type !== 'battle_vote') {
    resolvedFragName = _fragNameFromRow(row);
    if (!resolvedFragName && row.fragrance_id) {
      const db = await _loadFragrancesDb();
      resolvedFragName = _resolveFromDb(row.fragrance_id, db);
    }
    // final fallback: "a fragrance" — set here so _buildAction receives it
    resolvedFragName = resolvedFragName || 'a fragrance';
  }

  const action = _buildAction(row, resolvedFragName);

  let url = row.target_url || null;
  if (!url && row.fragrance_brand && row.fragrance_name) {
    url = `fragrance.html?brand=${encodeURIComponent(row.fragrance_brand)}&name=${encodeURIComponent(row.fragrance_name)}`;
  }

  return {
    id:             row.id,
    actor,
    avatarUrl,
    action,
    activityType:   row.activity_type,
    fragranceBrand: row.fragrance_brand,
    fragranceName:  row.fragrance_name,
    url,
    createdAt:      row.created_at,
    metadata:       row.metadata || {},
  };
}

// Sync shim kept for any callers that don't need JSON fallback.
export function formatActivityItem(row) {
  const actor     = _actorName(row);
  const avatarUrl = row.avatar_url || null;
  let resolvedFragName = null;
  if (row.activity_type !== 'battle_vote') {
    resolvedFragName = _fragNameFromRow(row) || 'a fragrance';
  }
  const action = _buildAction(row, resolvedFragName);

 let url = row.target_url || null;

const directBrand = row.fragrance_brand || (row.metadata && row.metadata.fragrance_brand);
const directName = row.fragrance_name || (row.metadata && row.metadata.fragrance_name);

if (!url && directBrand && directName) {
  url = `fragrance.html?brand=${encodeURIComponent(directBrand)}&name=${encodeURIComponent(directName)}`;
}

  return {
    id:             row.id,
    actor,
    avatarUrl,
    action,
    activityType:   row.activity_type,
    fragranceBrand: row.fragrance_brand,
    fragranceName:  row.fragrance_name,
    url,
    createdAt:      row.created_at,
    metadata:       row.metadata || {},
  };
}

// ─── Relative timestamp ───────────────────────────────────────────────────────

export function timeAgo(isoString) {
  if (!isoString) return '';
  const diff = Date.now() - new Date(isoString).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7)  return `${d}d ago`;
  return new Date(isoString).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// ─── Public query functions ───────────────────────────────────────────────────

/**
 * Fetch recent public activity for the homepage Community Pulse section.
 */
export async function getCommunityPulse(limit = 12) {
  try {
    const { data, error } = await supabase
      .from('community_activity_feed')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('[CommunityPulse] query failed:', error.message);
      return [];
    }
    return await Promise.all((data || []).map(formatActivityItemAsync));
  } catch (err) {
    console.warn('[CommunityPulse] unexpected error:', err.message);
    return [];
  }
}

/**
 * Fetch activity feed for a specific fragrance (detail page).
 */
export async function getFragranceActivity(brand, name, limit = 5) {
  if (!brand && !name) return [];
  try {
    let query = supabase
      .from('community_activity_feed')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (brand) query = query.ilike('fragrance_brand', brand);
    if (name)  query = query.ilike('fragrance_name', name);

    const { data, error } = await query;
    if (error) {
      console.warn('[CommunityPulse] fragrance activity query failed:', error.message);
      return [];
    }
    return await Promise.all((data || []).map(formatActivityItemAsync));
  } catch (err) {
    console.warn('[CommunityPulse] unexpected error:', err.message);
    return [];
  }
}

/**
 * Fetch aggregate community stats for a fragrance detail page.
 */
export async function getFragranceCommunityStats(brand, name) {
  if (!brand && !name) return null;
  try {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    let query = supabase
      .from('community_activity_feed')
      .select('activity_type, created_at')
      .eq('is_public', true);

    if (brand) query = query.ilike('fragrance_brand', brand);
    if (name)  query = query.ilike('fragrance_name', name);

    const { data, error } = await query;
    if (error) {
      console.warn('[CommunityPulse] stats query failed:', error.message);
      return null;
    }

    const rows = data || [];
    const stats = {
      ratings:       rows.filter(r => r.activity_type === 'rating').length,
      comments:      rows.filter(r => r.activity_type === 'review').length,
      collections:   rows.filter(r => r.activity_type === 'collection_add').length,
      recentRatings: rows.filter(r => r.activity_type === 'rating' && r.created_at >= weekAgo).length,
    };

    if (!stats.ratings && !stats.comments && !stats.collections) return null;
    return stats;
  } catch (err) {
    console.warn('[CommunityPulse] stats unexpected error:', err.message);
    return null;
  }
}

/**
 * Fetch lightweight community signals for search result cards.
 * Returns a Map keyed by "brand|||name" (lowercased) → { ratingCount, topRater }
 */
export async function getSearchActivityStats(fragrances) {
  if (!fragrances || !fragrances.length) return new Map();
  try {
    const subset = fragrances.slice(0, 20);
    const names  = subset.map(f => (f.name || '').toLowerCase()).filter(Boolean);
    if (!names.length) return new Map();

    const { data, error } = await supabase
      .from('community_activity_feed')
      .select('fragrance_brand, fragrance_name, activity_type, created_at, username, display_name')
      .eq('is_public', true)
      .eq('activity_type', 'rating')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.warn('[CommunityPulse] search stats query failed:', error.message);
      return new Map();
    }

    const map = new Map();
    for (const row of (data || [])) {
      const rowBrand = (row.fragrance_brand || '').toLowerCase();
      const rowName  = (row.fragrance_name  || '').toLowerCase();
      if (!rowName) continue;

      // Match against the requested fragrance list (case-insensitive in JS)
      const matched = subset.find(f =>
        (f.name  || '').toLowerCase() === rowName &&
        (!f.brand || (f.brand || '').toLowerCase() === rowBrand)
      );
      if (!matched) continue;

      const key = `${(matched.brand || '').toLowerCase()}|||${(matched.name || '').toLowerCase()}`;
      if (!map.has(key)) map.set(key, { ratingCount: 0, topRater: null });
      const entry = map.get(key);
      entry.ratingCount++;
      if (!entry.topRater) {
        const name = row.username || row.display_name;
        if (name) entry.topRater = '@' + name.replace(/^@/, '');
      }
    }
    return map;
  } catch (err) {
    console.warn('[CommunityPulse] search stats unexpected error:', err.message);
    return new Map();
  }
}
