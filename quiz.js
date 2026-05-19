let allFragrances = [];
let currentQuestion = 0;
let answers = [];
let categoryScores = {
  fresh: 0,
  sweet: 0,
  woody: 0,
  dark: 0,
  gourmand: 0,
  aquatic: 0
};
let lastResultData = null;

const QUESTIONS = [
  {
    question: "What vibe best describes you?",
    answers: [
      { text: "Fresh & energetic", scores: { fresh: 3 } },
      { text: "Dark & mysterious", scores: { dark: 3 } },
      { text: "Warm & cozy", scores: { gourmand: 3, sweet: 1 } },
      { text: "Elegant & sophisticated", scores: { woody: 2 } },
      { text: "Playful & sweet", scores: { sweet: 3, gourmand: 1 } }
    ]
  },
  {
    question: "How would people describe your personality?",
    answers: [
      { text: "Calm & relaxed", scores: { fresh: 2, woody: 1 } },
      { text: "Confident & bold", scores: { dark: 2, woody: 1 } },
      { text: "Romantic", scores: { sweet: 2, gourmand: 1 } },
      { text: "Fun & outgoing", scores: { fresh: 2, sweet: 1 } },
      { text: "Mysterious", scores: { dark: 3 } }
    ]
  },
  {
    question: "What scenario is your favourite to wear a fragrance in?",
    answers: [
      { text: "Everyday", scores: { fresh: 2, woody: 1 } },
      { text: "Work / office", scores: { woody: 2, fresh: 1 } },
      { text: "Date nights", scores: { sweet: 3, gourmand: 1 } },
      { text: "Parties", scores: { dark: 2, sweet: 1 } },
      { text: "Special occasions", scores: { woody: 2, gourmand: 1 } }
    ]
  },
  {
    question: "Which scent sounds the most appealing?",
    answers: [
      { text: "Citrus", scores: { fresh: 3, aquatic: 1 } },
      { text: "Vanilla", scores: { gourmand: 3, sweet: 2 } },
      { text: "Tobacco", scores: { woody: 2, dark: 1 } },
      { text: "Rose", scores: { sweet: 2, woody: 1 } },
      { text: "Oud", scores: { woody: 3, dark: 1 } },
      { text: "Coffee", scores: { dark: 2, gourmand: 1 } }
    ]
  },
  {
    question: "What season do you prefer?",
    answers: [
      { text: "Summer", scores: { fresh: 3, aquatic: 2 } },
      { text: "Winter", scores: { sweet: 2, gourmand: 2, woody: 1 } },
      { text: "All year", scores: { fresh: 1, woody: 1 } }
    ]
  },
  {
    question: "How noticeable do you like your fragrances?",
    answers: [
      { text: "Subtle", scores: { fresh: 1, woody: 1 } },
      { text: "Moderate", scores: { fresh: 1, sweet: 1, woody: 1 } },
      { text: "Strong", scores: { dark: 2, woody: 1 } },
      { text: "Extremely powerful", scores: { dark: 2, gourmand: 1 } }
    ]
  },
  {
    question: "Pick a setting you enjoy most",
    answers: [
      { text: "Beach vacation", scores: { aquatic: 3, fresh: 2 } },
      { text: "Luxury hotel", scores: { woody: 2, gourmand: 1 } },
      { text: "Coffee shop", scores: { dark: 1, gourmand: 1 } },
      { text: "Nightclub", scores: { dark: 2, sweet: 1 } },
      { text: "Nature / forest", scores: { woody: 3, fresh: 1 } }
    ]
  },
  {
    question: "Which color best represents your style?",
    answers: [
      { text: "White", scores: { fresh: 2, aquatic: 1 } },
      { text: "Black", scores: { dark: 2 } },
      { text: "Gold", scores: { gourmand: 2, woody: 1 } },
      { text: "Red", scores: { sweet: 2, dark: 1 } },
      { text: "Blue", scores: { aquatic: 2, fresh: 1 } }
    ]
  },
  {
    question: "Pick your ideal evening",
    answers: [
      { text: "Relaxing at home", scores: { woody: 2, gourmand: 1 } },
      { text: "Fancy dinner", scores: { sweet: 2, woody: 1, gourmand: 1 } },
      { text: "Party with friends", scores: { fresh: 2, sweet: 1 } },
      { text: "Romantic date", scores: { sweet: 3, gourmand: 1 } },
      { text: "Exploring the city", scores: { fresh: 2, woody: 1 } }
    ]
  },
  {
    question: "What type of fragrance do you usually prefer?",
    answers: [
      { text: "Fresh and clean", scores: { fresh: 3, aquatic: 1 } },
      { text: "Sweet and warm", scores: { sweet: 3, gourmand: 2 } },
      { text: "Woody and smooth", scores: { woody: 3, fresh: 1 } },
      { text: "Dark and spicy", scores: { dark: 3, gourmand: 1 } },
      { text: "I'm not sure", scores: { fresh: 1, woody: 1 } }
    ]
  }
];

