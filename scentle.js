import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { awardPoints } from './points-helper.js';
// Data source configuration
const DATA_URL = 'fragrances_merged.json';

// Popular brand whitelist (case-insensitive)
const POPULAR_BRANDS = [
  'creed', 'dior', 'chanel', 'yves saint laurent', 'ysl', 'paco rabanne',
  'giorgio armani', 'armani', 'tom ford', 'versace', 'jean paul gaultier',
  'maison francis kurkdjian', 'mfk', 'parfums de marly', 'pdm', 'mancera',
  'montale', 'xerjoff', 'roja', 'nishane', 'byredo', 'initio', 'givenchy',
  'prada', 'dolce & gabbana', 'd&g', 'valentino', 'burberry', 'azzaro',
  'viktor & rolf', 'spicebomb', 'armaf', 'lattafa', 'maison alhambra', 'al haramain'
];

// Game state
let allFragrances = [];
let popularPool = [];
let answerPool = [];
let gameState = {
  dateKey: '',
  answerId: null,
  answer: null,
  guessIds: [],
  guesses: [],
  status: 'playing'
};

let selectedFragrance = null;
let selectedIndex = -1;
let searchTimeout = null;

// Note family mappings
const NOTE_FAMILIES = {
  'bergamot': 'Citrus', 'lemon': 'Citrus', 'orange': 'Citrus',
  'grapefruit': 'Citrus', 'lime': 'Citrus', 'mandarin': 'Citrus', 'yuzu': 'Citrus',
  'rose': 'Floral', 'jasmine': 'Floral', 'lily': 'Floral', 'iris': 'Floral',
  'violet': 'Floral', 'tuberose': 'Floral', 'gardenia': 'Floral', 'peony': 'Floral',
  'magnolia': 'Floral', 'ylang-ylang': 'Floral', 'neroli': 'Floral', 'lavender': 'Floral',
  'sandalwood': 'Woody', 'cedar': 'Woody', 'cedarwood': 'Woody', 'vetiver': 'Woody',
  'patchouli': 'Woody', 'pine': 'Woody', 'cypress': 'Woody', 'oak': 'Woody', 'birch': 'Woody',
  'pepper': 'Spicy', 'cardamom': 'Spicy', 'cinnamon': 'Spicy', 'nutmeg': 'Spicy',
  'ginger': 'Spicy', 'clove': 'Spicy', 'saffron': 'Spicy',
  'amber': 'Amber', 'vanilla': 'Amber', 'tonka': 'Amber', 'benzoin': 'Amber',
  'labdanum': 'Amber', 'myrrh': 'Amber', 'incense': 'Amber',
  'mint': 'Aromatic', 'basil': 'Aromatic', 'sage': 'Aromatic', 'rosemary': 'Aromatic',
  'thyme': 'Aromatic', 'geranium': 'Aromatic',
  'grass': 'Green', 'green': 'Green', 'leaves': 'Green', 'galbanum': 'Green',
  'sea': 'Aquatic', 'ocean': 'Aquatic', 'water': 'Aquatic', 'marine': 'Aquatic',
  'apple': 'Fruity', 'pear': 'Fruity', 'peach': 'Fruity', 'plum': 'Fruity',
  'blackcurrant': 'Fruity', 'raspberry': 'Fruity', 'strawberry': 'Fruity',
  'pineapple': 'Fruity', 'melon': 'Fruity', 'fig': 'Fruity',
  'chocolate': 'Gourmand', 'coffee': 'Gourmand', 'caramel': 'Gourmand',
  'honey': 'Gourmand', 'almond': 'Gourmand', 'praline': 'Gourmand', 'cream': 'Gourmand',
  'leather': 'Leather', 'suede': 'Leather', 'tobacco': 'Leather',
  'musk': 'Animalic', 'civet': 'Animalic', 'ambergris': 'Animalic',
  'oud': 'Animalic', 'agarwood': 'Animalic'
};




const SUPABASE_URL = 'https://moazswfklpvoperkarlk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vYXpzd2ZrbHB2b3BlcmthcmxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3MDc2MTYsImV4cCI6MjA3OTI4MzYxNn0.7_xrCWwV_elxQ0i4bdQ9Hsv-HGB-qz30a__1aeJ4QiM';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
function getScentlePointsForGuessCount(guessesCount) {
  if (guessesCount === 1) return 10;
  if (guessesCount === 2) return 8;
  if (guessesCount === 3) return 6;
  if (guessesCount === 4) return 4;
  if (guessesCount === 5) return 3;
  if (guessesCount === 6) return 2;
  return 0;
}
function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

function normalizeFragranceKey(fragrance) {
  return `${normalizeText(fragrance?.brand)}::${normalizeText(fragrance?.name)}`;
}

function ensureArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    return value.split(/[,;|]/).map(x => x.trim()).filter(Boolean);
  }
  return [];
}

