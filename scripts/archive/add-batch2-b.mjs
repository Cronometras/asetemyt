import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";

const sa = JSON.parse(readFileSync("/home/ubuntu/projects/articulos-IA---a-Firestore/backup/firebase-service-account-asetemyt.json", "utf8"));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

const empresas = [
  {
    nombre: "Logistalfa",
    slug: "logistalfa",
    tipo: "empresa",
    especialidades: ["logistica-industrial", "ingenieria-logistica", "optimizacion-almacenaje"],
    descripcion: "Empresa de consultoría logística e ingeniería. Especialistas en optimización de flujos de materiales, diseño de almacenes y mejora de procesos logísticos industriales.",
    servicios: ["Consultoría Logística", "Ingeniería Logística", "Diseño de Almacenes", "Optimización de Flujos"],
    ubicacion: { pais: "España", ciudad: "Barcelona" },
    contacto: { email: "logistalfa@logistalfa.com", telefono: "+34 933 939 263", web: "https://www.logistalfa.com/", linkedin: "" },
    logo: "",
    verificado: false,
    createdAt: new Date().toISOString(),
    lang: "es"
  },
  {
    nombre: "AB Brain",
    slug: "ab-brain",
    tipo: "empresa",
    especialidades: ["logistica-industrial", "ingenieria-logistica", "consultoria"],
    descripcion: "Consultoría Logística e Ingeniería Logística. Soluciones para la optimización de procesos logísticos y cadena de suministro.",
    servicios: ["Consultoría Logística", "Ingeniería Logística", "Cadena de Suministro", "Optimización"],
    ubicacion: { pais: "España", ciudad: "Barcelona" },
    contacto: { email: "", telefono: "", web: "https://abbrain.com/", linkedin: "" },
    logo: "",
    verificado: false,
    createdAt: new Date().toISOString(),
    lang: "es"
  },
  {
    nombre: "LPM Logistics",
    slug: "lpm-logistics",
    tipo: "empresa",
    especialidades: ["consultoria-logistica", "cadena-suministro", "distribucion"],
    descripcion: "Consultoría logística con más de 20 años de experiencia. Especialistas en optimización de cadena de suministro y procesos de distribución.",
    servicios: ["Consultoría Logística", "Cadena de Suministro", "Distribución", "Optimización"],
    ubicacion: { pais: "España", ciudad: "Madrid" },
    contacto: { email: "", telefono: "+34 9XX XXX 357", web: "https://logisticspm.com/", linkedin: "" },
    logo: "",
    verificado: false,
    createdAt: new Date().toISOString(),
    lang: "es"
  },
  {
    nombre: "CMG Consultores",
    slug: "cmg-consultores",
    tipo: "empresa",
    especialidades: ["supply-chain", "consultoria-logistica", "optimizacion-procesos"],
    descripcion: "Consultoría Supply Chain. Soluciones para la optimización de cadenas de suministro y procesos logísticos industriales.",
    servicios: ["Consultoría Supply Chain", "Optimización de Procesos", "Logística Industrial", "Gestión"],
    ubicacion: { pais: "España", ciudad: "Madrid" },
    contacto: { email: "", telefono: "+34 913 579 025", web: "https://cmgconsultores.com/", linkedin: "" },
    logo: "",
    verificado: false,
    createdAt: new Date().toISOString(),
    lang: "es"
  },
  {
    nombre: "Catena Consulting",
    slug: "catena-consulting",
    tipo: "empresa",
    especialidades: ["optimizacion-supply-chain", "logistica", "ahorro-costes"],
    descripcion: "Optimización Supply Chain con 30% de ahorro típico. Consultoría especializada en la mejora de eficiencia de cadenas de suministro.",
    servicios: ["Optimización Supply Chain", "Reducción de Costes", "Logística", "Consultoría"],
    ubicacion: { pais: "España", ciudad: "Barcelona" },
    contacto: { email: "", telefono: "", web: "https://www.catenaconsulting.es/", linkedin: "" },
    logo: "",
    verificado: false,
    createdAt: new Date().toISOString(),
    lang: "es"
  },
  {
    nombre: "Movint",
    slug: "movint",
    tipo: "empresa",
    especialidades: ["logistica-industrial", "estudios-mejora", "almacenaje"],
    descripcion: "Consultoría logística, estudios de mejora en almacenaje. Soluciones para la optimización de procesos de almacenamiento y distribución.",
    servicios: ["Consultoría Logística", "Estudios de Mejora", "Almacenaje", "Optimización"],
    ubicacion: { pais: "España", ciudad: "Barcelona" },
    contacto: { email: "info@movint.es", telefono: "+34 9XX XXX 333", web: "https://www.movint.es/", linkedin: "" },
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
