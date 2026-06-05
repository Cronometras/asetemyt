// POST /api/admin/outreach/send — Send a previously-created draft outreach
// via Resend. One send per request (NO batch — each outreach is personalized
// and must be reviewed individually before sending).
//
// Body: { outreachId, subject?, body? }
//   If subject/body are provided, they REPLACE the draft values (the
//   agent/administrator has personalized the email before sending).
//   If omitted, the stored draft is sent as-is.
//
// Side effects on success:
//   1. Email sent via Resend (from noreply@asetemyt.com, reply-to info@asetemyt.com)
//   2. outreach doc updated: status=sent, sentAt=now, subject/body replaced
//   3. Ficha doc updated: outreachLastSentAt=now, outreachContactosTotales=+1
//   4. Admin notification email sent to info@asetemyt.com with copy
//
// Returns: { success, outreachId, fichaEmail, sentAt, messageId? }

import type { APIRoute } from 'astro';
import { getAuthUser } from '../../../lib/auth-server';
import { isAdmin } from '../../../lib/admin';
import {
  findListingBySlug,
  firestoreGet,
  firestoreUpdate,
} from '../../../lib/firestore-rest';

const OUTREACH_COLLECTION = 'outreach_asetemyt';

export const POST: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env || {};
  const apiKey = env.FIREBASE_API_KEY || '';
  const { user } = await getAuthUser(request, apiKey);
  if (!user || !(await isAdmin(env, user))) {
    return new Response(JSON.stringify({ error: 'Acceso denegado' }), { status: 403 });
  }

  try {
    const payload = await request.json();
    const { outreachId, subject: newSubject, body: newBody } = payload;

    if (!outreachId) {
      return new Response(JSON.stringify({ error: 'outreachId requerido' }), { status: 400 });
    }

    // 1. Load the outreach document
    const outreach = await firestoreGet(env, OUTREACH_COLLECTION, outreachId);
    if (!outreach) {
      return new Response(JSON.stringify({ error: `Outreach ${outreachId} no encontrado` }), { status: 404 });
    }
    if (outreach.status === 'sent') {
      return new Response(JSON.stringify({
        error: 'Este outreach ya fue enviado. No se reenvía automáticamente.',
        sentAt: outreach.sentAt,
      }), { status: 409 });
    }

    const slug: string = outreach.slug;
    const collection: string = outreach.collection;
    const fichaEmail: string = outreach.fichaEmail;
    const fichaNombre: string = outreach.fichaNombre || slug;

    // Use new values if provided, otherwise fall back to stored draft
    const subject = (newSubject || outreach.subject || '').trim();
    const body = (newBody || outreach.body || '').trim();

    if (!subject) {
      return new Response(JSON.stringify({ error: 'El subject no puede estar vacío' }), { status: 400 });
    }
    if (!body) {
      return new Response(JSON.stringify({ error: 'El body no puede estar vacío' }), { status: 400 });
    }
    if (!fichaEmail) {
      return new Response(JSON.stringify({ error: 'La ficha no tiene email configurado' }), { status: 400 });
    }

    // 2. Verify ficha still exists (sanity check)
    const found = await findListingBySlug(env, slug);
    if (!found) {
      return new Response(JSON.stringify({ error: `Ficha ${slug} ya no existe` }), { status: 404 });
    }

    // 3. Build the email HTML (very simple: plain text wrapped in <pre>)
    const htmlBody = `<!DOCTYPE html><html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;line-height:1.6;color:#1a2332;max-width:600px;margin:0 auto;padding:24px">
<div style="background:linear-gradient(135deg,#1e3a5f 0%,#2d5a87 100%);color:white;padding:24px;border-radius:12px 12px 0 0;text-align:center;margin:-24px -24px 24px -24px">
  <h1 style="margin:0;font-size:20px">ASETEMYT</h1>
  <p style="margin:4px 0 0;font-size:12px;opacity:0.8">Directorio de Cronometraje Industrial</p>
</div>
<div style="white-space:pre-wrap;font-size:15px">${escapeHtml(body)}</div>
<div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af;text-align:center">
  <p>ASETEMYT · <a href="https://asetemyt.com" style="color:#2563eb;text-decoration:none">asetemyt.com</a></p>
  <p style="margin-top:8px"><a href="https://asetemyt.com/directorio/${slug}" style="color:#6b7280;text-decoration:none">Ver ficha →</a></p>
</div>
</body></html>`;

    const textBody = body + `\n\n--\nASETEMYT · https://asetemyt.com\nVer ficha: https://asetemyt.com/directorio/${slug}\n`;

    // 4. Send via Resend
    const resendKey = env.RESEND_API_KEY;
    if (!resendKey) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY no configurada' }), { status: 500 });
    }

    const sentAt = new Date().toISOString();
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'ASETEMYT <noreply@asetemyt.com>',
        to: [fichaEmail],
        reply_to: 'info@asetemyt.com',
        subject,
        html: htmlBody,
        text: textBody,
        // Resend tags for tracking
        tags: [
          { name: 'category', value: 'outreach' },
          { name: 'slug', value: slug },
          { name: 'contacto_numero', value: String(outreach.contactoNumero || 1) },
        ],
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => 'unknown');
      console.error(`Resend error (${outreachId}): ${resp.status} ${errText}`);

      // Mark as failed
      await firestoreUpdate(env, OUTREACH_COLLECTION, outreachId, {
        status: { stringValue: 'failed' },
        failureReason: { stringValue: `HTTP ${resp.status}: ${errText.slice(0, 200)}` },
        failedAt: { timestampValue: sentAt },
      });

      return new Response(JSON.stringify({
        error: `Resend rechazó el envío (${resp.status})`,
        detail: errText.slice(0, 500),
      }), { status: 502 });
    }

    const resendData = await resp.json().catch(() => ({}));
    const messageId = resendData.id || null;

    // 5. Update outreach document
    await firestoreUpdate(env, OUTREACH_COLLECTION, outreachId, {
      subject: { stringValue: subject },
      body: { stringValue: body },
      sentAt: { timestampValue: sentAt },
      sentBy: { stringValue: user.email || user.user_id || '' },
      status: { stringValue: 'sent' },
      messageId: { stringValue: messageId || '' },
    });

    // 6. Update ficha: outreachLastSentAt + outreachContactosTotales
    const currentCount = Number(found.listing.outreachContactosTotales || 0);
    await firestoreUpdate(env, found.collection, found.listing.id, {
      outreachLastSentAt: { timestampValue: sentAt },
      outreachContactosTotales: { integerValue: String(currentCount + 1) },
    });

    // 7. Send a copy to info@asetemyt.com so you have a record in the inbox
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'ASETEMYT Outreach <noreply@asetemyt.com>',
          to: ['info@asetemyt.com'],
          reply_to: fichaEmail,
          subject: `[Copia outreach] → ${fichaEmail} | ${subject}`,
          html: `<div style="background:#f0f9ff;padding:8px 12px;font-size:12px;color:#1e3a5f;border-radius:6px;margin-bottom:16px"><strong>📋 Copia de outreach enviado</strong> a <a href="mailto:${fichaEmail}">${fichaEmail}</a> (${fichaNombre}) — contacto #${outreach.contactoNumero || 1}</div>${htmlBody}`,
          text: `[Copia outreach] → ${fichaEmail} | ${fichaNombre} | contacto #${outreach.contactoNumero || 1}\n\n${textBody}`,
          tags: [
            { name: 'category', value: 'outreach_copy' },
            { name: 'slug', value: slug },
          ],
        }),
      });
    } catch (e) {
      // Non-fatal: don't fail the whole send if the bcc copy fails
      console.warn('Outreach bcc copy failed (non-fatal):', e);
    }

    return new Response(JSON.stringify({
      success: true,
      outreachId,
      slug,
      fichaEmail,
      fichaNombre,
      contactoNumero: outreach.contactoNumero,
      subject,
      sentAt,
      messageId,
    }), { status: 200 });
  } catch (err: any) {
    console.error('Outreach send error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Error interno' }), { status: 500 });
  }
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
