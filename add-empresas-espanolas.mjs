import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const app = initializeApp({
  credential: cert("/home/ubuntu/projects/articulos-IA---a-Firestore/backup/firebase-service-account-asetemyt.json"),
});
const db = getFirestore(app);

// Fetch existing slugs and web URLs for dedup
const snap = await db.collection("directorio_consultores_asetemyt").get();
const existingSlugs = new Set();
const existingWebs = new Set();
snap.forEach(doc => {
  const d = doc.data();
  if (d.slug) existingSlugs.add(d.slug);
  if (d.contacto?.web) {
    const web = d.contacto.web.replace(/^https?:\/\//, "").replace(/\/$/, "").replace(/^www\./, "").toLowerCase();
    existingWebs.add(web);
  }
});

const now = new Date().toISOString();

const empresas = [
  {
    nombre: "Simetrycal",
    slug: "simetrycal",
    tipo: "empresa",
    especialidades: ["tecnología industrial", "metrología", "consultoría tecnológica", "innovación"],
    descripcion: "Spin-off de la Universidad de Sevilla y el Centro Andaluz de Metrología. Ofrece soluciones de tecnología industrial, metrología y consultoría tecnológica. Fundada en 2010.",
    servicios: ["Consultoría tecnológica", "Metrología industrial", "Innovación tecnológica", "Soluciones industriales"],
    ubicacion: { pais: "España", ciudad: "Sevilla" },
    contacto: { email: "simetrycal@simetrycal.com", telefono: "", web: "https://simetrycal.com", linkedin: "" },
    logo: "", verificado: false, createdAt: now, lang: "es"
  },
  {
    nombre: "Zitec Consultores",
    slug: "zitec-consultores",
    tipo: "empresa",
    especialidades: ["lean", "six sigma", "consultoría industrial", "mejora continua"],
    descripcion: "Consultora especializada en Lean, Six Sigma y herramientas de mejora continua. Más de 25 años de experiencia asesorando a empresas industriales en Castilla y León.",
    servicios: ["Consultoría Lean", "Six Sigma", "Formación en herramientas Lean", "Mejora de procesos"],
    ubicacion: { pais: "España", ciudad: "Valladolid" },
    contacto: { email: "zitec@zitec.es", telefono: "", web: "https://zitec.es", linkedin: "" },
    logo: "", verificado: false, createdAt: now, lang: "es"
  },
  {
    nombre: "Veleon Consulting",
    slug: "veleon-consulting",
    tipo: "empresa",
    especialidades: ["ingeniería de organización", "operaciones lean", "digitalización de procesos"],
    descripcion: "Consultora boutique de ingenieros y especialistas en operaciones. Especializada en ingeniería de organización, operaciones Lean y digitalización de procesos industriales.",
    servicios: ["Ingeniería de Organización", "Operaciones Lean", "Digitalización de procesos", "Optimización productiva"],
    ubicacion: { pais: "España", ciudad: "España" },
    contacto: { email: "", telefono: "", web: "https://www.veleonconsulting.com", linkedin: "" },
    logo: "", verificado: false, createdAt: now, lang: "es"
  },
  {
    nombre: "ABK Consultores",
    slug: "abk-consultores",
    tipo: "empresa",
    especialidades: ["lean management", "mejora de procesos", "consultoría industrial"],
    descripcion: "Organización de consultoría especializada en Lean Management. Ayudan a empresas a implementar sistemas de gestión de la mejora continua y optimizar sus procesos productivos.",
    servicios: ["Lean Management", "Mejora de procesos", "Formación Lean", "Consultoría operativa"],
    ubicacion: { pais: "España", ciudad: "España" },
    contacto: { email: "", telefono: "", web: "https://www.abkconsultores.com", linkedin: "" },
    logo: "", verificado: false, createdAt: now, lang: "es"
  },
  {
    nombre: "MenteLean",
    slug: "mentelean",
    tipo: "empresa",
    especialidades: ["lean", "six sigma", "mejora continua", "consultoría de negocio"],
    descripcion: "Consultoría de negocio empresarial y mejora continua. Especialistas en Lean, Six Sigma Black Belt y estrategias de optimización para empresas industriales y de servicios.",
    servicios: ["Consultoría Lean", "Six Sigma Black Belt", "Mejora continua", "Estrategia empresarial"],
    ubicacion: { pais: "España", ciudad: "España" },
    contacto: { email: "", telefono: "", web: "https://mentelean.es", linkedin: "" },
    logo: "", verificado: false, createdAt: now, lang: "es"
  },
  {
    nombre: "ABARON Consultoría de Excelencia",
    slug: "abaron-consultoria",
    tipo: "empresa",
    especialidades: ["lean manufacturing", "excelencia en gestión", "métodos avanzados"],
    descripcion: "Consultoría de excelencia especializada en Lean Manufacturing y métodos avanzados de gestión industrial. Ubicada en Burgos, dan servicio a empresas de toda España.",
    servicios: ["Lean Manufacturing", "Excelencia en Gestión", "Métodos avanzados", "Consultoría industrial"],
    ubicacion: { pais: "España", ciudad: "Burgos" },
    contacto: { email: "", telefono: "", web: "https://www.abaron.es", linkedin: "" },
    logo: "", verificado: false, createdAt: now, lang: "es"
  },
  {
    nombre: "El Método Lean",
    slug: "el-metodo-lean",
    tipo: "empresa",
    especialidades: ["lean manufacturing", "lean service", "consultoría lean", "mejora continua"],
    descripcion: "Consultoría especializada en Lean Manufacturing y Lean Service con sede en Cantabria. Ofrecen implementación de sistemas Lean adaptados a cada empresa.",
    servicios: ["Consultoría Lean Manufacturing", "Lean Service", "Formación Lean", "Implementación de mejora continua"],
    ubicacion: { pais: "España", ciudad: "Santander" },
    contacto: { email: "info@elmetodolean.com", telefono: "+34 942 304 073", web: "http://www.elmetodolean.com", linkedin: "" },
    logo: "", verificado: false, createdAt: now, lang: "es"
  },
  {
    nombre: "Team & Time",
    slug: "team-and-time",
    tipo: "empresa",
    especialidades: ["consultoría estratégica", "ingeniería de organización", "lean", "productividad"],
    descripcion: "Consultora estratégica gallega especializada en ingeniería de organización, método LEAN y mejora de productividad. Trabajan con todo tipo de empresas en la región noroeste.",
    servicios: ["Consultoría estratégica", "Ingeniería de organización", "Metodología LEAN", "Mejora de productividad"],
    ubicacion: { pais: "España", ciudad: "A Coruña" },
    contacto: { email: "gestion@teamandtime.com", telefono: "+34 981 978 786", web: "https://www.teamandtime.com", linkedin: "" },
    logo: "", verificado: false, createdAt: now, lang: "es"
  },
  {
    nombre: "REGENERING",
    slug: "regenering",
    tipo: "empresa",
    especialidades: ["productividad", "gestión de equipos", "regeneración organizacional", "consultoría internacional"],
    descripcion: "Consultora internacional en gestión de la productividad con sede en Tenerife. Especializada en regeneración de equipos y organizaciones para mejorar su rendimiento.",
    servicios: ["Consultoría en productividad", "Regeneración de equipos", "Desarrollo organizacional", "Consultoría internacional"],
    ubicacion: { pais: "España", ciudad: "Tenerife" },
    contacto: { email: "", telefono: "", web: "https://regenering.com", linkedin: "" },
    logo: "", verificado: false, createdAt: now, lang: "es"
  },
  {
    nombre: "DIT Consultoría",
    slug: "dit-consultoria",
    tipo: "empresa",
    especialidades: ["lean manufacturing", "mejora de procesos", "eficiencia", "sostenibilidad"],
    descripcion: "Consultoría de Lean Manufacturing especializada en mejora de procesos operativos, eficiencia industrial y sostenibilidad. Con sede en Bilbao, dan servicio al País Vasco y toda España.",
    servicios: ["Consultoría Lean Manufacturing", "Mejora de procesos operativos", "Eficiencia industrial", "Sostenibilidad"],
    ubicacion: { pais: "España", ciudad: "Bilbao" },
    contacto: { email: "", telefono: "", web: "https://www.ditconsultoria.com", linkedin: "" },
    logo: "", verificado: false, createdAt: now, lang: "es"
  },
  {
    nombre: "Gestlean Consulting",
    slug: "gestlean-consulting",
    tipo: "empresa",
    especialidades: ["lean management", "ingeniería de procesos", "mejora continua"],
    descripcion: "Consultora especializada en Lean Management e ingeniería de procesos. Con sede en Barcelona, ayudan a empresas a implementar sistemas de mejora continua.",
    servicios: ["Lean Management", "Ingeniería de procesos", "Mejora continua", "Consultoría operativa"],
    ubicacion: { pais: "España", ciudad: "Barcelona" },
    contacto: { email: "", telefono: "", web: "https://www.gestleanconsulting.com", linkedin: "" },
    logo: "", verificado: false, createdAt: now, lang: "es"
  },
  {
    nombre: "GEMBA Lean Consulting",
    slug: "gemba-lean-consulting",
    tipo: "empresa",
    especialidades: ["organización industrial", "lean manufacturing", "consultoría lean"],
    descripcion: "Consultora de organización industrial y Lean Manufacturing. Ofrecen servicios de consultoría Lean para optimizar procesos productivos y logísticos.",
    servicios: ["Organización industrial", "Lean Manufacturing", "Consultoría Lean", "Optimización de procesos"],
    ubicacion: { pais: "España", ciudad: "Valencia" },
    contacto: { email: "", telefono: "", web: "https://gemba-lean.com", linkedin: "" },
    logo: "", verificado: false, createdAt: now, lang: "es"
  },
  {
    nombre: "ACMP Lean",
    slug: "acmp-lean",
    tipo: "empresa",
    especialidades: ["consultoría lean", "formación lean", "mentoría", "desarrollo de personas"],
    descripcion: "Consultoría, formación y mentoría Lean. Mejoran procesos y desarrollan personas para crear organizaciones más eficientes y sostenibles.",
    servicios: ["Consultoría Lean", "Formación Lean", "Mentoría", "Desarrollo de personas"],
    ubicacion: { pais: "España", ciudad: "España" },
    contacto: { email: "", telefono: "", web: "https://acmplean.com", linkedin: "" },
    logo: "", verificado: false, createdAt: now, lang: "es"
  },
  {
    nombre: "Consultoría TEI",
    slug: "consultoria-tei",
    tipo: "empresa",
    especialidades: ["soluciones industriales", "mejora de procesos", "productividad", "líneas de producción"],
    descripcion: "Consultora con 30 años de experiencia en soluciones para líneas de producción industrial. Especializada en mejora de procesos y aumento de productividad.",
    servicios: ["Soluciones industriales", "Mejora de procesos", "Optimización de líneas de producción", "Productividad"],
    ubicacion: { pais: "España", ciudad: "Murcia" },
    contacto: { email: "atencionalcliente@consultoriatei.com", telefono: "", web: "https://consultoriatei.com", linkedin: "" },
    logo: "", verificado: false, createdAt: now, lang: "es"
  },
];

// Filter out existing
const nuevos = empresas.filter(e => {
  const webBase = e.contacto.web.replace(/^https?:\/\//, "").replace(/\/$/, "").replace(/^www\./, "").toLowerCase();
  if (existingSlugs.has(e.slug)) {
    console.log(`SKIP (slug): ${e.nombre}`);
    return false;
  }
  if (existingWebs.has(webBase)) {
    console.log(`SKIP (web): ${e.nombre}`);
    return false;
  }
  return true;
});

console.log(`\nInsertando ${nuevos.length} nuevas entradas de ${empresas.length} candidatas...\n`);

let inserted = 0;
for (const empresa of nuevos) {
  await db.collection("directorio_consultores_asetemyt").add(empresa);
  inserted++;
  console.log(`✅ ${empresa.nombre} → ${empresa.ubicacion.ciudad}`);
}

console.log(`\n✅ Total insertadas: ${inserted}`);
process.exit(0);
