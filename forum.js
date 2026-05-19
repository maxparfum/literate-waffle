import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm';

const SUPABASE_URL = 'https://moazswfklpvoperkarlk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vYXpzd2ZrbHB2b3BlcmthcmxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3MDc2MTYsImV4cCI6MjA3OTI4MzYxNn0.7_xrCWwV_elxQ0i4bdQ9Hsv-HGB-qz30a__1aeJ4QiM';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let searchDebounceTimer = null;
let followStatesCache = {};

async function init() {
  const { data: { user } } = await supabase.auth.getUser();
  currentUser = user;

  setupTabSwitching();
  const loadingState = document.getElementById('loading-state');
  const errorState = document.getElementById('error-state');
  const categoriesGrid = document.getElementById('categories-grid');

  try {
    const { data: categories, error: categoriesError } = await supabase
      .from('forum_categories')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('title', { ascending: true });

    if (categoriesError) {
      console.error('Error fetching categories:', categoriesError);
      loadingState.classList.add('hidden');
      errorState.classList.remove('hidden');
      return;
    }

    const { data: threads, error: threadsError } = await supabase
      .from('forum_threads')
      .select('id, category_id, last_post_at')
      .or('is_deleted.is.null,is_deleted.eq.false');

    if (threadsError) {
      console.error('Error fetching threads:', threadsError);
    }

    const threadCountByCategory = {};
    const lastPostByCategory = {};

    if (threads && threads.length > 0) {
      threads.forEach(thread => {
        const categoryId = thread.category_id;

        if (!threadCountByCategory[categoryId]) {
          threadCountByCategory[categoryId] = 0;
        }
        threadCountByCategory[categoryId]++;

        if (thread.last_post_at) {
          const lastPostDate = new Date(thread.last_post_at);

          if (!lastPostByCategory[categoryId] || lastPostDate > lastPostByCategory[categoryId]) {
            lastPostByCategory[categoryId] = lastPostDate;
          }
        }
      });
    }

    loadingState.classList.add('hidden');

    if (!categories || categories.length === 0) {
      errorState.textContent = 'No categories found.';
      errorState.classList.remove('hidden');
      return;
    }

    renderCategories(categories, threadCountByCategory, lastPostByCategory);
    categoriesGrid.classList.remove('hidden');

  } catch (err) {
    console.error('Unexpected error:', err);
    loadingState.classList.add('hidden');
    errorState.classList.remove('hidden');
  }
}

function renderCategories(categories, threadCountByCategory, lastPostByCategory) {
  const categoriesGrid = document.getElementById('categories-grid');

  const html = categories.map(category => {
    const threadCount = threadCountByCategory[category.id] || 0;
    const threadText = threadCount === 1 ? '1 thread' : `${threadCount} threads`;

    let lastActivityText = 'No posts yet';
    if (lastPostByCategory[category.id]) {
      const timeAgo = formatTimeAgo(lastPostByCategory[category.id]);
      lastActivityText = `Last post ${timeAgo}`;
    }

    return `
      <a href="forum_category.html?category_id=${category.id}" class="category-card">
        <div class="category-title">${category.title}</div>
        <div class="category-description">${category.description || ''}</div>
        <div class="category-meta">
          <div class="meta-item">
            <span class="meta-icon">💬</span>
            <span>${threadText}</span>
          </div>
          <div class="meta-item">
            <span class="meta-icon">🕒</span>
            <span>${lastActivityText}</span>
          </div>
        </div>
      </a>
    `;
  }).join('');

  categoriesGrid.innerHTML = html;
}

function formatTimeAgo(date) {
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(days / 365);
  return `${years}y ago`;
}

function setupTabSwitching() {
  const threadsTab = document.getElementById('threadsTab');
  const usersTab = document.getElementById('usersTab');
  const userSearchBox = document.getElementById('userSearchBox');
  const userResults = document.getElementById('userResults');
  const categoriesTitle = document.getElementById('categoriesTitle');
  const categoriesGrid = document.getElementById('categories-grid');
  const loadingState = document.getElementById('loading-state');
  const errorState = document.getElementById('error-state');

  threadsTab.addEventListener('click', () => {
    threadsTab.classList.add('active');
    usersTab.classList.remove('active');
    userSearchBox.style.display = 'none';
    userResults.classList.remove('active');
    categoriesTitle.style.display = 'block';
    categoriesGrid.style.display = 'grid';
    loadingState.style.display = 'block';
    errorState.style.display = 'block';
  });

  usersTab.addEventListener('click', () => {
    usersTab.classList.add('active');
    threadsTab.classList.remove('active');
    userSearchBox.style.display = 'block';
    userResults.classList.add('active');
    categoriesTitle.style.display = 'none';
    categoriesGrid.style.display = 'none';
    loadingState.style.display = 'none';
    errorState.style.display = 'none';
  });

  const userSearchInput = document.getElementById('userSearchInput');
  userSearchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
    }
    searchDebounceTimer = setTimeout(() => {
      searchUsers(query);
    }, 150);
  });
}

