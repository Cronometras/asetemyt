export const directoryOrders = ['recommended', 'newest', 'oldest', 'name-asc', 'name-desc'] as const;
export type DirectoryOrder = typeof directoryOrders[number];
export function validDirectoryOrder(value: unknown): DirectoryOrder {
  return directoryOrders.includes(value as DirectoryOrder) ? value as DirectoryOrder : 'recommended';
}
export function compareDirectoryEntries(a: any, b: any, order: DirectoryOrder = 'recommended'): number {
  const name = String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es', { sensitivity: 'base', numeric: true });
  const tie = name || String(a.slug || a.id || '').localeCompare(String(b.slug || b.id || ''));
  if (order === 'name-asc') return tie;
  if (order === 'name-desc') return -tie;
  if (order === 'newest' || order === 'oldest') {
    const date = (entry: any) => typeof entry.createdAt === 'string' && entry.createdAt.trim() ? Date.parse(entry.createdAt) : NaN;
    const x = date(a), y = date(b);
    if (!Number.isFinite(x)) return Number.isFinite(y) ? 1 : tie;
    if (!Number.isFinite(y)) return -1;
    return (order === 'newest' ? y - x : x - y) || tie;
  }
  return Number(b.verificado === true) - Number(a.verificado === true) || Number(b.destacado === true) - Number(a.destacado === true) || tie;
}
