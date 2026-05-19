#!/usr/bin/env node

const fs = require('fs');

const SITEMAP_PATH = './sitemap.xml';
const SITE_URL = 'https://www.maxparfum.net';

function updateSitemap() {
  console.log('📝 Updating sitemap.xml...');

  const staticPages = [
    { url: '/', priority: '1.0', changefreq: 'daily' },
    { url: '/about.html', priority: '0.8', changefreq: 'monthly' },
    { url: '/support.html', priority: '0.6', changefreq: 'monthly' },
    { url: '/blogs.html', priority: '0.9', changefreq: 'weekly' },
    { url: '/article-best-dupes.html', priority: '0.8', changefreq: 'monthly' },
    { url: '/article-summer-scents.html', priority: '0.7', changefreq: 'monthly' },
    { url: '/article-office-school.html', priority: '0.7', changefreq: 'monthly' },
    { url: '/article-spray-routines.html', priority: '0.7', changefreq: 'monthly' },
    { url: '/article-women-dupes.html', priority: '0.7', changefreq: 'monthly' },
    { url: '/quiz.html', priority: '0.7', changefreq: 'monthly' },
    { url: '/battle.html', priority: '0.8', changefreq: 'weekly' },
    { url: '/scentle.html', priority: '0.8', changefreq: 'weekly' },
    { url: '/forum.html', priority: '0.9', changefreq: 'daily' },
    { url: '/leaderboard.html', priority: '0.8', changefreq: 'daily' },
    { url: '/summer.html', priority: '0.7', changefreq: 'monthly' },
    { url: '/winter.html', priority: '0.7', changefreq: 'monthly' },
    { url: '/office.html', priority: '0.7', changefreq: 'monthly' },
    { url: '/datenight.html', priority: '0.7', changefreq: 'monthly' },
    { url: '/blindrank.html', priority: '0.8', changefreq: 'weekly' }
  ];

  const currentDate = new Date().toISOString().split('T')[0];

  let sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

  staticPages.forEach(page => {
    sitemapXml += `  <url>
    <loc>${SITE_URL}${page.url}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`;
  });

  sitemapXml += `</urlset>`;

  fs.writeFileSync(SITEMAP_PATH, sitemapXml, 'utf8');

  console.log(`✅ Sitemap updated with ${staticPages.length} static pages`);
  console.log(`📄 Sitemap saved to ${SITEMAP_PATH}`);
}

if (require.main === module) {
  updateSitemap();
}

module.exports = { updateSitemap };
