// Optimistic transactions: D1 checks all reads and applies writes in one batch.
import type { D1Database } from '@cloudflare/workers-types';
export class PaymentError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export class PaymentTransaction {
  private reads = new Map<string, { collection: string; id: string; raw: string | null }>();
  private writes = new Map<string, { collection: string; id: string; data: any }>();
  constructor(private db: D1Database) {}
  async get(collection: string, id: string): Promise<any> {
    const key = JSON.stringify([collection, id]);
    if (this.writes.has(key)) return structuredClone(this.writes.get(key)!.data);
    if (!this.reads.has(key)) {
      const row = await this.db.prepare('SELECT data FROM app_documents WHERE collection = ? AND id = ?')
        .bind(collection, id).first<{ data: string }>();
      this.reads.set(key, { collection, id, raw: row?.data ?? null });
    }
    const raw = this.reads.get(key)!.raw;
    return raw === null ? null : JSON.parse(raw);
  }
  async put(collection: string, id: string, data: any) {
    await this.get(collection, id);
    this.writes.set(JSON.stringify([collection, id]), { collection, id, data });
  }
  async commit() {
    if (!this.writes.size) return;
    // Invalid guard inserts abort the whole batch on a concurrent change.
    // No guard rows persist. app_documents.data has a NOT NULL constraint.
    const checks = [...this.reads.values()].map(({ collection, id, raw }) =>
      this.db.prepare(`INSERT INTO app_documents (collection, id, data)
        SELECT 'payment_conflict_guard', ?, NULL
        WHERE (SELECT data FROM app_documents WHERE collection = ? AND id = ?) IS NOT ?`)
        .bind(crypto.randomUUID(), collection, id, raw));
    const writes = [...this.writes.values()].map(({ collection, id, data }) =>
      this.db.prepare(`INSERT INTO app_documents (collection, id, data) VALUES (?, ?, ?)
        ON CONFLICT(collection, id) DO UPDATE SET data = excluded.data`)
        .bind(collection, id, JSON.stringify(data)));
    await this.db.batch([...checks, ...writes]);
  }
}
export async function paymentTransaction<T>(env: any, work: (tx: PaymentTransaction) => Promise<T>): Promise<T> {
  if (!env.DB) throw new PaymentError(503, 'La base de datos de pagos no está disponible.');
  for (let attempt = 0; attempt < 4; attempt++) {
    const tx = new PaymentTransaction(env.DB);
    const result = await work(tx);
    try { await tx.commit(); return result; }
    catch (error) {
      if (!String(error).includes('NOT NULL constraint failed: app_documents.data')) throw error;
    }
  }
  throw new PaymentError(409, 'Otra operación está en curso. Vuelve a intentarlo.');
}
export function paymentFailure(error: unknown): Response {
  if (error instanceof PaymentError) return Response.json({ error: error.message }, { status: error.status });
  console.error('Payment operation failed:', error instanceof Error ? error.message : 'unknown');
  return Response.json({ error: 'No se ha podido completar la operación. Inténtalo de nuevo.' }, { status: 503 });
}
