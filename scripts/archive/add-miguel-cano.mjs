#!/usr/bin/env node
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVICE_ACCOUNT_PATH = join(__dirname, "../articulos-IA---a-Firestore/backup/firebase-service-account.json");
const DATA_PATH = join(__dirname, "miguel-cano-entry.json");

const serviceAccount = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, "utf-8"));
const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app);

const COLLECTION = "directorio_asetemyt";

async function addEntry() {
  const data = JSON.parse(readFileSync(DATA_PATH, "utf-8"));
  
  for (const item of data) {
    // Check if slug already exists
    const existing = await db.collection(COLLECTION).where("slug", "==", item.slug).get();
    if (!existing.empty) {
      console.log(`⚠️  Ya existe una entrada con slug "${item.slug}". Actualizando...`);
      const docId = existing.docs[0].id;
      await db.collection(COLLECTION).doc(docId).set(item, { merge: true });
      console.log(`✅ Entrada actualizada: ${item.nombre} (ID: ${docId})`);
    } else {
      const ref = await db.collection(COLLECTION).add(item);
      console.log(`✅ Entrada creada: ${item.nombre} (ID: ${ref.id})`);
    }
  }
  
  console.log("\n🔗 Ficha disponible en: https://asetemyt.com/directorio/miguel-cano");
  process.exit(0);
}

addEntry().catch(e => { console.error(e); process.exit(1); });