function normalizeFragranceRecord(f, idx = 0) {
  const topNotes = ensureArray(f.top_notes);
  const middleNotes = ensureArray(f.middle_notes);
  const baseNotes = ensureArray(f.base_notes);
  const mainAccords = ensureArray(f.main_accords);
  const dupes = ensureArray(f.dupes);
  const rawNotes = ensureArray(f.notes);

  const allNotes = [
    ...rawNotes,
    ...topNotes,
    ...middleNotes,
    ...baseNotes
  ].flatMap(note =>
    typeof note === 'string' ? note.split(',').map(n => n.trim()) : []
  ).filter(Boolean);

  const imageUrl =
    f.imageUrl ||
    f.image ||
    f.img ||
    f.photo ||
    f.picture ||
    (Array.isArray(f.images) && f.images.length > 0 ? f.images[0] : null);

  const brand = f.brand || '';
  const name = f.name || '';

  return {
    ...f,
    brand,
    name,
    top_notes: topNotes,
    middle_notes: middleNotes,
    base_notes: baseNotes,
    main_accords: mainAccords,
    dupes,
    notes: allNotes,
    styleTags: ensureArray(f.styleTags).length ? ensureArray(f.styleTags) : mainAccords,
    imageUrl,
    matched_by: f.matched_by || 'none',
    id: f.id || `${brand}-${name}-${idx}`.toLowerCase().replace(/\s+/g, '-'),
    searchString: createSearchString(name, brand, f.country)
  };
}

function mergeFragranceSources(jsonFragrances, liveFragrances) {
  const mergedMap = new Map();

  (jsonFragrances || []).forEach((fragrance, idx) => {
    const normalized = normalizeFragranceRecord(fragrance, idx);
    if (normalized.name && normalized.brand) {
      mergedMap.set(normalizeFragranceKey(normalized), normalized);
    }
  });

  (liveFragrances || []).forEach((fragrance, idx) => {
    const normalized = normalizeFragranceRecord(fragrance, idx + 100000);
    if (normalized.name && normalized.brand) {
      mergedMap.set(normalizeFragranceKey(normalized), normalized);
    }
  });

  return Array.from(mergedMap.values());
}

document.addEventListener('DOMContentLoaded', init);

async function init() {
  setupEventListeners();
  await loadData();
}

function setupEventListeners() {
  document.getElementById('howToPlayBtn').addEventListener('click', openModal);
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalOkBtn').addEventListener('click', closeModal);

  const searchInput = document.getElementById('searchInput');
  searchInput.addEventListener('input', handleSearchInput);
  searchInput.addEventListener('keydown', handleSearchKeydown);

  document.getElementById('guessBtn').addEventListener('click', handleGuess);
  document.getElementById('copyResultBtn').addEventListener('click', copyResult);

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.autocomplete-container')) {
      hideAutocomplete();
    }
  });
}

function openModal() {
  document.getElementById('howToPlayModal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('howToPlayModal').classList.add('hidden');
}

async function loadData() {
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const jsonData = await response.json();

    let liveData = [];
    try {
      const { data, error } = await supabase
        .from('fragrances')
        .select('*');

      if (error) throw error;
      liveData = data || [];
    } catch (supabaseError) {
      console.warn('Could not load live Supabase fragrances for Scentle, using JSON only.', supabaseError);
      liveData = [];
    }

    const normalizedJsonFragrances = (jsonData || [])
      .filter(f => f.name && f.brand)
      .map((f, idx) => normalizeFragranceRecord(f, idx));

    const mergedFragrances = mergeFragranceSources(jsonData, liveData);

    allFragrances = mergedFragrances;

    if (allFragrances.length === 0) {
      throw new Error('No valid fragrances found in dataset');
    }

    // Search / guess pool uses merged data
    popularPool = buildPopularPool(allFragrances);

    // Daily answer pool uses curated JSON-only data
    buildPopularPool(normalizedJsonFragrances);

    if (popularPool.length < 10) {
      throw new Error('Not enough popular fragrances to play');
    }

    console.log(`Loaded ${allFragrances.length} total fragrances for Scentle`);
    console.log(`JSON fragrances: ${normalizedJsonFragrances.length}`);
    console.log(`Live Supabase fragrances: ${liveData.length}`);
    console.log(`Popular guess pool: ${popularPool.length}`);
    console.log(`Daily answer pool: ${answerPool.length}`);

    initializeGame();

  } catch (error) {
    console.error('Error loading data:', error);
    showError(`Could not load fragrance data. Please ensure ${DATA_URL} exists and is valid.`);
  }
}

function createSearchString(name, brand, country) {
  const parts = [name, brand, country].filter(Boolean).map(s => normalize(s));
  return parts.join(' ');
}

