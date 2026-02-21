import fs from 'node:fs';
import path from 'node:path';

// Helper to determine extension from a ghost URL or content type
function getFilenameFromUrl(url: string, id: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const parts = pathname.split('/');
    let filename = parts[parts.length - 1];
    if (!filename || !filename.includes('.')) {
      filename = `${id}.jpg`;
    }
    return filename;
  } catch {
    return `${id}.jpg`;
  }
}

export async function downloadGhostAsset(url: string, id: string): Promise<string> {
  if (!url) return '';
  
  // Create dir if doesn't exist
  const dir = path.join(process.cwd(), 'public', 'ghost-assets', id);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const filename = getFilenameFromUrl(url, id);
  const destPattern = path.join(dir, filename);
  const publicUrl = `/ghost-assets/${id}/${filename}`;

  // If already downloaded, skip
  if (fs.existsSync(destPattern)) {
    return publicUrl;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`unexpected response ${response.statusText}`);
    
    const buffer = await response.arrayBuffer();
    fs.writeFileSync(destPattern, Buffer.from(buffer));
    console.log(`Downloaded Ghost asset: ${publicUrl}`);
    return publicUrl;
  } catch (err) {
    console.error(`Failed to download Ghost asset ${url}:`, err);
    return url; // fallback to original URL on failure
  }
}

// Replaces all <img src="..."> and <source src="..."> tags inside an HTML string with local downloaded versions
export async function downloadGhostHtmlAssets(html: string, postId: string, ghostUrl: string = ''): Promise<string> {
  if (!html) return '';
  
  // Look for src attributes in img, audio, video, source, and data-thumbnail
  const assetRegex = /(?:src|data-thumbnail)="([^">]+)"/g;
  let match;
  let newHtml = html;
  
  // We need to keep track of matched URLs so we can replace them sequentially
  const urlsToDownload = new Set<string>();
  
  while ((match = assetRegex.exec(html)) !== null) {
      let url = match[1];
      if (url) {
          // If relative, prepend ghost URL
          if (url.startsWith('/')) {
              url = `${ghostUrl}${url}`;
          }
          
          if (url.startsWith('http')) {
              urlsToDownload.add(url);
          }
      }
  }
  
  for (const originalUrl of urlsToDownload) {
      const localUrl = await downloadGhostAsset(originalUrl, postId);
      if (localUrl !== originalUrl) {
          // We need to handle the replacement carefully. 
          // If the original URL was relative, we need to find it by its relative path in the HTML
          // but the local library stores it by absolute.
          
          // Case 1: The HTML has the absolute URL
          newHtml = newHtml.split(originalUrl).join(localUrl);
          
          // Case 2: The HTML has the relative URL
          const relativePath = new URL(originalUrl).pathname;
          newHtml = newHtml.split(relativePath).join(localUrl);
      }
  }
  
  return newHtml;
}
