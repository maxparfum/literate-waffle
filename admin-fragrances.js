import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase.js';
import { awardPoints } from './points-helper.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let currentUser = null;
let isAdmin = false;

async function init() {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = '/login.html';
      return;
    }

    currentUser = user;

    await checkAdminStatus();

    if (!isAdmin) {
      showAccessDenied();
      return;
    }

    await loadPendingSubmissions();

  } catch (error) {
    console.error('Initialization error:', error);
    showAccessDenied();
  }
}

async function checkAdminStatus() {
  try {
    const userEmail = currentUser?.email?.toLowerCase();

    if (!userEmail) {
      isAdmin = false;
      return;
    }

    const { data, error } = await supabase
      .from('admin_users')
      .select('id')
      .eq('email', userEmail)
      .maybeSingle();

    if (error) {
      console.error('Error checking admin status:', error);
      isAdmin = false;
      return;
    }

    isAdmin = !!data;
  } catch (error) {
    console.error('Admin check error:', error);
    isAdmin = false;
  }
}
function showAccessDenied() {
  document.getElementById('loading').style.display = 'none';
  document.getElementById('main-content').style.display = 'none';
  document.getElementById('access-denied').style.display = 'block';
}

async function loadPendingSubmissions() {
  const loadingEl = document.getElementById('loading');
  const mainContent = document.getElementById('main-content');
  const gridEl = document.getElementById('submissions-grid');
  const emptyEl = document.getElementById('empty-state');

  loadingEl.style.display = 'block';
  mainContent.style.display = 'none';

  try {
    const { data: submissions, error } = await supabase
      .from('fragrance_submissions')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;

    loadingEl.style.display = 'none';
    mainContent.style.display = 'block';

    if (!submissions || submissions.length === 0) {
      document.getElementById('pending-count').textContent = '0';
      gridEl.innerHTML = '';
      emptyEl.style.display = 'block';
      return;
    }

    const submissionIds = submissions.map(s => s.id);

    const { data: comments } = await supabase
  .from('fragrance_submission_comments')
  .select('*')
  .in('submission_id', submissionIds)
  .eq('is_original_submitter_comment', true);

    const commentsMap = {};
    if (comments) {
      comments.forEach(comment => {
        commentsMap[comment.submission_id] = comment;
      });
    }

    document.getElementById('pending-count').textContent = submissions.length;

    gridEl.innerHTML = '';
    emptyEl.style.display = 'none';

    submissions.forEach(submission => {
      const comment = commentsMap[submission.id];
      const card = createSubmissionCard(submission, comment);
      gridEl.appendChild(card);
    });

  } catch (error) {
    console.error('Error loading submissions:', error);
    loadingEl.style.display = 'none';
    mainContent.style.display = 'block';
    document.getElementById('pending-count').textContent = '0';
    gridEl.innerHTML = '';
    emptyEl.style.display = 'block';
  }
}

