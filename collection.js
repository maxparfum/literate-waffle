import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm';
import { makeCanonicalFragranceId, makeFragranceUrl } from './fragrance-id-utils.js';
import { loadAllImageOverrides, makeOverrideKey } from './fragrance-image-override.js';

const SUPABASE_URL = 'https://moazswfklpvoperkarlk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vYXpzd2ZrbHB2b3BlcmthcmxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3MDc2MTYsImV4cCI6MjA3OTI4MzYxNn0.7_xrCWwV_elxQ0i4bdQ9Hsv-HGB-qz30a__1aeJ4QiM';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let collectionId = '';
let collectionData = null;
let fragrancesData = [];
let isOwner = false;
let imageOverrideMap = new Map();

// NOTE: MaxParfum uses ONE canonical fragrance ID system (fragrance-id-utils.js).
// DO NOT create alternative ID generators. Always use makeCanonicalFragranceId().


async function init() {
  const params = new URLSearchParams(window.location.search);
  collectionId = params.get('id') || '';

  if (!collectionId) {
    console.error('No collection ID found in URL');
    document.getElementById('loading').textContent = 'Invalid collection ID';
    return;
  }

  const { data: { session } } = await supabase.auth.getSession();
  currentUser = session?.user || null;

 if (currentUser) {
  const authLink = document.getElementById('auth-link');
  if (authLink) {
    authLink.textContent = 'Profile';
    authLink.href = 'profile.html';
  }
}


  await loadFragrancesData();
  await loadCollection();
}

async function loadFragrancesData() {
  try {
    const [response, overrides] = await Promise.all([
      fetch('fragrances_merged.json'),
      loadAllImageOverrides().catch(() => new Map())
    ]);
    fragrancesData = await response.json();
    imageOverrideMap = overrides;
  } catch (error) {
    console.error('Error loading fragrances data:', error);
    fragrancesData = [];
  }
}

async function loadCollection() {
  try {
    const { data: collection, error } = await supabase
      .from('collections')
      .select('*')
      .eq('id', collectionId)
      .maybeSingle();

    if (error) {
      console.error('Error loading collection:', error);
      document.getElementById('loading').textContent = 'Error loading collection';
      return;
    }

    if (!collection) {
      document.getElementById('loading').textContent = 'Collection not found';
      return;
    }

    collectionData = collection;
    isOwner = currentUser && currentUser.id === collection.user_id;

    await loadCollectionItems();
    renderCollection();

  } catch (err) {
    console.error('Unexpected error loading collection:', err);
    document.getElementById('loading').textContent = 'Error loading collection';
  }
}

async function loadCollectionItems() {
  try {
    const { data: items, error } = await supabase
      .from('collection_items')
      .select('id, fragrance_id, created_at')
      .eq('collection_id', collectionId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading collection items:', error);
      return;
    }

    const fragrances = (items || []).map(item => {
  const fragranceData = fragrancesData.find(f => {
    return makeCanonicalFragranceId(f.brand, f.name) === item.fragrance_id;
  });

  // If we can't match it to the JSON dataset, still return something
  // so it doesn't disappear from the UI.
  if (!fragranceData) {
    return {
      ...item,
      brand: 'Unknown fragrance',
      name: item.fragrance_id,   // shows the stored id so you can see what format it is
      image: ''
    };
  }

  return {
    ...item,
    ...fragranceData
  };
});


    renderFragrances(fragrances);

  } catch (err) {
    console.error('Unexpected error loading collection items:', err);
  }
}

function renderCollection() {
  document.getElementById('loading').classList.add('hidden');
  document.getElementById('collection-content').classList.remove('hidden');

  document.getElementById('collection-title').textContent = collectionData.name;

  const descriptionEl = document.getElementById('collection-description');
  if (collectionData.description) {
    descriptionEl.textContent = collectionData.description;
    descriptionEl.style.display = 'block';
  } else {
    descriptionEl.style.display = 'none';
  }

  if (isOwner) {
    document.getElementById('collection-actions').style.display = 'flex';
  }
}

function renderFragrances(fragrances) {
  const container = document.getElementById('fragrances-container');

  const countEl = document.getElementById('collection-count');
  countEl.textContent = `${fragrances.length} ${fragrances.length === 1 ? 'fragrance' : 'fragrances'}`;

  if (!fragrances || fragrances.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📦</div>
        <p>No fragrances in this collection yet.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="fragrances-grid">
      ${fragrances.map(fragrance => {
       const fragranceUrl = makeFragranceUrl(fragrance.brand, fragrance.name);
const removeBtn = isOwner ? `<button class="remove-item-btn visible" data-item-id="${fragrance.id}" data-fragrance-name="${fragrance.brand} - ${fragrance.name}">×</button>` : '';

        return `
          <div class="fragrance-card" onclick="window.location.href='${fragranceUrl}'">
            ${removeBtn}
            <img src="${imageOverrideMap.get(makeOverrideKey(fragrance.brand, fragrance.name)) || fragrance.image || 'https://via.placeholder.com/200'}" alt="${fragrance.name}" class="fragrance-image" />
            <div class="fragrance-info">
              <div class="fragrance-brand">${fragrance.brand}</div>
              <div class="fragrance-name">${fragrance.name}</div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  if (isOwner) {
    document.querySelectorAll('.remove-item-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const itemId = btn.dataset.itemId;
        const fragranceName = btn.dataset.fragranceName;
        await removeItem(itemId, fragranceName);
      });
    });
  }
}

async function removeItem(itemId, fragranceName) {
  if (!confirm(`Remove "${fragranceName}" from this collection?`)) {
    return;
  }

  try {
    const { error } = await supabase
      .from('collection_items')
      .delete()
      .eq('id', itemId);

    if (error) {
      console.error('Error removing item:', error);
      alert('Failed to remove item. Please try again.');
      return;
    }

    await loadCollectionItems();

  } catch (err) {
    console.error('Unexpected error removing item:', err);
    alert('Failed to remove item. Please try again.');
  }
}

document.getElementById('edit-collection-btn')?.addEventListener('click', async () => {
  const newName = prompt('Enter new collection name:', collectionData.name);

  if (!newName || newName === collectionData.name) {
    return;
  }

  try {
    const { error } = await supabase
      .from('collections')
      .update({ name: newName })
      .eq('id', collectionId);

    if (error) {
      console.error('Error updating collection:', error);
      alert('Failed to update collection. Please try again.');
      return;
    }

    collectionData.name = newName;
    document.getElementById('collection-title').textContent = newName;

  } catch (err) {
    console.error('Unexpected error updating collection:', err);
    alert('Failed to update collection. Please try again.');
  }
});

document.getElementById('delete-collection-btn')?.addEventListener('click', async () => {
  if (!confirm(`Delete "${collectionData.name}"? This will remove all fragrances from this collection. This action cannot be undone.`)) {
    return;
  }

  try {
    const { error } = await supabase
      .from('collections')
      .delete()
      .eq('id', collectionId);

    if (error) {
      console.error('Error deleting collection:', error);
      alert('Failed to delete collection. Please try again.');
      return;
    }

    alert('Collection deleted successfully');
    window.location.href = 'profile.html';

  } catch (err) {
    console.error('Unexpected error deleting collection:', err);
    alert('Failed to delete collection. Please try again.');
  }
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

