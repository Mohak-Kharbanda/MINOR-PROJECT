import "@testing-library/jest-dom/vitest";

// jsdom lacks these browser APIs used by framer-motion.
class IO {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
(globalThis as any).IntersectionObserver = IO;
(globalThis as any).ResizeObserver = IO;
window.matchMedia =
  window.matchMedia ||
  ((query: string) => ({ matches: false, media: query, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false })) as any;