const PERSONALITY_MAP = {
  fresh_aquatic: { title: "THE FRESH EXPLORER", emoji: "🌊" },
  fresh_woody: { title: "THE FRESH SOPHISTICATE", emoji: "✨" },
  dark_gourmand: { title: "THE DARK ICON", emoji: "🖤" },
  dark_woody: { title: "THE MYSTERIOUS MUSE", emoji: "🌙" },
  sweet_gourmand: { title: "THE SWEET CONNOISSEUR", emoji: "🍯" },
  sweet_woody: { title: "THE ROMANTIC REFINED", emoji: "💎" },
  woody_fresh: { title: "THE NATURAL SOPHISTICATE", emoji: "🌿" },
  woody_dark: { title: "THE BOLD VISIONARY", emoji: "🔥" },
  aquatic_fresh: { title: "THE OCEAN BREEZE", emoji: "🌊" },
  gourmand_sweet: { title: "THE COZY CONNOISSEUR", emoji: "🍂" }
};

const BRAND_WHITELIST = [
  'dior', 'chanel', 'yves saint laurent', 'ysl', 'giorgio armani', 'armani',
  'versace', 'tom ford', 'prada', 'givenchy', 'valentino', 'burberry',
  'azzaro', 'paco rabanne', 'jean paul gaultier', 'dolce & gabbana', 'd&g',
  'viktor & rolf', 'hermes', 'gucci', 'lancôme', 'mugler',
  'creed', 'maison francis kurkdjian', 'mfk', 'parfums de marly', 'pdm',
  'initio', 'nishane', 'byredo', 'roja', 'mancera', 'montale',
  'xerjoff', 'amouage', 'maison crivelli', 'kilian', 'frederic malle',
  'serge lutens', 'diptyque', 'le labo', 'acqua di parma', 'jo malone'
];

async function loadFragrances() {
  try {
    const response = await fetch('fragrances_merged.json');
    if (!response.ok) throw new Error('Failed to load fragrances');
    allFragrances = await response.json();
  } catch (error) {
    console.error('Error loading fragrances:', error);
    allFragrances = [];
  }
}

function sanitizeTitleForGender(title) {
  const replacements = {
    'gentleman': 'icon',
    'lady': 'muse',
    'king': 'icon',
    'queen': 'muse',
    'prince': 'royal',
    'princess': 'royal',
    'man': 'person',
    'woman': 'person',
    'boy': 'youth',
    'girl': 'youth'
  };

  let sanitized = title.toLowerCase();
  Object.entries(replacements).forEach(([gendered, neutral]) => {
    const regex = new RegExp(`\\b${gendered}\\b`, 'gi');
    sanitized = sanitized.replace(regex, neutral);
  });

  return sanitized.replace(/\b\w/g, char => char.toUpperCase());
}

function normalizeString(str) {
  return str.toLowerCase().trim().replace(/[&]/g, '&').replace(/[^a-z0-9&]/g, '');
}

function isBrandWhitelisted(brand) {
  const normalized = normalizeString(brand);
  return BRAND_WHITELIST.some(whitelistBrand =>
    normalizeString(whitelistBrand) === normalized
  );
}

function applyPopularityFilter(fragrances) {
  let filtered = fragrances.filter(f =>
    isBrandWhitelisted(f.brand) &&
    (f.rating_value === undefined || f.rating_value >= 3.0)
  );

  if (filtered.length < 5) {
    filtered = fragrances.filter(f =>
      isBrandWhitelisted(f.brand) &&
      (f.rating_value === undefined || f.rating_value >= 2.5)
    );
  }

  return filtered;
}

