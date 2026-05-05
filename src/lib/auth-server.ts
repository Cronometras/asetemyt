// Server-side auth helpers for Cloudflare Pages Functions
// Verifies Firebase ID tokens using Google's public keys

const GOOGLE_CERTS_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

let certsCache: { keys: Record<string, string>; expiry: number } | null = null;

async function getGoogleCerts(): Promise<Record<string, string>> {
  if (certsCache && Date.now() < certsCache.expiry) return certsCache.keys;
  const resp = await fetch(GOOGLE_CERTS_URL);
  const cacheControl = resp.headers.get('cache-control') || '';
  const maxAge = parseInt(cacheControl.match(/max-age=(\d+)/)?.[1] || '3600', 10);
  const keys: Record<string, string> = {};
  const json = (await resp.json()) as Record<string, string>;
  for (const [kid, cert] of Object.entries(json)) {
    keys[kid] = cert;
  }
  certsCache = { keys, expiry: Date.now() + maxAge * 1000 };
  return keys;
}

// Decode JWT parts without verification (for extracting header/payload)
function base64UrlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

function decodeJWT(token: string): { header: any; payload: any; signature: Uint8Array } {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid JWT');
  return {
    header: JSON.parse(new TextDecoder().decode(base64UrlDecode(parts[0]))),
    payload: JSON.parse(new TextDecoder().decode(base64UrlDecode(parts[1]))),
    signature: base64UrlDecode(parts[2]),
  };
}

// Import PEM certificate for RSA verification
async function importRSAPublicKey(pem: string): Promise<CryptoKey> {
  const pemBody = pem
    .replace('-----BEGIN CERTIFICATE-----', '')
    .replace('-----END CERTIFICATE-----', '')
    .replace(/\s/g, '');
  const binary = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    'spki',
    binary,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );
}

// Verify Firebase ID token
export async function verifyFirebaseToken(token: string, projectId: string): Promise<any> {
  const { header, payload, signature } = decodeJWT(token);

  // Basic checks
  if (header.alg !== 'RS256') throw new Error('Invalid algorithm');
  if (payload.aud !== projectId) throw new Error(`Invalid audience: expected ${projectId}, got ${payload.aud}`);
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) throw new Error('Invalid issuer');
  if (payload.exp * 1000 < Date.now()) throw new Error('Token expired');

  // Verify signature
  const certs = await getGoogleCerts();
  const cert = certs[header.kid];
  if (!cert) throw new Error('Unknown key ID');

  const key = await importRSAPublicKey(cert);
  const data = new TextEncoder().encode(token.split('.').slice(0, 2).join('.'));
  const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, signature, data);
  if (!valid) throw new Error('Invalid signature');

  return payload;
}

// Extract and verify token from Authorization header or cookie
export async function getAuthUser(request: Request, projectId: string): Promise<{ user: any; error?: string }> {
  // Try Authorization header first (Bearer token)
  const authHeader = request.headers.get('authorization') || '';
  const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);

  if (bearerMatch) {
    try {
      const user = await verifyFirebaseToken(bearerMatch[1], projectId);
      return { user };
    } catch (err: any) {
      return { user: null, error: 'bearer_failed: ' + (err.message || err) };
    }
  }

  // Fall back to cookie
  const cookie = request.headers.get('cookie') || '';
  const match = cookie.match(/asetemyt_token=([^;]+)/);
  if (!match) return { user: null, error: 'no_token_found' };
  try {
    const user = await verifyFirebaseToken(match[1], projectId);
    return { user };
  } catch (err: any) {
    return { user: null, error: 'cookie_failed: ' + (err.message || err) };
  }
}

// Get auth user or throw 401
export async function requireAuth(request: Request, projectId: string): Promise<any> {
  const { user, error } = await getAuthUser(request, projectId);
  if (!user) {
    throw new Response(JSON.stringify({ error: 'No autorizado', debug: error }), { status: 401 });
  }
  return user;
}
