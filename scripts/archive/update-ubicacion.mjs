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

const names = ['CRONOMETRAS', 'Worksamp', 'Induly', 'Balanceo de Líneas', 'ProdCont'];
const snap = await db.collection('directorio_asetemyt').get();

let updated = 0;
for (const d of snap.docs) {
  const data = d.data();
  const match = names.some(n => (data.nombre || '').includes(n));
  if (match) {
    await d.ref.update({
      ubicacion: {
        pais: 'España',
        ciudad: 'Valencia',
      },
      seccion: 'software',
    });
    console.log(`📍 ${data.nombre} → Valencia, España`);
    updated++;
  }
}
console.log(`\n✅ ${updated} entradas actualizadas`);
process.exit(0);
