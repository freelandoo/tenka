import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// jsdom não implementa matchMedia (useReducedMotion) nem scrollIntoView
// (destaque de notificação); dnd-kit usa ResizeObserver.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

window.HTMLElement.prototype.scrollIntoView = vi.fn();

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (!('ResizeObserver' in globalThis)) {
  Object.defineProperty(globalThis, 'ResizeObserver', { value: ResizeObserverStub });
}
