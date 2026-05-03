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
