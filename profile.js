import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm';
import { loadAllImageOverrides, normalizeForMatching } from './fragrance-image-override.js';
import { makeCanonicalFragranceId, makeFragranceUrl } from './fragrance-id-utils.js';

const SUPABASE_URL = 'https://moazswfklpvoperkarlk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vYXpzd2ZrbHB2b3BlcmthcmxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3MDc2MTYsImV4cCI6MjA3OTI4MzYxNn0.7_xrCWwV_elxQ0i4bdQ9Hsv-HGB-qz30a__1aeJ4QiM';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUserId = null;
let fragrancesData = [];
let imageOverridesMap = new Map();
let fuse = null;
let currentListType = '';
let isEditMode = false;
let pendingHeaderImage = null;
let pendingProfileImage = null;

const profileData = {
  topFive: [],
  worstFive: [],
  fragrancesHave: [],
  fragrancesWant: [],
  signatureFragrance: null,
  signatureImage: null,
  // DNA
  favNotes: [],
  disNotes: [],
  favStyles: [],
  avoStyles: [],
  occasions: [],
  preferredStrength: ''
};

// ── PRESETS ────────────────────────────────────────────────────────────────

const PRESETS = {
  favNotes: ['Vanilla', 'Oud', 'Amber', 'Tonka Bean', 'Bergamot', 'Rose', 'Tobacco', 'Leather', 'Musk', 'Saffron', 'Cinnamon', 'Coconut', 'Pineapple', 'Iris', 'Lavender', 'Patchouli'],
  disNotes: ['Cumin', 'Animalic Musk', 'Vetiver', 'Aldehydes', 'Rubber', 'Metallic', 'Dirty Musk'],
  favStyles: ['Sweet', 'Fresh', 'Woody', 'Spicy', 'Gourmand', 'Clean', 'Powdery', 'Smoky', 'Aquatic', 'Citrus', 'Floral', 'Dark', 'Loud', 'Smooth', 'Niche', 'Designer'],
  avoStyles: ['Soapy', 'Fresh Aquatic', 'Powdery', 'Floral', 'Green'],
  occasions: ['Everyday', 'School', 'Office', 'Gym', 'Date Night', 'Clubbing', 'Formal', 'Summer', 'Winter', 'Night Out', 'Casual']
};

// ── INIT ───────────────────────────────────────────────────────────────────

async function loadFragrancesData() {
  try {
    const [resp, overrides] = await Promise.all([
      fetch('fragrances_merged.json'),
      loadAllImageOverrides()
    ]);
    fragrancesData = await resp.json();
    imageOverridesMap = overrides;

    fuse = new Fuse(fragrancesData, {
      keys: [{ name: 'name', weight: 0.7 }, { name: 'brand', weight: 0.3 }],
      threshold: 0.4,
      ignoreLocation: true,
      minMatchCharLength: 2,
      shouldSort: true
    });
  } catch {
    fragrancesData = [];
    imageOverridesMap = new Map();
  }
}

function unwrapRpcRow(data) {
  if (Array.isArray(data)) return data[0] ?? null;
  return data ?? null;
}

async function checkAuthAndLoadProfile() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { window.location.href = 'login.html'; return; }

  currentUserId = session.user.id;
  const userEmail = session.user.email;

  const { data: userProfile, error } = await supabase
    .from('users')
    .select(
      'username, bio, profile_picture, header_image, signature_fragrance, signature_image, ' +
      'top_five, worst_five, fragrances_have, fragrances_want, ' +
      'favourite_notes, disliked_notes, favourite_styles, avoided_styles, favourite_occasions, preferred_strength, ' +
      'show_scentle_stats, show_follow_stats, show_scent_dna_publicly, show_fragrance_showcase_publicly, ' +
      'show_collections_publicly, show_activity_publicly'
    )
    .eq('id', currentUserId)
    .maybeSingle();

  if (error || !userProfile) {
    showMessage('Error loading profile', 'error');
    return;
  }

  renderProfile(userProfile, userEmail);
  setViewMode();
  await loadCollections();
  await loadThreadHistoryPreview(currentUserId);
  await loadCommentHistoryPreview(currentUserId);
  await loadScentleStats(currentUserId);
  await loadMyFollowUI(currentUserId);
  initPrivacyToggles(userProfile);
  await loadLeaderboardProfile(currentUserId);
  initDnaSection(userProfile);
}

