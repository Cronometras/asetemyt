// Server-side admin helpers
// Admin status is stored in Firestore collection: admins_asetemyt/{email}
// with fields: { uid, email, role: 'admin', createdAt }

import { firestoreGet } from './firestore-rest';
import { getCached } from './cache';

// Admin role changes extremely rarely (a few times a year at most), so
// we cache the per-email admin lookup for a long time. This is critical
// because Firestore Spark quota (50K reads/day) is shared with the rest
// of the app — without this cache, EVERY admin request costs a Firestore
// read, and when quota is exhausted the silent catch below would 403
// every admin action even though the user is legitimately an admin.
const ADMIN_ROLE_CACHE_TTL = 3600; // 1h
const adminRoleCacheKey = (email: string) => `cache:admin:role:${email.toLowerCase()}:v1`;

export async function isAdmin(env: any, user: any): Promise<boolean> {
  if (!user) return false;
  const email = user.email?.toLowerCase();
  if (!email) return false;

  try {
    return await getCached(
      env,
      adminRoleCacheKey(email),
      async () => {
        const doc = await firestoreGet(env, 'admins_asetemyt', email);
        return doc?.role === 'admin';
      },
      ADMIN_ROLE_CACHE_TTL
    );
  } catch (e) {
    // CRITICAL: do not silently turn quota errors into "not admin".
    // Log the underlying error and re-throw so callers can distinguish
    // "user is not admin" (false) from "we couldn't check" (transient).
    console.error(`[admin] isAdmin check failed for ${email}:`, (e as Error).message);
    throw e;
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
