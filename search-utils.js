/**
 * Brand + Name Smart Search Utilities for MaxParfum
 *
 * Goal:
 * - "creed" => show popular Creed fragrances first
 * - "cre" => show popular Creed fragrances first
 * - "creed aventus" => show Creed Aventus first
 * - "aventus" => show Aventus first
 * - "doir" => still find Dior
 * - "saucage" => still find Sauvage
 *
 * Search only uses:
 * - brand
 * - name
 *
 * It does NOT use description, notes, accords, comments, etc.
 */

/**
 * Normalize text for comparison
 */
export function normalize(text) {
  if (!text) return '';
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[’']/g, '')           // remove apostrophes
    .replace(/[^a-z0-9\s]/g, ' ')   // keep alnum + spaces
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tokenize normalized text
 */
export function tokenize(text) {
  return normalize(text).split(' ').filter(Boolean);
}

/**
 * Common brand aliases people may type
 */
const BRAND_ALIASES = {
  'parfums de marly': ['pdm'],
  'jean paul gaultier': ['jpg', 'jean paul'],
  'maison francis kurkdjian': ['mfk', 'maison francis'],
  'louis vuitton': ['lv'],
  'tom ford': ['tf'],
  'yves saint laurent': ['ysl'],
  'giorgio armani': ['armani'],
  'carolina herrera': ['ch'],
  'maison crivelli': ['crivelli'],
  'initio parfums prives': ['initio'],
  'paco rabanne': ['paco rabbane', 'rabanne'],
  'rabanne': ['paco rabanne', 'paco rabbane'],
  'dolce gabbana': ['d g', 'dg'],
  'victoria secret': ['victorias secret']
};

/**
 * Manual boosts for famous/high-intent fragrances.
 * This helps brand-only searches show the fragrances people expect first.
 */
const POPULAR_FRAGRANCE_BOOSTS = {
  // Creed
  'creed::aventus': 5000,
  'creed::silver mountain water': 4800,
  'creed::green irish tweed': 4600,
  'creed::absolu aventus': 4400,
  'creed::aventus absolu': 4400,
  'creed::virgin island water': 4200,
  'creed::millesime imperial': 4000,
  'creed::royal oud': 3800,
  'creed::himalaya': 3600,
  'creed::original vetiver': 3400,
  'creed::viking': 3200,
  'creed::erolfa': 3000,

  // Dior
  'dior::sauvage': 5000,
  'dior::sauvage elixir': 4800,
  'dior::dior homme intense': 4600,
  'dior::dior homme': 4300,
  'dior::fahrenheit': 4200,
  'dior::miss dior': 4000,
  'dior::jadore': 3800,
  'dior::j adore': 3800,

  // Chanel
  'chanel::bleu de chanel': 5000,
  'chanel::coco mademoiselle': 4600,
  'chanel::allure homme sport': 4400,
  'chanel::chance': 4000,

  // Tom Ford
  'tom ford::oud wood': 5000,
  'tom ford::tobacco vanille': 4800,
  'tom ford::ombre leather': 4600,
  'tom ford::lost cherry': 4400,
  'tom ford::black orchid': 4200,

  // Jean Paul Gaultier
  'jean paul gaultier::le male le parfum': 5000,
  'jean paul gaultier::ultra male': 4700,
  'jean paul gaultier::le beau le parfum': 4500,
  'jpg::le male le parfum': 5000,
  'jpg::ultra male': 4700,
  'jpg::le beau le parfum': 4500,

  // Parfums de Marly
  'parfums de marly::althair': 5000,
  'parfums de marly::layton': 4800,
  'parfums de marly::delina': 4600,
  'parfums de marly::herod': 4400,
  'pdm::althair': 5000,
  'pdm::layton': 4800,
  'pdm::delina': 4600,
  'pdm::herod': 4400,

  // Mancera / Montale
  'mancera::instant crush': 5000,
  'mancera::red tobacco': 4800,
  'mancera::cedrat boise': 4600,
  'montale::arabians tonka': 5000,

  // Maison Francis Kurkdjian
  'maison francis kurkdjian::baccarat rouge 540': 5000,
  'maison francis kurkdjian::baccarat rouge 540 extrait': 4800,
  'mfk::baccarat rouge 540': 5000,
  'mfk::baccarat rouge 540 extrait': 4800,

  // Louis Vuitton
  'louis vuitton::imagination': 5000,
  'louis vuitton::afternoon swim': 4800,
  'louis vuitton::ombre nomade': 4600,
  'louis vuitton::symphony': 4400,
  'lv::imagination': 5000,
  'lv::afternoon swim': 4800,
  'lv::ombre nomade': 4600,
  'lv::symphony': 4400,

  // Other popular ones
  'montale::arabians tonka': 5000,
  'initio::side effect': 5000,
  'initio parfums prives::side effect': 5000,
  'maison crivelli::oud maracuja': 5000,
  'clive christian::blonde amber': 5000,
  'valentino::uomo born in roma': 4500,
  'prada::paradoxe': 4500,
  'prada::paradigme': 4500,
  'paco rabanne::invictus': 4500,
  'rabanne::invictus': 4500,
  'carolina herrera::good girl': 4500,
  'kayali::yum pistachio gelato 33': 4500,
  'kayali::yum boujee marshmallow 81': 4500
};

function getBrandSearchTerms(brand) {
  const normalizedBrand = normalize(brand);
  if (!normalizedBrand) return [];

  const aliases = BRAND_ALIASES[normalizedBrand] || [];
  return [normalizedBrand, ...aliases.map(normalize)].filter(Boolean);
}

function getPopularityBoost(fragrance) {
  const brand = normalize(fragrance?.brand);
  const name = normalize(fragrance?.name);

  const directKey = `${brand}::${name}`;
  let boost = POPULAR_FRAGRANCE_BOOSTS[directKey] || 0;

  const brandTerms = getBrandSearchTerms(brand);
  for (const term of brandTerms) {
    const aliasKey = `${term}::${name}`;
    boost = Math.max(boost, POPULAR_FRAGRANCE_BOOSTS[aliasKey] || 0);
  }

  if (fragrance?.rating_count) {
    boost += Math.min(Number(fragrance.rating_count) || 0, 500);
  }

  if (fragrance?.review_count) {
    boost += Math.min(Number(fragrance.review_count) || 0, 500);
  }

  if (fragrance?.views) {
    boost += Math.min((Number(fragrance.views) || 0) / 10, 500);
  }

  if (fragrance?.has_dupes) {
    boost += 100;
  }

  return boost;
}

/**
 * Damerau-Levenshtein distance
 * Handles transpositions like "sauvgae" vs "sauvage"
 */
function damerauLevenshtein(a, b) {
  a = a || '';
  b = b || '';

  const al = a.length;
  const bl = b.length;

  const dp = Array.from({ length: al + 1 }, () => Array(bl + 1).fill(0));

  for (let i = 0; i <= al; i++) dp[i][0] = i;
  for (let j = 0; j <= bl; j++) dp[0][j] = j;

  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;

      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );

      if (
        i > 1 &&
        j > 1 &&
        a[i - 1] === b[j - 2] &&
        a[i - 2] === b[j - 1]
      ) {
        dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + cost);
      }
    }
  }

  return dp[al][bl];
}

