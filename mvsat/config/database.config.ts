import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { firebaseConfig as localFirebaseConfig } from './environment';

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
let storageInstance: FirebaseStorage | null = null;

function ensureInitializedSync(): void {
  if (!app) {
    try {
      const existing = getApps().length ? getApps()[0] : null;
      app = existing ?? initializeApp(localFirebaseConfig);
    } catch (_) {
      app = initializeApp(localFirebaseConfig);
    }
  }
  if (!authInstance && app) {
    authInstance = getAuth(app);
  }
  if (!dbInstance && app) {
    dbInstance = getFirestore(app);
  }
  if (!storageInstance && app) {
    storageInstance = getStorage(app);
  }
}

export async function initFirebase(): Promise<void> {
  if (getApps().length) {
    app = getApps()[0];
  } else {
    let config = localFirebaseConfig;
    try {
      if (typeof window !== 'undefined') {
        const isHosting = /\.web\.app$|\.firebaseapp\.com$/i.test(window.location.host);
        if (isHosting) {
          // Evitar travar o app por fetch lento/pendurado
          const controller = new AbortController();
          const timer = window.setTimeout(() => controller.abort(), 3500);
          const res = await fetch('/__/firebase/init.json', { signal: controller.signal });
          window.clearTimeout(timer);
          if (res.ok) {
            config = await res.json();
          }
        }
      }
    } catch (_) {}
    app = initializeApp(config);
  }

  authInstance = getAuth(app!);
  // IMPORTANTE: não inicializar Firestore/Storage aqui para não travar a renderização.
  // Esses serviços serão inicializados sob demanda em `getDb()` / `getStorageInstance()`.
}

export function getApp(): FirebaseApp {
  if (!app) throw new Error('Firebase não inicializado');
  return app;
}

export function getAuthInstance(): Auth {
  if (!authInstance) ensureInitializedSync();
  return authInstance;
}

export function getDb(): Firestore {
  if (!dbInstance) {
    ensureInitializedSync();
  }
  if (!dbInstance && app) {
    dbInstance = getFirestore(app);
  }
  if (!dbInstance) {
    // fallback final
    app = initializeApp(localFirebaseConfig);
    authInstance = getAuth(app);
    dbInstance = getFirestore(app);
    storageInstance = getStorage(app);
  }
  return dbInstance!;
}

export function getStorageInstance(): FirebaseStorage {
  if (!storageInstance) ensureInitializedSync();
  return storageInstance!;
}


