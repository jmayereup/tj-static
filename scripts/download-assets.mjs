import fs from 'node:fs';
import path from 'node:path';

// Load .env file for local development if it exists
if (fs.existsSync('.env')) {
  process.loadEnvFile('.env');
}

const PB_URL = process.env.PUBLIC_POCKETBASE_URL || 'https://blog.teacherjake.com';

const PUBLIC_DIR = path.join(process.cwd(), 'public');
const SRC_ASSETS_DIR = path.join(process.cwd(), 'src', 'assets');

// Helper to determine if a file is an image
const isImage = (filename) => {
  const ext = path.extname(filename).toLowerCase();
  return ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif'].includes(ext);
};

// Asset download helpers
async function downloadFile(url, id, filename) {
  const isImg = isImage(filename);
  const baseDir = isImg ? SRC_ASSETS_DIR : PUBLIC_DIR;
  const subDir = url.includes('/api/files/') ? 'pocketbase-assets' : 'ghost-assets';
  const destPath = path.join(baseDir, subDir, id, filename);

  if (fs.existsSync(destPath)) return true;
  
  const dir = path.dirname(destPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const buffer = await res.arrayBuffer();
    fs.writeFileSync(destPath, Buffer.from(buffer));
    console.log(`Downloaded ${isImg ? 'IMAGE' : 'ASSET'}: ${path.relative(process.cwd(), destPath)}`);
    return true;
  } catch (err) {
    console.error(`Failed to download ${url}:`, err.message);
    return false;
  }
}

function getFilenameFromUrl(url, id) {
  try {
    const pathname = new URL(url).pathname;
    let filename = path.basename(pathname);
    if (!filename || !filename.includes('.')) {
      if (pathname.includes('/media/') || pathname.includes('audio')) filename = `${id}.mp3`;
      else if (pathname.includes('/files/')) filename = `${id}.pdf`;
      else filename = `${id}.jpg`;
    }
    return filename;
  } catch {
    return `${id}.jpg`;
  }
}


async function syncPbAssets() {
  console.log('Syncing PocketBase assets...');
  const browseUrl = `${PB_URL}/api/collections/worksheets/records?perPage=500`;
  
  try {
    const res = await fetch(browseUrl);
    const data = await res.json();
    const records = data.items || [];

    for (const record of records) {
      if (record.image) {
        const url = `${PB_URL}/api/files/${record.collectionId}/${record.id}/${record.image}`;
        await downloadFile(url, record.id, record.image);
      }
      
      if (record.audioFile) {
        const url = `${PB_URL}/api/files/${record.collectionId}/${record.id}/${record.audioFile}`;
        await downloadFile(url, record.id, record.audioFile);
      }

      const contentStr = typeof record.content === 'string' ? record.content : JSON.stringify(record.content);
      const pbFileRegex = /\/api\/files\/([^\/]+)\/([^\/]+)\/([^\s"'>?]+)/g;
      let match;
      while ((match = pbFileRegex.exec(contentStr)) !== null) {
        const [fullMatch, collId, recId, filename] = match;
        const cleanFilename = filename.split('?')[0];
        const url = `${PB_URL}${fullMatch.split('?')[0]}`;
        await downloadFile(url, recId, cleanFilename);
      }
    }
  } catch (err) {
    console.error('PocketBase sync failed:', err);
  }
}

// Main execution
(async () => {
  await syncPbAssets();
  console.log('Asset sync complete.');
})();
