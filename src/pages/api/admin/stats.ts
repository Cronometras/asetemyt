// GET /api/admin/stats — Dashboard metrics for admin panel
import type { APIRoute } from 'astro';
import { getAuthUser } from '../../../lib/auth-server';
import { isAdmin } from '../../../lib/admin';
import { firestoreListAll, firestoreQuery } from '../../../lib/firestore-rest';
import { getCached } from '../../../lib/cache';

const ADMIN_CACHE_TTL = 60;
const ADMIN_CACHE_KEY_STATS = 'cache:admin:stats:v1';

export const GET: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env || {};
  const apiKey = env.FIREBASE_API_KEY || '';
  const { user } = await getAuthUser(request, apiKey);
  if (!user || !(await isAdmin(env, user))) {
    return new Response(JSON.stringify({ error: 'Acceso denegado' }), { status: 403 });
  }

  try {
    const data = await getCached(
      env,
      ADMIN_CACHE_KEY_STATS,
      async () => {
        // Fetch all data in parallel
        const [
          consultores,
          software,
          pendingClaims,
          leads,
          subscriptions,
          // Recent activity: last 5 claims (any status)
          recentClaims,
        ] = await Promise.all([
          firestoreListAll(env, 'directorio_consultores_asetemyt'),
          firestoreListAll(env, 'directorio_software_asetemyt'),
          firestoreQuery(env, 'claims_asetemyt', 'estado', 'EQUAL', { stringValue: 'pending' }),
          firestoreListAll(env, 'leads_asetemyt'),
          firestoreQuery(env, 'subscriptions_asetemyt', 'status', 'EQUAL', { stringValue: 'active' }),
          firestoreListAll(env, 'claims_asetemyt'),
        ]);

        // Lead stats
        const newLeads = leads.filter((l: any) => l.status === 'new').length;
        const totalLeads = leads.length;
        const contactedLeads = leads.filter((l: any) => l.status === 'contacted' || l.status === 'closed').length;

        // Subscription stats
        const activeSubs = subscriptions.length;

        // Recent activity — last 5 claims sorted by date
        const sortedClaims = recentClaims
          .sort((a: any, b: any) => (b.createdAt || '').localeCompare(a.createdAt || ''))
          .slice(0, 5);

        // Monthly trend — fichas created per month (last 6 months)
        const now = new Date();
        const monthlyTrend: { month: string; count: number }[] = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          const prefix = key;
          const count = [...consultores, ...software].filter((f: any) => {
            const created = f.createdAt?.substring(0, 7);
            return created === prefix;
          }).length;
          monthlyTrend.push({ month: key, count });
        }

        return {
          totals: {
            consultores: consultores.length,
            software: software.length,
            total: consultores.length + software.length,
          },
          claims: {
            pending: pendingClaims.length,
            total: recentClaims.length,
          },
          leads: {
            new: newLeads,
            total: totalLeads,
            contacted: contactedLeads,
          },
          subscriptions: {
            active: activeSubs,
          },
          monthlyTrend,
          recentActivity: sortedClaims.map((c: any) => ({
            id: c.id,
            slug: c.slug,
            email: c.email,
            estado: c.estado,
            createdAt: c.createdAt,
          })),
        };
      },
      ADMIN_CACHE_TTL
    );

    return new Response(JSON.stringify(data), { status: 200 });
  } catch (err: any) {
    console.error('Admin stats error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