/**
 * Similarity score from 0 to 1
 */
function similarity(a, b) {
  const A = normalize(a);
  const B = normalize(b);

  if (!A || !B) return 0;

  const dist = damerauLevenshtein(A, B);
  const maxLen = Math.max(A.length, B.length) || 1;

  return 1 - dist / maxLen;
}

/**
 * Best similarity between query and any token in the target
 */
function bestTokenSimilarity(query, target) {
  const q = normalize(query);
  const tokens = tokenize(target);

  let best = 0;

  for (const token of tokens) {
    best = Math.max(best, similarity(q, token));
  }

  return best;
}

/**
 * Get the best brand signal for a query.
 */
function getBrandSignal(query, brand) {
  const q = normalize(query);
  const terms = getBrandSearchTerms(brand);

  let exact = false;
  let starts = false;
  let contains = false;
  let bestSimilarity = 0;
  let bestTerm = '';

  for (const term of terms) {
    if (!term) continue;

    if (term === q) {
      exact = true;
      bestTerm = term;
    }

    if (q.length >= 3 && term.startsWith(q)) {
      starts = true;
      bestTerm = term;
    }

    if (q.length >= 3 && term.includes(q)) {
      contains = true;
      bestTerm = term;
    }

    const sim = similarity(q, term);
    if (sim > bestSimilarity) {
      bestSimilarity = sim;
      bestTerm = term;
    }
  }

  return {
    exact,
    starts,
    contains,
    similarity: bestSimilarity,
    term: bestTerm
  };
}

