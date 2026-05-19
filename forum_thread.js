import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm';
import { awardPoints, reversePoints, awardUpvotePoints, reverseUpvotePoints } from './points-helper.js';
const SUPABASE_URL = 'https://moazswfklpvoperkarlk.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vYXpzd2ZrbHB2b3BlcmthcmxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3MDc2MTYsImV4cCI6MjA3OTI4MzYxNn0.7_xrCWwV_elxQ0i4bdQ9Hsv-HGB-qz30a__1aeJ4QiM';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentThreadId = null;
let currentUser = null;
let threadData = null;
let votesMap = {};
let userVotesMap = {};
let allPosts = [];
let usersMap = {};
let currentSortMode = 'top';
let collapsedReplies = new Set();

async function init() {
  const urlParams = new URLSearchParams(window.location.search);
  currentThreadId = urlParams.get('thread_id');

  if (!currentThreadId) {
    showError('No thread specified');
    return;
  }

  const { data: { user } } = await supabase.auth.getUser();
  currentUser = user;

  await loadThread();
  await loadPosts();

  setupEventListeners();
}

function updateMetadata(thread) {
  const threadTitle = thread.title || 'Thread';
  const currentUrl = window.location.href;

  const pageTitle = `${threadTitle} - MaxParfum Forum`;
  const pageDescription = `Join the discussion: ${threadTitle}. Share your thoughts and connect with the MaxParfum fragrance community.`;

  document.getElementById('page-title').textContent = pageTitle;
  document.getElementById('page-description').setAttribute('content', pageDescription);
  document.getElementById('page-canonical').setAttribute('href', currentUrl);

  document.getElementById('og-title').setAttribute('content', pageTitle);
  document.getElementById('og-description').setAttribute('content', pageDescription);
  document.getElementById('og-url').setAttribute('content', currentUrl);

  document.getElementById('twitter-title').setAttribute('content', pageTitle);
  document.getElementById('twitter-description').setAttribute('content', pageDescription);
}

async function loadThread() {
  const loadingState = document.getElementById('loading-state');
  const errorState = document.getElementById('error-state');
  const threadContent = document.getElementById('thread-content');

  try {
    const { data: thread, error: threadError } = await supabase
      .from('forum_threads')
      .select('*')
      .eq('id', currentThreadId)
      .maybeSingle();

    if (threadError) throw threadError;

    if (!thread || thread.is_deleted) {
      showError('Thread not found');
      return;
    }

    threadData = thread;

    const { data: category } = await supabase
      .from('forum_categories')
      .select('id, title')
      .eq('id', thread.category_id)
      .maybeSingle();

    const { data: user } = await supabase
      .from('users')
      .select('id, username')
      .eq('id', thread.user_id)
      .maybeSingle();

    document.getElementById('threadTitle').textContent = thread.title;

    const userLink = user
      ? `<a href="public_profile.html?username=${encodeURIComponent(user.username)}" class="username-link">${escapeHtml(user.username)}</a>`
      : 'Unknown User';

    const metaHtml = `
      <div class="meta-item">
        <span>👤</span>
        <span>${userLink}</span>
      </div>
      <div class="meta-item">
        <span>📅</span>
        <span>Created ${formatTimeAgo(new Date(thread.created_at))}</span>
      </div>
    `;
    document.getElementById('threadMeta').innerHTML = metaHtml;

    if (category) {
      const categoryLink = document.getElementById('categoryLink');
      categoryLink.textContent = category.title;
      categoryLink.href = `forum_category.html?category_id=${category.id}`;
    }

    const backButton = document.getElementById('backButton');
    backButton.href = `forum_category.html?category_id=${thread.category_id}`;

    const deleteBtn = document.getElementById('deleteThreadBtn');
    if (currentUser && currentUser.id === thread.user_id) {
      deleteBtn.classList.add('visible');
    } else {
      deleteBtn.classList.remove('visible');
    }

    updateMetadata(thread);

    loadingState.classList.add('hidden');
    threadContent.classList.remove('hidden');

  } catch (err) {
    console.error('Error loading thread:', err);
    showError('Failed to load thread');
  }
}

