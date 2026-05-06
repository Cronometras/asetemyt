// POST /api/newsletter/subscribe — Subscribe to newsletter with Stripe checkout
import type { APIRoute } from 'astro';
import { getStripe } from '../../../lib/stripe-server';
import { validateCoupon, incrementCouponUsage } from '../../../lib/coupons';
import { firestoreQuery, firestoreCreate } from '../../../lib/firestore-rest';

export const POST: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env || {};

  try {
    const body = await request.json();
    const { email, company, couponCode } = body;

    if (!email?.trim()) {
      return new Response(JSON.stringify({ error: 'Email obligatorio.' }), { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if already subscribed
    const existing = await firestoreQuery(env, 'newsletter_subscribers', 'email', 'EQUAL', { stringValue: normalizedEmail });
    if (existing.length > 0 && existing[0].status === 'active') {
      return new Response(JSON.stringify({ error: 'Ya estás suscrito al newsletter.' }), { status: 409 });
    }

    // Validate coupon if provided
    let couponData: any = null;
    if (couponCode) {
      const couponResult = await validateCoupon(env, couponCode);
      if (couponResult.valid) {
        couponData = couponResult.coupon;
      }
    }

    // If coupon is "free", skip Stripe entirely
    if (couponData?.type === 'free') {
      await firestoreCreate(env, 'newsletter_subscribers', normalizedEmail, {
        email: { stringValue: normalizedEmail },
        company: { stringValue: (company || '').trim() },
        status: { stringValue: 'active' },
        plan: { stringValue: 'annual' },
        couponUsed: { stringValue: couponData.code },
        subscribedAt: { timestampValue: new Date().toISOString() },
        expiresAt: { timestampValue: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() },
      });

      await incrementCouponUsage(env, couponData.code);

      return new Response(JSON.stringify({
        success: true,
        free: true,
        message: 'Suscripción activada con cupón gratuito.',
      }), { status: 200 });
    }

    // Create Stripe checkout session
    const stripe = getStripe(env.STRIPE_SECRET_KEY);
    const origin = new URL(request.url).origin;

    let discountAmount = 0;
    if (couponData?.type === 'discount') {
      discountAmount = couponData.value;
    }

    const lineItem: any = {
      price_data: {
        currency: 'eur',
        product_data: {
          name: 'Newsletter ASETEMYT — Suscripción Anual',
          description: 'Reporte mensual de nuevo software especializado en cronometraje industrial e ingeniería de métodos.',
        },
        unit_amount: discountAmount > 0 ? Math.round(5000 * (1 - discountAmount / 100)) : 5000,
        recurring: { interval: 'year' },
      },
      quantity: 1,
    };

    const sessionParams: any = {
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: normalizedEmail,
      metadata: {
        type: 'newsletter',
        email: normalizedEmail,
        company: (company || '').trim(),
        couponCode: couponCode || '',
      },
      line_items: [lineItem],
      automatic_tax: { enabled: true },
      success_url: `${origin}/newsletter?success=1`,
      cancel_url: `${origin}/newsletter?canceled=1`,
    };

    // If trial coupon, add trial period
    if (couponData?.type === 'trial') {
      sessionParams.subscription_data = {
        trial_period_days: couponData.value * 30,
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return new Response(JSON.stringify({ url: session.url }), { status: 200 });
  } catch (err: any) {
    console.error('Newsletter subscribe error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Error interno.' }), { status: 500 });
  }
};