/**
 * Brand + fragrance combo scoring.
 *
 * Examples:
 * - "creed aventus"
 * - "aventus creed"
 * - "pdm althair"
 * - "jpg le male"
 */
function brandNameComboScore(brand, name, query) {
  const q = normalize(query);
  const n = normalize(name);

  if (!q || !n) return 0;

  const brandTerms = getBrandSearchTerms(brand);
  let bestScore = 0;

  for (const brandTerm of brandTerms) {
    if (!brandTerm) continue;

    let score = 0;

    const fullBrandName = `${brandTerm} ${n}`;
    const fullNameBrand = `${n} ${brandTerm}`;

    if (q === fullBrandName || q === fullNameBrand) {
      score += 12000;
    }

    // Query starts with brand, remaining text should match fragrance name
    if (q.startsWith(`${brandTerm} `)) {
      const remaining = q.slice(brandTerm.length).trim();

      if (remaining) {
        if (n === remaining) score += 10000;
        else if (n.startsWith(remaining)) score += 7500;
        else if (n.includes(remaining)) score += 5500;
        else score += similarity(remaining, n) * 4000;

        score += 2500;
      }
    }

    // Query ends with brand, earlier text should match fragrance name
    if (q.endsWith(` ${brandTerm}`)) {
      const remaining = q.slice(0, -brandTerm.length).trim();

      if (remaining) {
        if (n === remaining) score += 8500;
        else if (n.startsWith(remaining)) score += 6500;
        else if (n.includes(remaining)) score += 4500;
        else score += similarity(remaining, n) * 3500;

        score += 1800;
      }
    }

    bestScore = Math.max(bestScore, score);
  }

  return bestScore;
}

/**
 * Brand-aware + name-aware search score
 */
