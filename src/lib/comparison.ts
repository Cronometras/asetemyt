export function escapeComparisonText(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]!);
}

export function trialAvailable(value: unknown): boolean {
  return value === true || (typeof value === 'string' && !!value.trim() &&
    !/^(no|false|no disponible|not available)$/i.test(value.trim()));
}

export function uniqueComparisonSlugs(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}
