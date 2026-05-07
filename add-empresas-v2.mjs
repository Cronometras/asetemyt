import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const app = initializeApp({
  credential: cert("/home/ubuntu/projects/articulos-IA---a-Firestore/backup/firebase-service-account-asetemyt.json"),
});
const db = getFirestore(app);

const snap = await db.collection("directorio_consultores_asetemyt").get();
const existingWebs = new Set();
snap.forEach(doc => {
  const d = doc.data();
  if (d.contacto?.web) {
    const web = d.contacto.web.replace(/^https?:\/\//, "").replace(/\/$/, "").replace(/^www\./, "").toLowerCase();
    existingWebs.add(web);
  }
});

const now = new Date().toISOString();

const empresas = [
  {
    nombre: "Escuela de Lean Management",
    slug: "escuela-lean-management",
    tipo: "empresa",
    especialidades: ["lean management", "lean manufacturing", "formación lean"],
    descripcion: "Consultoría y formación en Lean Management y Lean Manufacturing. Especializada en estrategia y operaciones para empresas industriales en Andalucía.",
    servicios: ["Consultoría Lean Management", "Formación Lean Manufacturing", "Estrategia operativa", "Mejora continua"],
    ubicacion: { pais: "España", ciudad: "Málaga" },
    contacto: { email: "info@escuelalean.es", telefono: "", web: "https://leanmalaga.es", linkedin: "" },
    logo: "", verificado: false, createdAt: now, lang: "es"
  },
  {
    nombre: "Grupo Desarrolla",
    slug: "grupo-desarrolla",
    tipo: "empresa",
    especialidades: ["lean manufacturing", "ventas industriales", "formación", "marketing industrial"],
    descripcion: "Consultoría especializada en Lean Manufacturing, ventas, formación y marketing industrial. Con sede en Almería, dan servicio a toda Andalucía.",
    servicios: ["Lean Manufacturing", "Consultoría de ventas", "Formación industrial", "Marketing industrial"],
    ubicacion: { pais: "España", ciudad: "Almería" },
    contacto: { email: "desarrolla@desarrollaconsultores.com", telefono: "", web: "https://desarrollagrupo.com", linkedin: "" },
    logo: "", verificado: false, createdAt: now, lang: "es"
  },
  {
    nombre: "Alpha Calidad",
    slug: "alpha-calidad",
    tipo: "empresa",
    especialidades: ["mantenimiento", "KPIs", "automatización", "sistemas a medida"],
    descripcion: "Soluciones integrales para optimizar procesos: mantenimiento, KPIs, automatización con IA y sistemas a medida para industrias en Almería.",
    servicios: ["Mantenimiento industrial", "KPIs y métricas", "Automatización con IA", "Sistemas a medida"],
    ubicacion: { pais: "España", ciudad: "Almería" },
    contacto: { email: "", telefono: "", web: "https://alphacalidad.com", linkedin: "" },
    logo: "", verificado: false, createdAt: now, lang: "es"
  },
  {
    nombre: "Consultores León y Asociados",
    slug: "consultores-leon",
    tipo: "empresa",
    especialidades: ["productividad", "calidad", "ventas industriales"],
    descripcion: "Consultoría en productividad, calidad y ventas para empresas industriales. Mejora operativa en la región de León.",
    servicios: ["Consultoría de productividad", "Gestión de calidad", "Ventas industriales", "Mejora operativa"],
    ubicacion: { pais: "España", ciudad: "León" },
    contacto: { email: "", telefono: "", web: "https://consultoresleon.com", linkedin: "" },
    logo: "", verificado: false, createdAt: now, lang: "es"
  },
  {
    nombre: "Kaizen Integral",
    slug: "kaizen-integral",
    tipo: "empresa",
    especialidades: ["kaizen", "innovación", "tecnología", "desarrollo de negocio"],
    descripcion: "Consultora de innovación, tecnología y desarrollo de negocio. Soluciones de mejora continua y kaizen para organizaciones en el País Vasco.",
    servicios: ["Consultoría Kaizen", "Innovación empresarial", "Desarrollo de negocio", "Mejora continua"],
    ubicacion: { pais: "España", ciudad: "Irún" },
    contacto: { email: "kaizenintegral@kaizenintegral.es", telefono: "+34 613 133 604", web: "http://kaizenintegral.es", linkedin: "" },
    logo: "", verificado: false, createdAt: now, lang: "es"
  },
  {
    nombre: "Ohno Consultores",
    slug: "ohno-consultores",
    tipo: "empresa",
    especialidades: ["organización industrial", "lean manufacturing", "six sigma"],
    descripcion: "Consultora de organización industrial especializada en Lean Manufacturing y Six Sigma. Optimización de procesos para empresas gallegas.",
    servicios: ["Organización industrial", "Lean Manufacturing", "Six Sigma", "Optimización de procesos"],
    ubicacion: { pais: "España", ciudad: "Pontevedra" },
    contacto: { email: "info@ohnoconsultores.com", telefono: "", web: "https://ohnoconsultores.com", linkedin: "" },
    logo: "", verificado: false, createdAt: now, lang: "es"
  },
  {
    nombre: "Metodología y Tiempos",
    slug: "metodologia-y-tiempos",
    tipo: "freelance",
    especialidades: ["análisis de métodos", "medición de tiempos", "cronometraje", "optimización"],
    descripcion: "Analista de métodos y tiempos. Optimización de tiempos en empresas, implementación de metodologías de medición industrial. Servicios en La Rioja.",
    servicios: ["Análisis de métodos", "Medición de tiempos", "Cronometraje industrial", "Optimización de procesos"],
    ubicacion: { pais: "España", ciudad: "Logroño" },
    contacto: { email: "", telefono: "", web: "https://www.metodologiaytiempos.com", linkedin: "" },
    logo: "", verificado: false, createdAt: now, lang: "es"
  },
  {
    nombre: "Industria Navarra 40",
    slug: "industria-navarra-40",
    tipo: "empresa",
    especialidades: ["lean manufacturing", "mejora continua", "organización industrial"],
    descripcion: "Fundación dedicada a la consultoría Lean Manufacturing para mejora continua. Metodologías de organización industrial y tecnologías innovadoras en Navarra.",
    servicios: ["Consultoría Lean Manufacturing", "Mejora continua", "Organización industrial", "Tecnología innovadora"],
    ubicacion: { pais: "España", ciudad: "Navarra" },
    contacto: { email: "", telefono: "", web: "https://www.industrianavarra40.com", linkedin: "" },
    logo: "", verificado: false, createdAt: now, lang: "es"
  },
  {
    nombre: "Escosura - Escotronics",
    slug: "escosura-escotronics",
    tipo: "empresa",
    especialidades: ["ingeniería industrial", "diseño de producto", "automatización", "optimización de producción"],
    descripcion: "Ingeniería Industrial y Diseño de Producto. Consultoría y automatización industrial, optimización de producción en la provincia de Girona.",
    servicios: ["Ingeniería Industrial", "Diseño de Producto", "Automatización industrial", "Optimización de producción"],
    ubicacion: { pais: "España", ciudad: "Girona" },
    contacto: { email: "", telefono: "", web: "https://escotronics.es", linkedin: "" },
    logo: "", verificado: false, createdAt: now, lang: "es"
  },
  {
    nombre: "Summum Consulting",
    slug: "summum-consulting",
    tipo: "empresa",
    especialidades: ["kaizen", "six sigma", "lean manufacturing", "mejora de procesos"],
    descripcion: "Consultora de mejora de procesos y aumento de productividad. Especializada en Kaizen, Six Sigma y Lean Manufacturing. Formación y consultoría en León.",
    servicios: ["Kaizen", "Six Sigma", "Lean Manufacturing", "Formación y consultoría"],
    ubicacion: { pais: "España", ciudad: "León" },
    contacto: { email: "info@summumconsulting.com", telefono: "+34 652 792 035", web: "https://www.summumconsulting.com", linkedin: "" },
    logo: "", verificado: false, createdAt: now, lang: "es"
  },
  {
    nombre: "H2W Systems",
    slug: "h2w-systems",
    tipo: "empresa",
    especialidades: ["oee", "productividad", "indicadores", "análisis de paradas"],
    descripcion: "Consultoría OEE y productividad. Estructuración de indicadores de productividad, análisis de paradas, cadencias y rechazos industriales.",
    servicios: ["Consultoría OEE", "Indicadores de productividad", "Análisis de paradas", "Reducción de rechazos"],
    ubicacion: { pais: "España", ciudad: "España" },
    contacto: { email: "h2w@h2wsystems.com", telefono: "", web: "https://h2wsystems.com", linkedin: "" },
    logo: "", verificado: false, createdAt: now, lang: "es"
  },
];

// Filter out existing
const nuevos = empresas.filter(e => {
  const webBase = e.contacto.web.replace(/^https?:\/\//, "").replace(/\/$/, "").replace(/^www\./, "").toLowerCase();
  if (existingWebs.has(webBase)) {
    console.log(`SKIP: ${e.nombre}`);
    return false;
  }
  return true;
});

console.log(`\nInsertando ${nuevos.length} nuevas entradas...\n`);

let inserted = 0;
for (const empresa of nuevos) {
  await db.collection("directorio_consultores_asetemyt").add(empresa);
  inserted++;
  console.log(`✅ ${empresa.nombre} → ${empresa.ubicacion.ciudad}`);
}

console.log(`\n✅ Total insertadas: ${inserted}`);
process.exit(0);
