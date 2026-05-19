import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let currentUser = null;
let existingFragrances = [];
const tagFields = ['top_notes', 'middle_notes', 'base_notes', 'main_accords', 'suggested_dupes'];
const tagData = {
  top_notes: [],
  middle_notes: [],
  base_notes: [],
  main_accords: [],
  suggested_dupes: []
};

async function init() {
  const { data: { user } } = await supabase.auth.getUser();
  currentUser = user;

  const authRequiredEl = document.getElementById('auth-required');
  const formWrapperEl = document.getElementById('form-wrapper');

  if (!currentUser) {
    authRequiredEl.style.display = 'block';
    formWrapperEl.style.display = 'none';
    return;
  }

  authRequiredEl.style.display = 'none';
  formWrapperEl.style.display = 'block';

  await loadExistingFragrances();
  setupFormHandlers();
  setupTabNavigation();
  initializeTagInputs();
}

async function loadExistingFragrances() {
  try {
    const response = await fetch('fragrances_merged.json');
    if (response.ok) {
      existingFragrances = await response.json();
    }
  } catch (error) {
    console.warn('Could not load existing fragrances for duplicate check:', error);
  }
}

function setupFormHandlers() {
  const form = document.getElementById('add-fragrance-form');
  const brandInput = document.getElementById('brand');
  const nameInput = document.getElementById('name');
  const submitAnotherBtn = document.getElementById('submit-another-btn');
  const gotoAddTabBtn = document.getElementById('goto-add-tab');

  brandInput.addEventListener('blur', checkForDuplicates);
  nameInput.addEventListener('blur', checkForDuplicates);
  form.addEventListener('submit', handleSubmit);

  if (submitAnotherBtn) {
    submitAnotherBtn.addEventListener('click', () => {
      document.getElementById('success-message').classList.remove('show');
      switchTab('add-tab');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  if (gotoAddTabBtn) {
    gotoAddTabBtn.addEventListener('click', () => {
      switchTab('add-tab');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
}

function setupTabNavigation() {
  const tabButtons = document.querySelectorAll('.tab-btn');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      switchTab(tabId);
    });
  });
}

function switchTab(tabId) {
  const allTabs = document.querySelectorAll('.tab-content');
  const allButtons = document.querySelectorAll('.tab-btn');

  allTabs.forEach(tab => tab.classList.remove('active'));
  allButtons.forEach(btn => btn.classList.remove('active'));

  const targetTab = document.getElementById(tabId);
  const targetButton = document.querySelector(`[data-tab="${tabId}"]`);

  if (targetTab) targetTab.classList.add('active');
  if (targetButton) targetButton.classList.add('active');

  if (tabId === 'submissions-tab') {
    loadUserSubmissions();
  }
}

function initializeTagInputs() {
  tagFields.forEach(fieldName => {
    const container = document.getElementById(`${fieldName}-tags`);
    const input = container.querySelector('.tag-input');

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        addTagFromInput(fieldName, input);
      } else if (e.key === 'Backspace' && input.value === '' && tagData[fieldName].length > 0) {
        removeTag(fieldName, tagData[fieldName].length - 1);
      }
    });

    input.addEventListener('blur', () => {
      if (input.value.trim()) {
        addTagFromInput(fieldName, input);
      }
    });

    input.addEventListener('paste', (e) => {
      setTimeout(() => {
        if (input.value.includes(',')) {
          addTagFromInput(fieldName, input);
        }
      }, 10);
    });

    container.addEventListener('click', () => {
      input.focus();
    });
  });
}

function addTagFromInput(fieldName, input) {
  const values = input.value.split(',').map(v => v.trim()).filter(v => v);

  values.forEach(value => {
    if (value && !tagData[fieldName].includes(value)) {
      tagData[fieldName].push(value);
    }
  });

  input.value = '';
  renderTags(fieldName);
}

function addTag(fieldName, value) {
  if (value && !tagData[fieldName].includes(value)) {
    tagData[fieldName].push(value);
    renderTags(fieldName);
  }
}

function removeTag(fieldName, index) {
  tagData[fieldName].splice(index, 1);
  renderTags(fieldName);
}

