# Documento de Design

## Visão Geral

Este documento define o design técnico para padronizar todos os banners informativos das abas do sistema MVSAT. O objetivo é garantir que todos os banners tenham exatamente as mesmas dimensões, cores, tipografia e efeitos visuais do banner da aba TV Box, criando uma experiência visual completamente consistente.

## Arquitetura

### Estrutura Atual
- **Banner de Referência**: `mvsat/app/pages/TvBoxPage.tsx` - Banner da TV Box usado como padrão
- **Headers a Padronizar**:
  - `mvsat/dashboard/components/DashboardHeader.tsx`
  - `mvsat/funcionarios/components/FuncionariosHeader.tsx`
  - `mvsat/cobrancas/components/CobrancasHeader.tsx`
  - `mvsat/clientes/components/ClientesHeader.tsx`
  - `mvsat/equipamentos/components/EquipamentosHeader.tsx`
  - `mvsat/despesas/components/DespesasHeader.tsx`
  - `mvsat/app/pages/AssinaturasPage.tsx`

### Abordagem de Implementação
- **Modificação In-Place**: Atualizar cada componente de header existente
- **Preservação de Funcionalidade**: Manter todas as props e funcionalidades existentes
- **Padronização Visual**: Aplicar exatamente os mesmos estilos do banner da TV Box
- **Consistência de Ícones**: Manter ícones específicos de cada seção, mas com formatação idêntica

## Componentes e Interfaces

### 1. Padrão de Banner (Referência TV Box)
**Estrutura Base**:
```typescript
interface BannerPadrao {
  background: 'linear-gradient(135deg, #1e3a8a 0%, #e5e7eb 100%)';
  borderRadius: '16px';
  padding: '40px 32px';
  marginBottom: '32px';
  width: '100%';
  position: 'relative';
  overflow: 'hidden';
  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
}
```

### 2. Padrão de Ícone
**Especificações**:
```typescript
interface IconePadrao {
  position: 'absolute';
  left: '32px';
  top: '50%';
  transform: 'translateY(-50%)';
  fontSize: '56px';
  opacity: '0.25';
  color: 'white';
}
```

### 3. Padrão de Título
**Especificações**:
```typescript
interface TituloPadrao {
  fontSize: '48px';
  fontWeight: '700';
  color: 'white';
  margin: '0 0 16px 0';
  textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)';
  letterSpacing: '2px';
}
```

### 4. Padrão de Subtítulo
**Especificações**:
```typescript
interface SubtituloPadrao {
  fontSize: '20px';
  color: 'rgba(255, 255, 255, 0.95)';
  fontWeight: '400';
  textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)';
  maxWidth: '600px';
  margin: '0 auto';
}
```

### 5. Padrão de Efeito Decorativo
**Especificações**:
```typescript
interface EfeitoDecorativo {
  position: 'absolute';
  right: '-20px';
  top: '-20px';
  width: '120px';
  height: '120px';
  background: 'rgba(255, 255, 255, 0.1)';
  borderRadius: '50%';
  filter: 'blur(30px)';
}
```

### 6. Padrão de Conteúdo
**Especificações**:
```typescript
interface ConteudoPadrao {
  textAlign: 'center';
  paddingLeft: '100px';
  paddingRight: '40px';
  position: 'relative';
  zIndex: 1;
}
```

## Modelos de Dados

### Mapeamento de Ícones por Seção
```typescript
interface IconesPorSecao {
  dashboard: '📊';
  funcionarios: '👥';
  cobrancas: '💰';
  clientes: '👥';
  equipamentos: '📺';
  despesas: '💸';
  assinaturas: '📋';
  tvbox: '📺';
}
```

### Mapeamento de Títulos por Seção
```typescript
interface TitulosPorSecao {
  dashboard: 'DASHBOARD';
  funcionarios: 'FUNCIONÁRIOS';
  cobrancas: 'COBRANÇAS';
  clientes: 'CLIENTES';
  equipamentos: 'EQUIPAMENTOS';
  despesas: 'DESPESAS';
  assinaturas: 'ASSINATURAS';
  tvbox: 'TV BOX';
}
```

### Mapeamento de Subtítulos por Seção
```typescript
interface SubtitulosPorSecao {
  dashboard: 'Visão geral completa do sistema MVSAT com métricas e indicadores em tempo real';
  funcionarios: 'Gerencie sua equipe e colaboradores com controle completo de departamentos e cargos';
  cobrancas: 'Gerencie cobranças, pagamentos e controle financeiro de forma eficiente';
  clientes: 'Gerencie seus clientes e relacionamentos de forma simples e organizada';
  equipamentos: 'Controle completo dos equipamentos com status em tempo real e vinculação a clientes';
  despesas: 'Controle completo das suas despesas com relatórios detalhados e acompanhamento em tempo real';
  assinaturas: 'Gerencie todas as assinaturas do sistema de forma centralizada e organizada';
  tvbox: 'Gerencie suas assinaturas e renovações de forma simples e organizada';
}
```

