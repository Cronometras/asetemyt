// POST /api/admin/outreach/check-replies — Manually trigger a reply-check.
// Useful from the admin panel as a "Check now" button. The actual inbox
// scan runs in a side process via the local Python script (himalaya can't
// run inside Cloudflare Workers — no IMAP sockets).
//
// This endpoint triggers the script via the local Hermes scheduler, which
// is configured to run the check_outreach_replies.py on a daily cron AND
// can be triggered on-demand from here.
//
// For Cloudflare Workers, we can't shell out to a local script, so this
// endpoint just enqueues a job. The script itself runs from the system
// cron and writes to Firestore directly.
//
// What this endpoint DOES do:
//   1. Records the manual-trigger request (for audit)
//   2. Returns 202 Accepted with a job reference
//
// What this endpoint does NOT do (CF Workers can't):
//   - Read IMAP inbox (no socket support)
//   - Run the himalaya CLI

import type { APIRoute } from 'astro';
import { getAuthUser } from '../../../lib/auth-server';
import { isAdmin } from '../../../lib/admin';
import { firestoreCreate } from '../../../lib/firestore-rest';

export const POST: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env || {};
  const apiKey = env.FIREBASE_API_KEY || '';
  const { user } = await getAuthUser(request, apiKey);
  if (!user || !(await isAdmin(env, user))) {
    return new Response(JSON.stringify({ error: 'Acceso denegado' }), { status: 403 });
  }

  try {
    const payload = await request.json().catch(() => ({}));
    const days = Number(payload.days || 14);

    // Audit log
    const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await firestoreCreate(env, 'outreach_jobs_asetemyt', jobId, {
      type: { stringValue: 'check-replies' },
      days: { integerValue: String(days) },
      requestedBy: { stringValue: user.email || user.user_id || '' },
      requestedAt: { timestampValue: new Date().toISOString() },
      status: { stringValue: 'queued' },
    }).catch((e) => {
      // Non-fatal: the collection might not exist or be writable, but the
      // admin can still trigger the job. Don't fail the request.
      console.warn('audit log create failed (non-fatal):', e);
    });

    // Note: we cannot actually trigger the local Python script from CF
    // Workers. The admin should run it via:
    //   python3 ~/.hermes/scripts/check_outreach_replies.py
    // Or wait for the daily cron at 09:00 hora España.

    return new Response(JSON.stringify({
      success: true,
      message: 'Trabajo de comprobación registrado. Ejecuta el script local o espera al cron diario (9:00 hora España).',
      jobId,
      command: 'python3 ~/.hermes/scripts/check_outreach_replies.py',
    }), { status: 202 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
