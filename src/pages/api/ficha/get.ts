// GET /api/ficha/get?slug=xxx — Get listing data for editing (owner only)
import type { APIRoute } from 'astro';
import { getAuthUser } from '../../../lib/auth-server';
import { findListingBySlug } from '../../../lib/firestore-rest';

export const GET: APIRoute = async ({ request, locals, url }) => {
  const env = (locals as any).runtime?.env || {};
  const apiKey = env.FIREBASE_API_KEY || '';

  const { user, error: authError } = await getAuthUser(request, apiKey);
  if (!user) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });

  const slug = url.searchParams.get('slug');
  if (!slug) return new Response(JSON.stringify({ error: 'Slug requerido' }), { status: 400 });

  const found = await findListingBySlug(env, slug);
  if (!found) return new Response(JSON.stringify({ error: 'Ficha no encontrada' }), { status: 404 });

  // Only the owner can fetch for editing
  if (found.listing.ownerUid !== user.user_id) {
    return new Response(JSON.stringify({ error: 'No eres el propietario de esta ficha' }), { status: 403 });
  }

  // Return editable fields
  return new Response(JSON.stringify({
    nombre: found.listing.nombre || '',
    descripcion: found.listing.descripcion || '',
    especialidades: found.listing.especialidades || [],
    servicios: found.listing.servicios || [],
    ubicacion: found.listing.ubicacion || {},
    contacto: {
      email: found.listing.contacto?.email || '',
      telefono: found.listing.contacto?.telefono || '',
      web: found.listing.contacto?.web || '',
      linkedin: found.listing.contacto?.linkedin || '',
    },
    logo: found.listing.logo || '',
    verificado: found.listing.verificado || false,
  }), { status: 200 });
};
