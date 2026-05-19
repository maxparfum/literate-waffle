import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm';
import { makeCanonicalFragranceId, makeFragranceUrl } from './fragrance-id-utils.js';

const SUPABASE_URL = 'https://moazswfklpvoperkarlk.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vYXpzd2ZrbHB2b3BlcmthcmxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3MDc2MTYsImV4cCI6MjA3OTI4MzYxNn0.7_xrCWwV_elxQ0i4bdQ9Hsv-HGB-qz30a__1aeJ4QiM';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let targetUserId = null;
let fragrancesData = [];

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

    await loadFragrancesData();
await loadUserAndComments(targetUserId);
  } catch (err) {
    console.error('Error initializing:', err);
    showError();
  }
}

async function loadUserAndComments(userId) {
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

    const { data: comments, error: commentsError } = await supabase
      .from('comments')
      .select('id, comment, fragrance_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (commentsError) {
      console.error('Error loading comments:', commentsError);
      showError();
      return;
    }

    document.getElementById('loadingState').classList.add('hidden');
    document.getElementById('contentContainer').classList.remove('hidden');

    if (!comments || comments.length === 0) {
      document.getElementById('emptyState').classList.remove('hidden');
      return;
    }

    renderComments(comments);
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

function renderComments(comments) {
  const container = document.getElementById('commentsList');

  container.innerHTML = comments
    .map((comment) => {
      const content = comment.comment.substring(0, 300) + (comment.comment.length > 300 ? '...' : '');
      const date = new Date(comment.created_at).toLocaleDateString();

      const fragranceLink = getFragranceLinkData(comment.fragrance_id);

return `
  <a href="${fragranceLink.url}" class="thread-item">
    <div class="thread-title">Comment on ${escapeHtml(fragranceLink.label || comment.fragrance_id)}</div>
    <div class="thread-snippet">${escapeHtml(content)}</div>
    <div class="thread-meta">
      <span>Posted ${date}</span>
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
async function loadFragrancesData() {
  try {
    const response = await fetch('fragrances_merged.json');
    fragrancesData = await response.json();
  } catch (err) {
    console.error('Error loading fragrances data:', err);
    fragrancesData = [];
  }
} 
function getFragranceLinkData(fragranceId) {
  if (!fragranceId) {
    return {
      url: 'fragrance.html',
      label: ''
    };
  }

  const match = fragrancesData.find(
    (f) => makeCanonicalFragranceId(f.brand, f.name) === String(fragranceId).trim().toLowerCase()
  );

  if (match) {
    return {
      url: makeFragranceUrl(match.brand, match.name),
      label: `${match.brand} - ${match.name}`
    };
  }

  return {
    url: 'fragrance.html',
    label: String(fragranceId)
  };
}