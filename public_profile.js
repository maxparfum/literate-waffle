import { supabase } from './supabase.js';
import { loadAllImageOverrides, normalizeForMatching } from './fragrance-image-override.js';
import { makeCanonicalFragranceId, makeFragranceUrl } from './fragrance-id-utils.js';

let currentUser = null;
let targetUser = null;
let fragrancesData = [];
let imageOverridesMap = new Map();

async function init() {
  try {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      currentUser = user;
    } catch {
      currentUser = null;
    }

    const params = new URLSearchParams(window.location.search);
    const username = params.get('username');
    const userId = params.get('user_id');

    if (!username && !userId) { showError(); return; }

    await loadFragrancesData();
    await loadUserProfile(username, userId);
  } catch (err) {
    console.error('Error initializing:', err);
    showError();
  }
}

async function loadFragrancesData() {
  try {
    const [resp, overrides] = await Promise.all([
      fetch('fragrances_merged.json'),
      loadAllImageOverrides()
    ]);
    fragrancesData = await resp.json();
    imageOverridesMap = overrides;
  } catch {
    fragrancesData = [];
    imageOverridesMap = new Map();
  }
}

function updateMetadata(user) {
  const username = user.username || 'User';
  const bio = user.bio || '';
  const currentUrl = window.location.href;
  const pageTitle = `${username} - MaxParfum`;
  let desc = `${username}'s fragrance taste profile on MaxParfum.`;
  if (bio.trim()) desc = `${username}: ${bio.length > 100 ? bio.substring(0, 97) + '...' : bio}`;

  const hasContent = user.signature_fragrance || (user.top_five?.length > 0) ||
    (user.fragrances_have?.length > 0) || (user.fragrances_want?.length > 0) || bio.trim();

  document.getElementById('page-title').textContent = pageTitle;
  document.getElementById('page-description').setAttribute('content', desc);
  document.getElementById('page-robots').setAttribute('content', hasContent ? 'index, follow' : 'noindex, follow');
  document.getElementById('page-canonical').setAttribute('href', currentUrl);
  document.getElementById('og-title').setAttribute('content', pageTitle);
  document.getElementById('og-description').setAttribute('content', desc);
  document.getElementById('og-url').setAttribute('content', currentUrl);
  document.getElementById('twitter-title').setAttribute('content', pageTitle);
  document.getElementById('twitter-description').setAttribute('content', desc);
}

