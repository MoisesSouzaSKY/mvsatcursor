# Documento de Design - Padronização Geral do Sistema

## Visão Geral

Este documento define o design técnico para padronizar todas as páginas do sistema seguindo o padrão visual já estabelecido pela aba TV Box. O objetivo é garantir consistência visual total entre todas as seções do sistema, aplicando o design moderno e profissional da TV Box em todas as outras páginas (despesas, cobranças, equipamentos, dashboard, funcionários e configurações).

## Arquitetura

### Estrutura Atual
- **Padrão de Referência**: `mvsat/app/pages/TvBoxPage.tsx` - Página com design moderno que será o padrão
- **Páginas a Padronizar**: 
  - Todas as outras páginas do sistema (despesas, cobranças, equipamentos, dashboard, funcionários, configurações)

### Abordagem de Implementação
- **Extração de Componentes**: Extrair componentes da TV Box para reutilização
- **Aplicação do Padrão**: Aplicar o design da TV Box em todas as outras páginas
- **Preservação Total**: Manter 100% da funcionalidade e lógica de negócio existente
- **Consistência Absoluta**: Garantir que todas as páginas sejam visualmente idênticas à TV Box

## Componentes e Interfaces

### 1. Banner Informativo Padronizado
**Localização**: Topo de todas as páginas
**Referência**: Banner da TvBoxPage.tsx (padrão a ser seguido)

**Implementação**:
```typescript
// Extrair e usar exatamente o mesmo estilo da TV Box
const bannerStyle = {
  background: 'linear-gradient(135deg, #1e3a8a 0%, #e5e7eb 100%)',
  borderRadius: '16px',
  padding: '40px 32px',
  marginBottom: '32px',
  width: '100%',
  position: 'relative',
  overflow: 'hidden',
  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
};
```

**Características**:
- Gradiente da TV Box: `linear-gradient(135deg, #1e3a8a 0%, #e5e7eb 100%)`
- Ícone apropriado para cada seção na mesma posição da TV Box
- Título da seção com mesma tipografia da TV Box
- Subtítulo descritivo seguindo padrão da TV Box
- Mesmas dimensões e espaçamentos da TV Box

### 2. Componente StatsCard da TV Box
**Localização**: Seção de estatísticas de todas as páginas
**Referência**: Componente StatsCard da TvBoxPage.tsx (padrão a ser seguido)

**Implementação**: Extrair o componente StatsCard da TV Box e aplicar em todas as páginas
```typescript
interface StatsCardProps {
  title: string;
  value: number | string;
  icon: string;
  gradient: string;
  subtitle?: string;
}
```

**Cards Padronizados**:
1. **Total de Assinaturas**: Gradiente `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`, ícone 📋
2. **Assinaturas Ativas**: Gradiente `linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)`, ícone ✅
3. **Equipamentos Alugados**: Gradiente `linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)`, ícone 📺
4. **Próximos Vencimentos**: Gradiente `linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)`, ícone ⏰

### 3. Componente Toast Reutilizado
**Localização**: Notificações do sistema
**Referência**: Componente Toast das outras páginas

**Implementação**: Extrair e reutilizar o componente Toast existente
```typescript
interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  show: boolean;
  onClose: () => void;
}
```

### 4. Container de Tabela Padronizado
**Localização**: Lista de assinaturas
**Referência**: Container das tabelas das outras páginas

**Características**:
- Container branco com `borderRadius: 12px`
- Padding de `24px`
- BoxShadow idêntico: `0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)`
- Hover effects nas linhas

### 5. Botões Padronizados
**Localização**: Botões de ação e "Nova Assinatura"
**Referência**: Estilos de botões das outras páginas

**Características**:
- Mesmas cores e gradientes
- Mesmos hover effects
- Mesma tipografia e espaçamentos
- Mesmos ícones e posicionamento

## Modelos de Dados

### Estrutura Existente (Preservada)
Todos os tipos e interfaces existentes serão mantidos intactos:

