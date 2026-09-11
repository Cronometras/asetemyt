// Shared session transport. Firebase may retain a session in the browser after
// the server stops accepting its cached ID token. Refresh once on a real 401.
export async function fetchWithUserToken(
  user: { getIdToken(forceRefresh?: boolean): Promise<string> },
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  async function send(forceRefresh: boolean) {
    const token = await user.getIdToken(forceRefresh);
    document.cookie = `asetemyt_token=${token}; path=/; max-age=3600; SameSite=Lax`;
    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${token}`);
    return fetch(url, { ...options, headers });
  }
  const response = await send(false);
  // A 403 is an actual permission denial; a 5xx is a service/config error.
  // Neither should trigger token refresh or repeat a mutation.
  return response.status === 401 ? send(true) : response;
}
