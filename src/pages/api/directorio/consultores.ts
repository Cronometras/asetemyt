// Public consultores projection, maintained by D1 app_documents triggers.
import type { APIRoute } from 'astro';
import { getDB, listConsultores } from '../../../lib/d1';

export const GET: APIRoute = async ({ locals }) => {
  try {
    const db = getDB(locals);
    const consultores = await listConsultores(db);
    return new Response(JSON.stringify({ consultores, count: consultores.length }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        // Revalidate so directory edits are visible on the next refresh.
        'Cache-Control': 'public, max-age=0, must-revalidate',
      },
    });
  } catch (err: any) {
    console.error('directorio/consultores error:', err);
    return new Response(JSON.stringify({ error: 'Error cargando directorio.' }), { status: 500 });
  }
};
