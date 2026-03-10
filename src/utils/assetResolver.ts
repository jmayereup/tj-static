import type { ImageMetadata } from 'astro';

/**
 * Dynamically resolves a localized asset path to its metadata or public URL.
 * Works for both src/assets (images) and public (audio/files).
 */
const ghostImages = import.meta.glob<{ default: ImageMetadata }>('/src/assets/ghost-assets/**/*.{jpg,jpeg,png,webp,avif,gif}');
const pbImages = import.meta.glob<{ default: ImageMetadata }>('/src/assets/pocketbase-assets/**/*.{jpg,jpeg,png,webp,avif,gif}');

export async function resolveLocalizedImage(type: 'gh' | 'pb', id: string, filename: string): Promise<ImageMetadata | string | undefined> {
  const subDir = type === 'gh' ? 'ghost-assets' : 'pocketbase-assets';
  const glob = type === 'gh' ? ghostImages : pbImages;
  
  // Try exact match first
  let seekPath = `/src/assets/${subDir}/${id}/${filename}`;
  let loader = glob[seekPath];
  
  // If no exact match and no extension, try common extensions
  if (!loader && !filename.includes('.')) {
    const extensions = ['.jpg', '.jpeg', '.png', '.webp'];
    for (const ext of extensions) {
      const altPath = `/src/assets/${subDir}/${id}/${filename}${ext}`;
      if (glob[altPath]) {
        seekPath = altPath;
        loader = glob[altPath];
        break;
      }
    }
  }
  
  if (loader) {
    const mod = await loader();
    return mod.default;
  }

  // If it's an image but not found in src/assets, return undefined to trigger fallback to remote URL
  const isImage = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif'].some(ext => filename.toLowerCase().endsWith(ext));
  if (isImage) {
    return undefined;
  }

  // Fallback to public folder path if not found in src/assets (e.g. if it's not an image)
  return `/${subDir}/${id}/${filename}`;
}

/**
 * Resolves a non-image asset (audio, pdf) from the public folder.
 */
export function resolveLocalizedAsset(type: 'gh' | 'pb', id: string, filename: string): string {
  const subDir = type === 'gh' ? 'ghost-assets' : 'pocketbase-assets';
  return `/${subDir}/${id}/${filename}`;
}
