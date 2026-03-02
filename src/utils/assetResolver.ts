import type { ImageMetadata } from 'astro';

/**
 * Dynamically resolves a localized asset path to its metadata or public URL.
 * Works for both src/assets (images) and public (audio/files).
 */
const ghostImages = import.meta.glob<{ default: ImageMetadata }>('/src/assets/ghost-assets/**/*.{jpg,jpeg,png,webp,avif,gif}');
const pbImages = import.meta.glob<{ default: ImageMetadata }>('/src/assets/pocketbase-assets/**/*.{jpg,jpeg,png,webp,avif,gif}');

export async function resolveLocalizedImage(type: 'gh' | 'pb', id: string, filename: string): Promise<ImageMetadata | string | undefined> {
  const subDir = type === 'gh' ? 'ghost-assets' : 'pocketbase-assets';
  const seekPath = `/src/assets/${subDir}/${id}/${filename}`;
  
  const glob = type === 'gh' ? ghostImages : pbImages;
  const loader = glob[seekPath];
  
  if (loader) {
    const mod = await loader();
    return mod.default;
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
