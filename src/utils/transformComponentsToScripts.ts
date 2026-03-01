import { renderContentAsHtml } from './serialization';

/**
 * Transforms Ghost HTML content by moving raw JSON/Markdown data from web component tags
 * into a child `<script>` tag. This improves compatibility with Astro View Transitions
 * and avoids parsing issues.
 * 
 * Also injects a structured HTML fallback for SEO and slow networks.
 * 
 * Example:
 * <tj-info-gap>{"topic": "test"}</tj-info-gap>
 * becomes:
 * <tj-info-gap>
 *   <script type="application/json">{"topic": "test"}</script>
 *   <div class="tj-fallback">...rendered JSON...</div>
 * </tj-info-gap>
 */
export function transformComponentsToScripts(html: string): string {
  if (!html) return '';

  // Matches tags starting with <tj-, followed by optional attributes,
  // then the content, then the closing tag.
  const componentRegex = /<(tj-[a-z-]+)([^>]*)>([\s\S]*?)<\/\1>/gi;

  return html.replace(componentRegex, (match, tagName, attrs, content) => {
    // If it already has a script tag, skip it
    if (content.includes('<script')) {
      return match;
    }

    const trimmedContent = content.trim();
    if (!trimmedContent) {
      return match;
    }

    // Determine script type based on component (tj-quiz-element uses markdown-like text)
    const isMarkdown = tagName.toLowerCase() === 'tj-quiz-element';
    const scriptType = isMarkdown ? 'text/markdown' : 'application/json';

    // Generate fallback HTML if it's JSON
    let fallbackHtml = '';
    if (!isMarkdown) {
      try {
        const jsonData = JSON.parse(trimmedContent);
        const rendered = renderContentAsHtml(jsonData);
        if (rendered) {
          fallbackHtml = `\n<div class="tj-fallback p-4 border border-slate-100 rounded-xl my-4 bg-slate-50/30">\n${rendered}\n</div>`;
        }
      } catch (e) {
        console.warn(`Failed to parse JSON for ${tagName} fallback:`, e);
      }
    }

    // Reconstruct the tag with the nested script and place fallback AFTER it
    return `<${tagName}${attrs}>\n<script type="${scriptType}">\n${trimmedContent}\n</script>\n</${tagName}>${fallbackHtml}`;
  });
}
