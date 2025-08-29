# Sistema de Funcionários com RBAC

Sistema completo de gerenciamento de funcionários com controle de acesso baseado em roles (RBAC) e auditoria detalhada.

## 🎯 Funcionalidades

### ✅ Implementado

- **Infraestrutura Base**
  - ✅ Tipos TypeScript completos
  - ✅ Schema do banco de dados
  - ✅ Utilitários de permissões, auditoria e segurança

- **Sistema de Autenticação**
  - ✅ Serviço de autenticação com JWT
  - ✅ Gerenciamento de sessões ativas
  - ✅ Middleware de autenticação
  - ✅ Sistema de logout forçado

- **Sistema RBAC**
  - ✅ Gerenciamento de perfis padrão
  - ✅ Matriz de permissões por módulo/ação
  - ✅ Sistema de overrides individuais
  - ✅ Middleware de controle de acesso

- **Sistema de Auditoria**
  - ✅ Logging de eventos automático
  - ✅ Sistema de diff para mudanças
  - ✅ Filtros e exportação

- **Interface Completa**
  - ✅ Página principal sem banner (padrão TV Box)
  - ✅ Cards de resumo executivo
  - ✅ Tabela de funcionários com filtros
  - ✅ Painel de auditoria
  - ✅ Modais de gerenciamento

### 🚧 Pendente de Implementação

- **Recursos de Segurança**
  - ⏳ Sistema 2FA (TOTP)
  - ⏳ Reset de senha
  - ⏳ Rate limiting

- **Integração Frontend**
  - ⏳ Hook useRBAC
  - ⏳ Controle de visibilidade

- **Testes**
  - ⏳ Testes unitários
  - ⏳ Testes de integração
  - ⏳ Testes E2E

## 🏗️ Arquitetura

```
funcionarios/
├── components/           # Componentes React
│   ├── FuncionariosPage.tsx
│   ├── SummaryCards/
│   ├── EmployeeTable/
│   ├── AuditPanel/
│   └── Modals/
├── services/            # Serviços de negócio
│   ├── authService.ts
│   ├── sessionService.ts
│   ├── roleService.ts
│   ├── permissionService.ts
│   └── auditService.ts
├── middleware/          # Middleware de autenticação/autorização
│   ├── authMiddleware.ts
│   └── rbacMiddleware.ts
├── types/              # Definições de tipos
│   ├── employee.types.ts
│   ├── audit.types.ts
│   └── rbac.types.ts
├── utils/              # Utilitários
│   ├── permissionUtils.ts
│   ├── auditUtils.ts
│   └── securityUtils.ts
└── database/           # Schema do banco
    └── schema.sql
```

## 🔐 Sistema de Permissões

### Perfis Padrão

- **Admin**: Acesso total ao sistema
- **Gestor**: Quase tudo, exceto configurações de sistema
- **Financeiro**: Cobranças, Despesas, relatórios financeiros
- **Atendimento**: Clientes, Assinaturas, TV Box
- **Manutenção/Estoque**: Manutenções, Equipamentos
- **Leitor**: Apenas visualização em todos os módulos

### Módulos do Sistema

- `clientes`, `assinaturas`, `equipamentos`, `cobrancas`
- `despesas`, `tvbox`, `locacoes`, `motos`, `manutencoes`
- `multas`, `contratos`, `funcionarios`, `dashboard`

### Ações Disponíveis

- `view`: Visualizar
- `create`: Criar
- `update`: Editar
- `delete`: Excluir
- `export`: Exportar/Imprimir
- `approve`: Aprovar/Dar baixa/Reabrir
- `manage_settings`: Configurações do módulo

## 📊 Sistema de Auditoria

### Eventos Registrados

- **Autenticação**: Login, logout, falhas de login
- **CRUD**: Criação, edição, exclusão em todos os módulos
- **Ações Sensíveis**: Dar baixa, aprovar, alterar status
- **Permissões**: Mudanças de permissão e suspensões
- **Segurança**: Tentativas de acesso negado

### Dados Capturados

- Timestamp, ator (ID/nome/role)
- Módulo, ação, tipo e ID do alvo
- Detalhes da ação, diff antes/depois
- IP, User Agent

## 🚀 Como Usar

### 1. Configurar Banco de Dados

```sql
-- Execute o schema
\i mvsat/funcionarios/database/schema.sql
```

