import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm';
import { loadAllImageOverrides, normalizeForMatching } from './fragrance-image-override.js';
import { makeCanonicalFragranceId, makeFragranceUrl } from './fragrance-id-utils.js';

const SUPABASE_URL = 'https://moazswfklpvoperkarlk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vYXpzd2ZrbHB2b3BlcmthcmxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3MDc2MTYsImV4cCI6MjA3OTI4MzYxNn0.7_xrCWwV_elxQ0i4bdQ9Hsv-HGB-qz30a__1aeJ4QiM';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// NOTE: MaxParfum uses ONE canonical fragrance ID system (fragrance-id-utils.js).
// DO NOT create alternative ID generators. Always use makeCanonicalFragranceId().

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
  fragrancesHave: [],
  fragrancesWant: [],
  signatureFragrance: null,
  signatureImage: null
};

async function loadFragrancesData() {
  try {
    const [fragrancesResponse, overridesMap] = await Promise.all([
      fetch('fragrances_merged.json'),
      loadAllImageOverrides()
    ]);

    fragrancesData = await fragrancesResponse.json();
    imageOverridesMap = overridesMap;

    const fuseOptions = {
      keys: [
        { name: 'name', weight: 0.7 },
        { name: 'brand', weight: 0.3 }
      ],
      threshold: 0.4,
      ignoreLocation: true,
      minMatchCharLength: 2,
      shouldSort: true
    };

    fuse = new Fuse(fragrancesData, fuseOptions);
  } catch (error) {
    console.error('Error loading fragrances data:', error);
    fragrancesData = [];
    imageOverridesMap = new Map();
  }
}

function unwrapRpcRow(data) {
  // Supabase RPC often returns an array (even for a single-row result)
  if (Array.isArray(data)) return data[0] ?? null;
  return data ?? null;
}

