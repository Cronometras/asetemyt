// /api/admin/coupons — CRUD for coupon management (admin only)
// GET    → List all coupons
// POST   → Create new coupon
// PATCH  → Update coupon (activate/deactivate, edit values)
// DELETE → Delete coupon

import type { APIRoute } from 'astro';
import { getAuthUser } from '../../../lib/auth-server';
import { isAdmin } from '../../../lib/admin';
import { firestoreQuery, firestoreCreate, firestoreUpdate, firestoreDelete } from '../../../lib/firestore-rest';

export const GET: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env || {};
  const apiKey = env.FIREBASE_API_KEY || '';
  const { user } = await getAuthUser(request, apiKey);
  if (!user || !(await isAdmin(env, user))) {
    return new Response(JSON.stringify({ error: 'Acceso denegado' }), { status: 403 });
  }

  try {
    const coupons = await firestoreQuery(env, 'cupones_asetemyt', 'createdAt', 'GREATER_THAN', { stringValue: '2020-01-01' });
    // firestoreQuery returns already-parsed objects with flat properties
    const parsed = coupons.map((c: any) => ({
      id: c.id,
      code: c.code || '',
      type: c.type || 'free',
      value: Number(c.value || 0),
      maxUses: Number(c.maxUses || 0),
      usedCount: Number(c.usedCount || 0),
      expiresAt: c.expiresAt || null,
      activo: c.activo ?? true,
      descripcion: c.descripcion || '',
      createdAt: c.createdAt || '',
      createdBy: c.createdBy || '',
    })).sort((a: any, b: any) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    return new Response(JSON.stringify({ coupons: parsed }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
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

    const normalizedCode = code.toUpperCase().trim();
    
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
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
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

    await firestoreUpdate(env, 'cupones_asetemyt', id, fields);
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
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

    await firestoreDelete(env, 'cupones_asetemyt', id);
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
