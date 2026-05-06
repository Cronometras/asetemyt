// Server-side admin helpers
// Admin status is stored in Firestore collection: admins_asetemyt/{email}
// with fields: { uid, email, role: 'admin', createdAt }

import { firestoreGet } from './firestore-rest';

export async function isAdmin(env: any, user: any): Promise<boolean> {
  if (!user) return false;

  // Check Firestore admins collection
  try {
    const email = user.email?.toLowerCase();
    if (!email) return false;
    const doc = await firestoreGet(env, 'admins_asetemyt', email);
    return doc?.role === 'admin';
  } catch {
    return false;
  }
}

export function requireAdmin(user: any, isAdminResult: boolean): Response | null {
  if (!user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
  }
  if (!isAdminResult) {
    return new Response(JSON.stringify({ error: 'Acceso denegado' }), { status: 403 });
  }
  return null; // OK
}