function renderProfile(profile, email) {
  document.getElementById('profileUsername').textContent = profile.username || 'Unknown';
  document.getElementById('profileEmail').textContent = email || '';

  if (profile.header_image) {
    document.getElementById('headerImage').style.backgroundImage = `url('${profile.header_image}')`;
  }
  if (profile.profile_picture) {
    document.getElementById('profilePicture').style.backgroundImage = `url('${profile.profile_picture}')`;
  }

  document.getElementById('profileBio').value = profile.bio || '';

  profileData.signatureFragrance = profile.signature_fragrance || null;
  profileData.signatureImage = profile.signature_image || null;
  profileData.topFive = safeArray(profile.top_five);
  profileData.worstFive = safeArray(profile.worst_five);
  profileData.fragrancesHave = safeArray(profile.fragrances_have);
  profileData.fragrancesWant = safeArray(profile.fragrances_want);

  renderSignatureFragrance();
  renderList('topFiveList', profileData.topFive, true);
  renderList('worstFiveList', profileData.worstFive, true);
  renderList('fragrancesHaveList', profileData.fragrancesHave, false);
  renderList('fragrancesWantList', profileData.fragrancesWant, false);
}

// ── DNA SECTION ────────────────────────────────────────────────────────────

function initDnaSection(profile) {
  profileData.favNotes = safeArray(profile.favourite_notes);
  profileData.disNotes = safeArray(profile.disliked_notes);
  profileData.favStyles = safeArray(profile.favourite_styles);
  profileData.avoStyles = safeArray(profile.avoided_styles);
  profileData.occasions = safeArray(profile.favourite_occasions);
  profileData.preferredStrength = profile.preferred_strength || '';

  const fields = ['favNotes', 'disNotes', 'favStyles', 'avoStyles', 'occasions'];
  fields.forEach(field => {
    renderChips(field);
    setupChipInput(field);
    renderPresets(field);
  });

  const strengthEl = document.getElementById('preferredStrength');
  if (strengthEl) strengthEl.value = profileData.preferredStrength || '';
}

function renderChips(field) {
  const area = document.getElementById(`${field}-area`);
  if (!area) return;
  const input = document.getElementById(`${field}-input`);
  // Remove old chips
  area.querySelectorAll('.dna-edit-chip').forEach(c => c.remove());
  // Insert chips before input
  profileData[field].forEach(val => {
    const chip = makeChipEl(field, val);
    area.insertBefore(chip, input);
  });
}

function makeChipEl(field, value) {
  const span = document.createElement('span');
  span.className = 'dna-edit-chip';
  span.innerHTML = `${escapeHtml(value)}<button class="chip-remove" type="button" aria-label="Remove">&#215;</button>`;
  span.querySelector('.chip-remove').addEventListener('click', () => {
    profileData[field] = profileData[field].filter(v => v.toLowerCase() !== value.toLowerCase());
    renderChips(field);
  });
  return span;
}

function setupChipInput(field) {
  const input = document.getElementById(`${field}-input`);
  if (!input) return;

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addChip(field, input.value);
      input.value = '';
    } else if (e.key === 'Backspace' && input.value === '' && profileData[field].length > 0) {
      profileData[field].pop();
      renderChips(field);
    }
  });
}

function addChip(field, raw) {
  const val = raw.trim();
  if (!val) return;
  const dup = profileData[field].some(v => v.toLowerCase() === val.toLowerCase());
  if (!dup) {
    profileData[field].push(val);
    renderChips(field);
  }
}

function renderPresets(field) {
  const presets = PRESETS[field] || [];
  const el = document.getElementById(`${field}-presets`);
  if (!el) return;
  el.innerHTML = presets.map(p =>
    `<button type="button" class="preset-chip" onclick="addPreset('${field}', this)">${escapeHtml(p)}</button>`
  ).join('');
}

window.addPreset = function(field, btn) {
  addChip(field, btn.textContent);
};

// ── RENDER FRAGS ───────────────────────────────────────────────────────────

function renderSignatureFragrance() {
  const container = document.getElementById('signatureContainer');
  if (!profileData.signatureFragrance) {
    container.innerHTML = '<div class="section-content empty">No signature fragrance set yet.</div>';
    return;
  }
  const linkData = getFragranceLinkData(profileData.signatureFragrance);
  const image = linkData.image || profileData.signatureImage || '';

  container.innerHTML = `
    <div class="sig-display">
      ${image ? `<img src="${image}" alt="${escapeHtml(profileData.signatureFragrance)}" class="sig-img" />` : ''}
      <div>
        <div class="sig-name">${escapeHtml(profileData.signatureFragrance)}</div>
      </div>
      ${isEditMode ? `<button class="remove-btn visible" onclick="clearSignature()">Remove</button>` : ''}
    </div>`;
}

