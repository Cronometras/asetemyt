// Firebase configuration for asetemyt.com
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  query,
  orderBy,
} from 'firebase/firestore';

const firebaseConfig = {
  // All values injected via PUBLIC_ env vars at build time (Cloudflare Pages / Astro)
  apiKey: import.meta.env.PUBLIC_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.PUBLIC_FIREBASE_APP_ID || '',
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Directory collection names (split by type)
export const COLLECTION_CONSULTORES = 'directorio_consultores_asetemyt';
export const COLLECTION_SOFTWARE = 'directorio_software_asetemyt';
export const PENDING_CONSULTORES = 'pending_consultores_asetemyt';

// --- i18n ---

export const translations = {
  es: {
    home: 'Inicio',
    directory: 'Directorio',
    blog: 'Blog',
    addCompany: 'Añadir Empresa',
    exploreDirectory: 'Explorar Directorio',
    addMyCompany: 'Añadir mi Empresa',
    totalEntries: 'Total Fichas',
    companies: 'Empresas',
    consultants: 'Consultores',
    freelancers: 'Consultores',
    specialties: 'Especialidades',
    latestArticles: 'Últimos Artículos',
    viewAll: 'Ver todos',
    areSpecialist: '¿Eres especialista en cronometraje?',
    addProfileDesc: 'Añade tu perfil o empresa al directorio y conecta con empresas que buscan tus servicios de ingeniería de métodos y tiempos.',
    search: 'Buscar',
    type: 'Tipo',
    all: 'Todos',
    specialty: 'Especialidad',
    allSpec: 'Todas',
    country: 'País',
    allCountries: 'Todos',
    results: 'resultados',
    result: 'resultado',
    noEntries: 'No hay entradas en el directorio todavía.',
    addFirst: 'Añade la primera entrada →',
    noLocation: 'Sin ubicación',
    noType: 'Sin tipo',
    directoryTitle: 'Directorio de Cronometraje Industrial',
    directoryDesc: 'Consultores y empresas especializados en ingeniería de métodos y tiempos.',
    heroTitle1: 'Cronometraje Industrial',
    heroTitle2: 'y Métodos y Tiempos',
    heroDesc: 'Encuentra técnicos, consultores y empresas especializadas en ingeniería de métodos, cronometraje industrial, análisis de tiempos y optimización de procesos productivos.',
    industrialDirectory: 'Directorio Industrial',
    relatedProjects: 'Proyectos Relacionados',
    footerDesc: 'Directorio de técnicos, consultores y empresas especializadas en cronometraje industrial e ingeniería de métodos y tiempos.',
    links: 'Enlaces',
    formTitle: 'Añadir al Directorio',
    formDesc: 'Registra tu empresa o perfil profesional en el directorio de cronometraje industrial.',
    nameRequired: 'Nombre / Razón Social',
    typeRequired: 'Tipo',
    selectType: 'Seleccionar tipo',
    empresa: 'Empresa',
    consultor: 'Consultor',
    freelancer: 'Consultor',
    specialtiesRequired: 'Especialidades',
    description: 'Descripción',
    descriptionPlaceholder: 'Describe tu empresa, experiencia y servicios principales...',
    services: 'Servicios (uno por línea)',
    servicesPlaceholder: 'Cronometraje de operaciones\nAnálisis de métodos\nConsultoría Lean',
    location: 'Ubicación',
    countryPlaceholder: 'España',
    city: 'Ciudad',
    cityPlaceholder: 'Barcelona',
    contact: 'Contacto',
    email: 'Email',
    phone: 'Teléfono',
    web: 'Web',
    linkedin: 'LinkedIn',
    logoUrl: 'URL del Logo',
    submit: 'Enviar Solicitud',
    submitNote: 'Tu ficha será revisada antes de publicarse en el directorio.',
    successMsg: '¡Ficha enviada correctamente!',
    successNote: 'Tu solicitud será revisada y publicada pronto.',
    errorMsg: 'Error al enviar',
    ctaTitle: '¿Eres especialista en cronometraje?',
    ctaDesc: 'Añade tu perfil o empresa al directorio y conecta con empresas que buscan tus servicios.',
    sinTipo: 'Sin tipo',
    // Especialidades labels
    cronometraje: 'Cronometraje',
    mtm: 'MTM',
    most: 'MOST',
    oee: 'OEE',
    lean: 'Lean Manufacturing',
    estudioTrabajo: 'Estudio del Trabajo',
    // Empleo page
    jobsTitle: 'Empleo en Ingeniería de Métodos',
    jobsDesc: 'Ofertas de trabajo en cronometraje industrial, Lean Manufacturing y optimización de procesos.',
    postJob: 'Publicar oferta',
    allTypes: 'Todos los tipos',
    filterLocation: 'Filtrar por ubicación...',
    loadingJobs: 'Cargando ofertas...',
    noJobs: 'No hay ofertas activas todavía.',
    noJobsHint: '¡Sé el primero en publicar una oferta!',
    publishJob: 'Publicar oferta de empleo',
    jobTitle: 'Puesto *',
    jobCompany: 'Empresa *',
    jobLocation: 'Ubicación',
    jobType: 'Tipo *',
    jobSalary: 'Rango salarial',
    jobDescription: 'Descripción *',
    jobRequirements: 'Requisitos',
    jobContactEmail: 'Email de contacto *',
    jobContactUrl: 'URL de contacto',
    publishBtn: 'Publicar oferta',
    publishing: 'Publicando...',
    publishedOk: '✓ Oferta publicada',
    fullTime: 'Tiempo completo',
    partTime: 'Tiempo parcial',
    contract: 'Contrato',
    freelanceType: 'Freelance',
    contactBtn: 'Contactar',
    publishedOn: 'Publicado',
    jobsCtaTitle: '¿Buscas profesionales del sector?',
    jobsCtaDesc: 'Publica tu oferta gratuita y llega a ingenieros de métodos y tiempos cualificados.',
    // Comparador page
    compareTitle: 'Comparador de Software de Cronometraje',
    compareDesc: 'Selecciona hasta 3 herramientas y compara funciones, precios y plataforma.',
    tool1: 'Herramienta 1',
    tool2: 'Herramienta 2',
    tool3: 'Herramienta 3 (opcional)',
    selectTool: 'Seleccionar...',
    compareBtn: 'Comparar',
    clearBtn: 'Limpiar',
    selectAtLeast: 'Selecciona al menos 2 herramientas para comparar.',
    characteristic: 'Característica',
    platform: 'Plataforma',
    pricing: 'Precio',
    target: 'Target',
    languages: 'Idiomas',
    trial: 'Trial',
    video: 'Vídeo',
    apiInt: 'API/Integraciones',
    methods: 'Métodos',
    keyFeatures: 'Funciones clave',
    yes: '✓ Sí',
    no: '✗ No',
    allTools: 'Todos',
    cronometrajeFilter: 'Cronometraje',
    noSoftwareFound: 'No se encontraron herramientas.',
    trialAvail: '✓ Trial disponible',
    videoAvail: '📹 Vídeo',
    // Ficha detail labels
    about: 'Acerca de',
    specialtiesLabel: 'Especialidades',
    servicesLabel: 'Servicios',
    locationLabel: 'Ubicación',
    contactLabel: 'Contacto',
    ownerQuestion: '¿Eres el propietario de esta ficha?',
    ownerDesc: 'Verifícala para editar los datos y mostrar el badge de confianza. 50€/año.',
    claimFicha: 'Reclamar esta ficha →',
    verifiedFicha: 'Tu ficha verificada',
    editFichaDesc: 'Edita los datos de tu ficha para mantenerla actualizada.',
    editFicha: 'Editar ficha →',
    reviews: 'Reseñas',
    relatedTerms: 'Términos relacionados',
    needPro: '¿Necesitas un profesional especializado en',
    viewInDirectory: 'Ver profesionales en el directorio →',
    backToGlossary: '← Volver al glosario completo',
  },
  en: {
    home: 'Home',
    directory: 'Directory',
    blog: 'Blog',
    addCompany: 'Add Company',
    exploreDirectory: 'Explore Directory',
    addMyCompany: 'Add My Company',
    totalEntries: 'Total Entries',
    companies: 'Companies',
    consultants: 'Consultants',
    freelancers: 'Consultores',
    specialties: 'Specialties',
    latestArticles: 'Latest Articles',
    viewAll: 'View all',
    areSpecialist: 'Are you a time study specialist?',
    addProfileDesc: 'Add your profile or company to the directory and connect with companies looking for your methods engineering services.',
    search: 'Search',
    type: 'Type',
    all: 'All',
    specialty: 'Specialty',
    allSpec: 'All',
    country: 'Country',
    allCountries: 'All',
    results: 'results',
    result: 'result',
    noEntries: 'No entries in the directory yet.',
    addFirst: 'Add the first entry →',
    noLocation: 'No location',
    noType: 'No type',
    directoryTitle: 'Industrial Time Study Directory',
    directoryDesc: 'Consultants and companies specialized in methods and time engineering.',
    heroTitle1: 'Industrial Time Study',
    heroTitle2: '& Methods Engineering',
    heroDesc: 'Find technicians, consultants and companies specialized in methods engineering, industrial time study, time analysis and production process optimization.',
    industrialDirectory: 'Industrial Directory',
    relatedProjects: 'Related Projects',
    footerDesc: 'Directory of technicians, consultants and companies specialized in industrial time study and methods engineering.',
    links: 'Links',
    formTitle: 'Add to Directory',
    formDesc: 'Register your company or professional profile in the industrial time study directory.',
    nameRequired: 'Name / Company Name',
    typeRequired: 'Type',
    selectType: 'Select type',
    empresa: 'Company',
    consultor: 'Consultant',
    freelancer: 'Consultant',
    specialtiesRequired: 'Specialties',
    description: 'Description',
    descriptionPlaceholder: 'Describe your company, experience and main services...',
    services: 'Services (one per line)',
    servicesPlaceholder: 'Operation time study\nMethods analysis\nLean consulting',
    location: 'Location',
    countryPlaceholder: 'Spain',
    city: 'City',
    cityPlaceholder: 'Barcelona',
    contact: 'Contact',
    email: 'Email',
    phone: 'Phone',
    web: 'Website',
    linkedin: 'LinkedIn',
    logoUrl: 'Logo URL',
    submit: 'Submit Application',
    submitNote: 'Your entry will be reviewed before being published in the directory.',
    successMsg: 'Entry submitted successfully!',
    successNote: 'Your application will be reviewed and published soon.',
    errorMsg: 'Error submitting',
    ctaTitle: 'Are you a time study specialist?',
    ctaDesc: 'Add your profile or company to the directory and connect with companies looking for your services.',
    sinTipo: 'No type',
    // Especialidades labels
    cronometraje: 'Time Study',
    mtm: 'MTM',
    most: 'MOST',
    oee: 'OEE',
    lean: 'Lean Manufacturing',
    estudioTrabajo: 'Work Study',
    // Empleo page
    jobsTitle: 'Jobs in Methods Engineering',
    jobsDesc: 'Job offers in industrial time study, Lean Manufacturing and process optimization.',
    postJob: 'Post a job',
    allTypes: 'All types',
    filterLocation: 'Filter by location...',
    loadingJobs: 'Loading jobs...',
    noJobs: 'No active job offers yet.',
    noJobsHint: 'Be the first to post a job offer!',
    publishJob: 'Post a job offer',
    jobTitle: 'Position *',
    jobCompany: 'Company *',
    jobLocation: 'Location',
    jobType: 'Type *',
    jobSalary: 'Salary range',
    jobDescription: 'Description *',
    jobRequirements: 'Requirements',
    jobContactEmail: 'Contact email *',
    jobContactUrl: 'Contact URL',
    publishBtn: 'Post job',
    publishing: 'Publishing...',
    publishedOk: '✓ Job posted successfully',
    fullTime: 'Full time',
    partTime: 'Part time',
    contract: 'Contract',
    freelanceType: 'Freelance',
    contactBtn: 'Contact',
    publishedOn: 'Published',
    jobsCtaTitle: 'Looking for sector professionals?',
    jobsCtaDesc: 'Post your free job offer and reach qualified methods and time engineers.',
    // Comparador page
    compareTitle: 'Industrial Time Study Software Comparison',
    compareDesc: 'Select up to 3 tools and compare features, pricing and platform.',
    tool1: 'Tool 1',
    tool2: 'Tool 2',
    tool3: 'Tool 3 (optional)',
    selectTool: 'Select...',
    compareBtn: 'Compare',
    clearBtn: 'Clear',
    selectAtLeast: 'Select at least 2 tools to compare.',
    characteristic: 'Feature',
    platform: 'Platform',
    pricing: 'Pricing',
    target: 'Target',
    languages: 'Languages',
    trial: 'Trial',
    video: 'Video',
    apiInt: 'API/Integrations',
    methods: 'Methods',
    keyFeatures: 'Key features',
    yes: '✓ Yes',
    no: '✗ No',
    allTools: 'All',
    cronometrajeFilter: 'Time Study',
    noSoftwareFound: 'No tools found.',
    trialAvail: '✓ Trial available',
    videoAvail: '📹 Video',
    // Ficha detail labels
    about: 'About',
    specialtiesLabel: 'Specialties',
    servicesLabel: 'Services',
    locationLabel: 'Location',
    contactLabel: 'Contact',
    ownerQuestion: 'Are you the owner of this listing?',
    ownerDesc: 'Verify it to edit data and show the trust badge. €50/year.',
    claimFicha: 'Claim this listing →',
    verifiedFicha: 'Your verified listing',
    editFichaDesc: 'Edit your listing data to keep it up to date.',
    editFicha: 'Edit listing →',
    reviews: 'Reviews',
    relatedTerms: 'Related terms',
    needPro: 'Need a professional specialized in',
    viewInDirectory: 'View professionals in the directory →',
    backToGlossary: '← Back to the full glossary',
  },
};

export type Lang = 'es' | 'en';

export function getLang(): Lang {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('asetemyt-lang');
    if (stored === 'es' || stored === 'en') return stored;
    const browser = navigator.language.toLowerCase();
    if (browser.startsWith('en')) return 'en';
  }
  return 'es';
}

