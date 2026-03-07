#!/usr/bin/env node
/**
 * migrate-ghost-to-pb.mjs
 *
 * One-time script to migrate Ghost posts (published after Dec 1, 2025) into
 * the PocketBase `worksheets` collection.
 *
 * Prerequisites:
 *   - Add `slug` (plain text) and `html` (richtext/long text) fields to the
 *     PocketBase `worksheets` collection (both optional).
 *
 * Usage:
 *   node scripts/migrate-ghost-to-pb.mjs
 *
 * The script will prompt for your PocketBase superuser email and password.
 */

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

// ─── Load .env ────────────────────────────────────────────────────────────────
if (fs.existsSync('.env')) process.loadEnvFile('.env');

const GHOST_URL  = process.env.GHOST_API_URL || '';
const GHOST_KEY  = process.env.GHOST_CONTENT_API_KEY || '';
const PB_URL     = process.env.PUBLIC_POCKETBASE_URL || 'https://blog.teacherjake.com';

if (!GHOST_URL || !GHOST_KEY) {
  console.error('❌  Missing GHOST_API_URL or GHOST_CONTENT_API_KEY in .env');
  process.exit(1);
}

// ─── Interactive prompt ───────────────────────────────────────────────────────
function ask(prompt) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(prompt, ans => { rl.close(); resolve(ans.trim()); }));
}

async function askPassword(prompt) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  // Hide input on TTY
  if (process.stdin.isTTY) process.stdout.write(prompt);
  return new Promise(resolve => {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
      let pass = '';
      process.stdin.resume();
      process.stdin.setEncoding('utf8');
      const onData = (char) => {
        if (char === '\r' || char === '\n') {
          process.stdin.setRawMode(false);
          process.stdin.removeListener('data', onData);
          process.stdout.write('\n');
          rl.close();
          resolve(pass);
        } else if (char === '\u0003') {
          process.exit();
        } else if (char === '\u007f') {
          pass = pass.slice(0, -1);
        } else {
          pass += char;
        }
      };
      process.stdin.on('data', onData);
    } else {
      rl.question(prompt, ans => { rl.close(); resolve(ans.trim()); });
    }
  });
}

// ─── PocketBase auth ──────────────────────────────────────────────────────────
async function pbAdminLogin(email, password) {
  const res = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: email, password }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PocketBase auth failed (${res.status}): ${err}`);
  }
  const data = await res.json();
  return data.token;
}

// ─── Ghost fetch ──────────────────────────────────────────────────────────────
async function fetchAllGhostPosts() {
  const DATE_FILTER = "published_at:>'2025-12-01T00:00:00Z'";
  const posts = [];
  let page = 1;
  let totalPages = 1;

  do {
    const url = `${GHOST_URL}/ghost/api/content/posts/?key=${GHOST_KEY}&include=tags&limit=15&filter=${encodeURIComponent(DATE_FILTER)}&page=${page}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Ghost API error ${res.status} on page ${page}`);
    const data = await res.json();
    posts.push(...(data.posts || []));
    totalPages = data.meta?.pagination?.pages || 1;
    console.log(`  Fetched page ${page}/${totalPages} (${data.posts?.length} posts)`);
    page++;
  } while (page <= totalPages);

  return posts;
}

// ─── Field derivation ─────────────────────────────────────────────────────────
const KNOWN_LANGS = ['English', 'French', 'German', 'Spanish', 'Thai'];

const COMPONENT_LESSON_TYPES = [
  { tags: ['lbl-reader'],                  html: 'tj-reader',         lessonType: 'focused-reading' },
  { tags: ['book', 'bilingual', 'blb'],    html: 'tj-chapter-book',   lessonType: 'focused-reading' },
  { tags: ['information-gap'],             html: 'tj-info-gap',       lessonType: 'information-gap' },
  { tags: ['speed-review'],                html: 'tj-speed-review',   lessonType: 'worksheets' },
  { tags: ['grammar-hearts'],              html: 'tj-grammar-hearts', lessonType: 'worksheets' },
  { tags: ['quiz'],                        html: 'tj-quiz-element',   lessonType: 'worksheets' },
  { tags: ['listening'],                   html: 'tj-listening',      lessonType: 'worksheets' },
  { tags: ['pronunciation', 'pronunciaiton'], html: 'tj-pronunciation', lessonType: 'worksheets' },
];

function deriveFields(post) {
  const tagSlugs = (post.tags || []).map(t => (t.slug || '').toLowerCase());
  const tagNames = (post.tags || []).map(t => (t.name || '').toLowerCase());

  const language = tagSlugs.find(s => KNOWN_LANGS.includes(s)) || 'English';

  // Determine lessonType — check HTML for component tag, then fall back to post tags
  let lessonType = 'worksheets';
  for (const rule of COMPONENT_LESSON_TYPES) {
    const tagMatch = rule.tags.some(t => tagSlugs.includes(t) || tagNames.includes(t));
    const htmlMatch = post.html?.includes(`<${rule.html}`);
    if (tagMatch || htmlMatch) {
      lessonType = rule.lessonType;
      break;
    }
  }

  // Content tags — everything that isn't a language tag, isn't a level (a1/a2/b1/b2),
  // and isn't an "internal" hash- tag
  const SKIP = new Set([...KNOWN_LANGS, 'a1', 'a2', 'b1', 'b2']);
  const contentTags = (post.tags || [])
    .filter(t => {
      const slug = (t.slug || '').toLowerCase();
      return !SKIP.has(slug) && !slug.startsWith('hash-');
    })
    .map(t => t.name);

  // Level tag (A1/A2/B1/B2)
  const LEVELS = ['a1', 'a2', 'b1', 'b2'];
  const levelTag = tagSlugs.find(s => LEVELS.includes(s));
  const level = levelTag ? levelTag.toUpperCase() : 'All';

  // Feature image — store just the filename (already synced to ghost-assets/)
  let imageFilename = null;
  if (post.feature_image) {
    try {
      imageFilename = path.basename(new URL(post.feature_image).pathname);
    } catch {
      imageFilename = post.feature_image.split('/').pop();
    }
  }

  return { language, lessonType, level, contentTags, imageFilename };
}

// ─── PocketBase record creation ───────────────────────────────────────────────
async function createPbRecord(token, post) {
  const { language, lessonType, level, contentTags, imageFilename } = deriveFields(post);

  const body = {
    title:      post.title || 'Untitled',
    slug:       contentTags,
    seo:        post.custom_excerpt || post.excerpt || '',
    html:       post.html || '',
    language,
    lessonType,
    level,
    tags:       "general",
    // image field: PocketBase file fields can't be set via JSON on record creation
    // (need multipart upload). We set imageFilename as a hint for a follow-up step.
    // For now, we store the filename in a separate local map.
    published_at: post.published_at,
  };

  const res = await fetch(`${PB_URL}/api/collections/worksheets/records`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to create record for "${post.slug}" (${res.status}): ${err}`);
  }

  const record = await res.json();
  return { pbId: record.id, slug: post.slug, imageFilename };
}

