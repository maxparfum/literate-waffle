import { supabase } from './supabase.js';
import { loadAllImageOverrides, normalizeForMatching } from './fragrance-image-override.js';
import { makeCanonicalFragranceId, makeFragranceUrl } from './fragrance-id-utils.js';

let currentUser = null;
let targetUser = null;
let fragrancesData = [];
let imageOverridesMap = new Map();

// NOTE: MaxParfum uses ONE canonical fragrance ID system (fragrance-id-utils.js).
// DO NOT create alternative ID generators. Always use makeCanonicalFragranceId().

async function init() {
  try {
    // Auth is optional - only fetch if user is logged in
    try {
      const { data: { user } } = await supabase.auth.getUser();
      currentUser = user;
    } catch (authError) {
      console.log('No active session (this is OK for public profiles)');
      currentUser = null;
    }

    const params = new URLSearchParams(window.location.search);
    const username = params.get('username');
    const userId = params.get('user_id');

    if (!username && !userId) {
      showError();
      return;
    }

    await loadFragrancesData();
    await loadUserProfile(username, userId);
  } catch (err) {
    console.error('Error initializing:', err);
    showError();
  }
}

function updateMetadata(user) {
  const username = user.username || 'User';
  const bio = user.bio || '';
  const currentUrl = window.location.href;

  const pageTitle = `${username} - MaxParfum Profile`;
  let pageDescription = `View ${username}'s fragrance collection, reviews, and activity on MaxParfum.`;

  if (bio && bio.trim().length > 0) {
    const bioSnippet = bio.length > 100 ? bio.substring(0, 97) + '...' : bio;
    pageDescription = `${username}: ${bioSnippet}`;
  }

  const hasContent = user.signature_fragrance || (user.top_five && user.top_five.length > 0) ||
                     (user.fragrances_have && user.fragrances_have.length > 0) ||
                     (user.fragrances_want && user.fragrances_want.length > 0) ||
                     (bio && bio.trim().length > 0);

  const robotsContent = hasContent ? 'index, follow' : 'noindex, follow';

  document.getElementById('page-title').textContent = pageTitle;
  document.getElementById('page-description').setAttribute('content', pageDescription);
  document.getElementById('page-robots').setAttribute('content', robotsContent);
  document.getElementById('page-canonical').setAttribute('href', currentUrl);

  document.getElementById('og-title').setAttribute('content', pageTitle);
  document.getElementById('og-description').setAttribute('content', pageDescription);
  document.getElementById('og-url').setAttribute('content', currentUrl);

  document.getElementById('twitter-title').setAttribute('content', pageTitle);
  document.getElementById('twitter-description').setAttribute('content', pageDescription);
}

async function loadFragrancesData() {
  try {
    const [fragrancesResponse, overridesMap] = await Promise.all([
      fetch('fragrances_merged.json'),
      loadAllImageOverrides()
    ]);

    fragrancesData = await fragrancesResponse.json();
    imageOverridesMap = overridesMap;
  } catch (err) {
    console.error('Error loading fragrances data:', err);
    fragrancesData = [];
    imageOverridesMap = new Map();
  }
}