function buildPopularPool(fragrances) {
  const normalizedWhitelist = POPULAR_BRANDS.map(b => normalize(b));

  const isWhitelistBrand = (fragrance) => {
    const brandNorm = normalize(fragrance.brand || '');
    return normalizedWhitelist.some(w => brandNorm.includes(w) || w.includes(brandNorm));
  };

  const scored = fragrances
    .filter(f => f.name && f.brand)
    .map(f => {
      let score = 0;

      const brandNorm = normalize(f.brand || '');
      const nameNorm = normalize(f.name || '');
      const styles = (f.styleTags || []).map(s => normalize(s));
      const notes = (f.notes || []).map(n => normalize(n));

      const whitelistMatch = isWhitelistBrand(f);
      if (whitelistMatch) score += 1000;

      // Prefer fragrances with better data quality
      if (f.imageUrl) score += 40;
      if (f.country) score += 10;
      if (f.year || f.releaseYear) score += 20;
      if (notes.length >= 3) score += 30;
      if (styles.length >= 2) score += 25;

      // Prefer better-known/popular-looking entries
      if (typeof f.rating_value === 'number') score += f.rating_value * 20;
      if (f.has_dupes) score += 20;

      // Prefer mainstream/popular fragrance naming patterns slightly
      if (nameNorm.length >= 4 && nameNorm.length <= 30) score += 10;

      // Prefer modern-but-not-too-obscure releases
      const year = parseInt(f.year || f.releaseYear, 10);
      if (!Number.isNaN(year)) {
        if (year >= 2005 && year <= 2024) score += 25;
        if (year >= 2010 && year <= 2022) score += 15;
      }

      // Slight boost for classic popular brands
      if (
        brandNorm.includes('dior') ||
        brandNorm.includes('chanel') ||
        brandNorm.includes('armani') ||
        brandNorm.includes('ysl') ||
        brandNorm.includes('tom ford') ||
        brandNorm.includes('versace') ||
        brandNorm.includes('jean paul gaultier') ||
        brandNorm.includes('paco rabanne') ||
        brandNorm.includes('creed') ||
        brandNorm.includes('maison francis kurkdjian')
      ) {
        score += 40;
      }

      return {
        ...f,
        popularityScore: score
      };
    })
    .sort((a, b) => b.popularityScore - a.popularityScore);

  // Broad pool for searching / autocomplete / guesses
  const broadPool = scored.filter(f => isWhitelistBrand(f)).slice(0, 2500);

  // Much stricter answer pool for daily solutions only
  const strictAnswerPool = scored.filter(f => {
    if (!isWhitelistBrand(f)) return false;

    const year = parseInt(f.year || f.releaseYear, 10);
    const hasGoodYear = Number.isNaN(year) ? true : year >= 2000;
    const hasImage = !!f.imageUrl;
    const hasEnoughNotes = (f.notes || []).length >= 3;
    const hasEnoughStyles = (f.styleTags || []).length >= 1;
    const decentRating =
      typeof f.rating_value === 'number' ? f.rating_value >= 3.0 : true;

    return hasGoodYear && hasImage && hasEnoughNotes && hasEnoughStyles && decentRating;
  }).slice(0, 500);

  answerPool = strictAnswerPool.length >= 100 ? strictAnswerPool : broadPool.slice(0, 300);
  popularPool = broadPool;

  console.log('Popular search pool size:', popularPool.length);
  console.log('Daily answer pool size:', answerPool.length);

  console.log(
    'Sample answer brands:',
    answerPool.slice(0, 25).map(f => `${f.brand} - ${f.name}`)
  );

  return popularPool;
}

function initializeGame() {
  const dateKey = getTodayMelbourneDate();
  const stored = loadGameState();

    const combinedPool = [...answerPool, ...popularPool];

  if (stored && stored.dateKey === dateKey) {
    gameState = stored;

    gameState.answer = combinedPool.find(f => f.id === gameState.answerId);
    gameState.guesses = gameState.guessIds
      .map(id => combinedPool.find(f => f.id === id))
      .filter(Boolean);
  } else {
    gameState = {
      dateKey,
      answerId: selectDailyAnswer(dateKey),
      guessIds: [],
      guesses: [],
      status: 'playing'
    };

    gameState.answer = combinedPool.find(f => f.id === gameState.answerId);
    saveGameState();
  }

  if (!gameState.answer) {
    showError('Failed to select daily answer');
    return;
  }

  console.log('Today\'s answer:', gameState.answer.name, '-', gameState.answer.brand);

  document.getElementById('loadingMessage').classList.add('hidden');
  document.getElementById('gameArea').classList.remove('hidden');

  gameState.guesses.forEach(guess => renderGuessRow(guess));

  if (gameState.status !== 'playing') {
    disableInput();
    showResult();
  }
}

