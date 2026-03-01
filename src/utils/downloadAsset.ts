import fs from 'node:fs';
import path from 'node:path';

export async function downloadAsset(url: string, id: string, filename: string): Promise<string> {
  if (!url) return '';
  
  // Create dir if doesn't exist
  const dir = path.join(process.cwd(), 'public', 'pocketbase-assets', id);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const destPattern = path.join(dir, filename);
  const publicUrl = `/pocketbase-assets/${id}/${filename}`;

  // If already downloaded, skip
  if (fs.existsSync(destPattern)) {
    return publicUrl;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`unexpected response ${response.statusText}`);
    
    const buffer = await response.arrayBuffer();
    fs.writeFileSync(destPattern, Buffer.from(buffer));

    return publicUrl;
  } catch (err) {
    console.error(`Failed to download asset ${url}:`, err);
    return url; // fallback to original URL on failure
  }
}
