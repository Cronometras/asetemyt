import type { APIRoute } from 'astro';
import { getAuthUser } from '../../../lib/auth-server';
import { isAdmin } from '../../../lib/admin';
import { firestoreGet, firestoreListAll } from '../../../lib/firestore-rest';

const collection = 'informes_prospeccion';
const headers = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' };

export const GET: APIRoute = async ({ request, url, locals }) => {
  const env = (locals as any).runtime?.env || {};
  try {
    const { user } = await getAuthUser(request, env.FIREBASE_API_KEY || '');
    if (!user || !(await isAdmin(env, user))) {
      return Response.json({ error: 'Acceso denegado' }, { status: 403, headers });
    }
    const id = url.searchParams.get('id');
    if (id) {
      if (!/^[\w-]+\.md$/.test(id)) return Response.json({ error: 'Informe no válido' }, { status: 400, headers });
      const report = await firestoreGet(env, collection, id);
      if (!report) return Response.json({ error: 'Informe no encontrado' }, { status: 404, headers });
      if (url.searchParams.get('download') === '1') {
        return new Response(report.content, { headers: { ...headers,
          'Content-Type': 'text/markdown; charset=utf-8',
          'Content-Disposition': `attachment; filename="${id}"`,
        } });
      }
      return Response.json({ report }, { headers });
    }
    const reports = (await firestoreListAll(env, collection))
      .map(({ id, title, date, filename, importedAt, contentHash }: any) => ({ id, title, date, filename, importedAt, contentHash }))
      .sort((a: any, b: any) => String(b.date).localeCompare(String(a.date)) || a.id.localeCompare(b.id));
    return Response.json({ reports }, { headers });
  } catch (error) {
    console.error('Prospección: no se pudieron leer los informes', error);
    return Response.json({ error: 'No se pudieron cargar los informes. Reinténtalo.' }, { status: 503, headers });
  }
};