window.clearSignature = function() {
  profileData.signatureFragrance = null;
  profileData.signatureImage = null;
  renderSignatureFragrance();
};

function renderList(elementId, items, numbered) {
  const listEl = document.getElementById(elementId);
  if (!listEl) return;

  if (!items || items.length === 0) {
    listEl.innerHTML = '<li class="section-content empty">No fragrances added yet.</li>';
    return;
  }

  listEl.innerHTML = '';
  items.forEach((item, index) => {
    const linkData = getFragranceLinkData(item);
    const image = linkData.image || '';

    const li = document.createElement('li');
    li.className = 'frag-list-item';

    let inner = '';
    if (numbered) inner += `<span class="frag-num">${index + 1}</span>`;

    if (isEditMode) {
      inner += `
        <div class="frag-item-card">
          ${image ? `<img src="${image}" alt="${escapeHtml(String(item))}" class="frag-item-img" />` : ''}
          <div class="frag-item-text">
            <div class="frag-item-name">${escapeHtml(String(item))}</div>
          </div>
          <button class="remove-btn visible" onclick="removeFragrance('${escapeAttr(elementId)}', ${index})">Remove</button>
        </div>`;
    } else {
      inner += `
        <a href="${linkData.url}" class="frag-item-card clickable">
          ${image ? `<img src="${image}" alt="${escapeHtml(String(item))}" class="frag-item-img" />` : ''}
          <div class="frag-item-text">
            <div class="frag-item-name">${escapeHtml(String(item))}</div>
          </div>
        </a>`;
    }

    li.innerHTML = inner;
    listEl.appendChild(li);
  });
}

window.removeFragrance = function(listId, index) {
  if (!isEditMode) return;
  if (listId === 'topFiveList') { profileData.topFive.splice(index, 1); renderList('topFiveList', profileData.topFive, true); }
  else if (listId === 'worstFiveList') { profileData.worstFive.splice(index, 1); renderList('worstFiveList', profileData.worstFive, true); }
  else if (listId === 'fragrancesHaveList') { profileData.fragrancesHave.splice(index, 1); renderList('fragrancesHaveList', profileData.fragrancesHave, false); }
  else if (listId === 'fragrancesWantList') { profileData.fragrancesWant.splice(index, 1); renderList('fragrancesWantList', profileData.fragrancesWant, false); }
};

// ── EDIT / VIEW MODE ───────────────────────────────────────────────────────

function setViewMode() {
  isEditMode = false;
  document.getElementById('profileBio').disabled = true;
  document.getElementById('editBtn').style.display = 'inline-block';
  document.getElementById('saveBtn').classList.remove('visible');
  document.getElementById('headerImage').classList.remove('editable');
  document.getElementById('profilePicture').classList.remove('editable');
  document.querySelectorAll('.add-btn').forEach(b => b.classList.remove('visible'));
  document.querySelectorAll('.remove-btn').forEach(b => b.classList.remove('visible'));
  document.getElementById('privacySettings').style.display = 'none';
  document.getElementById('leaderboardSettings').style.display = 'none';
  // Disable DNA inputs
  document.querySelectorAll('.chip-text-input').forEach(i => i.disabled = true);
  document.querySelectorAll('.chip-remove').forEach(b => b.style.display = 'none');
  document.querySelectorAll('.chip-presets').forEach(p => p.style.display = 'none');
  document.getElementById('preferredStrength').disabled = true;
  // Re-render lists without remove buttons
  renderSignatureFragrance();
  renderList('topFiveList', profileData.topFive, true);
  renderList('worstFiveList', profileData.worstFive, true);
  renderList('fragrancesHaveList', profileData.fragrancesHave, false);
  renderList('fragrancesWantList', profileData.fragrancesWant, false);
}

function setEditMode() {
  isEditMode = true;
  document.getElementById('profileBio').disabled = false;
  document.getElementById('editBtn').style.display = 'none';
  document.getElementById('saveBtn').classList.add('visible');
  document.getElementById('headerImage').classList.add('editable');
  document.getElementById('profilePicture').classList.add('editable');
  document.querySelectorAll('.add-btn').forEach(b => b.classList.add('visible'));
  document.getElementById('privacySettings').style.display = 'block';
  document.getElementById('leaderboardSettings').style.display = 'block';
  // Enable DNA inputs
  document.querySelectorAll('.chip-text-input').forEach(i => i.disabled = false);
  document.querySelectorAll('.chip-remove').forEach(b => b.style.display = '');
  document.querySelectorAll('.chip-presets').forEach(p => p.style.display = 'flex');
  document.getElementById('preferredStrength').disabled = false;
  // Re-render lists with remove buttons
  renderSignatureFragrance();
  renderList('topFiveList', profileData.topFive, true);
  renderList('worstFiveList', profileData.worstFive, true);
  renderList('fragrancesHaveList', profileData.fragrancesHave, false);
  renderList('fragrancesWantList', profileData.fragrancesWant, false);
}

