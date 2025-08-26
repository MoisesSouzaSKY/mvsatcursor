# Configuração do Firebase para MV SAT

## Problema Identificado
A página de TVBox não está exibindo dados porque as credenciais do Firebase não estão configuradas corretamente.

## Solução

### 1. Obter as Credenciais do Firebase
1. Acesse o [Console do Firebase](https://console.firebase.google.com/)
2. Selecione o projeto `mvsat-428a2`
3. Clique na engrenagem (⚙️) ao lado de "Visão geral do projeto"
4. Selecione "Configurações do projeto"
5. Role para baixo até "Seus aplicativos"
6. Selecione o app web ou crie um novo

### 2. Atualizar o Arquivo de Configuração
Edite o arquivo `mvsat/config/environment.ts` e substitua os valores placeholder pelos valores reais:

```typescript
export const firebaseConfig = {
  apiKey: "SUA_API_KEY_REAL_AQUI",
  authDomain: "mvsat-428a2.firebaseapp.com",
  projectId: "mvsat-428a2",
  storageBucket: "mvsat-428a2.appspot.com",
  messagingSenderId: "SEU_SENDER_ID_REAL_AQUI",
  appId: "SEU_APP_ID_REAL_AQUI"
};
```

### 3. Verificar as Regras do Firestore
1. No Console do Firebase, vá para "Firestore Database"
2. Clique na aba "Regras"
3. Verifique se as regras permitem leitura da coleção `tvbox`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /tvbox/{document} {
      allow read: if true; // Temporariamente para teste
      allow write: if true; // Temporariamente para teste
    }
  }
}
```

### 4. Verificar se a Coleção Existe
1. No Console do Firebase, vá para "Firestore Database"
2. Verifique se existe uma coleção chamada `tvbox`
3. Se não existir, crie alguns documentos de teste

### 5. Testar a Conexão
Após configurar as credenciais:
1. Execute `npm run dev` na pasta `mvsat`
2. Acesse a página de TVBox
3. Verifique o console do navegador para erros
4. A página deve mostrar o status da conexão e os dados

## Estrutura Esperada dos Dados
Cada documento na coleção `tvbox` deve ter:
- `nome`: Nome do TVBox
- `status`: Status atual (ativo, inativo, etc.)
- `mac`: Endereço MAC (opcional)
- `serial`: Número de série (opcional)

## Troubleshooting
- Se houver erro de "Firebase não inicializado", verifique se `initFirebase()` está sendo chamado
- Se houver erro de permissão, verifique as regras do Firestore
- Se não houver dados, verifique se a coleção `tvbox` existe e tem documentos