function getCategoryMatchScore(fragrance, topCategories) {
  let score = 0;

  const mainAccords = fragrance.main_accords || [];
  const allNotes = [
    ...(fragrance.top_notes || []),
    ...(fragrance.middle_notes || []),
    ...(fragrance.base_notes || [])
  ].join(' ').toLowerCase();

  const accordsText = mainAccords.join(' ').toLowerCase();

  if (topCategories.includes('fresh')) {
    if (accordsText.includes('fresh') || accordsText.includes('citrus') || accordsText.includes('aquatic')) score += 5;
    if (allNotes.includes('lemon') || allNotes.includes('bergamot') || allNotes.includes('citrus')) score += 2;
  }
  if (topCategories.includes('sweet')) {
    if (accordsText.includes('sweet') || accordsText.includes('vanilla') || accordsText.includes('gourmand')) score += 5;
    if (allNotes.includes('vanilla') || allNotes.includes('caramel') || allNotes.includes('honey')) score += 2;
  }
  if (topCategories.includes('woody')) {
    if (accordsText.includes('woody') || accordsText.includes('sandalwood') || accordsText.includes('cedar')) score += 5;
    if (allNotes.includes('sandalwood') || allNotes.includes('cedar') || allNotes.includes('oak')) score += 2;
  }
  if (topCategories.includes('dark')) {
    if (accordsText.includes('dark') || accordsText.includes('spicy') || accordsText.includes('oud')) score += 5;
    if (allNotes.includes('oud') || allNotes.includes('tobacco') || allNotes.includes('leather')) score += 2;
  }
  if (topCategories.includes('gourmand')) {
    if (accordsText.includes('gourmand') || accordsText.includes('sweet')) score += 5;
    if (allNotes.includes('praline') || allNotes.includes('cocoa') || allNotes.includes('caramel')) score += 2;
  }
  if (topCategories.includes('aquatic')) {
    if (accordsText.includes('aquatic') || accordsText.includes('marine') || accordsText.includes('fresh')) score += 5;
    if (allNotes.includes('aquatic') || allNotes.includes('ozonic')) score += 2;
  }

  const rating = fragrance.rating_value || 0;
  score += Math.max(0, rating * 0.5);

  return score;
}

function calculateResults() {
  const topCategories = Object.entries(categoryScores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([cat]) => cat);

  const filtered = applyPopularityFilter(allFragrances);

  const scored = filtered.map(f => ({
    ...f,
    matchScore: getCategoryMatchScore(f, topCategories)
  }));

  scored.sort((a, b) => {
    const scoreB = b.matchScore - a.matchScore;
    if (scoreB !== 0) return scoreB;
    return (b.rating_value || 0) - (a.rating_value || 0);
  });

  const main = scored.slice(0, 5);
  const secondary = scored.slice(5, 10);

  const profileTags = generateProfileTags(topCategories);
  const personalityHeadline = generatePersonalityHeadline(topCategories);

  return {
    topCategories,
    profileTags,
    personalityHeadline,
    main,
    secondary
  };
}

function generateProfileTags(topCategories) {
  const tagMap = {
    fresh: 'Fresh',
    sweet: 'Sweet',
    woody: 'Woody',
    dark: 'Dark',
    gourmand: 'Gourmand',
    aquatic: 'Aquatic'
  };

  const tags = topCategories.map(cat => tagMap[cat]);

  if (categoryScores.fresh > 5) tags.push('Energetic');
  if (categoryScores.dark > 5) tags.push('Bold');
  if (categoryScores.sweet > 5) tags.push('Sensual');
  if (categoryScores.woody > 5) tags.push('Sophisticated');
  if (categoryScores.aquatic > 5) tags.push('Clean');
  if (categoryScores.gourmand > 5) tags.push('Cozy');

  return Array.from(new Set(tags)).slice(0, 5);
}

function generatePersonalityHeadline(topCategories) {
  const key = topCategories.join('_');
  const personality = PERSONALITY_MAP[key] || {
    title: `THE ${topCategories.map(c => c.toUpperCase()).join(' ')} LOVER`,
    emoji: '✨'
  };
  return personality;
}

function startQuiz() {
  document.getElementById('hero').classList.add('hidden');
  document.getElementById('quiz').classList.remove('hidden');
  document.getElementById('results').classList.add('hidden');
  currentQuestion = 0;
  answers = [];
  categoryScores = {
    fresh: 0,
    sweet: 0,
    woody: 0,
    dark: 0,
    gourmand: 0,
    aquatic: 0
  };
  showQuestion();
}

function showQuestion() {
  const q = QUESTIONS[currentQuestion];
  document.getElementById('questionText').textContent = q.question;

  const container = document.getElementById('answersContainer');
  container.innerHTML = '';

  q.answers.forEach((answer, idx) => {
    const card = document.createElement('div');
    card.className = 'answer-card';
    card.textContent = answer.text;
    card.onclick = () => handleAnswer(idx);
    container.appendChild(card);
  });

  const progress = ((currentQuestion + 1) / QUESTIONS.length) * 100;
  document.getElementById('progressFill').style.width = progress + '%';
  document.getElementById('progressText').textContent = `Question ${currentQuestion + 1} / ${QUESTIONS.length}`;

  const backBtn = document.getElementById('backBtn');
  if (currentQuestion === 0) {
    backBtn.style.display = 'none';
  } else {
    backBtn.style.display = 'inline-block';
  }
}