function getFragranceData(fragranceName) {
  if (!fragranceName) return null;

  const parts = fragranceName.split(' - ');
  if (parts.length < 2) return null;

  const brandRaw = parts[0].trim();
  const nameRaw = parts.slice(1).join(' - ').trim();

  const normalizeText = (value) =>
    String(value || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s&'-]/g, '');

  const brand = normalizeText(brandRaw);
  const name = normalizeText(nameRaw);

  const fragrance = fragrancesData.find(f =>
    normalizeText(f.brand) === brand &&
    normalizeText(f.name) === name
  );

  const overrideKey = `${normalizeForMatching(brandRaw)}::${normalizeForMatching(nameRaw)}`;
  const overrideImage = imageOverridesMap.get(overrideKey);

  if (fragrance) {
    return {
      ...fragrance,
      image: overrideImage || fragrance.image || ''
    };
  }

  if (overrideImage) {
    return {
      brand: brandRaw,
      name: nameRaw,
      image: overrideImage
    };
  }

  return null;
}
function getFragranceLinkData(value) {
  if (!value) {
    return {
      url: 'fragrance.html',
      label: '',
      image: ''
    };
  }

  const displayMatch = getFragranceData(value);
  if (displayMatch?.brand && displayMatch?.name) {
    return {
      url: makeFragranceUrl(displayMatch.brand, displayMatch.name),
      label: `${displayMatch.brand} - ${displayMatch.name}`,
      image: displayMatch.image || ''
    };
  }

  const canonicalMatch = fragrancesData.find(
    (f) => makeCanonicalFragranceId(f.brand, f.name) === String(value).trim().toLowerCase()
  );

  if (canonicalMatch) {
    return {
      url: makeFragranceUrl(canonicalMatch.brand, canonicalMatch.name),
      label: `${canonicalMatch.brand} - ${canonicalMatch.name}`,
      image: canonicalMatch.image || ''
    };
  }

  return {
    url: 'fragrance.html',
    label: String(value),
    image: ''
  };
}
// Removed: slugify() - Use makeCanonicalFragranceId() instead

function getUserAvatarUrl(user) {
  if (user.profile_picture) {
    return user.profile_picture;
  }
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username || 'User')}&size=64&background=D5A856&color=000`;
}

function renderUserLink(user, showAvatar = true) {
  const avatarUrl = getUserAvatarUrl(user);
  const avatarHtml = showAvatar ? `<img src="${avatarUrl}" alt="${user.username}" class="user-avatar" />` : '';

  return `
    <a href="public_profile.html?user_id=${user.id}" class="user-link">
      ${avatarHtml}
      <span class="user-username">${user.username}</span>
    </a>
  `;
}

async function loadThreadHistoryPreview(userId) {
  try {
    const { data: threads, error } = await supabase
      .from('forum_threads')
      .select('id, title, created_at')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error loading thread history:', error);
      document.getElementById('threadHistoryPreview').innerHTML = '<div class="section-content empty">History unavailable</div>';
      return;
    }

    const container = document.getElementById('threadHistoryPreview');

    if (!threads || threads.length === 0) {
      container.innerHTML = '<div class="section-content empty">No threads yet</div>';
      return;
    }

    const thread = threads[0];
    const { data: firstPost } = await supabase
      .from('forum_posts')
      .select('body')
      .eq('thread_id', thread.id)
      .is('parent_post_id', null)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    const snippet = firstPost?.body ? firstPost.body.substring(0, 120) + '...' : '';
    const date = new Date(thread.created_at).toLocaleDateString();

    container.innerHTML = `
      <div class="history-preview-item">
        <a href="forum_thread.html?id=${thread.id}" class="history-preview-title">${thread.title}</a>
        <div class="history-preview-snippet">${snippet}</div>
        <div class="history-preview-date">${date}</div>
      </div>
      <a href="user_threads.html?user_id=${userId}" class="view-all-link">View all threads →</a>
    `;

  } catch (err) {
    console.error('Unexpected error loading thread history:', err);
    document.getElementById('threadHistoryPreview').innerHTML = '<div class="section-content empty">History unavailable</div>';
  }
}

async function loadCommentHistoryPreview(userId) {
  try {
    const { data: comments, error } = await supabase
      .from('comments')
      .select('id, comment, fragrance_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error loading comment history:', error);
      document.getElementById('commentHistoryPreview').innerHTML =
        '<div class="section-content empty">History unavailable</div>';
      return;
    }

    const container = document.getElementById('commentHistoryPreview');

    if (!comments || comments.length === 0) {
      container.innerHTML = '<div class="section-content empty">No comments yet</div>';
      return;
    }

    const row = comments[0];
const text = row.comment || '';
const snippet = text.substring(0, 140) + (text.length > 140 ? '...' : '');
const date = new Date(row.created_at).toLocaleDateString();
const fragranceLink = getFragranceLinkData(row.fragrance_id);

container.innerHTML = `
  <div class="history-preview-item">
    <a href="${fragranceLink.url}" class="history-preview-title">
      Comment on ${fragranceLink.label || row.fragrance_id}
    </a>
    <div class="history-preview-snippet">${snippet}</div>
    <div class="history-preview-date">${date}</div>
  </div>
  <a href="user_comments.html?user_id=${userId}" class="view-all-link">View all comments →</a>
