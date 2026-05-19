import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm';
import { awardPoints } from './points-helper.js';

const SUPABASE_URL = 'https://moazswfklpvoperkarlk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vYXpzd2ZrbHB2b3BlcmthcmxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3MDc2MTYsImV4cCI6MjA3OTI4MzYxNn0.7_xrCWwV_elxQ0i4bdQ9Hsv-HGB-qz30a__1aeJ4QiM';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentCategoryId = null;
let currentUser = null;

async function init() {
  const urlParams = new URLSearchParams(window.location.search);
  currentCategoryId = urlParams.get('category_id');

  if (!currentCategoryId) {
    showError('No category specified');
    return;
  }

  const { data: { user } } = await supabase.auth.getUser();
  currentUser = user;

  if (currentUser) {
    document.getElementById('newThreadBtn').classList.add('visible');
  }

  await loadCategory();
  await loadThreads();

  setupEventListeners();
}

function updateMetadata(category) {
  const categoryName = category.title || 'Category';
  const categoryDesc = category.description || 'Explore discussions in this fragrance forum category.';
  const currentUrl = window.location.href;

  const pageTitle = `${categoryName} - MaxParfum Forum`;
  const pageDescription = categoryDesc.length > 160 ? categoryDesc.substring(0, 157) + '...' : categoryDesc;

  document.getElementById('page-title').textContent = pageTitle;
  document.getElementById('page-description').setAttribute('content', pageDescription);
  document.getElementById('page-canonical').setAttribute('href', currentUrl);

  document.getElementById('og-title').setAttribute('content', pageTitle);
  document.getElementById('og-description').setAttribute('content', pageDescription);
  document.getElementById('og-url').setAttribute('content', currentUrl);

  document.getElementById('twitter-title').setAttribute('content', pageTitle);
  document.getElementById('twitter-description').setAttribute('content', pageDescription);
}

async function loadCategory() {
  const loadingState = document.getElementById('loading-state');
  const errorState = document.getElementById('error-state');
  const categoryContent = document.getElementById('category-content');

  try {
    const { data: category, error } = await supabase
      .from('forum_categories')
      .select('*')
      .eq('id', currentCategoryId)
      .maybeSingle();

    if (error) throw error;

    if (!category) {
      showError('Category not found');
      return;
    }

    document.getElementById('categoryTitle').textContent = category.title;
    document.getElementById('categoryDescription').textContent = category.description || '';

    updateMetadata(category);

    loadingState.classList.add('hidden');
    categoryContent.classList.remove('hidden');

  } catch (err) {
    console.error('Error loading category:', err);
    showError('Failed to load category');
  }
}

