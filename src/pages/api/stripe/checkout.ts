// Legacy entry point: every new payment must pass the authenticated email flow.
import type { APIRoute } from 'astro';
import { getAuthUser, authFailureResponse } from '../../../lib/auth-server';
export const POST: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env || {};
  const { user, error } = await getAuthUser(request, env.FIREBASE_API_KEY);
  if (!user) return authFailureResponse(error);
  const body = await request.json().catch(() => null);
  if (typeof body?.slug !== 'string' || !body.slug) return Response.json({ error: 'Ficha requerida.' }, { status: 400 });
  return Response.json({ error: 'Verifica primero el correo de la ficha.',
    verificationUrl: `/reclamar/${encodeURIComponent(body.slug)}` }, { status: 409 });
};
