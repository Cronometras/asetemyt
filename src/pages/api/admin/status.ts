// GET /api/admin/status — Check if current user is admin
import type { APIRoute } from 'astro';
import { getAuthUser } from '../../../lib/auth-server';
import { isAdmin } from '../../../lib/admin';

export const GET: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env || {};
  const apiKey = env.FIREBASE_API_KEY || '';
  const { user } = await getAuthUser(request, apiKey);
  if (!user) return new Response(JSON.stringify({ admin: false }), { status: 200 });

  const admin = await isAdmin(env, user);
  return new Response(JSON.stringify({ admin, email: user.email }), { status: 200 });
};
