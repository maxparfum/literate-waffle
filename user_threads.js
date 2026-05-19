import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm';

const SUPABASE_URL = 'https://moazswfklpvoperkarlk.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vYXpzd2ZrbHB2b3BlcmthcmxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3MDc2MTYsImV4cCI6MjA3OTI4MzYxNn0.7_xrCWwV_elxQ0i4bdQ9Hsv-HGB-qz30a__1aeJ4QiM';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let targetUserId = null;

function getUserAvatarUrl(user) {
  if (user.profile_picture) {
    return user.profile_picture;
  }
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username || 'User')}&size=64&background=D5A856&color=000`;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function init() {
  try {
    const params = new URLSearchParams(window.location.search);
    targetUserId = params.get('user_id');

    if (!targetUserId) {
      showError();
      return;
    }

    await loadUserAndThreads(targetUserId);
  } catch (err) {
    console.error('Error initializing:', err);
    showError();
  }
}

async function loadUserAndThreads(userId) {
  try {
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, username, profile_picture')
      .eq('id', userId)
      .maybeSingle();

    if (userError || !user) {
      console.error('Error loading user:', userError);
      showError();
      return;
    }

    renderUserHeader(user);

    const { data: threads, error: threadsError } = await supabase
      .from('forum_threads')
      .select('id, title, created_at')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (threadsError) {
      console.error('Error loading threads:', threadsError);
      showError();
      return;
    }

    document.getElementById('loadingState').classList.add('hidden');
    document.getElementById('contentContainer').classList.remove('hidden');

    if (!threads || threads.length === 0) {
      document.getElementById('emptyState').classList.remove('hidden');
      return;
    }

    const threadsWithPosts = await Promise.all(
      threads.map(async (thread) => {
        const { data: firstPost } = await supabase
          .from('forum_posts')
          .select('body')
          .eq('thread_id', thread.id)
          .is('parent_post_id', null)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        const { count: postCount } = await supabase
          .from('forum_posts')
          .select('*', { count: 'exact', head: true })
          .eq('thread_id', thread.id);

        return {
          ...thread,
          snippet: firstPost?.body || '',
          postCount: postCount || 0,
        };
      })
    );

    renderThreads(threadsWithPosts);
  } catch (err) {
    console.error('Error loading data:', err);
    showError();
  }
}

function renderUserHeader(user) {
  const avatarUrl = getUserAvatarUrl(user);
  const container = document.getElementById('userInfoHeader');

  container.innerHTML = `
    <img src="${avatarUrl}" alt="${escapeHtml(user.username)}" class="user-avatar" />
    <div>
      <div class="user-name">${escapeHtml(user.username)}</div>
      <a href="public_profile.html?user_id=${user.id}" style="color: #D5A856; text-decoration: none; font-size: 0.9rem;">View Profile →</a>
    </div>
  `;
}

function renderThreads(threads) {
  const container = document.getElementById('threadsList');

  container.innerHTML = threads
    .map((thread) => {
      const snippet = thread.snippet.substring(0, 200) + (thread.snippet.length > 200 ? '...' : '');
      const date = new Date(thread.created_at).toLocaleDateString();
      const replies = thread.postCount > 1 ? thread.postCount - 1 : 0;

      return `
        <a href="forum_thread.html?id=${thread.id}" class="thread-item">
          <div class="thread-title">${escapeHtml(thread.title)}</div>
          ${snippet ? `<div class="thread-snippet">${escapeHtml(snippet)}</div>` : ''}
          <div class="thread-meta">
            <span>Posted ${date}</span>
            <span>${replies} ${replies === 1 ? 'reply' : 'replies'}</span>
          </div>
        </a>
      `;
    })
    .join('');
}

function showError() {
  document.getElementById('loadingState').classList.add('hidden');
  document.getElementById('contentContainer').classList.add('hidden');
  document.getElementById('errorState').classList.remove('hidden');
}

init();
