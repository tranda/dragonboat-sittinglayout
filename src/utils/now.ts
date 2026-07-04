// Current time in ms. Supports a dev/testing override via the `?now=<ISO>` URL param
// (e.g. ?now=2026-07-09T11:00) so the "next race" logic can be previewed at any moment.
// Falls back to the real clock when the param is absent or invalid.
export function getNow(): number {
  try {
    const p = new URLSearchParams(window.location.search).get('now');
    if (p) {
      const t = new Date(p).getTime();
      if (!Number.isNaN(t)) return t;
    }
  } catch {
    /* ignore malformed URL */
  }
  return Date.now();
}
