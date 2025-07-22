# 🏗️ Nova Arquitetura do Projeto MV SAT

## 📁 Estrutura de Pastas

```
src/
├── app/                          # Aplicação principal
│   ├── App.tsx                   # Componente raiz
│   ├── main.tsx                  # Entry point
│   ├── Configuracoes.tsx         # Página de configurações
│   ├── NotFound.tsx              # Página 404
│   └── Painel.tsx                # Painel principal
│
├── features/                     # Features organizadas por domínio
│   ├── assinaturas/
│   │   ├── components/           # Componentes específicos de assinaturas
│   │   ├── hooks/                # Hooks específicos de assinaturas
│   │   ├── pages/                # Páginas de assinaturas
│   │   ├── services/             # Lógica de negócio e acesso a dados
│   │   ├── types.ts              # Tipos TypeScript específicos
│   │   └── index.ts              # Barrel exports
│   ├── clientes/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── types.ts
│   │   └── index.ts
│   ├── cobrancas/
│   ├── equipamentos/
│   ├── funcionarios/
│   ├── tvbox/
│   ├── dashboard/
│   ├── admin/
│   └── auth/
│
├── shared/                       # Código compartilhado
│   ├── components/               # Componentes reutilizáveis
│   │   ├── ui/                   # Componentes de UI básicos
│   │   ├── Layout/               # Componentes de layout
│   │   ├── Forms/                # Formulários genéricos
│   │   ├── Tables/               # Tabelas genéricos
│   │   ├── Debug/                # Componentes de debug
│   │   ├── ProtectedRoute.tsx    # Guards de rota
│   │   ├── PermissionGuard.tsx
│   │   ├── ActionGuard.tsx
│   │   └── StrictPermissionGuard.tsx
│   ├── hooks/                    # Hooks reutilizáveis
│   ├── lib/                      # Utilitários e configurações
│   ├── types/                    # Tipos compartilhados
│   └── services/                 # Serviços genéricos
│
├── contexts/                     # Contextos globais (Auth, etc.)
├── integrations/                 # Integrações externas (Firebase)
├── App.css                       # Estilos específicos do App
└── index.css                     # Estilos globais
```

## 🎯 Princípios da Arquitetura

### 1. **Separação por Features**
- Cada feature (assinaturas, clientes, etc.) é auto-contida
- Reduz acoplamento e facilita manutenção
- Permite desenvolvimento em equipe sem conflitos

### 2. **Shared/Common**
- Componentes, hooks e utilidades reutilizáveis
- Evita duplicação de código
- Facilita padronização da UI

### 3. **Barrel Exports**
- Cada feature tem um `index.ts` que exporta tudo
- Imports mais limpos e organizados
- Controle fino sobre o que é exposto

### 4. **Services Layer**
- Lógica de acesso a dados isolada
- APIs consistentes para cada domínio
- Facilita testes e manutenção

## 🚀 Como Usar

### Importando de uma Feature
```typescript
import { AssinaturasService, Assinatura } from '@/features/assinaturas';
import { AssinaturasTable } from '@/features/assinaturas/components/AssinaturasTable';
```

### Importando Shared Components
```typescript
import { Button } from '@/shared/components/ui/button';
import { AppLayout } from '@/shared/components/Layout/AppLayout';
import { useToast } from '@/shared/hooks/use-toast';
```

### Criando uma Nova Feature
1. Criar pasta em `src/features/nova-feature/`
2. Criar subpastas: `components/`, `hooks/`, `pages/`, `services/`
3. Criar `types.ts` com interfaces da feature
4. Criar `index.ts` com exports
5. Implementar service em `services/novaFeatureService.ts`

## 🔧 Vantagens da Nova Estrutura

### ✅ **Escalabilidade**
- Fácil adicionar novas features
- Não há conflitos entre diferentes domínios
- Code splitting natural por feature

### ✅ **Manutenibilidade** 
- Código relacionado fica junto
- Easier refactoring dentro de uma feature
- Dependências claras e explícitas

### ✅ **Reutilização**
- Shared components bem organizados
- Services padronizados
- Hooks reutilizáveis

### ✅ **Colaboração**
- Equipes podem trabalhar em features separadas
- Menos conflitos no Git
- Ownership claro de código

### ✅ **Testing**
- Testes unitários por feature
- Isolation de dependências
- Mock de services específicos

## 🛠️ Padrões de Desenvolvimento

### Services
```typescript
export class AssinaturasService {
  static async getAll(filters?: AssinaturaFilters): Promise<Assinatura[]>
  static async getById(id: string): Promise<Assinatura | null>
  static async create(data: AssinaturaFormData): Promise<Assinatura>
  static async update(id: string, data: Partial<AssinaturaFormData>): Promise<Assinatura>
  static async delete(id: string): Promise<void>
}
```

### Feature Types
```typescript
// types.ts em cada feature
export interface FeatureEntity {
  id: string;
  // campos específicos
}

export interface FeatureFilters {
  // filtros para listagem
}

export interface FeatureFormData {
  // dados do formulário
}
```

## 🎨 Migração Completa
- ✅ Todas as páginas movidas para suas features
- ✅ Componentes organizados por domínio
- ✅ Shared components isolados
- ✅ Services criados para principais features
- ✅ Types definidos para cada domínio
- ✅ Imports atualizados
- ✅ Build funcionando perfeitamente

A reestruturação foi **100% bem-sucedida** e o projeto agora segue as melhores práticas de arquitetura React! 🎉 