function createSubmissionCard(submission, comment) {
  const card = document.createElement('div');
  card.className = 'submission-card';
  card.dataset.submissionId = submission.id;

  const createdDate = new Date(submission.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const imageHtml = submission.image
    ? `<img src="${escapeHtml(submission.image)}" alt="${escapeHtml(submission.name)}" class="submission-image" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
       <div class="submission-image-placeholder" style="display: none;">🌸</div>`
    : `<div class="submission-image-placeholder">🌸</div>`;

  const topNotes = Array.isArray(submission.top_notes) ? submission.top_notes : [];
  const middleNotes = Array.isArray(submission.middle_notes) ? submission.middle_notes : [];
  const baseNotes = Array.isArray(submission.base_notes) ? submission.base_notes : [];
  const mainAccords = Array.isArray(submission.main_accords) ? submission.main_accords : [];
  const suggestedDupes = Array.isArray(submission.suggested_dupes) ? submission.suggested_dupes : [];

  let commentHtml = '';
  if (comment) {
    const commentDate = new Date(comment.created_at).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });

    const username = 'Submitter';

    commentHtml = `
      <div class="submission-comment">
        <div class="comment-header">
          <span class="comment-author">${escapeHtml(username)}</span>
          <span class="submitter-badge">Original Submitter</span>
          <span class="comment-date">${commentDate}</span>
        </div>
        <p class="comment-body">${escapeHtml(comment.body)}</p>
      </div>
    `;
  }

  card.innerHTML = `
    <div class="submission-header">
      <div class="submission-info">
        <div class="submission-brand">${escapeHtml(submission.brand)}</div>
        <div class="submission-name">${escapeHtml(submission.name)}</div>
        <div class="submission-meta">
          ${submission.country ? `<span>📍 ${escapeHtml(submission.country)}</span>` : ''}
          ${submission.gender ? `<span>👤 ${escapeHtml(submission.gender)}</span>` : ''}
          ${submission.year ? `<span>📅 ${submission.year}</span>` : ''}
        </div>
      </div>
      ${imageHtml}
    </div>

    ${commentHtml}

    <div class="submission-details">
      ${submission.perfumer1 || submission.perfumer2 ? `
        <div class="detail-group">
          <div class="detail-label">Perfumer${submission.perfumer2 ? 's' : ''}</div>
          <div class="detail-value">
            ${escapeHtml([submission.perfumer1, submission.perfumer2].filter(Boolean).join(', '))}
          </div>
        </div>
      ` : ''}

      ${topNotes.length > 0 ? `
        <div class="detail-group">
          <div class="detail-label">Top Notes</div>
          <div class="detail-value">
            <div class="tags-list">
              ${topNotes.map(note => `<span class="tag">${escapeHtml(note)}</span>`).join('')}
            </div>
          </div>
        </div>
      ` : ''}

      ${middleNotes.length > 0 ? `
        <div class="detail-group">
          <div class="detail-label">Middle Notes</div>
          <div class="detail-value">
            <div class="tags-list">
              ${middleNotes.map(note => `<span class="tag">${escapeHtml(note)}</span>`).join('')}
            </div>
          </div>
        </div>
      ` : ''}

      ${baseNotes.length > 0 ? `
        <div class="detail-group">
          <div class="detail-label">Base Notes</div>
          <div class="detail-value">
            <div class="tags-list">
              ${baseNotes.map(note => `<span class="tag">${escapeHtml(note)}</span>`).join('')}
            </div>
          </div>
        </div>
      ` : ''}

      ${mainAccords.length > 0 ? `
        <div class="detail-group">
          <div class="detail-label">Main Accords</div>
          <div class="detail-value">
            <div class="tags-list">
              ${mainAccords.map(accord => `<span class="tag">${escapeHtml(accord)}</span>`).join('')}
            </div>
          </div>
        </div>
      ` : ''}

      ${suggestedDupes.length > 0 ? `
        <div class="detail-group">
          <div class="detail-label">Suggested Dupes</div>
          <div class="detail-value">
            <div class="tags-list">
              ${suggestedDupes.map(dupe => `<span class="tag">${escapeHtml(dupe)}</span>`).join('')}
            </div>
          </div>
        </div>
      ` : ''}
    </div>

    ${submission.source_name || submission.source_url ? `
      <div class="source-info">
        ${submission.source_name ? `
          <div class="source-label">Source</div>
          <div class="source-value">${escapeHtml(submission.source_name)}</div>
        ` : ''}
        ${submission.source_url ? `
          <div class="source-label" style="${submission.source_name ? 'margin-top: 0.75rem;' : ''}">Source URL</div>
          <div class="source-value"><a href="${escapeHtml(submission.source_url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(submission.source_url)}</a></div>
        ` : ''}
      </div>
    ` : ''}

    ${submission.additional_notes ? `
      <div class="source-info">
        <div class="source-label">Additional Notes from Submitter</div>
        <div class="source-value">${escapeHtml(submission.additional_notes)}</div>
      </div>
    ` : ''}

    <div class="submission-date">Submitted ${createdDate}</div>

    <div class="review-notes-section">
      <label class="review-notes-label" for="review-notes-${submission.id}">
        Review Notes (optional)
      </label>
      <textarea
        id="review-notes-${submission.id}"
        class="review-notes-textarea"
        placeholder="Add approval reasoning, rejection reasoning, or internal notes..."
      ></textarea>
    </div>

    <div class="submission-footer">
      <button class="action-btn approve-btn" onclick="handleApprove('${submission.id}')">
        Approve
      </button>
      <button class="action-btn reject-btn" onclick="handleReject('${submission.id}')">
        Reject
      </button>
    </div>
  `;

  return card;
}