async function loadUserProfile(username, userId) {
  try {
    let query = supabase.from('users').select(
      'id, username, profile_picture, header_image, bio, signature_fragrance, signature_image, ' +
      'top_five, fragrances_have, fragrances_want, worst_five, ' +
      'favourite_notes, disliked_notes, favourite_styles, avoided_styles, favourite_occasions, preferred_strength, ' +
      'show_scent_dna_publicly, show_fragrance_showcase_publicly, show_collections_publicly, show_activity_publicly, ' +
      'created_at, show_follow_stats, show_scentle_stats'
    );

    if (username) query = query.eq('username', username);
    else if (userId) query = query.eq('id', userId);

    const { data, error } = await query.maybeSingle();

    if (error || !data) { showError(); return; }

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

  // Header image
  if (user.header_image) {
    document.getElementById('headerImage').style.backgroundImage = `url(${user.header_image})`;
  }

  // Profile picture
  const picEl = document.getElementById('profilePicture');
  picEl.style.backgroundImage = user.profile_picture
    ? `url(${user.profile_picture})`
    : `url(https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&size=120&background=D5A856&color=000)`;

  // Name / handle
  document.getElementById('profileUsername').textContent = user.username || 'Fragrance Lover';
  document.getElementById('profileHandle').textContent = `@${user.username}`;

  // Member since
  if (user.created_at) {
    const ms = new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    document.getElementById('profileMetaLine').textContent = `Member since ${ms}`;
  }

  // Signature line
  if (user.signature_fragrance) {
    const sigLine = document.getElementById('profileSigLine');
    sigLine.innerHTML = `Signature: <span>${escapeHtml(user.signature_fragrance)}</span>`;
    sigLine.classList.remove('hidden');
  }

  // Style chips from favourite_styles + preferred_strength
  const styles = safeArray(user.favourite_styles);
  const strength = user.preferred_strength;
  if (styles.length > 0 || strength) {
    const chipsEl = document.getElementById('profileStyleChips');
    const all = [...styles.slice(0, 4)];
    if (strength) all.push(strength);
    chipsEl.innerHTML = all.map(s => `<span class="style-chip">${escapeHtml(s)}</span>`).join('');
    chipsEl.classList.remove('hidden');
  }

  // Bio snippet
  if (user.bio && user.bio.trim()) {
    const bioEl = document.getElementById('profileBioHeader');
    bioEl.textContent = user.bio.length > 200 ? user.bio.substring(0, 197) + '...' : user.bio;
    bioEl.classList.remove('hidden');
  }

  // Edit button for own profile
  if (currentUser && currentUser.id === user.id) {
    document.getElementById('editButtonContainer').classList.remove('hidden');
  }

  await loadConnectionsAndFollowUI(user);
  await loadPointsHeader(user.id);

  renderScentDna(user);
  renderFragranceShowcase(user);
  if (user.show_collections_publicly !== false) await loadCollections(user.id);
  await loadStatsSection(user);
  if (user.show_activity_publicly !== false) await loadActivitySection(user.id);
}

// ── SCENT DNA ──────────────────────────────────────────────────────────────

function renderScentDna(user) {
  if (user.show_scent_dna_publicly === false) return;

  const favNotes = safeArray(user.favourite_notes);
  const disNotes = safeArray(user.disliked_notes);
  const favStyles = safeArray(user.favourite_styles);
  const avoStyles = safeArray(user.avoided_styles);
  const occasions = safeArray(user.favourite_occasions);
  const strength = user.preferred_strength;

  const hasAny = favNotes.length || disNotes.length || favStyles.length ||
    avoStyles.length || occasions.length || strength;

  if (!hasAny) return;

  const rows = [];

  if (favNotes.length) rows.push(dnaRow('Fav Notes', favNotes, ''));
  if (disNotes.length) rows.push(dnaRow('Dislikes', disNotes, 'negative'));
  if (favStyles.length) rows.push(dnaRow('Styles', favStyles, ''));
  if (avoStyles.length) rows.push(dnaRow('Avoids', avoStyles, 'negative'));
  if (occasions.length) rows.push(dnaRow('Occasions', occasions, ''));
  if (strength) rows.push(dnaRow('Strength', [strength], 'strength'));

  document.getElementById('scentDnaContent').innerHTML = rows.join('');
  document.getElementById('scentDnaSection').classList.remove('hidden');
}

function dnaRow(label, chips, chipClass) {
  const chipsHtml = chips
    .map(c => `<span class="dna-chip ${chipClass}">${escapeHtml(String(c))}</span>`)
    .join('');
  return `
    <div class="dna-row">
      <span class="dna-label">${label}</span>
      <div class="dna-chips">${chipsHtml}</div>
    </div>`;
}

// ── FRAGRANCE SHOWCASE ─────────────────────────────────────────────────────

function renderFragranceShowcase(user) {
  if (user.show_fragrance_showcase_publicly === false) return;

  const tabs = [];

  if (user.signature_fragrance) {
    tabs.push({ id: 'sig', label: 'Signature', render: () => renderSigPanel(user.signature_fragrance, user.signature_image) });
  }

  const top5 = safeArray(user.top_five);
  if (top5.length) {
    tabs.push({ id: 'top5', label: 'Top 5', render: () => renderNumberedPanel(top5) });
  }

  const worst5 = safeArray(user.worst_five);
  if (worst5.length) {
    tabs.push({ id: 'worst5', label: 'Worst 5', render: () => renderNumberedPanel(worst5) });
  }

  const have = safeArray(user.fragrances_have);
  if (have.length) {
    tabs.push({ id: 'have', label: 'Have', render: () => renderGridPanel(have) });
  }

  const want = safeArray(user.fragrances_want);
  if (want.length) {
    tabs.push({ id: 'want', label: 'Want', render: () => renderGridPanel(want) });
  }

  if (!tabs.length) return;

  const tabsEl = document.getElementById('showcaseTabs');
  const panelsEl = document.getElementById('showcasePanels');

  tabs.forEach((tab, i) => {
    const btn = document.createElement('button');
    btn.className = 'tab-btn' + (i === 0 ? ' active' : '');
    btn.textContent = tab.label;
    btn.dataset.tab = tab.id;
    btn.setAttribute('role', 'tab');
    btn.addEventListener('click', () => switchShowcaseTab(tab.id));
    tabsEl.appendChild(btn);

    const panel = document.createElement('div');
    panel.className = 'tab-panel' + (i === 0 ? ' active' : '');
    panel.id = `showcase-panel-${tab.id}`;
    panel.innerHTML = tab.render();
    panelsEl.appendChild(panel);
  });

  document.getElementById('fragranceShowcaseSection').classList.remove('hidden');
}

function switchShowcaseTab(tabId) {
  document.querySelectorAll('#showcaseTabs .tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tabId));
  document.querySelectorAll('#showcasePanels .tab-panel').forEach(p => p.classList.toggle('active', p.id === `showcase-panel-${tabId}`));
}

function renderSigPanel(sigValue, sigImage) {
  const norm = normalizeFragrance(sigValue);
  const url = norm.url;
  const img = norm.image || sigImage || '';
  return `
    <a href="${url}" class="sig-card">
      ${img ? `<img src="${escapeHtml(img)}" alt="${escapeHtml(norm.displayName)}" class="sig-card-img" onerror="this.style.display='none'" />`
            : `<div class="sig-card-placeholder">&#128167;</div>`}
      <div>
        ${norm.brand ? `<div class="sig-card-brand">${escapeHtml(norm.brand)}</div>` : ''}
        <div class="sig-card-name">${escapeHtml(norm.name || norm.displayName)}</div>
      </div>
    </a>`;
}

function renderNumberedPanel(items) {
  const html = items.map((item, i) => {
    const norm = normalizeFragrance(item);
    const img = norm.image;
    return `
      <li class="frag-list-item">
        <span class="frag-num">${i + 1}</span>
        <a href="${norm.url}" class="frag-item-card">
          ${img ? `<img src="${escapeHtml(img)}" alt="${escapeHtml(norm.displayName)}" class="frag-item-img" onerror="this.style.display='none'" />`
                : ''}
          <div class="frag-item-text">
            ${norm.brand ? `<div class="frag-item-brand">${escapeHtml(norm.brand)}</div>` : ''}
            <div class="frag-item-name">${escapeHtml(norm.name || norm.displayName)}</div>
          </div>
        </a>
      </li>`;
  }).join('');
  return `<ul class="frag-list-numbered">${html}</ul>`;
}

function renderGridPanel(items) {
  const html = items.map(item => {
    const norm = normalizeFragrance(item);
    const img = norm.image;
    return `
      <a href="${norm.url}" class="frag-card-compact">
        ${img
          ? `<img src="${escapeHtml(img)}" alt="${escapeHtml(norm.displayName)}" class="frag-card-thumb" onerror="this.style.display='none'" />`
          : `<div class="frag-card-thumb-placeholder">&#128167;</div>`}
        <div class="frag-card-body">
          ${norm.brand ? `<div class="frag-card-brand">${escapeHtml(norm.brand)}</div>` : ''}
          <div class="frag-card-name">${escapeHtml(norm.name || norm.displayName)}</div>
        </div>
      </a>`;
  }).join('');
  return `<div class="frag-grid">${html}</div>`;
}

// ── COLLECTIONS ────────────────────────────────────────────────────────────

async function loadCollections(userId) {
  const section = document.getElementById('collectionsSection');
  const container = document.getElementById('collectionsContainer');

  try {
    const { data: collections, error } = await supabase
      .from('collections')
      .select('id, name, description, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error || !collections || collections.length === 0) {
      return; // hide section if no collections
    }

    const withCounts = await Promise.all(collections.map(async col => {
      const { count } = await supabase
        .from('collection_items')
        .select('*', { count: 'exact', head: true })
        .eq('collection_id', col.id);
      return { ...col, itemCount: count || 0 };
    }));

    container.innerHTML = withCounts.map(col => {
      const desc = col.description
        ? `<div class="collection-card-desc">${escapeHtml(col.description)}</div>`
        : '';
      return `
        <div class="collection-card" onclick="window.location.href='collection.html?id=${col.id}'">
          <div class="collection-card-name">${escapeHtml(col.name)}</div>
          ${desc}
          <div class="collection-card-meta">
            <span class="collection-card-count">${col.itemCount} ${col.itemCount === 1 ? 'fragrance' : 'fragrances'}</span>
          </div>
        </div>`;
    }).join('');

    section.classList.remove('hidden');
  } catch (err) {
    console.error('Error loading collections:', err);
  }
}

// ── STATS ──────────────────────────────────────────────────────────────────

async function loadStatsSection(user) {
  const section = document.getElementById('statsSection');
  const grid = document.getElementById('statsGrid');
  const boxes = [];

  // Points
  try {
    const { data: pointsRow } = await supabase
      .from('leaderboard_all_time')
      .select('total_points')
      .eq('user_id', user.id)
      .maybeSingle();

    const totalPoints = Number(pointsRow?.total_points || 0);

    let rank = '-';
    if (totalPoints > 0) {
      const { data: allRows } = await supabase
        .from('leaderboard_all_time')
        .select('total_points')
        .order('total_points', { ascending: false });
      const higher = (allRows || []).filter(r => Number(r.total_points || 0) > totalPoints).length;
      rank = `#${higher + 1}`;
    }

    boxes.push({ value: totalPoints.toLocaleString(), label: 'All-Time Points' });
    boxes.push({ value: rank, label: 'Rank' });

    // Also update header points
    if (totalPoints > 0) {
      document.getElementById('headerPoints').textContent = totalPoints.toLocaleString();
      document.getElementById('pointsStatBox').style.display = 'block';
    }

    // Leaderboard profile message/socials
    const { data: lbProfile } = await supabase
      .from('leaderboard_profiles')
      .select('public_message, instagram_handle, tiktok_handle, facebook_handle, twitter_handle, show_socials_publicly, show_message_publicly')
      .eq('user_id', user.id)
      .maybeSingle();

    const lbInfoEl = document.getElementById('leaderboardProfileInfo');
    const msgEl = document.getElementById('publicMessage');
    const socialEl = document.getElementById('socialLinks');

    if (lbProfile?.show_message_publicly && lbProfile.public_message) {
      msgEl.textContent = `"${lbProfile.public_message}"`;
      msgEl.classList.remove('hidden');
      lbInfoEl.style.display = 'block';
    }

    if (lbProfile?.show_socials_publicly) {
      const socials = [];
      if (lbProfile.instagram_handle) socials.push(`<a href="https://instagram.com/${lbProfile.instagram_handle}" target="_blank" rel="noopener noreferrer">Instagram</a>`);
      if (lbProfile.tiktok_handle) socials.push(`<a href="https://tiktok.com/@${lbProfile.tiktok_handle}" target="_blank" rel="noopener noreferrer">TikTok</a>`);
      if (lbProfile.twitter_handle) socials.push(`<a href="https://twitter.com/${lbProfile.twitter_handle}" target="_blank" rel="noopener noreferrer">Twitter</a>`);
      if (lbProfile.facebook_handle) socials.push(`<a href="https://facebook.com/${lbProfile.facebook_handle}" target="_blank" rel="noopener noreferrer">Facebook</a>`);
      if (socials.length) {
        socialEl.innerHTML = socials.join('');
        lbInfoEl.style.display = 'block';
      }
    }
  } catch (err) {
    console.error('Error loading points:', err);
  }

  // Scentle
  if (user.show_scentle_stats !== false) {
    try {
      const { data: stats } = await supabase
        .from('user_scentle_stats')
        .select('scentle_played, scentle_avg_guesses')
        .eq('user_id', user.id)
        .maybeSingle();

      if (stats && stats.scentle_played > 0) {
        boxes.push({ value: stats.scentle_played, label: 'Scentle Played' });
        boxes.push({ value: Number(stats.scentle_avg_guesses).toFixed(1), label: 'Avg Guesses' });
      }
    } catch (err) {
      console.error('Error loading Scentle stats:', err);
    }
  }

  if (boxes.length > 0) {
    grid.innerHTML = boxes.map(b => `
      <div class="stat-box">
        <div class="stat-box-value">${escapeHtml(String(b.value))}</div>
        <div class="stat-box-label">${escapeHtml(b.label)}</div>
      </div>`).join('');
    section.classList.remove('hidden');
  }
}

