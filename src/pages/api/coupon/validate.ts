// GET /api/coupon/validate?code=XXX — Validate a coupon code
// Returns coupon details if valid, error if not

import type { APIRoute } from 'astro';
import { validateCoupon } from '../../../lib/coupons';

export const GET: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env || {};
  const url = new URL(request.url);
  const code = url.searchParams.get('code') || '';

  if (!code) {
    return new Response(JSON.stringify({ valid: false, error: 'Introduce un código de cupón' }), { status: 400 });
  }

  const result = await validateCoupon(env, code);

  if (!result.valid) {
    return new Response(JSON.stringify({ valid: false, error: result.error }), { status: 400 });
  }

  const c = result.coupon!;
  let description = '';
  if (c.type === 'free') {
    description = 'Verificación gratuita — no necesitas pagar';
  } else if (c.type === 'discount') {
    description = `${c.value}% de descuento en la verificación anual`;
  } else if (c.type === 'trial') {
    description = `${c.value} ${c.value === 1 ? 'mes' : 'meses'} gratis, después €50/año + IVA`;
  }

  return new Response(JSON.stringify({
    valid: true,
    code: c.code,
    type: c.type,
    value: c.value,
    description,
  }), { status: 200 });
};
