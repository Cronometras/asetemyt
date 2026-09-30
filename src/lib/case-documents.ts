export function validCaseDocuments(value: unknown): boolean {
  if (value === undefined) return true;
  if (!Array.isArray(value) || value.length > 5) return false;
  return value.every(document => {
    if (!document || typeof document.label !== 'string' || !document.label.trim() || document.label.length > 100 ||
      typeof document.url !== 'string' || document.url.length > 2048) return false;
    try { const url = new URL(document.url); return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password; }
    catch { return false; }
  });
}
