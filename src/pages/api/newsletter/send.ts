// POST /api/newsletter/send — Send monthly newsletter to all active subscribers
// Protected by CRON_SECRET header (called from cron job)
import type { APIRoute } from 'astro';
import { firestoreQuery, firestoreUpdate } from '../../../lib/firestore-rest';

export const POST: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env || {};

  // Verify cron secret
  const cronSecret = env.CRON_SECRET || '';
  const authHeader = request.headers.get('authorization') || '';
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: 'No autorizado.' }), { status: 401 });
  }

  try {
    // 1. Get all active subscribers
    const subscribers = await firestoreQuery(env, 'newsletter_subscribers', 'status', 'EQUAL', { stringValue: 'active' });

    if (subscribers.length === 0) {
      return new Response(JSON.stringify({ message: 'No hay suscriptores activos.', sent: 0 }), { status: 200 });
    }

    // 2. Get new software entries from the last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const allSoftware = await firestoreQuery(env, 'directorio_software_asetemyt', 'createdAt', 'GREATER_THAN', { timestampValue: thirtyDaysAgo });

    // Also get recently updated entries
    const recentSoftware = allSoftware.filter((s: any) => {
      const created = new Date(s.createdAt || 0);
      return created > new Date(thirtyDaysAgo);
    });

    // 3. Generate newsletter HTML
    const monthName = new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

    const softwareCards = recentSoftware.length > 0
      ? recentSoftware.map((s: any) => `
        <tr>
          <td style="padding: 16px 0; border-bottom: 1px solid #e5e7eb;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td style="padding-bottom: 8px;">
                  <a href="https://asetemyt.com/directorio/${s.slug || ''}" style="color: #1e3a5f; font-size: 18px; font-weight: 700; text-decoration: none;">
                    ${s.nombre || 'Sin nombre'}
                  </a>
                  ${s.verificado ? ' <span style="background: #dcfce7; color: #166534; font-size: 11px; padding: 2px 8px; border-radius: 10px; font-weight: 600;">✓ Verificado</span>' : ''}
                </td>
              </tr>
              <tr>
                <td style="color: #6b7280; font-size: 14px; line-height: 1.5; padding-bottom: 8px;">
                  ${s.descripcion ? s.descripcion.substring(0, 200) + (s.descripcion.length > 200 ? '...' : '') : 'Sin descripción.'}
                </td>
              </tr>
              <tr>
                <td>
                  ${(s.especialidades || []).map((esp: string) => `<span style="display: inline-block; background: #f3f4f6; color: #374151; font-size: 12px; padding: 3px 10px; border-radius: 12px; margin-right: 6px; margin-bottom: 4px;">${esp}</span>`).join('')}
                </td>
              </tr>
              ${s.contacto?.web ? `
              <tr>
                <td style="padding-top: 8px;">
                  <a href="${s.contacto.web.startsWith('http') ? s.contacto.web : 'https://' + s.contacto.web}" style="color: #2563eb; font-size: 13px; text-decoration: none;">🌐 Visitar web →</a>
                </td>
              </tr>` : ''}
            </table>
          </td>
        </tr>
      `).join('')
      : `<tr><td style="padding: 24px 0; color: #9ca3af; text-align: center; font-size: 14px;">Este mes no se han añadido nuevos programas al directorio.</td></tr>`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f9fafb;">
    <tr><td align="center" style="padding: 32px 16px;">
      <table cellpadding="0" cellspacing="0" border="0" width="600" style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">

        <!-- Header -->
        <tr>
          <td style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 32px 40px; text-align: center;">
            <div style="display: inline-block; width: 48px; height: 48px; background: #e8a838; border-radius: 10px; line-height: 48px; text-align: center; margin-bottom: 12px;">
              <span style="color: white; font-size: 24px; font-weight: 800;">A</span>
            </div>
            <h1 style="color: white; font-size: 24px; font-weight: 800; margin: 0 0 4px;">ASETEMYT</h1>
            <p style="color: rgba(255,255,255,0.6); font-size: 12px; margin: 0; letter-spacing: 1px;">Directorio de Cronometraje Industrial</p>
          </td>
        </tr>

        <!-- Month header -->
        <tr>
          <td style="padding: 32px 40px 16px;">
            <h2 style="color: #1e3a5f; font-size: 22px; font-weight: 800; margin: 0 0 8px;">
              📊 Reporte mensual — ${monthName}
            </h2>
            <p style="color: #6b7280; font-size: 15px; margin: 0; line-height: 1.5;">
              Nuevo software especializado incorporado al directorio ASETEMYT este mes.
            </p>
          </td>
        </tr>

        <!-- Stats -->
        <tr>
          <td style="padding: 0 40px 24px;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td style="background: #f0f9ff; border-radius: 8px; padding: 16px; text-align: center; width: 33%;">
                  <p style="color: #2563eb; font-size: 28px; font-weight: 800; margin: 0;">${recentSoftware.length}</p>
                  <p style="color: #6b7280; font-size: 12px; margin: 4px 0 0;">Nuevos este mes</p>
                </td>
                <td width="16"></td>
                <td style="background: #f0fdf4; border-radius: 8px; padding: 16px; text-align: center; width: 33%;">
                  <p style="color: #16a34a; font-size: 28px; font-weight: 800; margin: 0;">${allSoftware.length}</p>
                  <p style="color: #6b7280; font-size: 12px; margin: 4px 0 0;">Total directorio</p>
                </td>
                <td width="16"></td>
                <td style="background: #fef3c7; border-radius: 8px; padding: 16px; text-align: center; width: 33%;">
                  <p style="color: #d97706; font-size: 28px; font-weight: 800; margin: 0;">${subscribers.length}</p>
                  <p style="color: #6b7280; font-size: 12px; margin: 4px 0 0;">Suscriptores</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- New software -->
        <tr>
          <td style="padding: 0 40px 24px;">
            <h3 style="color: #1e3a5f; font-size: 18px; font-weight: 700; margin: 0 0 16px; padding-bottom: 12px; border-bottom: 2px solid #e8a838;">
              🆕 Nuevo software incorporado
            </h3>
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              ${softwareCards}
            </table>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="padding: 0 40px 32px; text-align: center;">
            <a href="https://asetemyt.com/software" style="display: inline-block; background: #e8a838; color: white; font-weight: 700; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 15px;">
              Ver directorio completo →
            </a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background: #f9fafb; padding: 24px 40px; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0; text-align: center;">
              Recibes este email porque estás suscrito al newsletter de ASETEMYT.<br>
              <a href="https://asetemyt.com/newsletter" style="color: #6b7280;">Gestionar suscripción</a> ·
              <a href="https://asetemyt.com" style="color: #6b7280;">asetemyt.com</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

    // 4. Send to all subscribers via Resend
    const resendKey = env.RESEND_API_KEY || '';
    if (!resendKey) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY no configurado.' }), { status: 500 });
    }

    let sent = 0;
    let errors = 0;

    for (const sub of subscribers) {
      try {
        const resp = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'ASETEMYT Newsletter <newsletter@asetemyt.com>',
            to: [sub.email],
            subject: `📊 ASETEMYT — Reporte mensual ${monthName}`,
            html: htmlContent,
          }),
        });

        if (resp.ok) {
          sent++;
        } else {
          const errData = await resp.text();
          console.error(`Error sending to ${sub.email}:`, errData);
          errors++;
        }
      } catch (err) {
        console.error(`Error sending to ${sub.email}:`, err);
        errors++;
      }
    }

    // 5. Log the send
    try {
      const { firestoreCreate: create } = await import('../../../lib/firestore-rest');
      await create(env, 'newsletter_logs', `${Date.now()}`, {
        sentAt: { timestampValue: new Date().toISOString() },
        totalSubscribers: { integerValue: String(subscribers.length) },
        emailsSent: { integerValue: String(sent) },
        errors: { integerValue: String(errors) },
        newSoftware: { integerValue: String(recentSoftware.length) },
        month: { stringValue: monthName },
      });
    } catch {}

    return new Response(JSON.stringify({
      success: true,
      sent,
      errors,
      totalSubscribers: subscribers.length,
      newSoftware: recentSoftware.length,
    }), { status: 200 });
  } catch (err: any) {
    console.error('Newsletter send error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Error interno.' }), { status: 500 });
  }
};