function getTodayMelbourneDate() {
  try {
    const formatter = new Intl.DateTimeFormat('en-AU', {
      timeZone: 'Australia/Melbourne',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });

    const parts = formatter.formatToParts(new Date());
    const year = parts.find(p => p.type === 'year').value;
    const month = parts.find(p => p.type === 'month').value;
    const day = parts.find(p => p.type === 'day').value;

    return `${year}-${month}-${day}`;
  } catch (e) {
    const now = new Date();
    return now.toISOString().split('T')[0];
  }
}

function selectDailyAnswer(dateKey) {
  const pool = answerPool.length ? answerPool : popularPool;

  let hash = 0;
  for (let i = 0; i < dateKey.length; i++) {
    hash = ((hash << 5) - hash) + dateKey.charCodeAt(i);
    hash = hash & hash;
  }

  hash = Math.abs(hash);
  const index = hash % pool.length;
  return pool[index].id;
}

function loadGameState() {
  try {
    const stored = localStorage.getItem('scentle_state');
    return stored ? JSON.parse(stored) : null;
  } catch (e) {
    return null;
  }
}

function saveGameState() {
  try {
    const toSave = {
      dateKey: gameState.dateKey,
      answerId: gameState.answerId,
      guessIds: gameState.guessIds,
      status: gameState.status
    };
    localStorage.setItem('scentle_state', JSON.stringify(toSave));
  } catch (e) {
    console.error('Failed to save state:', e);
  }
}

function handleSearchInput(e) {
  clearTimeout(searchTimeout);
  const query = e.target.value.trim();

  if (query.length < 2) {
    hideAutocomplete();
    selectedFragrance = null;
    return;
  }

  searchTimeout = setTimeout(() => {
    performSearch(query);
  }, 100);
}

function performSearch(query) {
  const queryTokens = tokenize(query);

  if (queryTokens.length === 0) {
    hideAutocomplete();
    return;
  }

  const matches = popularPool
    .map(f => ({
      fragrance: f,
      score: calculateSearchScore(f, query, queryTokens)
    }))
    .filter(m => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12)
    .map(m => m.fragrance);

  showAutocomplete(matches);
}

function tokenize(str) {
  return normalize(str)
    .split(' ')
    .filter(t => t.length > 0);
}

function normalize(str) {
  return (str || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['']/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function calculateSearchScore(fragrance, rawQuery, queryTokens) {
  const name = normalize(fragrance.name);
  const brand = normalize(fragrance.brand);
  const country = normalize(fragrance.country || '');
  const normalizedQuery = normalize(rawQuery);

  let score = 0;

  // Exact matches
  if (name === normalizedQuery) return 2000;
  if (`${brand} ${name}` === normalizedQuery) return 2200;

  // Strong prefix matches
  if (name.startsWith(normalizedQuery)) score += 1200;
  if (`${brand} ${name}`.startsWith(normalizedQuery)) score += 1000;
  if (brand.startsWith(normalizedQuery)) score += 500;

  const combined = `${brand} ${name} ${country}`.trim();
  const nameWords = name.split(' ');
  const brandWords = brand.split(' ');

  let matchedTokens = 0;

  queryTokens.forEach(token => {
    let matched = false;

    // Exact word matches
    if (nameWords.includes(token)) {
      score += 250;
      matched = true;
    } else if (brandWords.includes(token)) {
      score += 140;
      matched = true;
    }

    // Prefix matches
    else if (nameWords.some(w => w.startsWith(token))) {
      score += 180;
      matched = true;
    } else if (brandWords.some(w => w.startsWith(token))) {
      score += 100;
      matched = true;
    }

    // Contains matches
    else if (name.includes(token)) {
      score += 120;
      matched = true;
    } else if (combined.includes(token)) {
      score += 70;
      matched = true;
    }

    if (matched) matchedTokens++;
  });

  // Require at least some relevance
  if (matchedTokens === 0) return 0;

  // Bonus if all tokens matched
  if (matchedTokens === queryTokens.length) {
    score += 300;
  }

  // Slight popularity boost
  if (typeof fragrance.popularityScore === 'number') {
    score += Math.min(120, fragrance.popularityScore / 20);
  }

  return score;
}

function showAutocomplete(matches) {
  const dropdown = document.getElementById('autocompleteDropdown');

  if (matches.length === 0) {
    hideAutocomplete();
    return;
  }

  dropdown.innerHTML = matches.map((f, idx) => {
    const imagePart = f.imageUrl
      ? `<img src="${escapeAttr(f.imageUrl)}" alt="${escapeAttr(f.name)}" onerror="this.style.display='none'; this.parentElement.innerHTML='MP';">`
      : 'MP';

    const extra = [f.country, f.year || f.releaseYear].filter(Boolean).join(' • ');

    return `
      <div class="autocomplete-item" data-index="${idx}" data-id="${escapeAttr(f.id)}">
        <div class="autocomplete-item-image">${imagePart}</div>
        <div class="autocomplete-item-info">
          <div class="autocomplete-item-name">${escapeHtml(f.name)}</div>
          <div class="autocomplete-item-brand">${escapeHtml(f.brand)}</div>
        </div>
        ${extra ? `<div class="autocomplete-item-extra">${escapeHtml(extra)}</div>` : ''}
      </div>
    `;
  }).join('');

  dropdown.classList.remove('hidden');
  selectedIndex = -1;

  dropdown.querySelectorAll('.autocomplete-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = item.dataset.id;
      selectFragranceById(id);
    });
  });
}