// ── SEARCH OVERLAY ─────────────────────────────────────────────────────────

function openSearchOverlay(listType) {
  currentListType = listType;
  const titles = {
    signature: 'Choose Signature Fragrance',
    topFive: 'Add to Top 5',
    worstFive: 'Add to Worst 5',
    have: 'Add to Have',
    want: 'Add to Want'
  };
  document.getElementById('searchTitle').textContent = titles[listType] || 'Add Fragrance';
  document.getElementById('searchInput').value = '';
  document.getElementById('searchResults').innerHTML = '<div class="no-results">Start typing to search...</div>';
  document.getElementById('searchOverlay').classList.add('active');
  document.body.style.overflow = 'hidden';
  setTimeout(() => document.getElementById('searchInput').focus(), 100);
}

function closeSearchOverlay() {
  document.getElementById('searchOverlay').classList.remove('active');
  document.body.style.overflow = '';
  currentListType = '';
}

function searchFragrances(query) {
  const results_el = document.getElementById('searchResults');
  if (!query || query.trim().length < 2) {
    results_el.innerHTML = '<div class="no-results">Start typing to search...</div>';
    return;
  }
  if (!fuse) { results_el.innerHTML = '<div class="no-results">Loading...</div>'; return; }

  const results = fuse.search(query.trim()).map(r => r.item).slice(0, 50);
  if (!results.length) { results_el.innerHTML = '<div class="no-results">No results found.</div>'; return; }

  results_el.innerHTML = '';
  results.forEach(f => {
    const el = document.createElement('div');
    el.className = 'search-result-item';
    el.innerHTML = `<div class="search-result-name">${escapeHtml(f.name || 'Unknown')}</div><div class="search-result-brand">${escapeHtml(f.brand || '')}</div>`;
    el.addEventListener('click', () => selectFragrance(f));
    results_el.appendChild(el);
  });
}

function selectFragrance(fragrance) {
  const name = `${fragrance.brand} - ${fragrance.name}`;
  if (currentListType === 'signature') {
    profileData.signatureFragrance = name;
    const d = getFragranceData(name);
    profileData.signatureImage = d?.image || fragrance.image || null;
    renderSignatureFragrance();
  } else if (currentListType === 'topFive') {
    if (profileData.topFive.length >= 5) { showMessage('Top 5 is full.', 'error'); return; }
    if (!profileData.topFive.includes(name)) { profileData.topFive.push(name); renderList('topFiveList', profileData.topFive, true); }
  } else if (currentListType === 'worstFive') {
    if (profileData.worstFive.length >= 5) { showMessage('Worst 5 is full.', 'error'); return; }
    if (!profileData.worstFive.includes(name)) { profileData.worstFive.push(name); renderList('worstFiveList', profileData.worstFive, true); }
  } else if (currentListType === 'have') {
    if (!profileData.fragrancesHave.includes(name)) { profileData.fragrancesHave.push(name); renderList('fragrancesHaveList', profileData.fragrancesHave, false); }
  } else if (currentListType === 'want') {
    if (!profileData.fragrancesWant.includes(name)) { profileData.fragrancesWant.push(name); renderList('fragrancesWantList', profileData.fragrancesWant, false); }
  }
  closeSearchOverlay();
}

// ── SAVE ───────────────────────────────────────────────────────────────────

