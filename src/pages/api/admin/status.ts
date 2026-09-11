// GET /api/admin/status — Check if current user is admin
import type { APIRoute } from 'astro';
import { getAuthUser, authFailureResponse } from '../../../lib/auth-server';
import { isAdmin } from '../../../lib/admin';

export const GET: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env || {};
  const apiKey = env.FIREBASE_API_KEY || '';
  const { user, error } = await getAuthUser(request, apiKey);
  if (!user) return authFailureResponse(error);

  try {
    const admin = await isAdmin(env, user);
    return Response.json({ admin, email: user.email }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ error: 'No se pudo comprobar el permiso de administrador. Reinténtalo más tarde.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
};
