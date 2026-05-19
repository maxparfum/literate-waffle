import { supabase } from './supabase.js';
import { awardPoints } from './points-helper.js';
import { isUserAdmin, saveImageOverride } from './fragrance-image-override.js';
import { makeCanonicalFragranceId, resolveFragranceFromParams, parseFragranceDisplay } from './fragrance-id-utils.js';

let currentUser = null;
let fragranceId = '';
let currentUserRating = null;
let isAdmin = false;
let currentFragranceBrand = '';
let currentFragranceName = '';
let fragrancesDatabase = [];

function getCanonicalFragranceId() {
  // Prefer the on-page display name (Brand - Name) if available
  const display = fragranceDisplayName || getFragranceDisplayName();
  if (!display) return fragranceId;

  const parsed = parseFragranceDisplay(display);
  if (!parsed) return fragranceId;

  return makeCanonicalFragranceId(parsed.brand, parsed.name);
}

function getUserAvatarUrl(user) {
  if (user && user.profile_picture) {
    return user.profile_picture;
  }
  const username = user && user.username ? user.username : 'User';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&size=64&background=D5A856&color=000`;
}

function renderUserLink(user) {
  if (!user || !user.id) {
    return '<span class="comment-author">Anonymous</span>';
  }

  const avatarUrl = getUserAvatarUrl(user);
  const username = user.username || 'User';

  return `
    <div class="user-link-container">
      <img src="${avatarUrl}" alt="${escapeHtml(username)}" class="user-avatar" />
      <a href="public_profile.html?user_id=${user.id}" class="comment-author-link">${escapeHtml(username)}</a>
    </div>
  `;
}


async function init() {
  // Load fragrances database for ID resolution
  try {
    const response = await fetch('./fragrances_merged.json');
    fragrancesDatabase = await response.json();
  } catch (err) {
    console.warn('Could not load fragrances database for ID resolution', err);
    fragrancesDatabase = [];
  }

  const params = new URLSearchParams(window.location.search);
  const resolved = resolveFragranceFromParams(params, fragrancesDatabase);

  if (!resolved) {
    console.error('No fragrance ID found in URL');
    return;
  }

  fragranceId = resolved.canonicalId;
  currentFragranceBrand = resolved.brand;
  currentFragranceName = resolved.name;

  console.log('Resolved fragrance:', { fragranceId, brand: currentFragranceBrand, name: currentFragranceName });

  if (!fragranceId) {
    console.error('No fragrance ID found in URL');
    return;
  }

  const { data: { session } } = await supabase.auth.getSession();
  currentUser = session?.user || null;

  if (currentUser) {
    isAdmin = await isUserAdmin(currentUser);
    if (isAdmin) {
      setupAdminImageEdit();
    }
  }

  await loadRatings();
  setupEventListeners();
  await loadSeasonPerformanceRatings();
  setupSeasonPerformanceListeners();
  await loadWearabilityRatings();
  setupWearabilityListeners();
  await loadCollectionState();
  setupCollectionListeners();
  await loadComments();
  setupCommentListeners();
  setupSortTabListeners();
  setupCommentsToggle();
  setupSaveCollectionListeners();
}

async function loadRatings() {
  try {
    const { data: ratings, error } = await supabase
      .from('ratings')
      .select('*')
      .eq('fragrance_id', fragranceId);

    if (error) {
      console.error('Error fetching ratings:', error);
      updateUserRatingMessage('Error loading ratings', 'info');
      updateRatingStats(0, 0);
      return;
    }

    const totalRatings = ratings.length;
    const averageRating = totalRatings > 0
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings
      : 0;

    updateRatingStats(averageRating, totalRatings);
    updateRatingDistribution(ratings);

    if (currentUser) {
      const userRating = ratings.find(r => r.user_id === currentUser.id);
      currentUserRating = userRating?.rating || null;

      if (currentUserRating) {
        updateUserStars(currentUserRating);
        updateUserRatingMessage('', 'info');
      } else {
        updateUserStars(0);
        updateUserRatingMessage('Click a star to rate this fragrance', 'info');
      }
    } else {
      updateUserStars(0);
      updateUserRatingMessage('Please log in to rate this fragrance', 'info');
    }

    updateAverageStars(averageRating);
  } catch (err) {
    console.error('Unexpected error loading ratings:', err);
    updateUserRatingMessage('Error loading ratings', 'info');
    updateRatingStats(0, 0);
  }
}

function updateUserStars(rating) {
  const stars = document.querySelectorAll('#user-rating-stars .star');
  stars.forEach((star, index) => {
    if (index < rating) {
      star.classList.add('filled');
    } else {
      star.classList.remove('filled');
    }
  });
}

function updateAverageStars(averageRating) {
  const stars = document.querySelectorAll('#average-rating-stars .star');
  const fullStars = Math.floor(averageRating);
  const partialFill = averageRating - fullStars;

  stars.forEach((star, index) => {
    star.classList.remove('filled', 'partial');
    star.style.removeProperty('--partial-fill');

    if (index < fullStars) {
      star.classList.add('filled');
    } else if (index === fullStars && partialFill > 0) {
      star.classList.add('partial');
      const percentage = partialFill * 100;

      const existingOverlay = star.querySelector('.partial-overlay');
      if (existingOverlay) {
        existingOverlay.remove();
      }

      const overlay = document.createElement('div');
      overlay.className = 'partial-overlay';
      overlay.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: ${percentage}%;
        height: 100%;
        overflow: hidden;
        pointer-events: none;
      `;

      const clonedSvg = star.querySelector('svg').cloneNode(true);
      clonedSvg.style.cssText = `
        fill: #ffd700;
        stroke: #ffd700;
        width: ${100 / partialFill}%;
        height: 100%;
      `;
      overlay.appendChild(clonedSvg);
      star.appendChild(overlay);
    }
  });
}

function updateRatingStats(average, count) {
  const statsEl = document.getElementById('rating-stats');
  if (count === 0) {
    statsEl.textContent = 'No ratings yet';
  } else {
    statsEl.textContent = `${average.toFixed(1)} / 5 · ${count} rating${count !== 1 ? 's' : ''}`;
  }
}

function updateRatingDistribution(ratings = []) {
  const container = document.getElementById('ratingDistribution');
  if (!container) return;

  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  ratings.forEach(r => {
    const value = Number(r?.rating);
    if (!Number.isFinite(value)) return;

    const roundedRating = Math.min(5, Math.max(1, Math.round(value)));
    counts[roundedRating] += 1;
  });

  const total = ratings.length;

  container.querySelectorAll('.dist-row').forEach(row => {
    const stars = Number(row.dataset.stars);
    const fill = row.querySelector('.dist-fill');
    const percentLabel = row.querySelector('.dist-percent');

    const count = counts[stars] || 0;
    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

    if (fill) fill.style.width = `${percentage}%`;
    if (percentLabel) percentLabel.textContent = `${percentage}%`;
  });
}