async function loadPosts() {
  try {
    const { data: posts, error: postsError } = await supabase
      .from('forum_posts')
      .select('*')
      .eq('thread_id', currentThreadId)
      .order('created_at', { ascending: true });

    if (postsError) throw postsError;

    if (!posts || posts.length === 0) {
      document.getElementById('posts-container').innerHTML = '<div class="empty-state">No posts yet.</div>';
      return;
    }

    const { data: votes, error: votesError } = await supabase
      .from('post_votes')
      .select('*')
      .in('post_id', posts.map(p => p.id));

    if (votesError) throw votesError;

    votesMap = {};
    userVotesMap = {};

    if (votes) {
      votes.forEach(vote => {
        if (!votesMap[vote.post_id]) {
          votesMap[vote.post_id] = 0;
        }
        votesMap[vote.post_id] += vote.value;

        if (currentUser && vote.user_id === currentUser.id) {
          userVotesMap[vote.post_id] = vote.value;
        }
      });
    }

    const userIds = [...new Set(posts.map(p => p.user_id))];
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, username, profile_picture')
      .in('id', userIds);

    if (usersError) throw usersError;

    usersMap = {};
    if (users) {
      users.forEach(u => {
        usersMap[u.id] = u;
      });
    }

    allPosts = posts;

    addPostCountToTitle(posts.length);

    renderAll();

  } catch (err) {
    console.error('Error loading posts:', err);
    document.getElementById('posts-container').innerHTML = '<div class="error-state">Failed to load posts</div>';
  }
}

function renderAll() {
  if (!allPosts || allPosts.length === 0) return;

  const firstPost = allPosts[0];
  const replyPosts = allPosts.slice(1);

  renderOriginalPost(firstPost);

  const postTree = buildPostTree(replyPosts);
  const sortedTree = sortTopLevelReplies(postTree, currentSortMode);

  renderSortControls();
  renderPostTree(sortedTree);
}

function renderOriginalPost(post) {
  const container = document.getElementById('originalPost');
  if (!container || !post) return;

  const user = usersMap[post.user_id] || {};
  const username = user.username || 'Unknown User';
  const userLink = user.username
    ? `<a href="public_profile.html?username=${encodeURIComponent(user.username)}" class="username-link">${escapeHtml(username)}</a>`
    : escapeHtml(username);

  container.innerHTML = `
    <div class="original-post-card">
      <div class="original-post-body">
        ${escapeHtml(post.body || '')}
      </div>
      <div class="original-post-meta">
        Posted by ${userLink} • ${formatTimeAgo(new Date(post.created_at))}
      </div>
    </div>
  `;

  showReplySection();
}

function showReplySection() {
  const replySection = document.getElementById('replySection');
  const loginSection = document.getElementById('loginSection');

  if (currentUser) {
    replySection.classList.remove('hidden');
    loginSection.classList.add('hidden');
  } else {
    replySection.classList.add('hidden');
    loginSection.classList.remove('hidden');
  }
}

function renderSortControls() {
  const container = document.getElementById('posts-container');

  const topLevelCount = allPosts.slice(1).filter(p => !p.parent_post_id).length;

  if (topLevelCount === 0) {
    container.innerHTML = '';
    return;
  }

  const sortControlsHtml = `
    <div class="sort-controls">
      <span class="sort-label">Sort by:</span>
      <button class="sort-btn ${currentSortMode === 'top' ? 'active' : ''}" data-sort="top">Top</button>
      <button class="sort-btn ${currentSortMode === 'newest' ? 'active' : ''}" data-sort="newest">Newest</button>
    </div>
  `;

  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = sortControlsHtml;

  return tempDiv.firstElementChild;
}

