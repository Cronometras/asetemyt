import type { APIRoute } from 'astro';
import { firestoreQuery } from '../../../lib/firestore-rest';
import { getCached, CACHE_KEYS } from '../../../lib/cache';

export const GET: APIRoute = async ({ url, locals }) => {
  const env = (locals as any).runtime?.env || {};

  try {
    const slug = url.searchParams.get('slug');
    if (!slug) {
      return new Response(JSON.stringify({ error: 'slug requerido.' }), { status: 400 });
    }

    // Cache the approved+aggregated review payload per slug. 24h TTL is fine —
    // cache is invalidated when an admin approves a new review (see reviews/submit.ts).
    const payload = await getCached(
      env,
      `${CACHE_KEYS.reviewsAll}:${slug}`,
      async () => {
        const allDocs = await firestoreQuery(env, 'reviews_asetemyt', 'slug', 'EQUAL', { stringValue: slug });
        const reviews = allDocs
          .filter((r: any) => r.status === 'approved')
          .sort((a: any, b: any) => (b.createdAt || '').localeCompare(a.createdAt || ''))
          .slice(0, 50);

        const totalReviews = reviews.length;
        const avgRating = totalReviews > 0
          ? Math.round((reviews.reduce((sum: number, r: any) => sum + Number(r.rating), 0) / totalReviews) * 10) / 10
          : 0;

        const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        reviews.forEach((r: any) => {
          const key = Number(r.rating) as keyof typeof ratingDistribution;
          if (key >= 1 && key <= 5) ratingDistribution[key]++;
        });

        return {
          reviews,
          aggregate: { totalReviews, avgRating, ratingDistribution },
        };
      },
      86400
    );

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=600, stale-while-revalidate=85800',
      },
    });
  } catch (err: any) {
    console.error('Reviews fetch error:', err);
    return new Response(JSON.stringify({ error: 'Error interno.' }), { status: 500 });
  }
};
