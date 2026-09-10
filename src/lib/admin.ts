// Server-side admin helpers
// Verified bootstrap owners are authorized by server configuration.
// Other roles live in admins_asetemyt/{email}: D1 when DB is bound, Firestore otherwise.
// with fields: { uid, email, role: 'admin', createdAt }

import { firestoreGet } from './firestore-rest';
import { getCached } from './cache';

// Legacy Firestore deployments cache role checks; D1 reads bypass KV.
const ADMIN_ROLE_CACHE_TTL = 3600; // 1h
const adminRoleCacheKey = (email: string) => `cache:admin:role:${email.toLowerCase()}:v2`;

// The same owner already authorized by ensure-admin. A verified bootstrap
// identity can recover access without a Firestore read/write during an outage.
export function isBootstrapAdmin(env: any, user: any): boolean {
  const emails = String(env.BOOTSTRAP_ADMIN_EMAILS ?? 'micaot@gmail.com')
    .split(',').map(email => email.trim().toLowerCase()).filter(Boolean);
  return user?.emailVerified === true && emails.includes(user.email?.toLowerCase());
}

export async function isAdmin(env: any, user: any): Promise<boolean> {
  if (!user) return false;
  const email = user.email?.toLowerCase();
  if (!email) return false;
  if (isBootstrapAdmin(env, user)) return true;

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
