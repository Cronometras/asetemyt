import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import sa from "../../projects/articulos-IA---a-Firestore/backup/firebase-service-account-asetemyt.json" with { type: "json" };

const app = initializeApp({ credential: cert(sa) });
const db = getFirestore();
const COLLECTION = "directorio_consultores_asetemyt";

const entries = [
  {
    "nombre": "Edikal",
    "slug": "edikal",
    "tipo": "empresa",
    "especialidades": [
      "ingenieria-industrial",
      "proyectos-industriales",
      "consultoria-industrial"
    ],
    "descripcion": "Ingeniería y servicios avanzados para industria y construcción. Especializados en proyectos de mecánica, eléctrica y gestión de proyectos. Operan a nivel nacional desde Gijón, Asturias.",
    "servicios": [
      "Ingeniería mecánica",
      "Ingeniería eléctrica",
      "Gestión de proyectos",
      "Servicio postventa",
      "Mantenimiento industrial"
    ],
    "ubicacion": {
      "pais": "España",
      "ciudad": "Gijón"
    },
    "contacto": {
      "email": "info@edikal.com",
      "telefono": "984 193 896",
      "web": "https://edikal.es",
      "linkedin": ""
    },
    "logo": "",
    "verificado": false,
    "lang": "es"
  },
  {
    "nombre": "Amyca Ingenieros",
    "slug": "amyca-ingenieros",
    "tipo": "empresa",
    "especialidades": [
      "ingenieria-industrial",
      "consultoria-industrial",
      "medio-ambiente"
    ],
    "descripcion": "Consultora de ingeniería que desarrolla su actividad en Murcia y Alicante. Ingenieros minas, ingeniería industrial, medio ambiente, implantación calidad, consultoría estratégica y certificados energéticos.",
    "servicios": [
      "Ingeniería industrial",
      "Ingeniería de minas",
      "Medio ambiente",
      "Implantación calidad",
      "Consultoría estratégica",
      "Certificados energéticos"
    ],
    "ubicacion": {
      "pais": "España",
      "ciudad": "Murcia"
    },
    "contacto": {
      "email": "carmenbelando@amyca.com",
      "telefono": "968 937 688",
      "web": "https://www.amyca.com",
      "linkedin": ""
    },
    "logo": "",
    "verificado": false,
    "lang": "es"
  },
  {
    "nombre": "Ingitec Proyectos",
    "slug": "ingitec-proyectos",
    "tipo": "empresa",
    "especialidades": [
      "ingenieria-industrial",
      "proyectos-industriales",
      "licencias"
    ],
    "descripcion": "Diseño de instalaciones industriales, reformas de vehículos y viviendas, licencias de actividad y peritación en Murcia.",
    "servicios": [
      "Diseño instalaciones industriales",
      "Reformas",
      "Licencias de actividad",
      "Peritación"
    ],
    "ubicacion": {
      "pais": "España",
      "ciudad": "Murcia"
    },
    "contacto": {
      "email": "info.dep@ingitec.es",
      "telefono": "",
      "web": "https://www.ingitec.es",
      "linkedin": ""
    },
    "logo": "",
    "verificado": false,
    "lang": "es"
  },
  {
    "nombre": "Proyecta79",
    "slug": "proyecta79",
    "tipo": "empresa",
    "especialidades": [
      "ingenieria-industrial",
      "consultoria-industrial",
      "control-de-calidad"
    ],
    "descripcion": "Consultoría, ingeniería, asistencia técnica y control de calidad de grandes, medianos y pequeños proyectos de infraestructura industrial.",
    "servicios": [
      "Ingeniería industrial",
      "Asistencia técnica",
      "Control de calidad",
      "Gestión de proyectos"
    ],
    "ubicacion": {
      "pais": "España",
      "ciudad": "Murcia"
    },
    "contacto": {
      "email": "proyecta79@proyecta79.com",
      "telefono": "962 891 112",
      "web": "https://proyecta79.com",
      "linkedin": ""
    },
    "logo": "",
    "verificado": false,
    "lang": "es"
  },
  {
    "nombre": "Ingeniería Murcia",
    "slug": "ingenieria-murcia",
    "tipo": "empresa",
    "especialidades": [
      "ingenieria-industrial",
      "consultoria-industrial",
      "gestion-proyectos"
    ],
    "descripcion": "Servicios de ingeniería y consultoría técnica en Murcia. Gestión de proyectos, licencias y eficiencia.",
    "servicios": [
      "Ingeniería industrial",
      "Consultoría técnica",
      "Gestión de proyectos",
      "Licencias"
    ],
    "ubicacion": {
      "pais": "España",
      "ciudad": "Murcia"
    },
    "contacto": {
      "email": "info@ingenieriamurcia.com",
      "telefono": "",
      "web": "https://www.ingenieriamurcia.com",
      "linkedin": ""
    },
    "logo": "",
    "verificado": false,
    "lang": "es"
  }
];

async function main() {
  const snap = await db.collection(COLLECTION).get();
  const existingSlugs = new Set();
  const existingWebs = new Set();
  snap.forEach(doc => {
    const d = doc.data();
    if (d.slug) existingSlugs.add(d.slug);
    if (d.contacto?.web) {
      const w = d.contacto.web.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
      existingWebs.add(w);
    }
  });

  let added = 0;
  for (const entry of entries) {
    const wd = entry.contacto.web.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
    if (existingSlugs.has(entry.slug) || existingWebs.has(wd)) {
      console.log(`SKIP: ${entry.slug}`);
      continue;
    }
    await db.collection(COLLECTION).add({ ...entry, createdAt: new Date().toISOString(), contactoDesbloqueado: false });
    console.log(`ADD: ${entry.nombre} (${entry.slug}) - ${entry.ubicacion.ciudad}`);
    added++;
  }
  console.log(`Done: ${added} added`);
}
main().catch(console.error);
