/**
 * Tiny event bus for programmatic scrolling. Sections and the navigation
 * dispatch here; WorldForge owns the Lenis instance and performs the scroll,
 * so no component needs a reference to Lenis.
 */

const EVENT_NAME = 'wf:scrollto';

export function scrollToSection(id: string): void {
  window.dispatchEvent(new CustomEvent<string>(EVENT_NAME, { detail: id }));
}

export function onScrollToSection(handler: (id: string) => void): () => void {
  const listener = (event: Event) => handler((event as CustomEvent<string>).detail);
  window.addEventListener(EVENT_NAME, listener);
  return () => window.removeEventListener(EVENT_NAME, listener);
}
