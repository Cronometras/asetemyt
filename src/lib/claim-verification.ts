import { PaymentError, type PaymentTransaction } from './payment-store';
import { getStripe } from './stripe-server';
export const VERIFICATIONS = 'ficha_verifications';
export const RESERVATIONS = 'ficha_payment_reservations';
export async function activeReservation(tx: PaymentTransaction, env: any, slug: string) {
  const reservation = await tx.get(RESERVATIONS, slug);
  if (!reservation || reservation.failed) return null;
  if (reservation.expiresAt > Date.now() || reservation.pending) return reservation;
  // An asynchronous payment can still complete after the Checkout URL expires.
  // Confirm expiration with Stripe before allowing a second customer/payment.
  if (!reservation.checkoutId) throw new PaymentError(409, 'Hay un pago pendiente de comprobar. Contacta con info@asetemyt.com.');
  const session = await getStripe(env.STRIPE_SECRET_KEY).checkout.sessions.retrieve(reservation.checkoutId);
  return session.status === 'expired' ? null : reservation;
}
const SHARED_DOMAINS = new Set(['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'protonmail.com',
  'proton.me', 'icloud.com', 'mail.com', 'live.com', 'aol.com', 'zoho.com', 'yandex.com', 'tutanota.com',
  'gmail.es', 'hotmail.es', 'yahoo.es', 'linkedin.com', 'facebook.com', 'instagram.com', 'wordpress.com',
  'wixsite.com', 'google.com', 'github.io', 'blogspot.com']);
export const normalizedEmail = (value: unknown) => typeof value === 'string' ? value.trim().toLowerCase() : '';
export async function digest(value: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map(v => v.toString(16).padStart(2, '0')).join('');
}
export const verificationId = (uid: string, slug: string) => digest(JSON.stringify([uid, slug]));
export function ownsListingEmail(listing: any, email: string): boolean {
  const published = normalizedEmail(listing.contacto?.email);
  if (published && email === published) return true;
  const domain = email.split('@')[1];
  if (!domain || [...SHARED_DOMAINS].some(d => domain === d || domain.endsWith('.' + d))) return false;
  if (published.split('@')[1] === domain) return true;
  try {
    const web = listing.contacto?.web || '';
    const hostname = new URL(/^https?:\/\//i.test(web) ? web : `https://${web}`).hostname.replace(/^www\./, '');
    return hostname === domain;
  } catch { return false; }
}
export function requireAvailableListing(listing: any, uid: string) {
  if (!listing) throw new PaymentError(404, 'Ficha no encontrada.');
  if (listing.verificado || (listing.ownerUid && listing.ownerUid !== uid)) {
    throw new PaymentError(409, 'Esta ficha ya tiene propietario o está verificada.');
  }
  if (listing.stripeSubscriptionId && !['canceled', 'incomplete_expired'].includes(listing.subscriptionStatus)) {
    throw new PaymentError(409, 'Esta ficha ya tiene una suscripción. Gestiona el pago desde Mi cuenta.');
  }
}
export async function claimListing(tx: PaymentTransaction, collection: string, id: string, proof: any, extra: any = {}) {
  const listing = await tx.get(collection, id);
  if (!listing || (listing.ownerUid && listing.ownerUid !== proof.uid)) {
    throw new PaymentError(409, 'La ficha tiene otro propietario. Contacta con soporte.');
  }
  await tx.put(collection, id, { ...listing, ...extra, verificado: true, ownerUid: proof.uid,
    ownerEmail: proof.email, verifiedAt: new Date().toISOString() });
  const user = await tx.get('users_asetemyt', proof.uid) || { uid: proof.uid, email: proof.email, createdAt: new Date().toISOString() };
  await tx.put('users_asetemyt', proof.uid, { ...user,
    ...(extra.stripeCustomerId ? { stripeCustomerId: extra.stripeCustomerId } : {}),
    fichasReclamadas: [...new Set([...(user.fichasReclamadas || []), proof.slug])] });
  const claimId = `${proof.slug}_${proof.uid}`;
  const claim = await tx.get('claims_asetemyt', claimId) || {};
  await tx.put('claims_asetemyt', claimId, { ...claim, slug: proof.slug, uid: proof.uid, email: proof.email,
    nombre: proof.nombre || claim.nombre || '', mensaje: proof.mensaje || claim.mensaje || '',
    estado: 'approved', reviewedAt: new Date().toISOString() });
}
function activeReservations(coupon: any) {
  return Object.fromEntries(Object.entries(coupon.reservations || {}).filter(([, expires]) => Number(expires) > Date.now()));
}
export async function holdCoupon(tx: PaymentTransaction, expected: any, nonce: string, expiresAt: number) {
  const coupon = await tx.get('cupones_asetemyt', expected.id);
  if (!coupon || coupon.activo === false || coupon.type !== expected.type || coupon.value !== expected.value ||
      (coupon.expiresAt && Date.parse(coupon.expiresAt) <= Date.now())) throw new PaymentError(409, 'El cupón ha cambiado o ya no está disponible.');
  const reservations = activeReservations(coupon);
  if (coupon.maxUses > 0 && Number(coupon.usedCount || 0) + Object.keys(reservations).length >= coupon.maxUses) {
    throw new PaymentError(409, 'El cupón ya no tiene usos disponibles.');
  }
  await tx.put('cupones_asetemyt', expected.id, { ...coupon, reservations: { ...reservations, [nonce]: expiresAt } });
}
export async function redeemCoupon(tx: PaymentTransaction, couponId: string, enforceLimit = false, nonce?: string) {
  const coupon = await tx.get('cupones_asetemyt', couponId);
  if (!coupon) throw new PaymentError(409, 'Cupón no encontrado.');
  if (enforceLimit && (coupon.activo === false || (coupon.expiresAt && Date.parse(coupon.expiresAt) <= Date.now()) ||
      coupon.type !== 'free' ||
      (coupon.maxUses > 0 && Number(coupon.usedCount || 0) + Object.keys(activeReservations(coupon)).length >= coupon.maxUses))) {
    throw new PaymentError(409, 'El cupón ya no está disponible.');
  }
  const reservations = activeReservations(coupon);
  if (nonce) delete reservations[nonce];
  await tx.put('cupones_asetemyt', couponId, { ...coupon, reservations, usedCount: Number(coupon.usedCount || 0) + 1 });
}
