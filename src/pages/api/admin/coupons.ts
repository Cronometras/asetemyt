// /api/admin/coupons — CRUD for coupon management (admin only)
// GET    → List all coupons
// POST   → Create new coupon
// PATCH  → Update coupon (activate/deactivate, edit values)
// DELETE → Delete coupon

import type { APIRoute } from 'astro';
import { paymentTransaction, PaymentError } from '../../../lib/payment-store';
import { getAuthUser } from '../../../lib/auth-server';
import { isAdmin } from '../../../lib/admin';
import { firestoreQuery, firestoreCreate, firestoreListAll, firestoreGet } from '../../../lib/firestore-rest';


export const GET: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env || {};
  const apiKey = env.FIREBASE_API_KEY || '';
  const { user } = await getAuthUser(request, apiKey);
  if (!user || !(await isAdmin(env, user))) {
    return new Response(JSON.stringify({ error: 'Acceso denegado' }), { status: 403 });
  }

  try {
    const detail = new URL(request.url).searchParams.get('id');
    if (detail) {
      const coupon = await firestoreGet(env, 'cupones_asetemyt', detail);
      if (!coupon) return Response.json({ error: 'Cupón no encontrado' }, { status: 404 });
      const [intents, verifications] = await Promise.all([
        firestoreListAll(env, 'ficha_payment_intents'), firestoreListAll(env, 'ficha_verifications'),
      ]);
      const records = [...intents, ...verifications.filter((p: any) => p.free === true)];
      const uses = records.filter((p: any) => p.fulfilled === true && (p.coupon?.id === detail || p.couponCode === coupon.code))
        .map((p: any) => ({ email: p.email || '', slug: p.slug || '', uid: p.uid || '', method: p.free ? 'Verificación gratuita' : 'Suscripción' }));
      return Response.json({ uses, usedCount: Number(coupon.usedCount || 0) }, { headers: { 'Cache-Control': 'no-store' } });
    }
    const raw = await firestoreListAll(env, 'cupones_asetemyt');
    const coupons = raw.map((c: any) => ({ id: c.id, code: c.code || '', type: c.type || 'free',
      value: Number(c.value || 0), maxUses: Number(c.maxUses || 0), usedCount: Number(c.usedCount || 0),
      expiresAt: c.expiresAt || null, activo: c.activo ?? true, descripcion: c.descripcion || '', createdAt: c.createdAt || ''
    })).sort((a: any, b: any) => b.createdAt.localeCompare(a.createdAt));
    return new Response(JSON.stringify({ coupons }), { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err instanceof PaymentError ? err.message : 'No se pudo completar la operación.' }), { status: err instanceof PaymentError ? err.status : 500 });
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env || {};
  const apiKey = env.FIREBASE_API_KEY || '';
  const { user } = await getAuthUser(request, apiKey);
  if (!user || !(await isAdmin(env, user))) {
    return new Response(JSON.stringify({ error: 'Acceso denegado' }), { status: 403 });
  }

  try {
    const body = await request.json();
    const { code, type, value, maxUses, expiresAt, descripcion } = body;

    if (!code || !type) {
      return new Response(JSON.stringify({ error: 'Código y tipo son obligatorios' }), { status: 400 });
    }

    const validTypes = ['free', 'discount', 'trial'];
    if (!validTypes.includes(type)) {
      return new Response(JSON.stringify({ error: 'Tipo inválido. Usa: free, discount, trial' }), { status: 400 });
    }

    if (typeof code !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(code.trim())) return Response.json({ error: 'Usa hasta 64 letras, números, guiones o guiones bajos.' }, { status: 400 });
    const normalizedCode = code.toUpperCase().trim();
    const invalid = validateValues({ type, value: value ?? 0, maxUses: maxUses ?? 0, expiresAt: expiresAt ?? null, descripcion: descripcion ?? '' });
    if (invalid) return Response.json({ error: invalid }, { status: 400 });
    
    // Check for duplicate code
    const existing = await firestoreQuery(env, 'cupones_asetemyt', 'code', 'EQUAL', { stringValue: normalizedCode });
    if (existing && existing.length > 0) {
      return new Response(JSON.stringify({ error: 'Ya existe un cupón con ese código' }), { status: 409 });
    }

    const docId = normalizedCode;
    const ok = await firestoreCreate(env, 'cupones_asetemyt', docId, {
      code: { stringValue: normalizedCode },
      type: { stringValue: type },
      value: { integerValue: String(Number(value || 0)) },
      maxUses: { integerValue: String(Number(maxUses || 0)) },
      usedCount: { integerValue: '0' },
      expiresAt: expiresAt ? { stringValue: expiresAt } : { nullValue: null },
      activo: { booleanValue: true },
      descripcion: { stringValue: descripcion || '' },
      createdAt: { timestampValue: new Date().toISOString() },
      createdBy: { stringValue: user.email || '' },
    });

    if (!ok) {
      return new Response(JSON.stringify({ error: 'Error creando cupón' }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true, code: normalizedCode }), { status: 201 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err instanceof PaymentError ? err.message : 'No se pudo completar la operación.' }), { status: err instanceof PaymentError ? err.status : 500 });
  }
};

