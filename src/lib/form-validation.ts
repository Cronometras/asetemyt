/** Validate JSON form fields before calling string methods or accessing storage. */
export function validTextForm(
  body: unknown,
  limits: Record<string, number>,
  required: string[] = [],
): body is Record<string, any> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return false;
  const fields = body as Record<string, unknown>;
  return Object.entries(limits).every(([key, limit]) => {
    const value = fields[key];
    if (value === undefined) return !required.includes(key);
    return typeof value === 'string' && value.length <= limit &&
      (!required.includes(key) || !!value.replace(/<[^>]*>/g, '').trim());
  });
}