async function saveChanges() {
  const saveBtn = document.getElementById('saveBtn');
  saveBtn.classList.add('loading');
  saveBtn.textContent = 'Saving...';

  const bio = document.getElementById('profileBio').value.trim();

  const updates = {
    bio: bio || null,
    signature_fragrance: profileData.signatureFragrance || null,
    signature_image: profileData.signatureImage || null,
    top_five: profileData.topFive,
    worst_five: profileData.worstFive,
    fragrances_have: profileData.fragrancesHave,
    fragrances_want: profileData.fragrancesWant,
    favourite_notes: profileData.favNotes,
    disliked_notes: profileData.disNotes,
    favourite_styles: profileData.favStyles,
    avoided_styles: profileData.avoStyles,
    favourite_occasions: profileData.occasions,
    preferred_strength: document.getElementById('preferredStrength').value || null
  };

  if (pendingHeaderImage) {
    const url = await uploadImageToSupabase(pendingHeaderImage, 'headers');
    if (url) { updates.header_image = url; document.getElementById('headerImage').style.backgroundImage = `url('${url}')`; }
    pendingHeaderImage = null;
  }

  if (pendingProfileImage) {
    const url = await uploadImageToSupabase(pendingProfileImage, 'avatars');
    if (url) { updates.profile_picture = url; document.getElementById('profilePicture').style.backgroundImage = `url('${url}')`; }
    pendingProfileImage = null;
  }

  try {
    const { error } = await supabase.from('users').update(updates).eq('id', currentUserId);
    if (error) throw error;

    await saveLeaderboardProfile();

    saveBtn.classList.remove('loading');
    saveBtn.textContent = 'Save Changes';
    showMessage('Profile updated successfully!', 'success');
    setViewMode();
  } catch (err) {
    console.error('Error saving:', err);
    saveBtn.classList.remove('loading');
    saveBtn.textContent = 'Save Changes';
    showMessage('Failed to save changes. Please try again.', 'error');
  }
}

async function uploadImageToSupabase(file, folder) {
  const ext = file.name.split('.').pop();
  const path = `${folder}/${currentUserId}.${ext}`;
  const { error } = await supabase.storage.from('profile_media').upload(path, file, { upsert: true });
  if (error) { console.error('Upload error:', error); return null; }
  const { data: { publicUrl } } = supabase.storage.from('profile_media').getPublicUrl(path);
  return publicUrl;
}

// ── PRIVACY TOGGLES ────────────────────────────────────────────────────────

function initPrivacyToggles(profile) {
  const toggleMap = {
    showScentleStatsToggle: { field: 'show_scentle_stats', default: true },
    showFollowStatsToggle: { field: 'show_follow_stats', default: true },
    showScentDnaToggle: { field: 'show_scent_dna_publicly', default: true },
    showShowcaseToggle: { field: 'show_fragrance_showcase_publicly', default: true },
    showCollectionsToggle: { field: 'show_collections_publicly', default: true },
    showActivityToggle: { field: 'show_activity_publicly', default: true }
  };

  Object.entries(toggleMap).forEach(([elId, { field, default: def }]) => {
    const el = document.getElementById(elId);
    if (!el) return;
    el.checked = profile[field] !== false;
    el.addEventListener('change', async e => {
      try {
        const { error } = await supabase.from('users').update({ [field]: e.target.checked }).eq('id', currentUserId);
        if (error) { e.target.checked = !e.target.checked; showMessage('Failed to update setting', 'error'); }
      } catch { e.target.checked = !e.target.checked; }
    });
  });
}

// ── LEADERBOARD SETTINGS ───────────────────────────────────────────────────

async function loadLeaderboardProfile(userId) {
  try {
    const { data } = await supabase.from('leaderboard_profiles').select('*').eq('user_id', userId).maybeSingle();
    if (data) {
      document.getElementById('leaderboardMessage').value = data.public_message || '';
      document.getElementById('showMessagePublicly').checked = data.show_message_publicly || false;
      document.getElementById('instagramHandle').value = data.instagram_handle || '';
      document.getElementById('tiktokHandle').value = data.tiktok_handle || '';
      document.getElementById('twitterHandle').value = data.twitter_handle || '';
      document.getElementById('facebookHandle').value = data.facebook_handle || '';
      document.getElementById('showSocialsPublicly').checked = data.show_socials_publicly || false;
    }
  } catch (err) {
    console.error('Error loading leaderboard profile:', err);
  }
}

async function saveLeaderboardProfile() {
  const data = {
    user_id: currentUserId,
    public_message: document.getElementById('leaderboardMessage').value.trim() || null,
    show_message_publicly: document.getElementById('showMessagePublicly').checked,
    instagram_handle: document.getElementById('instagramHandle').value.trim() || null,
    tiktok_handle: document.getElementById('tiktokHandle').value.trim() || null,
    twitter_handle: document.getElementById('twitterHandle').value.trim() || null,
    facebook_handle: document.getElementById('facebookHandle').value.trim() || null,
    show_socials_publicly: document.getElementById('showSocialsPublicly').checked,
    updated_at: new Date().toISOString()
  };
  const { error } = await supabase.from('leaderboard_profiles').upsert(data, { onConflict: 'user_id' });
  if (error) { console.error('Error saving leaderboard profile:', error); throw error; }
}