function hideAutocomplete() {
  document.getElementById('autocompleteDropdown').classList.add('hidden');
  selectedIndex = -1;
}

function handleSearchKeydown(e) {
  const dropdown = document.getElementById('autocompleteDropdown');
  if (dropdown.classList.contains('hidden')) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleGuess();
    }
    return;
  }

  const items = dropdown.querySelectorAll('.autocomplete-item');

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
    updateSelectedItem(items);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    selectedIndex = Math.max(selectedIndex - 1, -1);
    updateSelectedItem(items);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (selectedIndex >= 0 && items[selectedIndex]) {
      const id = items[selectedIndex].dataset.id;
      selectFragranceById(id);
    } else if (items.length > 0) {
      const id = items[0].dataset.id;
      selectFragranceById(id);
    }
    handleGuess();
  } else if (e.key === 'Escape') {
    hideAutocomplete();
  }
}

function updateSelectedItem(items) {
  items.forEach((item, idx) => {
    if (idx === selectedIndex) {
      item.classList.add('selected');
      item.scrollIntoView({ block: 'nearest' });
    } else {
      item.classList.remove('selected');
    }
  });
}

function selectFragranceById(id) {
  selectedFragrance = popularPool.find(f => f.id === id);
  if (selectedFragrance) {
    document.getElementById('searchInput').value = `${selectedFragrance.name} — ${selectedFragrance.brand}`;
    hideAutocomplete();
  }
}

function handleGuess() {
  if (!selectedFragrance) {
    const query = document.getElementById('searchInput').value.trim();
    if (query.length > 0) {
      const queryTokens = tokenize(query);
      const matches = popularPool
        .map(f => ({
          fragrance: f,
          score: calculateSearchScore(f, query, queryTokens)
        }))
        .filter(m => m.score > 0)
        .sort((a, b) => b.score - a.score);

      if (matches.length > 0) {
        selectedFragrance = matches[0].fragrance;
      }
    }

    if (!selectedFragrance) {
      showToast('Please select a fragrance from the list');
      return;
    }
  }

  if (gameState.guessIds.includes(selectedFragrance.id)) {
    showToast('Already guessed this fragrance');
    return;
  }

  gameState.guessIds.push(selectedFragrance.id);
  gameState.guesses.push(selectedFragrance);
  renderGuessRow(selectedFragrance);

  if (selectedFragrance.id === gameState.answer.id) {
  gameState.status = 'won';
  saveGameState();
  saveScentleResult();
  disableInput();
  setTimeout(showResult, 800);
  return;
}


  if (gameState.guesses.length >= 6) {
  gameState.status = 'lost';
  saveGameState();
  saveScentleResult();
  disableInput();
  setTimeout(showResult, 800);
  return;
}


  saveGameState();
  document.getElementById('searchInput').value = '';
  selectedFragrance = null;
}

function renderGuessRow(guess) {
  const tiles = compareTiles(guess, gameState.answer);

  const wrapper = document.createElement('div');
  wrapper.className = 'guess-entry';

  const row = document.createElement('div');
  row.className = 'guess-row';

  row.innerHTML = `
    <div class="guess-info">${escapeHtml(guess.name)} — ${escapeHtml(guess.brand)}</div>
    <div class="guess-tiles">
      ${tiles.map(t => `<div class="tile ${t.color}" title="${escapeHtml(t.label)}">${escapeHtml(t.display)}</div>`).join('')}
    </div>
  `;

  const card = createGuessDetailCard(guess);

  wrapper.appendChild(row);
  wrapper.appendChild(card);

  document.getElementById('guessList').appendChild(wrapper);
}

async function saveScentleResult() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const guessesCount = gameState.guesses.length;
    const status = gameState.status;

    const { error } = await supabase
      .from('scentle_results')
      .upsert({
        user_id: user.id,
        date_key: gameState.dateKey,
        guesses_count: guessesCount,
        status: status,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,date_key'
      });

    if (error) throw error;

    if (status === 'won') {
      const points = getScentlePointsForGuessCount(guessesCount);

      if (points > 0) {
        await awardPoints(
          'scentle_completed',
          'scentle_daily',
          `${user.id}:${gameState.dateKey}`,
          user.id,
          points
        );
      }
    }

  } catch (err) {
    console.error('Failed to save Scentle result:', err);
  }
}

