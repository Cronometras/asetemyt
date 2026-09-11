// Client-side admin auth helper — shared across all admin pages.
// Dual-path: cookie-first (instant, no IndexedDB, no Firebase Auth),
// then Firebase authStateReady as lazy fallback.

/** Check if the current user is an admin.
 *  Tries cookie token first, then Firebase authStateReady as fallback.
 *  Returns the Fetch API to use for subsequent calls (authFetch or a cookie-based wrapper). */
export async function initAdmin(): Promise<{
  ok: boolean;
  error?: string;
  api: (url: string, options?: RequestInit) => Promise<Response>;
}> {
  let checkError: string | undefined;
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
          const cookieApi = async (url: string, options: RequestInit = {}) => {
            const headers = new Headers(options.headers);
            const currentToken = document.cookie.match(/(?:^|;\s*)asetemyt_token=([^;]+)/)?.[1] || token;
            headers.set('Authorization', `Bearer ${currentToken}`);
            const response = await fetch(url, { ...options, headers });
            if (response.status !== 401) return response;
            const { auth } = await import('./auth');
            await auth.authStateReady();
            if (!auth.currentUser) return response;
            const refreshedToken = await auth.currentUser.getIdToken(true);
            document.cookie = `asetemyt_token=${refreshedToken}; path=/; max-age=3600; SameSite=Lax`;
            headers.set('Authorization', `Bearer ${refreshedToken}`);
            return fetch(url, { ...options, headers });
          };
          return { ok: true, api: cookieApi };
        }
      } else if (res.status >= 500) {
        const data = await res.json().catch(() => null);
        return { ok: false, error: data?.error || 'No se pudo comprobar el acceso. El servidor no está disponible temporalmente.', api: window.fetch.bind(window) };
      }
    } catch { checkError = 'No se pudo conectar con el servidor para comprobar el acceso.'; }
  }

  // Path 2: Firebase authStateReady (lazy import — avoids triggering
  // auth initialization if PUBLIC_FIREBASE_* vars are missing)
  try {
    const { auth, authFetch } = await import('./auth');
    await auth.authStateReady();
    const user = auth.currentUser;
    if (user) {
      // Token may have expired in the cookie but the Firebase session
      // is still alive. Refresh the cookie from the current Firebase
      // user so the cookie-based path works on the next request.
      try {
        const freshToken = await user.getIdToken();
        document.cookie = `asetemyt_token=${freshToken}; path=/; max-age=3600; SameSite=Lax`;
      } catch {}
      // Use the Firebase token for this request and trust the admin
      // claim (the cookie-based /api/admin/status check already ran on
      // /admin landing, and Firebase's onAuthStateChanged is canonical).
      const res = await authFetch('/api/admin/status');
      if (!res.ok) throw new Error('No se pudo comprobar el acceso. Reinténtalo más tarde.');
      const data = await res.json();
      if (data.admin) return { ok: true, api: authFetch };
    }
  } catch { checkError = 'No se pudo comprobar el acceso. Reinténtalo más tarde.'; }

  return { ok: false, error: checkError, api: window.fetch.bind(window) };
}
