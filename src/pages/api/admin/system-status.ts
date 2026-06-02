// GET /api/admin/system-status — Check connectivity to all services
import type { APIRoute } from 'astro';
import { getAuthUser } from '../../../lib/auth-server';
import { isAdmin } from '../../../lib/admin';
import { getAccessToken, firestoreListAll } from '../../../lib/firestore-rest';
import { getStripe } from '../../../lib/stripe-server';

export const GET: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env || {};
  const apiKey = env.FIREBASE_API_KEY || '';
  const { user } = await getAuthUser(request, apiKey);
  if (!user || !(await isAdmin(env, user))) {
    return new Response(JSON.stringify({ error: 'Acceso denegado' }), { status: 403 });
  }

  const results: Record<string, { ok: boolean; detail: string; ms: number }> = {};

  // Firestore
  const fsStart = Date.now();
  try {
    await firestoreListAll(env, 'directorio_consultores_asetemyt');
    results.firestore = { ok: true, detail: 'Conectado', ms: Date.now() - fsStart };
  } catch (e: any) {
    results.firestore = { ok: false, detail: e.message || 'Error', ms: Date.now() - fsStart };
  }

  // Stripe — use customers.list (works with restricted keys) instead of balance.retrieve (requires rak_balance_read)
  const stStart = Date.now();
  try {
    const stripeKey = env.STRIPE_SECRET_KEY || '';
    if (!stripeKey) throw new Error('STRIPE_SECRET_KEY no configurada');
    const stripe = getStripe(stripeKey);
    // Try balance first (most informative), fall back to customers.list
    try {
      await stripe.balance.retrieve();
      results.stripe = { ok: true, detail: 'Conectado (full)', ms: Date.now() - stStart };
    } catch (balanceErr: any) {
      if (balanceErr.message?.includes('does not have the required permissions')) {
        // Restricted key without balance read — try customers instead
        await stripe.customers.list({ limit: 1 });
        results.stripe = { ok: true, detail: 'Conectado (restricted key)', ms: Date.now() - stStart };
      } else {
        throw balanceErr;
      }
    }
  } catch (e: any) {
    results.stripe = { ok: false, detail: e.message || 'Error', ms: Date.now() - stStart };
  }

  // Resend
  const reStart = Date.now();
  try {
    const resendKey = env.RESEND_API_KEY;
    if (!resendKey) throw new Error('RESEND_API_KEY no configurada');
    results.resend = { ok: true, detail: 'Configurada', ms: Date.now() - reStart };
  } catch (e: any) {
    results.resend = { ok: false, detail: e.message || 'Error', ms: Date.now() - reStart };
  }

  // Env vars check
  const envVars = {
    firebase: !!(env.FIREBASE_API_KEY && env.FIREBASE_PROJECT_ID),
    stripe: !!(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET),
    resend: !!env.RESEND_API_KEY,
    cronSecret: !!env.CRON_SECRET,
  };

  const allOk = Object.values(results).every(r => r.ok);

  return new Response(JSON.stringify({
    status: allOk ? 'healthy' : 'degraded',
    services: results,
    envVars,
    timestamp: new Date().toISOString(),
  }), { status: 200 });
};