function createGuessDetailCard(guess) {
  const card = document.createElement('div');
  card.className = 'guess-card';

  const imageContainer = document.createElement('div');
  imageContainer.className = 'guess-card-image-container';

  const imageDiv = document.createElement('div');
  imageDiv.className = 'guess-card-image';

  if (guess.imageUrl) {
    imageDiv.innerHTML = `<img src="${escapeAttr(guess.imageUrl)}" alt="${escapeAttr(guess.name)}" onerror="this.style.display='none'; this.parentElement.innerHTML='MP';">`;
  } else {
    imageDiv.textContent = 'MP';
  }

  imageContainer.appendChild(imageDiv);

  const details = document.createElement('div');
  details.className = 'guess-card-details';

  const nameEl = document.createElement('div');
  nameEl.className = 'guess-card-name';
  nameEl.textContent = guess.name;

  const brandEl = document.createElement('div');
  brandEl.className = 'guess-card-brand';
  brandEl.textContent = guess.brand;

  const metaEl = document.createElement('div');
  metaEl.className = 'guess-card-meta';
  const metaParts = [];
  if (guess.country) metaParts.push(guess.country);
  const year = guess.year || guess.releaseYear;
  if (year) {
    const era = getEraBucket(year);
    metaParts.push(era.label);
  }
  const gender = normalizeGender(guess);
  if (gender !== 'Unknown') metaParts.push(gender);
  metaEl.textContent = metaParts.join(' • ');

  const stylesEl = document.createElement('div');
  stylesEl.className = 'guess-card-styles';
  const styles = (guess.styleTags || []).slice(0, 6);
  styles.forEach(s => {
    const chip = document.createElement('span');
    chip.className = 'style-chip';
    chip.textContent = s;
    stylesEl.appendChild(chip);
  });

  details.appendChild(nameEl);
  details.appendChild(brandEl);
  if (metaParts.length > 0) {
    details.appendChild(metaEl);
  }
  if (styles.length > 0) {
    details.appendChild(stylesEl);
  }

  const content = document.createElement('div');
  content.className = 'guess-card-content';
  content.appendChild(imageContainer);
  content.appendChild(details);

  card.appendChild(content);

  return card;
}

function compareTiles(guess, answer) {
  const tiles = [];
  tiles.push(compareBrand(guess, answer));
  tiles.push(compareCountry(guess, answer));
  tiles.push(compareStyle(guess, answer));
  tiles.push(compareNoteFamily(guess, answer));
  tiles.push(compareFreshSweet(guess, answer));
  tiles.push(compareEra(guess, answer));
  tiles.push(compareGender(guess, answer));
  return tiles;
}

function compareBrand(guess, answer) {
  const match = normalize(guess.brand) === normalize(answer.brand);
  return {
    color: match ? 'green' : 'red',
    display: match ? '✓' : '✗',
    label: `Brand: ${guess.brand}`
  };
}

function compareCountry(guess, answer) {
  const guessCountry = normalize(guess.country);
  const answerCountry = normalize(answer.country);

  if (!guessCountry || !answerCountry) {
    return { color: 'gray', display: '?', label: 'Country: Unknown' };
  }

  const match = guessCountry === answerCountry;
  return {
    color: match ? 'green' : 'red',
    display: match ? '✓' : '✗',
    label: `Country: ${guess.country}`
  };
}

function compareStyle(guess, answer) {
  const guessStyles = guess.styleTags.map(s => normalize(s));
  const answerStyles = answer.styleTags.map(s => normalize(s));

  if (guessStyles.length === 0 || answerStyles.length === 0) {
    return { color: 'gray', display: '?', label: 'Style: Unknown' };
  }

  const guessPrimary = guessStyles[0];
  const answerPrimary = answerStyles[0];

  if (guessPrimary === answerPrimary) {
    return { color: 'green', display: '✓', label: `Style: ${guess.styleTags[0]}` };
  }

  const overlap = guessStyles.some(s => answerStyles.includes(s));
  return {
    color: overlap ? 'yellow' : 'gray',
    display: overlap ? '~' : '✗',
    label: `Style: ${guess.styleTags[0]}`
  };
}

