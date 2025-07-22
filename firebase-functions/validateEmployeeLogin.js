// Firebase Cloud Function para validar login de funcionários
// Esta função deve ser implementada no Firebase Functions
// Execute: firebase deploy --only functions

const { onCall } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

exports.validateEmployeeLogin = onCall(async (request) => {
  try {
    const { login, password } = request.data;

    if (!login || !password) {
      return {
        success: false,
        error: 'Login e senha são obrigatórios'
      };
    }

    // Buscar funcionário por login_sistema
    const funcionariosQuery = await db
      .collection('funcionarios')
      .where('login_sistema', '==', login)
      .limit(1)
      .get();

    if (funcionariosQuery.empty) {
      return {
        success: false,
        error: 'Funcionário não encontrado'
      };
    }

    const funcionarioDoc = funcionariosQuery.docs[0];
    const funcionario = funcionarioDoc.data();

    // Verificar se o funcionário está ativo
    if (!funcionario.ativo_sistema) {
      return {
        success: false,
        error: 'Funcionário inativo'
      };
    }

    // Validar senha (você deve implementar hash de senha em produção)
    if (funcionario.senha_sistema !== password) {
      return {
        success: false,
        error: 'Senha incorreta'
      };
    }

    // Buscar permissões do funcionário
    const permissoesQuery = await db
      .collection('funcionario_permissoes')
      .where('funcionario_id', '==', funcionarioDoc.id)
      .where('ativo', '==', true)
      .get();

    const permissions = [];
    permissoesQuery.forEach(doc => {
      const permissao = doc.data();
      permissions.push(`${permissao.modulo}:${permissao.permissao}`);
    });

    // Registrar log de acesso
    await db.collection('funcionario_logs').add({
      funcionario_id: funcionarioDoc.id,
      acao: 'login',
      tabela_afetada: null,
      registro_id: null,
      detalhes: { login_sistema: login },
      ip_address: request.rawRequest?.connection?.remoteAddress || null,
      user_agent: request.rawRequest?.headers['user-agent'] || null,
      user_id: funcionario.user_id,
      created_at: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      success: true,
      employee: {
        id: funcionarioDoc.id,
        name: funcionario.nome,
        email: funcionario.email || '',
        isAdmin: funcionario.is_admin || false,
        permissions: permissions,
        ownerId: funcionario.user_id
      }
    };

  } catch (error) {
    console.error('Erro na validação do funcionário:', error);
    return {
      success: false,
      error: 'Erro interno do servidor'
    };
  }
});

/* 
INSTRUÇÕES DE DEPLOY:

1. Instale o Firebase CLI: npm install -g firebase-tools
2. Faça login: firebase login
3. Inicialize o projeto: firebase init functions
4. Copie este arquivo para functions/src/index.js
5. Deploy: firebase deploy --only functions

Estrutura mínima do package.json para functions:
{
  "name": "functions",
  "description": "Cloud Functions for Firebase",
  "engines": {
    "node": "18"
  },
  "main": "index.js",
  "dependencies": {
    "firebase-admin": "^11.8.0",
    "firebase-functions": "^4.3.1"
  }
}
*/ 