function updateUserRatingMessage(message, type = 'info') {
  const messageEl = document.getElementById('user-rating-message');
  messageEl.textContent = message;
  messageEl.className = `rating-message ${type}`;
}

function setupEventListeners() {
  const userStars = document.querySelectorAll('#user-rating-stars .star');

  userStars.forEach((star, index) => {
    star.addEventListener('mouseenter', () => {
      if (!currentUser) return;

      userStars.forEach((s, i) => {
        if (i <= index) {
          s.classList.add('hover');
        } else {
          s.classList.remove('hover');
        }
      });
    });

    star.addEventListener('mouseleave', () => {
      userStars.forEach(s => s.classList.remove('hover'));
    });

    star.addEventListener('click', async () => {
      if (!currentUser) {
        updateUserRatingMessage('Please log in to rate this fragrance', 'info');
        return;
      }

      const rating = parseInt(star.dataset.rating);
      await saveRating(rating);
    });
  });
}

async function saveRating(rating) {
  try {
    updateUserRatingMessage('Saving...', 'info');

    const { error } = await supabase
      .from('ratings')
      .upsert({
        user_id: currentUser.id,
        fragrance_id: fragranceId,
        fragrance_brand: currentFragranceBrand || null,
        fragrance_name: currentFragranceName || null,
        rating: rating
      }, {
        onConflict: 'user_id,fragrance_id'
      });

    if (error) {
      console.error('Error saving rating:', error);
      updateUserRatingMessage('Failed to save rating. Please try again.', 'info');
      return;
    }

    await awardPoints(
      'fragrance_rating',
      'fragrance_rating',
      `${currentUser.id}:${fragranceId}`,
      currentUser.id
    );

    currentUserRating = rating;
    updateUserStars(rating);
    updateUserRatingMessage('Your rating has been saved', 'success');

    await loadRatings();

    setTimeout(() => {
      if (document.getElementById('user-rating-message').classList.contains('success')) {
        updateUserRatingMessage('', 'info');
      }
    }, 3000);
  } catch (err) {
    console.error('Unexpected error saving rating:', err);
    updateUserRatingMessage('Failed to save rating. Please try again.', 'info');
  }
}

async function loadComments() {
  try {
    const { data: comments, error } = await supabase
      .from('comments')
      .select('*, users:user_id (id, username, profile_picture)')
      .eq('fragrance_id', fragranceId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching comments:', error);
      document.getElementById('comments-list').innerHTML = '<p>Error loading comments</p>';
      return;
    }

    const commentIds = comments.map(c => c.id);

    const { data: likeCounts, error: likeCountError } = await supabase
      .from('comment_likes')
      .select('comment_id')
      .in('comment_id', commentIds);

    if (likeCountError) {
      console.error('Error fetching like counts:', likeCountError);
    }

    const likeCountMap = {};
    if (likeCounts) {
      likeCounts.forEach(like => {
        likeCountMap[like.comment_id] = (likeCountMap[like.comment_id] || 0) + 1;
      });
    }

    let userLikes = new Set();
    if (currentUser) {
      const { data: userLikeData, error: userLikeError } = await supabase
        .from('comment_likes')
        .select('comment_id')
        .eq('user_id', currentUser.id)
        .in('comment_id', commentIds);

      if (!userLikeError && userLikeData) {
        userLikes = new Set(userLikeData.map(l => l.comment_id));
      }
    }

    comments.forEach(comment => {
      comment.likeCount = likeCountMap[comment.id] || 0;
      comment.isLiked = userLikes.has(comment.id);
    });

    cachedTopLevelComments = comments.filter(c => c.parent_id === null);
    const replies = comments.filter(c => c.parent_id !== null);

    cachedRepliesByParent = {};
    replies.forEach(reply => {
      if (!cachedRepliesByParent[reply.parent_id]) {
        cachedRepliesByParent[reply.parent_id] = [];
      }
      cachedRepliesByParent[reply.parent_id].push(reply);
    });

    renderComments(cachedTopLevelComments, cachedRepliesByParent);
  } catch (err) {
    console.error('Unexpected error loading comments:', err);
    document.getElementById('comments-list').innerHTML = '<p>Error loading comments</p>';
  }
}

function renderComments(topLevelComments, repliesByParent) {
  const commentsList = document.getElementById('comments-list');
  const commentsCount = document.getElementById('comments-count');
  const commentsPreview = document.getElementById('comments-preview');

  const safeTopLevel = Array.isArray(topLevelComments) ? topLevelComments : [];
  const replyArrays = Object.values(repliesByParent || {});
  const flatReplies = replyArrays.flat ? replyArrays.flat() : [].concat(...replyArrays);

  const totalComments = safeTopLevel.length + flatReplies.length;
  commentsCount.textContent = totalComments;

  if (safeTopLevel.length === 0) {
    commentsList.innerHTML = '<p style="text-align: center; color: #999; font-style: italic;">No comments yet. Be the first to comment!</p>';
    commentsPreview.classList.add('hidden');
    return;
  }

  let sortedTopLevel;
  if (currentCommentSort === 'top') {
    sortedTopLevel = [...safeTopLevel].sort((a, b) => {
      const likeA = a.likeCount || 0;
      const likeB = b.likeCount || 0;
      if (likeB !== likeA) return likeB - likeA;
      return new Date(b.created_at) - new Date(a.created_at);
    });
  } else {
    sortedTopLevel = [...safeTopLevel].sort((a, b) => {
      return new Date(b.created_at) - new Date(a.created_at);
    });
  }

  const topComment = sortedTopLevel[0];
  const previewAuthor = commentsPreview.querySelector('.preview-author');
  const previewContent = commentsPreview.querySelector('.preview-content');

  previewAuthor.textContent = topComment.users?.username || 'Anonymous';

  const previewText = topComment.comment || '';
  const truncatedContent = previewText.length > 80
    ? previewText.substring(0, 80) + '...'
    : previewText;

  previewContent.textContent = truncatedContent;
  commentsPreview.classList.remove('hidden');

  commentsList.innerHTML = '';

  sortedTopLevel.forEach(comment => {
    const commentEl = createCommentElement(comment, false);

    const commentReplies = (repliesByParent && repliesByParent[comment.id]) || [];
    if (commentReplies.length > 0) {
      const toggleBtn = document.createElement('button');
      toggleBtn.className = 'toggle-replies-btn';
      toggleBtn.dataset.commentId = comment.id;
      toggleBtn.textContent = `View ${commentReplies.length} ${commentReplies.length === 1 ? 'reply' : 'replies'}`;

      const repliesContainer = document.createElement('div');
      repliesContainer.className = 'replies-container hidden';
      repliesContainer.dataset.commentId = comment.id;

      const repliesWrapper = document.createElement('div');
      repliesWrapper.className = 'replies';

      commentReplies.forEach(reply => {
        const replyEl = createCommentElement(reply, true);
        repliesWrapper.appendChild(replyEl);
      });

      repliesContainer.appendChild(repliesWrapper);
      commentEl.appendChild(toggleBtn);
      commentEl.appendChild(repliesContainer);
    }

    commentsList.appendChild(commentEl);
  });
}