export const PATCH: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env || {};
  const apiKey = env.FIREBASE_API_KEY || '';
  const { user } = await getAuthUser(request, apiKey);
  if (!user || !(await isAdmin(env, user))) {
    return new Response(JSON.stringify({ error: 'Acceso denegado' }), { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return new Response(JSON.stringify({ error: 'ID del cupón requerido' }), { status: 400 });
    }

    if (typeof id !== 'string') return Response.json({ error: 'ID inválido' }, { status: 400 });
    const current = await firestoreGet(env, 'cupones_asetemyt', id);
    if (!current) return Response.json({ error: 'Cupón no encontrado' }, { status: 404 });
    const invalid = validateValues({ ...current, ...updates, type: current.type });
    if (invalid) return Response.json({ error: invalid }, { status: 400 });
    // Build Firestore update fields
    const fields: Record<string, any> = {};
    if (updates.activo !== undefined) fields.activo = { booleanValue: updates.activo };
    if (updates.maxUses !== undefined) fields.maxUses = { integerValue: String(Number(updates.maxUses)) };
    if (updates.descripcion !== undefined) fields.descripcion = { stringValue: updates.descripcion };
    if (updates.value !== undefined) fields.value = { integerValue: String(Number(updates.value)) };
    if (updates.expiresAt !== undefined) fields.expiresAt = updates.expiresAt ? { stringValue: updates.expiresAt } : { nullValue: null };

    if (Object.keys(fields).length === 0) {
      return new Response(JSON.stringify({ error: 'Nada que actualizar' }), { status: 400 });
    }

    await paymentTransaction(env, async tx => {
      const latest = await tx.get('cupones_asetemyt', id);
      if (!latest) throw new PaymentError(404, 'Cupón no encontrado');
      const patch = Object.fromEntries(Object.entries(fields).map(([key, field]: [string, any]) => [key, field.booleanValue ?? field.stringValue ?? (field.integerValue !== undefined ? Number(field.integerValue) : null)]));
      const invalid = validateValues({ ...latest, ...patch });
      if (invalid) throw new PaymentError(400, invalid);
      await tx.put('cupones_asetemyt', id, { ...latest, ...patch });
    });
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err instanceof PaymentError ? err.message : 'No se pudo completar la operación.' }), { status: err instanceof PaymentError ? err.status : 500 });
  }
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env || {};
  const apiKey = env.FIREBASE_API_KEY || '';
  const { user } = await getAuthUser(request, apiKey);
  if (!user || !(await isAdmin(env, user))) {
    return new Response(JSON.stringify({ error: 'Acceso denegado' }), { status: 403 });
  }

  try {
    const { id } = await request.json();
    if (!id) {
      return new Response(JSON.stringify({ error: 'ID del cupón requerido' }), { status: 400 });
    }

    const current = typeof id === 'string' ? await firestoreGet(env, 'cupones_asetemyt', id) : null;
    if (!current) return Response.json({ error: 'Cupón no encontrado' }, { status: 404 });
    if (Number(current.usedCount || 0) > 0 || Object.values(current.reservations || {}).some((expiry: any) => Number(expiry) > Date.now())) return Response.json({ error: 'Este cupón tiene usos o pagos pendientes. Desactívalo para conservar el historial.' }, { status: 409 });
    if (!env.DB) throw new PaymentError(503, 'Base de datos no disponible');
    const row = await env.DB.prepare('SELECT data FROM app_documents WHERE collection = ? AND id = ?').bind('cupones_asetemyt', id).first();
    if (!row) throw new PaymentError(404, 'Cupón no encontrado');
    const latest = JSON.parse(row.data);
    if (Number(latest.usedCount || 0) > 0 || Object.values(latest.reservations || {}).some((expiry: any) => Number(expiry) > Date.now())) throw new PaymentError(409, 'El cupón tiene usos o pagos pendientes. Desactívalo.');
    const result = await env.DB.prepare('DELETE FROM app_documents WHERE collection = ? AND id = ? AND data = ?').bind('cupones_asetemyt', id, row.data).run();
    if (!result.meta?.changes) throw new PaymentError(409, 'El cupón cambió durante la operación. Actualiza el listado.');
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err instanceof PaymentError ? err.message : 'No se pudo completar la operación.' }), { status: err instanceof PaymentError ? err.status : 500 });
  }
};

function validateValues(c: any): string | null {
  if (!Number.isInteger(c.maxUses) || c.maxUses < 0) return 'El límite debe ser un entero positivo o 0 para usos ilimitados.';
  if (!Number.isInteger(c.value) || (c.type === 'discount' && (c.value < 1 || c.value > 100)) || (c.type === 'trial' && (c.value < 1 || c.value > 24)) || (c.type === 'free' && c.value !== 0)) return 'Indica un porcentaje de 1 a 100, de 1 a 24 meses o 0 para verificación gratuita.';
  if (c.expiresAt !== null && c.expiresAt !== undefined && (typeof c.expiresAt !== 'string' || !Number.isFinite(Date.parse(c.expiresAt)))) return 'Fecha de caducidad inválida.';
  if (typeof c.descripcion !== 'string' || c.descripcion.length > 1000) return 'La nota admite hasta 1.000 caracteres.';
  if (c.activo !== undefined && typeof c.activo !== 'boolean') return 'Estado inválido.';
  return null;
}
