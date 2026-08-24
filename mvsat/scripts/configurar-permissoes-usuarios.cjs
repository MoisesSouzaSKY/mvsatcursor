const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, collection, doc, setDoc, getDocs, query, where } = require('firebase/firestore');

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyA05L49pEVcTaFe-iLk5zE83SodWIbMwbg",
  authDomain: "mvsat-428a2.firebaseapp.com",
  projectId: "mvsat-428a2",
  storageBucket: "mvsat-428a2.firebasestorage.app",
  messagingSenderId: "579366535660",
  appId: "1:579366535660:web:2f9f3baf31f3dd49bdc0c9",
  measurementId: "G-DY85L9MHV9"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function configurarPermissoesUsuarios() {
  try {
    console.log('🔧 Configurando permissões dos usuários...\n');

    // Login como admin para configurar permissões
    console.log('1️⃣ Fazendo login como admin...');
    const adminEmail = 'admin@mvsat.com'; // Substitua pelo email real do admin
    const adminSenha = 'senha123'; // Substitua pela senha real do admin
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, adminEmail, adminSenha);
      const adminUser = userCredential.user;
      console.log('✅ Login como admin realizado com sucesso');
      
      // Configurar permissões para gerentes
      console.log('\n2️⃣ Configurando permissões para gerentes...');
      
      // Buscar funcionários com cargo de gerente
      const gerentesQuery = query(collection(db, 'employees'), where('cargo', '==', 'gerente'));
      const gerentesSnap = await getDocs(gerentesQuery);
      
      if (!gerentesSnap.empty) {
        for (const gerenteDoc of gerentesSnap.docs) {
          const gerenteData = gerenteDoc.data();
          console.log(`👤 Configurando gerente: ${gerenteData.nome || gerenteData.email}`);
          
          // Configurar permissões específicas para gerente
          const permissoesGerente = {
            permissions: {
              clientes: {
                view: true,
                create: true,
                update: true,
                delete: true
              },
              tvbox: {
                view: true,
                create: true,
                update: true,
                delete: true
              },
              assinaturas: {
                view: true,
                create: true,
                update: true,
                delete: true
              },
              equipamentos: {
                view: true,
                create: true,
                update: true,
                delete: true
              },
              cobrancas: {
                view: true,
                create: true,
                update: true,
                delete: true
              },
              despesas: {
                view: true,
                create: true,
                update: true,
                delete: true
              },
              dashboard: {
                view: true
              },
              funcionarios: {
                view: true,
                create: false,
                update: false,
                delete: false,
                manage_settings: false
              }
            },
            lastUpdated: new Date(),
            updatedBy: adminUser.email
          };
          
          await setDoc(doc(db, 'employee_permissions', gerenteDoc.id), permissoesGerente);
          console.log(`✅ Permissões configuradas para ${gerenteData.nome || gerenteData.email}`);
        }
      } else {
        console.log('⚠️ Nenhum gerente encontrado na coleção employees');
      }
      
      // Configurar permissões para admins
      console.log('\n3️⃣ Configurando permissões para admins...');
      
      const adminsQuery = query(collection(db, 'employees'), where('cargo', '==', 'admin'));
      const adminsSnap = await getDocs(adminsQuery);
      
      if (!adminsSnap.empty) {
        for (const adminDoc of adminsSnap.docs) {
          const adminData = adminDoc.data();
          console.log(`👤 Configurando admin: ${adminData.nome || adminData.email}`);
          
          // Configurar permissões completas para admin
          const permissoesAdmin = {
            permissions: {
              clientes: {
                view: true,
                create: true,
                update: true,
                delete: true
              },
              tvbox: {
                view: true,
                create: true,
                update: true,
                delete: true
              },
              assinaturas: {
                view: true,
                create: true,
                update: true,
                delete: true
              },
              equipamentos: {
                view: true,
                create: true,
                update: true,
                delete: true
              },
              cobrancas: {
                view: true,
                create: true,
                update: true,
                delete: true
              },
              despesas: {
                view: true,
                create: true,
                update: true,
                delete: true
              },
              dashboard: {
                view: true
              },
              funcionarios: {
                view: true,
                create: true,
                update: true,
                delete: true,
                manage_settings: true
              }
            },
            lastUpdated: new Date(),
            updatedBy: adminUser.email
          };
          
          await setDoc(doc(db, 'employee_permissions', adminDoc.id), permissoesAdmin);
          console.log(`✅ Permissões configuradas para ${adminData.nome || adminData.email}`);
        }
      } else {
        console.log('⚠️ Nenhum admin encontrado na coleção employees');
      }
      
      // Configurar permissões para atendimento
      console.log('\n4️⃣ Configurando permissões para atendimento...');
      
      const atendimentoQuery = query(collection(db, 'employees'), where('cargo', '==', 'atendimento'));
      const atendimentoSnap = await getDocs(atendimentoQuery);
      
      if (!atendimentoSnap.empty) {
        for (const atendimentoDoc of atendimentoSnap.docs) {
          const atendimentoData = atendimentoDoc.data();
          console.log(`👤 Configurando atendimento: ${atendimentoData.nome || atendimentoData.email}`);
          
          // Configurar permissões para atendimento
          const permissoesAtendimento = {
            permissions: {
              clientes: {
                view: true,
                create: true,
                update: true,
                delete: false
              },
              tvbox: {
                view: true,
                create: true,
                update: true,
                delete: false
              },
              assinaturas: {
                view: true,
                create: true,
                update: true,
                delete: false
              },
              equipamentos: {
                view: true,
                create: true,
                update: true,
                delete: false
              },
              dashboard: {
                view: true
              }
            },
            lastUpdated: new Date(),
            updatedBy: adminUser.email
          };
          
          await setDoc(doc(db, 'employee_permissions', atendimentoDoc.id), permissoesAtendimento);
          console.log(`✅ Permissões configuradas para ${atendimentoData.nome || atendimentoData.email}`);
        }
      } else {
        console.log('⚠️ Nenhum funcionário de atendimento encontrado na coleção employees');
      }
      
      // Configurar permissões para financeiro
      console.log('\n5️⃣ Configurando permissões para financeiro...');
      
      const financeiroQuery = query(collection(db, 'employees'), where('cargo', '==', 'financeiro'));
      const financeiroSnap = await getDocs(financeiroQuery);
      
      if (!financeiroSnap.empty) {
        for (const financeiroDoc of financeiroSnap.docs) {
          const financeiroData = financeiroDoc.data();
          console.log(`👤 Configurando financeiro: ${financeiroData.nome || financeiroData.email}`);
          
          // Configurar permissões para financeiro
          const permissoesFinanceiro = {
            permissions: {
              cobrancas: {
                view: true,
                create: true,
                update: true,
                delete: false
              },
              despesas: {
                view: true,
                create: true,
                update: true,
                delete: false
              },
              dashboard: {
                view: true
              }
            },
            lastUpdated: new Date(),
            updatedBy: adminUser.email
          };
          
          await setDoc(doc(db, 'employee_permissions', financeiroDoc.id), permissoesFinanceiro);
          console.log(`✅ Permissões configuradas para ${financeiroData.nome || financeiroData.email}`);
        }
      } else {
        console.log('⚠️ Nenhum funcionário financeiro encontrado na coleção employees');
      }
      
      console.log('\n🎯 Configuração de permissões concluída com sucesso!');
      console.log('\n📋 Resumo das permissões configuradas:');
      console.log('   • Gerentes: Acesso completo (exceto configurações de funcionários)');
      console.log('   • Admins: Acesso completo a todo o sistema');
      console.log('   • Atendimento: Acesso a clientes, TV Box, assinaturas e equipamentos');
      console.log('   • Financeiro: Acesso a cobranças e despesas');
      
    } catch (error) {
      console.log('❌ Erro no login como admin:', error.message);
      console.log('   Verifique se o email e senha do admin estão corretos');
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar configuração
configurarPermissoesUsuarios();