function createCommentElement(comment, isReply) {
  const div = document.createElement('div');
  div.className = isReply ? 'reply' : 'comment';
  div.dataset.commentId = comment.id;

  const userLinkHtml = renderUserLink(comment.users);
  const timeAgo = formatTimeAgo(new Date(comment.created_at));

  const likedClass = comment.isLiked ? 'liked' : '';

  const canDelete = currentUser && comment.user_id === currentUser.id;

  div.innerHTML = `
    <div class="comment-header">
      ${userLinkHtml}
      <span class="comment-time">${timeAgo}</span>
    </div>
    <div class="comment-content">${escapeHtml(comment.comment)}</div>
    <div class="comment-actions">
      <button class="like-btn ${likedClass}" data-comment-id="${comment.id}">
        <span class="like-icon">${comment.isLiked ? '♥' : '♡'}</span>
        <span class="like-count">${comment.likeCount || 0}</span>
      </button>
      ${!isReply && currentUser ? `<button class="reply-btn" data-comment-id="${comment.id}">Reply</button>` : ''}
      ${canDelete ? `<button class="delete-btn" data-comment-id="${comment.id}">Delete</button>` : ''}
    </div>
  `;

  return div;
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

function setupCommentListeners() {
  const commentSubmitBtn = document.getElementById('comment-submit-btn');
  const commentInput = document.getElementById('comment-input');
  const commentMessage = document.getElementById('comment-message');

  if (!currentUser) {
    commentInput.disabled = true;
    commentInput.placeholder = 'Please log in to comment';
    commentSubmitBtn.disabled = true;
    return;
  }

  commentSubmitBtn.addEventListener('click', async () => {
    const content = commentInput.value.trim();

    if (!content) {
      commentMessage.textContent = 'Please enter a comment';
      return;
    }

    await postComment(content, null);
  });

  document.getElementById('comments-list').addEventListener('click', async (e) => {
    if (e.target.classList.contains('reply-btn')) {
      const commentId = e.target.dataset.commentId;
      showReplyForm(commentId);
    }

    const likeBtn = e.target.closest('.like-btn');
    if (likeBtn) {
      const commentId = likeBtn.dataset.commentId;
      await toggleLike(commentId, likeBtn);
    }

    const deleteBtn = e.target.closest('.delete-btn');
    if (deleteBtn) {
      const commentId = deleteBtn.dataset.commentId;
      await deleteComment(commentId);
    }

    const toggleRepliesBtn = e.target.closest('.toggle-replies-btn');
    if (toggleRepliesBtn) {
      const commentId = toggleRepliesBtn.dataset.commentId;
      toggleRepliesVisibility(commentId, toggleRepliesBtn);
    }
  });
}

async function postComment(content, parentId) {
  const commentMessage = document.getElementById('comment-message');
  const commentInput = document.getElementById('comment-input');

  try {
    commentMessage.textContent = 'Posting...';

    const { error } = await supabase
      .from('comments')
      .insert({
        user_id: currentUser.id,
        fragrance_id: fragranceId,
        fragrance_brand: currentFragranceBrand || null,
        fragrance_name: currentFragranceName || null,
        parent_id: parentId,
        comment: content
      });

    if (error) {
      console.error('Error posting comment:', error);
      commentMessage.textContent = 'Failed to post comment. Please try again.';
      return;
    }

    commentInput.value = '';
    commentMessage.textContent = 'Comment posted!';

    setTimeout(() => {
      commentMessage.textContent = '';
    }, 2000);

    await loadComments();
  } catch (err) {
    console.error('Unexpected error posting comment:', err);
    commentMessage.textContent = 'Failed to post comment. Please try again.';
  }
}

async function toggleLike(commentId, likeBtn) {
  if (!currentUser) {
    alert('Please log in to like comments');
    return;
  }

  const isLiked = likeBtn.classList.contains('liked');
  const likeIcon = likeBtn.querySelector('.like-icon');
  const likeCount = likeBtn.querySelector('.like-count');
  const currentCount = parseInt(likeCount.textContent) || 0;

  try {
    if (isLiked) {
      const { error } = await supabase
        .from('comment_likes')
        .delete()
        .eq('user_id', currentUser.id)
        .eq('comment_id', commentId);

      if (error) {
        console.error('Error unliking comment:', error);
        return;
      }

      likeBtn.classList.remove('liked');
      likeIcon.textContent = '♡';
      likeCount.textContent = Math.max(0, currentCount - 1);

      const cachedComment = cachedTopLevelComments.find(c => c.id === commentId);
      if (cachedComment) {
        cachedComment.likeCount = Math.max(0, currentCount - 1);
        cachedComment.isLiked = false;
      } else {
        for (const parentId in cachedRepliesByParent) {
          const reply = cachedRepliesByParent[parentId].find(r => r.id === commentId);
          if (reply) {
            reply.likeCount = Math.max(0, currentCount - 1);
            reply.isLiked = false;
            break;
          }
        }
      }
    } else {
      const { error } = await supabase
        .from('comment_likes')
        .insert({
          user_id: currentUser.id,
          comment_id: commentId
        });

      if (error) {
        console.error('Error liking comment:', error);
        return;
      }

      likeBtn.classList.add('liked');
      likeIcon.textContent = '♥';
      likeCount.textContent = currentCount + 1;

      const cachedComment = cachedTopLevelComments.find(c => c.id === commentId);
      if (cachedComment) {
        cachedComment.likeCount = currentCount + 1;
        cachedComment.isLiked = true;
      } else {
        for (const parentId in cachedRepliesByParent) {
          const reply = cachedRepliesByParent[parentId].find(r => r.id === commentId);
          if (reply) {
            reply.likeCount = currentCount + 1;
            reply.isLiked = true;
            break;
          }
        }
      }
    }
  } catch (err) {
    console.error('Unexpected error toggling like:', err);
  }
}

async function deleteComment(commentId) {
  if (!currentUser) {
    alert('Please log in to delete comments');
    return;
  }

  const confirmed = confirm('Delete this comment? This will also remove any replies.');
  if (!confirmed) return;

  try {
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      console.error('Error deleting comment:', error);
      alert('Failed to delete comment. Please try again.');
      return;
    }

    await loadComments();
  } catch (err) {
    console.error('Unexpected error deleting comment:', err);
    alert('Failed to delete comment. Please try again.');
  }
}

