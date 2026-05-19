import { searchFragrances } from './search-utils.js';
import { makeFragranceUrl } from './fragrance-id-utils.js';

let fragrancesData = [];
let selectedLeft = null;
let selectedRight = null;
let debounceLeft = null;
let debounceRight = null;

// ── LOAD DATA ──────────────────────────────────────────────────────────────

async function loadData() {
  try {
    const resp = await fetch('fragrances_merged.json');
    fragrancesData = await resp.json();
  } catch (err) {
    console.error('Failed to load fragrances_merged.json:', err);
    fragrancesData = [];
  }
}

// ── SEARCH ─────────────────────────────────────────────────────────────────

function doSearch(query, side) {
  const dropdownEl = document.getElementById(`results-${side}`);

  if (!query || query.trim().length < 2) {
    dropdownEl.classList.remove('open');
    dropdownEl.innerHTML = '';
    return;
  }

  const results = searchFragrances(fragrancesData, query.trim()).slice(0, 10);

  if (!results.length) {
    dropdownEl.innerHTML = '<div style="padding:14px 16px;color:#666;font-size:0.85rem;">No results found.</div>';
    dropdownEl.classList.add('open');
    return;
  }

  dropdownEl.innerHTML = '';
  results.forEach(frag => {
    const item = document.createElement('div');
    item.className = 'search-result-item';

    const thumb = frag.image
      ? `<img src="${escHtml(frag.image)}" alt="${escHtml(frag.name)}" class="search-result-thumb" loading="lazy" />`
      : `<div class="search-result-thumb-placeholder">&#128167;</div>`;

    item.innerHTML = `
      ${thumb}
      <div class="search-result-info">
        <div class="search-result-name">${escHtml(frag.name || '')}</div>
        <div class="search-result-brand">${escHtml(frag.brand || '')}</div>
      </div>`;

    item.addEventListener('mousedown', e => {
      e.preventDefault();
      selectFragrance(frag, side);
    });

    dropdownEl.appendChild(item);
  });

  dropdownEl.classList.add('open');
}

function selectFragrance(frag, side) {
  if (side === 'left') selectedLeft = frag;
  else selectedRight = frag;

  // Fill input with name
  const inputEl = document.getElementById(`search-${side}`);
  inputEl.value = `${frag.brand} — ${frag.name}`;

  // Close dropdown
  const dropdownEl = document.getElementById(`results-${side}`);
  dropdownEl.classList.remove('open');
  dropdownEl.innerHTML = '';

  // Show selected chip
  const selectedEl = document.getElementById(`selected-${side}`);
  const img = frag.image
    ? `<img src="${escHtml(frag.image)}" alt="${escHtml(frag.name)}" class="selected-frag-img" loading="lazy" />`
    : `<div class="selected-frag-img" style="display:flex;align-items:center;justify-content:center;font-size:1.5rem;color:#333;background:#1a1a1a;border-radius:8px;">&#128167;</div>`;

  selectedEl.innerHTML = `
    <div class="selected-frag">
      ${img}
      <div class="selected-frag-info">
        <div class="selected-frag-brand">${escHtml(frag.brand || '')}</div>
        <div class="selected-frag-name">${escHtml(frag.name || '')}</div>
      </div>
      <button class="selected-frag-clear" title="Clear selection">&#215;</button>
    </div>`;

  selectedEl.style.display = 'block';

  selectedEl.querySelector('.selected-frag-clear').addEventListener('click', () => {
    clearSelection(side);
  });

  updateCompareButton();
}

function clearSelection(side) {
  if (side === 'left') selectedLeft = null;
  else selectedRight = null;

  document.getElementById(`search-${side}`).value = '';
  const selectedEl = document.getElementById(`selected-${side}`);
  selectedEl.innerHTML = '';
  selectedEl.style.display = 'none';

  updateCompareButton();
  document.getElementById('comparison-result').style.display = 'none';
}

function updateCompareButton() {
  document.getElementById('compare-btn').disabled = !(selectedLeft && selectedRight);
}

// ── COMPARISON RENDER ──────────────────────────────────────────────────────

