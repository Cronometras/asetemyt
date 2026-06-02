import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";

const sa = JSON.parse(readFileSync("/home/ubuntu/projects/articulos-IA---a-Firestore/backup/firebase-service-account-asetemyt.json", "utf8"));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

const empresas = [
  {
    nombre: "Fluenzia",
    slug: "fluenzia",
    tipo: "empresa",
    especialidades: ["evolucion-industrial", "consultoria-operaciones", "mejora-continua"],
    descripcion: "Hacemos posible la evolución de empresas industriales. Consultoría especializada en la transformación y mejora de operaciones industriales.",
    servicios: ["Evolución Industrial", "Consultoría de Operaciones", "Mejora Continua", "Transformación"],
    ubicacion: { pais: "España", ciudad: "Madrid" },
    contacto: { email: "contacto@fluenzia.es", telefono: "", web: "https://fluenzia.es/", linkedin: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "WNFactor",
    slug: "wnfactor",
    tipo: "empresa",
    especialidades: ["estrategia-operaciones", "consultoria-industrial", "eficiencia"],
    descripcion: "Consultoría Estratégica de Operaciones Industriales. Soluciones para la mejora de la eficiencia y productividad industrial.",
    servicios: ["Estrategia de Operaciones", "Consultoría Industrial", "Eficiencia Operativa", "Optimización"],
    ubicacion: { pais: "España", ciudad: "Madrid" },
    contacto: { email: "info@wnfactor.com", telefono: "+34 615 926 735", web: "https://wnfactor.com/", linkedin: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Ignexum Consulting",
    slug: "ignexum",
    tipo: "empresa",
    especialidades: ["consultoria-operaciones", "pymes-industriales", "optimizacion"],
    descripcion: "Consultoría de Operaciones para PYMES industriales. Soluciones prácticas para la mejora de procesos y eficiencia operativa.",
    servicios: ["Consultoría de Operaciones", "Apoyo a PYMES", "Optimización de Procesos", "Mejora Continua"],
    ubicacion: { pais: "España", ciudad: "Madrid" },
    contacto: { email: "info@ignexum.com", telefono: "", web: "https://ignexum.com/", linkedin: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Synergy Industrials",
    slug: "synergy-industrials",
    tipo: "empresa",
    especialidades: ["ingenieria-procesos", "consultoria-industrial", "optimizacion"],
    descripcion: "Ingeniería en Procesos Industriales. Soluciones para la optimización de procesos productivos y mejora de la eficiencia.",
    servicios: ["Ingeniería de Procesos", "Consultoría Industrial", "Optimización", "Mejora Continua"],
    ubicacion: { pais: "España", ciudad: "Barcelona" },
    contacto: { email: "info@synergyindustrials.com", telefono: "", web: "https://www.synergyindustrials.com/", linkedin: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "JPL Operations Solutions",
    slug: "jpl-operations",
    tipo: "empresa",
    especialidades: ["consultoria-operaciones", "soluciones-industriales", "optimizacion"],
    descripcion: "Consultoría de Operaciones para la industria. Soluciones para la optimización de procesos y mejora de la eficiencia operativa.",
    servicios: ["Consultoría de Operaciones", "Soluciones Industriales", "Optimización", "Mejora Continua"],
    ubicacion: { pais: "España", ciudad: "Madrid" },
    contacto: { email: "info@jplops.com", telefono: "", web: "https://www.jplops.com/", linkedin: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Captia",
    slug: "captia",
    tipo: "empresa",
    especialidades: ["ingenieria-industrial", "consultoria-tecnica", "diseno"],
    descripcion: "Consultoría en ingeniería industrial. Soluciones técnicas para el diseño y optimización de procesos productivos.",
    servicios: ["Ingeniería Industrial", "Consultoría Técnica", "Diseño de Procesos", "Optimización"],
    ubicacion: { pais: "España", ciudad: "Barcelona" },
    contacto: { email: "hola@captia.es", telefono: "", web: "https://www.captia.es/", linkedin: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Robtek",
    slug: "robtek",
    tipo: "empresa",
    especialidades: ["automatizacion-industrial", "robotica", "control-de-procesos"],
    descripcion: "Empresa de automatización industrial en España. Soluciones de robótica y control de procesos para la industria.",
    servicios: ["Automatización Industrial", "Robótica", "Control de Procesos", "Integración"],
    ubicacion: { pais: "España", ciudad: "Valencia" },
    contacto: { email: "contacto@robtek.es", telefono: "+34 603 038 234", web: "https://robtek.es/", linkedin: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "VKS Automatizaciones Industriales",
    slug: "vks-automatizaciones",
    tipo: "empresa",
    especialidades: ["automatizacion-industrial", "robotica", "inteligencia-artificial"],
    descripcion: "Expertos en Automatización Industrial, Robótica e Inteligencia Artificial. Soluciones para la digitalización y automatización de procesos.",
    servicios: ["Automatización Industrial", "Robótica", "IA Industrial", "Digitalización"],
    ubicacion: { pais: "España", ciudad: "Valencia" },
    contacto: { email: "info@vkgrupo.com", telefono: "+34 9XX XXX 500", web: "https://www.vksautomatizacionesindustriales.es/", linkedin: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Cobots Ingeniería",
    slug: "cobots-ingenieria",
    tipo: "empresa",
    especialidades: ["automatizacion-procesos", "cobots", "robotica-colaborativa"],
    descripcion: "Automatización de procesos industriales con robótica colaborativa. Soluciones de cobots para la mejora de productividad.",
    servicios: ["Automatización de Procesos", "Cobots", "Robótica Colaborativa", "Integración"],
    ubicacion: { pais: "España", ciudad: "Barcelona" },
    contacto: { email: "info@cobotsingenieria.com", telefono: "", web: "https://cobotsingenieria.com/", linkedin: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Ingenersun",
    slug: "ingenersun",
    tipo: "empresa",
    especialidades: ["automatizacion-procesos", "ingenieria-industrial", "energia"],
    descripcion: "Empresas de automatización de procesos industriales. Soluciones de ingeniería para la automatización y eficiencia energética.",
    servicios: ["Automatización de Procesos", "Ingeniería Industrial", "Eficiencia Energética", "Consultoría"],
    ubicacion: { pais: "España", ciudad: "Madrid" },
    contacto: { email: "ingenersun@ingenersun.com", telefono: "", web: "https://ingenersun.com/", linkedin: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "IFC Team",
    slug: "ifc-team",
    tipo: "empresa",
    especialidades: ["automatizacion-industrial", "control-industrial", "plcs"],
    descripcion: "Empresa de Automatización Industrial en Barcelona. Soluciones de control industrial y programación de PLCs.",
    servicios: ["Automatización Industrial", "Control Industrial", "Programación PLCs", "Integración"],
    ubicacion: { pais: "España", ciudad: "Barcelona" },
    contacto: { email: "ifcteam@ifcteam.com", telefono: "+34 9XX XXX 107", web: "https://ifcteam.es/", linkedin: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Sualver",
    slug: "sualver",
    tipo: "empresa",
    especialidades: ["automatizacion-industrial", "robotica", "ingenieria"],
    descripcion: "Automatización industrial, robótica e ingeniería. Soluciones para la automatización de procesos productivos.",
    servicios: ["Automatización Industrial", "Robótica", "Ingeniería", "Integración"],
    ubicacion: { pais: "España", ciudad: "Alicante" },
    contacto: { email: "", telefono: "", web: "http://www.sualver.com/", linkedin: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
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

const nuevos = empresas.filter(e => {
  const webBase = e.contacto.web.replace(/^https?:\/\//, '').replace(/\/$/, '').replace(/^www\./, '');
  return !existingSlugs.has(e.slug) && !existingSlugs.has(webBase);
});

console.log("Empresas nuevas a añadir:", nuevos.length);

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
