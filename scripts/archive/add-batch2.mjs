import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";

const sa = JSON.parse(readFileSync("/home/ubuntu/projects/articulos-IA---a-Firestore/backup/firebase-service-account-asetemyt.json", "utf8"));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

const empresas = [
  {
    nombre: "DT Consultores",
    slug: "dt-consultores",
    tipo: "empresa",
    especialidades: ["smed", "reduccion-cambios-formato", "metodos-y-tiempos"],
    descripcion: "Consultores especializados en reducción de tiempos de cambio mediante metodología SMED. Experiencia en optimización de procesos de cambio de formato en plantas industriales.",
    servicios: ["SMED - Reducción de Tiempos de Cambio", "Metodología de Cambio Rápido", "Optimización de Procesos", "Consultoría Industrial"],
    ubicacion: { pais: "España", ciudad: "Madrid" },
    contacto: { email: "easensio@dtconsultores.es", telefono: "+34 6XX XXX 553", web: "https://dtconsultores.es/", linkedin: "" },
    logo: "",
    verificado: false,
    createdAt: new Date().toISOString(),
    lang: "es"
  },
  {
    nombre: "Arrizabalaga Consulting",
    slug: "arrizabalaga-consulting",
    tipo: "consultor",
    especialidades: ["smed", "lean-manufacturing", "industria-40"],
    descripcion: "Consultoría 4.0 Ágil especializada en SMED, cambio rápido de herramientas y formatos. Soluciones Lean para la mejora de eficiencia en plantas industriales.",
    servicios: ["SMED - Cambio Rápido", "Lean Manufacturing", "Industria 4.0", "Consultoría Ágil"],
    ubicacion: { pais: "España", ciudad: "Bilbao" },
    contacto: { email: "arrizabalagab@gmail.com", telefono: "", web: "https://arrizabalagauriarte.com/", linkedin: "" },
    logo: "",
    verificado: false,
    createdAt: new Date().toISOString(),
    lang: "es"
  },
  {
    nombre: "Lean Sigma España",
    slug: "lean-sigma-espana",
    tipo: "empresa",
    especialidades: ["lean-six-sigma", "mejora-continua", "calidad"],
    descripcion: "Consultoría en Lean Six Sigma. Implementación de metodologías de mejora continua y reducción de defectos para optimizar procesos industriales.",
    servicios: ["Lean Six Sigma", "Mejora Continua", "Control Estadístico", "Certificación Belts"],
    ubicacion: { pais: "España", ciudad: "Madrid" },
    contacto: { email: "info@leansigma.es", telefono: "", web: "https://leansigmaespana.com/", linkedin: "" },
    logo: "",
    verificado: false,
    createdAt: new Date().toISOString(),
    lang: "es"
  },
  {
    nombre: "Inprocesa",
    slug: "inprocesa",
    tipo: "empresa",
    especialidades: ["lean-six-sigma", "mejora-continua", "consultoria-procesos"],
    descripcion: "Consultoría en mejora continua, Lean–Six Sigma y optimización de procesos. Soluciones para la eficiencia operativa y reducción de costes.",
    servicios: ["Lean Six Sigma", "Mejora Continua", "Optimización de Procesos", "Consultoría"],
    ubicacion: { pais: "España", ciudad: "Barcelona" },
    contacto: { email: "contacto@inprocessa.mx", telefono: "", web: "https://inprocessa.com/", linkedin: "" },
    logo: "",
    verificado: false,
    createdAt: new Date().toISOString(),
    lang: "es"
  },
  {
    nombre: "AYO Consulting",
    slug: "ayo-consulting",
    tipo: "empresa",
    especialidades: ["lean-six-sigma", "seis-sigma", "consultoria-calidad"],
    descripcion: "Consultoría Lean Six Sigma para empresas. Especialistas en implementación de metodologías Seis Sigma para la mejora de procesos y reducción de variabilidad.",
    servicios: ["Lean Six Sigma", "Seis Sigma", "Control de Calidad", "Mejora de Procesos"],
    ubicacion: { pais: "España", ciudad: "Madrid" },
    contacto: { email: "info@ayoconsulting.es", telefono: "", web: "https://ayoconsulting.es/", linkedin: "" },
    logo: "",
    verificado: false,
    createdAt: new Date().toISOString(),
    lang: "es"
  },
  {
    nombre: "TACTIO",
    slug: "tactio",
    tipo: "empresa",
    especialidades: ["optimizacion-procesos", "eficiencia-operativa", "produccion"],
    descripcion: "Optimización de procesos productivos y eficiencia operativa. Consultoría especializada en la mejora de la productividad industrial.",
    servicios: ["Optimización de Procesos", "Eficiencia Operativa", "Gestión de Producción", "Consultoría Industrial"],
    ubicacion: { pais: "España", ciudad: "Madrid" },
    contacto: { email: "comunicacion@tactio.es", telefono: "+34 900 264 995", web: "https://tactio.es/", linkedin: "" },
    logo: "",
    verificado: false,
    createdAt: new Date().toISOString(),
    lang: "es"
  },
  {
    nombre: "Magenta Management",
    slug: "magenta-management",
    tipo: "empresa",
    especialidades: ["consultoria-operaciones", "produccion", "gestion-empresarial"],
    descripcion: "Consultoría en operaciones y producción. Soluciones para la mejora de la eficiencia operativa y gestión de la producción industrial.",
    servicios: ["Consultoría en Operaciones", "Gestión de Producción", "Optimización", "Mejora Continua"],
    ubicacion: { pais: "España", ciudad: "Madrid" },
    contacto: { email: "info@magentamanagement.es", telefono: "", web: "https://magentamanagement.es/", linkedin: "" },
    logo: "",
    verificado: false,
    createdAt: new Date().toISOString(),
    lang: "es"
  },
  {
    nombre: "Opticore360",
    slug: "opticore360",
    tipo: "empresa",
    especialidades: ["consultoria-lean", "optimizacion-procesos", "mejora-continua"],
    descripcion: "Consultoría Lean especializada en optimización de procesos y mejora continua. Soluciones para la eficiencia productiva y reducción de desperdicios.",
    servicios: ["Consultoría Lean", "Optimización de Procesos", "Mejora Continua", "Eliminación de Desperdicios"],
    ubicacion: { pais: "España", ciudad: "Barcelona" },
    contacto: { email: "info@opticore360.es", telefono: "+34 9XX XXX 150", web: "https://opticore360.es/", linkedin: "" },
    logo: "",
    verificado: false,
    createdAt: new Date().toISOString(),
    lang: "es"
  },
  {
    nombre: "CBtecnia",
    slug: "cbtecnia",
    tipo: "empresa",
    especialidades: ["operaciones-industriales", "gestion-produccion", "consultoria-tecnica"],
    descripcion: "Operaciones industriales y gestión de la producción. Consultoría técnica especializada en la optimización de procesos productivos.",
    servicios: ["Operaciones Industriales", "Gestión de Producción", "Consultoría Técnica", "Optimización"],
    ubicacion: { pais: "España", ciudad: "Barcelona" },
    contacto: { email: "info@cbtecnia.es", telefono: "", web: "https://cbtecnia.es/", linkedin: "" },
    logo: "",
    verificado: false,
    createdAt: new Date().toISOString(),
    lang: "es"
  },
  {
    nombre: "Idelt",
    slug: "idelt",
    tipo: "empresa",
    especialidades: ["consultoria-industrial", "optimizacion-produccion", "eficiencia"],
    descripcion: "Consultoría Industrial Avanzada para Optimizar tu Producción. Soluciones para la mejora de la eficiencia y productividad industrial.",
    servicios: ["Consultoría Industrial", "Optimización de Producción", "Eficiencia Operativa", "Mejora Continua"],
    ubicacion: { pais: "España", ciudad: "Madrid" },
    contacto: { email: "", telefono: "", web: "https://idelt.com/", linkedin: "" },
    logo: "",
    verificado: false,
    createdAt: new Date().toISOString(),
    lang: "es"
  },
  {
    nombre: "PROACIT",
    slug: "proacit",
    tipo: "empresa",
    especialidades: ["transformacion-digital", "industria-40", "consultoria-tecnologica"],
    descripcion: "Transformación digital y consultoría para la industria. Especialistas en la digitalización de procesos productivos y adopción de tecnologías Industria 4.0.",
    servicios: ["Transformación Digital", "Industria 4.0", "Automatización", "Consultoría Tecnológica"],
    ubicacion: { pais: "España", ciudad: "Madrid" },
    contacto: { email: "info@proacit.com", telefono: "", web: "https://proacit.com/", linkedin: "" },
    logo: "",
    verificado: false,
    createdAt: new Date().toISOString(),
    lang: "es"
  },
  {
    nombre: "Geprom",
    slug: "geprom",
    tipo: "empresa",
    especialidades: ["digitalizacion-industrial", "automatizacion", "industria-40"],
    descripcion: "Digitalización y Automatización Industrial. Soluciones para la transformación digital de plantas de producción y optimización de procesos.",
    servicios: ["Digitalización Industrial", "Automatización", "Industria 4.0", "Optimización de Procesos"],
    ubicacion: { pais: "España", ciudad: "Vigo" },
    contacto: { email: "info@geprom.com", telefono: "", web: "https://www.geprom.com/", linkedin: "" },
    logo: "",
    verificado: false,
    createdAt: new Date().toISOString(),
    lang: "es"
  },
  {
    nombre: "Mapex",
    slug: "mapex",
    tipo: "empresa",
    especialidades: ["consultoria-digitalizacion", "industria-40", "mantenimiento"],
    descripcion: "Servicios y Consultoría en Digitalización Industrial. Soluciones para la transformación digital y mantenimiento industrial.",
    servicios: ["Consultoría en Digitalización", "Industria 4.0", "Mantenimiento Industrial", "Optimización"],
    ubicacion: { pais: "España", ciudad: "Barcelona" },
    contacto: { email: "", telefono: "", web: "https://mapex.io/", linkedin: "" },
    logo: "",
    verificado: false,
    createdAt: new Date().toISOString(),
    lang: "es"
  },
  {
    nombre: "BERS Consulteam",
    slug: "bers-consulteam",
    tipo: "empresa",
    especialidades: ["consultoria-industria-40", "transformacion-digital", "automatizacion"],
    descripcion: "Consultoría especializada en Industria 4.0. Soluciones para la transformación digital y automatización de procesos industriales.",
    servicios: ["Industria 4.0", "Transformación Digital", "Automatización", "Consultoría"],
    ubicacion: { pais: "España", ciudad: "Madrid" },
    contacto: { email: "info@bersconsulteam.com", telefono: "", web: "https://www.bersconsulteam.com/", linkedin: "" },
    logo: "",
    verificado: false,
    createdAt: new Date().toISOString(),
    lang: "es"
  },
  {
    nombre: "Digital Enterprise",
    slug: "digital-enterprise",
    tipo: "empresa",
    especialidades: ["consultoria-industria-40", "digitalizacion", "transformacion-digital"],
    descripcion: "Consultoría Industria 4.0 y transformación digital. Soluciones para la digitalización de procesos productivos y adopción de tecnologías avanzadas.",
    servicios: ["Industria 4.0", "Transformación Digital", "Digitalización", "Consultoría"],
    ubicacion: { pais: "España", ciudad: "Madrid" },
    contacto: { email: "", telefono: "", web: "https://www.digitalenterprise.es/", linkedin: "" },
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
