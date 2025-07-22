import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCB6v3uBgyDGnHWt2Pda-qVkOpWdFkKwvk",
  authDomain: "mvsatimportado.firebaseapp.com",
  projectId: "mvsatimportado",
  storageBucket: "mvsatimportado.appspot.com", // Corrigido!
  messagingSenderId: "486956839447",
  appId: "1:486956839447:web:8183bc6455d920b9982252",
  measurementId: "G-NJM6D3266X"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Exportar os serviços
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

export default app; 