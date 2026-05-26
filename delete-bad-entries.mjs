import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync, writeFileSync } from "fs";

const sa = JSON.parse(readFileSync("/home/ubuntu/projects/articulos-IA---a-Firestore/backup/firebase-service-account-asetemyt.json", "utf8"));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

const snap = await db.collection("directorio_consultores_asetemyt").get();

// Get all entries and their createdAt, find the 107 we added (they'll have the most recent timestamps)
let allEntries = [];
snap.forEach(doc => {
  allEntries.push({ id: doc.id, slug: doc.data().slug, nombre: doc.data().nombre, createdAt: doc.data().createdAt, tipo: doc.data().tipo, seccion: doc.data().seccion });
});

// Sort by createdAt descending
allEntries.sort((a, b) => {
  const da = new Date(a.createdAt || 0).getTime();
  const db2 = new Date(b.createdAt || 0).getTime();
  return db2 - da;
});

// The 107 most recent entries are ours
const recent = allEntries.slice(0, 120);
console.log("Más recientes (verificar últimos añadidos):");
recent.slice(0, 15).forEach(e => console.log(`  ${e.createdAt} | ${e.nombre} (${e.slug})`));

// Let's just count entries with slugs that start with common patterns from our batch
const badSlugs = [
  "idom", "sener-ingenieria", "tecnicas-reunidas", "ayesa", "ct-ingenieros",
  "gmv", "grupo-oesia", "indra-sistemas", "minsait", "applus-laboratories",
  "gonvarri", "grupo-antolin", "gestamp", "cosentino", "porcelanosa",
  "caf-ferrocarriles", "roca", "irizar", "danobat", "tecnalia",
  "eurecat", "ikerlan", "aidimme", "itene", "itainnova",
  "cidetec", "cartif", "itg-galicia", "eit-innoenergy", "accenture-industria",
  "deloitte-operaciones", "kpmg-operaciones", "mckinsey-operaciones", "grant-thornton-industria",
  "alten-industria", "capgemini-engineering", "nttdata-industria", "telefonica-tech-industria",
  "auren-consultores", "grupo-spi", "ibermatica-industria", "altia-consultores",
  "grupo-espri", "aii-automatizacion", "dibal", "ormazabal",
  "ulma-fabricacion", "fagor-arrasate", "goizper", "industrias-lozano",
  "lauak", "nicolas-correa", "tag-guernica", "tubos-reunidos",
  "acerinox-fabricacion", "celsa-group", "vicente-tormo", "gain-group",
  "fritz-hansen-logistica", "eim-mantenimiento", "oee-consulting-es",
  "ipo-optimization", "fie-smart", "arv-automatizacion",
  "mpi-predictivo", "cai-automatizacion", "workflow-industrial"
];

let deleted = 0;
for (const slug of badSlugs) {
  const docs = allEntries.filter(e => e.slug === slug);
  for (const doc of docs) {
    await db.collection("directorio_consultores_asetemyt").doc(doc.id).delete();
    console.log(`🗑️ ${doc.nombre}`);
    deleted++;
  }
}

console.log(`\nEliminadas ${deleted} fichas incorrectas`);
console.log("---");
console.log("Las siguientes PUEDEN ser apropiadas (consultoras de métodos/lean/calidad):");
const maybeGood = [
  "lic-lean", "mpi-metodos", "tmc-consulting", "eia-eficiencia", "pac-produccion",
  "cpc-calidad", "pei-prevencion", "etm-estudios", "flc-factoria", "acorde-lean",
  "spe-produccion", "pim-mediterraneo", "kaizen-bss", "mfi-fiabilidad",
  "sop-simulacion", "amt-analisis", "lcsi-logistica", "gpc-produccion",
  "solutions-lean-sl", "cei-cronoestudios", "etp-planta", "aisur-automatizacion",
  "meo-metricas", "ipi-innovacion", "fctpm-formacion", "cfa-fabricacion",
  "opi-organizacion", "lss-group-spain", "eai-ergonomia", "sgi-gestion",
  "cci-control", "3d-industrial", "mytn-norte", "ceig-galicia",
  "epm-estandares", "lms-lean", "timestudy-medicion", "cima-calidad",
  "etp-tiempo", "mca-mejora"
];
maybeGood.forEach(s => console.log(`   ? ${s}`));

process.exit(0);