function buildPostTree(posts) {
  const tree = [];
  const postsById = {};

  posts.forEach(post => {
    post.children = [];
    postsById[post.id] = post;
  });

  posts.forEach(post => {
    if (!post.parent_post_id) {
      tree.push(post);
    } else if (postsById[post.parent_post_id]) {
      postsById[post.parent_post_id].children.push(post);
    }
  });

  return tree;
}

function sortTopLevelReplies(tree, mode) {
  const sorted = [...tree];

  if (mode === 'top') {
    sorted.sort((a, b) => {
      const scoreA = votesMap[a.id] || 0;
      const scoreB = votesMap[b.id] || 0;
      if (scoreB !== scoreA) {
        return scoreB - scoreA;
      }
      return new Date(a.created_at) - new Date(b.created_at);
    });
  } else if (mode === 'newest') {
    sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  return sorted;
}

function renderPostTree(posts) {
  const container = document.getElementById('posts-container');

  if (!posts || posts.length === 0) {
    container.innerHTML = '';
    return;
  }

  const sortControls = renderSortControls();
  const postsHtml = posts.map(post => renderPost(post)).join('');

  container.innerHTML = '';
  container.appendChild(sortControls);

  const postsWrapper = document.createElement('div');
  postsWrapper.innerHTML = postsHtml;
  container.appendChild(postsWrapper);

  attachVoteListeners(container);
  attachReplyListeners(container);
  attachEditDeleteListeners(container);
  attachToggleListeners(container);
}

function renderPost(post, depth = 0) {
  const user = usersMap[post.user_id] || {};
  const username = user.username || 'Unknown User';
  const profilePic = user.profile_picture || '';
  const isDeleted = post.is_deleted;
  const isOwner = currentUser && currentUser.id === post.user_id;
  const score = votesMap[post.id] || 0;
  const userVote = userVotesMap[post.id] || 0;

  const avatarStyle = profilePic
    ? `background-image: url(${profilePic}); background-size: cover; background-position: center;`
    : '';

  const userLink = user.username
    ? `<a href="public_profile.html?username=${encodeURIComponent(user.username)}" class="username-link">${escapeHtml(username)}</a>`
    : escapeHtml(username);

  const hasChildren = post.children && post.children.length > 0;
  const childCount = hasChildren ? post.children.length : 0;
  const isCollapsed = collapsedReplies.has(post.id);

  let childrenHtml = '';
  if (hasChildren) {
    const toggleHtml = `
      <button class="replies-toggle ${isCollapsed ? '' : 'expanded'}" data-toggle-replies="${post.id}">
        ${isCollapsed ? `View ${childCount} ${childCount === 1 ? 'reply' : 'replies'}` : `Hide ${childCount} ${childCount === 1 ? 'reply' : 'replies'}`}
      </button>
    `;

    const childrenContent = post.children.map(child => renderPost(child, depth + 1)).join('');
    childrenHtml = `
      ${toggleHtml}
      <div class="nested-replies ${isCollapsed ? 'collapsed' : ''}" data-replies-container="${post.id}">
        ${childrenContent}
      </div>
    `;
  }

  return `
    <div class="post-card" data-post-id="${post.id}">
      <div class="post-header">
        <div class="post-avatar" style="${avatarStyle}"></div>
        <div class="post-header-info">
          <div class="post-author">${userLink}</div>
          <div class="post-timestamp">${formatTimeAgo(new Date(post.created_at))}</div>
        </div>
      </div>
      <div class="post-body ${isDeleted ? 'post-deleted' : ''}" data-post-body>
        ${isDeleted ? 'This post has been deleted' : escapeHtml(post.body || '')}
      </div>
      <div class="edit-form" data-edit-form>
        <textarea class="edit-textarea" data-edit-textarea>${escapeHtml(post.body || '')}</textarea>
        <div class="edit-actions">
          <button class="btn btn-primary" data-save-edit>Save</button>
          <button class="btn btn-secondary" data-cancel-edit>Cancel</button>
        </div>
      </div>
      ${!isDeleted ? `
        <div class="post-actions">
          <div class="post-vote-controls">
            <button class="vote-btn ${userVote === 1 ? 'upvoted' : ''}" data-post-id="${post.id}" data-vote="1" ${!currentUser ? 'disabled' : ''} title="${currentUser ? 'Upvote' : 'Log in to vote'}">▲</button>
            <span class="vote-score">${score}</span>
            <button class="vote-btn ${userVote === -1 ? 'downvoted' : ''}" data-post-id="${post.id}" data-vote="-1" ${!currentUser ? 'disabled' : ''} title="${currentUser ? 'Downvote' : 'Log in to vote'}">▼</button>
          </div>
          ${currentUser ? `<button class="post-action-btn" data-reply-to="${post.id}">Reply</button>` : ''}
          ${isOwner ? `
            <button class="post-action-btn" data-edit-btn>Edit</button>
            <button class="post-action-btn" data-delete-btn>Delete</button>
          ` : ''}
        </div>
        <div class="reply-form" data-reply-form="${post.id}">
          <textarea class="reply-form-textarea" placeholder="Write your reply..." data-reply-textarea="${post.id}"></textarea>
          <div class="reply-form-actions">
            <button class="btn btn-primary btn-sm" data-submit-reply="${post.id}">Post Reply</button>
            <button class="btn btn-secondary btn-sm" data-cancel-reply="${post.id}">Cancel</button>
          </div>
        </div>
      ` : ''}
      ${childrenHtml}
    </div>
  `;
}

function attachVoteListeners(container) {
  container.querySelectorAll('.vote-btn').forEach(btn => {
    btn.addEventListener('click', handleVote);
  });
}

function attachReplyListeners(container) {
  container.querySelectorAll('[data-reply-to]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (!currentUser) {
        alert('Please log in to reply');
        return;
      }
      const postId = e.target.getAttribute('data-reply-to');
      toggleReplyForm(postId);
    });
  });

  container.querySelectorAll('[data-submit-reply]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const postId = e.target.getAttribute('data-submit-reply');
      handleSubmitReply(postId);
    });
  });

  container.querySelectorAll('[data-cancel-reply]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const postId = e.target.getAttribute('data-cancel-reply');
      toggleReplyForm(postId);
    });
  });
}

