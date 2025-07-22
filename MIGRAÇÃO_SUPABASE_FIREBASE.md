# 🔥 Migração Supabase → Firebase

Este documento contém todas as instruções necessárias para completar a migração do seu projeto do Supabase para Firebase.

## ✅ O que já foi migrado

- [x] Configuração inicial do Firebase
- [x] Sistema de autenticação (Firebase Auth)
- [x] Wrapper do Firestore (substitui supabaseWrapper)
- [x] Sistema de tipos TypeScript
- [x] Firebase Storage para arquivos
- [x] Estrutura das Cloud Functions
- [x] Páginas de registro
- [x] Context de autenticação

## 🔧 Passos para finalizar a migração

### 1. Configurar projeto Firebase

1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Crie um novo projeto ou use um existente
3. Ative os seguintes serviços:
   - **Authentication** (Email/Password)
   - **Firestore Database** (modo produção)
   - **Storage** 
   - **Functions**

4. Obtenha as credenciais do projeto em Project Settings → General → Your apps
5. Atualize o arquivo `src/integrations/firebase/config.ts` com suas credenciais:

```typescript
const firebaseConfig = {
  apiKey: "sua-api-key",
  authDomain: "seu-projeto.firebaseapp.com",
  projectId: "seu-projeto-id",
  storageBucket: "seu-projeto.appspot.com",
  messagingSenderId: "123456789",
  appId: "sua-app-id"
};
```

### 2. Configurar Cloud Functions

1. Instale Firebase CLI: `npm install -g firebase-tools`
2. Faça login: `firebase login`
3. No diretório do projeto: `firebase init functions`
4. Copie o conteúdo de `firebase-functions/validateEmployeeLogin.js` para `functions/src/index.js`
5. Deploy: `firebase deploy --only functions`

### 3. Configurar regras do Firestore

No Firebase Console → Firestore → Rules, configure:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permitir acesso apenas a usuários autenticados
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
    
    // Regras específicas para multi-tenant
    match /clientes/{clienteId} {
      allow read, write: if request.auth != null && 
        (resource.data.user_id == request.auth.uid || 
         isEmployee(request.auth.uid, resource.data.user_id));
    }
    
    match /assinaturas/{assinaturaId} {
      allow read, write: if request.auth != null && 
        (resource.data.user_id == request.auth.uid || 
         isEmployee(request.auth.uid, resource.data.user_id));
    }
    
    // Funcionários podem acessar apenas dados do seu proprietário
    function isEmployee(uid, ownerId) {
      return exists(/databases/$(database)/documents/funcionarios/$(uid)) &&
             get(/databases/$(database)/documents/funcionarios/$(uid)).data.user_id == ownerId;
    }
  }
}
```

### 4. Configurar regras do Storage

No Firebase Console → Storage → Rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 5. Migrar dados do Supabase

Você precisará exportar os dados do Supabase e importar no Firestore. Use estes scripts como base:

#### Exportar do Supabase
```sql
-- Script SQL para exportar dados principais
COPY (SELECT * FROM clientes) TO '/path/clientes.csv' CSV HEADER;
COPY (SELECT * FROM assinaturas) TO '/path/assinaturas.csv' CSV HEADER;
COPY (SELECT * FROM equipamentos) TO '/path/equipamentos.csv' CSV HEADER;
-- Continue para todas as tabelas...
```

#### Importar para Firestore
```typescript
// Script Node.js para importar dados
import { admin } from 'firebase-admin';
import * as csv from 'csv-parser';
import * as fs from 'fs';

// Importar clientes
fs.createReadStream('clientes.csv')
  .pipe(csv())
  .on('data', async (row) => {
    await admin.firestore().collection('clientes').add({
      ...row,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    });
  });
```

### 6. Atualizar componentes restantes

Ainda existem alguns componentes que precisam ser atualizados para usar Firebase:

#### Arquivos que precisam de correção:
- `src/pages/Assinaturas.tsx` - corrigir erros de sintaxe
- `src/pages/Cobrancas.tsx` - atualizar queries
- `src/pages/Dashboard.tsx` - migrar consultas complexas
- `src/pages/Clientes.tsx` - atualizar operações CRUD
- `src/pages/Funcionarios.tsx` - migrar sistema de funcionários
- `src/pages/TVBox.tsx` - atualizar queries
- `src/pages/Configuracoes.tsx` - migrar contagem de registros

### 7. Principais mudanças de sintaxe

#### Supabase → Firebase
```typescript
// ❌ Supabase
const { data, error } = await supabase
  .from('clientes')
  .select('*')
  .eq('status', 'ativo')
  .order('created_at', { ascending: false });

// ✅ Firebase
const { data, error } = await selectClientes()
  .eq('status', 'ativo')
  .orderBy('created_at', 'desc')
  .execute();
```

#### Autenticação
```typescript
// ❌ Supabase
const { user } = await supabase.auth.getUser();
user.id // ID do usuário

// ✅ Firebase
const user = auth.currentUser;
user.uid // ID do usuário
```

#### Storage
```typescript
// ❌ Supabase
const { data, error } = await supabase.storage
  .from('bucket')
  .upload(path, file);

// ✅ Firebase
const { data, error } = await uploadFile(file, 'bucket', filename);
```

### 8. Remover dependências antigas

Após confirmar que tudo funciona:

```bash
npm uninstall @supabase/supabase-js
```

E remover:
- `src/integrations/supabase/`
- `src/lib/supabaseWrapper.ts`
- `supabase/` (pasta toda)

### 9. Problemas comuns e soluções

#### Erro: "user.id não existe"
```typescript
// ❌ Errado
user.id

// ✅ Correto
user.uid
```

#### Queries complexas com JOINs
O Firestore não suporta JOINs. Você precisará:
1. Buscar dados separadamente
2. Fazer joins no frontend
3. Ou denormalizar dados

#### Real-time listeners
```typescript
// ❌ Supabase
supabase
  .channel('channel-name')
  .on('postgres_changes', { ... }, callback);

// ✅ Firebase
import { onSnapshot, collection } from 'firebase/firestore';

onSnapshot(collection(db, 'collection'), (snapshot) => {
  // Handle changes
});
```

## 📋 Checklist final

- [ ] Firebase projeto configurado
- [ ] Credenciais atualizadas
- [ ] Cloud Functions deployadas
- [ ] Regras Firestore configuradas
- [ ] Regras Storage configuradas
- [ ] Dados migrados
- [ ] Componentes atualizados
- [ ] Testes realizados
- [ ] Dependências antigas removidas

## 🆘 Suporte

Se encontrar problemas durante a migração:

1. Verifique os logs do console do navegador
2. Verifique os logs das Cloud Functions no Firebase Console
3. Teste cada funcionalidade individualmente
4. Use ferramentas do Firebase Emulator para desenvolvimento local

## 📚 Documentação útil

- [Firebase Auth](https://firebase.google.com/docs/auth)
- [Firestore](https://firebase.google.com/docs/firestore)
- [Firebase Storage](https://firebase.google.com/docs/storage)
- [Cloud Functions](https://firebase.google.com/docs/functions) 