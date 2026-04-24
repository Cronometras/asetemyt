#!/usr/bin/env node
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVICE_ACCOUNT_PATH = join(__dirname, '../articulos-IA---a-Firestore/backup/firebase-service-account.json');

const serviceAccount = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, 'utf-8'));
const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app);

const names = ['CRONOMETRAS', 'Worksamp', 'Induly', 'Balanceo de Líneas'];
const snap = await db.collection('directorio_asetemyt').where('seccion', '==', 'software').get();

let updated = 0;
for (const d of snap.docs) {
  const data = d.data();
  const isProdCont = names.some(n => (data.nombre || '').includes(n));
  if (isProdCont) {
    await d.ref.update({ destacado: true });
    console.log(`⭐ ${data.nombre} → destacado: true`);
    updated++;
  }
}
console.log(`\n✅ ${updated} productos ProdCont marcados como destacados`);
process.exit(0);
