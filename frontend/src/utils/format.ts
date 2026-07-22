/** 1 -> "01" — used by the slide counter and the division indicators. */
export function padIndex(value: number): string {
  return String(value).padStart(2, '0');
}

/**
 * Breaks a headline into two display lines for the giant background type.
 * Prefers breaking before a Portuguese connective ("DE", "E", ...); falls
 * back to the midpoint. Headlines that already contain a newline are kept.
 */
export function splitHeadline(headline: string): string {
  if (headline.includes('\n')) return headline;
  const words = headline.trim().split(/\s+/);
  if (words.length < 2) return headline;
  const connectives = ['DE', 'E', 'DA', 'DO', 'DOS', 'DAS', 'PARA'];
  const connectiveIndex = words.findIndex(
    (word, index) => index > 0 && connectives.includes(word.toUpperCase()),
  );
  const breakAt =
    connectiveIndex > 0 ? connectiveIndex : Math.ceil(words.length / 2);
  return `${words.slice(0, breakAt).join(' ')}\n${words.slice(breakAt).join(' ')}`;
}
