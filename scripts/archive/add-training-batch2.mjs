import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";

const sa = JSON.parse(readFileSync("/home/ubuntu/projects/articulos-IA---a-Firestore/backup/firebase-service-account-asetemyt.json", "utf8"));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

const snap = await db.collection("directorio_consultores_asetemyt").get();
const existingNames = new Set();
snap.forEach(doc => {
  const d = doc.data();
  if (d.nombre) existingNames.add(d.nombre.toLowerCase().trim());
});

console.log("Existentes:", existingNames.size);

// Segunda ronda - más formadores y academias
const entries = [
  // === MÁS COLEGIOS PROFESIONALES POR PROVINCIAS ===
  { nombre: "Colegio Oficial de Ingenieros Industriales de Andalucía Occidental", slug: "coiia-occidental", tipo: "empresa",
    especialidades: ["formacion", "colegio-profesional", "ingenieria-industrial"],
    descripcion: "Colegio de ingenieros industriales de Andalucía Occidental con programas de formación en organización industrial, métodos y tiempos, producción y calidad. Cursos presenciales y online.",
    servicios: ["Formación en Organización Industrial", "Métodos y Tiempos", "Gestión de Producción", "Control de Calidad", "Jornadas Técnicas"],
    ubicacion: { pais: "España", ciudad: "Sevilla", direccion: "Calle de la Rábida 5, Sevilla, 41001" },
    contacto: { email: "coiia@coiia.com", telefono: "+34 954 21 97 77", web: "https://www.coiia.com/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es", seccion: "consultores" },

  { nombre: "Colegio Oficial de Ingenieros Industriales de Andalucía Oriental", slug: "coiia-oriental", tipo: "empresa",
    especialidades: ["formacion", "colegio-profesional", "ingenieria-industrial"],
    descripcion: "Colegio de ingenieros industriales de Andalucía Oriental. Ofrece formación continua en organización de la producción, métodos de trabajo, gestión de calidad y eficiencia industrial en Granada y Málaga.",
    servicios: ["Organización de la Producción", "Métodos de Trabajo", "Gestión de Calidad", "Eficiencia Industrial", "Formación Continua"],
    ubicacion: { pais: "España", ciudad: "Granada", direccion: "Calle de la Paz 18, Granada, 18009" },
    contacto: { email: "coiiaoriental@coiia.com", telefono: "+34 958 22 65 40", web: "https://www.coiiaoriental.com/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es", seccion: "consultores" },

  { nombre: "Colegio de Ingenieros Técnicos Industriales de Aragón", slug: "cogiti-aragon", tipo: "empresa",
    especialidades: ["formacion", "colegio-profesional", "ingenieria-industrial"],
    descripcion: "Colegio de ingenieros técnicos industriales de Aragón con formación en organización industrial, producción, métodos y tiempos. Cursos de especialización y formación continua.",
    servicios: ["Organización Industrial", "Gestión de Producción", "Métodos y Tiempos", "Formación Continua", "Cursos de Especialización"],
    ubicacion: { pais: "España", ciudad: "Zaragoza", direccion: "Calle de la Torre 12, Zaragoza, 50001" },
    contacto: { email: "cogitiaragon@cogitiaragon.es", telefono: "+34 976 23 50 00", web: "https://www.cogitiaragon.es/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es", seccion: "consultores" },

  { nombre: "Colegio de Ingenieros Técnicos Industriales de Valencia", slug: "cogiti-valencia", tipo: "empresa",
    especialidades: ["formacion", "colegio-profesional", "ingenieria-industrial"],
    descripcion: "Colegio de ingenieros técnicos industriales de Valencia. Programas de formación continua en organización industrial, métodos y tiempos, calidad y producción industrial para profesionales valencianos.",
    servicios: ["Organización Industrial", "Métodos y Tiempos", "Calidad Industrial", "Producción", "Formación Continua"],
    ubicacion: { pais: "España", ciudad: "Valencia", direccion: "Calle de la Paz 18, Valencia, 46003" },
    contacto: { email: "cogitival@cogitival.es", telefono: "+34 963 52 33 00", web: "https://www.cogitival.es/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es", seccion: "consultores" },

  { nombre: "Colegio de Ingenieros Técnicos Industriales de Vizcaya", slug: "cogiti-vizcaya", tipo: "empresa",
    especialidades: ["formacion", "colegio-profesional", "ingenieria-industrial"],
    descripcion: "Colegio de ingenieros técnicos industriales de Vizcaya. Ofrece formación en organización industrial, producción, métodos de trabajo, gestión de calidad y prevención de riesgos laborales.",
    servicios: ["Organización Industrial", "Métodos de Trabajo", "Gestión de Calidad", "Prevención de Riesgos", "Formación Continua"],
    ubicacion: { pais: "España", ciudad: "Bilbao", direccion: "Calle de la Gran Vía 37, Bilbao, 48009" },
    contacto: { email: "info@cogitivizcaya.es", telefono: "+34 944 23 78 00", web: "https://www.cogitivizcaya.es/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es", seccion: "consultores" },

  { nombre: "Colegio de Ingenieros Técnicos Industriales de Galicia", slug: "cogiti-galicia", tipo: "empresa",
    especialidades: ["formacion", "colegio-profesional", "ingenieria-industrial"],
    descripcion: "Colegio de ingenieros técnicos industriales de Galicia. Programas de formación y especialización en organización industrial, métodos y tiempos, control de calidad y eficiencia productiva.",
    servicios: ["Organización Industrial", "Métodos y Tiempos", "Control de Calidad", "Eficiencia Productiva", "Cursos de Especialización"],
    ubicacion: { pais: "España", ciudad: "A Coruña", direccion: "Calle de la Torre 14, A Coruña, 15001" },
    contacto: { email: "info@cogitigalicia.es", telefono: "+34 981 22 15 80", web: "https://www.cogitigalicia.es/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es", seccion: "consultores" },

  // === MÁS CÁMARAS DE COMERCIO PROVINCIALES ===
  { nombre: "Cámara de Comercio de Sevilla - Formación Industrial", slug: "camara-sevilla", tipo: "empresa",
    especialidades: ["formacion", "comercio", "industria"],
    descripcion: "Cámara de Comercio de Sevilla con programas de formación en gestión industrial, organización de la producción, logística y mejora de la competitividad para empresas sevillanas.",
    servicios: ["Gestión Industrial", "Organización de la Producción", "Logística", "Mejora de la Competitividad", "Cursos para Pymes"],
    ubicacion: { pais: "España", ciudad: "Sevilla", direccion: "Plaza de la Contratación 8, Sevilla, 41004" },
    contacto: { email: "formacion@camaradesevilla.com", telefono: "+34 954 50 49 00", web: "https://www.camaradesevilla.com/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es", seccion: "consultores" },

  { nombre: "Cámara de Comercio de Zaragoza - Formación", slug: "camara-zaragoza", tipo: "empresa",
    especialidades: ["formacion", "comercio", "industria"],
    descripcion: "Cámara de Comercio de Zaragoza con oferta formativa en organización industrial, producción, logística y gestión empresarial para el tejido industrial aragonés.",
    servicios: ["Formación en Organización Industrial", "Producción y Logística", "Gestión Empresarial", "Cursos para la Industria", "Programas de Mejora"],
    ubicacion: { pais: "España", ciudad: "Zaragoza", direccion: "Paseo de la Independencia 24, Zaragoza, 50001" },
    contacto: { email: "formacion@camarazaragoza.com", telefono: "+34 976 30 17 17", web: "https://www.camarazaragoza.com/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es", seccion: "consultores" },

  { nombre: "Cámara de Comercio de Bilbao - Formación Industrial", slug: "camara-bilbao", tipo: "empresa",
    especialidades: ["formacion", "industria", "gestion"],
    descripcion: "Cámara de Comercio de Bilbao con programas formativos en organización industrial, producción, logística, cadena de suministro y mejora de procesos para el tejido industrial vizcaíno.",
    servicios: ["Organización Industrial", "Producción y Logística", "Cadena de Suministro", "Mejora de Procesos", "Cursos Industriales"],
    ubicacion: { pais: "España", ciudad: "Bilbao", direccion: "Alameda de Recalde 50, Bilbao, 48008" },
    contacto: { email: "formacion@camarabilbao.com", telefono: "+34 944 70 30 00", web: "https://www.camarabilbao.com/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es", seccion: "consultores" },

  { nombre: "Cámara de Comercio de Málaga - Formación", slug: "camara-malaga", tipo: "empresa",
    especialidades: ["formacion", "industria", "gestion"],
    descripcion: "Cámara de Comercio de Málaga con cursos y programas formativos en gestión industrial, organización de la producción, logística y eficiencia operativa para pymes malagueñas.",
    servicios: ["Gestión Industrial", "Organización de la Producción", "Logística", "Eficiencia Operativa", "Formación para Pymes"],
    ubicacion: { pais: "España", ciudad: "Málaga", direccion: "Calle de la Bolsa 3, Málaga, 29015" },
    contacto: { email: "formacion@camaramalaga.com", telefono: "+34 952 21 10 00", web: "https://www.camaramalaga.com/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es", seccion: "consultores" },

  { nombre: "Cámara de Comercio de Murcia - Formación Industrial", slug: "camara-murcia", tipo: "empresa",
    especialidades: ["formacion", "industria", "gestion"],
    descripcion: "Cámara de Comercio de Murcia con formación en organización industrial, gestión de la producción, mejora de procesos y logística para empresas de la Región de Murcia.",
    servicios: ["Organización Industrial", "Gestión de la Producción", "Mejora de Procesos", "Logística", "Cursos Industriales"],
    ubicacion: { pais: "España", ciudad: "Murcia", direccion: "Calle de la Merced 4, Murcia, 30001" },
    contacto: { email: "formacion@camaramurcia.es", telefono: "+34 968 22 91 00", web: "https://www.camaramurcia.es/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es", seccion: "consultores" },

  { nombre: "Cámara de Comercio de Alicante - Formación", slug: "camara-alicante", tipo: "empresa",
    especialidades: ["formacion", "industria", "gestion"],
    descripcion: "Cámara de Comercio de Alicante con programas formativos en organización industrial, producción, calidad y logística dirigidos a empresas del sector industrial alicantino.",
    servicios: ["Organización Industrial", "Gestión de Producción", "Control de Calidad", "Logística", "Cursos para Empresas"],
    ubicacion: { pais: "España", ciudad: "Alicante", direccion: "Calle de San Fernando 5, Alicante, 03001" },
    contacto: { email: "formacion@camaraalicante.com", telefono: "+34 965 14 40 00", web: "https://www.camaraalicante.com/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es", seccion: "consultores" },

  // === UNIVERSIDADES CON PROGRAMAS DE ORGANIZACIÓN INDUSTRIAL ===
  { nombre: "Universidad Politécnica de Madrid - Ingeniería de Organización", slug: "upm-organizacion", tipo: "empresa",
    especialidades: ["formacion", "universidad", "ingenieria-industrial"],
    descripcion: "La Escuela Técnica Superior de Ingenieros Industriales de la UPM ofrece programas de Ingeniería de Organización, máster en dirección de operaciones y cursos de especialización en métodos y tiempos.",
    servicios: ["Grado en Ingeniería de Organización", "Máster en Dirección de Operaciones", "Cursos de Métodos y Tiempos", "Lean Manufacturing", "Gestión de la Producción"],
    ubicacion: { pais: "España", ciudad: "Madrid", direccion: "Calle de José Gutiérrez Abascal 2, Madrid, 28006" },
    contacto: { email: "informacion@etsii.upm.es", telefono: "+34 910 67 00 00", web: "https://www.etsii.upm.es/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es", seccion: "consultores" },

  { nombre: "Universitat Politècnica de Catalunya - Organització Industrial", slug: "upc-organitzacio", tipo: "empresa",
    especialidades: ["formacion", "universidad", "ingenieria-industrial"],
    descripcion: "La Escola Tècnica Superior d'Enginyeria Industrial de Barcelona (ETSEIB) ofrece formación en organización industrial, dirección de operaciones, logística y gestión de la producción.",
    servicios: ["Ingeniería de Organización", "Dirección de Operaciones", "Logística Industrial", "Gestión de la Producción", "Máster en Supply Chain"],
    ubicacion: { pais: "España", ciudad: "Barcelona", direccion: "Av. de la Diagonal 647, Barcelona, 08028" },
    contacto: { email: "etseib@etseib.upc.edu", telefono: "+34 934 01 66 00", web: "https://etseib.upc.edu/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es", seccion: "consultores" },

  { nombre: "Universitat Politècnica de València - Organización Industrial", slug: "upv-organizacion", tipo: "empresa",
    especialidades: ["formacion", "universidad", "ingenieria-industrial"],
    descripcion: "La Escuela Técnica Superior de Ingenieros Industriales de la UPV ofrece programas en ingeniería de organización industrial, gestión de operaciones y producción con laboratorios de métodos y tiempos.",
    servicios: ["Ingeniería de Organización Industrial", "Gestión de Operaciones", "Lean Manufacturing", "Simulación de Procesos", "Laboratorio de Métodos"],
    ubicacion: { pais: "España", ciudad: "Valencia", direccion: "Camino de Vera s/n, Valencia, 46022" },
    contacto: { email: "etsii@upv.es", telefono: "+34 963 87 70 00", web: "https://www.upv.es/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es", seccion: "consultores" },

  { nombre: "Universidad de Sevilla - Ingeniería de Organización Industrial", slug: "us-organizacion", tipo: "empresa",
    especialidades: ["formacion", "universidad", "ingenieria-industrial"],
    descripcion: "La Escuela Técnica Superior de Ingeniería de la Universidad de Sevilla ofrece el Grado en Ingeniería de Organización Industrial, con formación en métodos y tiempos, planificación de la producción y logística.",
    servicios: ["Grado en Ingeniería de Organización Industrial", "Planificación de la Producción", "Métodos y Tiempos", "Logística", "Gestión de la Calidad"],
    ubicacion: { pais: "España", ciudad: "Sevilla", direccion: "Camino de los Descubrimientos s/n, Sevilla, 41092" },
    contacto: { email: "etsi@us.es", telefono: "+34 954 48 73 00", web: "https://www.us.es/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es", seccion: "consultores" },

  { nombre: "Universidad de Zaragoza - Ingeniería de Organización Industrial", slug: "unizar-organizacion", tipo: "empresa",
    especialidades: ["formacion", "universidad", "ingenieria-industrial"],
    descripcion: "La Escuela de Ingeniería y Arquitectura de la Universidad de Zaragoza ofrece el Grado en Ingeniería de Organización Industrial con especialización en producción, logística y métodos de trabajo.",
    servicios: ["Ingeniería de Organización Industrial", "Gestión de Producción", "Logística", "Métodos de Trabajo", "Simulación Industrial"],
    ubicacion: { pais: "España", ciudad: "Zaragoza", direccion: "Calle María de Luna 3, Zaragoza, 50018" },
    contacto: { email: "eina@unizar.es", telefono: "+34 976 76 10 00", web: "https://eina.unizar.es/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es", seccion: "consultores" },

  { nombre: "Universidad de Málaga - Organización Industrial", slug: "uma-organizacion", tipo: "empresa",
    especialidades: ["formacion", "universidad", "ingenieria-industrial"],
    descripcion: "La Escuela de Ingenierías Industriales de la Universidad de Málaga ofrece el Grado en Ingeniería de Organización Industrial y programas de postgrado en dirección de operaciones y logística.",
    servicios: ["Ingeniería de Organización Industrial", "Dirección de Operaciones", "Logística", "Gestión de Calidad", "Producción"],
    ubicacion: { pais: "España", ciudad: "Málaga", direccion: "Calle de la Explanada de la Estación 6, Málaga, 29071" },
    contacto: { email: "info@uma.es", telefono: "+34 952 13 10 00", web: "https://www.uma.es/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es", seccion: "consultores" },

  { nombre: "Universidad de Oviedo - Ingeniería de Organización Industrial", slug: "uniovi-organizacion", tipo: "empresa",
    especialidades: ["formacion", "universidad", "ingenieria-industrial"],
    descripcion: "La Escuela Politécnica de Ingeniería de la Universidad de Oviedo ofrece el Grado en Ingeniería de Organización Industrial con formación en métodos y tiempos, producción y logística.",
    servicios: ["Ingeniería de Organización Industrial", "Métodos y Tiempos", "Producción", "Logística Industrial", "Gestión de Operaciones"],
    ubicacion: { pais: "España", ciudad: "Gijón", direccion: "Campus de Viesques s/n, Gijón, 33203" },
    contacto: { email: "epi@uniovi.es", telefono: "+34 985 18 20 00", web: "https://epi.uniovi.es/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es", seccion: "consultores" },

  { nombre: "Universidad Politécnica de Cartagena - Organización Industrial", slug: "upct-organizacion", tipo: "empresa",
    especialidades: ["formacion", "universidad", "ingenieria-industrial"],
    descripcion: "La Escuela Técnica Superior de Ingeniería Industrial de la UPCT ofrece el Grado en Ingeniería de Organización Industrial, con especialización en producción, calidad y gestión industrial.",
    servicios: ["Ingeniería de Organización Industrial", "Gestión de la Producción", "Control de Calidad", "Logística", "Lean Manufacturing"],
    ubicacion: { pais: "España", ciudad: "Cartagena", direccion: "Calle del Dr. Fleming s/n, Cartagena (Murcia), 30202" },
    contacto: { email: "etsii@upct.es", telefono: "+34 968 32 65 00", web: "https://www.upct.es/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es", seccion: "consultores" },

  { nombre: "Universidad de Valladolid - Organización Industrial", slug: "uva-organizacion", tipo: "empresa",
    especialidades: ["formacion", "universidad", "ingenieria-industrial"],
    descripcion: "La Escuela de Ingenierías Industriales de la Universidad de Valladolid ofrece programas en ingeniería de organización industrial, con formación en métodos de trabajo, planificación y logística.",
    servicios: ["Ingeniería de Organización Industrial", "Métodos de Trabajo", "Planificación de la Producción", "Logística", "Gestión de Calidad"],
    ubicacion: { pais: "España", ciudad: "Valladolid", direccion: "Paseo del Cauce 59, Valladolid, 47011" },
    contacto: { email: "eii@uva.es", telefono: "+34 983 18 45 00", web: "https://www.uva.es/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es", seccion: "consultores" },

  { nombre: "Mondragon Unibertsitatea - Ingeniería de Organización", slug: "mondragon-organizacion", tipo: "empresa",
    especialidades: ["formacion", "universidad", "ingenieria-industrial"],
    descripcion: "La Escuela Politécnica Superior de Mondragon Unibertsitatea ofrece el Grado en Ingeniería de Organización Industrial con enfoque práctico en lean manufacturing, métodos y tiempos y gestión de operaciones.",
    servicios: ["Ingeniería de Organización Industrial", "Lean Manufacturing", "Métodos y Tiempos", "Gestión de Operaciones", "Producción Avanzada"],
    ubicacion: { pais: "España", ciudad: "Arrasate-Mondragón", direccion: "Calle Loramendi 4, Arrasate (Gipuzkoa), 20500" },
    contacto: { email: "info@mondragon.edu", telefono: "+34 943 71 21 00", web: "https://www.mondragon.edu/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es", seccion: "consultores" },

  { nombre: "Universidad de Deusto - Organización Industrial", slug: "deusto-organizacion", tipo: "empresa",
    especialidades: ["formacion", "universidad", "ingenieria-industrial"],
    descripcion: "La Facultad de Ingeniería de la Universidad de Deusto ofrece programas en Ingeniería de Organización Industrial, con formación en métodos y tiempos, producción y dirección de operaciones.",
    servicios: ["Ingeniería de Organización Industrial", "Dirección de Operaciones", "Métodos y Tiempos", "Gestión de la Producción", "Calidad Industrial"],
    ubicacion: { pais: "España", ciudad: "Bilbao", direccion: "Av. de las Universidades 24, Bilbao, 48007" },
    contacto: { email: "ingenieria@deusto.es", telefono: "+34 944 13 90 00", web: "https://www.deusto.es/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es", seccion: "consultores" },

  { nombre: "Tecnun - Universidad de Navarra - Ingeniería de Organización", slug: "tecnun-organizacion", tipo: "empresa",
    especialidades: ["formacion", "universidad", "ingenieria-industrial"],
    descripcion: "Tecnun, Escuela de Ingeniería de la Universidad de Navarra, ofrece el Grado en Ingeniería de Organización Industrial y máster en dirección de operaciones y cadena de suministro.",
    servicios: ["Ingeniería de Organización Industrial", "Dirección de Operaciones", "Cadena de Suministro", "Lean Management", "Producción"],
    ubicacion: { pais: "España", ciudad: "Donostia-San Sebastián", direccion: "Paseo de Manuel Lardizabal 13, Donostia, 20018" },
    contacto: { email: "tecnun@unav.es", telefono: "+34 943 21 98 77", web: "https://www.tecnun.es/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es", seccion: "consultores" },

  { nombre: "ICAI - Universidad Pontificia Comillas - Organización Industrial", slug: "icai-organizacion", tipo: "empresa",
    especialidades: ["formacion", "universidad", "ingenieria-industrial"],
    descripcion: "La Escuela Técnica Superior de Ingeniería ICAI ofrece el Grado en Ingeniería de Organización Industrial y máster en gestión industrial con laboratorios de métodos y simulación de procesos.",
    servicios: ["Ingeniería de Organización Industrial", "Gestión Industrial", "Métodos y Tiempos", "Simulación de Procesos", "Lean Manufacturing"],
    ubicacion: { pais: "España", ciudad: "Madrid", direccion: "Calle de Alberto Aguilera 25, Madrid, 28015" },
    contacto: { email: "icai@comillas.edu", telefono: "+34 915 42 28 00", web: "https://www.comillas.edu/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es", seccion: "consultores" },

  { nombre: "Universidad de Castilla-La Mancha - Organización Industrial", slug: "uclm-organizacion", tipo: "empresa",
    especialidades: ["formacion", "universidad", "ingenieria-industrial"],
    descripcion: "La Escuela de Ingenieros Industriales de la UCLM en Ciudad Real y Toledo ofrece el Grado en Ingeniería de Organización Industrial con formación en producción, logística y calidad.",
    servicios: ["Ingeniería de Organización Industrial", "Gestión de la Producción", "Logística", "Control de Calidad", "Métodos de Trabajo"],
    ubicacion: { pais: "España", ciudad: "Ciudad Real", direccion: "Av. de Camilo José Cela s/n, Ciudad Real, 13071" },
    contacto: { email: "info@uclm.es", telefono: "+34 926 29 53 00", web: "https://www.uclm.es/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es", seccion: "consultores" },

  { nombre: "Universidad de Salamanca - Organización Industrial", slug: "usal-organizacion", tipo: "empresa",
    especialidades: ["formacion", "universidad", "ingenieria-industrial"],
    descripcion: "La Escuela Politécnica Superior de Zamora (Universidad de Salamanca) ofrece el Grado en Ingeniería de Organización Industrial con formación en métodos, producción y gestión de operaciones.",
    servicios: ["Ingeniería de Organización Industrial", "Métodos de Trabajo", "Gestión de Operaciones", "Producción", "Calidad Industrial"],
    ubicacion: { pais: "España", ciudad: "Zamora", direccion: "Av. de la Requejada 2, Zamora, 49022" },
    contacto: { email: "info@usal.es", telefono: "+34 923 29 44 00", web: "https://www.usal.es/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es", seccion: "consultores" },

  { nombre: "Universidad de Extremadura - Organización Industrial", slug: "uex-organizacion", tipo: "empresa",
    especialidades: ["formacion", "universidad", "ingenieria-industrial"],
    descripcion: "La Escuela de Ingenierías Industriales de la Universidad de Extremadura ofrece el Grado en Ingeniería de Organización Industrial con especialización en producción y gestión industrial.",
    servicios: ["Ingeniería de Organización Industrial", "Gestión Industrial", "Producción", "Logística", "Control de Calidad"],
    ubicacion: { pais: "España", ciudad: "Badajoz", direccion: "Av. de Elvas s/n, Badajoz, 06006" },
    contacto: { email: "info@unex.es", telefono: "+34 924 28 93 00", web: "https://www.unex.es/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es", seccion: "consultores" },

  { nombre: "Universidad de Burgos - Organización Industrial", slug: "ubu-organizacion", tipo: "empresa",
    especialidades: ["formacion", "universidad", "ingenieria-industrial"],
    descripcion: "La Escuela Politécnica Superior de la Universidad de Burgos ofrece el Grado en Ingeniería de Organización Industrial con formación en métodos, tiempos, producción y logística.",
    servicios: ["Ingeniería de Organización Industrial", "Métodos y Tiempos", "Gestión de Producción", "Logística", "Calidad"],
    ubicacion: { pais: "España", ciudad: "Burgos", direccion: "Calle de la Calera s/n, Burgos, 09006" },
    contacto: { email: "info@ubu.es", telefono: "+34 947 25 88 00", web: "https://www.ubu.es/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es", seccion: "consultores" },

  { nombre: "Universidad de Cádiz - Organización Industrial", slug: "uca-organizacion", tipo: "empresa",
    especialidades: ["formacion", "universidad", "ingenieria-industrial"],
    descripcion: "La Escuela Superior de Ingeniería de la Universidad de Cádiz ofrece el Grado en Ingeniería de Organización Industrial enfocado en la industria naval y auxiliar de la Bahía de Cádiz.",
    servicios: ["Ingeniería de Organización Industrial", "Gestión de la Producción", "Logística Industrial", "Lean Manufacturing", "Calidad"],
    ubicacion: { pais: "España", ciudad: "Puerto Real", direccion: "Av. de la Universidad s/n, Puerto Real (Cádiz), 11510" },
    contacto: { email: "info@uca.es", telefono: "+34 956 01 60 00", web: "https://www.uca.es/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es", seccion: "consultores" },

  { nombre: "Universidad de La Laguna - Organización Industrial", slug: "ull-organizacion", tipo: "empresa",
    especialidades: ["formacion", "universidad", "ingenieria-industrial"],
    descripcion: "La Escuela Superior de Ingeniería y Tecnología de la Universidad de La Laguna ofrece programas en organización industrial, producción y logística para el sector industrial canario.",
    servicios: ["Ingeniería de Organización Industrial", "Gestión de Producción", "Logística", "Métodos de Trabajo", "Control de Calidad"],
    ubicacion: { pais: "España", ciudad: "San Cristóbal de La Laguna", direccion: "Av. de la Universidad s/n, San Cristóbal de La Laguna (Tenerife), 38200" },
    contacto: { email: "info@ull.edu.es", telefono: "+34 922 31 90 00", web: "https://www.ull.es/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es", seccion: "consultores" },

  // === CENTROS DE FORMACIÓN PROFESIONAL DE REFERENCIA ===
  { nombre: "CIFP Carlos III - Formación en Producción Industrial", slug: "cifp-carlosiii", tipo: "empresa",
    especialidades: ["formacion", "formacion-profesional", "produccion"],
    descripcion: "Centro Integrado de Formación Profesional de Madrid especializado en producción industrial, organización de la fabricación, control de calidad y gestión de la producción.",
    servicios: ["FP en Producción Industrial", "Organización de la Fabricación", "Control de Calidad", "Gestión de la Producción", "Cursos de Especialización"],
    ubicacion: { pais: "España", ciudad: "Madrid", direccion: "Calle de la Rosario Pino 14, Madrid, 28020" },
    contacto: { email: "cifpcarlos3@educa.madrid.org", telefono: "+34 915 71 53 00", web: "https://www.cifpcarlosiii.es/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es", seccion: "consultores" },

  { nombre: "CIFP Politécnico de Murcia - Formación Industrial", slug: "cifp-murcia", tipo: "empresa",
    especialidades: ["formacion", "formacion-profesional", "produccion"],
    descripcion: "Centro Integrado de Formación Profesional de Murcia con programas en organización de la producción, gestión de calidad y fabricación mecánica para el sector industrial.",
    servicios: ["FP en Organización de la Producción", "Gestión de Calidad", "Fabricación Mecánica", "Automatización", "Cursos Industriales"],
    ubicacion: { pais: "España", ciudad: "Murcia", direccion: "Av. de la Fama 2, Murcia, 30006" },
    contacto: { email: "cifpmurcia@educarm.es", telefono: "+34 968 23 18 00", web: "https://www.cifpmurcia.es/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es", seccion: "consultores" },

  { nombre: "CIFP Virgen de Gracia - FP Organización Industrial", slug: "cifp-virgendeagracia", tipo: "empresa",
    especialidades: ["formacion", "formacion-profesional", "produccion"],
    descripcion: "Centro Integrado de Formación Profesional de Puertollano con programas formativos en organización de la producción industrial, control de calidad y gestión de la fabricación.",
    servicios: ["FP en Organización Industrial", "Control de Calidad", "Gestión de Fabricación", "Prevención de Riesgos", "Cursos de Especialización"],
    ubicacion: { pais: "España", ciudad: "Puertollano", direccion: "Calle de los Alfareros s/n, Puertollano (Ciudad Real), 13500" },
    contacto: { email: "cifpvirgendeagracia@edu.jccm.es", telefono: "+34 926 45 60 00", web: "https://www.cifpvirgendeagracia.es/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es", seccion: "consultores" },

  { nombre: "CIFP Bidasoa - Formación en Producción", slug: "cifp-bidasoa", tipo: "empresa",
    especialidades: ["formacion", "formacion-profesional", "produccion"],
    descripcion: "Centro Integrado de Formación Profesional de Gipuzkoa especializado en organización de la producción industrial, fabricación mecánica y gestión de calidad para el sector industrial vasco.",
    servicios: ["FP en Organización de la Producción", "Fabricación Mecánica", "Gestión de Calidad", "Automatización", "Formación Industrial"],
    ubicacion: { pais: "España", ciudad: "Irun", direccion: "Calle de Nafarroa Hiribidea 4, Irun (Gipuzkoa), 20303" },
    contacto: { email: "cifpbidasoa@hezkuntza.eus", telefono: "+34 943 63 53 00", web: "https://www.cifpbidasoa.eus/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es", seccion: "consultores" },

  // === MÁS ACADEMIAS Y PLATAFORMAS ONLINE ===
  { nombre: "Udemy Español - Cursos de Métodos y Tiempos", slug: "udemy-metodos", tipo: "empresa",
    especialidades: ["formacion", "cursos-online", "metodos"],
    descripcion: "Plataforma de formación online con cursos en español sobre ingeniería de métodos y tiempos, cronometraje industrial, MTM, lean manufacturing y organización industrial impartidos por instructores cualificados.",
    servicios: ["Cursos de Métodos y Tiempos", "Cronometraje Industrial", "MTM Online", "Lean Manufacturing", "Organización Industrial", "Formación Online"],
    ubicacion: { pais: "España", ciudad: "Madrid", direccion: "Madrid, España" },
    contacto: { email: "", telefono: "", web: "https://www.udemy.com/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es", seccion: "consultores" },

  { nombre: "LinkedIn Learning Español - Operaciones Industriales", slug: "linkedin-learning", tipo: "empresa",
    especialidades: ["formacion", "cursos-online", "operaciones"],
    descripcion: "Plataforma de formación online con cursos en español sobre dirección de operaciones, organización industrial, lean manufacturing, cadena de suministro y mejora de procesos.",
    servicios: ["Cursos de Operaciones", "Lean Manufacturing", "Organización Industrial", "Cadena de Suministro", "Mejora de Procesos", "Formación Online"],
    ubicacion: { pais: "España", ciudad: "Madrid", direccion: "Madrid, España" },
    contacto: { email: "", telefono: "", web: "https://www.linkedin.com/learning/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es", seccion: "consultores" },

  { nombre: "Cursos de Organización Industrial - CCC", slug: "ccc-organizacion", tipo: "empresa",
    especialidades: ["formacion", "cursos", "organizacion-industrial"],
    descripcion: "Centro de estudios CCC ofrece formación a distancia en organización industrial, gestión de la producción, control de calidad y métodos de trabajo con titulación profesional.",
    servicios: ["Organización Industrial", "Gestión de la Producción", "Control de Calidad", "Métodos de Trabajo", "Formación a Distancia"],
    ubicacion: { pais: "España", ciudad: "Madrid", direccion: "Calle de la Gran Vía 25, Madrid, 28013" },
    contacto: { email: "info@ccc.es", telefono: "+34 900 15 55 00", web: "https://www.ccc.es/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es", seccion: "consultores" },

  { nombre: "CEAC Formación - Organización Industrial", slug: "ceac-formacion", tipo: "empresa",
    especialidades: ["formacion", "cursos", "organizacion-industrial"],
    descripcion: "Centro de formación a distancia con cursos profesionales en organización industrial, gestión de la producción, control de calidad y métodos de trabajo con más de 70 años de experiencia.",
    servicios: ["Organización Industrial", "Gestión de la Producción", "Control de Calidad", "Métodos de Trabajo", "Formación a Distancia"],
    ubicacion: { pais: "España", ciudad: "Barcelona", direccion: "Calle de la Diputación 246, Barcelona, 08007" },
    contacto: { email: "info@ceac.es", telefono: "+34 900 12 12 00", web: "https://www.ceac.es/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es", seccion: "consultores" },
];

// Filtrar duplicados
let added = 0;
for (const e of entries) {
  const nameLow = e.nombre.toLowerCase().trim();
  if (existingNames.has(nameLow)) {
    console.log(`  DUPLICADO: ${e.nombre}`);
    continue;
  }
  try {
    await db.collection("directorio_consultores_asetemyt").add(e);
    console.log(`✅ [${++added}] ${e.nombre}`);
  } catch (err) {
    console.log(`❌ Error: ${e.nombre}: ${err.message}`);
  }
}

console.log(`\nTotal añadidas en esta ronda: ${added}`);
process.exit(0);