window.handleApprove = async function(submissionId) {
  if (!confirm('Are you sure you want to approve this fragrance submission?')) {
    return;
  }

  const card = document.querySelector(`[data-submission-id="${submissionId}"]`);
  const approveBtn = card.querySelector('.approve-btn');
  const rejectBtn = card.querySelector('.reject-btn');
  const reviewNotesTextarea = document.getElementById(`review-notes-${submissionId}`);
  const reviewNotes = reviewNotesTextarea?.value.trim() || null;

  const originalText = approveBtn.innerHTML;
  approveBtn.disabled = true;
  rejectBtn.disabled = true;
  approveBtn.innerHTML = '<span class="spinner"></span>Approving...';

  try {
    // Get the submission data first to check current status and get submitted_by
    const { data: submission, error: fetchError } = await supabase
      .from('fragrance_submissions')
      .select('id, status, submitted_by')
      .eq('id', submissionId)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (!submission) {
      throw new Error('Submission not found');
    }

    // Only award points if the submission is not already approved
    const wasNotApproved = submission.status !== 'approved';

    const updateData = {
      status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: currentUser.id,
      review_notes: reviewNotes
    };

    const { error } = await supabase
      .from('fragrance_submissions')
      .update(updateData)
      .eq('id', submissionId);

    if (error) throw error;

    // Award points to the submitter if this is a new approval
    if (wasNotApproved && submission.submitted_by) {
      await awardPoints(
        'fragrance_submission_approved',
        'fragrance_submission',
        submissionId,
        submission.submitted_by
      );
    }

    card.style.transition = 'all 0.3s ease';
    card.style.opacity = '0';
    card.style.transform = 'scale(0.95)';

    setTimeout(() => {
      card.remove();
      updatePendingCount();
      checkIfEmpty();
    }, 300);

  } catch (error) {
    console.error('Error approving submission:', error);
    alert('Failed to approve submission. Please try again.');
    approveBtn.disabled = false;
    rejectBtn.disabled = false;
    approveBtn.innerHTML = originalText;
  }
};

window.handleReject = async function(submissionId) {
  if (!confirm('Are you sure you want to reject this fragrance submission?')) {
    return;
  }

  const card = document.querySelector(`[data-submission-id="${submissionId}"]`);
  const approveBtn = card.querySelector('.approve-btn');
  const rejectBtn = card.querySelector('.reject-btn');
  const reviewNotesTextarea = document.getElementById(`review-notes-${submissionId}`);
  const reviewNotes = reviewNotesTextarea?.value.trim() || null;

  const originalText = rejectBtn.innerHTML;
  approveBtn.disabled = true;
  rejectBtn.disabled = true;
  rejectBtn.innerHTML = '<span class="spinner"></span>Rejecting...';

  try {
    const updateData = {
      status: 'rejected',
      review_notes: reviewNotes
    };

    const { error } = await supabase
      .from('fragrance_submissions')
      .update(updateData)
      .eq('id', submissionId);

    if (error) throw error;

    card.style.transition = 'all 0.3s ease';
    card.style.opacity = '0';
    card.style.transform = 'scale(0.95)';

    setTimeout(() => {
      card.remove();
      updatePendingCount();
      checkIfEmpty();
    }, 300);

  } catch (error) {
    console.error('Error rejecting submission:', error);
    alert('Failed to reject submission. Please try again.');
    approveBtn.disabled = false;
    rejectBtn.disabled = false;
    rejectBtn.innerHTML = originalText;
  }
};

function updatePendingCount() {
  const cards = document.querySelectorAll('.submission-card');
  document.getElementById('pending-count').textContent = cards.length;
}

function checkIfEmpty() {
  const cards = document.querySelectorAll('.submission-card');
  const emptyEl = document.getElementById('empty-state');

  if (cards.length === 0) {
    emptyEl.style.display = 'block';
  }
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', init);