## Tratamento de Erros

### Estratégia de Preservação
- **Manter Props Existentes**: Todas as props dos componentes devem ser preservadas
- **Não Alterar Funcionalidades**: Manter todos os callbacks e handlers existentes
- **Preservar Estados**: Manter loading states e outras funcionalidades

### Implementação
- Manter todas as interfaces existentes dos componentes
- Preservar todas as props opcionais e obrigatórias
- Não alterar a lógica de negócio dos headers

## Estratégia de Testes

### Testes de Regressão Visual
1. **Consistência Visual**: Verificar que todos os banners têm exatamente a mesma aparência
2. **Dimensões Idênticas**: Validar que altura, largura e espaçamentos são idênticos
3. **Funcionalidade Preservada**: Confirmar que botões e callbacks continuam funcionando
4. **Responsividade**: Testar em diferentes tamanhos de tela

### Checklist de Validação
- [ ] Todos os banners têm o mesmo gradiente de cor
- [ ] Todos os ícones têm o mesmo tamanho e opacidade
- [ ] Todos os títulos têm a mesma tipografia
- [ ] Todos os subtítulos têm a mesma formatação
- [ ] Todos os efeitos decorativos são idênticos
- [ ] Todas as funcionalidades existentes continuam funcionando
- [ ] Responsividade mantida em todos os componentes

## Implementação Técnica

### Abordagem de Desenvolvimento
1. **Fase 1**: Padronizar Dashboard, Funcionários e Cobranças
2. **Fase 2**: Padronizar Clientes, Equipamentos e Despesas
3. **Fase 3**: Padronizar página de Assinaturas
4. **Fase 4**: Verificação final e testes de consistência

### Template de Banner Padronizado
```jsx
{/* Banner Informativo */}
<div style={{
  background: 'linear-gradient(135deg, #1e3a8a 0%, #e5e7eb 100%)',
  borderRadius: '16px',
  padding: '40px 32px',
  marginBottom: '32px',
  width: '100%',
  position: 'relative',
  overflow: 'hidden',
  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
}}>
  {/* Ícone no canto esquerdo */}
  <div style={{
    position: 'absolute',
    left: '32px',
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: '56px',
    opacity: '0.25',
    color: 'white'
  }}>
    {icone}
  </div>
  
  {/* Efeito decorativo no canto direito */}
  <div style={{
    position: 'absolute',
    right: '-20px',
    top: '-20px',
    width: '120px',
    height: '120px',
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '50%',
    filter: 'blur(30px)'
  }} />
  
  {/* Conteúdo centralizado */}
  <div style={{
    textAlign: 'center',
    paddingLeft: '100px',
    paddingRight: '40px',
    position: 'relative',
    zIndex: 1
  }}>
    <h1 style={{
      fontSize: '48px',
      fontWeight: '700',
      color: 'white',
      margin: '0 0 16px 0',
      textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
      letterSpacing: '2px'
    }}>
      {titulo}
    </h1>
    <p style={{
      fontSize: '20px',
      color: 'rgba(255, 255, 255, 0.95)',
      fontWeight: '400',
      textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
      maxWidth: '600px',
      margin: '0 auto'
    }}>
      {subtitulo}
    </p>
  </div>
</div>
```

### Considerações de Performance
- **CSS-in-JS Otimizado**: Usar estilos inline consistentes
- **Preservar Memoização**: Manter React.memo existente nos componentes
- **Não Adicionar Dependências**: Usar apenas recursos já disponíveis
- **Manter Estrutura**: Não alterar a estrutura de componentes existente

### Responsividade
- **Desktop**: Layout completo com todos os elementos
- **Tablet**: Manter proporções e espaçamentos
- **Mobile**: Ajustar padding se necessário, mas manter estrutura

## Considerações de Acessibilidade

### Padrões WCAG
- **Contraste**: Manter contraste adequado em todos os elementos
- **Navegação por Teclado**: Preservar navegação existente
- **Aria Labels**: Manter labels existentes
- **Foco Visual**: Preservar indicadores de foco

### Implementação
- Usar as mesmas cores com contraste adequado
- Manter estrutura semântica HTML existente
- Preservar funcionalidades de acessibilidade
- Não alterar ordem de tabulação existente