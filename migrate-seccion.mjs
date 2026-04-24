#!/usr/bin/env node
/**
 * Migration: Add seccion="consultores" to all existing entries without seccion
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const __dirname = dirname(fileURLToPath(import.meta.url));

const SERVICE_ACCOUNT_PATH = join(__dirname, "../articulos-IA---a-Firestore/backup/firebase-service-account.json");

const serviceAccount = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, "utf-8"));
const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app);

const COLLECTION = "directorio_asetemyt";

async function migrate() {
  console.log("🔍 Buscando entradas sin campo 'seccion'...");
  
  const snapshot = await db.collection(COLLECTION).get();
  let updated = 0;
  let skipped = 0;
  
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (!data.seccion) {
      // Default to "consultores" for entries without seccion
      await db.collection(COLLECTION).doc(doc.id).update({ seccion: "consultores" });
      console.log(`✅ ${data.nombre || doc.id} → consultores`);
      updated++;
    } else {
      skipped++;
    }
  }
  
  console.log(`\n📊 Resumen: ${updated} actualizadas, ${skipped} ya tenían sección`);
}

migrate()
  .then(() => {
    console.log("\n✨ Migración completada");
    process.exit(0);
  })
  .catch(error => {
    console.error("💥 Error:", error);
    process.exit(1);
  });