function attachEditDeleteListeners(container) {
  container.querySelectorAll('[data-edit-btn]').forEach(btn => {
    btn.addEventListener('click', handleEditClick);
  });

  container.querySelectorAll('[data-delete-btn]').forEach(btn => {
    btn.addEventListener('click', handleDeleteClick);
  });

  container.querySelectorAll('[data-save-edit]').forEach(btn => {
    btn.addEventListener('click', handleSaveEdit);
  });

  container.querySelectorAll('[data-cancel-edit]').forEach(btn => {
    btn.addEventListener('click', handleCancelEdit);
  });
}

function attachToggleListeners(container) {
  container.querySelectorAll('[data-toggle-replies]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const postId = e.target.getAttribute('data-toggle-replies');
      toggleRepliesVisibility(postId);
    });
  });
}

function toggleRepliesVisibility(postId) {
  const toggle = document.querySelector(`[data-toggle-replies="${postId}"]`);
  const repliesContainer = document.querySelector(`[data-replies-container="${postId}"]`);

  if (!toggle || !repliesContainer) return;

  const isCurrentlyCollapsed = collapsedReplies.has(postId);

  if (isCurrentlyCollapsed) {
    collapsedReplies.delete(postId);
    repliesContainer.classList.remove('collapsed');
    toggle.classList.add('expanded');
  } else {
    collapsedReplies.add(postId);
    repliesContainer.classList.add('collapsed');
    toggle.classList.remove('expanded');
  }

  const post = findPostById(postId);
  if (post && post.children) {
    const childCount = post.children.length;
    toggle.textContent = isCurrentlyCollapsed
      ? `Hide ${childCount} ${childCount === 1 ? 'reply' : 'replies'}`
      : `View ${childCount} ${childCount === 1 ? 'reply' : 'replies'}`;
  }
}

function findPostById(postId) {
  return allPosts.find(p => p.id === postId);
}

