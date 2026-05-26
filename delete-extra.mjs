import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";

const sa = JSON.parse(readFileSync("/home/ubuntu/projects/articulos-IA---a-Firestore/backup/firebase-service-account-asetemyt.json", "utf8"));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

const extraSlugs = [
  "lic-lean", "mpi-metodos", "tmc-consulting", "eia-eficiencia", "pac-produccion",
  "cpc-calidad", "pei-prevencion", "etm-estudios", "flc-factoria", "acorde-lean",
  "spe-produccion", "pim-mediterraneo", "kaizen-bss", "mfi-fiabilidad",
  "sop-simulacion", "amt-analisis", "lcsi-logistica", "gpc-produccion",
  "solutions-lean-sl", "cei-cronoestudios", "etp-planta",
  "meo-metricas", "ipi-innovacion", "fctpm-formacion", "cfa-fabricacion",
  "opi-organizacion", "lss-group-spain", "eai-ergonomia", "sgi-gestion",
  "cci-control", "3d-industrial", "mytn-norte", "ceig-galicia",
  "epm-estandares", "lms-lean", "timestudy-medicion", "cima-calidad",
  "etp-tiempo", "mca-mejora"
];

const snap = await db.collection("directorio_consultores_asetemyt").get();
let deleted = 0;
for (const doc of snap.docs) {
  const data = doc.data();
  if (extraSlugs.includes(data.slug)) {
    await doc.ref.delete();
    console.log(`🗑️ ${data.nombre}`);
    deleted++;
  }
}
console.log(`\nTotal eliminadas: ${deleted}`);
process.exit(0);
