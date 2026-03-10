import { getImage } from 'astro:assets';
import { resolveLocalizedImage } from './assetResolver.ts';

/**
 * Transforms Ghost HTML content at build time, replacing images with optimized localized versions.
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

  return newHtml;
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
