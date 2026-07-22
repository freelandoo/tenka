/**
 * True when the string looks like something an <img> can safely attempt to
 * load: http(s) URL, root-relative path or data URI. Anything else (empty,
 * whitespace, garbage) falls back to the solid placeholder so a broken image
 * icon is never rendered.
 */
/**
 * True when the string can be used as an iframe src for the live preview:
 * http(s) URLs or root-relative paths (same-origin routes like "/games",
 * which are always embeddable). External destinations must also allow being
 * embedded (no X-Frame-Options / frame-ancestors blocking) — that part can
 * only be verified by the browser at render time.
 */
export function isEmbeddableUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function isRenderableImageUrl(
  url: string | null | undefined,
): url is string {
  if (!url) return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('data:image/')) return true;
  if (trimmed.startsWith('/')) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
