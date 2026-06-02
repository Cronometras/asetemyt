import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";

const sa = JSON.parse(readFileSync("/home/ubuntu/projects/articulos-IA---a-Firestore/backup/firebase-service-account-asetemyt.json", "utf8"));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

const empresas = [
  {
    nombre: "COE Lean",
    slug: "coe-lean",
    tipo: "empresa",
    especialidades: ["lean-manufacturing", "consultoria-lean", "produccion-esbelta"],
    descripcion: "Consultoría Lean especializada en producción esbelta y mejora continua. Soluciones para la optimización de procesos productivos.",
    servicios: ["Consultoría Lean", "Producción Esbelta", "Mejora Continua", "Optimización"],
    ubicacion: { pais: "España", ciudad: "Barcelona" },
    contacto: { email: "", telefono: "", web: "https://coelean.consulting/", linkedin: "" },
    logo: "",
    verificado: false,
    createdAt: new Date().toISOString(),
    lang: "es"
  },
  {
    nombre: "Icaria Technology",
    slug: "icaria-technology",
    tipo: "empresa",
    especialidades: ["produccion-lean", "lean-factory", "automatizacion"],
    descripcion: "Producción Lean y Lean Factory. Soluciones tecnológicas para la implementación de sistemas de producción esbelta.",
    servicios: ["Producción Lean", "Lean Factory", "Automatización", "Tecnología Industrial"],
    ubicacion: { pais: "España", ciudad: "Barcelona" },
    contacto: { email: "", telefono: "", web: "https://icariatechnology.com/", linkedin: "" },
    logo: "",
    verificado: false,
    createdAt: new Date().toISOString(),
    lang: "es"
  },
  {
    nombre: "Ingeniia",
    slug: "ingeniia",
    tipo: "empresa",
    especialidades: ["lean-manufacturing", "consultoria-ingenieria", "optimizacion"],
    descripcion: "Consultoría en Lean Manufacturing. Especialistas en la implementación de metodologías Lean para la optimización de procesos industriales.",
    servicios: ["Lean Manufacturing", "Consultoría de Ingeniería", "Optimización", "Mejora Continua"],
    ubicacion: { pais: "España", ciudad: "Madrid" },
    contacto: { email: "contacto@ingeniia.com", telefono: "", web: "https://ingeniia.com/", linkedin: "" },
    logo: "",
    verificado: false,
    createdAt: new Date().toISOString(),
    lang: "es"
  },
  {
    nombre: "Vision Lean",
    slug: "vision-lean",
    tipo: "empresa",
    especialidades: ["lean-manufacturing", "consultoria-lean", "mejora-continua"],
    descripcion: "Consultoría Lean con visión integral. Especialistas en la implementación de sistemas de mejora continua y optimización de procesos productivos.",
    servicios: ["Consultoría Lean", "Mejora Continua", "Optimización de Procesos", "Formación"],
    ubicacion: { pais: "España", ciudad: "Madrid" },
    contacto: { email: "info@visionlean.es", telefono: "+34 619 624 519", web: "https://www.visionlean.es/", linkedin: "" },
    logo: "",
    verificado: false,
    createdAt: new Date().toISOString(),
    lang: "es"
  },
  {
    nombre: "Speaker Consultores",
    slug: "speaker-consultores",
    tipo: "empresa",
    especialidades: ["estrategia-organizacional", "consultoria-gestion", "liderazgo"],
    descripcion: "Firma de consultoría de estrategia organizacional. Soluciones para la mejora de la eficiencia organizacional y el liderazgo empresarial.",
    servicios: ["Estrategia Organizacional", "Consultoría de Gestión", "Liderazgo", "Desarrollo Organizacional"],
    ubicacion: { pais: "España", ciudad: "Madrid" },
    contacto: { email: "info@speakercc.com", telefono: "", web: "https://speakercc.com/", linkedin: "" },
    logo: "",
    verificado: false,
    createdAt: new Date().toISOString(),
    lang: "es"
  }
];

// Verificar duplicados
const existingSnap = await db.collection("directorio_consultores_asetemyt").get();
const existingSlugs = new Set();
existingSnap.forEach(doc => {
  const d = doc.data();
  if (d.slug) existingSlugs.add(d.slug);
  if (d.contacto?.web) {
    const webBase = d.contacto.web.replace(/^https?:\/\//, '').replace(/\/$/, '').replace(/^www\./, '');
    existingSlugs.add(webBase);
  }
});

console.log("Slugs existentes:", existingSlugs.size);

// Filtrar nuevos
const nuevos = empresas.filter(e => {
  const webBase = e.contacto.web.replace(/^https?:\/\//, '').replace(/\/$/, '').replace(/^www\./, '');
  return !existingSlugs.has(e.slug) && !existingSlugs.has(webBase);
});

console.log("Empresas nuevas a añadir:", nuevos.length);

// Insertar en Firestore
let added = 0;
for (const empresa of nuevos) {
  try {
    await db.collection("directorio_consultores_asetemyt").add(empresa);
    console.log(`✅ Añadida: ${empresa.nombre}`);
    added++;
  } catch (e) {
    console.error(`❌ Error añadiendo ${empresa.nombre}:`, e.message);
  }
}

console.log(`\nTotal añadidas: ${added}/${nuevos.length}`);
process.exit(0);
