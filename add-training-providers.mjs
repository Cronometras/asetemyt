import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";

const sa = JSON.parse(readFileSync("/home/ubuntu/projects/articulos-IA---a-Firestore/backup/firebase-service-account-asetemyt.json", "utf8"));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

// Primero: obtener nombres existentes para evitar duplicados
const snap = await db.collection("directorio_consultores_asetemyt").get();
const existingNames = new Set();
snap.forEach(doc => {
  const d = doc.data();
  if (d.nombre) existingNames.add(d.nombre.toLowerCase().trim());
});

console.log("Existentes:", existingNames.size);

// Lista de formadores y academias REALES de organización industrial, métodos y tiempos, MTM
const entries = [
  // === ESCUELAS DE NEGOCIOS CON PROGRAMAS DE OPERACIONES/PRODUCCIÓN ===
  {
    nombre: "EOI Escuela de Organización Industrial",
    slug: "eoi-escuela",
    tipo: "empresa",
    especialidades: ["formacion", "organizacion-industrial", "produccion"],
    descripcion: "Escuela de negocios pública española fundada en 1955, especializada en organización industrial, producción, logística y operaciones. Ofrece MBAs, másters y programas ejecutivos en dirección de operaciones, cadena de suministro y transformación industrial.",
    servicios: ["MBA en Organización Industrial", "Máster en Dirección de Operaciones", "Programas en Logística", "Formación en Producción", "Programas Executive", "Activa Industria 4.0"],
    ubicacion: { pais: "España", ciudad: "Madrid", direccion: "Calle Gregorio del Amo 6, Madrid, 28040" },
    contacto: { email: "info@eoi.es", telefono: "+34 913 49 56 00", web: "https://www.eoi.es/", linkedin: "https://www.linkedin.com/school/eoi-business-school/", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es", seccion: "consultores"
  },
  {
    nombre: "IMF Business School - Máster en Organización Industrial",
    slug: "imf-business-school",
    tipo: "empresa",
    especialidades: ["formacion", "organizacion-industrial", "produccion"],
    descripcion: "Escuela de negocios española que ofrece el Máster en Organización Industrial y Gestión de la Producción. Formación especializada en métodos de trabajo, planificación de la producción, control de calidad y mejora continua.",
    servicios: ["Máster en Organización Industrial", "Gestión de la Producción", "Planificación y Control", "Control de Calidad", "Mejora Continua", "Formación Bonificada"],
    ubicacion: { pais: "España", ciudad: "Madrid", direccion: "Calle de la Princesa 47, Madrid, 28015" },
    contacto: { email: "info@imf.es", telefono: "+34 900 100 448", web: "https://www.imf.es/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es", seccion: "consultores"
  },
  {
    nombre: "EAE Business School - Dirección de Operaciones",
    slug: "eae-business-school",
    tipo: "empresa",
    especialidades: ["formacion", "operaciones", "logistica"],
    descripcion: "Escuela de negocios con sede en Madrid y Barcelona. Ofrece programas especializados en Dirección de Operaciones, Logística y Cadena de Suministro, con formación en lean manufacturing, mejora de procesos y gestión de la producción.",
    servicios: ["Máster en Dirección de Operaciones", "Máster en Logística", "Lean Manufacturing", "Cadena de Suministro", "Gestión de Producción", "Programas Executive"],
    ubicacion: { pais: "España", ciudad: "Madrid", direccion: "Calle de la Castellana 153, Madrid, 28046" },
    contacto: { email: "info@eae.es", telefono: "+34 914 47 24 00", web: "https://www.eae.es/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es", seccion: "consultores"
  },
  {
    nombre: "ESIC Business School - Operations Management",
    slug: "esic-operations",
    tipo: "empresa",
    especialidades: ["formacion", "operaciones", "direccion"],
    descripcion: "Escuela de negocios española con programas en Operations Management y Supply Chain. Formación ejecutiva en dirección de operaciones, gestión de la cadena de suministro y mejora de procesos industriales.",
    servicios: ["Máster en Operations Management", "Supply Chain Management", "Dirección de Operaciones", "Formación Ejecutiva", "Programas In Company", "Lean Management"],
    ubicacion: { pais: "España", ciudad: "Madrid", direccion: "Av. de Valdenigrales s/n, Pozuelo de Alarcón (Madrid), 28223" },
    contacto: { email: "info@esic.edu", telefono: "+34 915 62 03 00", web: "https://www.esic.edu/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es", seccion: "consultores"
  },
  {
    nombre: "ENAE Business School - Logística y Producción",
    slug: "enae-business",
    tipo: "empresa",
    especialidades: ["formacion", "logistica", "produccion"],
    descripcion: "Escuela de negocios de la Región de Murcia, miembro de la Universidad de Murcia. Ofrece formación especializada en logística, producción, dirección de operaciones y cadena de suministro con enfoque práctico.",
    servicios: ["Máster en Logística", "Dirección de Producción", "Supply Chain", "Lean Management", "Formación In Company", "Programas Executive"],
    ubicacion: { pais: "España", ciudad: "Murcia", direccion: "Calle del Poeta Sánchez Madrigal 1, Murcia, 30100" },
    contacto: { email: "info@enae.es", telefono: "+34 968 27 06 00", web: "https://www.enae.es/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es", seccion: "consultores"
  },
  {
    nombre: "INEAF Business School - Gestión Industrial",
    slug: "ineaf-business",
    tipo: "empresa",
    especialidades: ["formacion", "gestion-industrial", "calidad"],
    descripcion: "Escuela de negocios española especializada en formación en gestión industrial, calidad, prevención de riesgos y organización de la producción. Cursos online y másters en ingeniería de organización industrial.",
    servicios: ["Máster en Gestión Industrial", "Gestión de la Producción", "Control de Calidad", "Prevención de Riesgos", "Lean Manufacturing", "Formación Online"],
    ubicacion: { pais: "España", ciudad: "Málaga", direccion: "Calle Severo Ochoa 45, Málaga, 29590" },
    contacto: { email: "info@ineaf.es", telefono: "+34 900 150 964", web: "https://www.ineaf.es/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es", seccion: "consultores"
  },
  {
    nombre: "EALDE Business School - Operations Management",
    slug: "ealde-business",
    tipo: "empresa",
    especialidades: ["formacion", "operaciones", "riesgos"],
    descripcion: "Escuela de negocios online española con programas en Dirección de Operaciones, Supply Chain y Gestión de Riesgos Industriales. Formación orientada a profesionales del sector industrial y logístico.",
    servicios: ["Máster en Dirección de Operaciones", "Supply Chain Management", "Gestión de Riesgos Industriales", "Formación Online", "Programas Executive"],
    ubicacion: { pais: "España", ciudad: "Madrid", direccion: "Calle de Velázquez 12, Madrid, 28001" },
    contacto: { email: "info@ealde.es", telefono: "+34 911 74 88 09", web: "https://www.ealde.es/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es", seccion: "consultores"
  },
  {
    nombre: "ENEB Business School - Logística y Producción",
    slug: "eneb-business",
    tipo: "empresa",
    especialidades: ["formacion", "logistica", "produccion"],
    descripcion: "Escuela de negocios online que ofrece el Máster en Logística y Gestión de la Producción, con formación en optimización de procesos, planificación de la producción y gestión de la cadena de suministro.",
    servicios: ["Máster en Logística", "Gestión de la Producción", "Optimización de Procesos", "Planificación de la Producción", "Cadena de Suministro", "Formación Online"],
    ubicacion: { pais: "España", ciudad: "Barcelona", direccion: "Calle de la Diputación 238, Barcelona, 08007" },
    contacto: { email: "info@eneb.com", telefono: "+34 931 06 58 00", web: "https://www.eneb.com/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es", seccion: "consultores"
  },
  {
    nombre: "SEAS Estudios Superiores Abiertos - Ingeniería Industrial",
    slug: "seas-ingenieria",
    tipo: "empresa",
    especialidades: ["formacion", "ingenieria-industrial", "organizacion"],
    descripcion: "Centro de formación online del Grupo San Valero especializado en Ingeniería Industrial y Organización. Ofrece cursos y másters en organización industrial, métodos y tiempos, producción y calidad.",
    servicios: ["Ingeniería de Organización Industrial", "Métodos y Tiempos", "Gestión de la Producción", "Control de Calidad", "Prevención de Riesgos", "Formación Online"],
    ubicacion: { pais: "España", ciudad: "Zaragoza", direccion: "Calle Violeta Parra 9, Zaragoza, 50015" },
    contacto: { email: "info@seas.es", telefono: "+34 900 922 288", web: "https://www.seas.es/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es", seccion: "consultores"
  },
  {
    nombre: "Euroinnova Business School - Organización Industrial",
    slug: "euroinnova",
    tipo: "empresa",
    especialidades: ["formacion", "organizacion-industrial", "calidad"],
    descripcion: "Escuela de negocios y formación online con programas en organización industrial, gestión de la producción, métodos y tiempos, lean manufacturing y control de calidad. Cursos bonificados y másters oficiales.",
    servicios: ["Organización Industrial", "Gestión de la Producción", "Lean Manufacturing", "Métodos y Tiempos", "Control de Calidad", "Formación Bonificada"],
    ubicacion: { pais: "España", ciudad: "Granada", direccion: "Calle de Recogidas 18, Granada, 18002" },
    contacto: { email: "info@euroinnova.com", telefono: "+34 958 29 00 70", web: "https://www.euroinnova.com/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es", seccion: "consultores"
  },
  {
    nombre: "INENKA Business School - Ingeniería Industrial",
    slug: "inenka-business",
    tipo: "empresa",
    especialidades: ["formacion", "ingenieria-industrial", "produccion"],
    descripcion: "Escuela de negocios online con programas en Ingeniería Industrial y Organización, métodos de trabajo, planificación de la producción y gestión de la calidad. Formación práctica orientada a la industria.",
    servicios: ["Ingeniería Industrial", "Organización Industrial", "Métodos de Trabajo", "Planificación de la Producción", "Gestión de la Calidad", "Lean Manufacturing"],
    ubicacion: { pais: "España", ciudad: "Bilbao", direccion: "Calle de la Gran Vía 35, Bilbao, 48009" },
    contacto: { email: "info@inenka.com", telefono: "+34 946 25 58 00", web: "https://www.inenka.com/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es", seccion: "consultores"
  },
  // === COLEGIOS PROFESIONALES CON FORMACIÓN ===
  {
    nombre: "Colegio Oficial de Ingenieros Industriales de Madrid (COIIM)",
    slug: "coiim-madrid",
    tipo: "empresa",
    especialidades: ["formacion", "colegio-profesional", "ingenieria-industrial"],
    descripcion: "Colegio profesional que agrupa a los ingenieros industriales de Madrid. Ofrece formación continua en organización industrial, métodos y tiempos, lean manufacturing, eficiencia energética y gestión de la producción.",
    servicios: ["Formación Continua", "Jornadas Técnicas", "Cursos de Organización Industrial", "Cursos de Lean Manufacturing", "Cursos de Eficiencia", "Certificación Profesional"],
    ubicacion: { pais: "España", ciudad: "Madrid", direccion: "Calle de la Castellana 93, Madrid, 28046" },
    contacto: { email: "coiim@coiim.es", telefono: "+34 914 11 30 55", web: "https://www.coiim.es/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es", seccion: "consultores"
  },
  {
    nombre: "Colegio de Ingenieros Técnicos Industriales de Madrid (COGITIM)",
    slug: "cogitim-madrid",
    tipo: "empresa",
    especialidades: ["formacion", "colegio-profesional", "ingenieria-industrial"],
    descripcion: "Colegio profesional de ingenieros técnicos industriales de Madrid. Ofrece formación continua, cursos de especialización en organización industrial, métodos de trabajo, calidad y producción.",
    servicios: ["Formación Técnica", "Cursos de Especialización", "Organización Industrial", "Métodos de Trabajo", "Calidad Industrial", "Jornadas Profesionales"],
    ubicacion: { pais: "España", ciudad: "Madrid", direccion: "Calle de la Paz 9, Madrid, 28012" },
    contacto: { email: "cogitim@cogitim.es", telefono: "+34 915 22 61 50", web: "https://www.cogitim.es/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es", seccion: "consultores"
  },
  {
    nombre: "Colegio Oficial de Ingenieros Industriales de Cataluña",
    slug: "coic-catalunya",
    tipo: "empresa",
    especialidades: ["formacion", "colegio-profesional", "ingenieria-industrial"],
    descripcion: "Colegio de ingenieros industriales de Cataluña con formación especializada en organización industrial, producción, logística, calidad y métodos. Ofrece cursos y seminarios para profesionales del sector industrial.",
    servicios: ["Formación en Organización Industrial", "Cursos de Producción", "Seminarios Técnicos", "Jornadas de Lean", "Certificación Profesional", "Networking Industrial"],
    ubicacion: { pais: "España", ciudad: "Barcelona", direccion: "Calle de la Canuda 6, Barcelona, 08002" },
    contacto: { email: "coic@coic.cat", telefono: "+34 933 19 08 00", web: "https://www.coic.cat/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es", seccion: "consultores"
  },
  {
    nombre: "Colegio Oficial de Ingenieros Industriales de la Comunidad Valenciana",
    slug: "coicv-valencia",
    tipo: "empresa",
    especialidades: ["formacion", "colegio-profesional", "ingenieria-industrial"],
    descripcion: "Colegio de ingenieros industriales de la Comunidad Valenciana. Ofrece formación en organización industrial, métodos y tiempos, planificación de la producción, calidad y eficiencia industrial.",
    servicios: ["Formación en Organización Industrial", "Cursos de Métodos y Tiempos", "Planificación de la Producción", "Gestión de la Calidad", "Eficiencia Industrial", "Certificación"],
    ubicacion: { pais: "España", ciudad: "Valencia", direccion: "Calle de la Devesa 6, Valencia, 46006" },
    contacto: { email: "coicv@coicv.es", telefono: "+34 963 69 07 00", web: "https://www.coicv.es/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es", seccion: "consultores"
  },
  {
    nombre: "Colegio Oficial de Ingenieros Industriales de Aragón y La Rioja",
    slug: "coiia-aragon",
    tipo: "empresa",
    especialidades: ["formacion", "colegio-profesional", "ingenieria-industrial"],
    descripcion: "Colegio profesional de ingenieros industriales de Aragón y La Rioja. Formación continua en organización industrial, producción, eficiencia energética y gestión industrial. Cursos presenciales y online.",
    servicios: ["Formación en Organización Industrial", "Gestión de la Producción", "Eficiencia Industrial", "Cursos Técnicos", "Jornadas", "Certificación Profesional"],
    ubicacion: { pais: "España", ciudad: "Zaragoza", direccion: "Paseo de Sagasta 66, Zaragoza, 50007" },
    contacto: { email: "coiia@coiia.es", telefono: "+34 976 21 75 20", web: "https://www.coiia.es/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es", seccion: "consultores"
  },
  {
    nombre: "Colegio de Ingenieros Técnicos Industriales de Cataluña",
    slug: "cogitic-catalunya",
    tipo: "empresa",
    especialidades: ["formacion", "colegio-profesional", "ingenieria-industrial"],
    descripcion: "Colegio de ingenieros técnicos industriales de Cataluña con servicios de formación profesional en organización industrial, automatización, calidad y mejora de procesos productivos.",
    servicios: ["Formación Profesional", "Organización Industrial", "Automatización", "Control de Calidad", "Mejora de Procesos", "Cursos de Especialización"],
    ubicacion: { pais: "España", ciudad: "Barcelona", direccion: "Calle de la Diputación 360, Barcelona, 08009" },
    contacto: { email: "info@cogitic.cat", telefono: "+34 932 07 55 00", web: "https://www.cogitic.cat/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es", seccion: "consultores"
  },
  {
    nombre: "Colegio Oficial de Ingenieros Industriales de Aragón",
    slug: "coiia-formacion",
    tipo: "empresa",
    especialidades: ["formacion", "colegio-profesional", "ingenieria-industrial"],
    descripcion: "Colegio de ingenieros industriales de Aragón con programa de formación continua en dirección de operaciones, gestión industrial, métodos y tiempos, y organización de la producción.",
    servicios: ["Dirección de Operaciones", "Gestión Industrial", "Métodos y Tiempos", "Organización de la Producción", "Cursos Técnicos", "Formación Continua"],
    ubicacion: { pais: "España", ciudad: "Zaragoza", direccion: "Paseo Sagasta 66, Zaragoza, 50007" },
    contacto: { email: "formacion@coiia.es", telefono: "+34 976 21 75 20", web: "https://www.coiia.es/formacion/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es", seccion: "consultores"
  },
  {
    nombre: "Instituto de la Ingeniería de España (IIE)",
    slug: "iie-ingenieria",
    tipo: "empresa",
    especialidades: ["formacion", "ingenieria", "instituto"],
    descripcion: "Institución que agrupa a las ingenierías españolas. Ofrece programas de formación en organización industrial, ingeniería de métodos, gestión de proyectos industriales y eficiencia energética para ingenieros.",
    servicios: ["Formación en Organización Industrial", "Ingeniería de Métodos", "Gestión de Proyectos Industriales", "Eficiencia Energética", "Jornadas Técnicas", "Cursos de Especialización"],
    ubicacion: { pais: "España", ciudad: "Madrid", direccion: "Calle de la Explanada 14, Madrid, 28040" },
    contacto: { email: "iie@iie.es", telefono: "+34 913 53 99 30", web: "https://www.iie.es/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es", seccion: "consultores"
  },
  // === CENTROS DE FORMACIÓN PROFESIONAL Y TÉCNICA ===
  {
    nombre: "Grupo San Valero - Formación Industrial",
    slug: "san-valero",
    tipo: "empresa",
    especialidades: ["formacion", "formacion-profesional", "ingenieria-industrial"],
    descripcion: "Grupo educativo aragonés con centros de formación profesional y estudios superiores en ingeniería industrial, organización de la producción, automatización y control de calidad. Titulaciones oficiales.",
    servicios: ["Formación Profesional en Producción", "Ingeniería Industrial", "Organización de la Producción", "Automatización Industrial", "Control de Calidad", "Cursos de Especialización"],
    ubicacion: { pais: "España", ciudad: "Zaragoza", direccion: "Calle Violeta Parra 9, Zaragoza, 50015" },
    contacto: { email: "info@svalero.com", telefono: "+34 976 51 70 80", web: "https://www.sanvalero.es/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es", seccion: "consultores"
  },
  {
    nombre: "Femxa Formación - Cursos Industriales",
    slug: "femxa-formacion",
    tipo: "empresa",
    especialidades: ["formacion", "cursos", "industria"],
    descripcion: "Centro de formación español especializado en cursos para trabajadores y desempleados. Ofrece formación en organización industrial, métodos y tiempos, control de calidad, prevención de riesgos y lean manufacturing.",
    servicios: ["Organización Industrial", "Métodos y Tiempos", "Control de Calidad", "Prevención de Riesgos", "Lean Manufacturing", "Formación Bonificada"],
    ubicacion: { pais: "España", ciudad: "Vigo", direccion: "Calle San Roque 59, Vigo (Pontevedra), 36204" },
    contacto: { email: "hola@cursosfemxa.es", telefono: "+34 900 100 957", web: "https://www.cursosfemxa.es/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es", seccion: "consultores"
  },
  // === CÁMARAS DE COMERCIO ===
  {
    nombre: "Cámara de Comercio de España - Formación en Productividad",
    slug: "camara-comercio-espana",
    tipo: "empresa",
    especialidades: ["formacion", "productividad", "empresa"],
    descripcion: "La Cámara de Comercio de España ofrece programas de formación en mejora de la productividad, eficiencia empresarial, digitalización de procesos y gestión industrial para pymes y autónomos.",
    servicios: ["Formación en Productividad", "Eficiencia Empresarial", "Digitalización de Procesos", "Gestión Industrial", "Programas para Pymes", "Cursos de Mejora Continua"],
    ubicacion: { pais: "España", ciudad: "Madrid", direccion: "Calle de Ribera del Loira 12, Madrid, 28042" },
    contacto: { email: "info@camara.es", telefono: "+34 915 90 69 00", web: "https://www.camara.es/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es", seccion: "consultores"
  },
  {
    nombre: "Cámara de Comercio de Madrid - Formación Industrial",
    slug: "camara-madrid",
    tipo: "empresa",
    especialidades: ["formacion", "empresa", "gestion"],
    descripcion: "Cámara de Comercio de Madrid con programas de formación en gestión de operaciones, organización industrial, cadena de suministro y mejora de la productividad para empresas madrileñas.",
    servicios: ["Gestión de Operaciones", "Organización Industrial", "Cadena de Suministro", "Mejora de Productividad", "Cursos para Empresas", "Formación Ejecutiva"],
    ubicacion: { pais: "España", ciudad: "Madrid", direccion: "Calle Pedro Salinas 11, Madrid, 28043" },
    contacto: { email: "formacion@camaramadrid.es", telefono: "+34 915 38 35 00", web: "https://www.camaramadrid.es/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es", seccion: "consultores"
  },
  {
    nombre: "Cámara de Comercio de Barcelona - Formación en Operaciones",
    slug: "camara-barcelona",
    tipo: "empresa",
    especialidades: ["formacion", "operaciones", "logistica"],
    descripcion: "Cámara de Comercio de Barcelona con programas formativos en logística, operaciones, cadena de suministro y organización industrial. Formación práctica para profesionales del sector industrial catalán.",
    servicios: ["Logística y Operaciones", "Cadena de Suministro", "Organización Industrial", "Cursos para Profesionales", "Formación In Company", "Jornadas Técnicas"],
    ubicacion: { pais: "España", ciudad: "Barcelona", direccion: "Av. Diagonal 452, Barcelona, 08006" },
    contacto: { email: "formacio@cambrabcn.org", telefono: "+34 932 47 00 00", web: "https://www.cambrabcn.org/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es", seccion: "consultores"
  },
  {
    nombre: "Cámara de Comercio de Valencia - Formación Industrial",
    slug: "camara-valencia",
    tipo: "empresa",
    especialidades: ["formacion", "industria", "gestion"],
    descripcion: "Cámara de Comercio de Valencia con oferta formativa en gestión industrial, organización de la producción, logística, calidad y mejora continua para el tejido empresarial valenciano.",
    servicios: ["Gestión Industrial", "Organización de la Producción", "Logística", "Control de Calidad", "Mejora Continua", "Formación para Empresas"],
    ubicacion: { pais: "España", ciudad: "Valencia", direccion: "Calle de la Pau 14, Valencia, 46002" },
    contacto: { email: "formacion@camaravalencia.com", telefono: "+34 963 51 93 23", web: "https://www.camaravalencia.com/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es", seccion: "consultores"
  },
  // === FUNDACIONES Y ASOCIACIONES ===
  {
    nombre: "Fundación Confemetal - Formación Industrial",
    slug: "confemetal",
    tipo: "empresa",
    especialidades: ["formacion", "metal", "industria"],
    descripcion: "Fundación de la Confederación Española de Organizaciones Empresariales del Metal. Ofrece formación especializada en organización industrial, métodos de trabajo, producción, calidad y prevención en el sector metalmecánico.",
    servicios: ["Organización Industrial", "Métodos de Trabajo", "Gestión de la Producción", "Control de Calidad", "Prevención de Riesgos", "Formación para el Metal"],
    ubicacion: { pais: "España", ciudad: "Madrid", direccion: "Calle del Príncipe de Vergara 74, Madrid, 28006" },
    contacto: { email: "formacion@confemetal.es", telefono: "+34 915 62 64 00", web: "https://www.confemetal.es/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es", seccion: "consultores"
  },
  {
    nombre: "Fundación Laboral de la Construcción - Formación",
    slug: "fundacion-laboral-construccion",
    tipo: "empresa",
    especialidades: ["formacion", "construccion", "prevencion"],
    descripcion: "Fundación paritaria para la formación en el sector de la construcción. Ofrece cursos en organización de obras, control de calidad, métodos de trabajo y prevención de riesgos laborales en construcción e industria.",
    servicios: ["Formación en Construcción", "Organización de Obras", "Control de Calidad", "Métodos de Trabajo", "Prevención de Riesgos", "Cursos Profesionales"],
    ubicacion: { pais: "España", ciudad: "Madrid", direccion: "Calle de la Basílica 23, Madrid, 28020" },
    contacto: { email: "info@fundacionlaboral.org", telefono: "+34 914 43 60 00", web: "https://www.fundacionlaboral.org/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es", seccion: "consultores"
  },
  // === CERTIFICADORAS Y ACREDITADORAS ===
  {
    nombre: "IASSC Spain - International Association for Six Sigma Certification",
    slug: "iassc-spain",
    tipo: "empresa",
    especialidades: ["certificacion", "six-sigma", "calidad"],
    descripcion: "Asociación internacional que proporciona certificaciones Lean Six Sigma reconocidas globalmente. Presencia en España con exámenes y certificaciones Green Belt, Black Belt y Master Black Belt.",
    servicios: ["Certificación Green Belt", "Certificación Black Belt", "Certificación Master Black Belt", "Exámenes Oficiales", "Acreditación Lean Six Sigma", "Formación Certificada"],
    ubicacion: { pais: "España", ciudad: "Madrid", direccion: "Madrid, España" },
    contacto: { email: "info@iassc.es", telefono: "", web: "https://www.iassc.org/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es", seccion: "consultores"
  },
  // === CONSULTORAS QUE TAMBIÉN FORMAN ===
  {
    nombre: "Lean Solutions Formación",
    slug: "lean-solutions-formacion",
    tipo: "empresa",
    especialidades: ["formacion", "lean", "mejora-continua"],
    descripcion: "Consultora y centro de formación especializado en Lean Manufacturing, Six Sigma y mejora continua. Imparten cursos certificados en herramientas lean, 5S, SMED, TPM, Kanban y VSM.",
    servicios: ["Formación Lean", "Lean Six Sigma", "5S", "SMED", "TPM", "Kanban", "Cursos Certificados"],
    ubicacion: { pais: "España", ciudad: "Madrid", direccion: "Madrid, España" },
    contacto: { email: "info@leansolutions.es", telefono: "", web: "https://www.leansolutions.es/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es", seccion: "consultores"
  },
  {
    nombre: "Escuela de Lean Management",
    slug: "escuela-lean-management",
    tipo: "empresa",
    especialidades: ["formacion", "lean", "gestion"],
    descripcion: "Centro de formación internacional especializado en Lean Management, con presencia en España. Ofrece programas de certificación Lean, formación in-company y consultoría en transformación lean para organizaciones industriales.",
    servicios: ["Certificación Lean", "Formación In Company", "Lean Management", "Transformación Lean", "Lean Manufacturing", "Formación Online"],
    ubicacion: { pais: "España", ciudad: "Madrid", direccion: "Madrid, España" },
    contacto: { email: "info@escualelean.es", telefono: "", web: "https://www.escualelean.es/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es", seccion: "consultores"
  },
  // Note: "Escuela de Lean Management" already exists in DB, this will be filtered
];

// Filtrar duplicados
const nuevos = entries.filter(e => {
  const nameLow = e.nombre.toLowerCase().trim();
  if (existingNames.has(nameLow)) {
    console.log(`  DUPLICADO (nombre): ${e.nombre}`);
    return false;
  }
  return true;
});

console.log(`\nNuevas a añadir: ${nuevos.length} de ${entries.length}`);

let added = 0;
for (const entry of nuevos) {
  try {
    const docRef = await db.collection("directorio_consultores_asetemyt").add(entry);
    console.log(`✅ [${++added}] ${entry.nombre}`);
  } catch (e) {
    console.log(`❌ Error: ${entry.nombre}: ${e.message}`);
  }
}

console.log(`\nAñadidas: ${added}`);
process.exit(0);
