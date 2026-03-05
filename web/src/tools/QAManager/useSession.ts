import { useEffect, useRef, useCallback } from 'react';
import { auth, setToken, clearToken } from './api';

const IDLE_LIMIT_MS   = 60_000;   // 1 minute idle → logout
const REFRESH_EVERY_MS = 30_000;  // refresh token every 30 seconds if active
const WARN_BEFORE_MS   = 15_000;  // show warning 15s before logout

interface Options {
  onLogout:  () => void;
  onWarn:    (secondsLeft: number) => void;
  onActive:  () => void;           // dismiss warning when user moves again
}

export function useSession({ onLogout, onWarn, onActive }: Options) {
  const lastActivityRef = useRef<number>(Date.now());
  const warnedRef       = useRef(false);

  // Update activity timestamp on any user interaction
  const markActive = useCallback(() => {
    const wasWarned = warnedRef.current;
    lastActivityRef.current = Date.now();
    warnedRef.current = false;
    if (wasWarned) onActive(); // dismiss warning
  }, [onActive]);

  useEffect(() => {
    const EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    EVENTS.forEach(e => window.addEventListener(e, markActive, { passive: true }));
    return () => EVENTS.forEach(e => window.removeEventListener(e, markActive));
  }, [markActive]);

  useEffect(() => {
    // Tick every second to check idle state + trigger refresh
    let lastRefreshAt = Date.now();

    const tick = setInterval(async () => {
      const idleMs = Date.now() - lastActivityRef.current;

      // ── Auto-logout ──────────────────────────────────────────────────
      if (idleMs >= IDLE_LIMIT_MS) {
        clearInterval(tick);
        clearToken();
        onLogout();
        return;
      }

      // ── Idle warning ─────────────────────────────────────────────────
      if (idleMs >= IDLE_LIMIT_MS - WARN_BEFORE_MS && !warnedRef.current) {
        warnedRef.current = true;
        const secondsLeft = Math.round((IDLE_LIMIT_MS - idleMs) / 1000);
        onWarn(secondsLeft);
      }

      // ── Token refresh every 30s (only if active) ─────────────────────
      const timeSinceRefresh = Date.now() - lastRefreshAt;
      if (timeSinceRefresh >= REFRESH_EVERY_MS && idleMs < REFRESH_EVERY_MS) {
        lastRefreshAt = Date.now();
        try {
          const { token } = await auth.refresh();
          setToken(token);
        } catch {
          // Refresh failed (expired/invalid) → logout
          clearToken();
          onLogout();
        }
      }
    }, 1000);

    return () => clearInterval(tick);
  }, [onLogout, onWarn]);
}