function toggleRepliesVisibility(commentId, toggleBtn) {
  const repliesContainer = document.querySelector(`.replies-container[data-comment-id="${commentId}"]`);

  if (!repliesContainer) return;

  const isHidden = repliesContainer.classList.contains('hidden');
  const replyCount = repliesContainer.querySelectorAll('.reply').length;

  if (isHidden) {
    repliesContainer.classList.remove('hidden');
    toggleBtn.textContent = 'Hide replies';
  } else {
    repliesContainer.classList.add('hidden');
    toggleBtn.textContent = `View ${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}`;
  }
}

function showReplyForm(commentId) {
  const existingForm = document.querySelector('.reply-form');
  if (existingForm) {
    existingForm.remove();
  }

  const commentEl = document.querySelector(`[data-comment-id="${commentId}"]`);
  const actionsDiv = commentEl.querySelector('.comment-actions');

  const replyForm = document.createElement('div');
  replyForm.className = 'reply-form';
  replyForm.innerHTML = `
    <textarea class="reply-input" placeholder="Write a reply..." rows="2"></textarea>
    <button class="reply-submit-btn">Post Reply</button>
    <button class="cancel-reply-btn">Cancel</button>
    <div class="reply-message"></div>
  `;

  actionsDiv.after(replyForm);

  const replyInput = replyForm.querySelector('.reply-input');
  const submitBtn = replyForm.querySelector('.reply-submit-btn');
  const cancelBtn = replyForm.querySelector('.cancel-reply-btn');
  const replyMessage = replyForm.querySelector('.reply-message');

  replyInput.focus();

  submitBtn.addEventListener('click', async () => {
    const content = replyInput.value.trim();

    if (!content) {
      replyMessage.textContent = 'Please enter a reply';
      return;
    }

    replyMessage.textContent = 'Posting...';

    await postComment(content, commentId);
    replyForm.remove();
  });

  cancelBtn.addEventListener('click', () => {
    replyForm.remove();
  });
}

const spModalRatings = {};
const wearabilityModalRatings = {};

async function loadSeasonPerformanceRatings() {
  try {
    const [seasonRes, perfRes] = await Promise.all([
      supabase.from('season_ratings').select('*').eq('fragrance_id', fragranceId),
      supabase.from('performance_ratings').select('*').eq('fragrance_id', fragranceId)
    ]);

    if (seasonRes.error) console.error('Error loading season ratings:', seasonRes.error);
    if (perfRes.error) console.error('Error loading performance ratings:', perfRes.error);

    // Keep these as-is because your UI has these labels.
    // Note: Day/Night aren't in your DB table, so they'll always show 0 unless you add columns later.
    const seasons = ['Winter', 'Spring', 'Summer', 'Autumn', 'Day', 'Night'];
    const categories = ['Longevity', 'Sillage', 'Projection', 'Versatility'];

    const seasonCol = (label) => {
  if (label === 'Winter') return 'winter';
  if (label === 'Spring') return 'spring';
  if (label === 'Summer') return 'summer';
  if (label === 'Autumn') return 'fall';
  if (label === 'Day') return 'day';
  if (label === 'Night') return 'night';
  return null;
};


    const perfCol = (label) => {
      if (label === 'Longevity') return 'longevity';
      if (label === 'Sillage') return 'sillage';
      if (label === 'Projection') return 'projection';
      if (label === 'Versatility') return 'value'; // IMPORTANT: Versatility -> value
      return null;
    };

    const seasonAggregates = {};
    const perfAggregates = {};

    seasons.forEach(s => (seasonAggregates[s] = { total: 0, count: 0 }));
    categories.forEach(c => (perfAggregates[c] = { total: 0, count: 0 }));

    // ---- Seasons: rows look like { user_id, fragrance_id, winter, spring, summer, fall }
    const seasonRows = seasonRes.data || [];
    seasonRows.forEach(row => {
      seasons.forEach(label => {
        const col = seasonCol(label);
        if (!col) return;
        const val = row[col];
        if (val === null || val === undefined) return;

        const num = Number(val);
        if (!Number.isFinite(num)) return;

        seasonAggregates[label].total += num;
        seasonAggregates[label].count += 1;

        if (currentUser && row.user_id === currentUser.id) {
          spModalRatings[label] = num;
        }
      });
    });

    // ---- Performance: rows look like { user_id, fragrance_id, longevity, projection, sillage, value }
    const perfRows = perfRes.data || [];
    perfRows.forEach(row => {
      categories.forEach(label => {
        const col = perfCol(label);
        if (!col) return;
        const val = row[col];
        if (val === null || val === undefined) return;

        const num = Number(val);
        if (!Number.isFinite(num)) return;

        perfAggregates[label].total += num;
        perfAggregates[label].count += 1;

        if (currentUser && row.user_id === currentUser.id) {
          spModalRatings[label] = num;
        }
      });
    });

    // ---- Update season bars
    seasons.forEach(season => {
      const barFill = document.querySelector(`.sp-bar-fill[data-season="${season}"]`);
      const barText = document.querySelector(`.sp-bar-text[data-season="${season}"]`);

      if (barFill && barText) {
        const agg = seasonAggregates[season];
        const avg = agg.count > 0 ? (agg.total / agg.count).toFixed(1) : 0;
        const width = agg.count > 0 ? (avg / 10 * 100) : 0;

        barFill.style.width = `${width}%`;
        barText.textContent = agg.count > 0
          ? `${avg} / 10 (${agg.count} vote${agg.count !== 1 ? 's' : ''})`
          : '– (0 votes)';
      }
    });

    // ---- Update performance bars
    categories.forEach(category => {
      const barFill = document.querySelector(`.sp-bar-fill[data-category="${category}"]`);
      const barText = document.querySelector(`.sp-bar-text[data-category="${category}"]`);

      if (barFill && barText) {
        const agg = perfAggregates[category];
        const avg = agg.count > 0 ? (agg.total / agg.count).toFixed(1) : 0;
        const width = agg.count > 0 ? (avg / 10 * 100) : 0;

        barFill.style.width = `${width}%`;
        barText.textContent = agg.count > 0
          ? `${avg} / 10 (${agg.count} vote${agg.count !== 1 ? 's' : ''})`
          : '– (0 votes)';
      }
    });

    if (!currentUser) {
      const msg = document.getElementById('sp-login-message');
      if (msg) msg.style.display = 'block';
    }
  } catch (err) {
    console.error('Unexpected error loading season/performance ratings:', err);
  }
}

