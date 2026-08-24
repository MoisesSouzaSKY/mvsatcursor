# 🔧 SOLUÇÃO: Problema de Permissões para Gerentes e Admins

## 🚨 Problema Identificado
Os usuários com cargos de **gerente** e **admin** não conseguem:
- ✅ Editar e salvar clientes
- ✅ Gerenciar TV Box
- ✅ Realizar operações de escrita no sistema

## 🔍 Causas Possíveis
1. **Regras de segurança do Firestore** muito restritivas
2. **Claims de usuário** não configurados corretamente
3. **Permissões específicas** não definidas na coleção `employee_permissions`
4. **Configuração de roles** incorreta no Firebase Auth

## ✅ Solução Passo a Passo

### 1. Atualizar as Regras de Segurança do Firestore

#### A) Acessar o Console do Firebase
1. Abra: https://console.firebase.google.com/
2. Faça login com sua conta Google
3. Selecione o projeto **`mvsat-428a2`**

#### B) Atualizar as Regras do Firestore
1. No Console do Firebase, vá para **"Firestore Database"**
2. Clique na aba **"Regras"**
3. **Substitua** as regras existentes pelas seguintes:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Função para verificar se o usuário está autenticado
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Função para verificar se o usuário é admin
    function isAdmin() {
      return isAuthenticated() && 
             (request.auth.token.role == 'admin' || 
              request.auth.token.admin == true);
    }
    
    // Função para verificar se o usuário é gerente
    function isGerente() {
      return isAuthenticated() && 
             (request.auth.token.role == 'gerente' || 
              request.auth.token.gerente == true);
    }
    
    // Função para verificar se o usuário é admin ou gerente
    function isAdminOrGerente() {
      return isAdmin() || isGerente();
    }
    
    // Função para verificar se o usuário é financeiro
    function isFinanceiro() {
      return isAuthenticated() && 
             (request.auth.token.role == 'financeiro' || 
              request.auth.token.financeiro == true);
    }
    
    // Função para verificar se o usuário é atendimento
    function isAtendimento() {
      return isAuthenticated() && 
             (request.auth.token.role == 'atendimento' || 
              request.auth.token.atendimento == true);
    }

    // Regras para coleção de clientes
    match /clientes/{clienteId} {
      allow read: if isAuthenticated();
      allow create: if isAdminOrGerente() || isAtendimento();
      allow update: if isAdminOrGerente() || isAtendimento();
      allow delete: if isAdminOrGerente();
    }

    // Regras para coleção de TV Box
    match /tvbox/{tvboxId} {
      allow read: if isAuthenticated();
      allow create: if isAdminOrGerente() || isAtendimento();
      allow update: if isAdminOrGerente() || isAtendimento();
      allow delete: if isAdminOrGerente();
    }

    // Regras para outras coleções importantes
    match /assinaturas/{assinaturaId} {
      allow read: if isAuthenticated();
      allow create: if isAdminOrGerente() || isAtendimento();
      allow update: if isAdminOrGerente() || isAtendimento();
      allow delete: if isAdminOrGerente();
    }

    match /equipamentos/{equipamentoId} {
      allow read: if isAuthenticated();
      allow create: if isAdminOrGerente() || isAtendimento();
      allow update: if isAdminOrGerente() || isAtendimento();
      allow delete: if isAdminOrGerente();
    }

    // Regras para outras coleções
    match /{document=**} {
      allow read: if isAuthenticated();
      allow write: if isAdminOrGerente();
    }
  }
}
```

4. Clique em **"Publicar"** para salvar as regras

### 2. Configurar as Permissões dos Usuários

#### A) Executar o Script de Configuração
1. Abra o terminal na pasta `mvsat`
2. Execute o script de configuração:

```bash
node scripts/configurar-permissoes-usuarios.cjs
```

**⚠️ IMPORTANTE**: Antes de executar, edite o arquivo e substitua:
- `admin@mvsat.com` pelo email real do admin
- `senha123` pela senha real do admin

#### B) Verificar se os Usuários Existem
O script irá configurar automaticamente as permissões para:
- **Gerentes**: Acesso completo (exceto configurações de funcionários)
- **Admins**: Acesso completo a todo o sistema
- **Atendimento**: Acesso a clientes, TV Box, assinaturas e equipamentos
- **Financeiro**: Acesso a cobranças e despesas

### 3. Verificar os Claims dos Usuários

#### A) Executar o Script de Teste
1. Execute o script de teste de permissões:

```bash
node scripts/testar-permissoes.cjs
```

**⚠️ IMPORTANTE**: Antes de executar, edite o arquivo e substitua:
- `gerente@mvsat.com` pelo email real do gerente
- `admin@mvsat.com` pelo email real do admin
- `senha123` pelas senhas reais

#### B) Verificar o Output
O script deve mostrar:
- ✅ Login realizado com sucesso
- 📋 Claims do token com o role correto
- ✅ Acesso às coleções funcionando
- ✅ Operações de escrita funcionando

### 4. Configurar Claims Customizados (se necessário)

#### A) Acessar o Console do Firebase
1. No Console do Firebase, vá para **"Authentication"**
2. Clique na aba **"Users"**
3. Encontre o usuário gerente/admin
4. Clique nos **3 pontos** → **"Manage custom claims"**

#### B) Adicionar Claims
Para **gerente**:
```json
{
  "role": "gerente"
}
```

Para **admin**:
```json
{
  "role": "admin"
}
```

### 5. Testar o Sistema

#### A) Fazer Login como Gerente/Admin
1. Acesse o sistema com usuário gerente ou admin
2. Tente editar um cliente
3. Tente salvar as alterações
4. Verifique se não há erros no console

#### B) Verificar Funcionalidades
- ✅ Edição de clientes funcionando
- ✅ Gerenciamento de TV Box funcionando
- ✅ Criação de assinaturas funcionando
- ✅ Todas as operações de escrita funcionando

## 🎯 Resultado Esperado
Após seguir estes passos:
- **Gerentes** devem conseguir editar e salvar clientes
- **Admins** devem ter acesso completo ao sistema
- **TV Box** deve funcionar corretamente
- **Todas as operações** de escrita devem funcionar

## 🔧 Troubleshooting

### ❌ Erro: "Permissão negada"
- Verifique se as regras do Firestore foram atualizadas
- Confirme se o usuário tem o role correto
- Verifique se as permissões específicas foram configuradas

### ❌ Erro: "Claims não encontrados"
- Execute o script de configuração de permissões
- Verifique se os claims customizados estão configurados
- Confirme se o usuário existe na coleção `employees`

### ❌ Erro: "Coleção não encontrada"
- Verifique se as coleções existem no Firestore
- Confirme se as regras permitem acesso às coleções
- Teste com regras temporárias se necessário

## 📞 Suporte
Se o problema persistir:
1. Execute os scripts de teste e configuração
2. Verifique o console do navegador para erros
3. Confirme se as regras do Firestore foram atualizadas
4. Verifique se os usuários têm os roles corretos

## 📋 Arquivos Criados/Modificados
- `firestore.rules` - Regras de segurança atualizadas
- `scripts/testar-permissoes.cjs` - Script de teste
- `scripts/configurar-permissoes-usuarios.cjs` - Script de configuração
- `SOLUCAO-PERMISSOES-GERENTE-ADMIN.md` - Este arquivo de instruções
