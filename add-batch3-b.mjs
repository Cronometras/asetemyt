import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";

const sa = JSON.parse(readFileSync("/home/ubuntu/projects/articulos-IA---a-Firestore/backup/firebase-service-account-asetemyt.json", "utf8"));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

const empresas = [
  {
    nombre: "Nadico Industrial Management",
    slug: "nadico-industrial",
    tipo: "empresa",
    especialidades: ["ingenieria-industrial", "arquitectura", "consultoria"],
    descripcion: "Ingeniería, Arquitectura y Consultoría Industrial. Soluciones integrales para la optimización de procesos y diseño de instalaciones industriales.",
    servicios: ["Ingeniería Industrial", "Arquitectura", "Consultoría", "Diseño de Instalaciones"],
    ubicacion: { pais: "España", ciudad: "Madrid" },
    contacto: { email: "", telefono: "", web: "https://www.nadico.es/", linkedin: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Intralogistik",
    slug: "intralogistik",
    tipo: "empresa",
    especialidades: ["logistica-interna", "ingenieria-logistica", "automatizacion"],
    descripcion: "Consultoría en logística interna e ingeniería logística. Soluciones para la optimización de flujos de materiales y automatización de almacenes.",
    servicios: ["Logística Interna", "Ingeniería Logística", "Automatización", "Optimización"],
    ubicacion: { pais: "España", ciudad: "Bilbao" },
    contacto: { email: "", telefono: "", web: "https://intralogistik.com/", linkedin: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "InnoGeM",
    slug: "innogem",
    tipo: "empresa",
    especialidades: ["consultoria-industrial", "innovacion", "mejora-continua"],
    descripcion: "Consultoría Industrial e Innovación. Soluciones para la mejora de procesos productivos y la implementación de mejoras innovadoras.",
    servicios: ["Consultoría Industrial", "Innovación", "Mejora Continua", "Optimización"],
    ubicacion: { pais: "España", ciudad: "Madrid" },
    contacto: { email: "", telefono: "", web: "https://innogem.es/", linkedin: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Grupo Tecnitasa",
    slug: "tecnitasa",
    tipo: "empresa",
    especialidades: ["consultoria-industrial", "ingenieria", "proyectos"],
    descripcion: "Grupo de consultoría e ingeniería industrial. Soluciones para el desarrollo de proyectos industriales y optimización de procesos.",
    servicios: ["Consultoría Industrial", "Ingeniería", "Desarrollo de Proyectos", "Optimización"],
    ubicacion: { pais: "España", ciudad: "Madrid" },
    contacto: { email: "tecnitasa@tecnitasa.es", telefono: "+34 9XX XXX 820", web: "https://www.tecnitasa.es/", linkedin: "" },
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
