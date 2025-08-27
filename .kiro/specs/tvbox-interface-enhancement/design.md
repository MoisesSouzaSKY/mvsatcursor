# Documento de Design

## Visão Geral

Este documento define o design técnico para as melhorias da interface da aba TV Box, focando exclusivamente em aprimoramentos visuais e de experiência do usuário. O objetivo é modernizar a aparência mantendo toda a funcionalidade e lógica de negócio existentes intactas.

## Arquitetura

### Estrutura Atual
- **Componente Principal**: `mvsat/app/pages/TvBoxPage.tsx` - Componente principal da página
- **Modal Nova Assinatura**: `mvsat/tvbox/NovaAssinaturaTvBoxModal.tsx` - Modal para criação de assinaturas
- **Componentes Auxiliares**: StatusBadge, ClienteDualSlots para exibição de dados

### Abordagem de Implementação
- **Modificação In-Place**: Atualizar componentes existentes sem alterar a estrutura de arquivos
- **CSS-in-JS**: Utilizar estilos inline existentes com melhorias visuais
- **Preservação de Estado**: Manter todos os hooks, estados e lógica de negócio inalterados
- **Compatibilidade**: Garantir que todas as funcionalidades existentes continuem funcionando

## Componentes e Interfaces

### 1. Banner Informativo
**Localização**: Topo da página TvBoxPage.tsx
**Implementação**:
```typescript
interface BannerProps {
  title: string;
  subtitle: string;
  icon?: React.ReactNode;
}
```

**Características**:
- Fundo em degradê (azul escuro → cinza claro)
- Largura máxima de 1200px, centralizado
- Ícone de TV no canto esquerdo
- Tipografia moderna e hierárquica

### 2. Cards de Resumo Aprimorados
**Localização**: Seção de estatísticas na TvBoxPage.tsx
**Implementação**: Melhorar a função `calcularEstatisticas()` e renderização dos cards

**Cards a serem implementados**:
1. **Card Assinaturas**: Total, ativas, pendentes
2. **Card Clientes Ativos**: Total de clientes, média por assinatura
3. **Card Equipamentos Alugados**: Total alugado, porcentagem
4. **Card Equipamentos Disponíveis**: Aguardando cliente, porcentagem
5. **Card Próximos Vencimentos**: Hoje, esta semana

**Características**:
- Cantos arredondados (border-radius: 12px)
- Sombra suave (box-shadow)
- Tipografia maior e mais legível
- Cores discretas e profissionais

### 3. Tabela de Assinaturas Modernizada
**Localização**: Lista principal na TvBoxPage.tsx
**Implementação**: Melhorar estilos da tabela existente

**Características**:
- Aparência similar ao Excel
- Bordas sutis entre linhas
- Alinhamento aprimorado das colunas
- Hover effects nas linhas

### 4. Botões de Ação Modernos
**Localização**: Botões na tabela e botão "Nova Assinatura"
**Implementação**: Atualizar estilos dos botões existentes

**Características**:
- Botões Visualizar/Editar: azul com bordas arredondadas
- Botões Renovar: verde com bordas arredondadas
- Botão Nova Assinatura: verde com ícone +
- Efeitos hover com sombra discreta

### 5. Modais Aprimorados
**Localização**: Modais existentes (NovaAssinaturaTvBoxModal.tsx e modais inline)
**Implementação**: Melhorar layout e organização visual

**Características**:
- Layout clean com inputs organizados em grid
- Seções/cards internos com bordas arredondadas
- Botões modernos e formais
- Tipografia clara e hierárquica

## Modelos de Dados

### Estrutura de Dados Existente (Preservada)
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

interface Equipamento {
  id: string;
  nds: string;
  mac: string;
  idAparelho: string;
  cliente: string;
  cliente_nome?: string;
  cliente_id?: string | null;
}
```

### Novos Tipos para Estatísticas
```typescript
interface EstatisticasCards {
  assinaturas: {
    total: number;
    ativas: number;
    pendentes: number;
  };
  clientes: {
    ativos: number;
    mediaPorAssinatura: number;
  };
  equipamentos: {
    alugados: number;
    disponiveis: number;
    percentualAlugados: number;
    percentualDisponiveis: number;
  };
  vencimentos: {
    hoje: number;
    estaSemana: number;
  };
}
```

## Tratamento de Erros

### Estratégia de Preservação
- **Manter Handlers Existentes**: Todos os try/catch e tratamentos de erro existentes devem ser preservados
- **Não Alterar Fluxos**: Manter os mesmos fluxos de erro e mensagens de alerta
- **Melhorar Apresentação**: Apenas melhorar a apresentação visual das mensagens de erro

### Implementação
- Manter todas as funções de tratamento de erro existentes
- Melhorar apenas o estilo visual dos alertas e mensagens
- Preservar console.log e console.error existentes

## Estratégia de Testes

### Testes de Regressão Visual
1. **Funcionalidade Preservada**: Verificar que todas as funcionalidades existentes continuam funcionando
2. **Responsividade**: Testar em diferentes tamanhos de tela
3. **Interações**: Validar que todos os botões, modais e formulários funcionam corretamente
4. **Estados**: Verificar loading states, hover effects e transições

### Checklist de Validação
- [ ] Banner exibido corretamente no topo
- [ ] Cards de resumo com informações corretas e design moderno
- [ ] Tabela com aparência profissional e dados íntegros
- [ ] Botões com novos estilos e funcionalidade preservada
- [ ] Modais com layout limpo e formulários funcionais
- [ ] Toast de sucesso após renovação
- [ ] Responsividade em diferentes dispositivos
- [ ] Compatibilidade com funcionalidades existentes

## Implementação Técnica

### Abordagem de Desenvolvimento
1. **Fase 1**: Implementar banner informativo
2. **Fase 2**: Aprimorar cards de resumo com novas métricas
3. **Fase 3**: Modernizar tabela de assinaturas
4. **Fase 4**: Atualizar estilos dos botões
5. **Fase 5**: Melhorar layout dos modais
6. **Fase 6**: Implementar toast de sucesso

### Considerações de Performance
- **CSS-in-JS Otimizado**: Usar estilos inline eficientes
- **Preservar Memoização**: Manter React.memo e useMemo existentes
- **Não Adicionar Dependências**: Usar apenas recursos já disponíveis no projeto
- **Lazy Loading**: Preservar React.Suspense existente

### Paleta de Cores
```css
/* Cores Principais */
--primary-blue: #3b82f6;
--primary-green: #10b981;
--neutral-gray: #6b7280;
--light-gray: #f3f4f6;
--dark-gray: #374151;

/* Cores de Status */
--status-active: #059669;
--status-pending: #d97706;
--status-canceled: #6b7280;

/* Cores de Fundo */
--bg-gradient-start: #1e3a8a;
--bg-gradient-end: #e5e7eb;
--card-background: #ffffff;
--hover-background: #f9fafb;
```

### Responsividade
- **Desktop**: Layout completo com todos os elementos
- **Tablet**: Adaptação dos cards em grid responsivo
- **Mobile**: Stack vertical dos elementos principais

## Considerações de Acessibilidade

### Padrões WCAG
- **Contraste**: Garantir contraste adequado em todos os elementos
- **Navegação por Teclado**: Preservar navegação existente
- **Aria Labels**: Manter labels existentes e adicionar quando necessário
- **Foco Visual**: Melhorar indicadores de foco nos elementos interativos

### Implementação
- Usar cores com contraste adequado
- Manter estrutura semântica HTML
- Preservar funcionalidades de acessibilidade existentes
- Adicionar indicadores visuais de foco aprimorados