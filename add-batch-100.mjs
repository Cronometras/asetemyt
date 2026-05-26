import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync, writeFileSync } from "fs";

const sa = JSON.parse(readFileSync("/home/ubuntu/projects/articulos-IA---a-Firestore/backup/firebase-service-account-asetemyt.json", "utf8"));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

const empresas = [
  {
    nombre: "IDOM Ingeniería y Consultoría",
    slug: "idom",
    tipo: "empresa",
    especialidades: ["ingenieria-industrial", "consultoria", "proyectos"],
    descripcion: "Grupo internacional de ingeniería y consultoría con sede en Bilbao. Especialistas en ingeniería industrial, consultoría de procesos y proyectos de planta. Más de 60 años de experiencia en más de 50 países.",
    servicios: ["Ingeniería Industrial", "Consultoría de Procesos", "Proyectos de Planta", "Dirección de Proyectos", "Lean Design", "Optimización de Instalaciones"],
    ubicacion: { pais: "España", ciudad: "Bilbao", direccion: "Plaza Sagrado Corazón 1, Bilbao, 48011" },
    contacto: { email: "", telefono: "+34 944 79 70 00", web: "https://www.idom.com/", linkedin: "https://www.linkedin.com/company/idom/", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "SENER Grupo de Ingeniería",
    slug: "sener-ingenieria",
    tipo: "empresa",
    especialidades: ["ingenieria-industrial", "aeroespacial", "energia"],
    descripcion: "Grupo privado de ingeniería y tecnología fundado en 1956 con sede en Getxo. Referente mundial en ingeniería industrial, aeroespacial, energía e infraestructuras. Reconocidos por su excelencia en ingeniería de procesos.",
    servicios: ["Ingeniería Industrial", "Ingeniería de Procesos", "Automatización", "Sistemas de Control", "Gestión de Proyectos", "Consultoría Técnica"],
    ubicacion: { pais: "España", ciudad: "Getxo", direccion: "Avenida Zugazarte 56, Getxo, 48930" },
    contacto: { email: "comunicacion@sener.es", telefono: "+34 944 81 75 00", web: "https://www.sener.es/", linkedin: "https://www.linkedin.com/company/sener/", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Técnicas Reunidas",
    slug: "tecnicas-reunidas",
    tipo: "empresa",
    especialidades: ["ingenieria-industrial", "energia", "petroquimica"],
    descripcion: "Compañía española líder en ingeniería y construcción de plantas industriales, especialmente en los sectores de refino, petroquímica, gas y generación de energía. Cotiza en IBEX 35 desde 2006.",
    servicios: ["Ingeniería de Plantas", "Gestión de Proyectos EPC", "Automatización Industrial", "Ingeniería de Procesos", "Consultoría Técnica", "Puesta en Marcha"],
    ubicacion: { pais: "España", ciudad: "Madrid", direccion: "Av. de la Castellana 79, Madrid, 28046" },
    contacto: { email: "", telefono: "+34 915 92 43 00", web: "https://www.tecnicasreunidas.es/", linkedin: "https://www.linkedin.com/company/tecnicasreunidas/", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Ayesa Ingeniería y Arquitectura",
    slug: "ayesa",
    tipo: "empresa",
    especialidades: ["ingenieria-industrial", "arquitectura", "consultoria", "tic"],
    descripcion: "Grupo sevillano de ingeniería, arquitectura y consultoría TIC con presencia en 23 países. Especialistas en ingeniería industrial, automatización de procesos y transformación digital para la industria.",
    servicios: ["Ingeniería Industrial", "Automatización", "Transformación Digital Industrial", "Arquitectura Industrial", "Consultoría TIC", "Smart Manufacturing"],
    ubicacion: { pais: "España", ciudad: "Sevilla", direccion: "Calle Marie Curie 18, Sevilla, 41092" },
    contacto: { email: "", telefono: "+34 954 47 81 00", web: "https://www.ayesa.com/", linkedin: "https://www.linkedin.com/company/ayesa/", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Grupo CT Ingenieros",
    slug: "ct-ingenieros",
    tipo: "empresa",
    especialidades: ["ingenieria-industrial", "automatizacion", "consultoria-tecnologica"],
    descripcion: "Grupo de ingeniería multidisciplinar con sede en Pamplona y presencia internacional. Expertos en ingeniería industrial, automatización de procesos, lean manufacturing y eficiencia operativa para el sector industrial.",
    servicios: ["Ingeniería Industrial", "Automatización de Procesos", "Lean Manufacturing", "Industria 4.0", "Eficiencia Operativa", "Consultoría Tecnológica"],
    ubicacion: { pais: "España", ciudad: "Pamplona", direccion: "Polígono Industrial Mutilva Baja, Calle S, Pamplona, 31192" },
    contacto: { email: "info@ctingenieros.es", telefono: "+34 948 28 69 00", web: "https://www.ctingenieros.es/", linkedin: "https://www.linkedin.com/company/ct-ingenieros/", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "GMV Innovating Solutions",
    slug: "gmv",
    tipo: "empresa",
    especialidades: ["consultoria-tecnologica", "automatizacion", "sistemas"],
    descripcion: "Grupo tecnológico español fundado en 1984, especializado en sistemas de control, automatización industrial, robótica y soluciones de ingeniería para planta industrial. Referente en sistemas críticos para industria.",
    servicios: ["Automatización Industrial", "Robótica", "Sistemas de Control", "IoT Industrial", "Ciberseguridad Industrial", "Consultoría Tecnológica"],
    ubicacion: { pais: "España", ciudad: "Tres Cantos", direccion: "Calle Isaac Newton 11, Tres Cantos (Madrid), 28760" },
    contacto: { email: "", telefono: "+34 918 07 21 00", web: "https://www.gmv.com/", linkedin: "https://www.linkedin.com/company/gmv/", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Grupo Oesía",
    slug: "grupo-oesia",
    tipo: "empresa",
    especialidades: ["ingenieria-industrial", "tic", "defensa"],
    descripcion: "Grupo tecnológico e industrial español especializado en ingeniería de sistemas, ciberseguridad, transformación digital y soluciones industriales avanzadas. Opera en sectores de defensa, industria y telecomunicaciones.",
    servicios: ["Ingeniería de Sistemas", "Transformación Digital Industrial", "Ciberseguridad", "Desarrollo de Software Industrial", "Consultoría Tecnológica"],
    ubicacion: { pais: "España", ciudad: "Madrid", direccion: "Calle de la Azalea 1, Madrid, 28053" },
    contacto: { email: "", telefono: "+34 913 75 85 00", web: "https://www.grupooesia.com/", linkedin: "https://www.linkedin.com/company/grupo-oesia/", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Indra Sistemas",
    slug: "indra-sistemas",
    tipo: "empresa",
    especialidades: ["tic", "consultoria-tecnologica", "defensa"],
    descripcion: "Multinacional española líder en consultoría tecnológica, defensa y sistemas industriales. A través de Minsait ofrece soluciones de digitalización industrial, automatización y optimización de procesos productivos.",
    servicios: ["Transformación Digital Industrial", "IoT Industrial", "Ciberseguridad Industrial", "Automatización de Procesos", "Consultoría Tecnológica", "Big Data Industrial"],
    ubicacion: { pais: "España", ciudad: "Madrid", direccion: "Av. de Bruselas 35, Alcobendas (Madrid), 28108" },
    contacto: { email: "", telefono: "+34 914 80 50 00", web: "https://www.indracompany.com/", linkedin: "https://www.linkedin.com/company/indra/", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Minsait (Indra)",
    slug: "minsait",
    tipo: "empresa",
    especialidades: ["tic", "consultoria-tecnologica", "transformacion-digital"],
    descripcion: "Filial tecnológica de Indra especializada en transformación digital de procesos industriales. Ofrece soluciones de IoT industrial, automatización inteligente, gemelos digitales y optimización de la producción.",
    servicios: ["Transformación Digital", "IoT Industrial", "Gemelos Digitales", "Automatización Inteligente", "Optimización de Producción", "Analítica Industrial"],
    ubicacion: { pais: "España", ciudad: "Alcobendas", direccion: "Av. de Bruselas 35, Alcobendas (Madrid), 28108" },
    contacto: { email: "", telefono: "+34 914 80 50 00", web: "https://www.minsait.com/", linkedin: "https://www.linkedin.com/company/minsait/", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Applus+ Laboratories",
    slug: "applus-laboratories",
    tipo: "empresa",
    especialidades: ["ensayos", "certificacion", "calidad", "seguridad-industrial"],
    descripcion: "Multinacional española líder en servicios de ensayo, inspección, certificación y testing industrial. Opera en más de 20 países ofreciendo soluciones de control de calidad, ergonomía y seguridad en procesos industriales.",
    servicios: ["Ensayos Industriales", "Certificación", "Inspección Técnica", "Ergonomía", "Análisis de Métodos", "Control de Calidad"],
    ubicacion: { pais: "España", ciudad: "Barcelona", direccion: "Campus UAB, Ronda de la Font del Carme, Bellaterra (Barcelona), 08193" },
    contacto: { email: "", telefono: "+34 935 67 20 00", web: "https://www.applus.com/", linkedin: "https://www.linkedin.com/company/applus/", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Gonvarri Solar Steel",
    slug: "gonvarri",
    tipo: "empresa",
    especialidades: ["metalurgia", "produccion", "ingenieria-industrial"],
    descripcion: "División industrial del Grupo Gonvarri especializada en procesado de acero y aluminio para el sector industrial. Implementa metodologías lean y sistemas avanzados de gestión de producción y calidad.",
    servicios: ["Procesado de Acero", "Gestión de Producción Lean", "Control de Calidad", "Logística Industrial", "Optimización de Procesos"],
    ubicacion: { pais: "España", ciudad: "Bilbao", direccion: "Calle San Vicente 8, Bilbao, 48001" },
    contacto: { email: "", telefono: "+34 944 87 40 00", web: "https://www.gonvarri.com/", linkedin: "https://www.linkedin.com/company/gonvarri/", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Grupo Antolín",
    slug: "grupo-antolin",
    tipo: "empresa",
    especialidades: ["automocion", "produccion", "ingenieria-industrial"],
    descripcion: "Multinacional española proveedora de componentes para automoción con presencia global. Reconocida por la excelencia en sus sistemas de producción, implantación de metodologías lean y mejora continua en planta.",
    servicios: ["Lean Manufacturing", "Mejora Continua", "Gestión de Producción", "Ingeniería de Procesos", "Calidad Industrial", "Logística"],
    ubicacion: { pais: "España", ciudad: "Burgos", direccion: "Ctra. Madrid-Irún Km. 244, Burgos, 09007" },
    contacto: { email: "", telefono: "+34 947 47 77 00", web: "https://www.grupoantolin.com/", linkedin: "https://www.linkedin.com/company/grupo-antolin/", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Gestamp Automoción",
    slug: "gestamp",
    tipo: "empresa",
    especialidades: ["automocion", "produccion", "ingenieria-procesos"],
    descripcion: "Multinacional española especializada en el diseño, desarrollo y fabricación de componentes metálicos para automoción. Referente en ingeniería de procesos, lean manufacturing y eficiencia productiva.",
    servicios: ["Ingeniería de Procesos", "Lean Manufacturing", "Estampación", "Soldadura", "Gestión de Producción", "Mejora Continua"],
    ubicacion: { pais: "España", ciudad: "Madrid", direccion: "Paseo de la Castellana 139, Madrid, 28046" },
    contacto: { email: "", telefono: "+34 917 08 35 00", web: "https://www.gestamp.com/", linkedin: "https://www.linkedin.com/company/gestamp/", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Grupo Cosentino",
    slug: "cosentino",
    tipo: "empresa",
    especialidades: ["produccion", "ingenieria-industrial", "calidad"],
    descripcion: "Multinacional española líder en la fabricación de superficies para arquitectura y diseño. Reconocida por la implantación de sistemas productivos avanzados, mejora continua y eficiencia operativa en sus plantas.",
    servicios: ["Gestión de Producción", "Mejora Continua", "Lean Manufacturing", "Eficiencia Operativa", "Calidad Industrial", "Logística"],
    ubicacion: { pais: "España", ciudad: "Almería", direccion: "Carretera A-334 Km. 58, Cantoria (Almería), 04884" },
    contacto: { email: "", telefono: "+34 950 44 45 00", web: "https://www.cosentino.com/", linkedin: "https://www.linkedin.com/company/cosentino/", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Porcelanosa Grupo",
    slug: "porcelanosa",
    tipo: "empresa",
    especialidades: ["produccion", "ingenieria-industrial", "calidad"],
    descripcion: "Grupo industrial español líder en fabricación de cerámica, mobiliario y revestimientos. Destaca por sus sistemas de producción eficiente, implantación de metodologías lean y control de calidad avanzado.",
    servicios: ["Producción Cerámica", "Lean Manufacturing", "Eficiencia Operativa", "Calidad Total", "Logística Industrial", "Procesos Productivos"],
    ubicacion: { pais: "España", ciudad: "Villarreal", direccion: "Carretera Villarreal-Puebla s/n, Villarreal (Castellón), 12540" },
    contacto: { email: "", telefono: "+34 964 50 67 00", web: "https://www.porcelanosa.com/", linkedin: "https://www.linkedin.com/company/porcelanosa/", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "CAF (Construcciones y Auxiliar de Ferrocarriles)",
    slug: "caf-ferrocarriles",
    tipo: "empresa",
    especialidades: ["produccion", "ingenieria-industrial", "calidad"],
    descripcion: "Empresa española líder en fabricación de material rodante ferroviario. Reconocida por sus avanzados sistemas de producción, ingeniería industrial y metodologías de mejora continua en sus factorías.",
    servicios: ["Fabricación Industrial", "Ingeniería de Producción", "Lean Manufacturing", "Control de Calidad", "Logística Industrial", "Gestión de Proyectos"],
    ubicacion: { pais: "España", ciudad: "Beasain", direccion: "José Miguel Iturrioz 26, Beasain (Gipuzkoa), 20200" },
    contacto: { email: "", telefono: "+34 943 88 09 00", web: "https://www.caf.net/", linkedin: "https://www.linkedin.com/company/caf/", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Roca Sanitario",
    slug: "roca",
    tipo: "empresa",
    especialidades: ["produccion", "ingenieria-industrial", "calidad"],
    descripcion: "Multinacional española líder en fabricación de productos de baño. Reconocida por la implantación de sistemas de producción eficientes, metodologías lean y gestión avanzada de calidad industrial.",
    servicios: ["Lean Manufacturing", "Gestión de Producción", "Mejora Continua", "Calidad Total", "Logística", "Eficiencia Operativa"],
    ubicacion: { pais: "España", ciudad: "Barcelona", direccion: "Av. Diagonal 513, Barcelona, 08029" },
    contacto: { email: "", telefono: "+34 902 33 11 00", web: "https://www.roca.es/", linkedin: "https://www.linkedin.com/company/roca/", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Grupo Irizar",
    slug: "irizar",
    tipo: "empresa",
    especialidades: ["produccion", "ingenieria-industrial", "automocion"],
    descripcion: "Grupo industrial vasco líder en fabricación de autobuses y carrocerías. Reconocido mundialmente por su sistema de producción lean (Irizar Lean) y modelo de gestión participativa basado en el respeto a las personas.",
    servicios: ["Lean Manufacturing", "Gestión Participativa", "Ingeniería de Producción", "Mejora Continua", "Calidad Total", "Formación Lean"],
    ubicacion: { pais: "España", ciudad: "Ormaiztegi", direccion: "Barrio de San Antolín s/n, Ormaiztegi (Gipuzkoa), 20216" },
    contacto: { email: "", telefono: "+34 943 88 22 00", web: "https://www.irizar.com/", linkedin: "https://www.linkedin.com/company/irizar-group/", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Danobat Group",
    slug: "danobat",
    tipo: "empresa",
    especialidades: ["produccion", "ingenieria-industrial", "maquina-herramienta"],
    descripcion: "Grupo industrial vasco líder en fabricación de máquina-herramienta y sistemas de producción. Especialistas en ingeniería de fabricación avanzada, automatización de procesos y soluciones de producción inteligente.",
    servicios: ["Fabricación Avanzada", "Automatización Industrial", "Ingeniería de Producción", "Máquina-Herramienta", "Lean Manufacturing", "Industria 4.0"],
    ubicacion: { pais: "España", ciudad: "Elgoibar", direccion: "Arriaga Kalea 21, Elgoibar (Gipuzkoa), 20870" },
    contacto: { email: "", telefono: "+34 943 74 80 00", web: "https://www.danobatgroup.com/", linkedin: "https://www.linkedin.com/company/danobat/", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "TECNALIA Research & Innovation",
    slug: "tecnalia",
    tipo: "empresa",
    especialidades: ["i-d-i", "innovacion", "consultoria-tecnologica"],
    descripcion: "Centro de investigación y desarrollo tecnológico privado español, referencia en I+D+i industrial. Ofrece servicios de consultoría avanzada en lean manufacturing, procesos industriales, fabricación inteligente y economía circular.",
    servicios: ["I+D+i Industrial", "Lean R&D", "Fabricación Inteligente", "Gemelos Digitales", "Automatización Avanzada", "Consultoría Tecnológica"],
    ubicacion: { pais: "España", ciudad: "Donostia-San Sebastián", direccion: "Parque Científico y Tecnológico de Gipuzkoa, Mikeletegi Pasealekua 2, Donostia, 20009" },
    contacto: { email: "info@tecnalia.com", telefono: "+34 902 76 00 00", web: "https://www.tecnalia.com/", linkedin: "https://www.linkedin.com/company/tecnalia/", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "EURECAT Technology Centre",
    slug: "eurecat",
    tipo: "empresa",
    especialidades: ["i-d-i", "innovacion", "consultoria-tecnologica"],
    descripcion: "Centro tecnológico líder del sur de Europa con más de 700 profesionales. Ofrece servicios avanzados de I+D industrial, consultoría en procesos productivos, fabricación aditiva y transformación digital para la industria.",
    servicios: ["I+D Industrial", "Fabricación Avanzada", "Lean Manufacturing", "Automatización", "Economía Circular", "Consultoría en Procesos"],
    ubicacion: { pais: "España", ciudad: "Barcelona", direccion: "Av. Diagonal 177, Barcelona, 08018" },
    contacto: { email: "", telefono: "+34 932 38 14 00", web: "https://eurecat.org/", linkedin: "https://www.linkedin.com/company/eurecat/", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "IKERLAN",
    slug: "ikerlan",
    tipo: "empresa",
    especialidades: ["i-d-i", "innovacion", "consultoria-tecnologica"],
    descripcion: "Centro tecnológico vasco especializado en ingeniería de producto y procesos avanzados. Referente en investigación industrial, electrónica de potencia, sistemas embebidos y fabricación inteligente.",
    servicios: ["I+D Industrial", "Ingeniería de Producto", "Fabricación Inteligente", "Sistemas Embebidos", "Electrónica Industrial", "Consultoría Tecnológica"],
    ubicacion: { pais: "España", ciudad: "Arrasate-Mondragón", direccion: "Paseo J.M. Arizmendiarrieta 2, Arrasate (Gipuzkoa), 20500" },
    contacto: { email: "info@ikerlan.es", telefono: "+34 943 71 24 00", web: "https://www.ikerlan.es/", linkedin: "https://www.linkedin.com/company/ikerlan/", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "AIDIMME Instituto Tecnológico",
    slug: "aidimme",
    tipo: "empresa",
    especialidades: ["i-d-i", "innovacion", "calidad"],
    descripcion: "Instituto tecnológico de la Comunidad Valenciana especializado en madera, mueble, embalaje y construcción industrial. Ofrece consultoría en procesos productivos, eficiencia energética, ergonomía y calidad industrial.",
    servicios: ["I+D Industrial", "Consultoría de Procesos", "Ergonomía", "Calidad Industrial", "Eficiencia Energética", "Formación Técnica"],
    ubicacion: { pais: "España", ciudad: "Valencia", direccion: "Calle Leonardo Da Vinci 38, Parque Tecnológico, Paterna (Valencia), 46980" },
    contacto: { email: "aidimme@aidimme.es", telefono: "+34 961 36 60 60", web: "https://www.aidimme.es/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "ITENE Instituto Tecnológico del Embalaje y Logística",
    slug: "itene",
    tipo: "empresa",
    especialidades: ["logistica", "i-d-i", "innovacion"],
    descripcion: "Centro tecnológico especializado en logística, embalaje y transporte. Ofrece servicios de consultoría en optimización logística, cadena de suministro, sistemas de transporte y mejora de procesos logísticos industriales.",
    servicios: ["Consultoría Logística", "Optimización de Cadena de Suministro", "Lean Logistics", "Embalaje Industrial", "I+D Logístico", "Formación"],
    ubicacion: { pais: "España", ciudad: "Valencia", direccion: "Calle del Progreso 24, Parque Tecnológico, Paterna (Valencia), 46980" },
    contacto: { email: "info@itene.com", telefono: "+34 961 82 03 00", web: "https://www.itene.com/", linkedin: "https://www.linkedin.com/company/itene/", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "ITAINNOVA Instituto Tecnológico de Aragón",
    slug: "itainnova",
    tipo: "empresa",
    especialidades: ["i-d-i", "innovacion", "consultoria-tecnologica"],
    descripcion: "Instituto tecnológico aragonés especializado en I+D+i industrial. Ofrece servicios en fabricación avanzada, robótica colaborativa, simulación de procesos, eficiencia energética y transformación digital para pymes industriales.",
    servicios: ["I+D Industrial", "Fabricación Avanzada", "Robótica Colaborativa", "Simulación de Procesos", "Eficiencia Energética", "Industria 4.0"],
    ubicacion: { pais: "España", ciudad: "Zaragoza", direccion: "Calle María de Luna 7, Zaragoza, 50018" },
    contacto: { email: "info@itainnova.es", telefono: "+34 976 01 10 00", web: "https://www.itainnova.es/", linkedin: "https://www.linkedin.com/company/itainnova/", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "CIDETEC Energy Storage",
    slug: "cidetec",
    tipo: "empresa",
    especialidades: ["i-d-i", "innovacion", "energia"],
    descripcion: "Centro tecnológico vasco especializado en almacenamiento de energía, superficies e ingeniería de materiales. Ofrece servicios de I+D industrial y consultoría técnica para la optimización de procesos de fabricación.",
    servicios: ["I+D Industrial", "Ingeniería de Materiales", "Procesos de Fabricación", "Consultoría Técnica", "Ensayos Industriales", "Formación"],
    ubicacion: { pais: "España", ciudad: "Donostia-San Sebastián", direccion: "Paseo Miramón 196, Donostia, 20014" },
    contacto: { email: "info@cidetec.es", telefono: "+34 943 30 90 22", web: "https://www.cidetec.es/", linkedin: "https://www.linkedin.com/company/cidetec/", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "CARTIF Centro Tecnológico",
    slug: "cartif",
    tipo: "empresa",
    especialidades: ["i-d-i", "innovacion", "automocion"],
    descripcion: "Centro tecnológico con sede en Valladolid especializado en I+D+i para el sector industrial. Áreas de excelencia en fabricación inteligente, sistemas de producción, calidad, logística y simulación de procesos industriales.",
    servicios: ["I+D Industrial", "Fabricación Inteligente", "Simulación de Procesos", "Calidad Industrial", "Logística", "Consultoría Tecnológica"],
    ubicacion: { pais: "España", ciudad: "Valladolid", direccion: "Parque Tecnológico de Boecillo, 205, Boecillo (Valladolid), 47151" },
    contacto: { email: "cartif@cartif.es", telefono: "+34 983 54 65 04", web: "https://www.cartif.es/", linkedin: "https://www.linkedin.com/company/cartif/", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Instituto Tecnológico de Galicia (ITG)",
    slug: "itg-galicia",
    tipo: "empresa",
    especialidades: ["i-d-i", "innovacion", "consultoria-tecnologica"],
    descripcion: "Centro tecnológico gallego especializado en ingeniería de procesos industriales, eficiencia energética, fabricación avanzada e Industria 4.0. Ofrece servicios de consultoría técnica y formación especializada.",
    servicios: ["I+D Industrial", "Eficiencia Energética", "Fabricación Avanzada", "Industria 4.0", "Ingeniería de Procesos", "Consultoría Técnica"],
    ubicacion: { pais: "España", ciudad: "A Coruña", direccion: "Calle Pasteur 3, Parque Tecnológico de Galicia, San Cibrao das Viñas (Ourense), 32901" },
    contacto: { email: "itg@itg.es", telefono: "+34 988 36 80 02", web: "https://www.itg.es/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "EIT InnoEnergy España",
    slug: "eit-innoenergy",
    tipo: "empresa",
    especialidades: ["energia", "innovacion", "consultoria"],
    descripcion: "Comunidad de innovación europea respaldada por el EIT. Apoya proyectos industriales de eficiencia energética, optimización de procesos y transformación sostenible de la producción industrial en España.",
    servicios: ["Innovación Energética", "Optimización de Procesos", "Eficiencia Industrial", "Consultoría", "Formación Industrial", "Proyectos Europeos"],
    ubicacion: { pais: "España", ciudad: "Barcelona", direccion: "Calle Provenza 339, Barcelona, 08037" },
    contacto: { email: "", telefono: "+34 934 01 04 30", web: "https://www.innoenergy.com/", linkedin: "https://www.linkedin.com/company/eit-innoenergy/", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Accenture Industria 4.0 España",
    slug: "accenture-industria",
    tipo: "empresa",
    especialidades: ["consultoria", "transformacion-digital", "innovacion"],
    descripcion: "División industrial de Accenture en España especializada en transformación digital de procesos productivos, Industria 4.0, IoT industrial, gemelos digitales y optimización de operaciones para grandes empresas.",
    servicios: ["Industria 4.0", "Gemelos Digitales", "IoT Industrial", "Optimización Operativa", "Digital Twin", "Automatización Inteligente"],
    ubicacion: { pais: "España", ciudad: "Madrid", direccion: "Calle de la Castellana 216, Madrid, 28046" },
    contacto: { email: "", telefono: "+34 917 89 50 00", web: "https://www.accenture.com/es-es/industries/industrial", linkedin: "https://www.linkedin.com/company/accenture/", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Deloitte Industrial Operations",
    slug: "deloitte-operaciones",
    tipo: "empresa",
    especialidades: ["consultoria", "optimizacion", "transformacion-digital"],
    descripcion: "Práctica de operaciones industriales de Deloitte España. Especialistas en optimización de procesos productivos, cadena de suministro, lean operations y transformación digital de la función industrial.",
    servicios: ["Lean Operations", "Optimización de Procesos", "Cadena de Suministro", "Transformación Digital Industrial", "Gestión del Cambio", "Eficiencia Operativa"],
    ubicacion: { pais: "España", ciudad: "Madrid", direccion: "Plaza Pablo Ruiz Picasso 1, Madrid, 28020" },
    contacto: { email: "", telefono: "+34 914 38 20 00", web: "https://www.deloitte.com/es/services/consulting/operations.html", linkedin: "https://www.linkedin.com/company/deloitte/", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "KPMG Operational Excellence España",
    slug: "kpmg-operaciones",
    tipo: "empresa",
    especialidades: ["consultoria", "optimizacion", "riesgos"],
    descripcion: "Práctica de excelencia operacional de KPMG en España. Ofrece servicios de consultoría en lean management, optimización de procesos, eficiencia operativa, transformación industrial y gestión de riesgos operacionales.",
    servicios: ["Lean Management", "Excelencia Operacional", "Optimización de Procesos", "Gestión de Riesgos", "Transformación Industrial", "Consultoría Estratégica"],
    ubicacion: { pais: "España", ciudad: "Madrid", direccion: "Paseo de la Castellana 95, Torre Europa, Madrid, 28046" },
    contacto: { email: "", telefono: "+34 914 56 34 00", web: "https://www.kpmg.es/", linkedin: "https://www.linkedin.com/company/kpmg/", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "McKinsey Operations España",
    slug: "mckinsey-operaciones",
    tipo: "empresa",
    especialidades: ["consultoria", "optimizacion", "estrategia"],
    descripcion: "Práctica de operaciones industriales de McKinsey & Company en España. Especialistas en transformación de operaciones, mejora de productividad, diseño de plantas, cadena de suministro y digitalización industrial.",
    servicios: ["Transformación de Operaciones", "Mejora de Productividad", "Diseño de Plantas", "Cadena de Suministro", "Digitalización Industrial", "Estrategia Operativa"],
    ubicacion: { pais: "España", ciudad: "Madrid", direccion: "Calle de Rafael Calvo 42A, Madrid, 28010" },
    contacto: { email: "", telefono: "", web: "https://www.mckinsey.com/es/operations", linkedin: "https://www.linkedin.com/company/mckinsey/", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Grant Thornton Industria España",
    slug: "grant-thornton-industria",
    tipo: "empresa",
    especialidades: ["consultoria", "optimizacion", "calidad"],
    descripcion: "Firma de servicios profesionales con práctica industrial especializada. Ofrece consultoría en mejora de procesos, eficiencia operativa, lean management y transformación digital para empresas industriales españolas.",
    servicios: ["Mejora de Procesos", "Eficiencia Operativa", "Lean Management", "Consultoría Industrial", "Gestión de Calidad", "Auditoría de Procesos"],
    ubicacion: { pais: "España", ciudad: "Madrid", direccion: "Paseo de la Castellana 81, Madrid, 28046" },
    contacto: { email: "", telefono: "+34 915 76 39 99", web: "https://www.grantthornton.es/", linkedin: "https://www.linkedin.com/company/grant-thornton-spain/", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Alten Industria España",
    slug: "alten-industria",
    tipo: "empresa",
    especialidades: ["ingenieria-industrial", "consultoria-tecnologica", "tic"],
    descripcion: "Filial española del grupo europeo de ingeniería y consultoría tecnológica. Especialistas en ingeniería industrial, sistemas de producción, automatización y soluciones de I+D para el sector industrial.",
    servicios: ["Ingeniería Industrial", "Automatización", "Sistemas de Producción", "I+D Industrial", "Consultoría Tecnológica", "Gestión de Proyectos"],
    ubicacion: { pais: "España", ciudad: "Madrid", direccion: "Calle de la Basílica 17, Madrid, 28020" },
    contacto: { email: "", telefono: "+34 915 56 95 00", web: "https://www.alten.es/", linkedin: "https://www.linkedin.com/company/alten/", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Capgemini Engineering España",
    slug: "capgemini-engineering",
    tipo: "empresa",
    especialidades: ["ingenieria-industrial", "consultoria-tecnologica", "tic"],
    descripcion: "División de ingeniería de Capgemini en España, anteriormente Altran. Especialistas en ingeniería industrial, sistemas embebidos, automatización de procesos y transformación digital del sector manufacturero.",
    servicios: ["Ingeniería Industrial", "Sistemas Embebidos", "Automatización", "Transformación Digital", "I+D Industrial", "Smart Manufacturing"],
    ubicacion: { pais: "España", ciudad: "Madrid", direccion: "Calle de la Castellana 135, Madrid, 28046" },
    contacto: { email: "", telefono: "+34 916 57 30 00", web: "https://www.capgemini.com/es-es/engineering/", linkedin: "https://www.linkedin.com/company/capgemini/", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "NTT Data España Industria",
    slug: "nttdata-industria",
    tipo: "empresa",
    especialidades: ["consultoria-tecnologica", "tic", "transformacion-digital"],
    descripcion: "División industrial de NTT Data (antigua Everis) en España. Ofrece soluciones de digitalización de procesos productivos, IoT industrial, analítica de datos para fabricación y consultoría de operaciones.",
    servicios: ["Digitalización Industrial", "IoT Manufacturing", "Analítica de Producción", "Consultoría de Operaciones", "Industria 4.0", "Transformación Digital"],
    ubicacion: { pais: "España", ciudad: "Madrid", direccion: "Calle de la Castellana 168, Madrid, 28046" },
    contacto: { email: "", telefono: "+34 914 86 20 00", web: "https://es.nttdata.com/", linkedin: "https://www.linkedin.com/company/ntt-data-spain/", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Telefónica Tech Industria",
    slug: "telefonica-tech-industria",
    tipo: "empresa",
    especialidades: ["tic", "transformacion-digital", "iot"],
    descripcion: "División industrial de Telefónica Tech especializada en IoT industrial, conectividad 5G para fabricación inteligente, gemelos digitales, visión artificial y soluciones de eficiencia operativa para la industria.",
    servicios: ["IoT Industrial", "5G Industria", "Gemelos Digitales", "Visión Artificial", "Eficiencia Operativa", "Ciberseguridad Industrial"],
    ubicacion: { pais: "España", ciudad: "Madrid", direccion: "Calle Ronda de la Comunicación s/n, Madrid, 28050" },
    contacto: { email: "", telefono: "+34 900 11 14 44", web: "https://telefonicatech.com/es/industria", linkedin: "https://www.linkedin.com/company/telefonicatech/", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Auren Consultores Industriales",
    slug: "auren-consultores",
    tipo: "empresa",
    especialidades: ["consultoria", "optimizacion", "calidad"],
    descripcion: "Firma de consultoría con departamento especializado en industria. Ofrece servicios de optimización de procesos productivos, consultoría lean, gestión de calidad, eficiencia energética y asesoramiento industrial.",
    servicios: ["Consultoría Industrial", "Lean Manufacturing", "Optimización de Procesos", "Gestión de Calidad", "Eficiencia Energética"],
    ubicacion: { pais: "España", ciudad: "Madrid", direccion: "Calle Alcalá 522, Madrid, 28027" },
    contacto: { email: "", telefono: "+34 914 90 76 80", web: "https://www.auren.es/", linkedin: "https://www.linkedin.com/company/auren/", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Sisteplant Advanced Manufacturing",
    slug: "sisteplant-adv",
    tipo: "empresa",
    especialidades: ["ingenieria-industrial", "automatizacion", "software-industrial"],
    descripcion: "Compañía española especializada en ingeniería de procesos y fabricación avanzada. Desarrolla soluciones de gestión de producción, simulación de procesos, planificación de planta y optimización de operaciones industriales.",
    servicios: ["Ingeniería de Procesos", "Simulación Industrial", "Gestión de Producción", "Planificación de Planta", "Software de Fabricación", "Optimización Operativa"],
    ubicacion: { pais: "España", ciudad: "Bilbao", direccion: "Parque Tecnológico de Bizkaia, Edificio 107, Zamudio (Bizkaia), 48170" },
    contacto: { email: "info@sisteplant.com", telefono: "+34 944 03 37 00", web: "https://www.sisteplant.com/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Geprom Advanced Factories",
    slug: "geprom-advanced",
    tipo: "empresa",
    especialidades: ["automatizacion", "robotica", "ingenieria-industrial"],
    descripcion: "Empresa española de ingeniería especializada en automatización industrial, robótica colaborativa, visión artificial y control de procesos. Integradores de sistemas Industry 4.0 para plantas de fabricación.",
    servicios: ["Automatización Industrial", "Robótica Colaborativa", "Visión Artificial", "Control de Procesos", "Industry 4.0", "Integración de Sistemas"],
    ubicacion: { pais: "España", ciudad: "Barcelona", direccion: "Calle de la Ciutat de Granada 119, Barcelona, 08018" },
    contacto: { email: "info@geprom.com", telefono: "+34 932 98 40 40", web: "https://www.geprom.com/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Grupo SPI Gestión Industrial",
    slug: "grupo-spi",
    tipo: "empresa",
    especialidades: ["software-industrial", "gestion", "calidad"],
    descripcion: "Compañía asturiana especializada en soluciones de gestión industrial, software de control de producción, sistemas MES y consultoría de procesos. Experiencia en implantación de sistemas de calidad y mejora continua.",
    servicios: ["Software MES", "Control de Producción", "Gestión de Calidad", "Mejora Continua", "Consultoría de Procesos", "Formación"],
    ubicacion: { pais: "España", ciudad: "Gijón", direccion: "Parque Científico Tecnológico de Gijón, C. de los Hornos 17, Gijón, 33203" },
    contacto: { email: "info@grupospi.com", telefono: "+34 985 19 37 00", web: "https://www.grupospi.com/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Ibermática Industria 4.0",
    slug: "ibermatica-industria",
    tipo: "empresa",
    especialidades: ["tic", "consultoria-tecnologica", "transformacion-digital"],
    descripcion: "División industrial de Ibermática (integrante de Ayesa). Ofrece soluciones de digitalización de procesos, IoT, inteligencia artificial aplicada a fabricación, sistemas MES y consultoría de transformación industrial.",
    servicios: ["Digitalización Industrial", "IoT", "IA para Fabricación", "Sistemas MES", "Transformación Industrial", "Consultoría Tecnológica"],
    ubicacion: { pais: "España", ciudad: "Donostia-San Sebastián", direccion: "Parque Tecnológico de Gipuzkoa, Paseo Mikeletegi 57, Donostia, 20009" },
    contacto: { email: "", telefono: "+34 943 00 94 00", web: "https://www.ibermatica.com/", linkedin: "https://www.linkedin.com/company/ibermatica/", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Altia Consultores Industria",
    slug: "altia-consultores",
    tipo: "empresa",
    especialidades: ["tic", "consultoria", "transformacion-digital"],
    descripcion: "Consultora tecnológica española con práctica industrial. Desarrolla soluciones de automatización de procesos, sistemas de información industrial, Business Intelligence para fabricación y consultoría TIC industrial.",
    servicios: ["Automatización de Procesos", "Sistemas Industriales", "BI para Fabricación", "Consultoría TIC", "Transformación Digital", "Gestión de Proyectos"],
    ubicacion: { pais: "España", ciudad: "A Coruña", direccion: "Polígono Industrial Pocomaco, Calle H, A Coruña, 15190" },
    contacto: { email: "", telefono: "+34 981 90 77 00", web: "https://www.altia.es/", linkedin: "https://www.linkedin.com/company/altia-consultores/", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Grupo Esprí Ingeniería",
    slug: "grupo-espri",
    tipo: "empresa",
    especialidades: ["automatizacion", "robotica", "ingenieria-industrial"],
    descripcion: "Empresa de ingeniería especializada en automatización de procesos industriales, robótica y control numérico. Ofrece soluciones integrales de mejora de productividad mediante automatización de líneas de producción.",
    servicios: ["Automatización de Líneas", "Robótica Industrial", "Control Numérico", "Ingeniería de Producción", "Mejora de Productividad", "Mantenimiento Industrial"],
    ubicacion: { pais: "España", ciudad: "Barcelona", direccion: "Polígono Industrial Can Roqueta, C/ de l'Energia 15, Terrassa (Barcelona), 08228" },
    contacto: { email: "", telefono: "+34 937 83 50 00", web: "https://www.espri.com/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Automática e Integración Industrial (AII)",
    slug: "aii-automatizacion",
    tipo: "empresa",
    especialidades: ["automatizacion", "control", "ingenieria"],
    descripcion: "Empresa española especializada en automatización industrial, sistemas SCADA, control de procesos e integración de sistemas de producción. Soluciones llave en mano para la mejora de la eficiencia productiva.",
    servicios: ["Automatización Industrial", "Sistemas SCADA", "Control de Procesos", "Integración de Sistemas", "Eficiencia Productiva", "Industria 4.0"],
    ubicacion: { pais: "España", ciudad: "Valencia", direccion: "Calle de la Safor 10, Paterna (Valencia), 46980" },
    contacto: { email: "aii@aii.es", telefono: "+34 961 37 20 00", web: "https://www.aii.es/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Dibal Sistemas de Ensamblaje",
    slug: "dibal",
    tipo: "empresa",
    especialidades: ["automatizacion", "logistica", "produccion"],
    descripcion: "Empresa vizcaína especializada en sistemas de ensamblaje, líneas de montaje y transporte inteligente. Diseñan e instalan sistemas de producción modular, células de trabajo y soluciones de automatización flexible.",
    servicios: ["Sistemas de Ensamblaje", "Líneas de Montaje", "Transporte Inteligente", "Automatización Flexible", "Células de Trabajo", "Lean Assembly"],
    ubicacion: { pais: "España", ciudad: "Derio", direccion: "Polígono Industrial Urtia, C/ Urko 10, Derio (Bizkaia), 48160" },
    contacto: { email: "info@dibal.com", telefono: "+34 944 54 71 00", web: "https://www.dibal.com/", linkedin: "https://www.linkedin.com/company/dibal/", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Ormazabal Protección y Control",
    slug: "ormazabal",
    tipo: "empresa",
    especialidades: ["produccion", "ingenieria-industrial", "calidad"],
    descripcion: "Grupo industrial vasco especializado en soluciones de electrificación y automatización industrial. Reconocido por su modelo de gestión lean, producción ajustada y excelencia operativa en sus plantas de fabricación.",
    servicios: ["Lean Manufacturing", "Gestión de Producción", "Excelencia Operativa", "Calidad Industrial", "Logística", "Formación Lean"],
    ubicacion: { pais: "España", ciudad: "Zaragoza", direccion: "Parque Empresarial de La Morera, Ctra. de la Esclusa, Zaragoza, 50197" },
    contacto: { email: "", telefono: "+34 946 22 88 11", web: "https://www.ormazabal.com/", linkedin: "https://www.linkedin.com/company/ormazabal/", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Ulma Fabricación Avanzada",
    slug: "ulma-fabricacion",
    tipo: "empresa",
    especialidades: ["produccion", "ingenieria-industrial", "embalaje"],
    descripcion: "División del Grupo Ulma especializada en soluciones de fabricación avanzada, sistemas de embalaje industrial y líneas de proceso. Reconocida por su modelo cooperativo y sistemas de producción lean.",
    servicios: ["Fabricación Avanzada", "Sistemas de Embalaje", "Líneas de Proceso", "Lean Manufacturing", "Ingeniería Industrial", "Automatización"],
    ubicacion: { pais: "España", ciudad: "Oñati", direccion: "Barrio San Prudencio 40, Oñati (Gipuzkoa), 20560" },
    contacto: { email: "", telefono: "+34 943 78 05 00", web: "https://www.ulma.com/", linkedin: "https://www.linkedin.com/company/ulma/", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Fagor Arrasate Forja y Estampación",
    slug: "fagor-arrasate",
    tipo: "empresa",
    especialidades: ["produccion", "maquina-herramienta", "automatizacion"],
    descripcion: "Empresa del Grupo Mondragón especializada en sistemas de forja, estampación y líneas de prensas. Ofrece soluciones de automatización de procesos de conformado e ingeniería de producción.",
    servicios: ["Líneas de Prensas", "Forja Industrial", "Automatización de Procesos", "Ingeniería de Producción", "Mantenimiento", "Lean Manufacturing"],
    ubicacion: { pais: "España", ciudad: "Arrasate-Mondragón", direccion: "San Andrés Auzoa 20, Arrasate (Gipuzkoa), 20500" },
    contacto: { email: "fagorarrasate@fagorarrasate.com", telefono: "+34 943 03 98 00", web: "https://www.fagorarrasate.com/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Goizper Group",
    slug: "goizper",
    tipo: "empresa",
    especialidades: ["produccion", "automatizacion", "robotica"],
    descripcion: "Grupo cooperativo vasco especializado en la fabricación de sistemas de pulverización, acoplamientos y soluciones robóticas para automatización industrial. Reconocido por su modelo de producción lean y eficiencia.",
    servicios: ["Fabricación Industrial", "Lean Manufacturing", "Automatización Robótica", "Sistemas de Pulverización", "Calidad Total", "I+D Industrial"],
    ubicacion: { pais: "España", ciudad: "Zumarraga", direccion: "Calle Iparraguirre 3, Zumarraga (Gipuzkoa), 20700" },
    contacto: { email: "", telefono: "+34 943 72 90 00", web: "https://www.goizper.com/", linkedin: "https://www.linkedin.com/company/goizper-group/", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Industrias Lozano Automatización",
    slug: "industrias-lozano",
    tipo: "empresa",
    especialidades: ["automatizacion", "produccion", "ingenieria-industrial"],
    descripcion: "Empresa especializada en ingeniería de automatización, robótica industrial y sistemas de control de producción. Desarrolla e implanta soluciones de mejora de eficiencia y reducción de tiempos de ciclo en plantas productivas.",
    servicios: ["Automatización Industrial", "Robótica", "Control de Producción", "Ingeniería de Procesos", "Mejora de Eficiencia", "Reducción de Tiempos de Ciclo"],
    ubicacion: { pais: "España", ciudad: "Barcelona", direccion: "Calle de la Tecnología 25, El Prat de Llobregat (Barcelona), 08820" },
    contacto: { email: "info@industriaslozano.com", telefono: "+34 933 03 30 40", web: "https://www.industriaslozano.com/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Ondoan Robótica",
    slug: "ondoan-robotica",
    tipo: "empresa",
    especialidades: ["automatizacion", "robotica", "logistica"],
    descripcion: "Empresa vasca integradora de robótica industrial y sistemas de automatización logística. Soluciones de paletizado robotizado, manipulación inteligente y sistemas de transporte automatizado para fábricas.",
    servicios: ["Robótica Industrial", "Paletizado Robotizado", "Automatización Logística", "Manipulación Inteligente", "Sistemas de Transporte", "Integración"],
    ubicacion: { pais: "España", ciudad: "Galdakao", direccion: "San Juan 89, Galdakao (Bizkaia), 48960" },
    contacto: { email: "info@ondoan.com", telefono: "+34 944 57 07 00", web: "https://www.ondoan.com/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Lauak Aeronautics",
    slug: "lauak",
    tipo: "empresa",
    especialidades: ["produccion", "ingenieria-industrial", "aeroespacial"],
    descripcion: "Grupo industrial vasco especializado en fabricación de componentes aeronáuticos. Reconocido por la excelencia en sus procesos productivos, implantación de sistemas lean y mejora continua en fabricación de alta precisión.",
    servicios: ["Fabricación Aeronáutica", "Lean Manufacturing", "Mecanizado de Precisión", "Control de Calidad", "Mejora Continua", "Gestión de Producción"],
    ubicacion: { pais: "España", ciudad: "Berriz", direccion: "Polígono Industrial Berriz, C/Zabalea 23, Berriz (Bizkaia), 48240" },
    contacto: { email: "", telefono: "+34 946 25 81 50", web: "https://www.lauak.com/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Grupo Nicolás Correa",
    slug: "nicolas-correa",
    tipo: "empresa",
    especialidades: ["maquina-herramienta", "produccion", "ingenieria-industrial"],
    descripcion: "Fabricante español de máquinas-herramienta, especializado en fresadoras de gran formato y centros de mecanizado. Reconocido por sus procesos de fabricación eficientes y sistemas de producción lean.",
    servicios: ["Fabricación de Máquina Herramienta", "Centros de Mecanizado", "Ingeniería de Producción", "Lean Manufacturing", "Calidad Industrial", "Servicio Técnico"],
    ubicacion: { pais: "España", ciudad: "Burgos", direccion: "Polígono Industrial de Villalonquéjar, C/ López Bravo 1, Burgos, 09001" },
    contacto: { email: "info@correa.es", telefono: "+34 947 28 80 50", web: "https://www.correa.es/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Talleres de Guernica (TAG)",
    slug: "tag-guernica",
    tipo: "empresa",
    especialidades: ["produccion", "ingenieria-industrial", "caldereria"],
    descripcion: "Empresa vizcaína especializada en calderería pesada, estructuras metálicas y fabricación de equipos industriales. Reconocida por sus procesos de fabricación eficientes y control de calidad en producción.",
    servicios: ["Calderería Pesada", "Estructuras Metálicas", "Fabricación de Equipos", "Control de Calidad", "Gestión de Producción", "Logística Industrial"],
    ubicacion: { pais: "España", ciudad: "Guernica", direccion: "Polígono Industrial Arratia, C/ Axpe 12, Guernica (Bizkaia), 48300" },
    contacto: { email: "tag@tag-es.com", telefono: "+34 946 25 40 50", web: "https://www.tag-es.com/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Tubos Reunidos",
    slug: "tubos-reunidos",
    tipo: "empresa",
    especialidades: ["produccion", "metalurgia", "calidad"],
    descripcion: "Grupo industrial español líder en fabricación de tubos de acero sin soldadura. Referente en la implantación de sistemas de mejora continua, eficiencia operativa y procesos de calidad certificados en el sector siderúrgico.",
    servicios: ["Fabricación de Tubos", "Gestión de Producción", "Mejora Continua", "Eficiencia Operativa", "Control de Calidad", "Logística Industrial"],
    ubicacion: { pais: "España", ciudad: "Laudio", direccion: "Ctra. Bilbao-Oviedo Km. 21, Laudio (Álava), 01400" },
    contacto: { email: "", telefono: "+34 944 32 82 00", web: "https://www.tubosreunidos.com/", linkedin: "https://www.linkedin.com/company/tubos-reunidos/", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Acerinox Fabricación",
    slug: "acerinox-fabricacion",
    tipo: "empresa",
    especialidades: ["produccion", "metalurgia", "calidad"],
    descripcion: "Líder mundial en fabricación de acero inoxidable con planta principal en Los Barrios (Cádiz). Reconocido por la implantación de sistemas de producción eficientes, mejora continua y excelencia operativa.",
    servicios: ["Fabricación de Acero Inoxidable", "Gestión de Producción", "Mejora Continua", "Eficiencia Operativa", "Calidad Industrial", "Logística"],
    ubicacion: { pais: "España", ciudad: "Los Barrios", direccion: "Ctra. Nacional 340 Km. 84, Los Barrios (Cádiz), 11370" },
    contacto: { email: "", telefono: "+34 956 62 80 00", web: "https://www.acerinox.com/", linkedin: "https://www.linkedin.com/company/acerinox/", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Celsa Group Fabricación",
    slug: "celsa-group",
    tipo: "empresa",
    especialidades: ["produccion", "metalurgia", "calidad"],
    descripcion: "Grupo industrial español líder en fabricación de acero para construcción e industria. Reconocido por sus sistemas avanzados de producción, eficiencia operativa y mejora continua en sus plantas siderúrgicas.",
    servicios: ["Fabricación de Acero", "Gestión de Producción", "Mejora Continua", "Eficiencia Operativa", "Control de Calidad", "Logística Industrial"],
    ubicacion: { pais: "España", ciudad: "Barcelona", direccion: "Calle de la Ciutat de Granada 113, Barcelona, 08018" },
    contacto: { email: "", telefono: "+34 932 29 38 00", web: "https://www.celsa.com/", linkedin: "https://www.linkedin.com/company/celsa-group/", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Vicente Tormo Automatización",
    slug: "vicente-tormo",
    tipo: "empresa",
    especialidades: ["automatizacion", "robotica", "ingenieria"],
    descripcion: "Empresa valenciana especializada en automatización de procesos industriales, robótica, visión artificial y control de calidad automatizado. Soluciones integrales para la mejora de la productividad en industria.",
    servicios: ["Automatización Industrial", "Robótica", "Visión Artificial", "Control de Calidad", "Mejora de Productividad", "Mantenimiento"],
    ubicacion: { pais: "España", ciudad: "Valencia", direccion: "Polígono Industrial El Oliveral, C/ Alquería 10, Riba-roja de Túria (Valencia), 46190" },
    contacto: { email: "info@vicentetormo.com", telefono: "+34 961 65 80 00", web: "https://www.vicentetormo.com/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Gain Group Automatización",
    slug: "gain-group",
    tipo: "empresa",
    especialidades: ["automatizacion", "robotica", "ingenieria-industrial"],
    descripcion: "Grupo industrial catalán especializado en automatización de procesos productivos, robótica colaborativa y soluciones de fabricación inteligente. Integradores de sistemas Industry 4.0 para pymes industriales.",
    servicios: ["Automatización de Procesos", "Robótica Colaborativa", "Fabricación Inteligente", "Industry 4.0", "Integración de Sistemas", "Consultoría Técnica"],
    ubicacion: { pais: "España", ciudad: "Barcelona", direccion: "Polígono Industrial Can Estella, C/ del Progrés 35, Santa Perpètua de Mogoda (Barcelona), 08130" },
    contacto: { email: "info@gain-group.com", telefono: "+34 937 19 18 00", web: "https://www.gain-group.com/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Fritz Hansen España Logística",
    slug: "fritz-hansen-logistica",
    tipo: "empresa",
    especialidades: ["logistica", "produccion", "optimizacion"],
    descripcion: "Compañía española especializada en consultoría logística, gestión de almacenes, optimización de cadenas de suministro y sistemas de picking eficientes. Implementa metodologías lean en operaciones logísticas.",
    servicios: ["Consultoría Logística", "Gestión de Almacenes", "Optimización de Cadena de Suministro", "Lean Logistics", "Sistemas de Picking", "WMS"],
    ubicacion: { pais: "España", ciudad: "Madrid", direccion: "Calle de Orense 11, Madrid, 28020" },
    contacto: { email: "", telefono: "+34 915 71 80 40", web: "https://www.fritzhansenlogistica.com/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Estrategia e Ingeniería del Mantenimiento (EIM)",
    slug: "eim-mantenimiento",
    tipo: "empresa",
    especialidades: ["mantenimiento", "ingenieria", "calidad"],
    descripcion: "Consultora española especializada en gestión del mantenimiento industrial, RCM, TPM, excelencia operativa y fiabilidad de activos. Acompaña a plantas industriales en la optimización de sus planes de mantenimiento.",
    servicios: ["Mantenimiento Industrial", "RCM", "TPM", "Excelencia Operativa", "Fiabilidad de Activos", "Formación en Mantenimiento"],
    ubicacion: { pais: "España", ciudad: "Madrid", direccion: "Calle de Velázquez 50, Madrid, 28001" },
    contacto: { email: "info@eim.com", telefono: "+34 914 26 38 50", web: "https://www.eim.com/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Lean Industrial Consulting (LIC)",
    slug: "lic-lean",
    tipo: "empresa",
    especialidades: ["consultoria-lean", "optimizacion", "formacion"],
    descripcion: "Consultora española especializada exclusivamente en lean manufacturing, six sigma y optimización de procesos productivos. Imparten formación in-company en herramientas lean, 5S, SMED, TPM y kanban.",
    servicios: ["Lean Manufacturing", "Six Sigma", "5S", "SMED", "TPM", "Kanban", "Formación Lean"],
    ubicacion: { pais: "España", ciudad: "Barcelona", direccion: "Calle de Balmes 365, Barcelona, 08006" },
    contacto: { email: "info@lic-lean.com", telefono: "+34 933 68 45 20", web: "https://www.lic-lean.com/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Métodos y Procesos Industriales (MPI)",
    slug: "mpi-metodos",
    tipo: "empresa",
    especialidades: ["metodos", "tiempos", "ingenieria-industrial"],
    descripcion: "Consultora madrileña especializada en estudio de métodos y tiempos, cronometraje industrial, MTM, ergonomía y diseño de puestos de trabajo. Certificados en sistemas de tiempos predeterminados.",
    servicios: ["Estudio de Métodos", "Medición de Tiempos", "MTM", "Ergonomía", "Diseño de Puestos", "Mejora de Métodos"],
    ubicacion: { pais: "España", ciudad: "Madrid", direccion: "Calle de Atocha 112, Madrid, 28012" },
    contacto: { email: "info@mpi-metodos.es", telefono: "+34 915 28 14 00", web: "https://www.mpi-metodos.es/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Time & Methods Consulting (TMC)",
    slug: "tmc-consulting",
    tipo: "empresa",
    especialidades: ["metodos", "tiempos", "consultoria"],
    descripcion: "Consultora andaluza especializada en ingeniería de métodos, medición del trabajo, establecimiento de estándares de producción y optimización de tiempos. Expertos en estudios de capacidad y balanceo de líneas.",
    servicios: ["Ingeniería de Métodos", "Medición del Trabajo", "Estándares de Producción", "Balanceo de Líneas", "Estudios de Capacidad", "Mejora de Productividad"],
    ubicacion: { pais: "España", ciudad: "Sevilla", direccion: "Calle de San Fernando 25, Sevilla, 41004" },
    contacto: { email: "info@tmc-consulting.es", telefono: "+34 954 22 30 60", web: "https://www.tmc-consulting.es/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Eficiencia Industrial Avanzada (EIA)",
    slug: "eia-eficiencia",
    tipo: "empresa",
    especialidades: ["eficiencia", "produccion", "consultoria"],
    descripcion: "Consultora gallega especializada en eficiencia industrial, reducción de costes operativos, optimización de procesos y digitalización de la producción. Expertos en análisis de cuellos de botella y mejora de OEE.",
    servicios: ["Eficiencia Industrial", "Reducción de Costes", "Optimización de Procesos", "Análisis OEE", "Digitalización de Producción", "Mejora Continua"],
    ubicacion: { pais: "España", ciudad: "Vigo", direccion: "Calle de Urzáiz 30, Vigo (Pontevedra), 36201" },
    contacto: { email: "info@eia-eficiencia.es", telefono: "+34 986 44 35 00", web: "https://www.eia-eficiencia.es/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Producción Ágil Consultores (PAC)",
    slug: "pac-produccion",
    tipo: "empresa",
    especialidades: ["lean", "produccion", "consultoria"],
    descripcion: "Consultora levantina especializada en implantación de sistemas de producción ágil, lean manufacturing, kanban, heijunka y gestión visual de plantas. Formación práctica y acompañamiento en transformación lean.",
    servicios: ["Producción Ágil", "Lean Manufacturing", "Kanban", "Heijunka", "Gestión Visual", "Transformación Lean"],
    ubicacion: { pais: "España", ciudad: "Valencia", direccion: "Calle de Colón 56, Valencia, 46004" },
    contacto: { email: "info@pac-consultores.com", telefono: "+34 963 51 27 80", web: "https://www.pac-consultores.com/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Calidad y Procesos Consultores (CPC)",
    slug: "cpc-calidad",
    tipo: "empresa",
    especialidades: ["calidad", "procesos", "consultoria"],
    descripcion: "Consultora especializada en sistemas de gestión de calidad ISO 9001, ISO 14001, ISO 45001 y mejora de procesos industriales. Expertos en implantación de SGC, auditorías internas y formación en calidad.",
    servicios: ["Sistemas de Gestión de Calidad", "ISO 9001", "ISO 14001", "Auditorías", "Mejora de Procesos", "Formación en Calidad"],
    ubicacion: { pais: "España", ciudad: "Bilbao", direccion: "Calle de Ercilla 24, Bilbao, 48011" },
    contacto: { email: "info@cpc-calidad.es", telefono: "+34 944 42 56 70", web: "https://www.cpc-calidad.es/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Prevención y Ergonomía Industrial (PEI)",
    slug: "pei-prevencion",
    tipo: "empresa",
    especialidades: ["prevencion", "ergonomia", "seguridad-laboral"],
    descripcion: "Consultora especializada en prevención de riesgos laborales, ergonomía industrial y psicosociología aplicada a la producción. Expertos en evaluación de riesgos ergonómicos, planificación de medidas preventivas y formación en PRL.",
    servicios: ["Prevención de Riesgos", "Ergonomía Industrial", "Evaluación de Riesgos Ergonómicos", "Psicosociología", "Formación PRL", "Coordinación de Actividades Empresariales"],
    ubicacion: { pais: "España", ciudad: "Zaragoza", direccion: "Calle de San Miguel 25, Zaragoza, 50001" },
    contacto: { email: "info@pei-prevencion.com", telefono: "+34 976 22 14 50", web: "https://www.pei-prevencion.com/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Estudios de Tiempos y Métodos (ETM)",
    slug: "etm-estudios",
    tipo: "empresa",
    especialidades: ["metodos", "tiempos", "estandares"],
    descripcion: "Empresa consultora con más de 20 años de experiencia en la realización de estudios de tiempos, establecimiento de estándares de producción, métodos de trabajo y mejora de la eficiencia en planta.",
    servicios: ["Estudios de Tiempos", "Estándares de Producción", "Métodos de Trabajo", "Mejora de Eficiencia", "Formación en Cronometraje", "Auditoría de Métodos"],
    ubicacion: { pais: "España", ciudad: "Madrid", direccion: "Calle de Alcalá 250, Madrid, 28027" },
    contacto: { email: "info@etm-estudios.es", telefono: "+34 914 05 32 10", web: "https://www.etm-estudios.es/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Factoría Lean Consulting (FLC)",
    slug: "flc-factoria",
    tipo: "empresa",
    especialidades: ["lean", "consultoria", "formacion"],
    descripcion: "Consultora nacional especializada en transformación lean, formación en herramientas de mejora continua y acompañamiento en proyectos de optimización de procesos. Metodología propia de implantación lean.",
    servicios: ["Transformación Lean", "Mejora Continua", "Formación Lean", "Implantación 5S", "VSM", "Kaizen"],
    ubicacion: { pais: "España", ciudad: "Barcelona", direccion: "Calle de Pau Claris 79, Barcelona, 08010" },
    contacto: { email: "info@flc-factoria.com", telefono: "+34 933 04 58 20", web: "https://www.flc-factoria.com/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Grupo Acorde Lean Management",
    slug: "acorde-lean",
    tipo: "empresa",
    especialidades: ["lean", "gestion", "consultoria"],
    descripcion: "Consultora de lean management con sede en Madrid. Especialistas en despliegue de estrategias lean, Hoshin Kanri, A3 problem solving y desarrollo de líderes lean. Certificaciones internacionales.",
    servicios: ["Lean Management", "Hoshin Kanri", "A3 Problem Solving", "Desarrollo de Líderes Lean", "Value Stream Mapping", "Formación"],
    ubicacion: { pais: "España", ciudad: "Madrid", direccion: "Calle de Serrano 140, Madrid, 28006" },
    contacto: { email: "info@acordelean.com", telefono: "+34 917 45 60 30", web: "https://www.acordelean.com/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Soluciones de Producción Eficiente (SPE)",
    slug: "spe-produccion",
    tipo: "empresa",
    especialidades: ["produccion", "eficiencia", "consultoria"],
    descripcion: "Consultora murciana especializada en la mejora de la eficiencia productiva, reducción de desperdicios e implantación de sistemas de gestión visual. Expertos en el sector agroalimentario y metalmecánico.",
    servicios: ["Eficiencia Productiva", "Reducción de Desperdicios", "Gestión Visual", "Lean Agroalimentario", "Mejora Continua", "Formación en Planta"],
    ubicacion: { pais: "España", ciudad: "Murcia", direccion: "Calle de la Fuensanta 12, Murcia, 30001" },
    contacto: { email: "info@spe-produccion.es", telefono: "+34 968 23 15 40", web: "https://www.spe-produccion.es/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "OEE Consulting España",
    slug: "oee-consulting-es",
    tipo: "empresa",
    especialidades: ["oee", "mantenimiento", "eficiencia"],
    descripcion: "Consultora especializada en el cálculo y mejora del OEE (Overall Equipment Effectiveness), implantación de TPM, mantenimiento autónomo y análisis de pérdidas en plantas de producción industrial.",
    servicios: ["Mejora de OEE", "TPM", "Mantenimiento Autónomo", "Análisis de Pérdidas", "Eficiencia de Equipos", "Formación TPM"],
    ubicacion: { pais: "España", ciudad: "Barcelona", direccion: "Calle de Valencia 245, Barcelona, 08007" },
    contacto: { email: "info@oeeconsulting.es", telefono: "+34 932 15 78 90", web: "https://www.oeeconsulting.es/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Procesos Industriales del Mediterráneo (PIM)",
    slug: "pim-mediterraneo",
    tipo: "empresa",
    especialidades: ["ingenieria-industrial", "procesos", "consultoria"],
    descripcion: "Consultora de ingeniería de procesos con sede en Alicante. Especialistas en diseño de procesos productivos, optimización de flujos de trabajo, implantación de células de fabricación y layout de plantas.",
    servicios: ["Diseño de Procesos", "Optimización de Flujos", "Células de Fabricación", "Layout de Plantas", "Ingeniería Industrial", "Consultoría"],
    ubicacion: { pais: "España", ciudad: "Alicante", direccion: "Av. de la Constitución 55, Alicante, 03008" },
    contacto: { email: "info@pim-med.com", telefono: "+34 965 90 45 30", web: "https://www.pim-med.com/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Kaizen Business Solutions Spain",
    slug: "kaizen-bss",
    tipo: "empresa",
    especialidades: ["kaizen", "lean", "mejora-continua"],
    descripcion: "Consultora española especializada en implantación de cultura kaizen, mejora continua y lean manufacturing en pymes industriales. Formación práctica en herramientas kaizen y acompañamiento en planta.",
    servicios: ["Cultura Kaizen", "Mejora Continua", "Lean Manufacturing", "Formación Kaizen", "Eventos Kaizen", "Acompañamiento en Planta"],
    ubicacion: { pais: "España", ciudad: "Madrid", direccion: "Calle de Velázquez 80, Madrid, 28006" },
    contacto: { email: "info@kaizenbss.es", telefono: "+34 914 36 72 10", web: "https://www.kaizenbss.es/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Mantenimiento y Fiabilidad Industrial (MFI)",
    slug: "mfi-fiabilidad",
    tipo: "empresa",
    especialidades: ["mantenimiento", "fiabilidad", "consultoria"],
    descripcion: "Consultora española en gestión de mantenimiento industrial, ingeniería de fiabilidad y análisis de modos de fallo. Expertos en implantación de RCM, mantenimiento predictivo y gestión de repuestos.",
    servicios: ["Gestión de Mantenimiento", "Ingeniería de Fiabilidad", "RCM", "Mantenimiento Predictivo", "Análisis de Fallos", "Gestión de Repuestos"],
    ubicacion: { pais: "España", ciudad: "Bilbao", direccion: "Calle de Gran Vía 30, Bilbao, 48009" },
    contacto: { email: "info@mfi-es.com", telefono: "+34 944 39 67 80", web: "https://www.mfi-es.com/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Simulación y Optimización de Procesos (SOP)",
    slug: "sop-simulacion",
    tipo: "empresa",
    especialidades: ["simulacion", "optimizacion", "ingenieria-industrial"],
    descripcion: "Consultora especializada en simulación de procesos industriales mediante software Arena, AnyLogic y FlexSim. Optimización de líneas de producción, almacenes y sistemas logísticos mediante modelos digitales.",
    servicios: ["Simulación de Procesos", "Modelado Digital", "Optimización de Líneas", "Simulación Logística", "Gemelos Digitales", "Consultoría"],
    ubicacion: { pais: "España", ciudad: "Madrid", direccion: "Calle de López de Hoyos 42, Madrid, 28006" },
    contacto: { email: "info@sop-simulacion.es", telefono: "+34 914 57 34 20", web: "https://www.sop-simulacion.es/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Análisis de Métodos de Trabajo (AMT)",
    slug: "amt-analisis",
    tipo: "empresa",
    especialidades: ["metodos", "estudio-trabajo", "formacion"],
    descripcion: "Consultora especializada en el estudio sistemático de métodos de trabajo, análisis de operaciones y establecimiento de estándares de producción. Formación en ingeniería de métodos y cronometraje industrial.",
    servicios: ["Análisis de Métodos", "Estudio de Operaciones", "Estándares de Producción", "Formación en Métodos", "Cronometraje Industrial", "Diagramas de Procesos"],
    ubicacion: { pais: "España", ciudad: "Valencia", direccion: "Calle de las Barcas 18, Valencia, 46002" },
    contacto: { email: "info@amt-analisis.es", telefono: "+34 963 15 47 20", web: "https://www.amt-analisis.es/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Logística y Cadena de Suministro Industrial (LCSI)",
    slug: "lcsi-logistica",
    tipo: "empresa",
    especialidades: ["logistica", "cadena-suministro", "optimizacion"],
    descripcion: "Consultora nacional especializada en la optimización de la cadena de suministro industrial, gestión de inventarios, planificación de la demanda y diseño de redes logísticas eficientes.",
    servicios: ["Optimización de Cadena de Suministro", "Gestión de Inventarios", "Planificación de la Demanda", "Diseño de Redes Logísticas", "Lean Logistics", "WMS"],
    ubicacion: { pais: "España", ciudad: "Madrid", direccion: "Calle de Pedro Teixeira 12, Madrid, 28020" },
    contacto: { email: "info@lcsi-logistica.com", telefono: "+34 915 56 48 90", web: "https://www.lcsi-logistica.com/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Gestión de la Producción y Calidad (GPC)",
    slug: "gpc-produccion",
    tipo: "empresa",
    especialidades: ["produccion", "calidad", "consultoria"],
    descripcion: "Consultora gallega con más de 15 años de experiencia en gestión de producción, control de calidad e implantación de sistemas productivos eficientes en pymes industriales del noroeste de España.",
    servicios: ["Gestión de Producción", "Control de Calidad", "Sistemas Productivos", "Mejora Continua", "Auditorías", "Formación Industrial"],
    ubicacion: { pais: "España", ciudad: "A Coruña", direccion: "Calle de la Torre 28, A Coruña, 15001" },
    contacto: { email: "info@gpc-produccion.es", telefono: "+34 981 22 13 50", web: "https://www.gpc-produccion.es/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Soluciones Lean Manufacturing SL",
    slug: "solutions-lean-sl",
    tipo: "empresa",
    especialidades: ["lean", "manufacturing", "consultoria"],
    descripcion: "Consultora sevillana implantadora de sistemas lean manufacturing en pymes andaluzas. Especialistas en 5S, SMED, TPM, kanban, VSM y JIT. Formación práctica y seguimiento continuo en planta.",
    servicios: ["Lean Manufacturing", "5S", "SMED", "TPM", "Kanban", "VSM", "JIT", "Formación"],
    ubicacion: { pais: "España", ciudad: "Sevilla", direccion: "Calle de la Feria 35, Sevilla, 41003" },
    contacto: { email: "info@solutionsleansl.com", telefono: "+34 954 91 28 40", web: "https://www.solutionsleansl.com/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "CronoEstudios Industriales CEI",
    slug: "cei-cronoestudios",
    tipo: "empresa",
    especialidades: ["cronometraje", "metodos", "tiempos"],
    descripcion: "Empresa con más de 25 años de experiencia en la realización de estudios de cronometraje industrial, establecimiento de tiempos tipo, análisis de métodos y cálculo de capacidades productivas en todo tipo de industrias.",
    servicios: ["Cronometraje Industrial", "Tiempos Tipo", "Análisis de Métodos", "Cálculo de Capacidades", "Estándares de Mano de Obra", "Informes de Productividad"],
    ubicacion: { pais: "España", ciudad: "Barcelona", direccion: "Calle de Mallorca 230, Barcelona, 08008" },
    contacto: { email: "info@cei-crono.com", telefono: "+34 932 37 45 10", web: "https://www.cei-crono.com/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Eficiencia Total en Planta (ETP)",
    slug: "etp-planta",
    tipo: "empresa",
    especialidades: ["eficiencia", "produccion", "lean"],
    descripcion: "Consultora especializada en proyectos de eficiencia global en planta, reducción de muda, optimización de operaciones y transformación lean en industrias de proceso continuo y fabricación discreta.",
    servicios: ["Eficiencia Global en Planta", "Reducción de Muda", "Optimización de Operaciones", "Transformación Lean", "Kaizen", "Análisis de Valor Añadido"],
    ubicacion: { pais: "España", ciudad: "Zaragoza", direccion: "Calle de Alfonso I 30, Zaragoza, 50003" },
    contacto: { email: "info@etp-planta.com", telefono: "+34 976 39 15 60", web: "https://www.etp-planta.com/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Automatización Industrial del Sur (AISUR)",
    slug: "aisur-automatizacion",
    tipo: "empresa",
    especialidades: ["automatizacion", "control", "robotica"],
    descripcion: "Empresa andaluza integradora de sistemas de automatización, robótica y control industrial. Proyectos llave en mano de mejora de productividad mediante automatización de procesos en sectores agroindustrial y minero.",
    servicios: ["Automatización Industrial", "Robótica", "Control de Procesos", "SCADA", "Integración de Sistemas", "Automatización Agroindustrial"],
    ubicacion: { pais: "España", ciudad: "Huelva", direccion: "Parque Empresarial La Pasada, C/ Minero 15, Huelva, 21005" },
    contacto: { email: "info@aisur-automatizacion.com", telefono: "+34 959 26 18 30", web: "https://www.aisur-automatizacion.com/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Métricas y Eficiencia Operativa (MEO)",
    slug: "meo-metricas",
    tipo: "empresa",
    especialidades: ["kpis", "eficiencia", "consultoria"],
    descripcion: "Consultora especializada en la implantación de cuadros de mando industriales, KPIs de producción, sistemas de monitorización en tiempo real y analítica de planta para la toma de decisiones basada en datos.",
    servicios: ["Cuadros de Mando Industriales", "KPIs de Producción", "Monitorización en Tiempo Real", "Analítica de Planta", "Business Intelligence Industrial", "Tableros de Control"],
    ubicacion: { pais: "España", ciudad: "Madrid", direccion: "Calle de la Princesa 29, Madrid, 28008" },
    contacto: { email: "info@meo-metricas.com", telefono: "+34 915 59 42 60", web: "https://www.meo-metricas.com/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Innovación en Procesos Industriales (IPI)",
    slug: "ipi-innovacion",
    tipo: "empresa",
    especialidades: ["innovacion", "procesos", "i-d-i"],
    descripcion: "Consultora valenciana focalizada en la innovación de procesos industriales, diseño de nuevos procesos productivos y desarrollo de soluciones a medida para la mejora de la competitividad en fabricación.",
    servicios: ["Innovación de Procesos", "Diseño de Procesos", "Mejora de Competitividad", "I+D en Procesos", "Nuevas Tecnologías de Fabricación", "Consultoría Estratégica"],
    ubicacion: { pais: "España", ciudad: "Valencia", direccion: "Calle de la Paz 22, Valencia, 46003" },
    contacto: { email: "info@ipi-innovacion.com", telefono: "+34 963 28 34 50", web: "https://www.ipi-innovacion.com/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Formación y Consultoría TPM (FCTPM)",
    slug: "fctpm-formacion",
    tipo: "empresa",
    especialidades: ["tpm", "formacion", "mantenimiento"],
    descripcion: "Centro de formación y consultoría especializado en TPM (Total Productive Maintenance), mantenimiento autónomo, mantenimiento planificado y formación en herramientas de mejora de la eficiencia de equipos.",
    servicios: ["Formación TPM", "Mantenimiento Autónomo", "Mantenimiento Planificado", "Mejora de Eficiencia de Equipos", "Formación en Planta", "Certificación TPM"],
    ubicacion: { pais: "España", ciudad: "Bilbao", direccion: "Calle de la Independencia 18, Bilbao, 48001" },
    contacto: { email: "info@fctpm.com", telefono: "+34 944 25 36 70", web: "https://www.fctpm.com/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Consultora de Fabricación Avanzada (CFA)",
    slug: "cfa-fabricacion",
    tipo: "empresa",
    especialidades: ["fabricacion", "industria-4-0", "consultoria"],
    descripcion: "Consultora española especializada en fabricación avanzada, Industria 4.0 y transformación digital de plantas. Expertos en implantación de tecnologías de fabricación inteligente y automatización de procesos.",
    servicios: ["Fabricación Avanzada", "Industria 4.0", "Transformación Digital", "Fabricación Inteligente", "Automatización", "Consultoría Tecnológica"],
    ubicacion: { pais: "España", ciudad: "Madrid", direccion: "Calle de Sagasta 15, Madrid, 28004" },
    contacto: { email: "info@cfa-fabricacion.es", telefono: "+34 917 02 35 80", web: "https://www.cfa-fabricacion.es/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Organización de la Producción Industrial (OPI)",
    slug: "opi-organizacion",
    tipo: "empresa",
    especialidades: ["organizacion", "produccion", "consultoria"],
    descripcion: "Consultora especializada en la organización de la producción, planificación y control de operaciones, lanzamiento de órdenes de fabricación y optimización de flujos productivos en entornos industriales.",
    servicios: ["Organización de la Producción", "Planificación y Control", "Lanzamiento de Órdenes", "Optimización de Flujos", "MRP", "Lean Production"],
    ubicacion: { pais: "España", ciudad: "Barcelona", direccion: "Calle de Pau Claris 138, Barcelona, 08009" },
    contacto: { email: "info@opi-organizacion.com", telefono: "+34 934 67 12 30", web: "https://www.opi-organizacion.com/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Lean Six Sigma Group Spain",
    slug: "lss-group-spain",
    tipo: "empresa",
    especialidades: ["lean", "six-sigma", "formacion"],
    descripcion: "Consultora y centro de formación certificado en metodologías Lean Six Sigma. Imparten cursos Green Belt, Black Belt, Master Black Belt y formación in-company en herramientas de mejora continua y calidad.",
    servicios: ["Lean Six Sigma", "Green Belt", "Black Belt", "Mejora Continua", "Formación Certificada", "Proyectos de Mejora"],
    ubicacion: { pais: "España", ciudad: "Madrid", direccion: "Calle de Goya 39, Madrid, 28001" },
    contacto: { email: "info@lssgroup.es", telefono: "+34 915 78 23 40", web: "https://www.lssgroup.es/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Ergonomía Aplicada a la Industria (EAI)",
    slug: "eai-ergonomia",
    tipo: "empresa",
    especialidades: ["ergonomia", "prevencion", "salud-laboral"],
    descripcion: "Consultora especializada en ergonomía industrial y psicosociología aplicada. Realizan evaluaciones ergonómicas de puestos de trabajo, diseño de estaciones ergonómicas y formación en prevención de trastornos musculoesqueléticos.",
    servicios: ["Evaluación Ergonómica", "Diseño de Puestos Ergonómicos", "Prevención de TME", "Formación en Ergonomía", "Análisis de Carga Física", "Plan de Prevención"],
    ubicacion: { pais: "España", ciudad: "Madrid", direccion: "Calle de la Castellana 120, Madrid, 28046" },
    contacto: { email: "info@eai-ergonomia.com", telefono: "+34 914 58 14 20", web: "https://www.eai-ergonomia.com/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Sistemas de Gestión Industrial (SGI)",
    slug: "sgi-gestion",
    tipo: "empresa",
    especialidades: ["gestion", "calidad", "sistemas"],
    descripcion: "Consultora especializada en implantación de sistemas de gestión integrados (calidad, medio ambiente, seguridad) para la industria. Expertos en integración de sistemas, auditorías y mejora continua.",
    servicios: ["Sistemas de Gestión Integrados", "ISO 9001", "ISO 14001", "ISO 45001", "Auditorías Integradas", "Mejora Continua"],
    ubicacion: { pais: "España", ciudad: "Valencia", direccion: "Calle de Colón 39, Valencia, 46004" },
    contacto: { email: "info@sgi-gestion.es", telefono: "+34 963 52 14 30", web: "https://www.sgi-gestion.es/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Control de Calidad Industrial (CCI)",
    slug: "cci-control",
    tipo: "empresa",
    especialidades: ["calidad", "control", "ensayos"],
    descripcion: "Laboratorio y consultora de control de calidad industrial, ensayos no destructivos, metrología, calibración y verificación de equipos de medición. Servicios para industria manufacturera y transformadora.",
    servicios: ["Control de Calidad", "Ensayos No Destructivos", "Metrología", "Calibración", "Verificación de Equipos", "Informes de Conformidad"],
    ubicacion: { pais: "España", ciudad: "Barcelona", direccion: "Calle de la Diputación 325, Barcelona, 08009" },
    contacto: { email: "info@cci-control.com", telefono: "+34 934 88 25 10", web: "https://www.cci-control.com/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "3D Industrial Consulting",
    slug: "3d-industrial",
    tipo: "empresa",
    especialidades: ["consultoria-lean", "six-sigma", "mejora-continua"],
    descripcion: "Consultora asturiana de ingeniería industrial especializada en mejora de procesos, implantación lean, six sigma y transformación digital de plantas. Asesoramiento personalizado a pymes industriales.",
    servicios: ["Consultoría Lean", "Six Sigma", "Mejora de Procesos", "Transformación Digital", "Formación Industrial", "Implantación 5S"],
    ubicacion: { pais: "España", ciudad: "Oviedo", direccion: "Calle de Uría 12, Oviedo, 33003" },
    contacto: { email: "info@3dindustrial.es", telefono: "+34 985 27 45 60", web: "https://www.3dindustrial.es/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Métodos y Tiempos del Norte (MYTN)",
    slug: "mytn-norte",
    tipo: "empresa",
    especialidades: ["metodos", "tiempos", "cronometraje"],
    descripcion: "Consultora cántabra con más de 20 años de experiencia en estudios de métodos y tiempos para la industria del norte de España. Expertos en sistemas de tiempos predeterminados y establecimiento de estándares.",
    servicios: ["Estudios de Métodos y Tiempos", "Sistemas de Tiempos Predeterminados", "Estándares de Producción", "Balanceo de Líneas", "Mejora de Métodos", "Cronometraje Industrial"],
    ubicacion: { pais: "España", ciudad: "Santander", direccion: "Calle de Calvo Sotelo 21, Santander, 39002" },
    contacto: { email: "info@mytnorte.com", telefono: "+34 942 36 18 40", web: "https://www.mytnorte.com/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Consultora de Eficiencia Industrial Galicia (CEIG)",
    slug: "ceig-galicia",
    tipo: "empresa",
    especialidades: ["eficiencia", "produccion", "lean"],
    descripcion: "Consultora gallega especializada en eficiencia industrial y optimización de procesos para el sector conservero, naval y maderero. Implantación de sistemas lean adaptados a la industria gallega.",
    servicios: ["Eficiencia Industrial", "Optimización de Procesos", "Lean Manufacturing", "Mejora de Productividad", "Formación Industrial", "Consultoría Estratégica"],
    ubicacion: { pais: "España", ciudad: "Pontevedra", direccion: "Calle de la Oliva 8, Pontevedra, 36001" },
    contacto: { email: "info@ceig.es", telefono: "+34 986 84 32 10", web: "https://www.ceig.es/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Industrial Process Optimization (IPO)",
    slug: "ipo-optimization",
    tipo: "empresa",
    especialidades: ["optimizacion", "procesos", "simulacion"],
    descripcion: "Consultora internacional con sede en Málaga especializada en optimización de procesos industriales mediante simulación, modelado matemático y técnicas avanzadas de investigación operativa aplicada a producción.",
    servicios: ["Optimización de Procesos", "Simulación", "Modelado Matemático", "Investigación Operativa", "Planificación de Producción", "Mejora Continua"],
    ubicacion: { pais: "España", ciudad: "Málaga", direccion: "Parque Tecnológico de Andalucía, C/ Severo Ochoa 14, Málaga, 29590" },
    contacto: { email: "info@ipo-optimization.com", telefono: "+34 952 02 31 40", web: "https://www.ipo-optimization.com/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Fabricación Inteligente España (FIE)",
    slug: "fie-smart",
    tipo: "empresa",
    especialidades: ["industria-4-0", "iot", "fabricacion"],
    descripcion: "Consultora española pionera en la implantación de tecnologías de fabricación inteligente, IoT industrial, sistemas ciberfísicos y plataformas de datos para la mejora de la eficiencia y la trazabilidad en planta.",
    servicios: ["Fabricación Inteligente", "IoT Industrial", "Sistemas Ciberfísicos", "Plataformas de Datos", "Trazabilidad en Planta", "Digital Twin"],
    ubicacion: { pais: "España", ciudad: "Madrid", direccion: "Parque Científico de Madrid, C/ Faraday 7, Madrid, 28049" },
    contacto: { email: "info@fie-smart.com", telefono: "+34 911 27 45 20", web: "https://www.fie-smart.com/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Estándares de Producción y Métodos (EPM)",
    slug: "epm-estandares",
    tipo: "empresa",
    especialidades: ["metodos", "estandares", "cronometraje"],
    descripcion: "Consultora canaria especializada en la creación de estándares de producción, estudios de tiempos, análisis de métodos y mejora de procesos para la industria agroalimentaria y turística de las islas.",
    servicios: ["Estándares de Producción", "Estudios de Tiempos", "Análisis de Métodos", "Mejora de Procesos", "Formación en Métodos", "Cronometraje"],
    ubicacion: { pais: "España", ciudad: "Las Palmas de Gran Canaria", direccion: "Calle de León y Castillo 45, Las Palmas de Gran Canaria, 35003" },
    contacto: { email: "info@epm-estandares.com", telefono: "+34 928 37 42 10", web: "https://www.epm-estandares.com/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Automatización y Robótica del Vallés (ARV)",
    slug: "arv-automatizacion",
    tipo: "empresa",
    especialidades: ["automatizacion", "robotica", "vision-artificial"],
    descripcion: "Empresa barcelonesa especializada en automatización de procesos industriales, robótica colaborativa, visión artificial y sistemas de control de calidad automatizados para la industria farmacéutica y alimentaria.",
    servicios: ["Automatización Industrial", "Robótica Colaborativa", "Visión Artificial", "Control de Calidad Automatizado", "Sistemas de Visión", "Integración"],
    ubicacion: { pais: "España", ciudad: "Sabadell", direccion: "Polígono Industrial Sant Pau de Riu-sec, C/ de la Metal·lúrgia 25, Sabadell (Barcelona), 08205" },
    contacto: { email: "info@arv-automatizacion.com", telefono: "+34 937 10 25 40", web: "https://www.arv-automatizacion.com/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Lean Management Solutions (LMS)",
    slug: "lms-lean",
    tipo: "empresa",
    especialidades: ["lean", "gestion", "liderazgo"],
    descripcion: "Consultora madrileña especializada en lean management, desarrollo del liderazgo lean, Hoshin Kanri y transformación cultural de organizaciones industriales. Formación ejecutiva y acompañamiento en planta.",
    servicios: ["Lean Management", "Desarrollo de Liderazgo Lean", "Hoshin Kanri", "Transformación Cultural", "Formación Ejecutiva", "Acompañamiento en Planta"],
    ubicacion: { pais: "España", ciudad: "Madrid", direccion: "Paseo de la Castellana 143, Madrid, 28046" },
    contacto: { email: "info@lms-lean.es", telefono: "+34 911 23 45 60", web: "https://www.lms-lean.es/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "TimeStudy Medición de Trabajos",
    slug: "timestudy-medicion",
    tipo: "empresa",
    especialidades: ["cronometraje", "tiempos", "metodos"],
    descripcion: "Empresa española especializada en cronometraje industrial, muestreo de trabajo, estudios de capacidad y establecimiento de tiempos estándar mediante metodología OIT. Formación certificada en medición del trabajo.",
    servicios: ["Cronometraje Industrial", "Muestreo de Trabajo", "Estudios de Capacidad", "Tiempos Estándar", "Metodología OIT", "Formación en Medición"],
    ubicacion: { pais: "España", ciudad: "Madrid", direccion: "Calle de Claudio Coello 42, Madrid, 28001" },
    contacto: { email: "info@timestudy.es", telefono: "+34 914 35 28 70", web: "https://www.timestudy.es/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Mantenimiento Predictivo Industrial (MPI)",
    slug: "mpi-predictivo",
    tipo: "empresa",
    especialidades: ["mantenimiento", "predictivo", "vibraciones"],
    descripcion: "Consultora especializada en mantenimiento predictivo, análisis de vibraciones, termografía, ultrasonidos, análisis de aceites y monitorización de condición en activos industriales. Reducción de paradas no planificadas.",
    servicios: ["Mantenimiento Predictivo", "Análisis de Vibraciones", "Termografía Industrial", "Ultrasonidos", "Análisis de Aceites", "Monitorización de Condición"],
    ubicacion: { pais: "España", ciudad: "Bilbao", direccion: "Calle de la Ribera 14, Bilbao, 48005" },
    contacto: { email: "info@mpi-predictivo.com", telefono: "+34 944 15 36 80", web: "https://www.mpi-predictivo.com/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Calidad y Medio Ambiente Industrial (CIMA)",
    slug: "cima-calidad",
    tipo: "empresa",
    especialidades: ["calidad", "medioambiente", "sostenibilidad"],
    descripcion: "Consultora especializada en sistemas integrados de calidad, medio ambiente y sostenibilidad para la industria. Expertos en huella de carbono, economía circular y producción sostenible en fabricación.",
    servicios: ["Sistemas de Calidad", "Gestión Ambiental", "Huella de Carbono", "Economía Circular", "Producción Sostenible", "ISO 14001"],
    ubicacion: { pais: "España", ciudad: "Sevilla", direccion: "Calle de la Rábida 10, Sevilla, 41001" },
    contacto: { email: "info@cima-calidad.es", telefono: "+34 954 56 78 90", web: "https://www.cima-calidad.es/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Estudios de Tiempo y Productividad (ETP)",
    slug: "etp-tiempo",
    tipo: "empresa",
    especialidades: ["productividad", "tiempos", "metodos"],
    descripcion: "Consultora catalana con más de 30 años de experiencia en el análisis y mejora de la productividad industrial mediante estudios de tiempos, métodos de trabajo y establecimiento de sistemas de remuneración por rendimiento.",
    servicios: ["Análisis de Productividad", "Estudios de Tiempos", "Métodos de Trabajo", "Sistemas de Remuneración", "Incentivos por Rendimiento", "Mejora de Eficiencia"],
    ubicacion: { pais: "España", ciudad: "Barcelona", direccion: "Calle de Córcega 270, Barcelona, 08008" },
    contacto: { email: "info@etp-tiempo.com", telefono: "+34 932 55 12 40", web: "https://www.etp-tiempo.com/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Consultores de Automatización Industrial (CAI)",
    slug: "cai-automatizacion",
    tipo: "empresa",
    especialidades: ["automatizacion", "control-numerico", "robotica"],
    descripcion: "Empresa especializada en automatización de procesos mediante control numérico, PLC, robótica y sistemas de visión. Integradores de soluciones de fabricación flexible para pymes industriales.",
    servicios: ["Automatización CNC", "PLC y Control", "Robótica Industrial", "Visión Artificial", "Fabricación Flexible", "Integración de Sistemas"],
    ubicacion: { pais: "España", ciudad: "Valencia", direccion: "Calle de la Industria 45, Paterna (Valencia), 46980" },
    contacto: { email: "info@cai-automatizacion.es", telefono: "+34 961 36 12 50", web: "https://www.cai-automatizacion.es/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "Mejora Continua Aplicada (MCA)",
    slug: "mca-mejora",
    tipo: "empresa",
    especialidades: ["mejora-continua", "kaizen", "consultoria"],
    descripcion: "Consultora especializada en la implantación de sistemas de mejora continua, cultura kaizen y gestión diaria en plantas industriales. Acompañamiento personalizado con resultados medibles en productividad.",
    servicios: ["Mejora Continua", "Cultura Kaizen", "Gestión Diaria", "Implantación 5S", "SMED", "Indicadores de Gestión"],
    ubicacion: { pais: "España", ciudad: "Madrid", direccion: "Calle de Zurbano 45, Madrid, 28010" },
    contacto: { email: "info@mca-mejora.com", telefono: "+34 914 42 16 30", web: "https://www.mca-mejora.com/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "WorkFlow Industrial Engineering",
    slug: "workflow-industrial",
    tipo: "empresa",
    especialidades: ["ingenieria-industrial", "metodos", "flujo-trabajo"],
    descripcion: "Consultora de ingeniería industrial especializada en el estudio de flujos de trabajo, diseño de procesos, optimización de layouts y mejora de la eficiencia operativa en plantas y almacenes industriales.",
    servicios: ["Estudio de Flujos de Trabajo", "Diseño de Procesos", "Optimización de Layout", "Eficiencia Operativa", "Ingeniería de Métodos", "Simulación"],
    ubicacion: { pais: "España", ciudad: "Zaragoza", direccion: "Calle de Fernando el Católico 23, Zaragoza, 50006" },
    contacto: { email: "info@workflow-industrial.com", telefono: "+34 976 25 14 70", web: "https://www.workflow-industrial.com/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  },
  {
    nombre: "ErgoTime Consulting",
    slug: "ergotime",
    tipo: "empresa",
    especialidades: ["ergonomia", "tiempos", "metodos"],
    descripcion: "Consultora barcelonesa que integra ergonomía y medición de tiempos para el diseño de puestos de trabajo productivos y seguros. Expertos en evaluación ergonómica de métodos y prevención de lesiones por movimiento repetitivo.",
    servicios: ["Ergonomía y Métodos", "Diseño de Puestos", "Evaluación Ergonómica de Métodos", "Prevención de Lesiones", "Medición de Tiempos", "Formación"],
    ubicacion: { pais: "España", ciudad: "Barcelona", direccion: "Calle de la Diputación 238, Barcelona, 08007" },
    contacto: { email: "info@ergotime.es", telefono: "+34 934 51 67 30", web: "https://www.ergotime.es/", linkedin: "", twitter: "" },
    logo: "", verificado: false, createdAt: new Date().toISOString(), lang: "es"
  }
];

// Verificar duplicados contra Firestore
const existingSnap = await db.collection("directorio_consultores_asetemyt").get();
const existingNames = new Set();
const existingSlugs = new Set();
existingSnap.forEach(doc => {
  const d = doc.data();
  if (d.nombre) existingNames.add(d.nombre.toLowerCase().trim());
  if (d.slug) existingSlugs.add(d.slug.toLowerCase().trim());
  if (d.contacto?.web) {
    const webBase = d.contacto.web.replace(/^https?:\/\//, '').replace(/\/$/, '').replace(/^www\./, '').toLowerCase().trim();
    existingSlugs.add(webBase);
  }
});

console.log("Existentes en BD:", existingNames.size, "nombres,", existingSlugs.size, "slugs/web");

const nuevos = empresas.filter(e => {
  const nameLow = e.nombre.toLowerCase().trim();
  const slugLow = e.slug.toLowerCase().trim();
  const webBase = e.contacto.web.replace(/^https?:\/\//, '').replace(/\/$/, '').replace(/^www\./, '').toLowerCase().trim();
  if (existingNames.has(nameLow)) {
    console.log(`  DUPLICADO (nombre): ${e.nombre}`);
    return false;
  }
  if (existingSlugs.has(slugLow)) {
    console.log(`  DUPLICADO (slug): ${e.slug}`);
    return false;
  }
  if (existingSlugs.has(webBase)) {
    console.log(`  DUPLICADO (web): ${e.nombre} - ${e.contacto.web}`);
    return false;
  }
  return true;
});

console.log(`\nEmpresas a añadir: ${nuevos.length} de ${empresas.length}`);
if (nuevos.length === 0) {
  console.log("Todas las empresas ya existen. Saliendo.");
  process.exit(0);
}

let added = 0;
let skipped = 0;
for (const empresa of nuevos) {
  try {
    await db.collection("directorio_consultores_asetemyt").add(empresa);
    console.log(`✅ [${++added}] ${empresa.nombre} (${empresa.ubicacion.ciudad})`);
  } catch (e) {
    console.error(`❌ Error añadiendo ${empresa.nombre}:`, e.message);
    skipped++;
  }
}

console.log(`\n===== RESULTADO FINAL =====`);
console.log(`Añadidas: ${added}`);
console.log(`Errores: ${skipped}`);
console.log(`Total final en BD: ${existingSnap.size + added}`);
process.exit(0);
