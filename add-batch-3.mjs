import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import sa from "../../projects/articulos-IA---a-Firestore/backup/firebase-service-account-asetemyt.json" with { type: "json" };

const app = initializeApp({ credential: cert(sa) });
const db = getFirestore();

const COLLECTION = "directorio_consultores_asetemyt";

const entries = [
  {
    "nombre": "Miguel González Deyá Ingeniería",
    "slug": "miguel-gonzalez-deya-ingenieria",
    "tipo": "consultor",
    "especialidades": [
      "ingenieria-industrial",
      "consultoria-industrial",
      "proyectos-industriales"
    ],
    "descripcion": "Ingeniero Industrial en Menorca con más de 20 años de experiencia. Equipo formado en Ingeniería Industrial con colaboradores en todos los sectores técnicos para garantizar el éxito de proyectos industriales.",
    "servicios": [
      "Ingeniería industrial",
      "Proyectos técnicos",
      "Consultoría industrial",
      "Asesoramiento técnico"
    ],
    "ubicacion": {
      "pais": "España",
      "ciudad": "Menorca"
    },
    "contacto": {
      "email": "mgonzalez@iies.es",
      "telefono": "919 308 587",
      "web": "https://www.mg-ingenieria.es",
      "linkedin": ""
    },
    "logo": "",
    "verificado": false,
    "lang": "es"
  },
  {
    "nombre": "Ingeniería Cantabria",
    "slug": "ingenieria-cantabria",
    "tipo": "empresa",
    "especialidades": [
      "ingenieria-industrial",
      "consultoria-industrial",
      "edificacion"
    ],
    "descripcion": "Especialistas en ingeniería industrial, edificación y agronómica en Cantabria. Proyectos, legalizaciones, peritajes y consultoría técnica con rigor y experiencia.",
    "servicios": [
      "Ingeniería industrial",
      "Ingeniería edificación",
      "Peritajes",
      "Consultoría técnica",
      "Legalizaciones"
    ],
    "ubicacion": {
      "pais": "España",
      "ciudad": "Santander"
    },
    "contacto": {
      "email": "jesus@ingenieriacantabria.com",
      "telefono": "",
      "web": "https://www.ingenieriacantabria.com",
      "linkedin": ""
    },
    "logo": "",
    "verificado": false,
    "lang": "es"
  },
  {
    "nombre": "A-GATEIN Ingeniería",
    "slug": "a-gatein-ingenieria",
    "tipo": "empresa",
    "especialidades": [
      "ingenieria-industrial",
      "consultoria-industrial",
      "obras-civiles"
    ],
    "descripcion": "Consultora de Ingeniería en Cantabria especializada en obras civiles, proyectos de infraestructuras y consultoría técnica industrial.",
    "servicios": [
      "Ingeniería civil",
      "Obras públicas",
      "Consultoría técnica",
      "Proyectos industriales"
    ],
    "ubicacion": {
      "pais": "España",
      "ciudad": "Santander"
    },
    "contacto": {
      "email": "info@agatein.es",
      "telefono": "+34 942 391 616",
      "web": "https://agatein.es",
      "linkedin": ""
    },
    "logo": "",
    "verificado": false,
    "lang": "es"
  },
  {
    "nombre": "Gutiérrez y Asociados Consultores",
    "slug": "gutierrez-y-asociados-consultores",
    "tipo": "empresa",
    "especialidades": [
      "ingenieria-industrial",
      "consultoria-industrial",
      "consultoria-tecnica"
    ],
    "descripcion": "Ingeniería y consultoría industrial en Logroño. Grupo de profesionales con amplia y dilatada experiencia conjunta en el sector de la ingeniería y consultoría industrial.",
    "servicios": [
      "Ingeniería industrial",
      "Consultoría industrial",
      "Proyectos técnicos",
      "Asesoramiento industrial"
    ],
    "ubicacion": {
      "pais": "España",
      "ciudad": "Logroño"
    },
    "contacto": {
      "email": "mlgg@gutierrezyasociados.net",
      "telefono": "941 501 557",
      "web": "https://www.gutierrezyasociadosconsultores.com",
      "linkedin": ""
    },
    "logo": "",
    "verificado": false,
    "lang": "es"
  },
  {
    "nombre": "INTEKNIA",
    "slug": "inteknia",
    "tipo": "empresa",
    "especialidades": [
      "consultoria-industrial",
      "consultoria-tecnologica",
      "energia"
    ],
    "descripcion": "Empresa de consultoría de base tecnológica en La Rioja. Orientación y asesoramiento experto para mejorar los procesos tecnológicos en empresas del sector industrial.",
    "servicios": [
      "Consultoría tecnológica industrial",
      "Dirección de obras",
      "Puesta en marcha",
      "Pre-auditorías",
      "Instalación solar"
    ],
    "ubicacion": {
      "pais": "España",
      "ciudad": "Logroño"
    },
    "contacto": {
      "email": "info@inteknia.com",
      "telefono": "928 921 636",
      "web": "https://inteknia.com",
      "linkedin": ""
    },
    "logo": "",
    "verificado": false,
    "lang": "es"
  },
  {
    "nombre": "Soltein",
    "slug": "soltein",
    "tipo": "empresa",
    "especialidades": [
      "ingenieria-industrial",
      "consultoria-industrial",
      "eficiencia-energetica"
    ],
    "descripcion": "Consultoría experta en ingeniería industrial en Badajoz. Conocimientos, experiencia y equipo altamente cualificado para conseguir mayor eficiencia, reducción de costos y mejora de calidad.",
    "servicios": [
      "Ingeniería industrial",
      "Eficiencia energética",
      "Gestión urbanística",
      "Consultoría ambiental",
      "Anteproyectos"
    ],
    "ubicacion": {
      "pais": "España",
      "ciudad": "Badajoz"
    },
    "contacto": {
      "email": "info@soltein.com",
      "telefono": "924 286 742",
      "web": "https://www.soltein.es",
      "linkedin": ""
    },
    "logo": "",
    "verificado": false,
    "lang": "es"
  },
  {
    "nombre": "IPROGEX Ingeniería",
    "slug": "iprogex-ingenieria",
    "tipo": "empresa",
    "especialidades": [
      "ingenieria-industrial",
      "consultoria-industrial",
      "proyectos-industriales"
    ],
    "descripcion": "Consultoría de Ingeniería en Badajoz desde 1996. Empresa de referencia en asesoramiento integral para proyectos de inversión industrial en Extremadura.",
    "servicios": [
      "Ingeniería industrial",
      "Proyectos de inversión",
      "Asesoramiento integral",
      "Consultoría técnica"
    ],
    "ubicacion": {
      "pais": "España",
      "ciudad": "Badajoz"
    },
    "contacto": {
      "email": "iprogex@iprogex.com",
      "telefono": "+34 924 260 749",
      "web": "https://iprogex.com",
      "linkedin": ""
    },
    "logo": "",
    "verificado": false,
    "lang": "es"
  },
  {
    "nombre": "S&K Ingenieros",
    "slug": "sk-ingenieros",
    "tipo": "empresa",
    "especialidades": [
      "ingenieria-industrial",
      "consultoria-industrial",
      "consultoria-tecnica"
    ],
    "descripcion": "Ingeniería y consultoría técnica en Palencia. Expertos en ingeniería industrial, civil, arquitectura y telecomunicaciones. Servicios de consultoría técnico y legal. Proyectos llave en mano.",
    "servicios": [
      "Ingeniería industrial",
      "Ingeniería civil",
      "Arquitectura",
      "Telecomunicaciones",
      "Consultoría técnico-legal"
    ],
    "ubicacion": {
      "pais": "España",
      "ciudad": "Palencia"
    },
    "contacto": {
      "email": "info@skingenieros.es",
      "telefono": "",
      "web": "https://skingenieros.es",
      "linkedin": ""
    },
    "logo": "",
    "verificado": false,
    "lang": "es"
  },
  {
    "nombre": "IPSA Ingenieros",
    "slug": "ipsa-ingenieros",
    "tipo": "empresa",
    "especialidades": [
      "ingenieria-industrial",
      "mineria",
      "consultoria-industrial"
    ],
    "descripcion": "Empresa de ingeniería integral en Salamanca. Redacción de proyectos de minería, obra civil, proyectos industriales y consultoría técnica.",
    "servicios": [
      "Ingeniería integral",
      "Proyectos de minería",
      "Obra civil",
      "Proyectos industriales",
      "Consultoría técnica"
    ],
    "ubicacion": {
      "pais": "España",
      "ciudad": "Salamanca"
    },
    "contacto": {
      "email": "info@ipsaingenieros.com",
      "telefono": "",
      "web": "https://ipsaingenieros.com",
      "linkedin": ""
    },
    "logo": "",
    "verificado": false,
    "lang": "es"
  },
  {
    "nombre": "Salamanca Ingenieros",
    "slug": "salamanca-ingenieros",
    "tipo": "empresa",
    "especialidades": [
      "ingenieria-industrial",
      "energia",
      "consultoria-industrial"
    ],
    "descripcion": "Ingeniería industrial y civil en Salamanca. Servicios de minería, energías renovables, energía fotovoltaica, ATEX, consultoría y gestión de proyectos llave en mano.",
    "servicios": [
      "Ingeniería industrial",
      "Energías renovables",
      "Minería",
      "Consultoría ATEX",
      "Gestión de proyectos"
    ],
    "ubicacion": {
      "pais": "España",
      "ciudad": "Salamanca"
    },
    "contacto": {
      "email": "empresa.sal-ing@salamanca-ing.com",
      "telefono": "+34 923 197 729",
      "web": "https://salamanca-ing.com",
      "linkedin": ""
    },
    "logo": "",
    "verificado": false,
    "lang": "es"
  },
  {
    "nombre": "Arvo Consultores y Tecnología",
    "slug": "arvo-consultores",
    "tipo": "empresa",
    "especialidades": [
      "consultoria-industrial",
      "tecnologia",
      "consultoria-tecnologica"
    ],
    "descripcion": "Arvo Consultores y Tecnología, con sede en el Polígono Industrial de Olloniego, Oviedo. Consultoría y tecnología para empresas industriales en Asturias.",
    "servicios": [
      "Consultoría industrial",
      "Tecnología industrial",
      "Asesoramiento técnico"
    ],
    "ubicacion": {
      "pais": "España",
      "ciudad": "Oviedo"
    },
    "contacto": {
      "email": "",
      "telefono": "985 790 459",
      "web": "https://www.arvo.es",
      "linkedin": ""
    },
    "logo": "",
    "verificado": false,
    "lang": "es"
  },
  {
    "nombre": "Audico Consultores",
    "slug": "audico-consultores",
    "tipo": "empresa",
    "especialidades": [
      "consultoria-industrial",
      "calidad",
      "formacion"
    ],
    "descripcion": "Audico Consultores, formado por profesionales con alta cualificación y larga experiencia en la implantación, auditorías y formación de Sistemas de Gestión en organizaciones de múltiples sectores.",
    "servicios": [
      "Sistemas de Gestión",
      "Auditorías",
      "Formación",
      "Consultoría industrial"
    ],
    "ubicacion": {
      "pais": "España",
      "ciudad": "Oviedo"
    },
    "contacto": {
      "email": "",
      "telefono": "985 255 011",
      "web": "https://audicoconsultores.com",
      "linkedin": ""
    },
    "logo": "",
    "verificado": false,
    "lang": "es"
  },
  {
    "nombre": "Enginyers Bosch",
    "slug": "enginyers-bosch",
    "tipo": "empresa",
    "especialidades": [
      "ingenieria-industrial",
      "consultoria-industrial",
      "proyectos-industriales"
    ],
    "descripcion": "Estudio de Ingeniería ubicado en Ciutadella de Menorca, dedicado al ámbito de la Ingeniería Industrial desde 1985. Más de 40 años y 3.500 expedientes en el sector.",
    "servicios": [
      "Ingeniería industrial",
      "Proyectos industriales",
      "Consultoría técnica"
    ],
    "ubicacion": {
      "pais": "España",
      "ciudad": "Ciutadella de Menorca"
    },
    "contacto": {
      "email": "",
      "telefono": "976 542 952",
      "web": "https://www.enginyersbosch.com",
      "linkedin": ""
    },
    "logo": "",
    "verificado": false,
    "lang": "es"
  }
];

async function main() {
  // Get existing slugs
  const snap = await db.collection(COLLECTION).get();
  const existingSlugs = new Set();
  snap.forEach(doc => {
    const d = doc.data();
    if (d.slug) existingSlugs.add(d.slug);
  });

  let added = 0;
  let skipped = 0;

  for (const entry of entries) {
    if (existingSlugs.has(entry.slug)) {
      console.log(`SKIP (exists): ${entry.slug}`);
      skipped++;
      continue;
    }

    const doc = {
      ...entry,
      createdAt: new Date().toISOString(),
      contactoDesbloqueado: false,
    };

    await db.collection(COLLECTION).add(doc);
    console.log(`ADD: ${entry.nombre} (${entry.slug}) - ${entry.ubicacion.ciudad}`);
    added++;
  }

  console.log(`\nDone: ${added} added, ${skipped} skipped`);
}

main().catch(console.error);
