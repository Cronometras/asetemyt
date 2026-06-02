import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";

const sa = JSON.parse(readFileSync("/home/ubuntu/projects/articulos-IA---a-Firestore/backup/firebase-service-account-asetemyt.json", "utf8"));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

const empresasNuevas = [
  {
    nombre: "Eficindu",
    slug: "eficindu",
    tipo: "empresa",
    especialidades: ["eficiencia-industrial", "mejora-procesos", "consultoria-industrial"],
    descripcion: "Soluciones de Eficiencia Industrial para empresas del sector productivo. Especialistas en optimización de procesos y mejora de la eficiencia operativa.",
    servicios: ["Eficiencia Industrial", "Optimización de Procesos", "Mejora de Productividad", "Consultoría"],
    ubicacion: { pais: "España", ciudad: "Barcelona" },
    contacto: { web: "https://eficindu.com/", email: "", telefono: "", linkedin: "" },
    logo: "",
    verificado: false,
    createdAt: new Date().toISOString(),
    lang: "es"
  },
  {
    nombre: "SCS Consultores",
    slug: "scs-consultores",
    tipo: "empresa",
    especialidades: ["tpm", "mantenimiento-productivo", "mejora-continua"],
    descripcion: "Consultores especializados en TPM (Total Productive Maintenance) y mantenimiento productivo total. Implementación de sistemas de mantenimiento para mejorar la disponibilidad y eficiencia de equipos.",
    servicios: ["TPM - Mantenimiento Productivo Total", "Mantenimiento Predictivo", "Mejora Continua", "Formación"],
    ubicacion: { pais: "España", ciudad: "Madrid" },
    contacto: { web: "https://scsconsultores.com/", email: "", telefono: "", linkedin: "" },
    logo: "",
    verificado: false,
    createdAt: new Date().toISOString(),
    lang: "es"
  },
  {
    nombre: "Redes Consultoría",
    slug: "redes-consultoria",
    tipo: "empresa",
    especialidades: ["tpm", "mantenimiento-predictivo", "inteligencia-artificial"],
    descripcion: "TPM y mantenimiento predictivo con IA en España. Consultoría de mejora continua y mantenimiento inteligente para optimizar la gestión de activos industriales.",
    servicios: ["TPM", "Mantenimiento Predictivo con IA", "Mejora Continua", "Gestión de Activos"],
    ubicacion: { pais: "España", ciudad: "Madrid" },
    contacto: { web: "https://www.redesconsultoria.com/", email: "", telefono: "", linkedin: "" },
    logo: "",
    verificado: false,
    createdAt: new Date().toISOString(),
    lang: "es"
  },
  {
    nombre: "Consultoría ITC",
    slug: "consultoria-itc",
    tipo: "empresa",
    especialidades: ["tpm", "mantenimiento-industrial", "consultoria-technica"],
    descripcion: "Consultoría técnica especializada en mantenimiento TPM y optimización de procesos productivos. Soluciones para mejorar la eficiencia y fiabilidad de equipos industriales.",
    servicios: ["Mantenimiento TPM", "Optimización de Procesos", "Consultoría Técnica", "Formación"],
    ubicacion: { pais: "España", ciudad: "Barcelona" },
    contacto: { web: "https://consultoriaitc.com/", email: "", telefono: "", linkedin: "" },
    logo: "",
    verificado: false,
    createdAt: new Date().toISOString(),
    lang: "es"
  },
  {
    nombre: "CROC Consultoría",
    slug: "croc-consultoria",
    tipo: "empresa",
    especialidades: ["tpm", "mantenimiento-productivo", "mejora-continua"],
    descripcion: "Consultoría en Mantenimiento Productivo Total (TPM). Especialistas en implementar sistemas de mantenimiento para mejorar la disponibilidad y eficiencia de equipos.",
    servicios: ["Mantenimiento Productivo Total TPM", "Consultoría Industrial", "Mejora Continua", "Optimización"],
    ubicacion: { pais: "España", ciudad: "Madrid" },
    contacto: { web: "https://crocconsultoria.com/", email: "", telefono: "", linkedin: "" },
    logo: "",
    verificado: false,
    createdAt: new Date().toISOString(),
    lang: "es"
  },
  {
    nombre: "Ingeniería Directa",
    slug: "ingenieria-directa",
    tipo: "empresa",
    especialidades: ["ingenieria-industrial", "consultoria", "procesos"],
    descripcion: "Consultora de Ingeniería especializada en procesos industriales. Soluciones de ingeniería para la optimización de procesos productivos y mejora de la eficiencia.",
    servicios: ["Ingeniería Industrial", "Consultoría de Procesos", "Optimización Productiva", "Diseño Industrial"],
    ubicacion: { pais: "España", ciudad: "Madrid" },
    contacto: { web: "https://directoingenieria.com/", email: "", telefono: "", linkedin: "" },
    logo: "",
    verificado: false,
    createdAt: new Date().toISOString(),
    lang: "es"
  },
  {
    nombre: "G3M Operational Consulting",
    slug: "g3m-operational-consulting",
    tipo: "empresa",
    especialidades: ["consultoria-operacional", "lean-manufacturing", "mejora-procesos"],
    descripcion: "Empresa de consultoría operacional con oficinas en Madrid, Vigo y Barcelona. Especialistas en Lean Manufacturing y mejora de procesos industriales.",
    servicios: ["Consultoría Operacional", "Lean Manufacturing", "Mejora de Procesos", "Optimización"],
    ubicacion: { pais: "España", ciudad: "Madrid" },
    contacto: { web: "https://g3m.es/", email: "", telefono: "", linkedin: "" },
    logo: "",
    verificado: false,
    createdAt: new Date().toISOString(),
    lang: "es"
  },
  {
    nombre: "Ep Ingeniería y Proceso",
    slug: "ep-ingenieria-proceso",
    tipo: "empresa",
    especialidades: ["consultoria-organizacion-industrial", "ingenieria-procesos", "optimizacion"],
    descripcion: "Especialistas en Consultoría Industrial y organización. Ingeniería de procesos y optimización de operaciones para mejorar la eficiencia productiva.",
    servicios: ["Consultoría Organización Industrial", "Ingeniería de Procesos", "Optimización Operativa", "Mejora Continua"],
    ubicacion: { pais: "España", ciudad: "Madrid" },
    contacto: { web: "https://epingenieriayproceso.com/", email: "", telefono: "", linkedin: "" },
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
const nuevos = empresasNuevas.filter(e => {
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