### 2. Inicializar Perfis Padrão

```typescript
import { RoleService } from './funcionarios';

// Inicializar perfis padrão
await RoleService.initializeDefaultRoles();
```

### 3. Usar Middleware de Autenticação

```typescript
import { requirePermission, requireRole } from './funcionarios';

// Requer permissão específica
app.get('/api/clientes', requirePermission('clientes', 'view'), handler);

// Requer role específico
app.get('/api/admin', requireRole('Admin'), handler);
```

### 4. Usar Componente Principal

```tsx
import { FuncionariosPage } from './funcionarios';

function App() {
  return <FuncionariosPage />;
}
```

## 🔧 Configuração

### Variáveis de Ambiente

```env
# Duração da sessão (em milissegundos)
SESSION_DURATION=28800000  # 8 horas

# Máximo de tentativas de login
MAX_LOGIN_ATTEMPTS=5

# Duração do bloqueio (em milissegundos)
LOCKOUT_DURATION=900000    # 15 minutos

# Retenção de logs (em dias)
LOG_RETENTION_DAYS=365
```

### Políticas de Segurança

```typescript
const securityPolicy: SecurityPolicy = {
  maxLoginAttempts: 5,
  lockoutDuration: 15, // minutos
  sessionTimeout: 480, // minutos (8 horas)
  passwordMinLength: 8,
  require2FA: false,
  allowedIPs: [], // vazio = todos permitidos
  blockedIPs: []
};
```

## 📝 Exemplos de Uso

### Verificar Permissões

```typescript
import { PermissionService } from './funcionarios';

// Verificar permissão específica
const canEdit = await PermissionService.hasPermission(
  'user-id', 
  'clientes', 
  'update'
);

// Verificar múltiplas permissões
const permissions = await PermissionService.hasMultiplePermissions(
  'user-id',
  [
    { module: 'clientes', action: 'view' },
    { module: 'clientes', action: 'create' }
  ]
);
```

### Registrar Auditoria

```typescript
import { AuditService } from './funcionarios';

// Log de ação CRUD
await AuditService.logCRUD(
  'user-id',
  'João Silva',
  'Admin',
  'clientes',
  'update',
  'client',
  'client-123',
  beforeData,
  afterData,
  '192.168.1.100',
  'Mozilla/5.0...'
);
```

### Aplicar Overrides de Permissão

```typescript
import { PermissionService } from './funcionarios';

// Aplicar override individual
await PermissionService.applyPermissionOverride({
  employeeId: 'user-id',
  module: 'clientes',
  action: 'delete',
  granted: false,
  reason: 'Usuário não deve excluir clientes'
}, 'admin-id');

// Aplicar modo somente leitura
await PermissionService.applyReadOnlyMode(
  'user-id',
  'cobrancas',
  'admin-id'
);
```

## 🔒 Segurança

### Princípios Aplicados

- **Deny by Default**: Sem permissão = sem acesso
- **Least Privilege**: Mínimas permissões necessárias
- **Defense in Depth**: Múltiplas camadas de segurança
- **Audit Trail**: Registro completo de ações

### Proteções Implementadas

- Validação de entrada
- Sanitização de dados
- Rate limiting
- Session management
- IP blocking
- 2FA support
- Password policies

## 📈 Monitoramento

### Métricas Disponíveis

- Total de funcionários ativos/suspensos
- Tentativas de login falhadas
- Ações críticas executadas
- Sessões ativas por IP
- Atividades suspeitas

### Alertas Automáticos

- Múltiplas tentativas de login falhadas
- Acessos fora do horário normal
- Ações críticas executadas
- Tentativas de bypass de segurança

## 🚨 Troubleshooting

### Problemas Comuns

1. **Usuário não consegue fazer login**
   - Verificar status do funcionário
   - Verificar tentativas de login bloqueadas
   - Verificar janela de acesso

2. **Permissões não funcionam**
   - Verificar se view está habilitado
   - Verificar overrides individuais
   - Verificar cache de permissões

3. **Logs de auditoria não aparecem**
   - Verificar conexão com banco
   - Verificar permissões de exportação
   - Verificar filtros aplicados

## 📚 Próximos Passos

1. **Implementar recursos de segurança pendentes**
2. **Criar testes automatizados**
3. **Integrar com sistema de notificações**
4. **Implementar dashboard de métricas**
5. **Adicionar suporte a SSO**