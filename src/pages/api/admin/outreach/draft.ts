// POST /api/admin/outreach/draft — Create a draft outreach for a ficha.
// Returns the outreachId + ficha context so the agent (or admin) can
// draft a personalized email. The actual send is a separate step via
// /api/admin/outreach/send.
//
// Body: { slug, collection }
//   collection: "directorio_consultores_asetemyt" | "directorio_software_asetemyt"
//
// Response: { outreachId, slug, collection, fichaNombre, fichaEmail,
//             fichaContext, contactoNumero, emailsPrevios, draft: { subject, body } }
//
// Draft subject/body are pre-filled with placeholder templates the
// agent will personalize. They are NOT sent until the agent calls
// /api/admin/outreach/send with the final content.

import type { APIRoute } from 'astro';
import { getAuthUser } from '../../../lib/auth-server';
import { isAdmin } from '../../../lib/admin';
import {
  findListingBySlug,
  firestoreListAll,
  firestoreCreate,
} from '../../../lib/firestore-rest';

const COLLECTION_CONSULTORES = 'directorio_consultores_asetemyt';
const COLLECTION_SOFTWARE = 'directorio_software_asetemyt';
const OUTREACH_COLLECTION = 'outreach_asetemyt';

function buildContext(listing: any): string {
  // Compact summary the agent can use to personalize the email.
  const lines: string[] = [];
  lines.push(`Nombre: ${listing.nombre || '(sin nombre)'}`);
  if (listing.tipo) lines.push(`Tipo: ${listing.tipo}`);
  if (listing.seccion) lines.push(`Sección: ${listing.seccion}`);
  if (listing.descripcion) lines.push(`Descripción: ${listing.descripcion.substring(0, 400)}`);
  if (Array.isArray(listing.especialidades) && listing.especialidades.length) {
    lines.push(`Especialidades: ${listing.especialidades.join(', ')}`);
  }
  if (Array.isArray(listing.servicios) && listing.servicios.length) {
    lines.push(`Servicios: ${listing.servicios.slice(0, 5).join(' / ')}`);
  }
  if (listing.ubicacion) {
    const u = listing.ubicacion;
    const loc = [u.ciudad, u.provincia, u.pais].filter(Boolean).join(', ');
    if (loc) lines.push(`Ubicación: ${loc}`);
  }
  if (listing.contacto?.web) lines.push(`Web: ${listing.contacto.web}`);
  if (listing.verificado) lines.push(`Verificado: sí`);
  return lines.join('\n');
}

