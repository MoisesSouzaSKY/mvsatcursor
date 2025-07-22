# 🚀 Guia de Deploy - MV SAT

## 📋 Resumo
Este documento descreve o processo de deploy do sistema MV SAT, que utiliza Firebase para hosting, autenticação, banco de dados (Firestore) e armazenamento (Storage).

## 🔥 Firebase Hosting

### 🌐 URL do Aplicativo
- **URL Pública**: [https://mvsatimportado.web.app](https://mvsatimportado.web.app)
- **Console Firebase**: [https://console.firebase.google.com/project/mvsatimportado/overview](https://console.firebase.google.com/project/mvsatimportado/overview)

### 📦 Configuração do Projeto
O projeto está configurado para deploy automático através do Firebase CLI. As seguintes configurações foram aplicadas:

- **Diretório público**: `dist` (gerado pelo Vite)
- **Rewrite de rotas**: Todas as rotas são direcionadas para `index.html` para suportar React Router
- **Arquivos ignorados**: `firebase.json`, arquivos ocultos e `node_modules`

## 🔄 Como fazer um novo deploy

### 1. Build do projeto
```bash
npm run build
```

### 2. Deploy para o Firebase Hosting
```bash
firebase deploy --only hosting
```

### 3. Deploy de regras do Firestore e índices
```bash
firebase deploy --only firestore
```

### 4. Deploy de regras do Storage
```bash
firebase deploy --only storage
```

### 5. Deploy completo (todos os serviços)
```bash
firebase deploy
```

## 🔐 Configuração de Segurança

### Firestore Rules
As regras de segurança do Firestore estão configuradas para:
- Permitir acesso apenas a usuários autenticados
- Implementar multi-tenancy (cada usuário acessa apenas seus dados)
- Regras específicas para funcionários e permissões

### Storage Rules
As regras de segurança do Storage estão configuradas para:
- Permitir acesso apenas a usuários autenticados
- Regras específicas para comprovantes (acesso privado)
- Regras específicas para logos (leitura pública, escrita privada)

## 📊 Índices do Firestore
Foram configurados índices compostos para otimizar as consultas mais comuns:
- Assinaturas por usuário, status e data de vencimento
- Clientes por usuário e nome
- Cobranças por usuário, status e data de vencimento
- Equipamentos por usuário e status
- Funcionários por usuário e status

## 🔧 Configuração do Firebase
O arquivo `src/integrations/firebase/config.ts` contém as configurações de conexão com o Firebase:

```typescript
const firebaseConfig = {
  apiKey: "AIzaSyBXQvXy_RO0KLsEOkzKWfBDPwZSdGDPXrE",
  authDomain: "mvsatimportado.firebaseapp.com",
  projectId: "mvsatimportado",
  storageBucket: "mvsatimportado.appspot.com",
  messagingSenderId: "486956839447",
  appId: "1:486956839447:web:c7d5e6d5f5f5f5f5f5f5f5"
};
```

## ⚠️ Importante
- Não compartilhe as credenciais do Firebase em repositórios públicos
- Considere usar variáveis de ambiente para as credenciais em ambientes de produção
- Mantenha as regras de segurança atualizadas conforme as necessidades do aplicativo

## 📝 Próximos Passos
1. Configurar Firebase Storage no console do Firebase
2. Implementar CI/CD para deploy automático
3. Configurar domínio personalizado
4. Implementar monitoramento e analytics 