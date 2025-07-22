# 👑 Criação de Usuário Administrador

Este documento explica como criar um usuário administrador para o sistema MV SAT usando o Firebase Authentication.

## 📋 Dados do Usuário

- **Email**: moisestimesky@gmail.com
- **Senha**: B12e57D8@
- **Nome**: Administrador
- **Função**: Admin

## 🔧 Método 1: Usando o Console do Firebase

### 1. Acesse o Console do Firebase
- Vá para [https://console.firebase.google.com/project/mvsatimportado](https://console.firebase.google.com/project/mvsatimportado)
- Faça login com sua conta Google

### 2. Navegue até Authentication
- No menu lateral, clique em "Authentication"
- Clique na aba "Users"

### 3. Adicione um novo usuário
- Clique no botão "Add User" ou "Adicionar usuário"
- Preencha o email: `moisestimesky@gmail.com`
- Preencha a senha: `B12e57D8@`
- Clique em "Add User" ou "Adicionar usuário"

### 4. Configure as claims de administrador (opcional)
- Para definir o usuário como administrador, você precisará usar o Firebase Admin SDK ou Cloud Functions
- Isso pode ser feito usando o método 2 abaixo

### 5. Crie um documento de perfil no Firestore
- No menu lateral, clique em "Firestore Database"
- Crie uma coleção chamada "profiles" se ainda não existir
- Adicione um documento com o ID igual ao UID do usuário criado
- Adicione os seguintes campos:
  ```
  email: "moisestimesky@gmail.com"
  displayName: "Administrador"
  isAdmin: true
  createdAt: (timestamp atual)
  updatedAt: (timestamp atual)
  ```

## 🛠️ Método 2: Usando o Script Node.js

### 1. Obtenha as credenciais de serviço
- Acesse [https://console.firebase.google.com/project/mvsatimportado/settings/serviceaccounts/adminsdk](https://console.firebase.google.com/project/mvsatimportado/settings/serviceaccounts/adminsdk)
- Clique em "Gerar nova chave privada"
- Salve o arquivo JSON como `service-account.json` na raiz do projeto

### 2. Instale as dependências
```bash
npm install firebase-admin
```

### 3. Execute o script
```bash
node create-admin-user.js
```

### 4. Verifique o resultado
- O script criará o usuário com as permissões de administrador
- Também mostrará instruções para criar o documento de perfil no Firestore

## ✅ Verificação

Para verificar se o usuário administrador foi criado corretamente:

1. Tente fazer login no aplicativo usando as credenciais:
   - Email: moisestimesky@gmail.com
   - Senha: B12e57D8@

2. Verifique no Console do Firebase:
   - Acesse a seção Authentication > Users
   - Confirme que o usuário está listado

## ⚠️ Segurança

- Altere a senha após o primeiro login
- Não compartilhe o arquivo `service-account.json` - ele contém credenciais sensíveis
- Considere remover o script `create-admin-user.js` após o uso 