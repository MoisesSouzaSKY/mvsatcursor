# 🔧 SOLUÇÃO: Página TVBox não exibe dados do Firebase

## 🚨 Problema Identificado
A página de TVBox está vazia porque:
1. **Credenciais do Firebase não configuradas** - O arquivo `environment.ts` tem valores placeholder
2. **Possível problema de conexão** com o Firestore
3. **Coleção 'tvbox' pode não existir** ou estar vazia

## ✅ Solução Passo a Passo

### 1. Configurar as Credenciais do Firebase

#### A) Acessar o Console do Firebase
1. Abra: https://console.firebase.google.com/
2. Faça login com sua conta Google
3. Selecione o projeto **`mvsat-428a2`**

#### B) Obter as Credenciais do App Web
1. Clique na **engrenagem (⚙️)** ao lado de "Visão geral do projeto"
2. Selecione **"Configurações do projeto"**
3. Role para baixo até **"Seus aplicativos"**
4. Selecione o app web existente ou clique em **"Adicionar app"** → **"Web"**
5. **Copie as credenciais** que aparecem

#### C) Atualizar o Arquivo de Configuração
Edite o arquivo `mvsat/config/environment.ts` e substitua os valores placeholder:

```typescript
export const firebaseConfig = {
  apiKey: "COLE_SUA_API_KEY_AQUI",
  authDomain: "mvsat-428a2.firebaseapp.com",
  projectId: "mvsat-428a2",
  storageBucket: "mvsat-428a2.appspot.com",
  messagingSenderId: "COLE_SEU_SENDER_ID_AQUI",
  appId: "COLE_SEU_APP_ID_AQUI"
};
```

### 2. Verificar as Regras do Firestore

#### A) Acessar as Regras
1. No Console do Firebase, vá para **"Firestore Database"**
2. Clique na aba **"Regras"**

#### B) Configurar Regras Temporárias (para teste)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /tvbox/{document} {
      allow read, write: if true; // ⚠️ TEMPORÁRIO - apenas para teste
    }
  }
}
```

#### C) Regras de Produção (após confirmar funcionamento)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /tvbox/{document} {
      allow read: if request.auth != null; // Apenas usuários autenticados
      allow write: if request.auth != null && request.auth.token.admin == true; // Apenas admins
    }
  }
}
```

### 3. Verificar/Criar a Coleção 'tvbox'

#### A) Verificar se Existe
1. No Console do Firebase, vá para **"Firestore Database"**
2. Clique na aba **"Dados"**
3. Verifique se existe uma coleção chamada **`tvbox`**

#### B) Criar Coleção e Documentos de Teste
Se a coleção não existir:
1. Clique em **"Iniciar coleção"**
2. **ID da coleção**: `tvbox`
3. **ID do documento**: `teste1`
4. **Campos**:
   - `nome` (string): "TVBox Teste 1"
   - `status` (string): "Ativo"
   - `mac` (string): "00:11:22:33:44:55"
   - `serial` (string): "SN123456789"

### 4. Testar a Conexão

#### A) Executar o Projeto
```bash
cd mvsat
npm run dev
```

#### B) Acessar a Página
1. Abra: http://localhost:5173/tvbox
2. Verifique o **console do navegador** (F12)
3. A página deve mostrar:
   - Status da conexão
   - Total de itens carregados
   - Lista dos TVBox ou mensagem de "nenhum encontrado"

### 5. Troubleshooting

#### ❌ Erro: "Firebase não inicializado"
- Verifique se `initFirebase()` está sendo chamado em `main.tsx`
- Verifique se as credenciais estão corretas

#### ❌ Erro: "Permissão negada"
- Verifique as regras do Firestore
- Use regras temporárias para teste

#### ❌ Erro: "Coleção não encontrada"
- Verifique se a coleção `tvbox` existe
- Crie documentos de teste

#### ❌ Página vazia sem erros
- Verifique o console do navegador
- Verifique se há dados na coleção
- Use o componente de debug criado

## 🎯 Resultado Esperado
Após seguir estes passos, a página de TVBox deve:
- ✅ Conectar com o Firebase
- ✅ Carregar dados da coleção `tvbox`
- ✅ Exibir lista de TVBox com informações
- ✅ Mostrar status da conexão

## 📞 Suporte
Se o problema persistir:
1. Verifique o console do navegador para erros
2. Confirme se as credenciais estão corretas
3. Verifique se a coleção `tvbox` existe e tem dados
4. Teste com regras temporárias do Firestore
