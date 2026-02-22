/**
 * Transforms Ghost HTML content by moving raw JSON/Markdown data from web component tags
 * into a child `<script>` tag. This improves compatibility with Astro View Transitions
 * and avoids parsing issues.
 * 
 * Example:
 * <tj-info-gap>{"topic": "test"}</tj-info-gap>
 * becomes:
 * <tj-info-gap><script type="application/json">{"topic": "test"}</script></tj-info-gap>
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
    const scriptType = tagName.toLowerCase() === 'tj-quiz-element' ? 'text/markdown' : 'application/json';

    // Reconstruct the tag with the nested script
    return `<${tagName}${attrs}>\n<script type="${scriptType}">\n${trimmedContent}\n</script>\n</${tagName}>`;
  });
}
