# MV SAT

App React + Vite com Firebase (Firestore) e imagens em Base64.

## Setup

1. Instale dependências:
- npm install

2. Configure Firebase:
- Copie `mvsat/config/environment.example.ts` para `mvsat/config/environment.ts`.
- Preencha as chaves do projeto.

3. Rode localmente:
- npm run dev

## Build

- npm run build
- npm run preview

## Deploy (Firebase Hosting)

1. Defina o projeto no `.firebaserc` (substitua `REPLACE_WITH_YOUR_FIREBASE_PROJECT_ID`).
2. Autentique no Firebase (uma vez):
- firebase login

3. Deploy:
- npm run build
- npm run deploy

Ou CI/CD com `FIREBASE_TOKEN` e `firebase deploy --only hosting --non-interactive`.

