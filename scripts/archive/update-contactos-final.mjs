import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";

const sa = JSON.parse(readFileSync("/home/ubuntu/projects/articulos-IA---a-Firestore/backup/firebase-service-account-asetemyt.json", "utf8"));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

const contactos = {
  "induscor-partners": { email: "admin@induscorpartners.com", telefono: "" },
  "gestion-industrial": { email: "gestionindustrialjb@gmail.com", telefono: "+34 625304338" },
  "incora": { email: "incora@incora.es", telefono: "" },
  "sca-consultores": { email: "empresas@scaconsultores.com", telefono: "" },
  "caspeo": { email: "info@caspeo.net", telefono: "" },
  "i-procesos": { email: "contacto@i-procesos.es", telefono: "+34 657 198 591" },
  "oyeregui-industrial": { email: "info@oyereguindustrial.com", telefono: "" },
  "kai-consultora": { email: "info@kaiconsultora.com", telefono: "" },
  "profit-controls": { email: "info@profitcontrolsl.com", telefono: "+34 938 288 196" },
  "arn-consulting": { email: "comunicacion@arnconsulting.es", telefono: "" },
  "eficindu": { email: "ventas@eficindu.com", telefono: "" },
  "redes-consultoria": { email: "info@redesconsultoria.com", telefono: "" },
  "g3m-operational-consulting": { email: "info@g3m.es", telefono: "+34 910 059 971" },
  "ep-ingenieria-proceso": { email: "info@epingenieriayproceso.com", telefono: "+34 620 585 707" }
};

async function main() {
  let updated = 0;
  
  for (const [slug, contacto] of Object.entries(contactos)) {
    try {
      const snap = await db.collection("directorio_consultores_asetemyt").where("slug", "==", slug).get();
      if (!snap.empty) {
        const doc = snap.docs[0];
        const updates = {};
        if (contacto.email) updates["contacto.email"] = contacto.email;
        if (contacto.telefono) updates["contacto.telefono"] = contacto.telefono;
        
        if (Object.keys(updates).length > 0) {
          await doc.ref.update(updates);
          console.log(`✅ ${slug}: ${contacto.email || ''} ${contacto.telefono || ''}`);
          updated++;
        }
      } else {
        console.log(`❌ ${slug}: No encontrado en Firestore`);
      }
    } catch (e) {
      console.error(`❌ Error actualizando ${slug}:`, e.message);
    }
  }
  
  console.log(`\nTotal actualizados: ${updated}/${Object.keys(contactos).length}`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