// ── COLLECTIONS ────────────────────────────────────────────────────────────

async function loadCollections() {
  try {
    const { data: collections, error } = await supabase
      .from('collections')
      .select('id, name, description, created_at')
      .eq('user_id', currentUserId)
      .order('created_at', { ascending: false });

    if (error || !collections || collections.length === 0) {
      renderCollections([]);
      return;
    }

    const withCounts = await Promise.all(collections.map(async col => {
      const { count } = await supabase.from('collection_items')
        .select('*', { count: 'exact', head: true })
        .eq('collection_id', col.id);
      return { ...col, itemCount: count || 0 };
    }));

    renderCollections(withCounts);
  } catch (err) {
    console.error('Error loading collections:', err);
  }
}

function renderCollections(collections) {
  const container = document.getElementById('collectionsContainer');
  if (!container) return;

  if (!collections || collections.length === 0) {
    container.innerHTML = '<div class="section-content empty">No collections yet.</div>';
    return;
  }

  container.innerHTML = collections.map(col => {
    const desc = col.description ? `<div class="collection-card-desc">${escapeHtml(col.description)}</div>` : '';
    return `
      <div class="collection-card" onclick="window.location.href='collection.html?id=${col.id}'">
        <div class="collection-card-name">${escapeHtml(col.name)}</div>
        ${desc}
        <div class="collection-card-count">${col.itemCount} ${col.itemCount === 1 ? 'fragrance' : 'fragrances'}</div>
      </div>`;
  }).join('');
}

// ── ACTIVITY PREVIEWS ──────────────────────────────────────────────────────

async function loadThreadHistoryPreview(userId) {
  const container = document.getElementById('threadHistoryPreview');
  try {
    const { data: threads, error } = await supabase
      .from('forum_threads')
      .select('id, title, created_at')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(3);

    if (error || !threads || threads.length === 0) {
      container.innerHTML = '<div class="section-content empty">No threads yet.</div>';
      return;
    }

    container.innerHTML = threads.map(t => `
      <div class="activity-item">
        <a href="forum_thread.html?id=${t.id}" class="activity-item-title">${escapeHtml(t.title)}</a>
        <div class="activity-item-date">${new Date(t.created_at).toLocaleDateString()}</div>
      </div>`).join('') +
      `<a href="user_threads.html?user_id=${userId}" class="view-all-link">View all threads →</a>`;
  } catch {
    container.innerHTML = '<div class="section-content empty">History unavailable.</div>';
  }
}

