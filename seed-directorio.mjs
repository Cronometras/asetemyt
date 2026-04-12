#!/usr/bin/env node
/**
 * Script para insertar datos seed del directorio de consultores
 * en Firestore collection: directorio_asetemyt
 * 
 * Uso: node seed-directorio.mjs
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// Firebase Admin
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const __dirname = dirname(fileURLToPath(import.meta.url));

// === CONFIG ===
const SERVICE_ACCOUNT_PATH = join(__dirname, "../articulos-IA---a-Firestore/backup/firebase-service-account.json");
const SEED_DATA_PATH = join(__dirname, "directorio-seed.json");

// === INIT ===
const serviceAccount = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, "utf-8"));
const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app);

const COLLECTION = "directorio_asetemyt";

async function seedDirectory() {
  console.log("🌱 Leyendo datos seed...");
  const data = JSON.parse(readFileSync(SEED_DATA_PATH, "utf-8"));
  
  console.log(`📊 ${data.length} registros encontrados`);
  
  // Check existing data
  const existing = await db.collection(COLLECTION).get();
  if (!existing.empty) {
    console.log(`⚠️  Ya existen ${existing.size} registros en ${COLLECTION}`);
    console.log("¿Deseas continuar? Se añadirán los nuevos registros.");
  }
  
  let inserted = 0;
  let skipped = 0;
  
  for (const item of data) {
    try {
      // Check if slug already exists
      const existingDoc = await db.collection(COLLECTION)
        .where("slug", "==", item.slug)
        .limit(1)
        .get();
      
      if (!existingDoc.empty) {
        console.log(`⏭️  Saltando: ${item.nombre} (slug ya existe)`);
        skipped++;
        continue;
      }
      
      // Convert createdAt string to Firestore Timestamp
      const docData = {
        ...item,
        createdAt: new Date(item.createdAt)
      };
      
      // Insert document
      await db.collection(COLLECTION).add(docData);
      console.log(`✅ Insertado: ${item.nombre}`);
      inserted++;
      
    } catch (error) {
      console.error(`❌ Error insertando ${item.nombre}:`, error.message);
    }
  }
  
  console.log("\n📊 Resumen:");
  console.log(`   ✅ Insertados: ${inserted}`);
  console.log(`   ⏭️  Saltados: ${skipped}`);
  console.log(`   ❌ Errores: ${data.length - inserted - skipped}`);
}

// Run
seedDirectory()
  .then(() => {
    console.log("\n✨ Proceso completado");
    process.exit(0);
  })
  .catch(error => {
    console.error("💥 Error fatal:", error);
    process.exit(1);
  });
