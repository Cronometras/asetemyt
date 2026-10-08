// GET /api/admin/pipeline/list — Lista de oportunidades del pipeline Cronometras (CRM ligero)
// Query params:
//   etapa:     detectada|borrador|contactado|respondido|reunion|propuesta|ganada|perdida. Vacío = todas.
//   categoria: A|B|C|D|E (categoría de la señal de prospección). Vacío = todas.
//   q:         búsqueda por empresa/dominio.
//   limit:     máx. resultados (default 200, max 500)
//
// Sin caché a propósito: panel de administración con pocos documentos y
// ediciones frecuentes; el listado debe reflejar el estado real siempre.
//
// Returns: { oportunidades: [...], total }

import type { APIRoute } from 'astro';
import { getAuthUser } from '../../../../lib/auth-server';
import { isAdmin } from '../../../../lib/admin';
import { firestoreListAll } from '../../../../lib/firestore-rest';

export const PIPELINE_COLLECTION = 'outreach_cronometras';
export const PIPELINE_ETAPAS = [
  'detectada',
  'borrador',
  'contactado',
  'respondido',
  'reunion',
  'propuesta',
  'ganada',
  'perdida',
] as const;

function normalize(o: any) {
  return {
    id: o.id,
    empresa: o.empresa || '',
    dominio: o.dominio || '',
    pais: o.pais || '',
    sector: o.sector || '',
    categoria: o.categoria || '',
    senal: o.senal || '',
    fuente: o.fuente || '',
    fuenteUrl: o.fuenteUrl || '',
    fechaSenal: o.fechaSenal || '',
    cargo: o.cargo || '',
    contactoNombre: o.contactoNombre || '',
    contactoEmail: o.contactoEmail || '',
    canal: o.canal || 'email',
    etapa: o.etapa || 'detectada',
    subject: o.subject || '',
    body: o.body || '',
    sentAt: o.sentAt || '',
    sentBy: o.sentBy || '',
    messageId: o.messageId || '',
    replied: !!o.replied,
    repliedAt: o.repliedAt || '',
    notes: o.notes || '',
    createdAt: o.createdAt || '',
    updatedAt: o.updatedAt || '',
  };
}

export const GET: APIRoute = async ({ request, url, locals }) => {
  const env = (locals as any).runtime?.env || {};
  const apiKey = env.FIREBASE_API_KEY || '';
  const { user } = await getAuthUser(request, apiKey);
  if (!user || !(await isAdmin(env, user))) {
    return new Response(JSON.stringify({ error: 'Acceso denegado' }), { status: 403 });
  }

  try {
    const etapaFilter = url.searchParams.get('etapa') || '';
    const categoriaFilter = url.searchParams.get('categoria') || '';
    const q = (url.searchParams.get('q') || '').toLowerCase().trim();
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '200'), 500);

    const all = await firestoreListAll(env, PIPELINE_COLLECTION);
    let rows = all.map(normalize).sort((a: any, b: any) => {
      const at = (a.updatedAt || a.createdAt || '').toString();
      const bt = (b.updatedAt || b.createdAt || '').toString();
      return bt.localeCompare(at);
    });

    if (etapaFilter) rows = rows.filter((r) => r.etapa === etapaFilter);
    if (categoriaFilter) rows = rows.filter((r) => r.categoria === categoriaFilter);
    if (q) {
      rows = rows.filter(
        (r) =>
          (r.empresa || '').toLowerCase().includes(q) ||
          (r.dominio || '').toLowerCase().includes(q) ||
          (r.contactoNombre || '').toLowerCase().includes(q)
      );
    }

    return new Response(
      JSON.stringify({
        oportunidades: rows.slice(0, limit),
        total: rows.length,
        etapas: PIPELINE_ETAPAS,
        filters: { etapa: etapaFilter, categoria: categoriaFilter, q, limit },
      }),
      { status: 200 }
    );
  } catch (err: any) {
    console.error('Pipeline list error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
