// Server-side auth helpers for Cloudflare Pages Functions
// Verifies Firebase ID tokens using the Firebase Auth REST API (accounts:lookup)

const FIREBASE_API_URL = 'https://identitytoolkit.googleapis.com/v1/accounts:lookup';

// Extract and verify token from Authorization header or cookie
export async function getAuthUser(request: Request, apiKey: string): Promise<{ user: any; error?: string }> {
  // Try Authorization header first (Bearer token)
  const authHeader = request.headers.get('authorization') || '';
  const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);

  const token = bearerMatch?.[1]
    || (request.headers.get('cookie') || '').match(/asetemyt_token=([^;]+)/)?.[1];

  if (!token) {
    return { user: null, error: 'no_token_found' };
  }

  try {
    const resp = await fetch(`${FIREBASE_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: token }),
    });

    if (!resp.ok) {
      return { user: null, error: `lookup_failed_${resp.status}` };
    }

    const data = await resp.json();
    if (data.users && data.users.length > 0) {
      const u = data.users[0];
      // Normalize to match the fields used throughout the codebase
      const user = {
        ...u,
        user_id: u.localId,   // backward compat
        uid: u.localId,
        name: u.displayName || '',
        email: u.email || '',
      };
      return { user };
    }

    return { user: null, error: 'token_invalid' };
  } catch (err: any) {
    return { user: null, error: 'lookup_error: ' + (err.message || err) };
  }
}

// Get auth user or throw 401
export async function requireAuth(request: Request, apiKey: string): Promise<any> {
  const { user, error } = await getAuthUser(request, apiKey);
  if (!user) {
    throw new Response(JSON.stringify({ error: 'No autorizado', debug: error }), { status: 401 });
  }
  return user;
}
