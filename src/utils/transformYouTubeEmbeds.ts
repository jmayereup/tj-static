/**
 * Transforms Ghost HTML content by wrapping YouTube iframes in a responsive container.
 * This ensures the videos maintain a 16:9 aspect ratio and look great on all devices.
 */
export function transformYouTubeEmbeds(html: string): string {
  if (!html) return '';

  // Matches classic figure > iframe or just iframe with youtube in src
  // We'll target the iframe directly and wrap it, or replace the figure if it's the standard Ghost embed.
  
  // Ghost typically uses: 
  // <figure class="kg-card kg-embed-card">
  //   <iframe src="https://www.youtube.com/embed/..." ...></iframe>
  //   <figcaption>...</figcaption> // optional
  // </figure>

  // A regex to find figure elements that contain a youtube iframe.
  const figureRegex = /<figure[^>]*class="[^"]*kg-embed-card[^"]*"[^>]*>([\s\S]*?)<\/figure>/gi;
  
  let transformed = html.replace(figureRegex, (match, innerContent) => {
    // Check for youtube.com, youtu.be, or a ghost asset that might be a youtube embed
    // Ghost may convert the iframe src to a local /ghost-assets/... and set title or other attributes indicating youtube
    const isYouTube = innerContent.includes('youtube.com/embed/') || 
                      innerContent.includes('youtu.be/') || 
                      (innerContent.includes('ghost-assets') && match.toLowerCase().includes('youtube'));
                      
    if (isYouTube) {
      // Find the iframe tag
      const iframeMatch = innerContent.match(/<iframe([\s\S]*?)>/i);
      if (iframeMatch) {
         let iframeAttrs = iframeMatch[1];
         
         // Add w-full h-full to iframe if not present
         if (!iframeAttrs.includes('class=')) {
           iframeAttrs += ' class="w-full h-full absolute top-0 left-0"';
         } else if (!iframeAttrs.includes('w-full') || !iframeAttrs.includes('h-full') || !iframeAttrs.includes('absolute')) {
           // Basic attempt to inject classes if class attr exists but lacks these
           iframeAttrs = iframeAttrs.replace(/class="([^"]*)"/, 'class="$1 w-full h-full absolute top-0 left-0"');
         }

         const iframeTag = `<iframe${iframeAttrs}></iframe>`;

         // Look for figcaption
         const captionMatch = innerContent.match(/<figcaption>([\s\S]*?)<\/figcaption>/i);
         const caption = captionMatch ? captionMatch[0] : '';

         return `
<div class="my-8 w-full max-w-4xl mx-auto">
  <div class="relative w-full aspect-video rounded-2xl overflow-hidden shadow-lg bg-slate-900 border border-slate-200 isolation-auto">
    ${iframeTag}
  </div>
  ${caption}
</div>`;
      }
    }
    return match; // return original if it's not a youtube embed or no iframe found
  });

  // Fallback for raw iframes not in a kg-embed-card figure
  const rawIframeRegex = /<iframe([\s\S]*?)>[\s\S]*?<\/iframe>/gi;
  
  transformed = transformed.replace(rawIframeRegex, (match, attrs) => {
    // Determine if it's a YouTube iframe
    const isYouTube = attrs.includes('youtube.com/embed/') || 
                      attrs.includes('youtu.be/') || 
                      (attrs.includes('ghost-assets') && match.toLowerCase().includes('youtube'));

    if (!isYouTube) return match;
    // If it's already inside our responsive wrapper (from previous step or manual), skip it
    // Actually regex replace is linear, so it might match iframes inside the wrapper we just created
    // We should be careful. To avoid this, we can check if it has the classes we just added.
    if (attrs.includes('w-full h-full absolute top-0 left-0')) {
        return match;
    }

    let iframeAttrs = attrs;
    if (!iframeAttrs.includes('class=')) {
        iframeAttrs += ' class="w-full h-full absolute top-0 left-0"';
    } else {
        iframeAttrs = iframeAttrs.replace(/class="([^"]*)"/, 'class="$1 w-full h-full absolute top-0 left-0"');
    }
    
    const iframeTag = `<iframe${iframeAttrs}></iframe>`;

    return `
<div class="my-8 w-full max-w-4xl mx-auto">
  <div class="relative w-full aspect-video rounded-2xl overflow-hidden shadow-lg bg-slate-900 border border-slate-200 isolation-auto">
    ${iframeTag}
  </div>
</div>`;
  });

  return transformed;
}