function compareNoteFamily(guess, answer) {
  const guessNotes = guess.notes.map(n => normalize(n));
  const answerNotes = answer.notes.map(n => normalize(n));

  if (guessNotes.length === 0 || answerNotes.length === 0) {
    return { color: 'gray', display: '?', label: 'Notes: Unknown' };
  }

  const guessFamilies = guessNotes.map(note => {
    for (const [key, family] of Object.entries(NOTE_FAMILIES)) {
      if (note.includes(key)) return family;
    }
    return null;
  }).filter(Boolean);

  const answerFamilies = answerNotes.map(note => {
    for (const [key, family] of Object.entries(NOTE_FAMILIES)) {
      if (note.includes(key)) return family;
    }
    return null;
  }).filter(Boolean);

  if (guessFamilies.length === 0 || answerFamilies.length === 0) {
    return { color: 'gray', display: '?', label: 'Note: Unknown' };
  }

  const guessDominant = getDominantFamily(guessFamilies);
  const answerDominant = getDominantFamily(answerFamilies);

  if (guessDominant === answerDominant) {
    return { color: 'green', display: '✓', label: `Note: ${guessDominant}` };
  }

  const overlap = guessFamilies.some(f => answerFamilies.includes(f));
  return {
    color: overlap ? 'yellow' : 'gray',
    display: overlap ? '~' : '✗',
    label: `Note: ${guessDominant}`
  };
}

function getDominantFamily(families) {
  const counts = {};
  families.forEach(f => {
    counts[f] = (counts[f] || 0) + 1;
  });

  let max = 0;
  let dominant = families[0];
  for (const [family, count] of Object.entries(counts)) {
    if (count > max) {
      max = count;
      dominant = family;
    }
  }

  return dominant;
}

function compareFreshSweet(guess, answer) {
  const guessAxis = calculateFreshSweetAxis(guess);
  const answerAxis = calculateFreshSweetAxis(answer);

  if (guessAxis.bucket === 0 || answerAxis.bucket === 0) {
    return { color: 'gray', display: '?', label: 'Fresh/Sweet: Unknown' };
  }

  const diff = Math.abs(guessAxis.bucket - answerAxis.bucket);

  if (diff === 0) {
    return { color: 'green', display: '✓', label: `${guessAxis.label}` };
  } else if (diff === 1) {
    return { color: 'yellow', display: '~', label: `${guessAxis.label}` };
  } else {
    return { color: 'gray', display: '✗', label: `${guessAxis.label}` };
  }
}

function calculateFreshSweetAxis(fragrance) {
  const notes = fragrance.notes.map(n => normalize(n));
  const styles = fragrance.styleTags.map(s => normalize(s));

  let freshPoints = 0;
  let sweetPoints = 0;

  notes.forEach(note => {
    for (const [key, family] of Object.entries(NOTE_FAMILIES)) {
      if (note.includes(key)) {
        if (['Citrus', 'Aromatic', 'Green', 'Aquatic'].includes(family)) {
          freshPoints++;
        } else if (['Gourmand', 'Amber', 'Fruity'].includes(family)) {
          sweetPoints++;
        }
      }
    }
  });

  styles.forEach(style => {
    if (style.includes('fresh') || style.includes('citrus') || style.includes('aquatic') || style.includes('green')) {
      freshPoints += 2;
    }
    if (style.includes('sweet') || style.includes('gourmand') || style.includes('vanilla') || style.includes('amber')) {
      sweetPoints += 2;
    }
  });

  if (freshPoints === 0 && sweetPoints === 0) {
    return { bucket: 0, label: 'Unknown' };
  }

  const axis = sweetPoints - freshPoints;

  if (axis < -3) return { bucket: 1, label: 'Very Fresh' };
  if (axis < 0) return { bucket: 2, label: 'Fresh-Leaning' };
  if (axis === 0) return { bucket: 3, label: 'Balanced' };
  if (axis <= 3) return { bucket: 4, label: 'Sweet-Leaning' };
  return { bucket: 5, label: 'Very Sweet' };
}

function compareEra(guess, answer) {
  const guessYear = guess.year || guess.releaseYear;
  const answerYear = answer.year || answer.releaseYear;

  if (!guessYear || !answerYear) {
    return { color: 'gray', display: '?', label: 'Era: Unknown' };
  }

  const guessEra = getEraBucket(guessYear);
  const answerEra = getEraBucket(answerYear);

  if (guessEra.bucket === answerEra.bucket) {
    return { color: 'green', display: '✓', label: `Era: ${guessEra.label}` };
  }

  const diff = Math.abs(guessEra.bucket - answerEra.bucket);
  if (diff === 1) {
    return { color: 'yellow', display: '~', label: `Era: ${guessEra.label}` };
  }

  return { color: 'gray', display: '✗', label: `Era: ${guessEra.label}` };
}

function getEraBucket(year) {
  const y = parseInt(year);
  if (y < 2000) return { bucket: 0, label: 'Pre-2000' };
  if (y < 2010) return { bucket: 1, label: '2000-2009' };
  if (y < 2020) return { bucket: 2, label: '2010-2019' };
  return { bucket: 3, label: '2020+' };
}