function toggleReplyForm(postId) {
  const form = document.querySelector(`[data-reply-form="${postId}"]`);
  if (form) {
    form.classList.toggle('active');
    if (form.classList.contains('active')) {
      const textarea = form.querySelector(`[data-reply-textarea="${postId}"]`);
      if (textarea) textarea.focus();
    }
  }
}

async function handleSubmitReply(parentPostId) {
  const textarea = document.querySelector(`[data-reply-textarea="${parentPostId}"]`);
  const button = document.querySelector(`[data-submit-reply="${parentPostId}"]`);

  if (!textarea || !button) return;

  const body = textarea.value.trim();
  if (!body) {
    alert('Please enter a reply');
    return;
  }

  button.disabled = true;
  button.textContent = 'Posting...';

  try {
    const { data: newPost, error: postError } = await supabase
      .from('forum_posts')
      .insert({
        thread_id: currentThreadId,
        user_id: currentUser.id,
        parent_post_id: parentPostId,
        body: body
      })
      .select()
      .single();

    if (postError) throw postError;

    const { error: updateError } = await supabase
      .from('forum_threads')
      .update({ last_post_at: new Date().toISOString() })
      .eq('id', currentThreadId);

    if (updateError) throw updateError;

    await awardPoints(
      'reply_created',
      'reply_created',
      newPost.id,
      currentUser.id
    );

    textarea.value = '';
    toggleReplyForm(parentPostId);

    if (collapsedReplies.has(parentPostId)) {
      collapsedReplies.delete(parentPostId);
    }

    await loadPosts();

  } catch (err) {
    console.error('Error posting reply:', err);
    alert('Failed to post reply. Please try again.');
  } finally {
    button.disabled = false;
    button.textContent = 'Post Reply';
  }
}

async function handleVote(e) {
  if (!currentUser) {
    alert('Please log in to vote');
    return;
  }

  const btn = e.currentTarget;
  const postId = btn.getAttribute('data-post-id');
  const voteValue = parseInt(btn.getAttribute('data-vote'));
  const currentVote = userVotesMap[postId] || 0;

  const post = allPosts.find(p => p.id === postId);
  if (!post) return;

  const isOriginalPost = !post.parent_post_id;
  const contentType = isOriginalPost ? 'thread' : 'reply';

  let newVote = voteValue;
  if (currentVote === voteValue) {
    newVote = 0;
  }

  try {
    if (newVote === 0) {
      const { error } = await supabase
        .from('post_votes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', currentUser.id);

      if (error) throw error;

      if (currentVote === 1) {
        await reverseUpvotePoints(post.user_id, contentType, postId, currentUser.id);
      }
    } else {
      const { error } = await supabase
        .from('post_votes')
        .upsert({
          post_id: postId,
          user_id: currentUser.id,
          value: newVote,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'post_id,user_id'
        });

      if (error) throw error;

      if (newVote === 1 && currentVote !== 1) {
        await awardUpvotePoints(post.user_id, contentType, postId, currentUser.id);
      } else if (currentVote === 1 && newVote !== 1) {
        await reverseUpvotePoints(post.user_id, contentType, postId, currentUser.id);
      }
    }

    const scoreDiff = newVote - currentVote;
    votesMap[postId] = (votesMap[postId] || 0) + scoreDiff;
    userVotesMap[postId] = newVote;

    const postCard = btn.closest('.post-card, .original-post-card');
    if (postCard) {
      const scoreEl = postCard.querySelector('.vote-score');
      if (scoreEl) {
        scoreEl.textContent = votesMap[postId];
      }

      const upBtn = postCard.querySelector(`[data-post-id="${postId}"][data-vote="1"]`);
      const downBtn = postCard.querySelector(`[data-post-id="${postId}"][data-vote="-1"]`);

      if (upBtn) {
        upBtn.classList.toggle('upvoted', newVote === 1);
      }
      if (downBtn) {
        downBtn.classList.toggle('downvoted', newVote === -1);
      }
    }

    if (currentSortMode === 'top') {
      renderAll();
    }

  } catch (err) {
    console.error('Error voting:', err);
    alert('Failed to vote. Please try again.');
  }
}