function renderComparison(a, b) {
  const resultEl = document.getElementById('comparison-result');
  resultEl.style.display = 'block';

  const cardA = buildResultCard(a);
  const cardB = buildResultCard(b);
  const table = buildTable(a, b);
  const verdict = buildVerdict(a, b);

  resultEl.innerHTML = `
    <div class="result-cards">
      ${cardA}
      <div class="result-vs"><div class="result-vs-badge">VS</div></div>
      ${cardB}
    </div>
    ${table}
    ${verdict}
    <div class="reset-btn-wrap">
      <button class="reset-btn" id="reset-btn">Start New Comparison</button>
    </div>`;

  document.getElementById('reset-btn').addEventListener('click', resetComparison);

  resultEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function buildResultCard(frag) {
  const url = makeFragranceUrl(frag.brand, frag.name);
  const img = frag.image
    ? `<img src="${escHtml(frag.image)}" alt="${escHtml(frag.name)}" class="result-card-img" loading="lazy" />`
    : `<div class="result-card-placeholder">&#128167;</div>`;

  const accords = Array.isArray(frag.main_accords) && frag.main_accords.length
    ? frag.main_accords.slice(0, 5).map(a => `<span class="accord-chip">${escHtml(a)}</span>`).join('')
    : '';

  return `
    <div class="result-card">
      <div class="result-card-img-wrap">${img}</div>
      <div class="result-card-brand">${escHtml(frag.brand || '')}</div>
      <div class="result-card-name">${escHtml(frag.name || '')}</div>
      <a href="${url}" class="result-card-link" target="_blank" rel="noopener noreferrer">
        View details
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
      </a>
      ${accords ? `<div class="result-accords">${accords}</div>` : ''}
    </div>`;
}

function buildTable(a, b) {
  const rows = [
    { label: 'Brand', valA: txt(a.brand), valB: txt(b.brand) },
    { label: 'Gender', valA: txt(a.gender), valB: txt(b.gender) },
    { label: 'Year', valA: txt(a.year), valB: txt(b.year) },
    { label: 'Main Accords', valA: chipsOrNa(a.main_accords), valB: chipsOrNa(b.main_accords) },
    { label: 'Top Notes', valA: notesOrNa(a.top_notes), valB: notesOrNa(b.top_notes) },
    { label: 'Middle Notes', valA: notesOrNa(a.middle_notes), valB: notesOrNa(b.middle_notes) },
    { label: 'Base Notes', valA: notesOrNa(a.base_notes), valB: notesOrNa(b.base_notes) },
    { label: 'Rating', valA: ratingOrNa(a.rating_value), valB: ratingOrNa(b.rating_value) },
    { label: 'Longevity', valA: txt(a.longevity), valB: txt(b.longevity) },
    { label: 'Projection', valA: txt(a.sillage || a.projection), valB: txt(b.sillage || b.projection) },
    { label: 'Season', valA: chipsOrNa(a.seasons || a.season), valB: chipsOrNa(b.seasons || b.season) },
    { label: 'Occasions', valA: chipsOrNa(a.occasions || a.occasion), valB: chipsOrNa(b.occasions || b.occasion) },
    { label: 'Price/Value', valA: txt(a.price_value || a.value_rating), valB: txt(b.price_value || b.value_rating) },
    { label: 'Country', valA: txt(a.country), valB: txt(b.country) },
    { label: 'Dupes', valA: chipsOrNa(a.dupes), valB: chipsOrNa(b.dupes) },
  ].filter(r => r.valA !== naHtml() || r.valB !== naHtml());

  const nameA = escHtml(`${a.brand} — ${a.name}`);
  const nameB = escHtml(`${b.brand} — ${b.name}`);

  const rowsHtml = rows.map(r => `
    <tr>
      <td>${escHtml(r.label)}</td>
      <td>${r.valA}</td>
      <td>${r.valB}</td>
    </tr>`).join('');

  return `
    <div class="comparison-table-wrap">
      <table class="comparison-table">
        <thead>
          <tr>
            <th></th>
            <th>${nameA}</th>
            <th>${nameB}</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>`;
}

function buildVerdict(a, b) {
  const lines = [];

  // Accord differences
  const accordsA = safeArr(a.main_accords).map(x => x.toLowerCase());
  const accordsB = safeArr(b.main_accords).map(x => x.toLowerCase());

  const profileA = describeProfile(accordsA);
  const profileB = describeProfile(accordsB);

  if (profileA && profileB && profileA !== profileB) {
    lines.push(`<strong>${escHtml(a.brand)} ${escHtml(a.name)}</strong> leans ${profileA}, while <strong>${escHtml(b.brand)} ${escHtml(b.name)}</strong> leans ${profileB}. Your choice depends on which direction suits your taste.`);
  } else if (profileA) {
    lines.push(`Both fragrances share a ${profileA} character, making them similar in overall style.`);
  }

  // Gender difference
  if (a.gender && b.gender && a.gender !== b.gender) {
    lines.push(`${escHtml(a.name)} is marketed as <em>${escHtml(a.gender)}</em> while ${escHtml(b.name)} is marketed as <em>${escHtml(b.gender)}</em> — both can be worn by anyone who enjoys the scent profile.`);
  }

  // Rating comparison
  const rA = parseFloat(a.rating_value);
  const rB = parseFloat(b.rating_value);
  if (!isNaN(rA) && !isNaN(rB) && Math.abs(rA - rB) >= 0.2) {
    const higher = rA > rB ? a : b;
    const lower = rA > rB ? b : a;
    lines.push(`Community ratings favour <strong>${escHtml(higher.name)}</strong> (${rA > rB ? rA : rB} vs ${rA > rB ? rB : rA}), though personal preference always wins.`);
  }

  // Dupe mention
  const dupesA = safeArr(a.dupes).map(d => d.toLowerCase());
  const dupesB = safeArr(b.dupes).map(d => d.toLowerCase());
  if (dupesA.some(d => d.includes(b.name?.toLowerCase() || '')) || dupesB.some(d => d.includes(a.name?.toLowerCase() || ''))) {
    lines.push(`These two fragrances are commonly compared as dupe alternatives. If budget is a factor, testing both is recommended.`);
  }

  if (!lines.length) {
    lines.push(`Both fragrances have different profiles. Compare the notes, accords, and performance above to decide which better suits your taste.`);
  }

  const paras = lines.map(l => `<p>${l}</p>`).join('');

  return `
    <div class="verdict-section">
      <div class="verdict-title">Which One Should You Choose?</div>
      <div class="verdict-text">${paras}</div>
    </div>`;
}

function describeProfile(accords) {
  const sweet = ['sweet', 'gourmand', 'vanilla', 'caramel', 'chocolate'];
  const fresh = ['fresh', 'citrus', 'aquatic', 'green', 'ozonic'];
  const woody = ['woody', 'wood', 'cedar', 'sandalwood', 'oud', 'leather'];
  const spicy = ['spicy', 'warm spicy', 'pepper', 'cinnamon'];
  const floral = ['floral', 'rose', 'jasmine', 'iris'];

  const count = (arr, keys) => keys.filter(k => arr.some(a => a.includes(k))).length;

  const scores = [
    { label: 'sweet and gourmand', n: count(accords, sweet) },
    { label: 'fresh and citrusy', n: count(accords, fresh) },
    { label: 'woody and earthy', n: count(accords, woody) },
    { label: 'spicy and warm', n: count(accords, spicy) },
    { label: 'floral', n: count(accords, floral) },
  ];

  const best = scores.reduce((a, b) => b.n > a.n ? b : a, { label: '', n: 0 });
  return best.n > 0 ? best.label : '';
}

// ── HELPERS ────────────────────────────────────────────────────────────────

function safeArr(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter(Boolean);
  return [];
}

function txt(val) {
  if (val === null || val === undefined || val === '') return naHtml();
  return `<span>${escHtml(String(val))}</span>`;
}

function naHtml() { return `<span class="na-text">Not available</span>`; }

function chipsOrNa(val) {
  const arr = safeArr(val);
  if (!arr.length) return naHtml();
  return `<div class="notes-list">${arr.slice(0, 8).map(v => `<span class="note-chip">${escHtml(String(v))}</span>`).join('')}</div>`;
}

function notesOrNa(val) {
  const arr = safeArr(val);
  if (!arr.length) return naHtml();
  return `<div class="notes-list">${arr.map(v => `<span class="note-chip">${escHtml(String(v))}</span>`).join('')}</div>`;
}

function ratingOrNa(val) {
  const n = parseFloat(val);
  if (isNaN(n)) return naHtml();
  const stars = Math.round(n / 2);
  const starStr = '★'.repeat(Math.min(stars, 5)) + '☆'.repeat(Math.max(0, 5 - stars));
  return `<span class="rating-stars">${starStr}</span> <span style="color:#888;font-size:0.8rem;">${n.toFixed(1)}/10</span>`;
}

function escHtml(str) {
  const d = document.createElement('div');
  d.textContent = String(str ?? '');
  return d.innerHTML;
}

function resetComparison() {
  clearSelection('left');
  clearSelection('right');
  document.getElementById('comparison-result').style.display = 'none';
  document.getElementById('comparison-result').innerHTML = '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── WIRE UP INPUTS ─────────────────────────────────────────────────────────

function wireInput(side) {
  const inputEl = document.getElementById(`search-${side}`);
  const dropdownEl = document.getElementById(`results-${side}`);

  inputEl.addEventListener('input', () => {
    const query = inputEl.value;
    clearTimeout(side === 'left' ? debounceLeft : debounceRight);
    const timer = setTimeout(() => doSearch(query, side), 180);
    if (side === 'left') debounceLeft = timer;
    else debounceRight = timer;
  });

  inputEl.addEventListener('focus', () => {
    if (inputEl.value.trim().length >= 2) doSearch(inputEl.value, side);
  });

  inputEl.addEventListener('blur', () => {
    setTimeout(() => {
      dropdownEl.classList.remove('open');
    }, 200);
  });

  inputEl.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      dropdownEl.classList.remove('open');
      inputEl.blur();
    }
  });
}

// ── INIT ───────────────────────────────────────────────────────────────────

document.getElementById('compare-btn').addEventListener('click', () => {
  if (selectedLeft && selectedRight) renderComparison(selectedLeft, selectedRight);
});

wireInput('left');
wireInput('right');

await loadData();