async function loadWearabilityRatings() {
  try {
    const { data: wearabilityRows, error: wearabilityError } = await supabase
      .from('wearability_ratings')
      .select('*')
      .eq('fragrance_id', fragranceId);

    if (wearabilityError) {
      console.error('Error loading wearability ratings:', wearabilityError);
      return;
    }

    const wearabilityFields = [
      { label: 'Office Safe', col: 'office_safe' },
      { label: 'Date Night', col: 'date_night' },
      { label: 'Daily Driver', col: 'daily_driver' },
      { label: 'Night Out', col: 'night_out' },
      { label: 'Summer Heat', col: 'summer_heat' },
      { label: 'Winter Cold', col: 'winter_cold' },
      { label: 'Formal', col: 'formal' }
    ];

    const wearabilityAggregates = {};
    wearabilityFields.forEach(field => {
      wearabilityAggregates[field.label] = { total: 0, count: 0 };
    });

    const rows = wearabilityRows || [];
    rows.forEach(row => {
      wearabilityFields.forEach(field => {
        const val = row[field.col];
        if (val === null || val === undefined) return;

        const num = Number(val);
        if (!Number.isFinite(num)) return;

        wearabilityAggregates[field.label].total += num;
        wearabilityAggregates[field.label].count += 1;

        if (currentUser && row.user_id === currentUser.id) {
          wearabilityModalRatings[field.label] = num;
        }
      });
    });

    wearabilityFields.forEach(field => {
      const barFill = document.querySelector(`.sp-bar-fill[data-wearability="${field.label}"]`);
      const barText = document.querySelector(`.sp-bar-text[data-wearability="${field.label}"]`);

      if (barFill && barText) {
        const agg = wearabilityAggregates[field.label];
        const avg = agg.count > 0 ? (agg.total / agg.count).toFixed(1) : 0;
        const width = agg.count > 0 ? (avg / 10 * 100) : 0;

        barFill.style.width = `${width}%`;
        barText.textContent = agg.count > 0
          ? `${avg} / 10 (${agg.count} vote${agg.count !== 1 ? 's' : ''})`
          : '– (0 votes)';
      }
    });

    if (!currentUser) {
      const msg = document.getElementById('wearability-login-message');
      if (msg) msg.style.display = 'block';
    }
  } catch (err) {
    console.error('Unexpected error loading wearability ratings:', err);
  }
}

function openWearabilityModal() {
  if (!currentUser) {
    alert('Please log in to rate wearability');
    return;
  }

  const modal = document.getElementById('wearability-modal');
  modal.classList.add('active');

  document.querySelectorAll('.sp-rating-buttons[data-wearability]').forEach(container => {
    const key = container.dataset.wearability;

    const currentRating = wearabilityModalRatings[key];
    container.querySelectorAll('.sp-rating-btn').forEach(btn => {
      if (currentRating && parseInt(btn.dataset.value) === currentRating) {
        btn.classList.add('selected');
      } else {
        btn.classList.remove('selected');
      }
    });
  });
}

function closeWearabilityModal() {
  const modal = document.getElementById('wearability-modal');
  modal.classList.remove('active');
}

async function saveWearabilityRatings() {
  if (!currentUser) return;

  const wearabilityRow = {
    user_id: currentUser.id,
    fragrance_id: fragranceId
  };

  const wearabilityKeyToCol = (label) => {
    if (label === 'Office Safe') return 'office_safe';
    if (label === 'Date Night') return 'date_night';
    if (label === 'Daily Driver') return 'daily_driver';
    if (label === 'Night Out') return 'night_out';
    if (label === 'Summer Heat') return 'summer_heat';
    if (label === 'Winter Cold') return 'winter_cold';
    if (label === 'Formal') return 'formal';
    return null;
  };

  let hasWearability = false;

  document.querySelectorAll('.sp-rating-buttons[data-wearability]').forEach(container => {
    const label = container.dataset.wearability;
    const selected = container.querySelector('.sp-rating-btn.selected');
    if (!selected) return;

    const rating = parseInt(selected.dataset.value, 10);
    if (!(rating >= 1 && rating <= 10)) return;

    const col = wearabilityKeyToCol(label);
    if (!col) return;

    wearabilityRow[col] = rating;
    hasWearability = true;

    wearabilityModalRatings[label] = rating;
  });

  try {
    if (hasWearability) {
      const { error } = await supabase.from('wearability_ratings').upsert(wearabilityRow, {
        onConflict: 'user_id,fragrance_id'
      });

      if (error) {
        console.error('Error saving wearability ratings:', error);
        throw error;
      }

      await awardPoints(
        'wearability_rating',
        'wearability_rating',
        `${currentUser.id}:${fragranceId}`,
        currentUser.id
      );
    }

    closeWearabilityModal();
    await loadWearabilityRatings();
  } catch (err) {
    console.error('Unexpected error saving wearability ratings:', err);
    alert('Failed to save ratings. Please try again.');
  }
}

function setupWearabilityListeners() {
  const rateButton = document.getElementById('wearability-rate-button');
  const section = document.getElementById('wearability-section');
  const modalOverlay = document.getElementById('wearability-modal-overlay');
  const modalClose = document.getElementById('wearability-modal-close');
  const modalCancel = document.getElementById('wearability-modal-cancel');
  const modalSave = document.getElementById('wearability-modal-save');

  if (rateButton) {
    rateButton.addEventListener('click', openWearabilityModal);
  }

  if (section) {
    section.addEventListener('click', (e) => {
      if (e.target.closest('.sp-bar-item') || e.target.closest('.sp-categories')) {
        if (!e.target.closest('.sp-rate-button')) {
          openWearabilityModal();
        }
      }
    });
  }

  if (modalOverlay) {
    modalOverlay.addEventListener('click', closeWearabilityModal);
  }

  if (modalClose) {
    modalClose.addEventListener('click', closeWearabilityModal);
  }

  if (modalCancel) {
    modalCancel.addEventListener('click', closeWearabilityModal);
  }

  if (modalSave) {
    modalSave.addEventListener('click', saveWearabilityRatings);
  }

  document.querySelectorAll('.sp-rating-buttons[data-wearability] .sp-rating-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const container = btn.closest('.sp-rating-buttons');
      container.querySelectorAll('.sp-rating-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
  });
}


function openSPModal() {
  if (!currentUser) {
    alert('Please log in to rate seasons and performance');
    return;
  }

  const modal = document.getElementById('sp-modal');
  modal.classList.add('active');

  document.querySelectorAll('.sp-rating-buttons').forEach(container => {
    const season = container.dataset.season;
    const category = container.dataset.category;
    const key = season || category;

    const currentRating = spModalRatings[key];
    container.querySelectorAll('.sp-rating-btn').forEach(btn => {
      if (currentRating && parseInt(btn.dataset.value) === currentRating) {
        btn.classList.add('selected');
      } else {
        btn.classList.remove('selected');
      }
    });
  });
}

function closeSPModal() {
  const modal = document.getElementById('sp-modal');
  modal.classList.remove('active');
}

