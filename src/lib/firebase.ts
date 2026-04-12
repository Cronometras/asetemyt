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
  apiKey: import.meta.env.FIREBASE_API_KEY || 'AIzaSyCmKlPNxiRgBhB5q3PUJ42Y3H6Q7nuiDs',
  authDomain: import.meta.env.FIREBASE_AUTH_DOMAIN || 'micaot-com.firebaseapp.com',
  projectId: import.meta.env.FIREBASE_PROJECT_ID || 'micaot-com',
  storageBucket: import.meta.env.FIREBASE_STORAGE_BUCKET || 'micaot-com.firebasestorage.app',
  messagingSenderId: import.meta.env.FIREBASE_MESSAGING_SENDER_ID || '948469680704',
  appId: import.meta.env.FIREBASE_APP_ID || '1:948469680704:web:a9161fb82acd6766ee6da5',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// --- Articles ---

export async function getArticles(maxResults = 50) {
  const q = query(
    collection(db, 'articulos_asetemyt'),
    where('status', '==', 'published'),
    orderBy('publishedAt', 'desc'),
    limit(maxResults)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
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
}) {
  let qRef: any = query(
    collection(db, 'directorio_asetemyt'),
    orderBy('createdAt', 'desc')
  );

  // Note: Firestore compound queries require composite indexes.
  // For client-side filtering with multiple optional filters, we fetch all and filter.
  const snapshot = await getDocs(qRef);
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

  return entries;
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