function handleEditClick(e) {
  const postCard = e.target.closest('.post-card');
  const postBody = postCard.querySelector('[data-post-body]');
  const editForm = postCard.querySelector('[data-edit-form]');

  postBody.style.display = 'none';
  editForm.classList.add('active');
}

function handleCancelEdit(e) {
  const postCard = e.target.closest('.post-card');
  const postBody = postCard.querySelector('[data-post-body]');
  const editForm = postCard.querySelector('[data-edit-form]');

  postBody.style.display = 'block';
  editForm.classList.remove('active');
}

async function handleSaveEdit(e) {
  const postCard = e.target.closest('.post-card');
  const postId = postCard.dataset.postId;
  const textarea = postCard.querySelector('[data-edit-textarea]');
  const newBody = textarea.value.trim();

  if (!newBody) {
    alert('Post cannot be empty');
    return;
  }

  e.target.disabled = true;
  e.target.textContent = 'Saving...';

  try {
    const { error } = await supabase
      .from('forum_posts')
      .update({
        body: newBody,
        updated_at: new Date().toISOString()
      })
      .eq('id', postId);

    if (error) throw error;

    const postBody = postCard.querySelector('[data-post-body]');
    postBody.textContent = newBody;
    postBody.style.display = 'block';

    const editForm = postCard.querySelector('[data-edit-form]');
    editForm.classList.remove('active');

  } catch (err) {
    console.error('Error updating post:', err);
    alert('Failed to update post. Please try again.');
  } finally {
    e.target.disabled = false;
    e.target.textContent = 'Save';
  }
}

async function handleDeleteClick(e) {
  const confirmed = await showConfirmModal('Are you sure you want to delete this post?');
  if (!confirmed) {
    return;
  }

  const postCard = e.target.closest('.post-card');
  const postId = postCard.dataset.postId;

  const post = allPosts.find(p => p.id === postId);
  if (!post) return;

  e.target.disabled = true;

  try {
    const { error } = await supabase
      .from('forum_posts')
      .update({ is_deleted: true })
      .eq('id', postId);

    if (error) throw error;

    await reversePoints(
      'reply_created',
      'reply_created',
      postId,
      post.user_id
    );

    const postBody = postCard.querySelector('[data-post-body]');
    postBody.textContent = 'This post has been deleted';
    postBody.classList.add('post-deleted');

    const actions = postCard.querySelector('.post-actions');
    if (actions) actions.remove();

  } catch (err) {
    console.error('Error deleting post:', err);
    alert('Failed to delete post. Please try again.');
    e.target.disabled = false;
  }
}

function setupEventListeners() {
  const deleteThreadBtn = document.getElementById('deleteThreadBtn');
  const postReplyBtn = document.getElementById('postReplyBtn');

  document.addEventListener('click', (e) => {
    if (e.target.matches('[data-sort]')) {
      const newMode = e.target.getAttribute('data-sort');
      if (newMode !== currentSortMode) {
        currentSortMode = newMode;
        renderAll();
      }
    }
  });

  if (postReplyBtn) {
    postReplyBtn.addEventListener('click', handleMainReplyClick);
  }

  if (deleteThreadBtn) {
    deleteThreadBtn.addEventListener('click', async () => {
      if (!currentUser || !threadData || currentUser.id !== threadData.user_id) {
        return;
      }

      const confirmed = await showConfirmModal('Are you sure you want to delete this thread and all its posts?');
      if (!confirmed) return;

      deleteThreadBtn.disabled = true;

      try {
  const { data: threadPosts, error: threadPostsError } = await supabase
    .from('forum_posts')
    .select('id, user_id, is_deleted')
    .eq('thread_id', currentThreadId)
    .eq('is_deleted', false);

  if (threadPostsError) throw threadPostsError;

  const { error: threadError } = await supabase
    .from('forum_threads')
    .update({ is_deleted: true })
    .eq('id', currentThreadId);

  if (threadError) throw threadError;

  const { error: postsError } = await supabase
    .from('forum_posts')
    .update({ is_deleted: true })
    .eq('thread_id', currentThreadId);

  if (postsError) throw postsError;

  for (const post of (threadPosts || [])) {
    if (!post.user_id) continue;

    await reversePoints(
      'reply_created',
      'reply_created',
      post.id,
      post.user_id
    );
  }

  await reversePoints(
    'thread_created',
    'thread_created',
    currentThreadId,
    threadData.user_id
  );

  window.location.href = `forum_category.html?category_id=${threadData.category_id}`;

} catch (err) {
  console.error('Error deleting thread:', err);
  alert('Failed to delete thread. Please try again.');
  deleteThreadBtn.disabled = false;
}
    });
  }

  setupConfirmModal();
}

