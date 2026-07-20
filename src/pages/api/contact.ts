// POST /api/contact — Guarda mensajes del formulario público de asetemyt.com/contact
// en Firestore colección `contactos_asetemyt` y envía email de notificación a
// info@asetemyt.com vía webhook GMAIL_WEBAPP_URL.
//
// Esquema esperado por src/pages/contact.astro:
//   { nombre, empresa, email, asunto, mensaje, site }
//
// Variables de entorno (configurar en CF Pages → Settings → Environment variables):
//   FIREBASE_SERVICE_ACCOUNT  (JSON del service account inline, una línea)
//   GMAIL_WEBAPP_URL          (URL del Google Apps Script que envía el email)

interface Env {
  FIREBASE_SERVICE_ACCOUNT: string;
  GMAIL_WEBAPP_URL?: string;
}

function base64url(data: string | Uint8Array): string {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function getAccessToken(sa: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }));
  // Extraer solo el bloque base64 entre los marcadores BEGIN/END.
  // El truco: la regex /[\s\r\n]+/g quita TODOS los espacios, lo que
  // rompe el padding (=) y deja 'BEGINPRIVATEKEY...'. Solución: capturar
  // solo la parte base64 (sin BEGIN/END), y luego quitar solo \n\r.
  const pkMatch = sa.private_key.match(/[REDACTED PRIVATE KEY]/s);
  if (!pkMatch) throw new Error('private_key PEM mal formado');
  const pemContents = pkMatch[1].replace(/[\n\r]/g, '');
  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    'pkcs8', binaryKey, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']
  );
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${header}.${payload}`)
  );
  const jwt = `${header}.${payload}.${base64url(new Uint8Array(signature))}`;
  const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const tokenData = await tokenResp.json() as any;
  if (!tokenResp.ok || !tokenData.access_token) {
    throw new Error(`OAuth token error: ${tokenData.error || 'unknown'}`);
  }
  return tokenData.access_token;
}

function firestoreValue(val: any): any {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'string') return { stringValue: val };
  if (typeof val === 'number') return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  if (typeof val === 'boolean') return { booleanValue: val };
  return { stringValue: String(val) };
}

function firestoreDocument(data: Record<string, any>): any {
  const fields: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) fields[key] = firestoreValue(value);
  return { fields };
}

async function sendNotificationEmail(
  env: Env,
  data: { nombre: string; email: string; empresa: string; asunto: string; mensaje: string }
): Promise<void> {
  const webhookUrl = env.GMAIL_WEBAPP_URL;
  if (!webhookUrl) {
    console.warn('GMAIL_WEBAPP_URL not configured, skipping email');
    return;
  }
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ site: 'asetemyt.com', ...data }),
    });
  } catch (err: any) {
    console.error('Email webhook failed:', err?.message);
  }
}

export const prerender = false;

export async function POST({ request, locals }: { request: Request; locals: any }) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // En @astrojs/cloudflare, las env vars están en locals.runtime.env
    const env: Env = (locals as any)?.runtime?.env || {};
    const saJson = env.FIREBASE_SERVICE_ACCOUNT;

    if (!saJson) {
      console.error('FIREBASE_SERVICE_ACCOUNT env var is missing!');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: corsHeaders }
      );
    }

    const body = await request.json() as any;
    const nombre = (body.nombre || '').trim();
    const email = (body.email || '').trim();
    const empresa = (body.empresa || '').trim();
    const asunto = (body.asunto || '').trim();
    const mensaje = (body.mensaje || '').trim();

    if (!nombre || !email || !mensaje) {
      return new Response(
        JSON.stringify({ error: 'Nombre, email y mensaje son obligatorios' }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Email inválido' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const sa = JSON.parse(saJson);
    // Doble escape: CF Pages guarda el env var como string, y al meter
    // otro JSON dentro, los \n se escapan dos veces (\\n literal). Si el
    // private_key no tiene saltos de línea reales, los restauramos.
    if (sa.private_key && !sa.private_key.includes('\n') && sa.private_key.includes('\\n')) {
      sa.private_key = sa.private_key.split('\\n').join('\n');
    }
    const token = await getAccessToken(sa);
    const docData = {
      nombre,
      email,
      empresa,
      asunto,
      mensaje,
      site: 'asetemyt.com',
      createdAt: new Date().toISOString(),
      source: 'web_contact',
    };

    const resp = await fetch(
      `https://firestore.googleapis.com/v1/projects/${sa.project_id}/databases/(default)/documents/contactos_asetemyt`,
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(firestoreDocument(docData)),
      }
    );

    if (!resp.ok) {
      const errText = await resp.text();
      console.error('Firestore error:', resp.status, errText);
      return new Response(
        JSON.stringify({ error: 'Error al guardar el mensaje', details: errText.substring(0, 200) }),
        { status: 500, headers: corsHeaders }
      );
    }

    sendNotificationEmail(env, { nombre, email, empresa, asunto, mensaje });

    return new Response(
      JSON.stringify({ success: true, message: 'Mensaje enviado correctamente' }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Contact API error:', error?.message || error);
    return new Response(
      JSON.stringify({ error: 'Ha ocurrido un error', details: error?.message || 'unknown' }),
      { status: 500, headers: corsHeaders }
    );
  }
}