export function t(key: string, lang?: Lang): string {
  const l = lang || getLang();
  return (translations[l] as any)?.[key] || (translations.es as any)?.[key] || key;
}

// --- Directory (split: consultores + software) ---

function applyFilters(entries: any[], filters?: {
  tipo?: string;
  especialidad?: string;
  ubicacion?: string;
  lang?: string;
}) {
  let result = entries;
  if (filters?.tipo) {
    result = result.filter((e) => e.tipo === filters.tipo);
  }
  if (filters?.especialidad) {
    result = result.filter((e) =>
      e.especialidades?.some(
        (es: string) => es.toLowerCase() === filters.especialidad!.toLowerCase()
      )
    );
  }
  if (filters?.ubicacion) {
    const loc = filters.ubicacion.toLowerCase();
    result = result.filter(
      (e) =>
        e.ubicacion?.pais?.toLowerCase().includes(loc) ||
        e.ubicacion?.ciudad?.toLowerCase().includes(loc)
    );
  }
  if (filters?.lang) {
    result = result.filter((e) => !e.lang || e.lang === filters.lang);
  }
  return result;
}

/** Get consultores entries only */
export async function getConsultoresEntries(filters?: {
  tipo?: string;
  especialidad?: string;
  ubicacion?: string;
  lang?: string;
}) {
  const snapshot = await getDocs(
    query(collection(db, COLLECTION_CONSULTORES), orderBy('createdAt', 'desc'))
  );
  const entries = snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() })) as any[];
  return applyFilters(entries, filters);
}

/** Get software entries only */
export async function getSoftwareEntries(filters?: {
  tipo?: string;
  especialidad?: string;
  ubicacion?: string;
  lang?: string;
}) {
  const snapshot = await getDocs(
    query(collection(db, COLLECTION_SOFTWARE), orderBy('createdAt', 'desc'))
  );
  const entries = snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() })) as any[];
  return applyFilters(entries, filters);
}

/** Get all directory entries from both collections (for getStaticPaths and slug lookup) */
export async function getDirectoryEntries(filters?: {
  tipo?: string;
  especialidad?: string;
  ubicacion?: string;
  lang?: string;
}) {
  const [consultores, software] = await Promise.all([
    getConsultoresEntries(filters),
    getSoftwareEntries(filters),
  ]);
  return [...consultores, ...software];
}
