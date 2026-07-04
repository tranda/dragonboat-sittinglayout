import { useEffect, useRef } from 'react';
import * as api from '../utils/api';
import { shouldDeferSync } from '../utils/sync';

interface Options {
  /** Only poll while logged in and data has been loaded. */
  enabled: boolean;
  /** Poll cadence in ms. */
  intervalMs?: number;
  /** Called with the list of changed entity types when the server cursor advances. */
  onChange: (changed: string[]) => void;
  /**
   * Identifies the active data scope (team + competition). Changing it resets
   * the cursor so we re-seed against the new scope instead of firing a bogus
   * "everything changed" on switch.
   */
  scopeKey: string;
}

/**
 * Polls the backend change feed (/api/changes) and invokes `onChange` whenever
 * something changed in the active scope. This is our shared-hosting-friendly
 * stand-in for websockets: no persistent connection, no server daemon.
 *
 * Behaviour:
 *  - The first response only establishes a baseline cursor (data is already
 *    loaded), so it never triggers a refetch on mount.
 *  - Polling pauses while the tab is hidden or the browser is offline, and
 *    fires immediately on focus / visibility / online for snappy catch-up.
 *  - If a local interaction is in progress (drag / pending write), the refresh
 *    is deferred — the cursor is left unadvanced so it retries once idle.
 */
export function useRealtimeSync({ enabled, intervalMs = 5000, onChange, scopeKey }: Options) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!enabled) return;

    let stopped = false;
    let seeded = false;
    let cursor = 0;
    let inFlight = false;
    let timer: ReturnType<typeof setTimeout>;

    const schedule = () => {
      if (!stopped) timer = setTimeout(poll, intervalMs);
    };

    const poll = async () => {
      if (stopped) return;
      if (document.hidden || !navigator.onLine || inFlight) {
        schedule();
        return;
      }
      inFlight = true;
      try {
        const { cursor: latest, changed } = await api.getChanges(cursor);
        if (!seeded) {
          cursor = latest;
          seeded = true;
        } else if (latest > cursor) {
          if (!shouldDeferSync()) {
            cursor = latest;
            if (changed.length) onChangeRef.current(changed);
          }
          // else: leave cursor unchanged and retry on the next tick once idle
        }
      } catch {
        // transient (offline, 5xx, token refresh) — just try again next tick
      } finally {
        inFlight = false;
        schedule();
      }
    };

    // Poll promptly when the user returns to the tab or reconnects.
    const kick = () => {
      if (stopped || document.hidden || !navigator.onLine) return;
      clearTimeout(timer);
      poll();
    };
    document.addEventListener('visibilitychange', kick);
    window.addEventListener('focus', kick);
    window.addEventListener('online', kick);

    poll();

    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', kick);
      window.removeEventListener('focus', kick);
      window.removeEventListener('online', kick);
    };
    // scopeKey resets the whole loop (and cursor) on team/competition switch
  }, [enabled, intervalMs, scopeKey]);
}
