import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import sa from "../../projects/articulos-IA---a-Firestore/backup/firebase-service-account-asetemyt.json" with { type: "json" };

const app = initializeApp({ credential: cert(sa) });
const db = getFirestore();

const COLLECTION = "directorio_consultores_asetemyt";

const entries = [
  {
    "nombre": "Ingenio Consultores",
    "slug": "ingenio-consultores",
    "tipo": "empresa",
    "especialidades": [
      "ingenieria-industrial",
      "consultoria-industrial",
      "proyectos-industriales"
    ],
    "descripcion": "Empresa de ingeniería en Palma de Mallorca que desarrolla soluciones innovadoras y sostenibles para las necesidades del cliente. Más de 25 años de experiencia en ingeniería industrial.",
    "servicios": [
      "Ingeniería industrial",
      "Proyectos técnicos",
      "Consultoría",
      "Soluciones sostenibles"
    ],
    "ubicacion": {
      "pais": "España",
      "ciudad": "Palma de Mallorca"
    },
    "contacto": {
      "email": "info@ingenioconsultores.com",
      "telefono": "971 726 148",
      "web": "https://www.ingenioconsultores.com",
      "linkedin": ""
    },
    "logo": "",
    "verificado": false,
    "lang": "es"
  },
  {
    "nombre": "Grupo ICS",
    "slug": "grupo-ics",
    "tipo": "empresa",
    "especialidades": [
      "ingenieria-industrial",
      "consultoria-industrial",
      "consultoria-tecnica"
    ],
    "descripcion": "Empresa especializada en servicios de ingeniería y consultoría con más de 20 años de experiencia. Delegaciones en La Mojonera (Almería) y Úbeda (Jaén). Soluciones integrales para el sector industrial.",
    "servicios": [
      "Ingeniería industrial",
      "Consultoría técnica",
      "Proyectos industriales",
      "Gestión de proyectos"
    ],
    "ubicacion": {
      "pais": "España",
      "ciudad": "Almería"
    },
    "contacto": {
      "email": "",
      "telefono": "987 511 919",
      "web": "https://grupo-ics.es",
      "linkedin": ""
    },
    "logo": "",
    "verificado": false,
    "lang": "es"
  },
  {
    "nombre": "Ireno",
    "slug": "ireno",
    "tipo": "empresa",
    "especialidades": [
      "ingenieria-industrial",
      "energia",
      "instalaciones"
    ],
    "descripcion": "Ingeniería e instalaciones en toda Galicia (A Coruña, Lugo, Ourense, Pontevedra y Vigo). Electricidad, climatización, ventilación, energías renovables y movilidad eléctrica. Más de 20 años legalizando instalaciones industriales.",
    "servicios": [
      "Ingeniería industrial",
      "Instalaciones eléctricas",
      "Energías renovables",
      "Climatización",
      "Legalización industrial"
    ],
    "ubicacion": {
      "pais": "España",
      "ciudad": "Lugo"
    },
    "contacto": {
      "email": "info@ireno.es",
      "telefono": "982 828 406",
      "web": "https://www.ireno.es",
      "linkedin": ""
    },
    "logo": "",
    "verificado": false,
    "lang": "es"
  },
  {
    "nombre": "Instra Ingenieros",
    "slug": "instra-ingenieros",
    "tipo": "empresa",
    "especialidades": [
      "ingenieria-industrial",
      "logistica-industrial",
      "energia"
    ],
    "descripcion": "Empresa de ingeniería, arquitectura y consultoría especializada en el diseño e implementación de proyectos industriales, logísticos y energéticos.",
    "servicios": [
      "Ingeniería industrial",
      "Proyectos logísticos",
      "Ingeniería energética",
      "Arquitectura industrial"
    ],
    "ubicacion": {
      "pais": "España",
      "ciudad": "Lugo"
    },
    "contacto": {
      "email": "",
      "telefono": "",
      "web": "https://www.instra.es",
      "linkedin": ""
    },
    "logo": "",
    "verificado": false,
    "lang": "es"
  },
  {
    "nombre": "Ingenia2 Ingeniería y Consultoría",
    "slug": "ingenia2",
    "tipo": "empresa",
    "especialidades": [
      "ingenieria-industrial",
      "consultoria-industrial",
      "consultoria-tecnica"
    ],
    "descripcion": "Empresa de ingeniería en Albacete con 10 años de experiencia en consultoría industrial, ordenación de territorio y más.",
    "servicios": [
      "Ingeniería industrial",
      "Consultoría",
      "Ordenación del territorio",
      "Proyectos técnicos"
    ],
    "ubicacion": {
      "pais": "España",
      "ciudad": "Albacete"
    },
    "contacto": {
      "email": "hola@ingenia2.com",
      "telefono": "",
      "web": "https://www.ingenia2.com",
      "linkedin": ""
    },
    "logo": "",
    "verificado": false,
    "lang": "es"
  },
  {
    "nombre": "Perabi Ingenieros",
    "slug": "perabi-ingenieros",
    "tipo": "empresa",
    "especialidades": [
      "ingenieria-industrial",
      "medio-ambiente",
      "consultoria-industrial"
    ],
    "descripcion": "Perabi Ingenieros Albacete, con más de 25 años ofreciendo servicios de Ingeniería, Consultoría y Medio Ambiente. Ingenieros y arquitectos especializados en múltiples áreas del conocimiento técnico.",
    "servicios": [
      "Ingeniería industrial",
      "Ingeniería civil",
      "Medio ambiente",
      "Consultoría",
      "Arquitectura"
    ],
    "ubicacion": {
      "pais": "España",
      "ciudad": "Albacete"
    },
    "contacto": {
      "email": "perabi@perabi.com",
      "telefono": "967 505 330",
      "web": "https://perabi.com",
      "linkedin": ""
    },
    "logo": "",
    "verificado": false,
    "lang": "es"
  },
  {
    "nombre": "ARCADI Ingeniería",
    "slug": "arcadi-ingenieria",
    "tipo": "empresa",
    "especialidades": [
      "ingenieria-industrial",
      "instalaciones",
      "arquitectura"
    ],
    "descripcion": "Empresa de Ingeniería en Ciudad Real con amplia experiencia en diseño, ejecución y mantenimiento de instalaciones del sector terciario, edificación, proyectos arquitectónicos e ingeniería industrial.",
    "servicios": [
      "Ingeniería industrial",
      "Instalaciones",
      "Edificación",
      "Proyectos arquitectónicos",
      "Mantenimiento"
    ],
    "ubicacion": {
      "pais": "España",
      "ciudad": "Ciudad Real"
    },
    "contacto": {
      "email": "info@arcadisl.com",
      "telefono": "926 252 263",
      "web": "https://www.arcadisl.com",
      "linkedin": ""
    },
    "logo": "",
    "verificado": false,
    "lang": "es"
  },
  {
    "nombre": "Ingenio Ostudio",
    "slug": "ingenio-ostudio",
    "tipo": "empresa",
    "especialidades": [
      "ingenieria-industrial",
      "eficiencia-energetica",
      "proyectos-industriales"
    ],
    "descripcion": "Empresa de Ingeniería Industrial y Alimentaria en Albacete. Eficiencia energética, construcción de naves industriales, ayudas y subvenciones, project management.",
    "servicios": [
      "Ingeniería industrial",
      "Eficiencia energética",
      "Naves industriales",
      "Gestión de proyectos",
      "Subvenciones"
    ],
    "ubicacion": {
      "pais": "España",
      "ciudad": "Albacete"
    },
    "contacto": {
      "email": "info@ingenioostudio.es",
      "telefono": "",
      "web": "https://ingenioostudio.es",
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
      const web = d.contacto.web.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
      existingWebs.add(web);
    }
  });

  let added = 0;
  let skipped = 0;

  for (const entry of entries) {
    const webDomain = entry.contacto.web.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
    if (existingSlugs.has(entry.slug) || existingWebs.has(webDomain)) {
      console.log(`SKIP: ${entry.slug} (exists)`);
      skipped++;
      continue;
    }

    const doc = { ...entry, createdAt: new Date().toISOString(), contactoDesbloqueado: false };
    await db.collection(COLLECTION).add(doc);
    console.log(`ADD: ${entry.nombre} (${entry.slug}) - ${entry.ubicacion.ciudad}`);
    added++;
  }
  console.log(`\nDone: ${added} added, ${skipped} skipped`);
}

main().catch(console.error);
