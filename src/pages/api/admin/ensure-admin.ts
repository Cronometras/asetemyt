// POST /api/admin/ensure-admin
// One-shot endpoint that adds a bootstrap admin to Firestore.
// Hardcoded to a single email for now; in the future this list can
// move to an env var (BOOTSTRAP_ADMIN_EMAILS) when the user base grows.
//
// Flow:
//   1. User logs in (cookie asetemyt_token set)
//   2. They call this endpoint from the browser (POST with same-origin cookie)
//   3. We verify their Firebase ID token
//   4. If their email is in BOOTSTRAP_EMAILS, we write admins_asetemyt/{email}
//      with role=admin (idempotent: 409 ALREADY_EXISTS is treated as success)
//   5. Future login redirects them to /admin via /api/admin/status
//
// Security: this only creates the doc for emails in the bootstrap list.
// An attacker can't promote themselves unless they control one of these
// email addresses. After the initial bootstrap, the list is a no-op.

import type { APIRoute } from 'astro';
import { getAuthUser } from '../../../lib/auth-server';
import { firestoreGet, firestoreCreate } from '../../../lib/firestore-rest';

const BOOTSTRAP_EMAILS = new Set<string>([
  'micaot@gmail.com',           // titular (ProdCont)
  // Add more bootstrap admins here if needed
]);

export const POST: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env || {};
  const apiKey = env.FIREBASE_API_KEY || '';

  // 1. Authenticate the caller
  const { user } = await getAuthUser(request, apiKey);
  if (!user) {
    return new Response(JSON.stringify({ error: 'No autenticado. Inicia sesión primero.' }), { status: 401 });
  }

  // 2. Check the caller is in the bootstrap list
  const email = (user.email || '').toLowerCase();
  if (!email || !BOOTSTRAP_EMAILS.has(email)) {
    return new Response(JSON.stringify({
      error: 'Tu email no está en la lista de bootstrap admins.',
      email,
    }), { status: 403 });
  }

  // 3. Check if the doc already exists (idempotent path)
  try {
    const existing = await firestoreGet(env, 'admins_asetemyt', email);
    if (existing && existing.role === 'admin') {
      return new Response(JSON.stringify({
        success: true,
        message: `El documento admins_asetemyt/${email} ya existe con role=admin. Nada que hacer.`,
        alreadyAdmin: true,
      }), { status: 200 });
    }
  } catch (e) {
    // firestoreGet can throw on network errors — proceed to create path
  }

  // 4. Create the admin doc
  try {
    await firestoreCreate(env, 'admins_asetemyt', email, {
      email: { stringValue: email },
      uid: { stringValue: user.user_id || user.uid || '' },
      role: { stringValue: 'admin' },
      createdAt: { timestampValue: new Date().toISOString() },
    });
    return new Response(JSON.stringify({
      success: true,
      message: `✅ admins_asetemyt/${email} creado con role=admin. Vuelve a iniciar sesión para acceder a /admin.`,
      alreadyAdmin: false,
    }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || String(e) }), { status: 500 });
  }
};
