// GET /api/ficha/contact?slug=X — Return contact data if ficha is verified or admin-unlocked
import type { APIRoute } from 'astro';
import { findListingBySlug } from '../../../lib/firestore-rest';

export const GET: APIRoute = async ({ url, locals }) => {
  const env = (locals as any).runtime?.env || {};
  const slug = url.searchParams.get('slug');

  if (!slug) {
    return new Response(JSON.stringify({ error: 'Slug requerido' }), { status: 400 });
  }

  try {
    const found = await findListingBySlug(env, slug);
    if (!found) {
      return new Response(JSON.stringify({ error: 'Ficha no encontrada' }), { status: 404 });
    }

    const listing = found.listing;
    const isVerified = listing.verificado === true;
    const isUnlocked = listing.contactoDesbloqueado !== false;

    if (!isVerified && !isUnlocked) {
      return new Response(JSON.stringify({ locked: true, contacto: null }), { status: 200 });
    }

    return new Response(JSON.stringify({
      locked: false,
      contacto: listing.contacto || {},
    }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
