// Firebase Auth — client-side authentication
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as fbSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { app } from './firebase';

export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export async function signUp(email: string, password: string, nombre: string) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  // Store id token in cookie for server-side verification
  const token = await cred.user.getIdToken();
  document.cookie = `asetemyt_token=${token}; path=/; max-age=3600; SameSite=Lax`;
  // Register user profile in Firestore via API
  await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre, email }),
  });
  return cred.user;
}

export async function signIn(email: string, password: string) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const token = await cred.user.getIdToken();
  document.cookie = `asetemyt_token=${token}; path=/; max-age=3600; SameSite=Lax`;
  return cred.user;
}

export async function signInGoogle() {
  const cred = await signInWithPopup(auth, googleProvider);
  const token = await cred.user.getIdToken();
  document.cookie = `asetemyt_token=${token}; path=/; max-age=3600; SameSite=Lax`;
  // Ensure user exists in Firestore
  await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre: cred.user.displayName || '', email: cred.user.email }),
  });
  return cred.user;
}

export async function logOut() {
  await fbSignOut(auth);
  document.cookie = 'asetemyt_token=; path=/; max-age=0';
}

// Authenticated fetch helper — adds Bearer token automatically
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const user = auth.currentUser;
  if (!user) throw new Error('No authenticated user');
  const token = await user.getIdToken();
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${token}`);
  return fetch(url, { ...options, headers });
}

export { onAuthStateChanged };
export type { User };