async function loadUserProfile(username, userId) {
  try {
    let query = supabase
      .from('users')
      .select(
        'id, username, profile_picture, header_image, bio, signature_fragrance, signature_image, top_five, fragrances_have, fragrances_want, created_at, show_follow_stats, show_scentle_stats'
      );

    if (username) {
      query = query.eq('username', username);
    } else if (userId) {
      query = query.eq('id', userId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error('Error loading profile:', error);
      showError();
      return;
    }

    if (!data) {
      showError();
      return;
    }

    targetUser = data;
    await displayProfile(data);
  } catch (err) {
    console.error('Error loading profile:', err);
    showError();
  }
}

async function displayProfile(user) {
  document.getElementById('loadingState').classList.add('hidden');
  document.getElementById('errorState').classList.add('hidden');
  document.getElementById('profileContainer').classList.remove('hidden');

  updateMetadata(user);
  document.title = `${user.username} - MaxParfum`;

  if (user.header_image) {
    const headerEl = document.getElementById('headerImage');
    headerEl.style.backgroundImage = `url(${user.header_image})`;
  }

  const profilePicEl = document.getElementById('profilePicture');
  if (user.profile_picture) {
    profilePicEl.style.backgroundImage = `url(${user.profile_picture})`;
  } else {
    profilePicEl.style.backgroundImage = `url(https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&size=120&background=D5A856&color=000)`;
  }

  document.getElementById('profileUsername').textContent = user.username || 'Fragrance Lover';

  if (user.created_at) {
    const memberSince = new Date(user.created_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    document.getElementById('profileMeta').textContent = `Member since ${memberSince}`;
  } else {
    document.getElementById('profileMeta').textContent = '';
  }

  if (currentUser && currentUser.id === user.id) {
    document.getElementById('editButtonContainer').classList.remove('hidden');
  } else {
    document.getElementById('editButtonContainer').classList.add('hidden');
  }

  await loadConnectionsAndFollowUI(user);

  renderBio(user.bio);
  renderSignatureFragrance(user.signature_fragrance, user.signature_image);
  renderTopFive(user.top_five);
  renderFragranceList('fragrancesHaveList', user.fragrances_have);
  renderFragranceList('fragrancesWantList', user.fragrances_want);

  await loadCollections(user.id);
  await loadThreadHistoryPreview(user.id);
  await loadCommentHistoryPreview(user.id);
  await loadScentleStats(user.id);
  await loadPointsAndLeaderboard(user.id);
}

function renderBio(bio) {
  const bioSection = document.getElementById('bioSection');
  const bioEl = document.getElementById('profileBio');

  if (bio && bio.trim()) {
    bioEl.textContent = bio;
    bioEl.classList.remove('empty');
    bioSection.classList.remove('hidden');
  } else {
    bioEl.textContent = 'No bio provided yet.';
    bioEl.classList.add('empty');
  }
}

function unwrapRpcRow(data) {
  if (Array.isArray(data)) return data[0] ?? null;
  return data ?? null;
}

function renderSignatureFragrance(signatureFragrance, signatureImage) {
  const signatureSection = document.getElementById('signatureSection');
  const container = document.getElementById('signatureContainer');

  if (!signatureFragrance || !signatureFragrance.trim()) {
    container.innerHTML = '<div class="section-content empty">No signature fragrance set yet.</div>';
    signatureSection.classList.remove('hidden');
    return;
  }

 const fragranceLink = getFragranceLinkData(signatureFragrance);
const fragranceData = getFragranceData(signatureFragrance);
const image = fragranceLink.image || signatureImage || '';
const fragranceUrl = fragranceLink.url;
  container.innerHTML = `
    <a href="${fragranceUrl}" class="signature-display" style="display: flex; align-items: center; gap: 20px; padding: 15px; background: rgba(44, 19, 11, 0.3); border-radius: 8px; border-left: 4px solid #2C130B; text-decoration: none; color: inherit; transition: all 0.3s ease;">
      ${image ? `<img src="${image}" alt="Signature fragrance" class="signature-image" />` : ''}
      <div class="signature-info">
        <div class="signature-name">${escapeHtml(signatureFragrance)}</div>
        ${fragranceData ? `<div class="signature-brand">${escapeHtml(fragranceData.brand)}</div>` : ''}
      </div>
    </a>
  `;

  signatureSection.classList.remove('hidden');
}

function renderTopFive(topFive) {
  const section = document.getElementById('topFiveSection');
  const listEl = document.getElementById('topFiveList');

  if (!topFive || topFive.length === 0) {
    listEl.innerHTML = '<li class="section-content empty">No fragrances added yet.</li>';
    section.classList.remove('hidden');
    return;
  }

  listEl.innerHTML = '';
  topFive.forEach((fragrance, index) => {
   const fragranceLink = getFragranceLinkData(fragrance);
const image = fragranceLink.image || '';
const fragranceUrl = fragranceLink.url;
    const li = document.createElement('li');
    li.innerHTML = `
      <div class="fragrance-number">${index + 1}</div>
      <div class="fragrance-card clickable" onclick="window.location.href='${fragranceUrl}'">
        <a href="${fragranceUrl}" class="fragrance-link">
          <div class="fragrance-item-content">
            ${image ? `<img src="${image}" alt="${escapeHtml(fragrance)}" class="fragrance-image" />` : ''}
            <div class="fragrance-text">${escapeHtml(fragrance)}</div>
          </div>
        </a>
      </div>
    `;
    listEl.appendChild(li);
  });

  section.classList.remove('hidden');
}

function renderFragranceList(listId, fragrances) {
  const section = listId === 'fragrancesHaveList' ? document.getElementById('haveSection') : document.getElementById('wantSection');
  const listEl = document.getElementById(listId);

  if (!fragrances || fragrances.length === 0) {
    listEl.innerHTML = '<li class="section-content empty">No fragrances added yet.</li>';
    section.classList.remove('hidden');
    return;
  }

  listEl.innerHTML = '';
  fragrances.forEach((fragrance) => {
    const fragranceLink = getFragranceLinkData(fragrance);
const image = fragranceLink.image || '';
const fragranceUrl = fragranceLink.url;
    const li = document.createElement('li');
    li.innerHTML = `
      <div class="fragrance-card clickable" onclick="window.location.href='${fragranceUrl}'">
        <a href="${fragranceUrl}" class="fragrance-link">
          <div class="fragrance-item-content">
            ${image ? `<img src="${image}" alt="${escapeHtml(fragrance)}" class="fragrance-image" />` : ''}
            <div class="fragrance-text">${escapeHtml(fragrance)}</div>
          </div>
        </a>
      </div>
    `;
    listEl.appendChild(li);
  });

  section.classList.remove('hidden');
}

async function loadCollections(userId) {
  const section = document.getElementById('collectionsSection');
  const container = document.getElementById('collectionsContainer');

  try {
    const { data: collections, error } = await supabase
      .from('collections')
      .select('id, name, description, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading collections:', error);
      container.innerHTML = '<div class="section-content empty">Error loading collections.</div>';
      section.classList.remove('hidden');
      return;
    }

    if (!collections || collections.length === 0) {
      container.innerHTML = '<div class="section-content empty">No collections yet.</div>';
      section.classList.remove('hidden');
      return;
    }

    const collectionsWithCounts = await Promise.all(
      collections.map(async (collection) => {
        const { count } = await supabase
          .from('collection_items')
          .select('*', { count: 'exact', head: true })
          .eq('collection_id', collection.id);

        return {
          ...collection,
          itemCount: count || 0,
        };
      })
    );

    renderCollections(collectionsWithCounts);
    section.classList.remove('hidden');
  } catch (err) {
    console.error('Error loading collections:', err);
    container.innerHTML = '<div class="section-content empty">Error loading collections.</div>';
    section.classList.remove('hidden');
  }
}

function renderCollections(collections) {
  const container = document.getElementById('collectionsContainer');

  if (!collections || collections.length === 0) {
    container.innerHTML = '<div class="section-content empty">No collections yet.</div>';
    return;
  }

  container.innerHTML = collections
    .map((collection) => {
      const description = collection.description
        ? `<div class="collection-card-description">${escapeHtml(collection.description)}</div>`
        : '';

      return `
      <div class="collection-card" onclick="window.location.href='collection.html?id=${collection.id}'">
        <div class="collection-card-name">${escapeHtml(collection.name)}</div>
        ${description}
        <div class="collection-card-count">${collection.itemCount} ${
        collection.itemCount === 1 ? 'fragrance' : 'fragrances'
      }</div>
      </div>
    `;
    })
    .join('');
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
// Removed: slugify() - Use makeCanonicalFragranceId() or makeFragranceUrl() instead

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

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
      <span class="user-username">${escapeHtml(user.username)}</span>
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
        <a href="forum_thread.html?id=${thread.id}" class="history-preview-title">${escapeHtml(thread.title)}</a>
        <div class="history-preview-snippet">${escapeHtml(snippet)}</div>
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
  const container = document.getElementById('commentHistoryPreview');
  if (!container) return;

  try {
    const { data: comments, error } = await supabase
      .from('comments')
      .select('id, comment, fragrance_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error loading comment history:', error);
      container.innerHTML = '<div class="section-content empty">History unavailable</div>';
      return;
    }

    if (!comments || comments.length === 0) {
      container.innerHTML = '<div class="section-content empty">No comments yet</div>';
      return;
    }

    const row = comments[0];
const text = row.comment || '';
const snippet = text.length > 140 ? text.substring(0, 140) + '...' : text;
const date = new Date(row.created_at).toLocaleDateString();
const fragranceLink = getFragranceLinkData(row.fragrance_id);

container.innerHTML = `
  <div class="history-preview-item">
    <a href="${fragranceLink.url}" class="history-preview-title">
      Comment on ${escapeHtml(fragranceLink.label || row.fragrance_id)}
    </a>
    <div class="history-preview-snippet">${escapeHtml(snippet)}</div>
    <div class="history-preview-date">${date}</div>
  </div>
  <a href="user_comments.html?user_id=${userId}" class="view-all-link">View all comments →</a>
`;
  } catch (err) {
    console.error('Unexpected error loading comment history:', err);
    container.innerHTML = '<div class="section-content empty">History unavailable</div>';
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

async function refreshFollowCounts(profileUserId) {
  try {
    const { data: counts, error } = await supabase.rpc('get_follow_counts', {
      target_user_id: profileUserId
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

async function loadConnectionsAndFollowUI(profileUser) {
  const headerStats = document.getElementById('profileHeaderStats');
  const followButtonSection = document.getElementById('followButtonSection');

  if (profileUser.show_follow_stats !== false) {
    try {
      const { data, error } = await supabase.rpc('get_follow_counts', {
        target_user_id: profileUser.id
      });

      const counts = unwrapRpcRow(data);

      if (error || !counts) {
        console.error('Error loading follow counts:', error);
        document.getElementById('followersCount').textContent = '0';
        document.getElementById('followingCount').textContent = '0';
      } else {
        document.getElementById('followersCount').textContent = Number(counts.followers_count || 0);
        document.getElementById('followingCount').textContent = Number(counts.following_count || 0);
        headerStats.style.display = 'flex';
      }

    } catch (err) {
      console.error('Error loading follow counts:', err);
    }

    const followersBtn = document.getElementById('followersBtn');
    const followingBtn = document.getElementById('followingBtn');

    if (followersBtn) {
      followersBtn.addEventListener('click', () => {
        openFollowModal('followers', profileUser);
      });
    }

    if (followingBtn) {
      followingBtn.addEventListener('click', () => {
        openFollowModal('following', profileUser);
      });
    }
  } else {
    headerStats.style.display = 'none';
  }

  const followButtonWrap = document.getElementById('followButtonWrap');

  if (currentUser && currentUser.id !== profileUser.id) {
    try {
      const { data: isFollowing, error } = await supabase.rpc('is_following', {
        target_user_id: profileUser.id
      });

      if (error) {
        console.error('Error checking follow state:', error);
        return;
      }

      const buttonClass = isFollowing ? 'btn-following' : 'btn-follow';
      const buttonText = isFollowing ? 'Following' : 'Follow';

      followButtonWrap.innerHTML = `
        <button id="followButton" class="${buttonClass}">${buttonText}</button>
      `;
      followButtonSection.style.display = 'block';

      document.getElementById('followButton').addEventListener('click', async (e) => {
        const button = e.target;
        button.disabled = true;
        const wasFollowing = button.classList.contains('btn-following');

        try {
          if (wasFollowing) {
            const { error } = await supabase
              .from('follows')
              .delete()
              .eq('follower_id', currentUser.id)
              .eq('following_id', profileUser.id);

            if (error) {
              console.error('Error unfollowing:', error);
              button.disabled = false;
              return;
            }

            button.classList.remove('btn-following');
            button.classList.add('btn-follow');
            button.textContent = 'Follow';

            if (profileUser.show_follow_stats !== false) {
              const currentCount = parseInt(document.getElementById('followersCount').textContent);
              document.getElementById('followersCount').textContent = Math.max(0, currentCount - 1);
            }
            await refreshFollowCounts(profileUser.id);

          } else {
            const { error } = await supabase
              .from('follows')
              .insert({ follower_id: currentUser.id, following_id: profileUser.id });

            if (error) {
              console.error('Error following:', error);
              button.disabled = false;
              return;
            }

            button.classList.remove('btn-follow');
            button.classList.add('btn-following');
            button.textContent = 'Following';

            if (profileUser.show_follow_stats !== false) {
              const currentCount = parseInt(document.getElementById('followersCount').textContent);
              document.getElementById('followersCount').textContent = currentCount + 1;
            }
          }
        } catch (err) {
          console.error('Error toggling follow:', err);
        }

        button.disabled = false;
      });
    } catch (err) {
      console.error('Error setting up follow button:', err);
    }
  } else if (!currentUser && profileUser.id !== currentUser?.id) {
    followButtonWrap.innerHTML = `<a href="login.html" class="btn-follow">Login to follow</a>`;
    followButtonSection.style.display = 'block';
  }
}

let currentModalOffset = 0;
let currentModalListType = '';
let currentModalProfileUser = null;

async function openFollowModal(listType, profileUser) {
  currentModalListType = listType;
  currentModalProfileUser = profileUser;
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

  await loadFollowList();
}

async function loadFollowList() {
  const listEl = document.getElementById('followModalList');
  const emptyEl = document.getElementById('followModalEmpty');
  const loadMoreBtn = document.getElementById('followModalLoadMore');

  try {
    const { data: users, error } = await supabase.rpc('get_follow_list', {
      target_user_id: currentModalProfileUser.id,
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

function closeFollowModal() {
  const modal = document.getElementById('followModal');
  if (modal) {
    modal.classList.remove('active');
  }
}

// Add null guards for all event listeners
const followModalClose = document.getElementById('followModalClose');
if (followModalClose) {
  followModalClose.addEventListener('click', closeFollowModal);
}

const followModal = document.getElementById('followModal');
if (followModal) {
  followModal.addEventListener('click', (e) => {
    if (e.target.id === 'followModal') {
      closeFollowModal();
    }
  });
}

const followModalLoadMore = document.getElementById('followModalLoadMore');
if (followModalLoadMore) {
  followModalLoadMore.addEventListener('click', async () => {
    followModalLoadMore.disabled = true;
    followModalLoadMore.textContent = 'Loading...';

    currentModalOffset += 50;
    await loadFollowList();

    followModalLoadMore.disabled = false;
    followModalLoadMore.textContent = 'Load More';
  });
}

function showError() {
  document.getElementById('loadingState').classList.add('hidden');
  document.getElementById('profileContainer').classList.add('hidden');
  document.getElementById('errorState').classList.remove('hidden');
}

async function loadPointsAndLeaderboard(userId) {
  try {
    const allTimePointsEl = document.getElementById('allTimePoints');
    const currentRankEl = document.getElementById('currentRank');
    const noPointsMessageEl = document.getElementById('noPointsMessage');
    const leaderboardProfileInfoEl = document.getElementById('leaderboardProfileInfo');
    const publicMessageEl = document.getElementById('publicMessage');
    const socialLinksEl = document.getElementById('socialLinks');

    const { data: pointsRow, error: pointsError } = await supabase
      .from('leaderboard_all_time')
      .select('user_id, total_points')
      .eq('user_id', userId)
      .maybeSingle();

    if (pointsError && pointsError.code !== 'PGRST116') {
      console.error('Error loading leaderboard points:', pointsError);
    }

    const totalPoints = Number(pointsRow?.total_points || 0);
    allTimePointsEl.textContent = totalPoints.toLocaleString();

    if (totalPoints > 0) {
      const { data: allRows, error: rankError } = await supabase
        .from('leaderboard_all_time')
        .select('user_id, total_points')
        .order('total_points', { ascending: false });

      if (rankError) {
        console.error('Error loading leaderboard ranks:', rankError);
        currentRankEl.textContent = '#-';
      } else {
        const higherCount = (allRows || []).filter(
          row => Number(row.total_points || 0) > totalPoints
        ).length;

        currentRankEl.textContent = `#${higherCount + 1}`;
      }

      noPointsMessageEl.style.display = 'none';
    } else {
      currentRankEl.textContent = '#-';
      noPointsMessageEl.style.display = 'block';
    }

    const { data: profileRow, error: profileError } = await supabase
      .from('leaderboard_profiles')
      .select(`
        public_message,
        instagram_handle,
        tiktok_handle,
        facebook_handle,
        twitter_handle,
        show_socials_publicly,
        show_message_publicly
      `)
      .eq('user_id', userId)
      .maybeSingle();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error loading leaderboard profile info:', profileError);
    }

    leaderboardProfileInfoEl.style.display = 'none';
    publicMessageEl.style.display = 'none';
    socialLinksEl.style.display = 'none';
    socialLinksEl.innerHTML = '';

    if (profileRow?.show_message_publicly && profileRow.public_message) {
      publicMessageEl.textContent = `"${profileRow.public_message}"`;
      publicMessageEl.style.display = 'block';
      leaderboardProfileInfoEl.style.display = 'block';
    }

    if (profileRow?.show_socials_publicly) {
      const socials = [];

      if (profileRow.instagram_handle) {
        socials.push(`<a href="https://instagram.com/${profileRow.instagram_handle}" target="_blank" rel="noopener noreferrer" style="color: #C59849; text-decoration: none;">📷 Instagram</a>`);
      }
      if (profileRow.tiktok_handle) {
        socials.push(`<a href="https://tiktok.com/@${profileRow.tiktok_handle}" target="_blank" rel="noopener noreferrer" style="color: #C59849; text-decoration: none;">🎵 TikTok</a>`);
      }
      if (profileRow.twitter_handle) {
        socials.push(`<a href="https://twitter.com/${profileRow.twitter_handle}" target="_blank" rel="noopener noreferrer" style="color: #C59849; text-decoration: none;">🐦 Twitter</a>`);
      }
      if (profileRow.facebook_handle) {
        socials.push(`<a href="https://facebook.com/${profileRow.facebook_handle}" target="_blank" rel="noopener noreferrer" style="color: #C59849; text-decoration: none;">👥 Facebook</a>`);
      }

      if (socials.length > 0) {
        socialLinksEl.innerHTML = socials.join('');
        socialLinksEl.style.display = 'flex';
        leaderboardProfileInfoEl.style.display = 'block';
      }
    }
  } catch (err) {
    console.error('Exception loading points and leaderboard:', err);
  }
}
init();
