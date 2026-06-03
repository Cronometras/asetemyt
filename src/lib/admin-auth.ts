// Client-side admin auth helper — shared across all admin pages.
// Dual-path: cookie-first (instant, no IndexedDB, no Firebase Auth),
// then Firebase authStateReady as lazy fallback.

/** Check if the current user is an admin.
 *  Tries cookie token first, then Firebase authStateReady as fallback.
 *  Returns the Fetch API to use for subsequent calls (authFetch or a cookie-based wrapper). */
export async function initAdmin(): Promise<{
  ok: boolean;
  api: (url: string, options?: RequestInit) => Promise<Response>;
}> {
  // Path 1: cookie token (fast, set during login, no IndexedDB needed)
  const cookieMatch = document.cookie.match(/asetemyt_token=([^;]+)/);
  const token = cookieMatch?.[1];
  if (token) {
    try {
      const res = await fetch('/api/admin/status', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.admin) {
          // Cookie-based API caller
          const cookieApi = (url: string, options: RequestInit = {}) => {
            const headers = new Headers(options.headers);
            headers.set('Authorization', `Bearer ${token}`);
            return fetch(url, { ...options, headers });
          };
          return { ok: true, api: cookieApi };
        }
      }
    } catch {}
  }

  // Path 2: Firebase authStateReady (lazy import — avoids triggering
  // auth initialization if PUBLIC_FIREBASE_* vars are missing)
  try {
    const { auth, authFetch } = await import('./auth');
    await auth.authStateReady();
    const user = auth.currentUser;
    if (!user) return { ok: false, api: authFetch };

    const res = await authFetch('/api/admin/status');
    const data = await res.json();
    if (data.admin) return { ok: true, api: authFetch };
  } catch {}

  return { ok: false, api: window.fetch.bind(window) };
}
