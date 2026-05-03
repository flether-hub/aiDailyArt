/**
 * Extracts the first subheading (H3) text from an HTML string of the AI interpretation.
 * @param html The AI interpretation HTML string.
 * @returns The first subheading text or null if not found.
 */
export function extractFirstSubheading(html: string | undefined | null): string | null {
  if (!html) return null;
  
  const h3Match = html.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
  if (h3Match && h3Match[1]) {
    // Remove any remaining HTML tags inside the subheading just in case
    return h3Match[1].replace(/<[^>]*>?/gm, '').trim();
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
  
  // Find where the first h3 ends
  const h3EndMatch = html.match(/<\/h3>/i);
  if (h3EndMatch && h3EndMatch.index !== undefined) {
    // Return everything after the end of the first h3
    const index = h3EndMatch.index + h3EndMatch[0].length;
    return html.substring(index).trim();
  }
  
  return html;
}
