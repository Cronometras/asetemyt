import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";

const sa = JSON.parse(readFileSync("/home/ubuntu/projects/articulos-IA---a-Firestore/backup/firebase-service-account-asetemyt.json", "utf8"));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

// Datos de contacto que obtendré visitando las webs
const contactosActualizados = {
  "riba-nogues": {
    email: "ribanogues@ribanogues.com",
    telefono: "+34 932 402 404",
    direccion: "Avda. Cerdanyola 75-77 Planta 1, 08172 Sant Cugat del Vallés (Barcelona)"
  },
  // Los demás los voy a rellenar visitando las webs
};

// Empresas a actualizar
const empresas = [
  { slug: "induscor-partners", url: "https://induscorpartners.com/" },
  { slug: "riba-nogues", url: "https://ribanogues.com/contacto/" },
  { slug: "gestion-industrial", url: "https://www.gestionindustrial.com/" },
  { slug: "incora", url: "http://www.incora.es/" },
  { slug: "socotec-espana", url: "https://www.socotec.es/sectores/consultoria-industrial" },
  { slug: "sca-consultores", url: "https://www.scaconsultores.com/" },
  { slug: "ad-consultores", url: "https://www.adconsultores.es/" },
  { slug: "caspeo", url: "https://www.caspeo.net/" },
  { slug: "i-procesos", url: "https://i-procesos.es/" },
  { slug: "oyeregui-industrial", url: "https://www.oyereguindustrial.com/" },
  { slug: "kaizen-institute-espana", url: "https://kaizen.com/es-es/" },
  { slug: "kai-consultora", url: "https://kaiconsultora.com/" },
  { slug: "leansis-sgs-productivity", url: "https://leansisproductividad.com/" },
  { slug: "mqg-consulting", url: "https://www.mqgconsulting.es/" },
  { slug: "profit-controls", url: "https://profitcontrolsl.com/" },
  { slug: "arn-consulting", url: "https://arnconsulting.es/" },
  { slug: "shinten-consulting", url: "https://shintenconsulting.com/" },
  { slug: "eficindu", url: "https://eficindu.com/" },
  { slug: "scs-consultores", url: "https://scsconsultores.com/" },
  { slug: "redes-consultoria", url: "https://www.redesconsultoria.com/" },
  { slug: "consultoria-itc", url: "https://consultoriaitc.com/" },
  { slug: "croc-consultoria", url: "https://crocconsultoria.com/" },
  { slug: "g3m-operational-consulting", url: "https://g3m.es/" },
  { slug: "ep-ingenieria-proceso", url: "https://epingenieriayproceso.com/" }
];

// Actualizar Riba Nogués con los datos que ya tenemos
async function main() {
  // Primero actualizar Riba Nogués
  const snap = await db.collection("directorio_consultores_asetemyt").where("slug", "==", "riba-nogues").get();
  if (!snap.empty) {
    const doc = snap.docs[0];
    await doc.ref.update({
      "contacto.email": "ribanogues@ribanogues.com",
      "contacto.telefono": "+34 932 402 404",
      "ubicacion.direccion": "Avda. Cerdanyola 75-77 Planta 1, 08172 Sant Cugat del Vallés (Barcelona)"
    });
    console.log("✅ Riba Nogués actualizado con datos de contacto");
  }
  
  console.log("\nDatos de contacto conocidos actualizados.");
  console.log("Empresas a verificar en webs:");
  empresas.forEach(e => console.log(`  - ${e.slug}: ${e.url}`));
  
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
