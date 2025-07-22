# 👑 Instruções para Criar Usuário Administrador

Este documento fornece instruções detalhadas sobre como criar um usuário administrador para o sistema MV SAT usando os scripts fornecidos.

## 📋 Dados do Usuário Administrador

- **Email**: moisestimesky@gmail.com
- **Senha**: B12e57D8@
- **Nome**: Administrador

## 🔄 Opções para Criar o Usuário Administrador

Existem três maneiras de criar o usuário administrador:

1. [Usando o Console do Firebase](#método-1-usando-o-console-do-firebase)
2. [Usando o Script no Console do Navegador](#método-2-usando-o-script-no-console-do-navegador)
3. [Usando o Script Node.js](#método-3-usando-o-script-nodejs)

## Método 1: Usando o Console do Firebase

### Passo 1: Acesse o Console do Firebase
1. Vá para [https://console.firebase.google.com/project/mvsatimportado](https://console.firebase.google.com/project/mvsatimportado)
2. Faça login com sua conta Google

### Passo 2: Adicione o Usuário no Authentication
1. No menu lateral, clique em "Authentication"
2. Clique na aba "Users"
3. Clique no botão "Add User" ou "Adicionar usuário"
4. Preencha o email: `moisestimesky@gmail.com`
5. Preencha a senha: `B12e57D8@`
6. Clique em "Add User" ou "Adicionar usuário"

### Passo 3: Crie o Documento de Perfil no Firestore
1. No menu lateral, clique em "Firestore Database"
2. Clique em "Start collection" ou "Iniciar coleção" (se ainda não existir)
3. Digite `profiles` como nome da coleção e clique em "Next" ou "Próximo"
4. No campo "Document ID" ou "ID do documento", cole o UID do usuário que você acabou de criar
5. Adicione os seguintes campos:
   - Campo: `email`, Tipo: string, Valor: `moisestimesky@gmail.com`
   - Campo: `displayName`, Tipo: string, Valor: `Administrador`
   - Campo: `isAdmin`, Tipo: boolean, Valor: `true`
   - Campo: `createdAt`, Tipo: timestamp, Valor: (clique no ícone de relógio para o timestamp atual)
   - Campo: `updatedAt`, Tipo: timestamp, Valor: (clique no ícone de relógio para o timestamp atual)
6. Clique em "Save" ou "Salvar"

## Método 2: Usando o Script no Console do Navegador

Este método usa o arquivo `add-admin-user.js` para criar o usuário diretamente no console do navegador.

### Passo 1: Abra o Console do Firebase
1. Vá para [https://console.firebase.google.com/project/mvsatimportado](https://console.firebase.google.com/project/mvsatimportado)
2. Faça login com sua conta Google

### Passo 2: Abra o Console do Navegador
1. Pressione F12 ou Ctrl+Shift+I para abrir as ferramentas do desenvolvedor
2. Vá para a aba "Console"

### Passo 3: Execute o Script
1. Abra o arquivo `add-admin-user.js` neste projeto
2. Copie todo o conteúdo do arquivo
3. Cole o conteúdo no console do navegador
4. Pressione Enter para executar o script
5. Verifique as mensagens no console para confirmar que o usuário foi criado com sucesso

## Método 3: Usando o Script Node.js

Este método usa o arquivo `create-admin-user.js` e requer credenciais de serviço do Firebase Admin SDK.

### Passo 1: Obtenha as Credenciais de Serviço
1. Vá para [https://console.firebase.google.com/project/mvsatimportado/settings/serviceaccounts/adminsdk](https://console.firebase.google.com/project/mvsatimportado/settings/serviceaccounts/adminsdk)
2. Clique em "Generate new private key" ou "Gerar nova chave privada"
3. Salve o arquivo JSON como `service-account.json` na raiz do projeto

### Passo 2: Instale as Dependências
```bash
npm install firebase-admin
```

### Passo 3: Execute o Script
```bash
node create-admin-user.js
```

### Passo 4: Verifique o Resultado
1. O script mostrará mensagens no console indicando o progresso
2. Verifique se o usuário foi criado com sucesso
3. Siga as instruções adicionais que o script fornece para criar o documento de perfil no Firestore, se necessário

## ✅ Verificação

Para verificar se o usuário administrador foi criado corretamente:

1. Acesse o Console do Firebase > Authentication > Users
2. Confirme que o usuário `moisestimesky@gmail.com` está listado
3. Acesse o Console do Firebase > Firestore Database > profiles
4. Confirme que existe um documento com o UID do usuário e que ele tem o campo `isAdmin: true`
5. Tente fazer login no aplicativo usando as credenciais:
   - Email: moisestimesky@gmail.com
   - Senha: B12e57D8@

## ⚠️ Segurança

- Altere a senha do usuário administrador após o primeiro login
- Não compartilhe o arquivo `service-account.json` - ele contém credenciais sensíveis
- Considere remover os scripts `create-admin-user.js` e `add-admin-user.js` após o uso
- Mantenha o arquivo `ADMIN_USER.md` em um local seguro, pois ele contém a senha inicial 