/**
 * Canonical Fragrance ID Utility
 *
 * This module provides a single source of truth for generating and resolving
 * fragrance identifiers across the entire site. All pages must use these
 * functions to ensure ratings and data are never duplicated.
 */

/**
 * Normalizes text for consistent ID generation
 * @param {string} text - Text to normalize
 * @returns {string} Normalized text
 */
function normalizeText(text) {
  if (!text) return '';

  return text
    .toString()
    .trim()
    .toLowerCase()
    // Replace & with 'and' for consistency
    .replace(/\s*&\s*/g, ' and ')
    // Remove apostrophes and quotes
    .replace(/['"]/g, '')
    // Replace any non-alphanumeric chars with single hyphen
    .replace(/[^a-z0-9]+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '');
}

/**
 * Creates a canonical fragrance ID from brand and name
 * This is the ONLY way fragrance IDs should be created site-wide
 *
 * @param {string} brand - Fragrance brand
 * @param {string} name - Fragrance name
 * @returns {string} Canonical fragrance ID
 */
export function makeCanonicalFragranceId(brand, name) {
  const normalizedBrand = normalizeText(brand);
  const normalizedName = normalizeText(name);

  // ALWAYS require both brand and name for canonical ID
  if (!normalizedBrand || !normalizedName) {
    console.warn('makeCanonicalFragranceId: missing brand or name', { brand, name });
    return normalizedName || normalizedBrand || '';
  }

  return `${normalizedBrand}-${normalizedName}`;
}

/**
 * Creates a fragrance URL with proper query parameters
 *
 * @param {string} brand - Fragrance brand
 * @param {string} name - Fragrance name
 * @returns {string} URL to fragrance.html with canonical parameters
 */
export function makeFragranceUrl(brand, name) {
  if (!brand || !name) {
    console.warn('makeFragranceUrl: missing brand or name', { brand, name });
    return 'fragrance.html';
  }

  return `fragrance.html?brand=${encodeURIComponent(brand)}&name=${encodeURIComponent(name)}`;
}

/**
 * Parses URL parameters and resolves to canonical fragrance data
 * Handles legacy formats for backward compatibility
 *
 * @param {URLSearchParams} params - URL search parameters
 * @param {Array} fragrancesData - Array of fragrance objects from database
 * @returns {Object} { canonicalId, brand, name } or null if not found
 */
export function resolveFragranceFromParams(params, fragrancesData = []) {
  const rawBrand = params.get('brand') || '';
  const rawName = params.get('name') || '';

  // Best case: both brand and name provided
  if (rawBrand && rawName) {
    return {
      canonicalId: makeCanonicalFragranceId(rawBrand, rawName),
      brand: rawBrand,
      name: rawName
    };
  }

  // Legacy case: only name provided
  // Try to find matching fragrance in database to get the brand
  if (rawName && fragrancesData.length > 0) {
    const normalizedSearchName = normalizeText(rawName);

    // Try to find exact match by name
    const match = fragrancesData.find(f => {
      const fragName = normalizeText(f.name);
      const fragBrand = normalizeText(f.brand);

      // Match by name only
      if (fragName === normalizedSearchName) {
        return true;
      }

      // Match by "brand-name" format in case name param contains both
      const combinedId = `${fragBrand}-${fragName}`;
      if (combinedId === normalizedSearchName) {
        return true;
      }

      return false;
    });

    if (match) {
      return {
        canonicalId: makeCanonicalFragranceId(match.brand, match.name),
        brand: match.brand,
        name: match.name
      };
    }

    // No match found - use name-only as fallback (will need manual resolution)
    console.warn('resolveFragranceFromParams: No database match for legacy name-only URL', rawName);
    return {
      canonicalId: normalizeText(rawName),
      brand: '',
      name: rawName
    };
  }

  return null;
}

/**
 * Extracts brand and name from fragrance display string
 * Expects format: "Brand – Name" or "Brand - Name"
 *
 * @param {string} displayName - Display name string
 * @returns {Object} { brand, name } or null
 */
export function parseFragranceDisplay(displayName) {
  if (!displayName) return null;

  // Try em dash first, then regular dash
  const parts = displayName.split(/\s*[–—-]\s*/);

  if (parts.length >= 2) {
    return {
      brand: parts[0].trim(),
      name: parts.slice(1).join(' - ').trim()
    };
  }

  return null;
}

/**
 * Legacy ID migration helper
 * Maps old name-only IDs to canonical brand-name IDs using a lookup table
 *
 * @param {string} legacyId - Old fragrance ID (name-only)
 * @param {Array} fragrancesData - Fragrance database
 * @returns {string} Canonical ID or original if no mapping found
 */
export function migrateFragranceId(legacyId, fragrancesData = []) {
  if (!legacyId) return '';

  const normalized = normalizeText(legacyId);

  // Check if it already looks like a canonical ID (has hyphen between brand-name)
  // If it has multiple parts, assume it's already canonical
  const parts = normalized.split('-');
  if (parts.length > 2) {
    return normalized; // Likely already canonical
  }

  // Try to find match in database
  const match = fragrancesData.find(f => {
    const fragName = normalizeText(f.name);
    return fragName === normalized;
  });

  if (match) {
    return makeCanonicalFragranceId(match.brand, match.name);
  }

  return normalized; // Return as-is if no match
}
