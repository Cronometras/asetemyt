// GET /api/newsletter/preview — Generate newsletter HTML for admin preview (no send)
import type { APIRoute } from 'astro';
import { getAuthUser } from '../../../lib/auth-server';
import { isAdmin } from '../../../lib/admin';
import { firestoreQuery } from '../../../lib/firestore-rest';

export const GET: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env || {};
  const apiKey = env.FIREBASE_API_KEY || '';
  const { user } = await getAuthUser(request, apiKey);
  if (!user || !(await isAdmin(env, user))) {
    return new Response(JSON.stringify({ error: 'Acceso denegado' }), { status: 403 });
  }

  try {
    // Get new software entries from the last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const allSoftware = await firestoreQuery(env, 'directorio_software_asetemyt', 'createdAt', 'GREATER_THAN', { timestampValue: thirtyDaysAgo });

    const recentSoftware = allSoftware.filter((s: any) => {
      const created = new Date(s.createdAt || 0);
      return created > new Date(thirtyDaysAgo);
    });

    // Also get new consultores
    const recentConsultores = await firestoreQuery(env, 'directorio_consultores_asetemyt', 'createdAt', 'GREATER_THAN', { timestampValue: thirtyDaysAgo });

    // Get subscriber count
    const subscribers = await firestoreQuery(env, 'newsletter_subscribers', 'status', 'EQUAL', { stringValue: 'active' });

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
            </table>
          </td>
        </tr>
      `).join('')
      : '<tr><td style="padding: 24px 0; color: #9ca3af; text-align: center; font-size: 14px;">Este mes no se han añadido nuevos programas al directorio.</td></tr>';

    const consultoresCards = recentConsultores.length > 0
      ? recentConsultores.map((c: any) => `
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
            <a href="https://asetemyt.com/directorio/${c.slug || ''}" style="color: #1e3a5f; font-size: 16px; font-weight: 600; text-decoration: none;">${c.nombre || 'Sin nombre'}</a>
            <span style="color: #9ca3af; font-size: 13px; margin-left: 8px;">${c.tipo || ''}</span>
            ${c.ubicacion?.ciudad ? `<span style="color: #9ca3af; font-size: 13px; margin-left: 8px;">📍 ${c.ubicacion.ciudad}</span>` : ''}
          </td>
        </tr>
      `).join('')
      : '';

    const htmlContent = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f9fafb;">
    <tr><td align="center" style="padding: 32px 16px;">
      <table cellpadding="0" cellspacing="0" border="0" width="600" style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">

        <!-- Header -->
        <tr><td style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 32px; text-align: center;">
          <h1 style="color: white; font-size: 24px; margin: 0 0 8px 0;">ASETEMYT</h1>
          <p style="color: #93c5fd; font-size: 14px; margin: 0;">Newsletter — ${monthName}</p>
        </td></tr>

        <!-- Stats -->
        <tr><td style="padding: 24px 32px; background: #f0f9ff; border-bottom: 1px solid #e0e7ff;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td style="text-align: center; padding: 8px;">
                <p style="font-size: 28px; font-weight: 800; color: #1e3a5f; margin: 0;">${recentSoftware.length}</p>
                <p style="font-size: 12px; color: #6b7280; margin: 4px 0 0 0;">Nuevo software</p>
              </td>
              <td style="text-align: center; padding: 8px;">
                <p style="font-size: 28px; font-weight: 800; color: #1e3a5f; margin: 0;">${recentConsultores.length}</p>
                <p style="font-size: 12px; color: #6b7280; margin: 4px 0 0 0;">Nuevos profesionales</p>
              </td>
              <td style="text-align: center; padding: 8px;">
                <p style="font-size: 28px; font-weight: 800; color: #1e3a5f; margin: 0;">${subscribers.length}</p>
                <p style="font-size: 12px; color: #6b7280; margin: 4px 0 0 0;">Suscriptores</p>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- New Software -->
        <tr><td style="padding: 24px 32px;">
          <h2 style="color: #1e3a5f; font-size: 18px; margin: 0 0 16px 0; border-bottom: 2px solid #2563eb; padding-bottom: 8px;">🆕 Software añadido este mes</h2>
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            ${softwareCards}
          </table>
        </td></tr>

        ${consultoresCards ? `
        <!-- New Consultores -->
        <tr><td style="padding: 24px 32px; border-top: 1px solid #e5e7eb;">
          <h2 style="color: #1e3a5f; font-size: 18px; margin: 0 0 16px 0; border-bottom: 2px solid #10b981; padding-bottom: 8px;">👥 Nuevos profesionales</h2>
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            ${consultoresCards}
          </table>
        </td></tr>
        ` : ''}

        <!-- Footer -->
        <tr><td style="background: #f9fafb; padding: 24px 32px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            <a href="https://asetemyt.com" style="color: #2563eb; text-decoration: none;">asetemyt.com</a> · Directorio de Cronometraje Industrial
          </p>
          <p style="color: #9ca3af; font-size: 11px; margin: 8px 0 0 0;">
            <a href="https://asetemyt.com/newsletter?unsubscribe=1" style="color: #9ca3af; text-decoration: underline;">Darse de baja</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

    return new Response(JSON.stringify({
      html: htmlContent,
      stats: {
        newSoftware: recentSoftware.length,
        newConsultores: recentConsultores.length,
        subscribers: subscribers.length,
        month: monthName,
      }
    }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
