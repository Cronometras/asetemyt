// Firebase configuration for asetemyt.com
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  getDoc,
  doc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.PUBLIC_FIREBASE_API_KEY || 'AIzaSyCWrnHpOz_2-BSL8vPQDxmYRD_sAlZuiDs',
  authDomain: import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN || 'micaot-com.firebaseapp.com',
  projectId: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID || 'micaot-com',
  storageBucket: import.meta.env.PUBLIC_FIREBASE_STORAGE_BUCKET || 'micaot-com.firebasestorage.app',
  messagingSenderId: import.meta.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '948469680704',
  appId: import.meta.env.PUBLIC_FIREBASE_APP_ID || '1:948469680704:web:a9161fb82acd6766ee6da5',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

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
    freelancers: 'Freelancers',
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
    directoryDesc: 'Consultores, empresas y freelancers especializados en ingeniería de métodos y tiempos.',
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
    freelancer: 'Freelancer',
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
    freelancers: 'Freelancers',
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
    directoryDesc: 'Consultants, companies and freelancers specialized in methods and time engineering.',
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
    freelancer: 'Freelancer',
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

// --- Articles ---

export async function getArticles(maxResults = 50, lang?: string) {
  let qRef: any = query(
    collection(db, 'articulos_asetemyt'),
    where('status', '==', 'published'),
    orderBy('publishedAt', 'desc'),
    limit(maxResults)
  );
  const snapshot = await getDocs(qRef);
  let articles = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
  if (lang) {
    articles = articles.filter((a) => !a.lang || a.lang === lang);
  }
  return articles;
}

export async function getArticleBySlug(slug: string) {
  const q = query(
    collection(db, 'articulos_asetemyt'),
    where('slug', '==', slug),
    where('status', '==', 'published'),
    limit(1)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const d = snapshot.docs[0];
  return { id: d.id, ...d.data() } as any;
}

// --- Directory ---

export async function getDirectoryEntries(filters?: {
  tipo?: string;
  especialidad?: string;
  ubicacion?: string;
  lang?: string;
}) {
  const snapshot = await getDocs(
    query(collection(db, 'directorio_asetemyt'), orderBy('createdAt', 'desc'))
  );
  let entries = snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() })) as any[];

  if (filters?.tipo) {
    entries = entries.filter((e) => e.tipo === filters.tipo);
  }
  if (filters?.especialidad) {
    entries = entries.filter((e) =>
      e.especialidades?.some(
        (es: string) => es.toLowerCase() === filters.especialidad!.toLowerCase()
      )
    );
  }
  if (filters?.ubicacion) {
    const loc = filters.ubicacion.toLowerCase();
    entries = entries.filter(
      (e) =>
        e.ubicacion?.pais?.toLowerCase().includes(loc) ||
        e.ubicacion?.ciudad?.toLowerCase().includes(loc)
    );
  }
  if (filters?.lang) {
    entries = entries.filter((e) => !e.lang || e.lang === filters.lang);
  }
  return entries;
}

export async function getDirectoryStats() {
  const snapshot = await getDocs(collection(db, 'directorio_asetemyt'));
  const entries = snapshot.docs.map((d) => d.data());
  return {
    total: entries.length,
    empresas: entries.filter((e) => e.tipo === 'empresa').length,
    consultores: entries.filter((e) => e.tipo === 'consultor').length,
    freelancers: entries.filter((e) => e.tipo === 'freelance').length,
  };
}

export async function getDirectoryEntryBySlug(slug: string) {
  const qRef = query(
    collection(db, 'directorio_asetemyt'),
    where('slug', '==', slug),
    limit(1)
  );
  const snapshot = await getDocs(qRef);
  if (snapshot.empty) return null;
  const d = snapshot.docs[0];
  return { id: d.id, ...d.data() } as any;
}

export async function addDirectoryEntry(data: any) {
  return addDoc(collection(db, 'directorio_asetemyt'), {
    ...data,
    createdAt: new Date(),
    verificado: false,
  });
}