// ─── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  console.log('\n🚀  Ghost → PocketBase Migration\n');

  const email    = await ask('PocketBase superuser email: ');
  const password = await askPassword('PocketBase superuser password: ');

  console.log('\n⏳  Authenticating with PocketBase...');
  let token;
  try {
    token = await pbAdminLogin(email, password);
    console.log('✅  Authenticated.\n');
  } catch (err) {
    console.error('❌ ', err.message);
    process.exit(1);
  }

  console.log('⏳  Fetching Ghost posts...');
  let posts;
  try {
    posts = await fetchAllGhostPosts();
    console.log(`✅  ${posts.length} posts fetched.\n`);
  } catch (err) {
    console.error('❌  Ghost fetch failed:', err.message);
    process.exit(1);
  }

  const slugToId = {};
  const imageMap = {};
  let created = 0;
  let failed  = 0;

  console.log('⏳  Creating PocketBase records...\n');
  for (const post of posts) {
    try {
      const { pbId, slug, imageFilename } = await createPbRecord(token, post);
      slugToId[slug] = pbId;
      if (imageFilename) imageMap[pbId] = imageFilename;
      console.log(`  ✅  [${++created}/${posts.length}] ${post.slug} → ${pbId}`);
    } catch (err) {
      console.error(`  ❌  ${post.slug}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n\n📊  Done: ${created} created, ${failed} failed.\n`);

  // Write the slug→id map as JSON for redirect generation and debugging
  const mapPath = path.join(process.cwd(), 'scripts', 'ghost-slug-to-pb-id.json');
  fs.writeFileSync(mapPath, JSON.stringify(slugToId, null, 2));
  console.log(`📄  Slug → PB ID map saved to: ${path.relative(process.cwd(), mapPath)}\n`);

  if (Object.keys(imageMap).length > 0) {
    const imgMapPath = path.join(process.cwd(), 'scripts', 'ghost-pb-image-map.json');
    fs.writeFileSync(imgMapPath, JSON.stringify(imageMap, null, 2));
    console.log(`🖼️   Image map (PB ID → filename) saved to: ${path.relative(process.cwd(), imgMapPath)}`);
    console.log(`    Note: Feature images require a separate upload step (PocketBase multipart).\n`);
  }
})();
