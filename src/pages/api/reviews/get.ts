import type { APIRoute } from 'astro';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, cert, getApps } from 'firebase-admin/app';

if (!getApps().length) {
  const sa = JSON.parse(process.env.FIREBASE_SA || '{}');
  initializeApp({ credential: cert(sa) });
}
const adminDb = getFirestore();

export const GET: APIRoute = async ({ url }) => {
  try {
    const slug = url.searchParams.get('slug');
    if (!slug) {
      return new Response(JSON.stringify({ error: 'slug requerido.' }), { status: 400 });
    }

    const snap = await adminDb.collection('reviews_asetemyt')
      .where('slug', '==', slug)
      .where('status', '==', 'approved')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const reviews = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Calculate aggregate
    const totalReviews = reviews.length;
    const avgRating = totalReviews > 0
      ? Math.round((reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / totalReviews) * 10) / 10
      : 0;

    const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r: any) => {
      const key = r.rating as keyof typeof ratingDistribution;
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
