// Coupon system for ASETEMYT
// Collection: cupones_asetemyt
//
// Types:
//   free       — Free verification (skip Stripe entirely)
//   discount   — Percentage discount (e.g., 25 = 25% off)
//   trial      — Free months (e.g., 3 = first 3 months free, then full price)
//
// Fields:
//   code: string (uppercase, unique — e.g., "BIENVENIDO25")
//   type: 'free' | 'discount' | 'trial'
//   value: number (percentage for discount, months for trial, 0 for free)
//   maxUses: number (0 = unlimited)
//   usedCount: number
//   expiresAt: string (ISO) or null
//   activo: boolean
//   descripcion: string (internal note)
//   createdAt: string (ISO)
//   createdBy: string (admin email)

import { firestoreQuery, firestoreGet, firestoreUpdate } from './firestore-rest';

export interface Coupon {
  code: string;
  type: 'free' | 'discount' | 'trial';
  value: number;
  maxUses: number;
  usedCount: number;
  expiresAt: string | null;
  activo: boolean;
  descripcion: string;
  createdAt: string;
  createdBy: string;
}

export async function validateCoupon(env: any, code: string): Promise<{ valid: boolean; coupon?: Coupon; error?: string }> {
  if (!code) return { valid: false, error: 'Introduce un código de cupón' };

  const normalizedCode = code.toUpperCase().trim();
  
  // Query by code field
  const results = await firestoreQuery(env, 'cupones_asetemyt', 'code', 'EQUAL', { stringValue: normalizedCode });
  
  if (!results || results.length === 0) {
    return { valid: false, error: 'Cupón no encontrado' };
  }

  // Parse the first result
  const doc = results[0];
  const fields = doc.fields || {};
  const coupon: Coupon = {
    code: fields.code?.stringValue || '',
    type: fields.type?.stringValue as Coupon['type'] || 'free',
    value: Number(fields.value?.integerValue || fields.value?.doubleValue || 0),
    maxUses: Number(fields.maxUses?.integerValue || 0),
    usedCount: Number(fields.usedCount?.integerValue || 0),
    expiresAt: fields.expiresAt?.stringValue || null,
    activo: fields.activo?.booleanValue ?? true,
    descripcion: fields.descripcion?.stringValue || '',
    createdAt: fields.createdAt?.stringValue || '',
    createdBy: fields.createdBy?.stringValue || '',
  };

  if (!coupon.activo) {
    return { valid: false, error: 'Este cupón ya no está activo' };
  }

  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
    return { valid: false, error: 'Este cupón ha caducado' };
  }

  if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) {
    return { valid: false, error: 'Este cupón ha alcanzado el límite de usos' };
  }

  return { valid: true, coupon };
}

export async function incrementCouponUsage(env: any, code: string): Promise<void> {
  const normalizedCode = code.toUpperCase().trim();
  const results = await firestoreQuery(env, 'cupones_asetemyt', 'code', 'EQUAL', { stringValue: normalizedCode });
  if (results && results.length > 0) {
    const docName = results[0].name;
    const docId = docName?.split('/').pop();
    if (docId) {
      const current = results[0].fields?.usedCount?.integerValue || '0';
      await firestoreUpdate(env, 'cupones_asetemyt', docId, {
        usedCount: { integerValue: String(Number(current) + 1) },
      });
    }
  }
}