async function searchUsers(query) {
  const resultsContainer = document.getElementById('userResults');

  if (!query) {
    resultsContainer.innerHTML = '<div class="empty-state">Start typing to search users...</div>';
    return;
  }

  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, username, profile_picture')
      .not('username', 'is', null)
      .ilike('username', `%${query}%`)
      .limit(30);

    if (error) {
      console.error('Error searching users:', error);
      resultsContainer.innerHTML = '<div class="empty-state">Error searching users</div>';
      return;
    }

    if (!users || users.length === 0) {
      resultsContainer.innerHTML = '<div class="empty-state">No users found</div>';
      return;
    }

    const rankedUsers = rankUsers(users, query);
    await renderUserResults(rankedUsers);

  } catch (err) {
    console.error('Error searching users:', err);
    resultsContainer.innerHTML = '<div class="empty-state">Error searching users</div>';
  }
}

function rankUsers(users, query) {
  const lowerQuery = query.toLowerCase();

  return users.sort((a, b) => {
    const aUsername = (a.username || '').toLowerCase();
    const bUsername = (b.username || '').toLowerCase();

    if (aUsername === lowerQuery) return -1;
    if (bUsername === lowerQuery) return 1;

    if (aUsername.startsWith(lowerQuery) && !bUsername.startsWith(lowerQuery)) return -1;
    if (bUsername.startsWith(lowerQuery) && !aUsername.startsWith(lowerQuery)) return 1;

    return aUsername.localeCompare(bUsername);
  });
}

async function renderUserResults(users) {
  const resultsContainer = document.getElementById('userResults');

  const html = await Promise.all(users.map(async (user) => {
    const avatarUrl = user.profile_picture ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username || 'User')}&size=100&background=D5A856&color=000`;

    let followButton = '';
    if (currentUser) {
      if (currentUser.id !== user.id) {
        const isFollowing = await getFollowState(user.id);
        followButton = isFollowing
          ? `<button class="btn-following" onclick="window.toggleFollow('${user.id}', this)">Following</button>`
          : `<button class="btn-follow" onclick="window.toggleFollow('${user.id}', this)">Follow</button>`;
      }
    } else {
      followButton = `<a href="login.html" class="btn-follow">Login to follow</a>`;
    }

    return `
      <div class="user-result-item">
        <img src="${avatarUrl}" alt="${user.username}" class="user-avatar" />
        <div class="user-info">
          <div class="user-username">${user.username}</div>
        </div>
        <div class="user-actions">
          <a href="public_profile.html?user_id=${user.id}" class="btn-view-profile">View Profile</a>
          ${followButton}
        </div>
      </div>
    `;
  }));

  resultsContainer.innerHTML = html.join('');
}

async function getFollowState(targetUserId) {
  if (!currentUser) return false;

  if (followStatesCache[targetUserId] !== undefined) {
    return followStatesCache[targetUserId];
  }

  try {
    const { data, error } = await supabase.rpc('is_following', { target_user_id: targetUserId });

    if (error) {
      console.error('Error checking follow state:', error);
      return false;
    }

    followStatesCache[targetUserId] = data || false;
    return data || false;
  } catch (err) {
    console.error('Error checking follow state:', err);
    return false;
  }
}

window.toggleFollow = async function(targetUserId, button) {
  if (!currentUser) {
    window.location.href = 'login.html';
    return;
  }

  button.disabled = true;
  const wasFollowing = button.classList.contains('btn-following');

  try {
    if (wasFollowing) {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', currentUser.id)
        .eq('following_id', targetUserId);

      if (error) {
        console.error('Error unfollowing:', error);
        button.disabled = false;
        return;
      }

      button.classList.remove('btn-following');
      button.classList.add('btn-follow');
      button.textContent = 'Follow';
      followStatesCache[targetUserId] = false;
    } else {
      const { error } = await supabase
        .from('follows')
        .insert({ follower_id: currentUser.id, following_id: targetUserId });

      if (error) {
        console.error('Error following:', error);
        button.disabled = false;
        return;
      }

      button.classList.remove('btn-follow');
      button.classList.add('btn-following');
      button.textContent = 'Following';
      followStatesCache[targetUserId] = true;
    }
  } catch (err) {
    console.error('Error toggling follow:', err);
  }

  button.disabled = false;
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
