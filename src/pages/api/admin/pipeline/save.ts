// POST /api/admin/pipeline/save — crea o actualiza una oportunidad del pipeline Cronometras.
// Body: { id?: string, empresa, dominio?, pais?, sector?, categoria?, senal?, fuente?,
//         fuenteUrl?, fechaSenal?, cargo?, contactoNombre?, contactoEmail?, canal?,
//         etapa?, subject?, body?, sentAt?, sentBy?, messageId?, replied?, repliedAt?, notes? }
//   - Sin `id` → crea (id generado: op-<ts>-<rand>).
//   - Con `id` → actualiza solo los campos enviados (merge sobre el documento existente).
//
// Returns: { success: true, id, etapa }

import type { APIRoute } from 'astro';
import { getAuthUser } from '../../../../lib/auth-server';
import { isAdmin } from '../../../../lib/admin';
import { firestoreGet, firestoreCreate, firestoreUpdate } from '../../../../lib/firestore-rest';
import { PIPELINE_COLLECTION, PIPELINE_ETAPAS } from './list';

const TEXT_FIELDS = [
  'empresa',
  'dominio',
  'pais',
  'sector',
  'categoria',
  'senal',
  'fuente',
  'fuenteUrl',
  'fechaSenal',
  'cargo',
  'contactoNombre',
  'contactoEmail',
  'canal',
  'etapa',
  'subject',
  'body',
  'sentAt',
  'sentBy',
  'messageId',
  'repliedAt',
  'notes',
];

export const POST: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env || {};
  const apiKey = env.FIREBASE_API_KEY || '';
  const { user } = await getAuthUser(request, apiKey);
  if (!user || !(await isAdmin(env, user))) {
    return new Response(JSON.stringify({ error: 'Acceso denegado' }), { status: 403 });
  }

  try {
    const payload = await request.json().catch(() => null);
    if (!payload || typeof payload !== 'object') {
      return new Response(JSON.stringify({ error: 'Body JSON obligatorio' }), { status: 400 });
    }

    const id = (payload.id || '').toString().trim();
    const creating = !id;

    if (creating && !payload.empresa) {
      return new Response(JSON.stringify({ error: 'empresa es obligatoria' }), { status: 400 });
    }

    if (payload.etapa && !PIPELINE_ETAPAS.includes(payload.etapa)) {
      return new Response(
        JSON.stringify({ error: `etapa inválida: ${payload.etapa}. Valores: ${PIPELINE_ETAPAS.join(', ')}` }),
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const fields: Record<string, any> = {};
    for (const key of TEXT_FIELDS) {
      if (payload[key] !== undefined && payload[key] !== null) fields[key] = String(payload[key]);
    }
    if (payload.replied !== undefined) fields.replied = !!payload.replied;
    fields.updatedAt = now;

    let docId = id;
    if (creating) {
      docId = `op-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      fields.createdAt = fields.createdAt || now;
      if (!fields.etapa) fields.etapa = 'detectada';
      const ok = await firestoreCreate(env, PIPELINE_COLLECTION, docId, fields);
      if (!ok) throw new Error('No se pudo crear la oportunidad');
    } else {
      const existing = await firestoreGet(env, PIPELINE_COLLECTION, docId);
      if (!existing) {
        return new Response(JSON.stringify({ error: `Oportunidad ${docId} no existe` }), { status: 404 });
      }
      const ok = await firestoreUpdate(env, PIPELINE_COLLECTION, docId, fields);
      if (!ok) throw new Error('No se pudo actualizar la oportunidad');
    }

    return new Response(
      JSON.stringify({ success: true, id: docId, etapa: fields.etapa || undefined, created: creating }),
      { status: 200 }
    );
  } catch (err: any) {
    console.error('Pipeline save error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