async function loadCommentHistoryPreview(userId) {
  const container = document.getElementById('commentHistoryPreview');
  try {
    const { data: comments, error } = await supabase
      .from('comments')
      .select('id, comment, fragrance_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(3);

    if (error || !comments || comments.length === 0) {
      container.innerHTML = '<div class="section-content empty">No comments yet.</div>';
      return;
    }

    container.innerHTML = comments.map(c => {
      const linkData = getFragranceLinkData(c.fragrance_id);
      const snippet = (c.comment || '').substring(0, 100);
      return `
        <div class="activity-item">
          <a href="${linkData.url}" class="activity-item-title">Comment on ${escapeHtml(linkData.label || c.fragrance_id || '')}</a>
          <div class="activity-item-snippet">${escapeHtml(snippet)}${(c.comment || '').length > 100 ? '...' : ''}</div>
          <div class="activity-item-date">${new Date(c.created_at).toLocaleDateString()}</div>
        </div>`;
    }).join('') +
      `<a href="user_comments.html?user_id=${userId}" class="view-all-link">View all comments →</a>`;
  } catch {
    container.innerHTML = '<div class="section-content empty">History unavailable.</div>';
  }
}

async function loadScentleStats(userId) {
  try {
    const { data: stats, error } = await supabase
      .from('user_scentle_stats')
      .select('scentle_played, scentle_avg_guesses')
      .eq('user_id', userId)
      .maybeSingle();

    const section = document.getElementById('scentleStatsSection');
    const content = document.getElementById('scentleStatsContent');

    if (error || !stats || stats.scentle_played === 0) { section.style.display = 'none'; return; }

    section.style.display = 'block';
    content.innerHTML = `
      <div class="stats-compact-grid">
        <div class="stat-box">
          <div class="stat-box-value">${stats.scentle_played}</div>
          <div class="stat-box-label">Scentle Played</div>
        </div>
        <div class="stat-box">
          <div class="stat-box-value">${Number(stats.scentle_avg_guesses).toFixed(1)}</div>
          <div class="stat-box-label">Avg Guesses</div>
        </div>
      </div>`;
  } catch {
    document.getElementById('scentleStatsSection').style.display = 'none';
  }
}

// ── FOLLOW UI ──────────────────────────────────────────────────────────────

async function loadMyFollowUI(userId) {
  try {
    const { data, error } = await supabase.rpc('get_follow_counts', { target_user_id: userId });
    const counts = unwrapRpcRow(data);
    if (!error && counts) {
      document.getElementById('followersCount').textContent = Number(counts.followers_count || 0);
      document.getElementById('followingCount').textContent = Number(counts.following_count || 0);
    }
  } catch {}

  document.getElementById('followersBtn').addEventListener('click', () => openMyFollowModal('followers'));
  document.getElementById('followingBtn').addEventListener('click', () => openMyFollowModal('following'));
}

async function refreshMyFollowCounts() {
  try {
    const { data } = await supabase.rpc('get_follow_counts', { target_user_id: currentUserId });
    const counts = unwrapRpcRow(data);
    if (counts) {
      document.getElementById('followersCount').textContent = Number(counts.followers_count || 0);
      document.getElementById('followingCount').textContent = Number(counts.following_count || 0);
    }
  } catch {}
}

let currentModalOffset = 0;
let currentModalListType = '';

async function openMyFollowModal(listType) {
  currentModalListType = listType;
  currentModalOffset = 0;
  document.getElementById('followModalTitle').textContent = listType === 'followers' ? 'Followers' : 'Following';
  document.getElementById('followModalList').innerHTML = '';
  document.getElementById('followModalEmpty').style.display = 'none';
  document.getElementById('followModalLoadMore').style.display = 'none';
  document.getElementById('followModal').classList.add('active');
  await loadMyFollowList();
}

async function loadMyFollowList() {
  const listEl = document.getElementById('followModalList');
  const emptyEl = document.getElementById('followModalEmpty');
  const loadMoreBtn = document.getElementById('followModalLoadMore');

  try {
    const { data: users, error } = await supabase.rpc('get_follow_list', {
      target_user_id: currentUserId,
      list_type: currentModalListType,
      page_limit: 50,
      page_offset: currentModalOffset
    });

    if (error || !users || users.length === 0) {
      if (currentModalOffset === 0) {
        emptyEl.textContent = currentModalListType === 'followers' ? 'No followers yet.' : 'Not following anyone yet.';
        emptyEl.style.display = 'block';
      }
      loadMoreBtn.style.display = 'none';
      return;
    }

    emptyEl.style.display = 'none';
    users.forEach(user => {
      const avatar = user.profile_picture ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username || 'User')}&size=96&background=D5A856&color=000`;
      listEl.insertAdjacentHTML('beforeend', `
        <div class="follow-user-item">
          <img src="${avatar}" alt="${escapeHtml(user.username)}" class="follow-user-avatar" />
          <div class="follow-user-info">
            <a href="public_profile.html?user_id=${user.id}" class="follow-user-name">${escapeHtml(user.username)}</a>
          </div>
        </div>`);
    });

    loadMoreBtn.style.display = users.length === 50 ? 'block' : 'none';
  } catch (err) {
    console.error('Error loading follow list:', err);
  }
}

function closeMyFollowModal() {
  document.getElementById('followModal').classList.remove('active');
  refreshMyFollowCounts();
}

document.getElementById('followModalClose').addEventListener('click', closeMyFollowModal);
document.getElementById('followModal').addEventListener('click', e => { if (e.target.id === 'followModal') closeMyFollowModal(); });
document.getElementById('followModalLoadMore').addEventListener('click', async () => {
  const btn = document.getElementById('followModalLoadMore');
  btn.disabled = true; btn.textContent = 'Loading...';
  currentModalOffset += 50;
  await loadMyFollowList();
  btn.disabled = false; btn.textContent = 'Load More';
});

// ── EVENT LISTENERS ────────────────────────────────────────────────────────

document.getElementById('editBtn').addEventListener('click', setEditMode);

document.getElementById('headerImage').addEventListener('click', () => {
  if (!isEditMode) return;
  document.getElementById('headerImageInput').click();
});

document.getElementById('profilePicture').addEventListener('click', () => {
  if (!isEditMode) return;
  document.getElementById('profilePictureInput').click();
});

document.getElementById('headerImageInput').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  pendingHeaderImage = file;
  const reader = new FileReader();
  reader.onload = ev => { document.getElementById('headerImage').style.backgroundImage = `url('${ev.target.result}')`; };
  reader.readAsDataURL(file);
});

document.getElementById('profilePictureInput').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  pendingProfileImage = file;
  const reader = new FileReader();
  reader.onload = ev => { document.getElementById('profilePicture').style.backgroundImage = `url('${ev.target.result}')`; };
  reader.readAsDataURL(file);
});

document.getElementById('addSignatureBtn').addEventListener('click', () => { if (isEditMode) openSearchOverlay('signature'); });
document.getElementById('addTopFiveBtn').addEventListener('click', () => { if (!isEditMode) return; if (profileData.topFive.length >= 5) { showMessage('Top 5 is full.', 'error'); return; } openSearchOverlay('topFive'); });
document.getElementById('addWorstFiveBtn').addEventListener('click', () => { if (!isEditMode) return; if (profileData.worstFive.length >= 5) { showMessage('Worst 5 is full.', 'error'); return; } openSearchOverlay('worstFive'); });
document.getElementById('addHaveBtn').addEventListener('click', () => { if (isEditMode) openSearchOverlay('have'); });
document.getElementById('addWantBtn').addEventListener('click', () => { if (isEditMode) openSearchOverlay('want'); });

document.getElementById('closeOverlayBtn').addEventListener('click', closeSearchOverlay);
document.getElementById('searchOverlay').addEventListener('click', e => { if (e.target.id === 'searchOverlay') closeSearchOverlay(); });
document.getElementById('searchInput').addEventListener('input', e => searchFragrances(e.target.value));
document.getElementById('saveBtn').addEventListener('click', saveChanges);

document.getElementById('logoutBtn').addEventListener('click', async () => {
  const btn = document.getElementById('logoutBtn');
  btn.classList.add('loading'); btn.textContent = 'Logging out...';
  const { error } = await supabase.auth.signOut();
  if (error) { btn.classList.remove('loading'); btn.textContent = 'Logout'; showMessage('Logout failed.', 'error'); }
  else window.location.href = 'login.html';
});

// ── HELPERS ────────────────────────────────────────────────────────────────

function safeArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { const p = JSON.parse(val); return Array.isArray(p) ? p : []; } catch { return []; }
}

function getFragranceData(fragranceName) {
  if (!fragranceName) return null;
  const parts = String(fragranceName).split(' - ');
  if (parts.length < 2) return null;
  const brandRaw = parts[0].trim();
  const nameRaw = parts.slice(1).join(' - ').trim();
  const norm = v => String(v || '').trim().toLowerCase().replace(/\s+/g, ' ').replace(/[^\w\s&'-]/g, '');
  const fragrance = fragrancesData.find(f => norm(f.brand) === norm(brandRaw) && norm(f.name) === norm(nameRaw));
  const overrideKey = `${normalizeForMatching(brandRaw)}::${normalizeForMatching(nameRaw)}`;
  const overrideImage = imageOverridesMap.get(overrideKey);
  if (fragrance) return { ...fragrance, image: overrideImage || fragrance.image || '' };
  if (overrideImage) return { brand: brandRaw, name: nameRaw, image: overrideImage };
  return null;
}

function getFragranceLinkData(value) {
  if (!value) return { url: 'fragrance.html', label: '', image: '' };
  const displayMatch = getFragranceData(String(value));
  if (displayMatch?.brand && displayMatch?.name) {
    return { url: makeFragranceUrl(displayMatch.brand, displayMatch.name), label: `${displayMatch.brand} - ${displayMatch.name}`, image: displayMatch.image || '' };
  }
  const canonicalMatch = fragrancesData.find(f => makeCanonicalFragranceId(f.brand, f.name) === String(value).trim().toLowerCase());
  if (canonicalMatch) {
    return { url: makeFragranceUrl(canonicalMatch.brand, canonicalMatch.name), label: `${canonicalMatch.brand} - ${canonicalMatch.name}`, image: canonicalMatch.image || '' };
  }
  return { url: 'fragrance.html', label: String(value), image: '' };
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = String(text ?? '');
  return div.innerHTML;
}

function escapeAttr(text) {
  return String(text).replace(/'/g, "\\'");
}

function showMessage(text, type) {
  const el = document.getElementById('messageContainer');
  el.textContent = text;
  el.className = `message ${type} visible`;
  setTimeout(() => el.classList.remove('visible'), 5000);
}

// ── START ──────────────────────────────────────────────────────────────────
await loadFragrancesData();
await checkAuthAndLoadProfile();
