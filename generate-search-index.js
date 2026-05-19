#!/usr/bin/env node

/**
 * Generate lightweight search index from full fragrances dataset
 * This creates a minimal JSON file for fast searching/listing
 */

const fs = require('fs');
const path = require('path');

const INPUT_FILE = './fragrances_merged.json';
const OUTPUT_FILE = './fragrances_index.json';

function generateSearchIndex() {
  console.log('🔍 Generating lightweight search index...');

  // Load full dataset
  const fullData = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
  console.log(`📊 Loaded ${fullData.length} fragrances from full dataset`);

  // Extract only essential fields for search/listing
  const lightweightIndex = fullData.map(fragrance => {
  return {
    brand: fragrance.brand || '',
    name: fragrance.name || '',
    image: fragrance.image || null,
    year: fragrance.year || null,
    gender: fragrance.gender || null,
    rating_value: fragrance.rating_value || null,
    main_accords: fragrance.main_accords ? fragrance.main_accords.slice(0, 3) : [],
    has_dupes: Array.isArray(fragrance.dupes) && fragrance.dupes.length > 0
  };
});

  // Write lightweight index
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(lightweightIndex), 'utf8');

  // Calculate size reduction
  const originalSize = fs.statSync(INPUT_FILE).size;
  const indexSize = fs.statSync(OUTPUT_FILE).size;
  const reduction = ((1 - indexSize / originalSize) * 100).toFixed(1);

  console.log(`\n✨ Search index generated!`);
  console.log(`📦 Original size: ${(originalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`📦 Index size: ${(indexSize / 1024).toFixed(2)} KB`);
  console.log(`📉 Size reduction: ${reduction}%`);
  console.log(`💾 Saved to: ${OUTPUT_FILE}`);
}

if (require.main === module) {
  generateSearchIndex();
}

module.exports = { generateSearchIndex };
