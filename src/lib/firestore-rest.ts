// Google Cloud / Firestore REST API helpers for Cloudflare Workers
// Replaces firebase-admin SDK which requires Node.js

let cachedToken: { token: string; expiry: number } | null = null;

export async function getAccessToken(env: any): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiry - 60000) return cachedToken.token;

  const clientEmail = env.FIREBASE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = env.FIREBASE_SERVICE_ACCOUNT_KEY?.replace(/\\n/g, '\n');

  if (!clientEmail || !privateKey) throw new Error('Missing Firebase service account credentials');

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const toSign = `${headerB64}.${payloadB64}`;

  const pemContents = privateKey
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(toSign));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${toSign}.${sigB64}`,
  });

  const data = (await tokenResp.json()) as any;
  if (!data.access_token) throw new Error('Failed to get access token: ' + JSON.stringify(data));

  cachedToken = { token: data.access_token, expiry: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

const FIRESTORE_BASE = 'https://firestore.googleapis.com/v1';

// Read a single document by path
export async function firestoreGet(env: any, collection: string, docId: string): Promise<any | null> {
  const token = await getAccessToken(env);
  const projectId = env.FIREBASE_PROJECT_ID || 'asetemyt-ec205';
  const resp = await fetch(
    `${FIRESTORE_BASE}/projects/${projectId}/databases/(default)/documents/${collection}/${docId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!resp.ok) return null;
  const doc = await resp.json();
  return { id: doc.name.split('/').pop(), ...parseFirestoreDoc(doc) };
}

// Update specific fields of a document (PATCH)
export async function firestoreUpdate(env: any, collection: string, docId: string, fields: Record<string, any>): Promise<boolean> {
  const token = await getAccessToken(env);
  const projectId = env.FIREBASE_PROJECT_ID || 'asetemyt-ec205';
  const fieldMask = Object.keys(fields).map((k) => `updateMask.fieldPaths=${k}`).join('&');
  const resp = await fetch(
    `${FIRESTORE_BASE}/projects/${projectId}/databases/(default)/documents/${collection}/${docId}?${fieldMask}`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
    }
  );
  return resp.ok;
}

// Create a document with a specific ID
export async function firestoreCreate(env: any, collection: string, docId: string, fields: Record<string, any>): Promise<boolean> {
  const token = await getAccessToken(env);
  const projectId = env.FIREBASE_PROJECT_ID || 'asetemyt-ec205';
  const resp = await fetch(
    `${FIRESTORE_BASE}/projects/${projectId}/databases/(default)/documents/${collection}?documentId=${docId}`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
    }
  );
  if (!resp.ok) {
    const errText = await resp.text().catch(() => 'unknown');
    console.error(`firestoreCreate failed (${collection}/${docId}): ${resp.status} ${errText}`);
    throw new Error(`Firestore create failed: ${resp.status} ${errText.slice(0, 200)}`);
  }
  return resp.ok;
}

// Query documents with a single field filter
export async function firestoreQuery(env: any, collection: string, field: string, op: string, value: any): Promise<any[]> {
  const token = await getAccessToken(env);
  const projectId = env.FIREBASE_PROJECT_ID || 'asetemyt-ec205';
  const resp = await fetch(
    `${FIRESTORE_BASE}/projects/${projectId}/databases/(default)/documents:runQuery`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: collection }],
          where: {
            fieldFilter: {
              field: { fieldPath: field },
              op,
              value,
            },
          },
        },
      }),
    }
  );
  const results = await resp.json();
  return results
    .filter((r: any) => r.document)
    .map((r: any) => ({ id: r.document.name.split('/').pop(), ...parseFirestoreDoc(r.document) }));
}

// Parse Firestore REST document format to plain object
export function parseFirestoreDoc(doc: any): Record<string, any> {
  const result: Record<string, any> = {};
  if (!doc.fields) return result;
  for (const [key, val] of Object.entries(doc.fields) as any) {
    result[key] = parseFirestoreValue(val);
  }
  return result;
}

function parseFirestoreValue(val: any): any {
  if (val.stringValue !== undefined) return val.stringValue;
  if (val.integerValue !== undefined) return parseInt(val.integerValue, 10);
  if (val.doubleValue !== undefined) return val.doubleValue;
  if (val.booleanValue !== undefined) return val.booleanValue;
  if (val.timestampValue !== undefined) return val.timestampValue;
  if (val.arrayValue) return (val.arrayValue.values || []).map(parseFirestoreValue);
  if (val.mapValue) return parseFirestoreDoc(val.mapValue);
  if (val.nullValue) return null;
  return val;
}

// Convert plain value to Firestore value format
export function toFirestoreValue(val: any): any {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'string') return { stringValue: val };
  if (typeof val === 'number') return Number.isInteger(val) ? { integerValue: val.toString() } : { doubleValue: val };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (val instanceof Date) return { timestampValue: val.toISOString() };
  if (Array.isArray(val)) return { arrayValue: { values: val.map(toFirestoreValue) } };
  if (typeof val === 'object') {
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      fields[k] = toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

// Delete a document by path
export async function firestoreDelete(env: any, collection: string, docId: string): Promise<boolean> {
  const token = await getAccessToken(env);
  const projectId = env.FIREBASE_PROJECT_ID || 'asetemyt-ec205';
  const resp = await fetch(
    `${FIRESTORE_BASE}/projects/${projectId}/databases/(default)/documents/${collection}/${docId}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return resp.ok;
}

// --- Split collection helpers ---
const COLLECTION_CONSULTORES = 'directorio_consultores_asetemyt';
const COLLECTION_SOFTWARE = 'directorio_software_asetemyt';

/** Search both directory collections by slug. Returns { listing, collection } or null. */
export async function findListingBySlug(env: any, slug: string): Promise<{ listing: any; collection: string } | null> {
  // Try both collections in parallel
  const [consultResults, softwareResults] = await Promise.all([
    firestoreQuery(env, COLLECTION_CONSULTORES, 'slug', 'EQUAL', { stringValue: slug }),
    firestoreQuery(env, COLLECTION_SOFTWARE, 'slug', 'EQUAL', { stringValue: slug }),
  ]);
  if (consultResults.length > 0) return { listing: consultResults[0], collection: COLLECTION_CONSULTORES };
  if (softwareResults.length > 0) return { listing: softwareResults[0], collection: COLLECTION_SOFTWARE };
  return null;
}
