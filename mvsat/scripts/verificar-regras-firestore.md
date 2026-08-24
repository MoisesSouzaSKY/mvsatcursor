# 🔧 Verificação e Configuração das Regras do Firestore

## 🚨 Problema Identificado
O script de teste não consegue fazer login devido ao erro:
```
Firebase: Error (auth/requests-from-referer-<empty>-are-blocked.)
```

## ✅ Solução Manual

### 1. Acessar o Console do Firebase
1. Abra: https://console.firebase.google.com/
2. Faça login com sua conta Google
3. Selecione o projeto **`mvsat-428a2`**

### 2. Verificar as Regras Atuais
1. No Console do Firebase, vá para **"Firestore Database"**
2. Clique na aba **"Regras"**
3. **Copie** as regras atuais para um arquivo de backup

### 3. Atualizar as Regras
**Substitua** as regras existentes pelas seguintes:

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

    // Regras para coleção de assinaturas
    match /assinaturas/{assinaturaId} {
      allow read: if isAuthenticated();
      allow create: if isAdminOrGerente() || isAtendimento();
      allow update: if isAdminOrGerente() || isAtendimento();
      allow delete: if isAdminOrGerente();
    }

    // Regras para coleção de equipamentos
    match /equipamentos/{equipamentoId} {
      allow read: if isAuthenticated();
      allow create: if isAdminOrGerente() || isAtendimento();
      allow update: if isAdminOrGerente() || isAtendimento();
      allow delete: if isAdminOrGerente();
    }

    // Regras para coleção de funcionários
    match /employees/{employeeId} {
      allow read: if isAuthenticated();
      allow create: if isAdmin();
      allow update: if isAdmin();
      allow delete: if isAdmin();
    }

    // Regras para permissões de funcionários
    match /employee_permissions/{permissionId} {
      allow read: if isAuthenticated();
      allow create: if isAdmin();
      allow update: if isAdmin();
      allow delete: if isAdmin();
    }

    // Regras para coleção de cobranças
    match /cobrancas/{cobrancaId} {
      allow read: if isAuthenticated();
      allow create: if isAdminOrGerente() || isFinanceiro();
      allow update: if isAdminOrGerente() || isFinanceiro();
      allow delete: if isAdminOrGerente();
    }

    // Regras para coleção de despesas
    match /despesas/{despesaId} {
      allow read: if isAuthenticated();
      allow create: if isAdminOrGerente() || isFinanceiro();
      allow update: if isAdminOrGerente() || isFinanceiro();
      allow delete: if isAdminOrGerente();
    }

    // Regras para outras coleções (fallback)
    match /{document=**} {
      allow read: if isAuthenticated();
      allow write: if isAdminOrGerente();
    }
  }
}
```

### 4. Publicar as Regras
1. Clique em **"Publicar"** para salvar as regras
2. Aguarde a confirmação de publicação

### 5. Verificar Claims dos Usuários
1. No Console do Firebase, vá para **"Authentication"**
2. Clique na aba **"Users"**
3. Encontre os usuários gerente e admin
4. Para cada um, clique nos **3 pontos** → **"Manage custom claims"**

#### Claims para Gerente:
```json
{
  "role": "gerente"
}
```

#### Claims para Admin:
```json
{
  "role": "admin"
}
```

### 6. Testar no Sistema
1. Acesse o sistema MV SAT
2. Faça login como gerente ou admin
3. Tente editar um cliente
4. Tente salvar as alterações
5. Verifique se não há erros de permissão

## 🔧 Regras Temporárias (se necessário)
Se ainda houver problemas, use estas regras temporárias para teste:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**⚠️ ATENÇÃO**: Estas regras permitem acesso total a usuários autenticados. Use apenas para teste!

## 📋 Próximos Passos
Após configurar as regras:
1. Teste o sistema com usuários gerente e admin
2. Verifique se as operações de escrita funcionam
3. Se funcionar, mantenha as regras de produção
4. Se não funcionar, use as regras temporárias e investigue mais

## 🎯 Resultado Esperado
- Gerentes conseguem editar e salvar clientes
- Admins têm acesso completo ao sistema
- TV Box funciona corretamente
- Todas as operações de escrita funcionam
