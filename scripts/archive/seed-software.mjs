#!/usr/bin/env node
/**
 * Seed/update software directory entries in Firestore
 * Adds seccion="software" field to distinguish from consultores
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

const __dirname = dirname(fileURLToPath(import.meta.url));

const SERVICE_ACCOUNT_PATH = join(__dirname, "../articulos-IA---a-Firestore/backup/firebase-service-account.json");
const SEED_DATA_PATH = join(__dirname, "directorio-software-seed.json");

const serviceAccount = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, "utf-8"));
const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app);

const COLLECTION = "directorio_asetemyt";

async function seedSoftware() {
  console.log("🌱 Leyendo datos seed de software...");
  const data = JSON.parse(readFileSync(SEED_DATA_PATH, "utf-8"));
  
  console.log(`📊 ${data.length} registros encontrados`);
  
  let inserted = 0;
  let updated = 0;
  
  for (const item of data) {
    try {
      // Check if slug already exists
      const existingDoc = await db.collection(COLLECTION)
        .where("slug", "==", item.slug)
        .limit(1)
        .get();
      
      // Always add seccion="software"
      const docData = {
        ...item,
        seccion: "software",
        createdAt: Timestamp.fromDate(new Date(item.createdAt))
      };
      
      if (!existingDoc.empty) {
        // Update existing entry
        const docId = existingDoc.docs[0].id;
        await db.collection(COLLECTION).doc(docId).update(docData);
        console.log(`🔄 Actualizado: ${item.nombre}`);
        updated++;
      } else {
        // Insert document
        await db.collection(COLLECTION).add(docData);
        console.log(`✅ Insertado: ${item.nombre}`);
        inserted++;
      }
      
    } catch (error) {
      console.error(`❌ Error con ${item.nombre}:`, error.message);
    }
  }
  
  console.log("\n📊 Resumen:");
  console.log(`   ✅ Insertados nuevos: ${inserted}`);
  console.log(`   🔄 Actualizados: ${updated}`);
}

seedSoftware()
  .then(() => {
    console.log("\n✨ Proceso completado");
    process.exit(0);
  })
  .catch(error => {
    console.error("💥 Error fatal:", error);
    process.exit(1);
  });