`;
  } catch (err) {
    console.error('Unexpected error loading comment history:', err);
    document.getElementById('commentHistoryPreview').innerHTML =
      '<div class="section-content empty">History unavailable</div>';
  }
}


async function checkAuthAndLoadProfile() {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    window.location.href = 'login.html';
    return;
  }

  currentUserId = session.user.id;
  const userEmail = session.user.email;

  const { data: userProfile, error } = await supabase
    .from('users')
    .select('username, bio, profile_picture, header_image, signature_fragrance, signature_image, top_five, fragrances_have, fragrances_want, show_scentle_stats, show_follow_stats')
    .eq('id', currentUserId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching user profile:', error);
    showMessage('Error loading profile', 'error');
    return;
  }

  if (!userProfile) {
    console.error('No profile found for user');
    showMessage('No profile found', 'error');
    return;
  }

  renderProfile(userProfile, userEmail);
  setViewMode();
  await loadCollections();
  await loadThreadHistoryPreview(currentUserId);
  await loadCommentHistoryPreview(currentUserId);
  await loadScentleStats(currentUserId);
  await loadMyFollowUI(currentUserId);
  initPrivacyToggles(userProfile.show_scentle_stats, userProfile.show_follow_stats);
  await loadLeaderboardProfile(currentUserId);
}

function renderProfile(profile, email) {
  document.getElementById('profileUsername').textContent = profile.username || 'Unknown User';
  document.getElementById('profileEmail').textContent = email;

  const headerImage = document.getElementById('headerImage');
  if (profile.header_image) {
    headerImage.style.backgroundImage = `url('${profile.header_image}')`;
  }

  const profilePicture = document.getElementById('profilePicture');
  if (profile.profile_picture) {
    profilePicture.style.backgroundImage = `url('${profile.profile_picture}')`;
  }

  document.getElementById('profileBio').value = profile.bio || '';

  profileData.signatureFragrance = profile.signature_fragrance || null;
  profileData.signatureImage = profile.signature_image || null;
  profileData.topFive = profile.top_five || [];
  profileData.fragrancesHave = profile.fragrances_have || [];
  profileData.fragrancesWant = profile.fragrances_want || [];

  renderSignatureFragrance();
  renderList('topFiveList', profileData.topFive);
  renderList('fragrancesHaveList', profileData.fragrancesHave);
  renderList('fragrancesWantList', profileData.fragrancesWant);
}

function renderSignatureFragrance() {
  const container = document.getElementById('signatureContainer');

  if (!profileData.signatureFragrance) {
    container.innerHTML = '<div class="section-content empty">No signature fragrance set yet.</div>';
    return;
  }

  const fragranceData = getFragranceData(profileData.signatureFragrance);
  const image = (fragranceData && fragranceData.image) || profileData.signatureImage || '';

  container.innerHTML = `
    <div class="signature-display">
      ${image ? `<img src="${image}" alt="Signature fragrance" class="signature-image" />` : ''}
      <div class="signature-info">
        <div class="signature-name">${profileData.signatureFragrance}</div>
      </div>
    </div>
  `;
}

function setViewMode() {
  isEditMode = false;

  const bioInput = document.getElementById('profileBio');
  bioInput.disabled = true;

  document.getElementById('editBtn').style.display = 'inline-block';
  document.getElementById('saveBtn').classList.remove('visible');

  document.getElementById('headerImage').classList.remove('editable');
  document.getElementById('profilePicture').classList.remove('editable');

  document.querySelectorAll('.add-btn').forEach(btn => btn.classList.remove('visible'));
  document.querySelectorAll('.remove-btn').forEach(btn => btn.classList.remove('visible'));

  document.getElementById('privacySettings').style.display = 'none';
  document.getElementById('leaderboardSettings').style.display = 'none';
}

function setEditMode() {
  isEditMode = true;

  const bioInput = document.getElementById('profileBio');
  bioInput.disabled = false;

  document.getElementById('editBtn').style.display = 'none';
  document.getElementById('saveBtn').classList.add('visible');

  document.getElementById('headerImage').classList.add('editable');
  document.getElementById('profilePicture').classList.add('editable');

  document.querySelectorAll('.add-btn').forEach(btn => btn.classList.add('visible'));
  document.querySelectorAll('.remove-btn').forEach(btn => btn.classList.add('visible'));

  document.getElementById('privacySettings').style.display = 'block';
  document.getElementById('leaderboardSettings').style.display = 'block';
}

function renderList(elementId, items) {
  const listElement = document.getElementById(elementId);

  if (!items || items.length === 0) {
    listElement.innerHTML = '<li class="empty" style="color: #888; font-style: italic;">No fragrances added yet.</li>';
    return;
  }

  const isTopFive = elementId === 'topFiveList';

  listElement.innerHTML = '';
  items.forEach((item, index) => {
    const li = document.createElement('li');

    const fragranceLink = getFragranceLinkData(item);
const image = fragranceLink.image || '';
const fragranceUrl = fragranceLink.url;
    const wrapper = document.createElement('div');
    wrapper.className = 'fragrance-list-item-wrapper';

    if (isTopFive) {
      const numberDiv = document.createElement('div');
      numberDiv.className = 'fragrance-number';
      numberDiv.textContent = `${index + 1}.`;
      wrapper.appendChild(numberDiv);
    }

    const card = document.createElement('div');
    card.className = 'fragrance-card';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'fragrance-item-content';

    if (image) {
      const img = document.createElement('img');
      img.src = image;
      img.alt = item;
      img.className = 'fragrance-image';
      contentDiv.appendChild(img);
    }

    const textDiv = document.createElement('div');
    textDiv.className = 'fragrance-text';
    textDiv.textContent = item;
    contentDiv.appendChild(textDiv);

    if (!isEditMode) {
      const link = document.createElement('a');
      link.href = fragranceUrl;
      link.className = 'fragrance-link';
      link.appendChild(contentDiv);
      card.appendChild(link);
      card.classList.add('clickable');
    } else {
      card.appendChild(contentDiv);
    }

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    if (isEditMode) {
      removeBtn.classList.add('visible');
    }
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      removeFragrance(elementId, index);
    });

    card.appendChild(removeBtn);
    wrapper.appendChild(card);
    li.appendChild(wrapper);
    listElement.appendChild(li);
  });
}

function removeFragrance(listId, index) {
  if (!isEditMode) return;

  if (listId === 'topFiveList') {
    profileData.topFive.splice(index, 1);
    renderList('topFiveList', profileData.topFive);
  } else if (listId === 'fragrancesHaveList') {
    profileData.fragrancesHave.splice(index, 1);
    renderList('fragrancesHaveList', profileData.fragrancesHave);
  } else if (listId === 'fragrancesWantList') {
    profileData.fragrancesWant.splice(index, 1);
    renderList('fragrancesWantList', profileData.fragrancesWant);
  }
}

function openSearchOverlay(listType) {
  currentListType = listType;

  const titles = {
    'topFive': 'Add to Top 5 Fragrances',
    'have': 'Add to Fragrances I Have',
    'want': 'Add to Fragrances I Want',
    'signature': 'Choose Signature Fragrance'
  };

  document.getElementById('searchTitle').textContent = titles[listType];
  document.getElementById('searchInput').value = '';
  document.getElementById('searchResults').innerHTML = '<div class="no-results">Start typing to search fragrances...</div>';
  document.getElementById('searchOverlay').classList.add('active');
  document.body.style.overflow = 'hidden';

  setTimeout(() => {
    document.getElementById('searchInput').focus();
  }, 100);
}

function closeSearchOverlay() {
  document.getElementById('searchOverlay').classList.remove('active');
  document.body.style.overflow = '';
  currentListType = '';
}

function searchFragrances(query) {
  if (!query || query.trim().length < 2) {
    document.getElementById('searchResults').innerHTML = '<div class="no-results">Start typing to search fragrances...</div>';
    return;
  }

  if (!fuse) {
    document.getElementById('searchResults').innerHTML = '<div class="no-results">Loading fragrances...</div>';
    return;
  }

  const searchTerm = query.trim();
  const fuseResults = fuse.search(searchTerm);
  const results = fuseResults.map(result => result.item).slice(0, 50);

  const searchResultsContainer = document.getElementById('searchResults');

  if (results.length === 0) {
    searchResultsContainer.innerHTML = '<div class="no-results">No fragrances found. Try a different search term.</div>';
    return;
  }

  searchResultsContainer.innerHTML = '';
  results.forEach(fragrance => {
    const resultItem = document.createElement('div');
    resultItem.className = 'search-result-item';

    const nameDiv = document.createElement('div');
    nameDiv.className = 'search-result-name';
    nameDiv.textContent = fragrance.name || 'Unknown';

    const brandDiv = document.createElement('div');
    brandDiv.className = 'search-result-brand';
    brandDiv.textContent = fragrance.brand || 'Unknown Brand';

    resultItem.appendChild(nameDiv);
    resultItem.appendChild(brandDiv);

    resultItem.addEventListener('click', () => selectFragrance(fragrance));

    searchResultsContainer.appendChild(resultItem);
  });
}

function selectFragrance(fragrance) {
  const fragranceName = `${fragrance.brand} - ${fragrance.name}`;

 if (currentListType === 'signature') {
  profileData.signatureFragrance = fragranceName;
  const fullFragranceData = getFragranceData(fragranceName);
  profileData.signatureImage = fullFragranceData?.image || fragrance.image || null;
  renderSignatureFragrance();
}else if (currentListType === 'topFive') {
    if (profileData.topFive.length >= 5) {
      showMessage('Top 5 list is full. Remove an item first.', 'error');
      return;
    }
    if (!profileData.topFive.includes(fragranceName)) {
      profileData.topFive.push(fragranceName);
      renderList('topFiveList', profileData.topFive);
    }
  } else if (currentListType === 'have') {
    if (!profileData.fragrancesHave.includes(fragranceName)) {
      profileData.fragrancesHave.push(fragranceName);
      renderList('fragrancesHaveList', profileData.fragrancesHave);
    }
  } else if (currentListType === 'want') {
    if (!profileData.fragrancesWant.includes(fragranceName)) {
      profileData.fragrancesWant.push(fragranceName);
      renderList('fragrancesWantList', profileData.fragrancesWant);
    }
  }

  closeSearchOverlay();
}

async function uploadImageToSupabase(file, folder) {
  const fileExt = file.name.split('.').pop();
  const fileName = `${currentUserId}.${fileExt}`;
  const filePath = `${folder}/${fileName}`;

  const { data, error } = await supabase.storage
    .from('profile_media')
    .upload(filePath, file, { upsert: true });

  if (error) {
    console.error('Upload error:', error);
    return null;
  }

  const { data: { publicUrl } } = supabase.storage
    .from('profile_media')
    .getPublicUrl(filePath);

  return publicUrl;
}

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
    fragrances_have: profileData.fragrancesHave,
    fragrances_want: profileData.fragrancesWant
  };

  if (pendingHeaderImage) {
    const headerUrl = await uploadImageToSupabase(pendingHeaderImage, 'headers');
    if (headerUrl) {
      updates.header_image = headerUrl;
      document.getElementById('headerImage').style.backgroundImage = `url('${headerUrl}')`;
    }
    pendingHeaderImage = null;
  }

  if (pendingProfileImage) {
    const profileUrl = await uploadImageToSupabase(pendingProfileImage, 'avatars');
    if (profileUrl) {
      updates.profile_picture = profileUrl;
      document.getElementById('profilePicture').style.backgroundImage = `url('${profileUrl}')`;
    }
    pendingProfileImage = null;
  }

  try {
    const { error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', currentUserId);

    if (error) {
      throw error;
    }

    await saveLeaderboardProfile();

    saveBtn.classList.remove('loading');
    saveBtn.textContent = 'Save Changes';
    showMessage('Profile updated successfully!', 'success');
    setViewMode();
  } catch (error) {
    console.error('Error saving profile:', error);
    saveBtn.classList.remove('loading');
    saveBtn.textContent = 'Save Changes';
    showMessage('Failed to save changes. Please try again.', 'error');
  }
}

function showMessage(text, type) {
  const messageContainer = document.getElementById('messageContainer');
  messageContainer.textContent = text;
  messageContainer.className = `message ${type} visible`;

  setTimeout(() => {
    messageContainer.classList.remove('visible');
  }, 5000);
}

document.getElementById('editBtn').addEventListener('click', () => {
  setEditMode();
});

document.getElementById('headerImage').addEventListener('click', () => {
  if (!isEditMode) return;
  document.getElementById('headerImageInput').click();
});

document.getElementById('profilePicture').addEventListener('click', () => {
  if (!isEditMode) return;
  document.getElementById('profilePictureInput').click();
});

document.getElementById('headerImageInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  pendingHeaderImage = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById('headerImage').style.backgroundImage = `url('${e.target.result}')`;
  };
  reader.readAsDataURL(file);
});

document.getElementById('profilePictureInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  pendingProfileImage = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById('profilePicture').style.backgroundImage = `url('${e.target.result}')`;
  };
  reader.readAsDataURL(file);
});

document.getElementById('addSignatureBtn').addEventListener('click', () => {
  if (!isEditMode) return;
  openSearchOverlay('signature');
});

document.getElementById('addTopFiveBtn').addEventListener('click', () => {
  if (!isEditMode) return;
  if (profileData.topFive.length >= 5) {
    showMessage('Top 5 list is full. Remove an item first.', 'error');
    return;
  }
  openSearchOverlay('topFive');
});

document.getElementById('addHaveBtn').addEventListener('click', () => {
  if (!isEditMode) return;
  openSearchOverlay('have');
});

document.getElementById('addWantBtn').addEventListener('click', () => {
  if (!isEditMode) return;
  openSearchOverlay('want');
});

document.getElementById('closeOverlayBtn').addEventListener('click', closeSearchOverlay);

document.getElementById('searchOverlay').addEventListener('click', (e) => {
  if (e.target.id === 'searchOverlay') {
    closeSearchOverlay();
  }
});

document.getElementById('searchInput').addEventListener('input', (e) => {
  searchFragrances(e.target.value);
});

document.getElementById('saveBtn').addEventListener('click', saveChanges);

document.getElementById('logoutBtn').addEventListener('click', async () => {
  const logoutBtn = document.getElementById('logoutBtn');
  logoutBtn.classList.add('loading');
  logoutBtn.textContent = 'Logging out...';

  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('Logout error:', error);
    logoutBtn.classList.remove('loading');
    logoutBtn.textContent = 'Logout';
    showMessage('Logout failed. Please try again.', 'error');
  } else {
    window.location.href = 'login.html';
  }
});

async function loadCollections() {
  try {
    const { data: collections, error } = await supabase
      .from('collections')
      .select('id, name, description, created_at')
      .eq('user_id', currentUserId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading collections:', error);
      return;
    }

    if (!collections || collections.length === 0) {
      renderCollections([]);
      return;
    }

    const collectionsWithCounts = await Promise.all(
      collections.map(async (collection) => {
        const { count, error } = await supabase
          .from('collection_items')
          .select('*', { count: 'exact', head: true })
          .eq('collection_id', collection.id);

        return {
          ...collection,
          itemCount: error ? 0 : count || 0
        };
      })
    );

    renderCollections(collectionsWithCounts);

  } catch (err) {
    console.error('Unexpected error loading collections:', err);
  }
}

function renderCollections(collections) {
  const container = document.getElementById('collectionsContainer');

  if (!container) return;

  if (!collections || collections.length === 0) {
    container.innerHTML = '<div class="section-content empty">No collections yet.</div>';
    return;
  }

  container.innerHTML = collections.map(collection => {
    const description = collection.description
      ? `<div class="collection-card-description">${collection.description}</div>`
      : '';

    return `
      <div class="collection-card" onclick="window.location.href='collection.html?id=${collection.id}'">
        <div class="collection-card-name">${collection.name}</div>
        ${description}
        <div class="collection-card-count">${collection.itemCount} ${collection.itemCount === 1 ? 'fragrance' : 'fragrances'}</div>
      </div>
    `;
  }).join('');
}

async function loadScentleStats(userId) {
  try {
    const { data: stats, error } = await supabase
      .from('user_scentle_stats')
      .select('scentle_played, scentle_avg_guesses')
      .eq('user_id', userId)
      .maybeSingle();

    const section = document.getElementById('scentleStatsSection');
    const contentEl = document.getElementById('scentleStatsContent');

    if (error || !stats || stats.scentle_played === 0) {
      section.style.display = 'none';
      return;
    }

    section.style.display = 'block';
    contentEl.innerHTML = `
      <div class="scentle-stats-grid">
        <div class="scentle-stat-card">
          <div class="scentle-stat-value">${stats.scentle_played}</div>
          <div class="scentle-stat-label">Scentle Played</div>
        </div>
        <div class="scentle-stat-card">
          <div class="scentle-stat-value">${Number(stats.scentle_avg_guesses).toFixed(1)}</div>
          <div class="scentle-stat-label">Avg Guesses</div>
        </div>
      </div>
    `;
  } catch (err) {
    console.error('Error loading Scentle stats:', err);
    document.getElementById('scentleStatsSection').style.display = 'none';
  }
}


function initPrivacyToggles(initialScentleStats, initialFollowStats) {
  const scentleToggle = document.getElementById('showScentleStatsToggle');
  const followStatsToggle = document.getElementById('showFollowStatsToggle');

  scentleToggle.checked = initialScentleStats !== false;
  followStatsToggle.checked = initialFollowStats !== false;

  scentleToggle.addEventListener('change', async (e) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ show_scentle_stats: e.target.checked })
        .eq('id', currentUserId);

      if (error) {
        console.error('Error updating Scentle stats visibility:', error);
        showMessage('Failed to update privacy settings', 'error');
        e.target.checked = !e.target.checked;
        return;
      }

      showMessage(
        e.target.checked ? 'Scentle stats are now visible on your public profile' : 'Scentle stats are now hidden from your public profile',
        'success'
      );
    } catch (err) {
      console.error('Error updating Scentle stats visibility:', err);
      showMessage('Failed to update privacy settings', 'error');
      e.target.checked = !e.target.checked;
    }
  });

  followStatsToggle.addEventListener('change', async (e) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ show_follow_stats: e.target.checked })
        .eq('id', currentUserId);

      if (error) {
        console.error('Error updating follow stats visibility:', error);
        showMessage('Failed to update privacy settings', 'error');
        e.target.checked = !e.target.checked;
        return;
      }

      showMessage(
        e.target.checked ? 'Follower & following counts are now visible on your public profile' : 'Follower & following counts are now hidden from your public profile',
        'success'
      );
    } catch (err) {
      console.error('Error updating follow stats visibility:', err);
      showMessage('Failed to update privacy settings', 'error');
      e.target.checked = !e.target.checked;
    }
  });
}

async function loadLeaderboardProfile(userId) {
  try {
    const { data, error } = await supabase
      .from('leaderboard_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error loading leaderboard profile:', error);
      return;
    }

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
    console.error('Exception loading leaderboard profile:', err);
  }
}

async function saveLeaderboardProfile() {
  const leaderboardData = {
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

  const { error } = await supabase
    .from('leaderboard_profiles')
    .upsert(leaderboardData, { onConflict: 'user_id' });

  if (error) {
    console.error('Error saving leaderboard profile:', error);
    throw error;
  }
}

async function refreshMyFollowCounts(userId) {
  try {
    const { data: counts, error } = await supabase.rpc('get_follow_counts', {
      target_user_id: userId
    });

    if (error) {
      console.error('Error refreshing follow counts:', error);
      return;
    }

    const followersEl = document.getElementById('followersCount');
    const followingEl = document.getElementById('followingCount');

    if (followersEl) followersEl.textContent = counts?.followers_count || 0;
    if (followingEl) followingEl.textContent = counts?.following_count || 0;
  } catch (err) {
    console.error('Error refreshing follow counts:', err);
  }
}

async function loadMyFollowUI(userId) {
  try {
    const { data, error } = await supabase.rpc('get_follow_counts', {
  target_user_id: userId
});

const counts = unwrapRpcRow(data);

if (error || !counts) {
  console.error('Error loading follow counts:', error);
  document.getElementById('followersCount').textContent = '0';
  document.getElementById('followingCount').textContent = '0';
} else {
  document.getElementById('followersCount').textContent = Number(counts.followers_count || 0);
  document.getElementById('followingCount').textContent = Number(counts.following_count || 0);
}

  } catch (err) {
    console.error('Error loading follow counts:', err);
  }

  document.getElementById('followersBtn').addEventListener('click', () => {
    openMyFollowModal('followers');
  });

  document.getElementById('followingBtn').addEventListener('click', () => {
    openMyFollowModal('following');
  });
}

let currentModalOffset = 0;
let currentModalListType = '';

async function openMyFollowModal(listType) {
  currentModalListType = listType;
  currentModalOffset = 0;

  const modal = document.getElementById('followModal');
  const title = document.getElementById('followModalTitle');
  const listEl = document.getElementById('followModalList');
  const emptyEl = document.getElementById('followModalEmpty');
  const loadMoreBtn = document.getElementById('followModalLoadMore');

  title.textContent = listType === 'followers' ? 'Followers' : 'Following';
  listEl.innerHTML = '';
  emptyEl.style.display = 'none';
  loadMoreBtn.style.display = 'none';

  modal.classList.add('active');

  await loadMyFollowList();
  await refreshMyFollowCounts(currentUserId);

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

    if (error) {
      console.error('Error loading follow list:', error);
      if (currentModalOffset === 0) {
        emptyEl.textContent = 'Unable to load list';
        emptyEl.style.display = 'block';
      }
      return;
    }

    if (!users || users.length === 0) {
      if (currentModalOffset === 0) {
        if (currentModalListType === 'followers') {
          emptyEl.textContent = 'No followers yet.';
        } else {
          emptyEl.textContent = 'Not following anyone yet.';
        }
        emptyEl.style.display = 'block';
      }
      loadMoreBtn.style.display = 'none';
      return;
    }

    emptyEl.style.display = 'none';

    users.forEach(user => {
      const avatarUrl = user.profile_picture ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username || 'User')}&size=96&background=D5A856&color=000`;

      const itemHtml = `
        <div class="follow-user-item">
          <img src="${avatarUrl}" alt="${user.username}" class="follow-user-avatar" />
          <div class="follow-user-info">
            <a href="public_profile.html?user_id=${user.id}" class="follow-user-name">${user.username}</a>
          </div>
        </div>
      `;

      listEl.insertAdjacentHTML('beforeend', itemHtml);
    });

    if (users.length === 50) {
      loadMoreBtn.style.display = 'block';
    } else {
      loadMoreBtn.style.display = 'none';
    }
  } catch (err) {
    console.error('Error loading follow list:', err);
    if (currentModalOffset === 0) {
      emptyEl.textContent = 'Unable to load list';
      emptyEl.style.display = 'block';
    }
  }
}

function closeMyFollowModal() {
  document.getElementById('followModal').classList.remove('active');
  refreshMyFollowCounts(currentUserId);
}


document.getElementById('followModalClose').addEventListener('click', closeMyFollowModal);

document.getElementById('followModal').addEventListener('click', (e) => {
  if (e.target.id === 'followModal') {
    closeMyFollowModal();
  }
});

document.getElementById('followModalLoadMore').addEventListener('click', async () => {
  const loadMoreBtn = document.getElementById('followModalLoadMore');
  loadMoreBtn.disabled = true;
  loadMoreBtn.textContent = 'Loading...';

  currentModalOffset += 50;
  await loadMyFollowList();

  loadMoreBtn.disabled = false;
  loadMoreBtn.textContent = 'Load More';
});

await loadFragrancesData();
await checkAuthAndLoadProfile();
