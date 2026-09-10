// Runtime document store. Public directory tables are projections maintained
// atomically by SQL triggers (migration 0003), never by a second remote write.
type Database = ReturnType<typeof import('./d1').getDB>;

function jsonPath(field: string): string {
  const parts = field.split('.');
  if (parts.some(part => !/^[\p{L}\p{N}_-]+$/u.test(part))) {
    throw new Error(`Campo no válido: ${field}`);
  }
  return '$.' + parts.map(part => `"${part}"`).join('.');
}

function document(row: any): any {
  // The database key is authoritative, even if imported data includes an id.
  return { ...JSON.parse(row.data), id: row.id };
}

export async function getDocument(db: Database, collection: string, id: string) {
  const row = await db.prepare('SELECT id, data FROM app_documents WHERE collection = ? AND id = ?')
    .bind(collection, id).first();
  return row ? document(row) : null;
}

export async function listDocuments(db: Database, collection: string) {
  const result = await db.prepare('SELECT id, data FROM app_documents WHERE collection = ? ORDER BY id')
    .bind(collection).all();
  return (result.results || []).map(document);
}

export async function queryDocuments(db: Database, collection: string, field: string, op: string, value: any) {
  const operators: Record<string, string> = {
    EQUAL: '=', NOT_EQUAL: '!=', GREATER_THAN: '>', GREATER_THAN_OR_EQUAL: '>=',
    LESS_THAN: '<', LESS_THAN_OR_EQUAL: '<=',
  };
  const operator = operators[op];
  if (!operator) throw new Error(`Operador no soportado en D1: ${op}`);
  const path = jsonPath(field);
  let statement;
  if (value === null && op === 'EQUAL') {
    statement = db.prepare("SELECT id, data FROM app_documents WHERE collection = ? AND json_type(data, ?) = 'null' ORDER BY id")
      .bind(collection, path);
  } else {
    if (typeof value === 'object' || value === undefined) throw new Error('La consulta requiere un valor escalar');
    statement = db.prepare(`SELECT id, data FROM app_documents WHERE collection = ? AND json_extract(data, ?) ${operator} ? ORDER BY id`)
      .bind(collection, path, typeof value === 'boolean' ? Number(value) : value);
  }
  const result = await statement.all();
  return (result.results || []).map(document);
}

export async function createDocument(db: Database, collection: string, id: string, data: Record<string, any>) {
  // Preserve legacy idempotent-create behavior without overwriting an existing doc.
  await db.prepare('INSERT INTO app_documents (collection, id, data) VALUES (?, ?, ?) ON CONFLICT(collection, id) DO NOTHING')
    .bind(collection, id, JSON.stringify(data)).run();
  return true;
}

function updateStatement(db: Database, collection: string, id: string, fields: Record<string, any>) {
  const entries = Object.entries(fields);
  if (!entries.length) throw new Error('No hay campos para actualizar');
  // Bound paths and JSON values preserve explicit nulls, arrays and nested maps.
  // Applying the patch in SQL prevents concurrent edits of unrelated fields
  // from overwriting each other. Each statement stays below D1's bind limit.
  if (entries.length > 45) throw new Error('Demasiados campos en una actualización (máximo 45)');
  const args = entries.flatMap(([key, value]) => [jsonPath(key), JSON.stringify(value)]);
  // Reuse numbered bindings for the insert and conflict paths.
  const numbered = entries.map((_, i) => `?${3 + i * 2}, json(?${4 + i * 2})`).join(', ');
  return db.prepare(
    `INSERT INTO app_documents (collection, id, data) VALUES (?1, ?2, json_set('{}', ${numbered})) ` +
    `ON CONFLICT(collection, id) DO UPDATE SET data = json_set(app_documents.data, ${numbered})`
  ).bind(collection, id, ...args);
}

export async function updateDocument(db: Database, collection: string, id: string, fields: Record<string, any>) {
  await updateStatement(db, collection, id, fields).run();
  return true;
}

export async function deleteDocument(db: Database, collection: string, id: string) {
  await db.prepare('DELETE FROM app_documents WHERE collection = ? AND id = ?').bind(collection, id).run();
  return true;
}

export async function batchUpdateDocuments(db: Database, updates: Array<{ collection: string; docId: string; fields: Record<string, any> }>) {
  // Consecutive identical patches (lock/unlock all) share one SQL statement.
  // This avoids spending one D1 query per row and preserves update order even
  // when an input contains the same id more than once with different patches.
  const groups: Array<{ collection: string; fields: Record<string, any>; signature: string; ids: string[] }> = [];
  for (const update of updates) {
    const signature = JSON.stringify([update.collection, update.fields]);
    const last = groups[groups.length - 1];
    if (last?.signature === signature && last.ids.length < 100) last.ids.push(update.docId);
    else groups.push({ collection: update.collection, fields: update.fields, signature, ids: [update.docId] });
  }
  const statements = groups.map(group => {
    const entries = Object.entries(group.fields);
    if (!entries.length || entries.length > 45) throw new Error('Número de campos de actualización no válido');
    const numbered = entries.map((_, i) => `?${3 + i * 2}, json(?${4 + i * 2})`).join(', ');
    const args = entries.flatMap(([key, value]) => [jsonPath(key), JSON.stringify(value)]);
    return db.prepare(
      'INSERT INTO app_documents (collection, id, data) ' +
      `SELECT ?1, ids.value, json_set(COALESCE(existing.data, '{}'), ${numbered}) ` +
      'FROM json_each(?2) AS ids LEFT JOIN app_documents AS existing ' +
      'ON existing.collection = ?1 AND existing.id = ids.value WHERE true ' +
      'ON CONFLICT(collection, id) DO UPDATE SET data = excluded.data'
    ).bind(group.collection, JSON.stringify(group.ids), ...args);
  });
  // Each batch transaction includes its public projection triggers.
  for (let i = 0; i < statements.length; i += 40) {
    await db.batch(statements.slice(i, i + 40));
  }
  return updates.length;
}
