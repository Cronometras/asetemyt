import type { APIRoute } from 'astro';
import { getAuthUser, authFailureResponse } from '../../../lib/auth-server';
import { getStripe } from '../../../lib/stripe-server';
import { firestoreGet } from '../../../lib/firestore-rest';
import { paymentFailure, PaymentError } from '../../../lib/payment-store';

export const GET: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env || {};
  const { user, error } = await getAuthUser(request, env.FIREBASE_API_KEY);
  if (!user) return authFailureResponse(error);
  try {
    const id = new URL(request.url).searchParams.get('session_id');
    if (!id || !/^cs_[a-zA-Z0-9_]+$/.test(id)) throw new PaymentError(400, 'Sesión de pago no válida.');
    const session = await getStripe(env.STRIPE_SECRET_KEY).checkout.sessions.retrieve(id);
    if (session.metadata?.uid !== user.user_id) throw new PaymentError(403, 'Este pago no pertenece a tu cuenta.');
    const receipt = await firestoreGet(env, 'stripe_fulfillments', `checkout:${id}`);
    let status = session.status === 'expired' ? 'expired' : 'pending';
    if (receipt) {
      const proofId = session.metadata?.verificationId;
      if (!proofId) throw new PaymentError(409, 'Este pago necesita una revisión de soporte.');
      const proof = await firestoreGet(env, 'ficha_payment_intents', proofId);
      const listing = proof && await firestoreGet(env, proof.collection, proof.listingId);
      status = listing?.verificado && listing.ownerUid === user.user_id ? 'verified' : 'inactive';
    }
    return Response.json({ status }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return paymentFailure(error); }
};
