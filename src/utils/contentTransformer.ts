import { getImage } from 'astro:assets';
import { resolveLocalizedImage } from './assetResolver.ts';

/**
 * Transforms Ghost HTML content at build time, replacing images with optimized localized versions.
 * Also transforms Ghost audio cards into simplified native audio players.
 */
export async function transformGhostHtml(html: string, postId: string, ghostUrl: string = ''): Promise<string> {
  const assetRegex = /(src|data-thumbnail)="([^">]+)"/g;
  let match;
  let newHtml = html;
  
  const replacements: Record<string, string> = {};
  
  while ((match = assetRegex.exec(html)) !== null) {
    const originalUrl = match[2];
    if (!originalUrl || originalUrl.startsWith('/ghost-assets/')) continue;
    
    // Resolve filename
    const pathname = new URL(originalUrl.startsWith('http') ? originalUrl : `${ghostUrl}${originalUrl}`).pathname;
    const filename = pathname.split('/').pop();
    if (!filename || !['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif'].some(ext => filename.toLowerCase().endsWith(ext))) continue;

    const resolved = await resolveLocalizedImage('gh', postId, filename);
    if (resolved && typeof resolved !== 'string') {
      const optimized = await getImage({ src: resolved, width: 1200 }); // Optimize
      replacements[originalUrl] = optimized.src;
    } else if (resolved) {
      replacements[originalUrl] = resolved;
    }
  }

  for (const [original, local] of Object.entries(replacements)) {
    newHtml = newHtml.split(original).join(local);
  }

  // Transform audio cards
  newHtml = transformAudioCards(newHtml);

  return newHtml;
}

/**
 * Transforms Ghost audio cards into a simple semantic HTML structure with a native audio tag.
 */
function transformAudioCards(html: string): string {
  if (!html) return '';

  // Matches Ghost audio cards - robustly by matching div or figure and looking for the specific closure of nested divs
  const audioCardRegex = /<(div|figure)[^>]*class="[^"]*kg-audio-card[^"]*"[^>]*>([\s\S]*?<\/div>[\s]*?<\/div>[\s]*?<\/div>)/gi;

  return html.replace(audioCardRegex, (match, tagName, content) => {
    // Extract audio src
    const srcMatch = content.match(/<audio[^>]*src="([^"]*)"/i);
    const src = srcMatch ? srcMatch[1] : '';
    
    // Extract title
    const titleMatch = content.match(/<div class="kg-audio-title">([\s\S]*?)<\/div>/i);
    const title = titleMatch ? titleMatch[1] : 'Audio';

    // Extract thumbnail (if any)
    const thumbMatch = content.match(/<img[^>]*src="([^"]*)"[^>]*class="[^"]*kg-audio-thumbnail[^"]*"/i);
    // Ghost often has a hidden placeholder img with src="", let's check for a real one
    let thumb = thumbMatch ? thumbMatch[1] : '';
    if (thumb === 'audio-thumbnail' || !thumb) thumb = '';

    if (!src) return match;

    const thumbnailHtml = thumb 
      ? `<img src="${thumb}" alt="${title}" class="tj-audio-thumbnail" />`
      : `<div class="tj-audio-placeholder"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg></div>`;

    return `
<div class="tj-audio-card not-prose">
  <div class="tj-audio-info">
    ${thumbnailHtml}
    <div class="tj-audio-meta">
        <span class="tj-audio-title">${title}</span>
    </div>
  </div>
  <audio controls src="${src}" preload="metadata" class="tj-audio-native"></audio>
</div>`;
  });
}

/**
 * Transforms PocketBase JSON content at build time, replacing images with optimized localized versions.
 */
export async function transformPbContent(content: any, worksheetId: string): Promise<any> {
    if (!content || typeof content !== 'object') return content;
    
    if (Array.isArray(content)) {
        return Promise.all(content.map(item => transformPbContent(item, worksheetId)));
    }
    
    const newObj = { ...content };
    
    if (newObj.type === 'image' && newObj.attrs?.src) {
        const src = newObj.attrs.src;
        if (src.includes('/api/files/')) {
            const filename = src.split('/').pop()?.split('?')[0];
            if (filename) {
                const resolved = await resolveLocalizedImage('pb', worksheetId, filename);
                if (resolved && typeof resolved !== 'string') {
                    const optimized = await getImage({ src: resolved, width: 1200 });
                    newObj.attrs.src = optimized.src;
                }
            }
        }
    }
    
    for (const key in newObj) {
        if (key !== 'attrs' || newObj.type !== 'image') {
            newObj[key] = await transformPbContent(newObj[key], worksheetId);
        }
    }
    
    return newObj;
}