function renderTags(fieldName) {
  const container = document.getElementById(`${fieldName}-tags`);
  const input = container.querySelector('.tag-input');

  const existingTags = container.querySelectorAll('.tag');
  existingTags.forEach(tag => tag.remove());

  tagData[fieldName].forEach((value, index) => {
    const tag = document.createElement('div');
    tag.className = 'tag';
    tag.innerHTML = `
      ${value}
      <button type="button" class="tag-remove" data-field="${fieldName}" data-index="${index}">×</button>
    `;
    container.insertBefore(tag, input);

    const removeBtn = tag.querySelector('.tag-remove');
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeTag(fieldName, index);
    });
  });
}

function checkForDuplicates() {
  const brand = document.getElementById('brand').value.trim();
  const name = document.getElementById('name').value.trim();

  if (!brand || !name) return;

  const duplicateWarning = document.getElementById('duplicate-warning');
  const duplicateMessage = document.getElementById('duplicate-message');

  const existsInLive = existingFragrances.some(f =>
    f.brand.toLowerCase() === brand.toLowerCase() &&
    f.name.toLowerCase() === name.toLowerCase()
  );

  if (existsInLive) {
    duplicateMessage.textContent = `A fragrance named "${name}" by ${brand} already exists in our database. Please verify this isn't a duplicate.`;
    duplicateWarning.classList.add('show');
    duplicateWarning.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } else {
    duplicateWarning.classList.remove('show');
  }
}

