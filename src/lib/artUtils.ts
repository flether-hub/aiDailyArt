/**
 * Extracts the first subheading (H3) text from an HTML string of the AI interpretation.
 * @param html The AI interpretation HTML string.
 * @returns The first subheading text or null if not found.
 */
export function extractFirstSubheading(html: string | undefined | null): string | null {
  if (!html) return null;
  
  // Try to find an H3 tag
  const h3Match = html.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
  if (h3Match && h3Match[1]) {
    const text = h3Match[1].replace(/<[^>]*>?/gm, '').trim();
    if (text) return text;
  }

  // If no H3, maybe it's just the first strong tag or first sentence
  const strongMatch = html.match(/<strong>([\s\S]*?)<\/strong>/i);
  if (strongMatch && strongMatch[1]) {
     const text = strongMatch[1].replace(/<[^>]*>?/gm, '').trim();
     if (text) return text;
  }
  
  return null;
}

/**
 * Removes the first subheading (H3) and the content preceding it (if any) 
 * so it doesn't duplicate when we manually display the header.
 * @param html The AI interpretation HTML string.
 * @returns The cleaned HTML string.
 */
export function cleanInterpretation(html: string | undefined | null): string {
  if (!html) return '';
  
  // Check if there is an H3 tag to remove
  const h3EndMatch = html.match(/<\/h3>/i);
  if (h3EndMatch && h3EndMatch.index !== undefined) {
    const index = h3EndMatch.index + h3EndMatch[0].length;
    return html.substring(index).trim();
  }

  // If we extracted a strong tag as the subheading, we might want to clean that too
  // But usually we'll just keep the original text if H3 isn't found
  
  return html.trim();
}

/**
 * Wraps an image URL with the local proxy if it's an external URL. 
 * This helps bypass CORS and other loading restrictions.
 * @param url The original image URL
 * @returns The proxied URL or original if already internal
 */
export function getProxiedImageUrl(url: string | undefined | null): string {
  if (!url) return '';
  
  // If it's already a relative URL or points to our API/CDN, leave it
  if (url.startsWith('/') || url.includes(window.location.host + '/api/')) {
    return url;
  }

  // Use the proxy-image endpoint
  return `/api/proxy-image?url=${encodeURIComponent(url)}`;
}
