import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";

const sa = JSON.parse(readFileSync("/home/ubuntu/projects/articulos-IA---a-Firestore/backup/firebase-service-account-asetemyt.json", "utf8"));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

const empresas = [
  {
    nombre: "SIMRO Consulting",
    slug: "simro-consulting",
    tipo: "empresa",
    especialidades: ["servicios-industriales", "consultoria-estrategica", "mantenimiento"],
    descripcion: "Consultoría de servicios industriales más transversal del mercado. Desde consultorías estratégicas hasta subcontratación de montajes y mantenimientos mecánicos y eléctricos, tecnología predictiva y formación.",
    servicios: ["Consultoría Estratégica", "Montajes Industriales", "Mantenimiento", "Tecnología Predictiva"],
    ubicacion: { pais: "España", ciudad: "Barcelona" },
    contacto: { email: "info@simroconsulting.com", telefono: "+34 608 288 523", web: "https://simroconsulting.com/", linkedin: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Industrissimus",
    slug: "industrissimus",
    tipo: "empresa",
    especialidades: ["consultoria-industrial", "internacionalizacion", "digitalizacion"],
    descripcion: "Soluciones integrales de consultoría industrial con 30 años de experiencia. Especialistas en ingeniería para internacionalización, digitalización, normativas y más.",
    servicios: ["Consultoría Industrial", "Internacionalización", "Digitalización", "Cumplimiento Normativo"],
    ubicacion: { pais: "España", ciudad: "Madrid" },
    contacto: { email: "industrissimus@industrissimus.com", telefono: "", web: "https://industrissimus.com/es/", linkedin: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "OptimizaPlus Consultores",
    slug: "optimizaplus-consultores",
    tipo: "empresa",
    especialidades: ["mejora-continua", "optimizacion-procesos", "excelencia-operativa"],
    descripcion: "Expertos en Mejora Continua, Optimización de Procesos y Excelencia Operativa. Metodologías de mejora continua, optimización de procesos y formación de equipos internos.",
    servicios: ["Mejora Continua", "Optimización de Procesos", "Excelencia Operativa", "Formación"],
    ubicacion: { pais: "España", ciudad: "Madrid" },
    contacto: { email: "", telefono: "", web: "https://optimizaplusconsultores.com/", linkedin: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Gutiérrez Consultora de Procesos",
    slug: "gutierrez-consultora-procesos",
    tipo: "consultor",
    especialidades: ["consultoria-procesos", "eficiencia-empresarial", "optimizacion"],
    descripcion: "Consultora de procesos en Madrid. Asesoramiento personalizado para la optimización de procesos y mejora de la eficiencia empresarial.",
    servicios: ["Consultoría de Procesos", "Eficiencia Empresarial", "Optimización", "Asesoramiento"],
    ubicacion: { pais: "España", ciudad: "Madrid" },
    contacto: { email: "", telefono: "", web: "https://gutierrezconsultoradeprocesos.es/", linkedin: "" },
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