function validateForm() {
  let isValid = true;
  clearAllErrors();

  const brand = document.getElementById('brand').value.trim();
  const name = document.getElementById('name').value.trim();
  const country = document.getElementById('country').value.trim();
  const gender = document.getElementById('gender').value;
  const year = document.getElementById('year').value.trim();
  const image = document.getElementById('image').value.trim();
  const sourceUrl = document.getElementById('source_url').value.trim();

  if (!brand) {
    showError('brand', 'Brand is required');
    isValid = false;
  }

  if (!name) {
    showError('name', 'Fragrance name is required');
    isValid = false;
  }

  if (!country) {
    showError('country', 'Country is required');
    isValid = false;
  }

  if (!gender) {
    showError('gender', 'Please select a gender');
    isValid = false;
  }

  if (!year) {
    showError('year', 'Release year is required');
    isValid = false;
  } else {
    const yearNum = parseInt(year);
    const currentYear = new Date().getFullYear();

    if (isNaN(yearNum)) {
      showError('year', 'Please enter a valid year');
      isValid = false;
    } else if (yearNum < 1800) {
      showError('year', 'Year seems too old. Please verify.');
      isValid = false;
    } else if (yearNum > currentYear + 1) {
      showError('year', `Year cannot be in the future (max ${currentYear + 1})`);
      isValid = false;
    }
  }

  if (!image) {
    showError('image', 'Image URL is required');
    isValid = false;
  } else if (!isValidUrl(image)) {
    showError('image', 'Please enter a valid image URL (starting with http:// or https://)');
    isValid = false;
  }

  if (sourceUrl && !isValidUrl(sourceUrl)) {
    showError('source_url', 'Please enter a valid URL (starting with http:// or https://)');
    isValid = false;
  }

  if (tagData.top_notes.length === 0) {
    showError('top_notes', 'Please add at least one top note');
    isValid = false;
  }

  if (tagData.middle_notes.length === 0) {
    showError('middle_notes', 'Please add at least one middle note');
    isValid = false;
  }

  if (tagData.base_notes.length === 0) {
    showError('base_notes', 'Please add at least one base note');
    isValid = false;
  }

  if (tagData.main_accords.length === 0) {
    showError('main_accords', 'Please add at least one main accord');
    isValid = false;
  }

  if (!isValid) {
    const firstError = document.querySelector('.error-message.show');
    if (firstError) {
      firstError.closest('.form-group').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  return isValid;
}

function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

function showError(fieldId, message) {
  const input = document.getElementById(fieldId);
  const tagsContainer = document.getElementById(`${fieldId}-tags`);
  const errorEl = document.getElementById(`${fieldId}-error`);

  if (input) input.classList.add('error');
  if (tagsContainer) tagsContainer.classList.add('error');

  if (errorEl) {
    errorEl.textContent = message;
    errorEl.classList.add('show');
  }
}

function clearAllErrors() {
  const errorMessages = document.querySelectorAll('.error-message');
  const inputs = document.querySelectorAll('.form-input, .form-select, .form-textarea');
  const tagsContainers = document.querySelectorAll('.tags-container');

  errorMessages.forEach(el => {
    el.textContent = '';
    el.classList.remove('show');
  });

  inputs.forEach(el => el.classList.remove('error'));
  tagsContainers.forEach(el => el.classList.remove('error'));
}

async function handleSubmit(e) {
  e.preventDefault();

  if (!validateForm()) {
    return;
  }

  const duplicateWarning = document.getElementById('duplicate-warning');
  if (duplicateWarning.classList.contains('show')) {
    const brand = document.getElementById('brand').value.trim();
    const name = document.getElementById('name').value.trim();
    if (!confirm(`"${name}" by ${brand} may already exist. Submit anyway?`)) {
      return;
    }
  }

  const submitBtn = document.getElementById('submit-btn');
  const originalText = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="loading-spinner"></span>Submitting...';

  try {
    await checkForExistingSubmissions();
    const formData = collectFormData();
    const additionalNotes = document.getElementById('additional_notes').value.trim();

    const { data, error } = await supabase
      .from('fragrance_submissions')
      .insert([formData])
      .select();

    if (error) {
      if (error.message.includes('duplicate') || error.code === '23505') {
        throw new Error('This fragrance has already been submitted. Please check the database.');
      }
      throw error;
    }

    if (data && data[0] && additionalNotes) {
      const submissionId = data[0].id;

      const { error: commentError } = await supabase
        .from('fragrance_submission_comments')
        .insert([{
          submission_id: submissionId,
          user_id: currentUser.id,
          body: additionalNotes,
          is_original_submitter_comment: true
        }]);

      if (commentError) {
        console.warn('Failed to create comment:', commentError);
      }
    }

    showSuccess();
    resetForm();

  } catch (error) {
    console.error('Submission error:', error);

    let errorMessage = 'Failed to submit fragrance. ';
    if (error.message.includes('already submitted')) {
      errorMessage += error.message;
    } else if (error.message.includes('duplicate')) {
      errorMessage += 'This fragrance may already exist in our database.';
    } else {
      errorMessage += 'Please check your connection and try again.';
    }

    alert(errorMessage);
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;
  }
}

async function checkForExistingSubmissions() {
  const brand = document.getElementById('brand').value.trim();
  const name = document.getElementById('name').value.trim();

  const { data, error } = await supabase
    .from('fragrance_submissions')
    .select('id, brand, name, status')
    .ilike('brand', brand)
    .ilike('name', name);

  if (error) {
    console.warn('Could not check existing submissions:', error);
    return;
  }

  if (data && data.length > 0) {
    const pending = data.filter(s => s.status === 'pending');
    if (pending.length > 0) {
      throw new Error('You have already submitted this fragrance. Please wait for review.');
    }
  }
}

function collectFormData() {
  const brand = document.getElementById('brand').value.trim();
  const name = document.getElementById('name').value.trim();
  const country = document.getElementById('country').value.trim();
  const gender = document.getElementById('gender').value;
  const yearValue = document.getElementById('year').value.trim();
  const year = parseInt(yearValue);
  const image = document.getElementById('image').value.trim();
  const perfumer1 = document.getElementById('perfumer1').value.trim() || null;
  const perfumer2 = document.getElementById('perfumer2').value.trim() || null;
  const sourceName = document.getElementById('source_name').value.trim() || null;
  const sourceUrl = document.getElementById('source_url').value.trim() || null;

  return {
    submitted_by: currentUser.id,
    brand,
    name,
    country,
    gender,
    year,
    top_notes: tagData.top_notes,
    middle_notes: tagData.middle_notes,
    base_notes: tagData.base_notes,
    perfumer1,
    perfumer2,
    main_accords: tagData.main_accords,
    image,
    suggested_dupes: tagData.suggested_dupes.length > 0 ? tagData.suggested_dupes : [],source_name: sourceName,
    source_url: sourceUrl,
    status: 'pending'
  };
}

function showSuccess() {
  const successCard = document.getElementById('success-message');
  const formContainer = document.getElementById('add-fragrance-form');

  successCard.classList.add('show');
  formContainer.style.display = 'none';

  window.scrollTo({ top: 0, behavior: 'smooth' });

  setTimeout(() => {
    switchTab('submissions-tab');
    successCard.classList.remove('show');
    formContainer.style.display = 'flex';
  }, 3000);
}

function resetForm() {
  const form = document.getElementById('add-fragrance-form');
  form.reset();
  clearAllErrors();

  tagFields.forEach(field => {
    tagData[field] = [];
    renderTags(field);
  });

  const duplicateWarning = document.getElementById('duplicate-warning');
  duplicateWarning.classList.remove('show');

  form.style.display = 'flex';
}

async function loadUserSubmissions() {
  const loadingEl = document.getElementById('submissions-loading');
  const contentEl = document.getElementById('submissions-content');
  const emptyEl = document.getElementById('submissions-empty');
  const gridEl = document.getElementById('submissions-grid');

  loadingEl.style.display = 'block';
  contentEl.style.display = 'none';
  emptyEl.style.display = 'none';

  try {
    const { data: submissions, error } = await supabase
      .from('fragrance_submissions')
      .select('*')
      .eq('submitted_by', currentUser.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    loadingEl.style.display = 'none';

    if (!submissions || submissions.length === 0) {
      emptyEl.style.display = 'block';
      return;
    }

    const submissionIds = submissions.map(s => s.id);

    const { data: comments } = await supabase
      .from('fragrance_submission_comments')
      .select('*, users:user_id(email)')
      .in('submission_id', submissionIds)
      .eq('is_original_submitter_comment', true);

    const commentsMap = {};
    if (comments) {
      comments.forEach(comment => {
        commentsMap[comment.submission_id] = comment;
      });
    }

    gridEl.innerHTML = '';
    submissions.forEach(submission => {
      const comment = commentsMap[submission.id];
      const card = createSubmissionCard(submission, comment);
      gridEl.appendChild(card);
    });

    contentEl.style.display = 'block';
  } catch (error) {
    console.error('Error loading submissions:', error);
    loadingEl.style.display = 'none';
    emptyEl.style.display = 'block';
  }
}

function createSubmissionCard(submission, comment) {
  const card = document.createElement('div');
  card.className = 'submission-card';

  const statusClass = `status-${submission.status}`;
  const statusText = submission.status.charAt(0).toUpperCase() + submission.status.slice(1);

  const createdDate = new Date(submission.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  const imageHtml = submission.image
    ? `<img src="${escapeHtml(submission.image)}" alt="${escapeHtml(submission.name)}" class="submission-image" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
       <div class="submission-image-placeholder" style="display: none;">🌸</div>`
    : `<div class="submission-image-placeholder">🌸</div>`;

  const details = [];
  if (submission.country) details.push(`<span class="submission-detail"><strong>Country:</strong> ${escapeHtml(submission.country)}</span>`);
  if (submission.gender) details.push(`<span class="submission-detail"><strong>Gender:</strong> ${escapeHtml(submission.gender)}</span>`);
  if (submission.year) details.push(`<span class="submission-detail"><strong>Year:</strong> ${submission.year}</span>`);

  let commentHtml = '';
  if (comment) {
    const commentDate = new Date(comment.created_at).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });

    const username = comment.users?.email?.split('@')[0] || 'You';

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
      </div>
      ${imageHtml}
    </div>
    ${details.length > 0 ? `<div class="submission-details">${details.join('')}</div>` : ''}
    ${commentHtml}
    <div class="submission-footer">
      <span class="submission-date">Submitted ${createdDate}</span>
      <span class="status-badge ${statusClass}">${statusText}</span>
    </div>
  `;

  return card;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', init);
