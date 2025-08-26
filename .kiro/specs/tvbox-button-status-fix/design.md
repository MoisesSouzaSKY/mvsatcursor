# Design Document

## Overview

Este documento descreve a solução técnica para corrigir os problemas do botão "Nova Assinatura" e da duplicação de status na página de TV Box. A solução foca em melhorar a lógica de carregamento de dados e garantir a consistência da interface.

## Architecture

### Componentes Afetados
- `TvBoxPage.tsx` - Componente principal da página
- Função `carregarTVBoxes()` - Lógica de carregamento de dados
- Função `abrirModalNovaAssinatura()` - Abertura do modal
- Estado `showModalNovaAssinatura` - Controle de visibilidade do modal

### Fluxo de Dados
1. **Carregamento**: Firestore → `carregarTVBoxes()` → Estado local → Interface
2. **Criação**: Modal → Validação → Firestore → Recarregamento → Interface

## Components and Interfaces

### 1. Correção da Função de Carregamento

**Problema Atual:**
```typescript
// Lógica problemática que pode criar duplicatas
if (!assinaturasMap.has(assinaturaKey)) {
  assinaturasMap.set(assinaturaKey, {...});
}
```

**Solução Proposta:**
```typescript
// Nova lógica que processa cada documento individualmente
snap.docs.forEach(d => {
  const data = d.data();
  const tvbox: TVBox = {
    id: d.id, // Usar ID único do documento
    assinatura: data.assinatura || `Assinatura ${d.id}`,
    status: (data.status || 'pendente').toLowerCase(),
    // ... outros campos
  };
  tvboxes.push(tvbox);
});
```

### 2. Correção do Modal de Nova Assinatura

**Problema Atual:**
- Estado do modal pode não estar sendo atualizado corretamente
- Possível conflito entre estados

**Solução Proposta:**
```typescript
const abrirModalNovaAssinatura = () => {
  // Limpar estados anteriores
  setNovaAssinatura({
    numero: calcularProximoNumero(),
    login: '',
    senha: '',
    status: 'pendente',
    renovacaoDia: null,
    renovacaoData: null
  });
  
  // Garantir que o modal seja aberto
  setShowModalNovaAssinatura(true);
};
```

### 3. Validação de Estado

**Implementar verificações:**
- Verificar se `tvboxes` está carregado antes de calcular próximo número
- Validar estado do modal antes de renderizar
- Adicionar logs de debug para rastreamento

## Data Models

### TVBox Interface (Atualizada)
```typescript
interface TVBox {
  id: string; // ID único do documento Firestore
  assinatura: string; // Nome da assinatura
  status: 'ativa' | 'pendente' | 'cancelada'; // Status único
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

### Estado do Modal
```typescript
interface NovaAssinaturaState {
  numero: number;
  login: string;
  senha: string;
  status: 'pendente' | 'ativa';
  renovacaoDia: number | null;
  renovacaoData: string | null;
}
```

## Error Handling

### 1. Tratamento de Dados Duplicados
- Implementar lógica para detectar e resolver conflitos
- Priorizar dados mais recentes (baseado em timestamp)
- Log de avisos quando duplicatas são encontradas

### 2. Validação de Modal
- Verificar se todos os estados necessários estão inicializados
- Validar dados antes de abrir o modal
- Implementar fallbacks para casos de erro

### 3. Feedback ao Usuário
- Mensagens de erro claras quando operações falham
- Loading states durante operações assíncronas
- Confirmações de sucesso após operações

## Testing Strategy

### 1. Testes Unitários
- Testar função `carregarTVBoxes()` com dados duplicados
- Testar abertura e fechamento do modal
- Testar cálculo do próximo número de assinatura

### 2. Testes de Integração
- Testar fluxo completo de criação de assinatura
- Testar carregamento de dados do Firestore
- Testar atualização da interface após operações

### 3. Testes de Interface
- Verificar se o botão "Nova Assinatura" responde ao clique
- Verificar se apenas um status é exibido por assinatura
- Verificar se o modal abre corretamente

## Implementation Notes

### Prioridades de Implementação
1. **Alta**: Corrigir carregamento de dados (eliminar duplicatas)
2. **Alta**: Corrigir abertura do modal de nova assinatura
3. **Média**: Adicionar validações e tratamento de erro
4. **Baixa**: Melhorar logs e debugging

### Considerações de Performance
- Evitar reprocessamento desnecessário de dados
- Otimizar queries do Firestore se necessário
- Implementar debounce para operações frequentes

### Compatibilidade
- Manter compatibilidade com estrutura atual do Firestore
- Não quebrar funcionalidades existentes
- Garantir que mudanças sejam retrocompatíveis