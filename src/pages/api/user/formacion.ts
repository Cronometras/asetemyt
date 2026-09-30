import type { APIRoute } from 'astro';
import { getAuthUser, authFailureResponse } from '../../../lib/auth-server';
import { findListingBySlug } from '../../../lib/firestore-rest';
import { paymentTransaction, PaymentError, paymentFailure } from '../../../lib/payment-store';
import { validTextForm } from '../../../lib/form-validation';
export const PATCH: APIRoute = async ({ request, locals }) => {
 const env = (locals as any).runtime?.env || {};
 const {user,error}=await getAuthUser(request,env.FIREBASE_API_KEY);
 if(!user) return authFailureResponse(error);
 try {
  const body=await request.json().catch(()=>null);
  if(!body || typeof body.slug!=='string' || !['edit','withdraw'].includes(body.action)) throw new PaymentError(400,'Datos no válidos.');
  if(body.action==='edit' && !validTextForm(body,{description:2000,courses:6000,methodology:3000,format:1000},['description','courses'])) throw new PaymentError(400,'Revisa la presentación y el índice de cursos.');
  const found=await findListingBySlug(env,body.slug);
  if(!found) throw new PaymentError(404,'Ficha no encontrada.');
  await paymentTransaction(env,async tx=>{
   const listing=await tx.get(found.collection,found.listing.id);
   if(listing?.ownerUid!==user.user_id) throw new PaymentError(403,'No eres el propietario de esta ficha.');
   if(body.action==='edit'&&!listing.verificado) throw new PaymentError(403,'Verifica tu ficha para publicar formación.');
   const previous=await tx.get('formaciones_asetemyt',body.slug);
   if(body.action==='withdraw'&&!previous) throw new PaymentError(404,'No hay formación publicada.');
   const updates=body.action==='edit'?Object.fromEntries(['description','courses','methodology','format'].map(key=>[key,(body[key]||'').trim()])):{};
   await tx.put('formaciones_asetemyt',body.slug,{...previous,...updates,slug:body.slug,title:'Formaciones que ofrecemos',status:body.action==='edit'?'pending':'archived',authorUid:user.user_id,createdAt:previous?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()});
  });
  return Response.json({success:true});
 }catch(error){return paymentFailure(error);}
};
