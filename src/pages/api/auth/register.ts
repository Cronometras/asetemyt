// POST /api/auth/register — Register user in Firestore after Firebase Auth signup
import type { APIRoute } from 'astro';
import { getAuthUser } from '../../../lib/auth-server';
import { firestoreGet, firestoreCreate } from '../../../lib/firestore-rest';

export const POST: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env || {};
  const projectId = env.FIREBASE_PROJECT_ID || 'asetemyt-ec205';

  const user = await getAuthUser(request, projectId);
  if (!user) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });

  const { nombre, email } = await request.json();

  // Check if user already exists
  const existing = await firestoreGet(env, 'users_asetemyt', user.user_id);
  if (existing) {
    return new Response(JSON.stringify({ success: true, exists: true }), { status: 200 });
  }

  // Create user document
  const ok = await firestoreCreate(env, 'users_asetemyt', user.user_id, {
    uid: { stringValue: user.user_id },
    email: { stringValue: email || user.email || '' },
    nombre: { stringValue: nombre || user.name || '' },
    createdAt: { timestampValue: new Date().toISOString() },
    stripeCustomerId: { stringValue: '' },
    fichasReclamadas: { arrayValue: { values: [] } },
  });

  if (!ok) return new Response(JSON.stringify({ error: 'Error creando usuario' }), { status: 500 });
  return new Response(JSON.stringify({ success: true }), { status: 200 });
};
