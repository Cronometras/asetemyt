import { isDirectoryExcluded } from '../../../lib/directory-exclusions';
import type { APIRoute } from 'astro';
import { createDocument, queryDocuments } from '../../../lib/d1-documents';
import { validTextForm } from '../../../lib/form-validation';
import { validateListingUpdates } from '../../../lib/listing-validation';

async function notifyNewCompany(apiKey: string | undefined, id: string, name: string) {
  if (!apiKey) {
    console.warn('Company registration email unavailable: RESEND_API_KEY is missing', id);
    return;
  }

  const body = JSON.stringify({
    from: 'ASETEMYT <noreply@asetemyt.com>',
    to: ['info@asetemyt.com'],
    subject: 'Nueva empresa pendiente de revisión en ASETEMYT',
    text: `Empresa: ${name}\n\nRevisa la solicitud en https://asetemyt.com/admin/moderacion`,
  });
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': `company-registration/${id}`,
        },
        body,
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) return;
      if (response.status < 500 || attempt === 1) {
        console.warn('Company registration email rejected', id, response.status);
        return;
      }
    } catch {
      if (attempt === 1) console.warn('Company registration email unavailable', id);
    }
  }
}
export const POST: APIRoute = async ({request,locals})=>{
 const env=(locals as any).runtime?.env||{};
 if(!env.DB) return Response.json({error:'Servicio temporalmente no disponible.'},{status:503});
 try{
  const body=await request.json().catch(()=>null);
  if(!validTextForm(body,{nombre:200,tipo:30,descripcion:10000,lang:2},['nombre','tipo','descripcion']) || !['empresa','consultor','freelance'].includes(body.tipo) || validateListingUpdates(body)) return Response.json({error:'Revisa los datos y utiliza URLs completas con https://.'},{status:400});
  const ip=request.headers.get('cf-connecting-ip')||'unknown';
  const recent=await queryDocuments(env.DB,'pending_consultores_asetemyt','ip','EQUAL',ip);
  if(recent.filter((entry:any)=>entry.createdAt>new Date(Date.now()-86400000).toISOString()).length>=3) return Response.json({error:'Has enviado varias fichas hoy. Inténtalo mañana.'},{status:429});
  const slug=body.nombre.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  if(!slug) return Response.json({error:'Introduce un nombre válido.'},{status:400});
  if (await isDirectoryExcluded(env, body)) return Response.json({ error: 'Esta empresa ha solicitado la baja. No se permite publicarla ni contactarla.' }, { status: 409 });
  const id = crypto.randomUUID();
  const name = body.nombre.trim();
  await createDocument(env.DB, 'pending_consultores_asetemyt', id, {
    nombre: name,
    slug,
    tipo: body.tipo,
    descripcion: body.descripcion.trim(),
    especialidades: body.especialidades || [],
    servicios: body.servicios || [],
    ubicacion: body.ubicacion || {},
    contacto: body.contacto || {},
    logo: body.logo || '',
    lang: body.lang === 'en' ? 'en' : 'es',
    verificado: false,
    status: 'pending',
    ip,
    createdAt: new Date().toISOString(),
  });
  if (body.tipo === 'empresa') await notifyNewCompany(env.RESEND_API_KEY, id, name);
  return Response.json({success:true},{status:201});
 }catch(error){console.error('Listing submission failed',error);return Response.json({error:'No se pudo guardar la solicitud. Reinténtalo.'},{status:500});}
};
