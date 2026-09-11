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
// NOTE: we no longer require `emailVerified` here. Many bootstrap owners
// authenticate via providers (Google, GitHub) where Firebase marks the email
// as verified at the provider level, but `user.emailVerified` on the ID token
// can be `false` until the user explicitly reloads after verification. Gating
// admin access on that flag created a confusing lockout where the user was
// signed in but treated as a stranger. The bootstrap-admin trust is already
// strong — it's hardcoded by the operator in BOOTSTRAP_ADMIN_EMAILS — so we
// match on email presence alone. Service-account, magic-link and password
// flows still require verification at the Firebase Auth level if you want
// to enforce it; that gate is upstream of this helper.
export function isBootstrapAdmin(env: any, user: any): boolean {
  const emails = String(env.BOOTSTRAP_ADMIN_EMAILS ?? 'micaot@gmail.com')
    .split(',').map(email => email.trim().toLowerCase()).filter(Boolean);
  return Boolean(user?.email) && emails.includes(user.email.toLowerCase());
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
