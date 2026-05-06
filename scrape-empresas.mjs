import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";

const sa = JSON.parse(readFileSync("/home/ubuntu/projects/articulos-IA---a-Firestore/backup/firebase-service-account-asetemyt.json", "utf8"));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

// Empresas encontradas en búsquedas (con datos que ya conocemos de las capturas)
const empresasNuevas = [
  {
    nombre: "Induscor Partners",
    slug: "induscor-partners",
    tipo: "empresa",
    especialidades: ["lean-manufacturing", "due-diligence", "mejora-continua"],
    descripcion: "Consultoría industrial especializada en Lean Manufacturing, M&A y Due Diligence industrial. Identifican oportunidades de mejora con impacto medible en resultados financieros.",
    servicios: ["Consultoría Lean Industrial", "Due Diligence Industrial", "M&A Consultoría", "Mejora de Procesos"],
    ubicacion: { pais: "España", ciudad: "Madrid" },
    contacto: { web: "https://induscorpartners.com/", email: "", telefono: "", linkedin: "" },
    logo: "",
    verificado: false,
    createdAt: new Date().toISOString(),
    lang: "es"
  },
  {
    nombre: "Riba Nogués",
    slug: "riba-nogues",
    tipo: "empresa",
    especialidades: ["organizacion-industrial", "mejora-procesos", "eficiencia-operativa"],
    descripcion: "Consultoría de organización industrial con experiencia práctica y visión global. Optimizan recursos, procesos y estrategia para mejorar la eficiencia operativa.",
    servicios: ["Organización Industrial", "Optimización de Procesos", "Gestión de la Eficiencia", "Consultoría Estratégica"],
    ubicacion: { pais: "España", ciudad: "Barcelona" },
    contacto: { web: "https://ribanogues.com/", email: "", telefono: "", linkedin: "" },
    logo: "",
    verificado: false,
    createdAt: new Date().toISOString(),
    lang: "es"
  },
  {
    nombre: "Gestión Industrial",
    slug: "gestion-industrial",
    tipo: "empresa",
    especialidades: ["consultoria-industrial", "organizacion-empresas", "mejora-procesos"],
    descripcion: "Asesores de confianza en gestión industrial. Soluciones integrales para la optimización de procesos productivos y organizativos.",
    servicios: ["Consultoría Industrial", "Gestión de Empresas", "Optimización de Procesos", "Asesoría Empresarial"],
    ubicacion: { pais: "España", ciudad: "Madrid" },
    contacto: { web: "https://www.gestionindustrial.com/", email: "", telefono: "", linkedin: "" },
    logo: "",
    verificado: false,
    createdAt: new Date().toISOString(),
    lang: "es"
  },
  {
    nombre: "Incora",
    slug: "incora",
    tipo: "empresa",
    especialidades: ["ingenieria-organizacion-industrial", "consultoria-industrial", "optimizacion-procesos"],
    descripcion: "Ingeniería y Consultoría de Organización Industrial. Especialistas en diseñar y optimizar sistemas de trabajo, procesos productivos y organizaciones industriales.",
    servicios: ["Ingeniería de Organización Industrial", "Consultoría de Procesos", "Diseño de Puestos de Trabajo", "Optimización Productiva"],
    ubicacion: { pais: "España", ciudad: "Barcelona" },
    contacto: { web: "http://www.incora.es/", email: "", telefono: "", linkedin: "" },
    logo: "",
    verificado: false,
    createdAt: new Date().toISOString(),
    lang: "es"
  },
  {
    nombre: "SOCOTEC España",
    slug: "socotec-espana",
    tipo: "empresa",
    especialidades: ["consultoria-industrial", "calidad", "seguridad", "auditorias"],
    descripcion: "Consultoría industrial SOCOTEC España. Servicios de consultoría técnica, calidad, seguridad y auditorías para el sector industrial con cobertura nacional.",
    servicios: ["Consultoría Industrial", "Auditorías Técnicas", "Gestión de Calidad", "Seguridad Industrial"],
    ubicacion: { pais: "España", ciudad: "Madrid" },
    contacto: { web: "https://www.socotec.es/", email: "", telefono: "", linkedin: "" },
    logo: "",
    verificado: false,
    createdAt: new Date().toISOString(),
    lang: "es"
  },
  {
    nombre: "SCA Consultores",
    slug: "sca-consultores",
    tipo: "empresa",
    especialidades: ["organizacion-industrial", "gestion-procesos", "mejora-continua"],
    descripcion: "Consultores especializados en organización industrial y gestión de procesos. Soluciones para mejorar la eficiencia y productividad empresarial.",
    servicios: ["Organización Industrial", "Gestión de Procesos", "Mejora Continua", "Consultoría Empresarial"],
    ubicacion: { pais: "España", ciudad: "Madrid" },
    contacto: { web: "https://www.scaconsultores.com/", email: "", telefono: "", linkedin: "" },
    logo: "",
    verificado: false,
    createdAt: new Date().toISOString(),
    lang: "es"
  },
  {
    nombre: "AD Consultores",
    slug: "ad-consultores",
    tipo: "empresa",
    especialidades: ["metodos-y-tiempos", "cronometraje", "bedaux", "organizacion-industrial"],
    descripcion: "Consultora de métodos y tiempos especializada en cronometrajes Bedaux y sistemas de medición de tiempos de operación. Experiencia en optimización de procesos productivos.",
    servicios: ["Cronometrajes Bedaux", "Métodos y Tiempos", "Estudios de Tiempos", "Optimización de Procesos"],
    ubicacion: { pais: "España", ciudad: "Barcelona" },
    contacto: { web: "https://www.adconsultores.es/", email: "", telefono: "", linkedin: "" },
    logo: "",
    verificado: false,
    createdAt: new Date().toISOString(),
    lang: "es"
  },
  {
    nombre: "CASPEO",
    slug: "caspeo",
    tipo: "empresa",
    especialidades: ["ingenieria-procesos", "consultoria-industrial", "optimizacion-plantas"],
    descripcion: "Consultoría e ingeniería en procesos industriales. Especialistas en modelado, simulación y optimización de procesos productivos.",
    servicios: ["Ingeniería de Procesos", "Modelado y Simulación", "Optimización de Plantas", "Consultoría Industrial"],
    ubicacion: { pais: "España", ciudad: "Madrid" },
    contacto: { web: "https://www.caspeo.net/", email: "", telefono: "", linkedin: "" },
    logo: "",
    verificado: false,
    createdAt: new Date().toISOString(),
    lang: "es"
  },
  {
    nombre: "I-PROCESOS",
    slug: "i-procesos",
    tipo: "empresa",
    especialidades: ["ingenieria-procesos", "industrializacion", "optimizacion-productiva"],
    descripcion: "Ingeniería de Procesos e Industrialización. Diseño e implementación de soluciones para la mejora de procesos productivos e industrialización.",
    servicios: ["Ingeniería de Procesos", "Industrialización", "Diseño de Líneas", "Optimización Productiva"],
    ubicacion: { pais: "España", ciudad: "Barcelona" },
    contacto: { web: "https://i-procesos.es/", email: "", telefono: "", linkedin: "" },
    logo: "",
    verificado: false,
    createdAt: new Date().toISOString(),
    lang: "es"
  },
  {
    nombre: "Oyeregui Industrial",
    slug: "oyeregui-industrial",
    tipo: "empresa",
    especialidades: ["ingenieria-procesos", "consultoria-industrial", "procesos-alimentarios"],
    descripcion: "Consultoría e ingeniería de procesos industriales. Especializados en procesos alimentarios y mejora de eficiencia operativa.",
    servicios: ["Consultoría de Procesos", "Ingeniería Industrial", "Mejora de Eficiencia", "Optimización Alimentaria"],
    ubicacion: { pais: "España", ciudad: "San Sebastián" },
    contacto: { web: "https://www.oyereguindustrial.com/", email: "", telefono: "", linkedin: "" },
    logo: "",
    verificado: false,
    createdAt: new Date().toISOString(),
    lang: "es"
  },
  {
    nombre: "Kaizen Institute España",
    slug: "kaizen-institute-espana",
    tipo: "empresa",
    especialidades: ["lean-manufacturing", "kaizen", "mejora-continua", "5s"],
    descripcion: "Consultoría y formación Lean en España. Implementación de metodologías Kaizen, Lean Manufacturing y Mejora Continua para optimizar procesos productivos.",
    servicios: ["Consultoría Lean", "Formación Kaizen", "Implementación Lean Manufacturing", "Mejora Continua"],
    ubicacion: { pais: "España", ciudad: "Madrid" },
    contacto: { web: "https://kaizen.com/es-es/", email: "", telefono: "", linkedin: "" },
    logo: "",
    verificado: false,
    createdAt: new Date().toISOString(),
    lang: "es"
  },
  {
    nombre: "KAI Consultora",
    slug: "kai-consultora",
    tipo: "empresa",
    especialidades: ["kaizen", "lean-manufacturing", "mejora-continua"],
    descripcion: "Consultora especializada en Kaizen y Lean Manufacturing. Implementación de sistemas de mejora continua para la optimización de procesos.",
    servicios: ["Consultoría Kaizen", "Lean Manufacturing", "Mejora Continua", "Formación"],
    ubicacion: { pais: "España", ciudad: "Madrid" },
    contacto: { web: "https://kaiconsultora.com/", email: "", telefono: "", linkedin: "" },
    logo: "",
    verificado: false,
    createdAt: new Date().toISOString(),
    lang: "es"
  },
  {
    nombre: "Leansis / SGS Productivity",
    slug: "leansis-sgs-productivity",
    tipo: "empresa",
    especialidades: ["lean-manufacturing", "consultoria-lean", "productividad"],
    descripcion: "Consultoría Lean por SGS Productivity by Leansis. Especialistas en implementación de sistemas Lean y mejora de productividad industrial.",
    servicios: ["Consultoría Lean", "Mejora de Productividad", "Implementación Lean Manufacturing", "Optimización de Procesos"],
    ubicacion: { pais: "España", ciudad: "Barcelona" },
    contacto: { web: "https://leansisproductividad.com/", email: "", telefono: "", linkedin: "" },
    logo: "",
    verificado: false,
    createdAt: new Date().toISOString(),
    lang: "es"
  },
  {
    nombre: "MQG Consulting",
    slug: "mqg-consulting",
    tipo: "empresa",
    especialidades: ["lean-manufacturing", "mejora-continua", "consultoria-lean"],
    descripcion: "Expertos en Lean Manufacturing y Mejora Continua. Consultoría especializada en implementar metodologías Lean para optimizar procesos productivos.",
    servicios: ["Lean Manufacturing", "Mejora Continua", "Consultoría Lean", "Formación"],
    ubicacion: { pais: "España", ciudad: "Madrid" },
    contacto: { web: "https://www.mqgconsulting.es/", email: "", telefono: "", linkedin: "" },
    logo: "",
    verificado: false,
    createdAt: new Date().toISOString(),
    lang: "es"
  },
  {
    nombre: "Profit Controls",
    slug: "profit-controls",
    tipo: "empresa",
    especialidades: ["mejora-continua", "consultoria-procesos", "formacion"],
    descripcion: "Formación y Consultoría en procesos de Mejora Continua. Soluciones para la optimización de procesos y la mejora de la eficiencia operativa.",
    servicios: ["Consultoría en Mejora Continua", "Formación", "Optimización de Procesos", "Asesoría"],
    ubicacion: { pais: "España", ciudad: "Madrid" },
    contacto: { web: "https://profitcontrolsl.com/", email: "", telefono: "", linkedin: "" },
    logo: "",
    verificado: false,
    createdAt: new Date().toISOString(),
    lang: "es"
  },
  {
    nombre: "ARN Consulting",
    slug: "arn-consulting",
    tipo: "empresa",
    especialidades: ["mejora-continua", "consultoria-empresas", "optimizacion-procesos"],
    descripcion: "Consultora de Mejora Continua para Empresas. Soluciones para la optimización de procesos y la mejora de la eficiencia organizacional.",
    servicios: ["Mejora Continua", "Consultoría Empresarial", "Optimización de Procesos", "Asesoría"],
    ubicacion: { pais: "España", ciudad: "Madrid" },
    contacto: { web: "https://arnconsulting.es/", email: "", telefono: "", linkedin: "" },
    logo: "",
    verificado: false,
    createdAt: new Date().toISOString(),
    lang: "es"
  },
  {
    nombre: "Shinten Consulting",
    slug: "shinten-consulting",
    tipo: "empresa",
    especialidades: ["mejora-procesos", "mejora-continua", "consultoria-industrial"],
    descripcion: "Consultoría y Capacitación en Mejora de Procesos y Mejora Continua. Soluciones para la optimización de procesos productivos.",
    servicios: ["Consultoría de Procesos", "Mejora Continua", "Capacitación", "Optimización"],
    ubicacion: { pais: "España", ciudad: "Madrid" },
    contacto: { web: "https://shintenconsulting.com/", email: "", telefono: "", linkedin: "" },
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
  if (d.web) existingSlugs.add(d.web.replace(/^https?:\/\//, '').replace(/\/$/, ''));
});

console.log("Slugs existentes:", existingSlugs.size);

// Filtrar nuevos
const nuevos = empresasNuevas.filter(e => {
  const webBase = e.contacto.web.replace(/^https?:\/\//, '').replace(/\/$/, '');
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