async function saveSPRatings() {
  if (!currentUser) return;

  // Build ONE row for season_ratings + ONE row for performance_ratings
  const seasonRow = {
    user_id: currentUser.id,
    fragrance_id: fragranceId
  };

  const perfRow = {
    user_id: currentUser.id,
    fragrance_id: fragranceId
  };

  const seasonKeyToCol = (label) => {
  if (label === 'Winter') return 'winter';
  if (label === 'Spring') return 'spring';
  if (label === 'Summer') return 'summer';
  if (label === 'Autumn') return 'fall';
  if (label === 'Day') return 'day';
  if (label === 'Night') return 'night';
  return null;
};


  const perfKeyToCol = (label) => {
    if (label === 'Longevity') return 'longevity';
    if (label === 'Sillage') return 'sillage';
    if (label === 'Projection') return 'projection';
    if (label === 'Versatility') return 'value'; // Versatility -> value
    return null;
  };

  let hasSeason = false;
  let hasPerf = false;

  document.querySelectorAll('.sp-rating-buttons[data-season]').forEach(container => {
    const label = container.dataset.season;
    const selected = container.querySelector('.sp-rating-btn.selected');
    if (!selected) return;

    const rating = parseInt(selected.dataset.value, 10);
    if (!(rating >= 1 && rating <= 10)) return;

    const col = seasonKeyToCol(label);
    if (!col) return; // ignores Day/Night safely

    seasonRow[col] = rating;
    hasSeason = true;

    // keep modal state in sync
    spModalRatings[label] = rating;
  });

  document.querySelectorAll('.sp-rating-buttons[data-category]').forEach(container => {
    const label = container.dataset.category;
    const selected = container.querySelector('.sp-rating-btn.selected');
    if (!selected) return;

    const rating = parseInt(selected.dataset.value, 10);
    if (!(rating >= 1 && rating <= 10)) return;

    const col = perfKeyToCol(label);
    if (!col) return;

    perfRow[col] = rating;
    hasPerf = true;

    spModalRatings[label] = rating;
  });

  try {
    const promises = [];

    if (hasSeason) {
      promises.push(
        supabase.from('season_ratings').upsert(seasonRow, {
          onConflict: 'user_id,fragrance_id'
        })
      );
    }

    if (hasPerf) {
      promises.push(
        supabase.from('performance_ratings').upsert(perfRow, {
          onConflict: 'user_id,fragrance_id'
        })
      );
    }

    const results = await Promise.all(promises);

    results.forEach(({ error }) => {
      if (error) {
        console.error('Error saving ratings:', error);
        throw error;
      }
    });

    await awardPoints(
      'season_performance_rating',
      'season_performance_rating',
      `${currentUser.id}:${fragranceId}`,
      currentUser.id
    );

    closeSPModal();
    await loadSeasonPerformanceRatings();
  } catch (err) {
    console.error('Unexpected error saving ratings:', err);
    alert('Failed to save ratings. Please try again.');
  }
}


function setupSeasonPerformanceListeners() {
  const rateButton = document.getElementById('sp-rate-button');
  const section = document.getElementById('season-performance-section');
  const modalOverlay = document.getElementById('sp-modal-overlay');
  const modalClose = document.getElementById('sp-modal-close');
  const modalCancel = document.getElementById('sp-modal-cancel');
  const modalSave = document.getElementById('sp-modal-save');

  if (rateButton) {
    rateButton.addEventListener('click', openSPModal);
  }

  if (section) {
    section.addEventListener('click', (e) => {
      if (e.target.closest('.sp-bar-item') || e.target.closest('.sp-categories')) {
        if (!e.target.closest('.sp-rate-button')) {
          openSPModal();
        }
      }
    });
  }

  if (modalOverlay) {
    modalOverlay.addEventListener('click', closeSPModal);
  }

  if (modalClose) {
    modalClose.addEventListener('click', closeSPModal);
  }

  if (modalCancel) {
    modalCancel.addEventListener('click', closeSPModal);
  }

  if (modalSave) {
    modalSave.addEventListener('click', saveSPRatings);
  }

  document.querySelectorAll('.sp-rating-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const container = btn.closest('.sp-rating-buttons');
      container.querySelectorAll('.sp-rating-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
  });
}

let collectionState = {
  isOwned: false,
  isWanted: false
};

let fragranceDisplayName = null;

let currentCommentSort = 'top';
let cachedTopLevelComments = [];
let cachedRepliesByParent = {};

function getFragranceDisplayName() {
  const nameElement = document.getElementById('fragrance-name');
  const fullText = nameElement?.textContent?.trim() || '';

  if (
    fullText &&
    fullText !== 'Loading...' &&
    fullText !== 'Fragrance not found.' &&
    fullText !== 'Fragrance not found'
  ) {
    return fullText.replace(/\s*—\s*/g, ' - ');
  }

  if (currentFragranceBrand && currentFragranceName) {
    return `${currentFragranceBrand} - ${currentFragranceName}`;
  }

  return null;
}
async function waitForFragranceDisplayName(timeoutMs = 4000) {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const displayName = getFragranceDisplayName();
    if (displayName) return displayName;
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return getFragranceDisplayName();
}
async function loadCollectionState() {
  if (!currentUser) {
    updateCollectionButtonsState(false, false);
    document.getElementById('collection-message').textContent = 'Log in to add this to your collection.';
    document.getElementById('own-btn').disabled = true;
    document.getElementById('want-btn').disabled = true;
    return;
  }

  fragranceDisplayName = await waitForFragranceDisplayName();
  if (!fragranceDisplayName) {
    console.error('Could not determine fragrance display name');
    return;
  }

  try {
    const { data: userProfile, error } = await supabase
      .from('users')
      .select('fragrances_have, fragrances_want')
      .eq('id', currentUser.id)
      .maybeSingle();

    if (error) {
      console.error('Error loading collection state:', error);
      return;
    }

    if (userProfile) {
      const fragrancesHave = userProfile.fragrances_have || [];
      const fragrancesWant = userProfile.fragrances_want || [];

      collectionState.isOwned = fragrancesHave.includes(fragranceDisplayName);
      collectionState.isWanted = fragrancesWant.includes(fragranceDisplayName);

      updateCollectionButtonsState(collectionState.isOwned, collectionState.isWanted);
    }
  } catch (err) {
    console.error('Unexpected error loading collection state:', err);
  }
}

function updateCollectionButtonsState(isOwned, isWanted) {
  const ownBtn = document.getElementById('own-btn');
  const wantBtn = document.getElementById('want-btn');

  if (ownBtn) {
    if (isOwned) {
      ownBtn.classList.add('active');
    } else {
      ownBtn.classList.remove('active');
    }
  }

  if (wantBtn) {
    if (isWanted) {
      wantBtn.classList.add('active');
    } else {
      wantBtn.classList.remove('active');
    }
  }
}