async function loadThreads() {
  const threadsContainer = document.getElementById('threads-container');

  try {
    const { data: threads, error: threadsError } = await supabase
      .from('forum_threads')
      .select('*')
      .eq('category_id', currentCategoryId)
      .or('is_deleted.is.null,is_deleted.eq.false')
      .order('last_post_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (threadsError) throw threadsError;

    if (!threads || threads.length === 0) {
      threadsContainer.innerHTML = '<div class="empty-state">No threads yet. Be the first to start one!</div>';
      return;
    }

    const userIds = [...new Set(threads.map(t => t.user_id))];
    const { data: users } = await supabase
      .from('users')
      .select('id, username')
      .in('id', userIds);

    const usersMap = {};
    if (users) {
      users.forEach(user => {
        usersMap[user.id] = user.username;
      });
    }

    const { data: postCounts } = await supabase
      .from('forum_posts')
      .select('thread_id')
      .in('thread_id', threads.map(t => t.id));

    const postCountMap = {};
    if (postCounts) {
      postCounts.forEach(post => {
        postCountMap[post.thread_id] = (postCountMap[post.thread_id] || 0) + 1;
      });
    }

    const { data: firstPosts } = await supabase
      .from('forum_posts')
      .select('thread_id, body')
      .in('thread_id', threads.map(t => t.id))
      .or('is_deleted.is.null,is_deleted.eq.false')
      .order('created_at', { ascending: true });

    const firstPostMap = {};
    if (firstPosts) {
      firstPosts.forEach(post => {
        if (!firstPostMap[post.thread_id]) {
          firstPostMap[post.thread_id] = post.body;
        }
      });
    }

    renderThreads(threads, usersMap, postCountMap, firstPostMap);

  } catch (err) {
    console.error('Error loading threads:', err);
    threadsContainer.innerHTML = '<div class="error-state">Failed to load threads</div>';
  }
}

function renderThreads(threads, usersMap, postCountMap, firstPostMap) {
  const threadsContainer = document.getElementById('threads-container');

  const html = threads.map(thread => {
    const username = usersMap[thread.user_id] || 'Unknown User';
    const postCount = postCountMap[thread.id] || 0;
    const lastActivity = thread.last_post_at ? new Date(thread.last_post_at) : new Date(thread.created_at);
    const createdAt = new Date(thread.created_at);
    const firstPost = firstPostMap[thread.id] || '';
    const preview = firstPost.length > 150 ? firstPost.substring(0, 150) + '...' : firstPost;

    return `
      <a href="forum_thread.html?thread_id=${thread.id}" class="thread-card">
        <div class="thread-title">${escapeHtml(thread.title)}</div>
        ${preview ? `<div class="thread-preview">${escapeHtml(preview)}</div>` : ''}
        <div class="thread-meta">
          <div class="meta-item">
            <span>👤</span>
            <span>${escapeHtml(username)}</span>
          </div>
          <div class="meta-item">
            <span>💬</span>
            <span>${postCount} ${postCount === 1 ? 'post' : 'posts'}</span>
          </div>
          <div class="meta-item">
            <span>📅</span>
            <span>Created ${formatTimeAgo(createdAt)}</span>
          </div>
          <div class="meta-item">
            <span>🕒</span>
            <span>Last activity ${formatTimeAgo(lastActivity)}</span>
          </div>
        </div>
      </a>
    `;
  }).join('');

  threadsContainer.innerHTML = `<div class="threads-list">${html}</div>`;
}

function setupEventListeners() {
  const newThreadBtn = document.getElementById('newThreadBtn');
  const newThreadModal = document.getElementById('newThreadModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const newThreadForm = document.getElementById('newThreadForm');

  newThreadBtn.addEventListener('click', () => {
    newThreadModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  });

  const closeModal = () => {
    newThreadModal.classList.remove('active');
    document.body.style.overflow = '';
    newThreadForm.reset();
    document.getElementById('titleError').classList.remove('visible');
    document.getElementById('bodyError').classList.remove('visible');
  };

  closeModalBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);

  newThreadModal.addEventListener('click', (e) => {
    if (e.target === newThreadModal) {
      closeModal();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && newThreadModal.classList.contains('active')) {
      closeModal();
    }
  });

  newThreadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleCreateThread();
  });
}

async function handleCreateThread() {
  const titleInput = document.getElementById('threadTitle');
  const bodyInput = document.getElementById('threadBody');
  const titleError = document.getElementById('titleError');
  const bodyError = document.getElementById('bodyError');
  const createBtn = document.getElementById('createThreadBtn');

  const title = titleInput.value.trim();
  const body = bodyInput.value.trim();

  titleError.classList.remove('visible');
  bodyError.classList.remove('visible');

  let hasError = false;

  if (!title) {
    titleError.classList.add('visible');
    hasError = true;
  }

  if (!body) {
    bodyError.classList.add('visible');
    hasError = true;
  }

  if (hasError) return;

  createBtn.disabled = true;
  createBtn.textContent = 'Creating...';

  try {
    const { data: thread, error: threadError } = await supabase
      .from('forum_threads')
      .insert({
        category_id: currentCategoryId,
        user_id: currentUser.id,
        title: title
      })
      .select()
      .single();

    if (threadError) throw threadError;

    const { error: postError } = await supabase
      .from('forum_posts')
      .insert({
        thread_id: thread.id,
        user_id: currentUser.id,
        body: body
      });

    if (postError) throw postError;

    const { error: updateError } = await supabase
      .from('forum_threads')
      .update({ last_post_at: new Date().toISOString() })
      .eq('id', thread.id);

    if (updateError) throw updateError;

    await awardPoints(
      'thread_created',
      'thread_created',
      thread.id,
      currentUser.id
    );

    document.getElementById('newThreadModal').classList.remove('active');
    document.body.style.overflow = '';
    document.getElementById('newThreadForm').reset();

    await loadThreads();

  } catch (err) {
    console.error('Error creating thread:', err);
    alert('Failed to create thread. Please try again.');
  } finally {
    createBtn.disabled = false;
    createBtn.textContent = 'Create Thread';
  }
}

function showError(message) {
  document.getElementById('loading-state').classList.add('hidden');
  document.getElementById('error-state').textContent = message;
  document.getElementById('error-state').classList.remove('hidden');
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

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
