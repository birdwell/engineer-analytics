/**
 * Polyfill for AbortSignal.timeout which exists in Node.js 17+ but is not yet widely
 * supported by browsers. A number of our data-fetching utilities rely on it for
 * request timeouts. Importing this module once (e.g. in `main.tsx`) will ensure
 * the method is available in the global `AbortSignal` interface at runtime.
 */
export function ensureAbortSignalTimeout() {
  if (typeof (AbortSignal as any).timeout !== 'function') {
    (AbortSignal as any).timeout = function timeout(ms: number) {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), ms);
      return controller.signal;
    };
  }
}

export {}; // Ensure this file is treated as a module 