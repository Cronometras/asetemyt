import type { APIRoute } from 'astro';
import { firestoreListAll, firestoreQuery } from '../../../lib/firestore-rest';

export const GET: APIRoute = async ({ url, locals }) => {
  const env = (locals as any).runtime?.env || {};

  try {
    const slug = url.searchParams.get('slug');
    if (!slug) {
      return new Response(JSON.stringify({ error: 'slug requerido.' }), { status: 400 });
    }

    // Query reviews by slug, filter by status in-memory (avoids composite index)
    const allDocs = await firestoreQuery(env, 'reviews_asetemyt', 'slug', 'EQUAL', { stringValue: slug });
    const reviews = allDocs
      .filter((r: any) => r.status === 'approved')
      .sort((a: any, b: any) => (b.createdAt || '').localeCompare(a.createdAt || ''))
      .slice(0, 50);

    // Calculate aggregate
    const totalReviews = reviews.length;
    const avgRating = totalReviews > 0
      ? Math.round((reviews.reduce((sum: number, r: any) => sum + Number(r.rating), 0) / totalReviews) * 10) / 10
      : 0;

    const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r: any) => {
      const key = Number(r.rating) as keyof typeof ratingDistribution;
      if (key >= 1 && key <= 5) ratingDistribution[key]++;
    });

    return new Response(JSON.stringify({
      reviews,
      aggregate: {
        totalReviews,
        avgRating,
        ratingDistribution,
      },
    }), { status: 200 });
  } catch (err: any) {
    console.error('Reviews fetch error:', err);
    return new Response(JSON.stringify({ error: 'Error interno.' }), { status: 500 });
  }
};
