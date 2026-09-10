/**
 * Data attributes that exist only in development builds so the end-to-end test
 * can solve exercises. `import.meta.env.DEV` is false in `vite build`, so
 * production markup carries none of them.
 */
export function devAttr(name: string, value: string | number | boolean): Record<string, string> {
  return import.meta.env.DEV ? { [name]: String(value) } : {};
}
