import type { APIRoute } from 'astro';
import { getAuthUser } from '../../../lib/auth-server';
import { isAdmin } from '../../../lib/admin';
import { firestoreListAll, firestoreCreate, toFirestoreValue, firestoreDelete } from '../../../lib/firestore-rest';
import { EXCLUSIONS, exclusionDomain, matchesExclusion, isSharedExclusionDomain } from '../../../lib/directory-exclusions';
import { invalidate, CACHE_KEYS } from '../../../lib/cache';
async function access(request: Request, locals: any) {
 const env = locals.runtime?.env || {}; const { user } = await getAuthUser(request, env.FIREBASE_API_KEY || '');
 return { env, user, allowed: !!user && await isAdmin(env, user) };
}
export const GET: APIRoute = async ({ request, locals }) => {
 const { env, allowed } = await access(request, locals);
 if (!allowed) return Response.json({error:'Acceso denegado'}, {status:403});
 try { return Response.json({items:await firestoreListAll(env,EXCLUSIONS)}, {headers:{'Cache-Control':'no-store'}}); }
 catch { return Response.json({error:'No se pudieron cargar las bajas.'},{status:503}); }
};
export const POST: APIRoute = async ({ request, locals }) => {
 const { env, user, allowed } = await access(request, locals);
 if (!allowed) return Response.json({error:'Acceso denegado'},{status:403});
 const body = await request.json().catch(()=>null);
 const domain = exclusionDomain(body?.domain);
 if (!body || typeof body.nombre !== 'string' || !body.nombre.trim() || body.nombre.length > 200 || !domain || !domain.includes('.') || typeof body.motivo !== 'string' || !body.motivo.trim() || body.motivo.length > 2000 || (body.slug !== undefined && (typeof body.slug !== 'string' || !/^[a-z0-9-]*$/.test(body.slug))) || (body.fuente !== undefined && (typeof body.fuente !== 'string' || body.fuente.length > 2000))) return Response.json({error:'Indica empresa, dominio válido y motivo.'},{status:400});
 if (isSharedExclusionDomain(domain)) return Response.json({error:'Usa el dominio propio de la empresa; no un proveedor compartido de correo o una red social.'},{status:400});
 try {
  // Persist the exclusion before any removal: retrying is safe and cannot erase the evidence.
  await firestoreCreate(env,EXCLUSIONS,domain,toFirestoreValue({domain,dominio:domain,nombre:body.nombre.trim(),slug:body.slug||'',motivo:body.motivo.trim(),fuente:body.fuente||'',createdAt:new Date().toISOString(),createdBy:user!.email,noContactar:true,noPublicar:true}).mapValue.fields);
  let removed=0;
  for (const collection of ['directorio_consultores_asetemyt','directorio_software_asetemyt','pending_consultores_asetemyt']) {
   const entries=await firestoreListAll(env,collection);
   for (const entry of entries) if(matchesExclusion(entry,{domain,slug:body.slug})) {await firestoreDelete(env,collection,entry.id);removed++;}
  }
  await invalidate(env,[CACHE_KEYS.directorioConsultores,CACHE_KEYS.directorioSoftware,'cache:admin:fichas:v1','cache:admin:stats:v1']);
  return Response.json({success:true,removed});
 } catch {return Response.json({error:'No se pudo completar la baja. Actualiza el listado y reintenta; el registro puede haberse guardado.'},{status:503});}
};