async function toggleCollectionFlag(type) {
  if (!currentUser) {
    alert('Please log in to add fragrances to your collection.');
    return;
  }

  if (!fragranceDisplayName) {
    console.error('Fragrance display name not available');
    return;
  }

  const statusEl = document.getElementById('collection-status');
  const ownBtn = document.getElementById('own-btn');
  const wantBtn = document.getElementById('want-btn');

  ownBtn.disabled = true;
  wantBtn.disabled = true;
  statusEl.textContent = 'Saving...';

  try {
    const { data: userProfile, error: fetchError } = await supabase
      .from('users')
      .select('fragrances_have, fragrances_want')
      .eq('id', currentUser.id)
      .maybeSingle();

    if (fetchError) {
      throw fetchError;
    }

    let fragrancesHave = userProfile?.fragrances_have || [];
    let fragrancesWant = userProfile?.fragrances_want || [];

    if (type === 'have') {
      if (fragrancesHave.includes(fragranceDisplayName)) {
        fragrancesHave = fragrancesHave.filter(f => f !== fragranceDisplayName);
        collectionState.isOwned = false;
      } else {
        if (!fragrancesHave.includes(fragranceDisplayName)) {
          fragrancesHave.push(fragranceDisplayName);
        }
        collectionState.isOwned = true;
      }
    } else if (type === 'want') {
      if (fragrancesWant.includes(fragranceDisplayName)) {
        fragrancesWant = fragrancesWant.filter(f => f !== fragranceDisplayName);
        collectionState.isWanted = false;
      } else {
        if (!fragrancesWant.includes(fragranceDisplayName)) {
          fragrancesWant.push(fragranceDisplayName);
        }
        collectionState.isWanted = true;
      }
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({
        fragrances_have: fragrancesHave,
        fragrances_want: fragrancesWant
      })
      .eq('id', currentUser.id);

    if (updateError) {
      throw updateError;
    }

    updateCollectionButtonsState(collectionState.isOwned, collectionState.isWanted);
    statusEl.textContent = '';
  } catch (err) {
    console.error('Error toggling collection flag:', err);
    statusEl.textContent = 'Error saving. Please try again.';

    if (type === 'have') {
      collectionState.isOwned = !collectionState.isOwned;
    } else {
      collectionState.isWanted = !collectionState.isWanted;
    }
    updateCollectionButtonsState(collectionState.isOwned, collectionState.isWanted);
  } finally {
    ownBtn.disabled = false;
    wantBtn.disabled = false;

    setTimeout(() => {
      statusEl.textContent = '';
    }, 2000);
  }
}

function setupCollectionListeners() {
  const ownBtn = document.getElementById('own-btn');
  const wantBtn = document.getElementById('want-btn');

  if (ownBtn) {
    ownBtn.addEventListener('click', () => toggleCollectionFlag('have'));
  }

  if (wantBtn) {
    wantBtn.addEventListener('click', () => toggleCollectionFlag('want'));
  }
}

function setupSortTabListeners() {
  const sortTabs = document.querySelectorAll('.sort-tab');

  sortTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.stopPropagation();

      const newSort = tab.dataset.sort;
      if (newSort === currentCommentSort) return;

      currentCommentSort = newSort;

      sortTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      if (cachedTopLevelComments.length > 0) {
        renderComments(cachedTopLevelComments, cachedRepliesByParent);
      }
    });
  });
}

function setupCommentsToggle() {
  const header = document.getElementById('comments-header');
  const content = document.getElementById('comments-content');
  const toggleIcon = document.getElementById('comments-toggle-icon');

  header.addEventListener('click', (e) => {
    if (e.target.closest('.sort-tab')) {
      return;
    }

    const isExpanded = content.classList.contains('expanded');

    if (isExpanded) {
      content.classList.remove('expanded');
      toggleIcon.classList.remove('expanded');
    } else {
      content.classList.add('expanded');
      toggleIcon.classList.add('expanded');
    }
  });
}

function setupSaveCollectionListeners() {
  const saveBtn = document.getElementById('save-to-collection-btn');
  const modal = document.getElementById('save-collection-modal');
  const closeBtn = document.querySelector('.save-collection-modal-close');
  const createBtn = document.getElementById('create-collection-btn');

  if (!saveBtn) return;

  saveBtn.addEventListener('click', () => {
    if (!currentUser) {
      alert('Please log in to save fragrances to collections');
      window.location.href = 'login.html';
      return;
    }
    openSaveCollectionModal();
  });

  closeBtn?.addEventListener('click', () => {
    modal?.classList.add('hidden');
  });

  modal?.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.add('hidden');
    }
  });

  createBtn?.addEventListener('click', async () => {
    await createNewCollection();
  });
}

async function openSaveCollectionModal() {
  const modal = document.getElementById('save-collection-modal');
  const messageEl = document.getElementById('save-collection-message');

  messageEl?.classList.add('hidden');
  modal?.classList.remove('hidden');

  await loadUserCollections();
}

async function loadUserCollections() {
  const collectionsList = document.getElementById('collections-list');

  if (!collectionsList) return;

  collectionsList.innerHTML = '<div class="collections-loading">Loading collections...</div>';

  try {
    const { data: collections, error } = await supabase
      .from('collections')
      .select('id, name, description')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading collections:', error);
      collectionsList.innerHTML = '<div class="collections-loading">Error loading collections</div>';
      return;
    }

    if (!collections || collections.length === 0) {
      collectionsList.innerHTML = '<div class="collections-loading">No collections yet. Create one below!</div>';
      return;
    }

    const itemCounts = await Promise.all(
      collections.map(async (collection) => {
        const { count, error } = await supabase
          .from('collection_items')
          .select('*', { count: 'exact', head: true })
          .eq('collection_id', collection.id);

        return { id: collection.id, count: error ? 0 : count || 0 };
      })
    );

    collectionsList.innerHTML = collections.map((collection) => {
      const countData = itemCounts.find(c => c.id === collection.id);
      const count = countData?.count || 0;

      return `
        <div class="collection-item" data-collection-id="${collection.id}" data-collection-name="${collection.name}">
          <div class="collection-item-name">${collection.name}</div>
          <div class="collection-item-count">${count} ${count === 1 ? 'fragrance' : 'fragrances'}</div>
        </div>
      `;
    }).join('');

    document.querySelectorAll('.collection-item').forEach(item => {
      item.addEventListener('click', async () => {
        const collectionId = item.dataset.collectionId;
        const collectionName = item.dataset.collectionName;
        await saveToCollection(collectionId, collectionName);
      });
    });

  } catch (err) {
    console.error('Unexpected error loading collections:', err);
    collectionsList.innerHTML = '<div class="collections-loading">Error loading collections</div>';
  }
}

