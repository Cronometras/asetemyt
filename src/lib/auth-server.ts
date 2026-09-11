import { firebaseConfig } from './firebase-config';

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

  // Resolve the Firebase Web API key. Order:
  //   1. Runtime env binding `FIREBASE_API_KEY` (set in CF Pages dashboard)
  //   2. Shared public Web configuration, identical to the browser (including its fallback).
  // Missing configuration is reported separately from an expired session.
  const resolvedApiKey = apiKey?.trim() || firebaseConfig.apiKey;
  if (!resolvedApiKey) return { user: null, error: 'missing_firebase_api_key' };

  try {
    const resp = await fetch(`${FIREBASE_API_URL}?key=${encodeURIComponent(resolvedApiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: token }),
    });

    if (!resp.ok) {
      const body = await resp.json().catch(() => null);
      const code = body?.error?.message || 'UNKNOWN';
      return { user: null, error: `lookup_failed_${resp.status}: ${code}` };
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

/** Keep server failures distinct from login failures, with no credentials in responses. */
export function authFailureResponse(error?: string): Response {
  const configuration = error === 'missing_firebase_api_key'
    || /API_KEY|API key|PROJECT_NOT_FOUND|CONFIGURATION_NOT_FOUND|lookup_failed_403/.test(error || '');
  const unavailable = configuration || /lookup_error|lookup_failed_(429|5\d\d)/.test(error || '');
  return Response.json({
    error: configuration
      ? 'El servidor no tiene una configuración válida de Firebase para validar tu sesión.'
      : unavailable
        ? 'No se puede validar tu sesión temporalmente. Reinténtalo más tarde.'
        : 'Tu sesión no es válida o ha caducado. Vuelve a iniciar sesión.',
    code: configuration ? 'auth_configuration_error' : unavailable ? 'auth_service_unavailable' : 'session_invalid',
  }, { status: unavailable ? 503 : 401, headers: { 'Cache-Control': 'no-store' } });
}

// Get auth user or throw 401
export async function requireAuth(request: Request, apiKey: string): Promise<any> {
  const { user, error } = await getAuthUser(request, apiKey);
  if (!user) {
    throw new Response(JSON.stringify({ error: 'No autorizado', debug: error }), { status: 401 });
  }
  return user;
}