function handleAnswer(idx) {
  const q = QUESTIONS[currentQuestion];
  const selectedAnswer = q.answers[idx];

  Object.entries(selectedAnswer.scores).forEach(([category, score]) => {
    categoryScores[category] += score;
  });

  answers.push(idx);
  currentQuestion++;

  if (currentQuestion < QUESTIONS.length) {
    showQuestion();
  } else {
    showResults();
  }
}

function goBack() {
  if (currentQuestion > 0) {
    currentQuestion--;
    const q = QUESTIONS[currentQuestion];
    const selectedAnswer = q.answers[answers[currentQuestion]];

    Object.entries(selectedAnswer.scores).forEach(([category, score]) => {
      categoryScores[category] -= score;
    });

    answers.pop();
    showQuestion();
  }
}

function showResults() {
  document.getElementById('quiz').classList.add('hidden');
  document.getElementById('results').classList.remove('hidden');

  const resultData = calculateResults();
  lastResultData = resultData;

  const { topCategories, profileTags, personalityHeadline, main, secondary } = resultData;

  document.getElementById('personalityTitle').textContent = `${personalityHeadline.emoji} ${personalityHeadline.title}`;

  const tagsContainer = document.getElementById('profileTags');
  tagsContainer.innerHTML = profileTags.map(tag =>
    `<div class="profile-tag">${tag}</div>`
  ).join('');

  const mainContainer = document.getElementById('mainRecommendations');
  mainContainer.innerHTML = main.map(f => createFragranceCard(f)).join('');

  const secondaryContainer = document.getElementById('secondaryRecommendations');
  secondaryContainer.innerHTML = secondary.map(f => createFragranceCard(f)).join('');
}

function createFragranceCard(fragrance) {
  const rating = fragrance.rating_value ? fragrance.rating_value.toFixed(2) : 'N/A';
  const image = fragrance.image || 'https://via.placeholder.com/200x180?text=No+Image';
  const url = `fragrance.html?brand=${encodeURIComponent(fragrance.brand)}&name=${encodeURIComponent(fragrance.name)}`;

  return `
    <a href="${url}" class="fragrance-card">
      <div class="fragrance-card-image">
        <img src="${image}" alt="${fragrance.brand} ${fragrance.name}" onerror="this.src='https://via.placeholder.com/200x180?text=No+Image'">
      </div>
      <div class="fragrance-card-content">
        <div class="fragrance-brand">${fragrance.brand}</div>
        <div class="fragrance-name">${fragrance.name}</div>
        <div class="fragrance-rating">⭐ ${rating}</div>
        <button class="fragrance-btn">View Fragrance →</button>
      </div>
    </a>
  `;
}

function buildSharePayload(personalityTitle, profileTags) {
  const sanitizedTitle = sanitizeTitleForGender(personalityTitle);
  const tagsText = profileTags.join(' • ');
  const shareText = `My MaxParfum Scent Personality:\n${sanitizedTitle}\n\n${tagsText} ✨\n\nTake the quiz:\nhttps://www.maxparfum.net/quiz.html`;

  return {
    title: 'My MaxParfum Scent Personality',
    text: shareText,
    url: 'https://www.maxparfum.net/quiz.html'
  };
}

async function shareScent() {
  if (!lastResultData) return;

  const titleText = document.getElementById('personalityTitle').textContent;
  const cleanTitle = titleText.replace(/[^\s\w]/g, '').trim();

  const payload = buildSharePayload(cleanTitle, lastResultData.profileTags);

  if (navigator.share) {
    try {
      await navigator.share(payload);
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Share failed:', error);
      }
    }
  } else {
    copyToClipboard(payload.text);
    showShareFeedback('Copied to clipboard');
  }
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showShareFeedback('Copied to clipboard');
  } catch (error) {
    console.error('Copy failed:', error);
  }
}

function showShareFeedback(message) {
  const feedback = document.getElementById('shareFeedback');
  feedback.textContent = message;
  setTimeout(() => {
    feedback.textContent = '';
  }, 3000);
}

function retakeQuiz() {
  startQuiz();
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadFragrances();

  document.getElementById('startBtn').addEventListener('click', startQuiz);
  document.getElementById('backBtn').addEventListener('click', goBack);
  document.getElementById('retakeBtn').addEventListener('click', retakeQuiz);
  document.getElementById('shareBtn').addEventListener('click', shareScent);
  document.getElementById('copyBtn').addEventListener('click', () => {
    copyToClipboard('https://www.maxparfum.net/quiz.html');
    showShareFeedback('Quiz link copied!');
  });
  document.getElementById('friendShareBtn').addEventListener('click', shareScent);
});