async function saveToCollection(collectionId, collectionName) {
  const canonicalId = getCanonicalFragranceId();

  try {
    const { data: existing, error: checkError } = await supabase
      .from('collection_items')
      .select('id')
      .eq('collection_id', collectionId)
      .eq('fragrance_id', canonicalId)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing item:', checkError);
      showCollectionMessage('Error saving to collection', 'error');
      return;
    }

    if (existing) {
      showCollectionMessage(`Already in "${collectionName}"`, 'error');
      return;
    }

    const { error: insertError } = await supabase
      .from('collection_items')
      .insert({
        collection_id: collectionId,
        fragrance_id: canonicalId,
        fragrance_brand: currentFragranceBrand || null,
        fragrance_name: currentFragranceName || null
      });

    if (insertError) {
      console.error('Error saving to collection:', insertError);
      showCollectionMessage('Error saving to collection', 'error');
      return;
    }

    showCollectionMessage(`Saved to "${collectionName}"`, 'success');
    await loadUserCollections();
  } catch (err) {
    console.error('Unexpected error saving to collection:', err);
    showCollectionMessage('Error saving to collection', 'error');
  }
}



async function createNewCollection() {
  const nameInput = document.getElementById('new-collection-name');
  const descriptionInput = document.getElementById('new-collection-description');

  const name = nameInput?.value.trim();
  const description = descriptionInput?.value.trim();

  if (!name) {
    showCollectionMessage('Collection name is required', 'error');
    return;
  }

  try {
    const { data: newCollection, error: createError } = await supabase
      .from('collections')
      .insert({
        user_id: currentUser.id,
        name: name,
        description: description || null
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating collection:', createError);
      showCollectionMessage('Error creating collection', 'error');
      return;
    }

    const canonicalId = getCanonicalFragranceId();

const { error: insertError } = await supabase
  .from('collection_items')
  .insert({
    collection_id: newCollection.id,
    fragrance_id: canonicalId,
    fragrance_brand: currentFragranceBrand || null,
    fragrance_name: currentFragranceName || null
  });



    if (insertError) {
      console.error('Error adding fragrance to new collection:', insertError);
      showCollectionMessage('Collection created but error adding fragrance', 'error');
      return;
    }

    showCollectionMessage(`Created and saved to "${name}"`, 'success');

    nameInput.value = '';
    descriptionInput.value = '';

    await loadUserCollections();

  } catch (err) {
    console.error('Unexpected error creating collection:', err);
    showCollectionMessage('Error creating collection', 'error');
  }
}

function showCollectionMessage(message, type) {
  const messageEl = document.getElementById('save-collection-message');

  if (!messageEl) return;

  messageEl.textContent = message;
  messageEl.className = `save-collection-message ${type}`;
  messageEl.classList.remove('hidden');

  setTimeout(() => {
    messageEl.classList.add('hidden');
  }, 3000);
}

// Admin Image Edit Functionality
function setupAdminImageEdit() {
  const editBtn = document.getElementById('admin-edit-image-btn');
  const modal = document.getElementById('image-edit-modal');
  const closeBtn = document.getElementById('image-edit-close');
  const cancelBtn = document.getElementById('image-edit-cancel');
  const saveBtn = document.getElementById('image-edit-save');
  const urlInput = document.getElementById('image-edit-url-input');
  const previewContainer = document.getElementById('image-edit-preview');
  const previewImg = document.getElementById('image-edit-preview-img');
  const messageEl = document.getElementById('image-edit-message');

  if (!editBtn) return;

  // Show the admin edit button
  editBtn.style.display = 'flex';

  // Open modal
  editBtn.addEventListener('click', openImageEditModal);

  // Close modal
  closeBtn.addEventListener('click', closeImageEditModal);
  cancelBtn.addEventListener('click', closeImageEditModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeImageEditModal();
    }
  });

  // Preview image on URL input
  urlInput.addEventListener('input', debounce(previewImage, 500));

  // Save image
  saveBtn.addEventListener('click', saveImage);

  // Enter key to save
  urlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      saveImage();
    }
  });
}

function openImageEditModal() {
  const modal = document.getElementById('image-edit-modal');
  const currentImg = document.getElementById('image-edit-current-img');
  const fragranceImg = document.getElementById('fragrance-image');
  const urlInput = document.getElementById('image-edit-url-input');
  const previewContainer = document.getElementById('image-edit-preview');
  const messageEl = document.getElementById('image-edit-message');

  // Get brand and name from window.fragrance (set in HTML)
  if (window.fragrance) {
    currentFragranceBrand = window.fragrance.currentBrand || '';
    currentFragranceName = window.fragrance.currentName || '';
  }

  // Set current image
  currentImg.src = fragranceImg.src;

  // Clear input and preview
  urlInput.value = '';
  previewContainer.classList.remove('show');
  messageEl.classList.remove('show');

  // Show modal
  modal.classList.add('active');

  // Focus input
  setTimeout(() => urlInput.focus(), 100);
}

function closeImageEditModal() {
  const modal = document.getElementById('image-edit-modal');
  modal.classList.remove('active');
}

function previewImage() {
  const urlInput = document.getElementById('image-edit-url-input');
  const previewContainer = document.getElementById('image-edit-preview');
  const previewImg = document.getElementById('image-edit-preview-img');
  const url = urlInput.value.trim();

  if (!url) {
    previewContainer.classList.remove('show');
    return;
  }

  // Basic URL validation
  try {
    new URL(url);
    previewImg.src = url;
    previewContainer.classList.add('show');
  } catch (e) {
    previewContainer.classList.remove('show');
  }
}

async function saveImage() {
  const urlInput = document.getElementById('image-edit-url-input');
  const saveBtn = document.getElementById('image-edit-save');
  const messageEl = document.getElementById('image-edit-message');
  const fragranceImg = document.getElementById('fragrance-image');

  const newUrl = urlInput.value.trim();

  if (!newUrl) {
    showImageEditMessage('Please enter an image URL', 'error');
    return;
  }

  // Validate URL
  try {
    new URL(newUrl);
  } catch (e) {
    showImageEditMessage('Please enter a valid URL', 'error');
    return;
  }

  if (!currentFragranceBrand || !currentFragranceName) {
    showImageEditMessage('Fragrance information not loaded', 'error');
    return;
  }

  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  try {
    const result = await saveImageOverride(
      currentFragranceBrand,
      currentFragranceName,
      newUrl,
      currentUser.id
    );

    if (result.success) {
      // Update the displayed image immediately
      fragranceImg.src = newUrl;
      showImageEditMessage('Image updated successfully!', 'success');

      setTimeout(() => {
        closeImageEditModal();
      }, 1500);
    } else {
      showImageEditMessage(result.error || 'Failed to save image', 'error');
    }
  } catch (err) {
    console.error('Error saving image:', err);
    showImageEditMessage('An unexpected error occurred', 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Image';
  }
}

function showImageEditMessage(message, type) {
  const messageEl = document.getElementById('image-edit-message');
  messageEl.textContent = message;
  messageEl.className = `image-edit-message ${type} show`;

  if (type === 'success') {
    setTimeout(() => {
      messageEl.classList.remove('show');
    }, 3000);
  }
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
