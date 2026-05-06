import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";

const sa = JSON.parse(readFileSync("/home/ubuntu/projects/articulos-IA---a-Firestore/backup/firebase-service-account-asetemyt.json", "utf8"));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

const empresas = [
  {
    nombre: "Mazel Asistencia Industrial",
    slug: "mazel",
    tipo: "empresa",
    especialidades: ["ingenieria-industrial", "seguridad-industrial", "consultoria"],
    descripcion: "Empresa valenciana de servicios de ingeniería con presencia en Valencia, Alicante y Castellón. Especialistas en ingeniería industrial, seguridad industrial, seguridad técnico laboral y metodología BIM. Más de 20 años de experiencia acompañando a empresas en sus proyectos.",
    servicios: ["Ingeniería Industrial", "Seguridad Industrial", "Seguridad Técnico Laboral", "Metodología BIM", "Proyectos de Ingeniería", "Asistencia Técnica"],
    ubicacion: { pais: "España", ciudad: "Valencia", direccion: "Valencia, España" },
    contacto: { 
      email: "", 
      telefono: "", 
      web: "https://mazel.es/", 
      linkedin: "https://www.linkedin.com/company/mazel-asistencia-industrial/",
      twitter: ""
    },
    logo: "",
    verificado: false,
    createdAt: new Date().toISOString(),
    lang: "es"
  },
  {
    nombre: "Incotec - Consultoría de Innovación",
    slug: "incotec",
    tipo: "empresa",
    especialidades: ["innovacion", "i-d-i", "consultoria-tecnologica"],
    descripcion: "Consultoría de Innovación e I+D+i. Acompañamos a empresas a través de la innovación eficiente. Especialistas en proyectos de investigación, desarrollo e innovación tecnológica.",
    servicios: ["Consultoría de Innovación", "I+D+i", "Gestión de Proyectos de Innovación", "Búsqueda de Financiación", "Asesoramiento Tecnológico"],
    ubicacion: { pais: "España", ciudad: "Barcelona", direccion: "Carabela La Niña 22, Barcelona, 08017" },
    contacto: { 
      email: "incotec@incotec.es", 
      telefono: "+34 932 06 46 00", 
      web: "https://incotec.es/", 
      linkedin: "",
      twitter: ""
    },
    logo: "",
    verificado: false,
    createdAt: new Date().toISOString(),
    lang: "es"
  },
  {
    nombre: "Nadico Industrial Management",
    slug: "nadico",
    tipo: "empresa",
    especialidades: ["ingenieria-industrial", "arquitectura", "consultoria"],
    descripcion: "Empresa especializada en proyectos de ingeniería y arquitectura, así como en servicios de consultoría. Con 30 años de experiencia, acompañamos a nuestros clientes en el desarrollo de proyectos industriales complejos.",
    servicios: ["Ingeniería Industrial", "Arquitectura", "Consultoría", "Proyectos de Construcción", "Gestión de Proyectos"],
    ubicacion: { pais: "España", ciudad: "Madrid", direccion: "Madrid, España" },
    contacto: { 
      email: "nadico@nadico.net", 
      telefono: "+34 9XX XXX 989", 
      web: "https://nadico.net/", 
      linkedin: "https://www.linkedin.com/company/nadico-industrial-management-s-l/",
      twitter: ""
    },
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
    descripcion: "Consultoría en operaciones y producción industrial. Especialistas en la optimización de procesos productivos, mejora de la eficiencia operativa y gestión de la producción. Trabajamos con PYMES industriales para transformar sus operaciones y lograr resultados medibles.",
    servicios: ["Consultoría en Operaciones", "Gestión de Producción", "Optimización de Procesos", "Mejora Continua", "Lean Manufacturing", "Gestión de Equipos"],
    ubicacion: { pais: "España", ciudad: "Madrid", direccion: "Madrid, España" },
    contacto: { 
      email: "info@magentamanagement.es", 
      telefono: "", 
      web: "https://magentamanagement.es/", 
      linkedin: "",
      twitter: ""
    },
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
    descripcion: "Consultoría Lean especializada en optimización de procesos y mejora continua. Utilizamos metodologías Lean Manufacturing y Agile para mejorar la eficiencia y productividad de las empresas. Enfoque práctico y orientado a resultados.",
    servicios: ["Consultoría Lean", "Optimización de Procesos", "Mejora Continua", "Lean Manufacturing", "Agile", "Eliminación de Desperdicios", "Formación Lean"],
    ubicacion: { pais: "España", ciudad: "Barcelona", direccion: "Barcelona, España" },
    contacto: { 
      email: "info@opticore360.es", 
      telefono: "+34 9XX XXX 150", 
      web: "https://opticore360.es/", 
      linkedin: "",
      twitter: ""
    },
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