export const POST: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env || {};
  const apiKey = env.FIREBASE_API_KEY || '';
  const { user } = await getAuthUser(request, apiKey);
  if (!user || !(await isAdmin(env, user))) {
    return new Response(JSON.stringify({ error: 'Acceso denegado' }), { status: 403 });
  }

  try {
    const payload = await request.json();
    const { slug, collection } = payload;

    if (!slug || !collection) {
      return new Response(JSON.stringify({ error: 'slug y collection son obligatorios' }), { status: 400 });
    }
    if (collection !== COLLECTION_CONSULTORES && collection !== COLLECTION_SOFTWARE) {
      return new Response(JSON.stringify({ error: 'collection inválida' }), { status: 400 });
    }

    // 1. Verify the ficha exists in the requested collection (or auto-detect)
    const found = await findListingBySlug(env, slug);
    if (!found) {
      return new Response(JSON.stringify({ error: `Ficha ${slug} no encontrada` }), { status: 404 });
    }
    if (found.collection !== collection) {
      return new Response(JSON.stringify({
        error: `La ficha está en ${found.collection}, no en ${collection}`,
      }), { status: 400 });
    }

    const listing = found.listing;
    const fichaEmail: string = (listing.contacto?.email || '').trim();
    if (!fichaEmail) {
      return new Response(JSON.stringify({
        error: 'La ficha no tiene email de contacto configurado',
      }), { status: 400 });
    }

    // 2. Compute contactoNumero = N+1 where N is the count of previous
    //    outreachs for this slug. We query the outreach collection.
    //    Cost: 1 firestoreQuery (1 read). Acceptable on admin endpoints.
    const previous = await firestoreListAll(env, OUTREACH_COLLECTION);
    const myPrev = previous
      .filter((o: any) => o.slug === slug)
      .sort((a: any, b: any) => (a.contactoNumero || 0) - (b.contactoNumero || 0));
    const contactoNumero = (myPrev.length || 0) + 1;

    // 3. Snapshot of previous emails (so the agent can reference them)
    const emailsPrevios = myPrev.map((o: any) => ({
      id: o.id,
      contactoNumero: o.contactoNumero,
      sentAt: o.sentAt || o.createdAt,
      subject: o.subject || '',
      bodySnippet: (o.body || '').substring(0, 200),
      replied: !!o.replied,
      repliedAt: o.repliedAt || null,
    }));

    // 4. Pre-fill a draft template (agent will personalize)
    const isFirst = contactoNumero === 1;
    const subject = isFirst
      ? `Colaboración entre ${listing.nombre || 'tu empresa'} y ASETEMYT`
      : `Re: Colaboración entre ${listing.nombre || 'tu empresa'} y ASETEMYT (${contactoNumero}º contacto)`;
    const draftBody = isFirst
      ? `Hola {{nombre}},\n\n` +
        `Te escribo desde ASETEMYT (asetemyt.com), el directorio de referencia ` +
        `en cronometraje industrial en España.\n\n` +
        `He visto tu ficha y me parece muy interesante, especialmente por ` +
        `{{especialidadDestacada}}. Quería proponerte una colaboración...\n\n` +
        `(Personalizar antes de enviar)`
      : `Hola {{nombre}},\n\n` +
        `Soy [tu nombre] de ASETEMYT, te escribí el {{fechaAnterior}} sobre la posibilidad de ` +
        `verificar tu ficha y asociarte al directorio. No he tenido noticias tuyas, ` +
        `así que te reenvío el mensaje por si se te pasó.\n\n` +
        `(Personalizar y referenciar el contacto anterior)`;

    // 5. Create the draft document
    const outreachId = `outreach_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await firestoreCreate(env, OUTREACH_COLLECTION, outreachId, {
      slug: { stringValue: slug },
      collection: { stringValue: collection },
      fichaNombre: { stringValue: listing.nombre || '' },
      fichaEmail: { stringValue: fichaEmail },
      contactoNumero: { integerValue: String(contactoNumero) },
      emailsPrevios: {
        arrayValue: {
          values: emailsPrevios.map((e) => ({
            mapValue: {
              fields: {
                id: { stringValue: e.id },
                contactoNumero: { integerValue: String(e.contactoNumero) },
                sentAt: { stringValue: e.sentAt || '' },
                subject: { stringValue: e.subject },
                bodySnippet: { stringValue: e.bodySnippet },
                replied: { booleanValue: e.replied },
                repliedAt: { stringValue: e.repliedAt || '' },
              },
            },
          })),
        },
      },
      subject: { stringValue: subject },
      body: { stringValue: draftBody },
      sentAt: { stringValue: '' },          // empty until sent
      sentBy: { stringValue: user.email || user.user_id || '' },
      replied: { booleanValue: false },
      repliedAt: { nullValue: null },
      lastReplyFrom: { stringValue: '' },
      lastReplyAt: { nullValue: null },
      notes: { stringValue: '' },
      status: { stringValue: 'draft' },     // draft | sent | failed
      createdAt: { timestampValue: new Date().toISOString() },
    });

    return new Response(JSON.stringify({
      success: true,
      outreachId,
      slug,
      collection,
      fichaNombre: listing.nombre || '',
      fichaEmail,
      fichaContext: buildContext(listing),
      contactoNumero,
      emailsPrevios,
      draft: { subject, body: draftBody },
    }), { status: 201 });
  } catch (err: any) {
    console.error('Outreach draft error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
