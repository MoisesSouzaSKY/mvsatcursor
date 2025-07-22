const { onCall } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

exports.validateEmployeeLogin = onCall(async (request) => {
  try {
    const { login, password } = request.data;

    console.log('🔄 Validando login de funcionário:', { login });

    if (!login || !password) {
      console.log('❌ Login ou senha vazios');
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
      console.log('❌ Funcionário não encontrado:', login);
      return {
        success: false,
        error: 'Funcionário não encontrado'
      };
    }

    const funcionarioDoc = funcionariosQuery.docs[0];
    const funcionario = funcionarioDoc.data();

    console.log('✅ Funcionário encontrado:', funcionario.nome);

    // Verificar se o funcionário está ativo
    if (!funcionario.ativo_sistema) {
      console.log('❌ Funcionário inativo:', funcionario.nome);
      return {
        success: false,
        error: 'Funcionário inativo'
      };
    }

    // Validar senha (em produção, use hash de senha)
    if (funcionario.senha_sistema !== password) {
      console.log('❌ Senha incorreta para:', funcionario.nome);
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

    console.log('📋 Permissões carregadas:', permissions.length);

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

    console.log('✅ Login validado com sucesso:', funcionario.nome);

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
    console.error('💥 Erro na validação do funcionário:', error);
    return {
      success: false,
      error: 'Erro interno do servidor'
    };
  }
}); 