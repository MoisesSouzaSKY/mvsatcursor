#!/usr/bin/env node

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyA05L49pEVcTaFe-iLk5zE83SodWIbMwbg",
  authDomain: "mvsat-428a2.firebaseapp.com",
  projectId: "mvsat-428a2",
  storageBucket: "mvsat-428a2.firebasestorage.app",
  messagingSenderId: "579366535660",
  appId: "1:579366535660:web:2f9f3baf31f3dd49bdc0c9",
  measurementId: "G-DY85L9MHV9"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function verificarClientes() {
  try {
    console.log('🔍 Verificando todos os clientes...');
    
    const clientesSnap = await getDocs(collection(db, 'clientes'));
    const clientes = [];
    
    clientesSnap.forEach((doc) => {
      const data = doc.data();
      clientes.push({
        id: doc.id,
        nome: data.nome || data.nomeCompleto || 'Sem nome',
        telefone: data.telefone || data.telefones || 'Sem telefone'
      });
    });
    
    console.log(`✅ Total de clientes: ${clientes.length}`);
    console.log('');
    
    // Procurar por clientes que contenham "Eros" ou "Martins"
    const clientesEros = clientes.filter(c => 
      c.nome.toLowerCase().includes('eros') || 
      c.nome.toLowerCase().includes('martins')
    );
    
    if (clientesEros.length > 0) {
      console.log('🔍 Clientes encontrados com "Eros" ou "Martins":');
      clientesEros.forEach(c => {
        console.log(`   - ${c.nome}: ${c.telefone}`);
      });
    } else {
      console.log('ℹ️ Nenhum cliente encontrado com "Eros" ou "Martins"');
    }
    
    console.log('');
    console.log('📋 Primeiros 20 clientes:');
    clientes.slice(0, 20).forEach((c, i) => {
      console.log(`   ${i + 1}. ${c.nome}: ${c.telefone}`);
    });
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

verificarClientes();
