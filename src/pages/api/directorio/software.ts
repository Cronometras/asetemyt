// Public software projection, maintained by D1 app_documents triggers.
import { publicListing } from '../../../lib/public-listing';
import type { APIRoute } from 'astro';
import { getDB, listSoftware } from '../../../lib/d1';

export const GET: APIRoute = async ({ locals }) => {
  try {
    const db = getDB(locals);
    const software = (await listSoftware(db)).map(publicListing);
    return new Response(JSON.stringify({ software, count: software.length }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=0, must-revalidate',
      },
    });
  } catch (err: any) {
    console.error('directorio/software error:', err);
    return new Response(JSON.stringify({ error: 'Error cargando directorio software.' }), { status: 500 });
  }
};