```typescript
interface TVBox {
  id: string;
  assinatura: string;
  status: 'ativa' | 'pendente' | 'cancelada';
  clientes: string[];
  equipamentos: Equipamento[];
  dataInstalacao: string;
  dataRenovacao: string;
  renovacaoDia?: number | null;
  renovacaoData?: string | null;
  tipo: string;
  login: string;
  senha: string;
}
```

### Mapeamento de Estatísticas
```typescript
interface EstatisticasPadronizadas {
  totalAssinaturas: number;
  assinaturasAtivas: number;
  equipamentosAlugados: number;
  proximosVencimentos: number;
}
```

## Tratamento de Erros

### Estratégia de Preservação Total
- **Manter Todos os Handlers**: Preservar 100% dos tratamentos de erro existentes
- **Padronizar Apresentação**: Usar o mesmo componente Toast das outras páginas
- **Manter Logs**: Preservar todos os console.log e console.error existentes

## Estratégia de Testes

### Checklist de Padronização Visual
- [ ] Banner idêntico às outras páginas
- [ ] Cards usando o mesmo componente StatsCard
- [ ] Tabela com container e estilos idênticos
- [ ] Botões com mesmos estilos e hover effects
- [ ] Modais com layout idêntico
- [ ] Toasts usando o mesmo componente
- [ ] Espaçamentos e tipografia idênticos
- [ ] Cores e gradientes idênticos
- [ ] Animações idênticas
- [ ] Funcionalidade 100% preservada

## Implementação Técnica

### Fase 1: Extração de Componentes
1. **Extrair StatsCard**: Criar componente reutilizável baseado nas outras páginas
2. **Extrair Toast**: Criar componente reutilizável de notificações
3. **Definir Estilos**: Criar constantes com os estilos padronizados

### Fase 2: Aplicação na TV Box
1. **Banner**: Substituir por versão padronizada
2. **Cards**: Implementar usando StatsCard reutilizado
3. **Tabela**: Aplicar container e estilos padronizados
4. **Botões**: Padronizar com estilos das outras páginas
5. **Toasts**: Substituir por componente reutilizado

### Paleta de Cores Padronizada
```css
/* Gradientes dos Cards (idênticos às outras páginas) */
--gradient-1: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
--gradient-2: linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%);
--gradient-3: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
--gradient-4: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);

/* Banner (idêntico às outras páginas) */
--banner-gradient: linear-gradient(135deg, #1e3a8a 0%, #e5e7eb 100%);

/* Containers (idênticos às outras páginas) */
--container-bg: #ffffff;
--container-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
--container-radius: 12px;
```

### Estrutura de Arquivos
```
mvsat/
├── shared/
│   └── components/
│       ├── StatsCard.tsx (novo - extraído das outras páginas)
│       └── Toast.tsx (novo - extraído das outras páginas)
└── app/
    └── pages/
        └── TvBoxPage.tsx (atualizado para usar componentes padronizados)
```

## Considerações de Performance

### Otimizações
- **Componentes Reutilizáveis**: Reduzir duplicação de código
- **Memoização Preservada**: Manter todos os React.memo e useMemo existentes
- **CSS-in-JS Otimizado**: Usar constantes para estilos repetidos
- **Lazy Loading**: Preservar React.Suspense existente

## Considerações de Acessibilidade

### Padrões Mantidos
- **Contraste**: Usar as mesmas cores com contraste adequado das outras páginas
- **Navegação**: Preservar toda a navegação por teclado existente
- **Aria Labels**: Manter todos os labels existentes
- **Foco Visual**: Usar os mesmos indicadores de foco das outras páginas

## Critérios de Sucesso

### Validação Visual
1. **Comparação Lado a Lado**: TV Box deve ser visualmente indistinguível das outras páginas
2. **Componentes Idênticos**: Todos os elementos devem usar os mesmos componentes
3. **Estilos Consistentes**: Nenhuma diferença visual deve ser perceptível
4. **Funcionalidade Intacta**: 100% das funcionalidades devem continuar funcionando

### Métricas de Qualidade
- **Reutilização de Código**: Máximo de componentes compartilhados
- **Consistência Visual**: 100% de padronização visual
- **Preservação Funcional**: 0% de alteração na lógica de negócio
- **Performance**: Manter ou melhorar performance existente