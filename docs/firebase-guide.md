# Guía de Referencia Firebase para Astro

## Configuración Cliente
```typescript
// src/lib/firebase.ts
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc, addDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSy...uiDs",
  authDomain: "micaot-com.firebaseapp.com",
  projectId: "micaot-com",
  storageBucket: "micaot-com.firebasestorage.app",
  messagingSenderId: "948469680704",
  appId: "1:948469680704:web:a9161fb82acd6766ee6da5"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
```

## Collections Existentes
- articulos_cronometras → Blog Cronometras
- articulos_fichadas → Blog Induly  
- articulos_blog_muestreo → Blog Worksamp
- articulos_asetemyt → NUEVA: Blog Asetemyt
- directorio_asetemyt → NUEVA: Directorio

## Patrones de Lectura
```typescript
// Obtener todos los artículos publicados
const q = query(
  collection(db, 'articulos_asetemyt'),
  where('status', '==', 'published'),
  orderBy('publishedAt', 'desc')
);
const snapshot = await getDocs(q);
const articles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
```

## Service Account (solo para scripts Node)
Ruta: ~/projects/articulos-IA---a-Firestore/backup/firebase-service-account.json
