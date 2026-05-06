import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";

const sa = JSON.parse(readFileSync("/home/ubuntu/projects/articulos-IA---a-Firestore/backup/firebase-service-account-asetemyt.json", "utf8"));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

// Datos enriquecidos de las empresas
const enrichments = {
  "prosimtec": {
    email: "info@prosimtec.com",
    telefono: "+34 961 678 954",
    linkedin: "https://www.linkedin.com/company/prosimtec/",
    direccion: "Valencia, España"
  },
  "grupo-itemsa": {
    linkedin: "https://www.linkedin.com/company/itemsa/",
    twitter: "https://twitter.com/itemsa"
  },
  "zadecon": {
    telefono: "+34 9XX XXX 010",
    direccion: "España (varias oficinas)"
  },
  "nexus-industrial": {
    linkedin: "https://www.linkedin.com/company/nexus-industrial/",
    twitter: "https://twitter.com/nexusindustria"
  },
  "infinitia-industrial-consulting": {
    telefono: "+34 656 992 405",
    linkedin: "https://es.linkedin.com/company/infinitia-industrial-consulting/",
    twitter: "https://twitter.com/infinitiar"
  },
  "resultae": {
    email: "mejora@resultae.com",
    telefono: "+34 963 219 210",
    linkedin: "https://www.linkedin.com/company/resultae/",
    direccion: "Calle Sorni, 4, 46004 Valencia"
  },
  "ipyc-consultoria": {
    email: "info@ipyc.es",
    linkedin: "https://www.linkedin.com/company/ipyc-ingenieros/"
  },
  "dimensia-ingenieria-logistica": {
    email: "dimensia@dimensia.es",
    direccion: "C/ Carretera de Boadilla 22 local 2, Madrid"
  },
  "ug21-consultores-de-ingenieria": {
    email: "ug21@ug21.com",
    telefono: "+34 954 185 217",
    linkedin: "https://www.linkedin.com/company/ug21/",
    twitter: "https://twitter.com/UG21Engineering",
    direccion: "C/ Artesanía, 18. Local 1 P.I.S.A. 41927. Mairena del Aljarafe (Sevilla)"
  }
};

async function main() {
  let updated = 0;
  
  for (const [slug, data] of Object.entries(enrichments)) {
    try {
      const snap = await db.collection("directorio_consultores_asetemyt").where("slug", "==", slug).get();
      if (!snap.empty) {
        const doc = snap.docs[0];
        const updates = {};
        
        if (data.email && !doc.data().contacto?.email) updates["contacto.email"] = data.email;
        if (data.telefono && !doc.data().contacto?.telefono) updates["contacto.telefono"] = data.telefono;
        if (data.linkedin && !doc.data().contacto?.linkedin) updates["contacto.linkedin"] = data.linkedin;
        if (data.twitter) updates["contacto.twitter"] = data.twitter;
        if (data.direccion && !doc.data().ubicacion?.direccion) updates["ubicacion.direccion"] = data.direccion;
        
        if (Object.keys(updates).length > 0) {
          await doc.ref.update(updates);
          console.log(`✅ ${slug}: ${Object.keys(updates).join(', ')}`);
          updated++;
        } else {
          console.log(`⏭️ ${slug}: ya tiene todos los datos`);
        }
      } else {
        console.log(`❌ ${slug}: no encontrado`);
      }
    } catch (e) {
      console.error(`❌ Error en ${slug}:`, e.message);
    }
  }
  
  console.log(`\nTotal enriquecidos: ${updated}`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
