// GET /api/admin/content — Read glossary.json or software-comparison.json
// PUT — Update glossary.json or software-comparison.json
import type { APIRoute } from 'astro';
import { getAuthUser } from '../../../lib/auth-server';
import { isAdmin } from '../../../lib/admin';

const VALID_FILES = ['glossary', 'software-comparison'];

export const GET: APIRoute = async ({ request, url, locals }) => {
  const env = (locals as any).runtime?.env || {};
  const apiKey = env.FIREBASE_API_KEY || '';
  const { user } = await getAuthUser(request, apiKey);
  if (!user || !(await isAdmin(env, user))) return new Response(JSON.stringify({ error: 'Acceso denegado' }), { status: 403 });

  const file = url.searchParams.get('file') || 'glossary';
  if (!VALID_FILES.includes(file)) return new Response(JSON.stringify({ error: 'Archivo inválido' }), { status: 400 });

  try {
    const resp = await fetch(`https://asetemyt.com/data/${file}.json`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    return new Response(JSON.stringify({ data, file }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};

// Note: PUT only previews/saves to a temp location. Actual deploy requires git push.
// For now, returns the updated JSON for manual copy-paste to the repo.
export const PUT: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env || {};
  const apiKey = env.FIREBASE_API_KEY || '';
  const { user } = await getAuthUser(request, apiKey);
  if (!user || !(await isAdmin(env, user))) return new Response(JSON.stringify({ error: 'Acceso denegado' }), { status: 403 });

  try {
    const { file, data } = await request.json();
    if (!file || !data) return new Response(JSON.stringify({ error: 'file y data requeridos' }), { status: 400 });
    if (!VALID_FILES.includes(file)) return new Response(JSON.stringify({ error: 'Archivo inválido' }), { status: 400 });

    // Write to public/data/{file}.json
    // In production (CF Workers), this writes to a temp location — persisted via git
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.join(process.cwd(), 'public', 'data', `${file}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

    return new Response(JSON.stringify({ success: true, message: `${file}.json actualizado. Haz commit y deploy para publicar.` }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