export function calculateSearchScore(fragrance, query) {
  const q = normalize(query);

  if (!q) return -Infinity;

  const name = normalize(fragrance?.name);
  const brand = normalize(fragrance?.brand);

  if (!name) return -Infinity;

  let score = 0;

  const qTokens = tokenize(q);
  const nameTokens = tokenize(name);
  const brandTokens = tokenize(brand);

  const brandSignal = getBrandSignal(q, brand);

  /**
   * Brand browsing query:
   *
   * This means the user is probably searching for a brand, not a fragrance name.
   *
   * Examples:
   * - "creed"
   * - "cre"
   * - "dior"
   * - "doir"
   * - "pdm"
   *
   * In this mode, we suppress fragrance-name boosts so obscure names like
   * "Creed Pour Enfants" do not beat "Aventus".
   */
  const isSingleTokenQuery = qTokens.length === 1;

  const brandBrowsingQuery = Boolean(
    brand &&
    isSingleTokenQuery &&
    (
      brandSignal.exact ||
      brandSignal.starts ||
      (q.length >= 3 && brandSignal.similarity >= 0.72)
    )
  );

  /**
   * 1) Brand intent
   */
  if (brand) {
    if (brandSignal.exact) {
      score += 10000;
    } else if (brandSignal.starts) {
      score += 8000;
    } else if (brandSignal.contains) {
      score += 5000;
    }

    if (q.length >= 3 && brandSignal.similarity >= 0.72) {
      score += brandSignal.similarity * 4500;
    }

    // Query token exactly matches a brand token
    for (const token of qTokens) {
      if (brandTokens.includes(token)) {
        score += 1200;
      } else if (brandTokens.some(bt => bt.startsWith(token))) {
        score += 900;
      }
    }

    // For brand browsing, boost the brand's most important fragrances
    if (brandBrowsingQuery) {
      score += getPopularityBoost(fragrance);
    }
  }

  /**
   * 2) Brand + fragrance combo intent
   */
  score += brandNameComboScore(brand, name, q);

  /**
   * 3) Fragrance name intent
   *
   * If the query is a brand-browsing query like "creed",
   * do not give extra points just because the fragrance name contains "creed".
   */
  if (!brandBrowsingQuery) {
    if (name === q) {
      score += 9500;
    }

    if (name.startsWith(q)) {
      score += 6500;
    }

    if (name.includes(q)) {
      score += 4200;
    }

    let matchedNameTokens = 0;

    for (const token of qTokens) {
      if (nameTokens.includes(token)) {
        matchedNameTokens++;
        score += 700;
      } else if (nameTokens.some(nt => nt.startsWith(token))) {
        matchedNameTokens++;
        score += 500;
      } else if (name.includes(token)) {
        matchedNameTokens++;
        score += 300;
      }
    }

    if (qTokens.length > 0) {
      score += (matchedNameTokens / qTokens.length) * 900;

      if (matchedNameTokens === qTokens.length) {
        score += 1000;
      }
    }

    /**
     * 4) Fuzzy fragrance name matching
     * Keeps typo tolerance like "saucage" => "sauvage".
     */
    if (q.length >= 3) {
      const nameSim = similarity(q, name);
      score += nameSim * 3000;
    } else {
      const nameSim = similarity(q, name);
      score += nameSim * 800;
    }

    if (q.length >= 4) {
      const nameTokenSim = bestTokenSimilarity(q, name);

      if (nameTokenSim >= 0.72) {
        score += nameTokenSim * 1500;
      }
    }
  }

  /**
   * 5) Small quality tie-breakers
   * These should never overpower brand/name relevance.
   */
  if (fragrance.rating_value && Number(fragrance.rating_value) > 3.5) {
    score += 30;
  }

  if (fragrance.has_dupes) {
    score += 20;
  }

  if (fragrance.year && Number(fragrance.year) >= 2015) {
    score += 10;
  }

  return score;
}

/**
 * Search fragrances
 */
export function searchFragrances(fragrances, query, options = {}) {
  const { maxResults = 20, minScore = 350 } = options;

  if (!query || query.trim().length === 0) return [];

  const scored = fragrances
    .map(fragrance => ({
      fragrance,
      score: calculateSearchScore(fragrance, query)
    }))
    .filter(x => x.score >= minScore)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;

      // Tie-breaker 1: higher popularity boost
      const aPopularity = getPopularityBoost(a.fragrance);
      const bPopularity = getPopularityBoost(b.fragrance);

      if (bPopularity !== aPopularity) {
        return bPopularity - aPopularity;
      }

      // Tie-breaker 2: shorter name usually means cleaner/main result
      const aNameLength = normalize(a.fragrance?.name).length;
      const bNameLength = normalize(b.fragrance?.name).length;

      return aNameLength - bNameLength;
    });

  return scored.slice(0, maxResults).map(x => x.fragrance);
}

/**
 * Autocomplete suggestions
 */
export function getAutocompleteSuggestions(fragrances, query, maxSuggestions = 12) {
  if (!query || query.trim().length < 2) return [];

  return searchFragrances(fragrances, query, {
    maxResults: maxSuggestions,
    minScore: 450
  });
}