function compareGender(guess, answer) {
  const guessGender = normalizeGender(guess);
  const answerGender = normalizeGender(answer);

  if (guessGender === 'Unknown' || answerGender === 'Unknown') {
    return { color: 'gray', display: '?', label: 'Gender: Unknown' };
  }

  if (guessGender === answerGender) {
    return { color: 'green', display: '✓', label: `Gender: ${guessGender}` };
  }

  if ((guessGender === 'Masculine' && answerGender === 'Unisex') ||
      (guessGender === 'Unisex' && answerGender === 'Masculine') ||
      (guessGender === 'Feminine' && answerGender === 'Unisex') ||
      (guessGender === 'Unisex' && answerGender === 'Feminine')) {
    return { color: 'yellow', display: '~', label: `Gender: ${guessGender}` };
  }

  return { color: 'gray', display: '✗', label: `Gender: ${guessGender}` };
}

function normalizeGender(fragrance) {
  const gender = normalize(fragrance.genderLean || fragrance.gender || '');

  if (gender.includes('men') && !gender.includes('women')) return 'Masculine';
  if (gender.includes('women') && !gender.includes('men')) return 'Feminine';
  if (gender.includes('male') && !gender.includes('female')) return 'Masculine';
  if (gender.includes('female') && !gender.includes('male')) return 'Feminine';
  if (gender.includes('unisex')) return 'Unisex';

  const tags = [
    ...(fragrance.tags || []),
    ...(fragrance.styleTags || [])
  ].map(t => normalize(t));

  if (tags.some(t => t.includes('men') && !t.includes('women'))) return 'Masculine';
  if (tags.some(t => t.includes('women') && !t.includes('men'))) return 'Feminine';
  if (tags.some(t => t.includes('unisex'))) return 'Unisex';

  return 'Unknown';
}

function disableInput() {
  document.getElementById('searchInput').disabled = true;
  document.getElementById('guessBtn').disabled = true;
}

function showResult() {
  const resultCard = document.getElementById('resultCard');
  const resultTitle = document.getElementById('resultTitle');
  const answerDisplay = document.getElementById('answerDisplay');
  const resultStats = document.getElementById('resultStats');

  if (gameState.status === 'won') {
    resultTitle.textContent = '🎉 You Won!';
    resultStats.textContent = `Guessed in ${gameState.guesses.length} ${gameState.guesses.length === 1 ? 'try' : 'tries'}`;
  } else {
    resultTitle.textContent = '😔 Game Over';
    resultStats.textContent = `Better luck tomorrow!`;
  }

  answerDisplay.innerHTML = `
    <div class="answer-brand">${escapeHtml(gameState.answer.brand)}</div>
    <div class="answer-name">${escapeHtml(gameState.answer.name)}</div>
  `;

  resultCard.classList.remove('hidden');

  startCountdown();
}

function copyResult() {
  const emojiMap = {
    green: '🟩',
    yellow: '🟨',
    gray: '⬛',
    red: '🟥'
  };

  const lines = gameState.guesses.map(guess => {
    const tiles = compareTiles(guess, gameState.answer);
    return tiles.map(t => emojiMap[t.color]).join('');
  });

  const text = `Scentle ${gameState.dateKey}\n${gameState.status === 'won' ? gameState.guesses.length : 'X'}/6\n\n${lines.join('\n')}\n\nhttps://www.maxparfum.net/scentle.html`;

  navigator.clipboard.writeText(text).then(() => {
    showToast('Copied to clipboard!');
  }).catch(() => {
    showToast('Failed to copy');
  });
}

function startCountdown() {
  const updateCountdown = () => {
    const now = new Date();

    const formatter = new Intl.DateTimeFormat('en-AU', {
      timeZone: 'Australia/Melbourne',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    const parts = formatter.formatToParts(now);
    const year = parseInt(parts.find(p => p.type === 'year').value);
    const month = parseInt(parts.find(p => p.type === 'month').value) - 1;
    const day = parseInt(parts.find(p => p.type === 'day').value);
    const hour = parseInt(parts.find(p => p.type === 'hour').value);
    const minute = parseInt(parts.find(p => p.type === 'minute').value);
    const second = parseInt(parts.find(p => p.type === 'second').value);

    const melbNow = new Date(year, month, day, hour, minute, second);
    const melbMidnight = new Date(year, month, day + 1, 0, 0, 0);

    const diff = melbMidnight - melbNow;

    if (diff <= 0) {
      document.getElementById('nextPuzzle').innerHTML = 'New puzzle available! <strong>Refresh the page</strong>';
      return;
    }

    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    document.getElementById('nextPuzzle').innerHTML = `Next puzzle in: <strong>${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}</strong>`;
  };

  updateCountdown();
  setInterval(updateCountdown, 1000);
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.remove('hidden');

  setTimeout(() => {
    toast.classList.add('hidden');
  }, 2500);
}

function showError(message) {
  const errorDiv = document.getElementById('errorMessage');
  errorDiv.textContent = message;
  errorDiv.classList.remove('hidden');
  document.getElementById('loadingMessage').classList.add('hidden');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function escapeAttr(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/'/g, '&#39;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