function setupConfirmModal() {
  const modal = document.getElementById('confirmModal');
  const cancelBtn = document.getElementById('confirmCancelBtn');

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      hideConfirmModal();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      hideConfirmModal();
    }
  });

  if (cancelBtn) {
    cancelBtn.addEventListener('click', hideConfirmModal);
  }
}

function showConfirmModal(message) {
  return new Promise((resolve) => {
    const modal = document.getElementById('confirmModal');
    const messageEl = document.getElementById('confirmMessage');
    const confirmBtn = document.getElementById('confirmConfirmBtn');

    messageEl.textContent = message;
    modal.classList.add('active');

    const handleConfirm = () => {
      cleanup();
      resolve(true);
    };

    const handleCancel = () => {
      cleanup();
      resolve(false);
    };

    const cleanup = () => {
      modal.classList.remove('active');
      confirmBtn.removeEventListener('click', handleConfirm);
      window.removeEventListener('confirmCancel', handleCancel);
    };

    confirmBtn.addEventListener('click', handleConfirm);
    window.addEventListener('confirmCancel', handleCancel, { once: true });
  });
}

function hideConfirmModal() {
  const modal = document.getElementById('confirmModal');
  modal.classList.remove('active');
  window.dispatchEvent(new Event('confirmCancel'));
}

async function handleMainReplyClick() {
  const textarea = document.getElementById('replyTextarea');
  const button = document.getElementById('postReplyBtn');

  if (!textarea || !button) return;

  const body = textarea.value.trim();

  if (!body) {
    alert('Please enter a reply');
    return;
  }

  if (!currentUser) {
    alert('You must be logged in to reply.');
    return;
  }

  button.disabled = true;
  button.textContent = 'Posting...';

  try {
    const { data: newPost, error: postError } = await supabase
      .from('forum_posts')
      .insert({
        thread_id: currentThreadId,
        user_id: currentUser.id,
        parent_post_id: null,
        body: body
      })
      .select()
      .single();

    if (postError) throw postError;

    const { error: updateError } = await supabase
      .from('forum_threads')
      .update({ last_post_at: new Date().toISOString() })
      .eq('id', currentThreadId);

    if (updateError) throw updateError;

    await awardPoints(
      'reply_created',
      'reply_created',
      newPost.id,
      currentUser.id
    );

    textarea.value = '';
    await loadPosts();

  } catch (err) {
    console.error('Error posting reply:', err);
    alert('Failed to post reply. Please try again.');
  } finally {
    button.disabled = false;
    button.textContent = 'Post Reply';
  }
}

function addPostCountToTitle(totalPosts) {
  const titleEl = document.getElementById('threadTitle');
  if (!titleEl) return;

  const existing = titleEl.querySelector('.thread-post-count');
  if (existing) existing.remove();

  const span = document.createElement('span');
  span.className = 'thread-post-count';
  span.textContent = `  💬 ${totalPosts} ${totalPosts === 1 ? 'post' : 'posts'}`;
  titleEl.appendChild(span);
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
  div.textContent = text == null ? '' : String(text);
  return div.innerHTML;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
