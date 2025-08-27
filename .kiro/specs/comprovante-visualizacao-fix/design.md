# Design Document

## Overview

Este documento descreve a solução técnica para corrigir dois problemas críticos no sistema de cobranças:

1. **Problema de Comprovante**: Modal não exibe comprovantes salvos em base64
2. **Problema de Geração de Fatura**: Próxima fatura usa data de pagamento em vez de vencimento

## Architecture

### Componentes Afetados

- `mvsat/cobrancas/cobrancas.functions.ts` - Função `marcarComoPaga()`
- `mvsat/app/pages/CobrancasPage.tsx` - Função `visualizarComprovante()` e modal

### Fluxo Atual vs Fluxo Corrigido

**Comprovante (Atual):**
1. Usuário clica "Ver Comprovante" 
2. `visualizarComprovante()` busca cobrança
3. Modal não exibe corretamente o base64

**Comprovante (Corrigido):**
1. Validação robusta dos dados do comprovante
2. Tratamento correto do formato base64
3. Logs detalhados para debugging

**Geração Fatura (Atual):**
1. Pagamento realizado em 27/08 com vencimento 30/09
2. Sistema calcula próxima fatura baseada na data atual
3. Próxima fatura fica incorreta

**Geração Fatura (Corrigido):**
1. Sistema sempre usa data de vencimento original
2. Calcula próxima mantendo o dia do vencimento
3. Trata casos especiais (ex: 31/01 → 28/02)
#
# Components and Interfaces

### 1. Comprovante Interface
```typescript
interface ComprovanteData {
  base64: string;
  mimeType: string;
  filename: string;
  uploadedAt: Date;
}
```

### 2. Função visualizarComprovante (CobrancasPage.tsx)
**Problemas Identificados:**
- Falta validação se base64 tem prefixo correto
- Logs insuficientes para debugging
- Tratamento de erro genérico

**Solução:**
- Validar formato base64 antes de exibir
- Logs detalhados em cada etapa
- Mensagens de erro específicas

### 3. Função marcarComoPaga (cobrancas.functions.ts)
**Problema Identificado:**
- Linha 119-130: Usa `vencimentoAtual` mas calcula baseado na data atual
- Função `computeNextDueDateKeepingDay()` está correta, mas dados de entrada estão errados

**Solução:**
- Garantir que `vencimentoAtual` sempre use a data de vencimento original
- Adicionar logs para verificar as datas usadas no cálculo
- Validar se a data de vencimento existe antes de calcular

## Data Models

### Estrutura de Cobrança no Firestore
```typescript
interface Cobranca {
  id: string;
  status: 'PENDENTE' | 'PAGO' | 'VENCIDO';
  valor: number;
  vencimento: Date | Timestamp;
  data_vencimento?: Date; // Campo legado
  comprovante?: ComprovanteData;
  // outros campos...
}
```## Erro
r Handling

### Comprovante
1. **Base64 Inválido**: Verificar se string base64 é válida
2. **MimeType Ausente**: Usar fallback para 'application/octet-stream'
3. **Dados Corrompidos**: Exibir mensagem específica ao usuário

### Geração de Fatura
1. **Data de Vencimento Ausente**: Logar erro e usar data atual como fallback
2. **Formato de Data Inválido**: Tentar múltiplos formatos de parsing
3. **Mês Inválido**: Usar último dia do mês quando dia não existe

## Testing Strategy

### Casos de Teste - Comprovante
1. Comprovante válido (imagem PNG/JPG)
2. Comprovante válido (PDF)
3. Base64 corrompido
4. MimeType ausente
5. Cobrança sem comprovante

### Casos de Teste - Geração de Fatura
1. Vencimento 30/09, pagamento 27/08 → próxima 30/10
2. Vencimento 31/01, pagamento 15/01 → próxima 28/02 (ano não bissexto)
3. Vencimento 31/01, pagamento 15/01 → próxima 29/02 (ano bissexto)
4. Vencimento 15/12, pagamento 10/12 → próxima 15/01 (próximo ano)

## Implementation Details

### Ordem de Implementação
1. Corrigir função `visualizarComprovante()` com validações
2. Adicionar logs detalhados no modal de comprovante
3. Corrigir cálculo de data na função `marcarComoPaga()`
4. Adicionar logs no cálculo de próxima fatura
5. Testar ambas as funcionalidades

### Arquivos a Modificar
- `mvsat/app/pages/CobrancasPage.tsx` (função visualizarComprovante)
- `mvsat/cobrancas/cobrancas.functions.ts` (função marcarComoPaga)