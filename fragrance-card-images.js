import { loadAllImageOverrides, makeOverrideKey } from './fragrance-image-override.js';

const FALLBACK_IMAGE = 'https://via.placeholder.com/200x150/1a1a1a/d4af37?text=No+Image';
const CACHE_KEY = 'fragrance_card_images_data';
const CACHE_TTL = 24 * 60 * 60 * 1000;

function normalize(str) {
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

function makeLookupKey(brand, name) {
  return normalize(brand) + '::' + normalize(name);
}

function extractBrandNameFromCard(card) {
  const onclick = card.getAttribute('onclick') || '';
  const match = onclick.match(/fragrance\.html\?([^')"]+)/);
  if (match) {
    try {
      const params = new URLSearchParams(match[1]);
      const brand = params.get('brand');
      const name = params.get('name');
      if (brand && name) return { brand, name };
    } catch (_) {}
  }

  const titleEl = card.querySelector('.card-title');
  if (titleEl) {
    const text = titleEl.textContent || '';
    const parts = text.split(/\s*[–—-]\s*/);
    if (parts.length >= 2) {
      return { brand: parts[0].trim(), name: parts.slice(1).join(' - ').trim() };
    }
  }

  const img = card.querySelector('img');
  if (img) {
    return { brand: '', name: img.getAttribute('data-name') || '' };
  }

  return null;
}

function getCached() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.t > CACHE_TTL) return null;
    return parsed.data;
  } catch (_) {
    return null;
  }
}

function setCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), data }));
  } catch (_) {}
}

async function loadFragranceData() {
  const cached = getCached();
  if (cached) return cached;
  const res = await fetch('fragrances_merged.json');
  const data = await res.json();
  setCache(data);
  return data;
}

function buildLookupMap(fragrances) {
  const map = new Map();
  for (const f of fragrances) {
    if (!f.image) continue;
    const key = makeLookupKey(f.brand, f.name);
    map.set(key, f.image);
    const nameOnlyKey = '::' + normalize(f.name);
    if (!map.has(nameOnlyKey)) {
      map.set(nameOnlyKey, f.image);
    }
  }
  return map;
}

export async function populateFragranceCardImages() {
  const cards = document.querySelectorAll('.fragrance-card');
  if (!cards.length) return;

  let data;
  try {
    data = await loadFragranceData();
  } catch (err) {
    console.error('fragrance-card-images: failed to load data', err);
    cards.forEach(card => {
      const img = card.querySelector('img');
      if (img && img.src.includes('via.placeholder.com')) {
        img.src = FALLBACK_IMAGE;
      }
    });
    return;
  }

  let overrideMap;
  try {
    overrideMap = await loadAllImageOverrides();
  } catch (_) {
    overrideMap = new Map();
  }

  const jsonMap = buildLookupMap(data);

  function resolveImage(brand, name) {
    if (brand && name) {
      const overrideKey = makeOverrideKey(brand, name);
      const overrideUrl = overrideMap.get(overrideKey);
      if (overrideUrl) return overrideUrl;
    }
    if (brand && name) {
      const jsonUrl = jsonMap.get(makeLookupKey(brand, name));
      if (jsonUrl) return jsonUrl;
    }
    if (name) {
      const nameUrl = jsonMap.get('::' + normalize(name));
      if (nameUrl) return nameUrl;
    }
    return null;
  }

  cards.forEach(card => {
    const img = card.querySelector('img');
    if (!img) return;

    const extracted = extractBrandNameFromCard(card);
    const brand = extracted?.brand || '';
    const name = extracted?.name || '';

    const imageUrl = resolveImage(brand, name);

    if (imageUrl) {
      img.src = imageUrl;
    } else {
      img.src = FALLBACK_IMAGE;
      img.style.opacity = '0.4';
    }

    img.onerror = () => {
      img.src = FALLBACK_IMAGE;
      img.style.opacity = '0.4';
      img.onerror = null;
    };
  });
}