async function loadPointsHeader(userId) {
  // Points shown in header stat box are loaded as part of loadStatsSection
  // This is a no-op kept for clarity
}

// ── ACTIVITY ───────────────────────────────────────────────────────────────

async function loadActivitySection(userId) {
  const section = document.getElementById('activitySection');
  const tabsEl = document.getElementById('activityTabs');
  const panelsEl = document.getElementById('activityPanels');

  const activityTabs = [];

  // Threads
  try {
    const { data: threads } = await supabase
      .from('forum_threads')
      .select('id, title, created_at')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(3);

    if (threads && threads.length > 0) {
      activityTabs.push({
        id: 'threads',
        label: 'Threads',
        html: threads.map(t => `
          <div class="activity-item">
            <a href="forum_thread.html?id=${t.id}" class="activity-item-title">${escapeHtml(t.title)}</a>
            <div class="activity-item-date">${new Date(t.created_at).toLocaleDateString()}</div>
          </div>`).join('') +
          `<a href="user_threads.html?user_id=${userId}" class="view-all-link">View all threads →</a>`
      });
    }
  } catch {}

  // Comments
  try {
    const { data: comments } = await supabase
      .from('comments')
      .select('id, comment, fragrance_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(3);

    if (comments && comments.length > 0) {
      activityTabs.push({
        id: 'comments',
        label: 'Comments',
        html: comments.map(c => {
          const linkData = getFragranceLinkData(c.fragrance_id);
          const snippet = (c.comment || '').substring(0, 120);
          return `
            <div class="activity-item">
              <a href="${linkData.url}" class="activity-item-title">Comment on ${escapeHtml(linkData.label || c.fragrance_id || '')}</a>
              <div class="activity-item-snippet">${escapeHtml(snippet)}${c.comment?.length > 120 ? '...' : ''}</div>
              <div class="activity-item-date">${new Date(c.created_at).toLocaleDateString()}</div>
            </div>`;
        }).join('') +
          `<a href="user_comments.html?user_id=${userId}" class="view-all-link">View all comments →</a>`
      });
    }
  } catch {}

  // Scentle activity tab (scentle games played recently - use stats only)
  // Skipped: no per-game history table assumed; scentle info covered in stats

  if (!activityTabs.length) return;

  activityTabs.forEach((tab, i) => {
    const btn = document.createElement('button');
    btn.className = 'tab-btn' + (i === 0 ? ' active' : '');
    btn.textContent = tab.label;
    btn.dataset.tab = tab.id;
    btn.setAttribute('role', 'tab');
    btn.addEventListener('click', () => switchActivityTab(tab.id));
    tabsEl.appendChild(btn);

    const panel = document.createElement('div');
    panel.className = 'tab-panel' + (i === 0 ? ' active' : '');
    panel.id = `activity-panel-${tab.id}`;
    panel.innerHTML = tab.html;
    panelsEl.appendChild(panel);
  });

  section.classList.remove('hidden');
}

function switchActivityTab(tabId) {
  document.querySelectorAll('#activityTabs .tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tabId));
  document.querySelectorAll('#activityPanels .tab-panel').forEach(p => p.classList.toggle('active', p.id === `activity-panel-${tabId}`));
}

// ── FOLLOW / CONNECTIONS ───────────────────────────────────────────────────

function unwrapRpcRow(data) {
  if (Array.isArray(data)) return data[0] ?? null;
  return data ?? null;
}

async function loadConnectionsAndFollowUI(profileUser) {
  const headerStats = document.getElementById('profileHeaderStats');

  if (profileUser.show_follow_stats !== false) {
    try {
      const { data, error } = await supabase.rpc('get_follow_counts', { target_user_id: profileUser.id });
      const counts = unwrapRpcRow(data);
      if (!error && counts) {
        document.getElementById('followersCount').textContent = Number(counts.followers_count || 0);
        document.getElementById('followingCount').textContent = Number(counts.following_count || 0);
        headerStats.style.display = 'flex';
      }
    } catch {}

    document.getElementById('followersBtn').addEventListener('click', () => openFollowModal('followers', profileUser));
    document.getElementById('followingBtn').addEventListener('click', () => openFollowModal('following', profileUser));
  }

  const followButtonWrap = document.getElementById('followButtonWrap');

  if (currentUser && currentUser.id !== profileUser.id) {
    try {
      const { data: isFollowing } = await supabase.rpc('is_following', { target_user_id: profileUser.id });
      const cls = isFollowing ? 'btn-following' : 'btn-follow';
      const txt = isFollowing ? 'Following' : 'Follow';
      followButtonWrap.innerHTML = `<button id="followButton" class="${cls}">${txt}</button>`;
      document.getElementById('followButtonSection').style.display = 'block';

      document.getElementById('followButton').addEventListener('click', async (e) => {
        const btn = e.target;
        btn.disabled = true;
        const wasFollowing = btn.classList.contains('btn-following');
        try {
          if (wasFollowing) {
            await supabase.from('follows').delete().eq('follower_id', currentUser.id).eq('following_id', profileUser.id);
            btn.classList.replace('btn-following', 'btn-follow');
            btn.textContent = 'Follow';
            if (profileUser.show_follow_stats !== false) {
              const cur = parseInt(document.getElementById('followersCount').textContent);
              document.getElementById('followersCount').textContent = Math.max(0, cur - 1);
            }
          } else {
            await supabase.from('follows').insert({ follower_id: currentUser.id, following_id: profileUser.id });
            btn.classList.replace('btn-follow', 'btn-following');
            btn.textContent = 'Following';
            if (profileUser.show_follow_stats !== false) {
              const cur = parseInt(document.getElementById('followersCount').textContent);
              document.getElementById('followersCount').textContent = cur + 1;
            }
          }
        } catch (err) {
          console.error('Error toggling follow:', err);
        }
        btn.disabled = false;
      });
    } catch {}
  } else if (!currentUser) {
    followButtonWrap.innerHTML = `<a href="login.html" class="btn-follow">Login to follow</a>`;
    document.getElementById('followButtonSection').style.display = 'block';
  }
}

// ── FOLLOW MODAL ───────────────────────────────────────────────────────────

let currentModalOffset = 0;
let currentModalListType = '';
let currentModalProfileUser = null;

async function openFollowModal(listType, profileUser) {
  currentModalListType = listType;
  currentModalProfileUser = profileUser;
  currentModalOffset = 0;

  document.getElementById('followModalTitle').textContent = listType === 'followers' ? 'Followers' : 'Following';
  document.getElementById('followModalList').innerHTML = '';
  document.getElementById('followModalEmpty').style.display = 'none';
  document.getElementById('followModalLoadMore').style.display = 'none';
  document.getElementById('followModal').classList.add('active');

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
          <img src="${avatar}" alt="${user.username}" class="follow-user-avatar" />
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

function closeFollowModal() {
  document.getElementById('followModal').classList.remove('active');
}

document.getElementById('followModalClose').addEventListener('click', closeFollowModal);
document.getElementById('followModal').addEventListener('click', e => { if (e.target.id === 'followModal') closeFollowModal(); });
document.getElementById('followModalLoadMore').addEventListener('click', async () => {
  const btn = document.getElementById('followModalLoadMore');
  btn.disabled = true;
  btn.textContent = 'Loading...';
  currentModalOffset += 50;
  await loadFollowList();
  btn.disabled = false;
  btn.textContent = 'Load More';
});

// ── HELPERS ────────────────────────────────────────────────────────────────

function safeArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { const p = JSON.parse(val); return Array.isArray(p) ? p : []; } catch { return []; }
}

function normalizeFragrance(value) {
  if (!value) return { url: 'fragrance.html', displayName: '', brand: '', name: '', image: '' };

  // String: "Brand - Name"
  if (typeof value === 'string') {
    const linkData = getFragranceLinkData(value);
    const parts = value.split(' - ');
    const brand = parts.length >= 2 ? parts[0].trim() : '';
    const name = parts.length >= 2 ? parts.slice(1).join(' - ').trim() : value;
    return { url: linkData.url, displayName: value, brand, name, image: linkData.image };
  }

  // Object
  const brand = value.brand || value.fragrance_brand || '';
  const name = value.name || value.fragrance_name || '';
  const image = value.image || value.image_url || '';

  if (brand && name) {
    const url = makeFragranceUrl(brand, name);
    const overrideKey = `${normalizeForMatching(brand)}::${normalizeForMatching(name)}`;
    const overrideImg = imageOverridesMap.get(overrideKey);
    const jsonMatch = fragrancesData.find(f =>
      f.brand?.toLowerCase() === brand.toLowerCase() &&
      f.name?.toLowerCase() === name.toLowerCase()
    );
    return {
      url,
      displayName: `${brand} - ${name}`,
      brand,
      name,
      image: overrideImg || image || jsonMatch?.image || ''
    };
  }

  // fallback string display
  const display = brand || name || String(value.id || '');
  return { url: 'fragrance.html', displayName: display, brand: '', name: display, image };
}

function getFragranceData(fragranceName) {
  if (!fragranceName) return null;
  const parts = fragranceName.split(' - ');
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

function showError() {
  document.getElementById('loadingState').classList.add('hidden');
  document.getElementById('profileContainer').classList.add('hidden');
  document.getElementById('errorState').classList.remove('hidden');
}

init();
