export function validateListingUpdates(value: any): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return 'Datos no válidos.';
  for (const key of ['descripcion', 'logo']) if (value[key] !== undefined && (typeof value[key] !== 'string' || value[key].length > (key === 'logo' ? 2048 : 10000))) return 'Texto demasiado largo o no válido.';
  for (const key of ['especialidades', 'servicios']) if (value[key] !== undefined && (!Array.isArray(value[key]) || value[key].length > 50 || value[key].some((x: any) => typeof x !== 'string' || x.length > 500))) return 'Lista no válida.';
  for (const key of ['ubicacion', 'contacto']) {
    if (value[key] === undefined) continue;
    if (!value[key] || typeof value[key] !== 'object' || Array.isArray(value[key]) || Object.values(value[key]).some((x: any) => typeof x !== 'string' || x.length > 2048)) return 'Contacto o ubicación no válidos.';
  }
  for (const url of [value.logo, value.contacto?.web, value.contacto?.linkedin]) {
    if (!url) continue;
    try { const parsed = new URL(url); if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password) return 'Utiliza enlaces http o https.'; }
    catch { return 'Utiliza una URL completa con https://.'; }
  }
  if (value.contacto?.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.contacto.email)) return 'Correo no válido.';
  return null;
}
