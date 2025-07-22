# 🛰️ MV SAT - Sistema de Gerenciamento

Sistema completo para gerenciamento de assinaturas de TV por satélite, clientes, equipamentos, cobranças e funcionários.

## 🚀 Tecnologias

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend**: Firebase (Auth, Firestore, Storage, Functions)
- **Arquitetura**: Feature-based, Domain-driven design

## 📋 Funcionalidades

- Gerenciamento de clientes
- Controle de assinaturas
- Gestão de equipamentos
- Sistema de cobranças
- Administração de funcionários
- Dashboard com métricas
- TVBox (sistema específico)
- Controle de permissões

## 🏗️ Estrutura do Projeto

O projeto segue uma arquitetura baseada em features (domain-driven), organizada da seguinte forma:

```
src/
├── app/                          # Aplicação principal
├── features/                     # Features organizadas por domínio
│   ├── assinaturas/
│   ├── clientes/
│   ├── cobrancas/
│   ├── equipamentos/
│   ├── funcionarios/
│   ├── tvbox/
│   ├── dashboard/
│   ├── admin/
│   └── auth/
├── shared/                       # Código compartilhado
├── contexts/                     # Contextos globais
└── integrations/                 # Integrações externas
```

Para mais detalhes sobre a estrutura, consulte o arquivo [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md).

## 🔧 Instalação e Configuração

### Pré-requisitos
- Node.js 18+
- npm ou bun

### Instalação
1. Clone o repositório
   ```bash
   git clone https://github.com/seu-usuario/mv-sat.git
   cd mv-sat
   ```

2. Instale as dependências
   ```bash
   npm install
   # ou
   bun install
   ```

3. Configure as variáveis de ambiente
   Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:
   ```
   VITE_FIREBASE_API_KEY=seu-api-key
   VITE_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=seu-projeto
   VITE_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=seu-sender-id
   VITE_FIREBASE_APP_ID=seu-app-id
   ```

4. Inicie o servidor de desenvolvimento
   ```bash
   npm run dev
   # ou
   bun run dev
   ```

## 🚀 Deploy

O projeto está configurado para deploy no Firebase Hosting. Para mais detalhes sobre o processo de deploy, consulte o arquivo [DEPLOY.md](./DEPLOY.md).

## 📚 Documentação

- [Estrutura do Projeto](./PROJECT_STRUCTURE.md)
- [Guia de Deploy](./DEPLOY.md)

## 📝 Licença

Este projeto é propriedade de MV SAT. Todos os direitos reservados.

## 👨‍💻 Autor

Desenvolvido por MV SAT.
