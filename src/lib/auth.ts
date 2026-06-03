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

// Lazy auth — getAuth(app) is deferred to first property access.
// This prevents auth/invalid-api-key crashes on Cloudflare Pages
// where PUBLIC_FIREBASE_* env vars aren't inlined at build time.
// If Firebase Auth is unavailable (missing env vars), returns a stub
// so pages don't crash — they just show "login required" state.
let _auth: any = null;
let _authFailed = false;

function getAuthLazy(): ReturnType<typeof getAuth> {
  if (_auth) return _auth;
  if (_authFailed) return _auth!;
  try {
    _auth = getAuth(app);
  } catch (e) {
    console.warn('[ASETEMYT] Firebase Auth unavailable (missing env vars?):', e);
    _authFailed = true;
    // Stub that prevents crashes — fires callback with null (no user)
    // so pages show "login required" instead of spinning forever
    _auth = {
      currentUser: null,
      onAuthStateChanged: (cb: any) => { cb(null); return () => {}; },
      authStateReady: async () => {},
      signOut: async () => {},
      _isStub: true,
    } as any;
  }
  return _auth;
}

// Proxy delegates all property access to the lazy-initialized instance
export const auth = new Proxy({} as ReturnType<typeof getAuth>, {
  get(_target, prop, _receiver) {
    return Reflect.get(getAuthLazy(), prop, getAuthLazy());
  },
});

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
  try {
    await fbSignOut(auth);
  } catch {
    // Firebase unavailable — just clear the cookie
  }
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
