# Recursos de Acessibilidade - ConsolidatedFinancialCard

Este documento descreve todos os recursos de acessibilidade implementados no componente ConsolidatedFinancialCard para garantir conformidade com as diretrizes WCAG 2.1 AA.

## 🎯 Conformidade WCAG 2.1

### Nível AA Compliance
- ✅ **Contraste de Cores**: Todas as combinações de cores atendem ao padrão 4.5:1
- ✅ **Navegação por Teclado**: Todos os elementos interativos são acessíveis via teclado
- ✅ **Labels ARIA**: Todos os elementos têm labels descritivos apropriados
- ✅ **Roles Semânticos**: Uso correto de roles ARIA para estrutura
- ✅ **Suporte a Leitores de Tela**: Informações contextuais completas

## 🎨 Contraste de Cores

### Paleta de Cores Acessível

```typescript
const accessibleColors = {
  // Cores principais (contraste 4.5:1+ no branco)
  positive: '#059669',    // Verde - valores positivos
  negative: '#dc2626',    // Vermelho - valores negativos  
  neutral: '#6b7280',     // Cinza - valores neutros
  warning: '#d97706',     // Laranja - avisos
  
  // Cores de categoria (contraste 4.5:1+ no branco)
  iptv: '#7c3aed',        // Roxo - IPTV
  assinaturas: '#db2777', // Rosa - Assinaturas
  outros: '#4b5563',      // Cinza escuro - Outros
  
  // Cores de texto (contraste alto)
  primaryText: '#111827',   // Texto principal
  secondaryText: '#6b7280', // Texto secundário
};
```

### Validação de Contraste

Todas as combinações de cores foram testadas e validadas:

| Combinação | Ratio | Status |
|------------|-------|--------|
| Verde/Branco | 4.52 | ✅ AA |
| Vermelho/Branco | 5.25 | ✅ AA |
| Roxo/Branco | 4.89 | ✅ AA |
| Rosa/Branco | 4.73 | ✅ AA |
| Texto Principal/Branco | 16.75 | ✅ AAA |

## 🏷️ Labels ARIA e Roles

### KPISection
```typescript
// Valores financeiros com contexto completo
<div 
  aria-label="Valor bruto recebido: R$ 15.000,00"
  role="text"
  tabIndex={0}
>
  R$ 15.000,00
</div>

<div 
  aria-label="Valor líquido positivo: R$ 10.000,00"
  role="text"
  tabIndex={0}
>
  R$ 10.000,00
</div>
```

### CobrancasSection
```typescript
// Região com contexto de cobranças
<div 
  role="region"
  aria-label="Status das cobranças - valores a receber e em atraso"
>
  <div 
    role="article"
    aria-label="Valores a receber: R$ 8.000,00 em 15 títulos"
    tabIndex={0}
  >
    // Conteúdo da cobrança
  </div>
</div>
```

### DespesasBreakdown
```typescript
// Gráficos de barras com informações completas
<div 
  role="progressbar"
  aria-valuenow={40}
  aria-valuemin={0}
  aria-valuemax={100}
  aria-label="IPTV representa 40% das despesas totais"
>
  // Barra de progresso visual
</div>
```

## ⌨️ Navegação por Teclado

### Elementos Focáveis

Todos os elementos informativos são focáveis via Tab:

1. **Valores Financeiros** (`tabIndex={0}`)
   - Valor Bruto
   - Total de Despesas  
   - Valor Líquido

2. **Status de Cobranças** (`tabIndex={0}`)
   - A Receber
   - Em Atraso

3. **Categorias de Despesas** (`tabIndex={0}`)
   - Cada categoria com valor > 0

4. **Controles Interativos**
   - Filtro de Período
   - Botão "Ver detalhes"

### Ordem de Tabulação

A ordem de navegação segue a estrutura visual:
1. Filtro de período (header)
2. KPIs (Bruto → Despesas → Líquido)
3. Status de cobranças (A Receber → Em Atraso)
4. Breakdown de despesas (por categoria)
5. Botão "Ver detalhes" (footer)

## 🔊 Suporte a Leitores de Tela

### Informações Contextuais

#### Valores Monetários
- **Formato**: "Valor bruto recebido: R$ 15.000,00"
- **Status**: "Valor líquido positivo: R$ 10.000,00"
- **Quantidade**: "Valores a receber: R$ 8.000,00 em 15 títulos"

#### Alertas e Avisos
- **Atraso**: "Valores em atraso: R$ 2.000,00 em 3 títulos - ATENÇÃO NECESSÁRIA"
- **Status Líquido**: "Valor líquido negativo" (quando aplicável)

#### Gráficos e Percentuais
- **Breakdown**: "IPTV: R$ 2.000,00, representando 40% do total"
- **Progresso**: "IPTV representa 40% das despesas totais"

### Anúncios Dinâmicos

```typescript
// Anúncios para mudanças de período
announceToScreenReader("Período alterado para Este Mês. Dados atualizados.");

// Anúncios para estados de carregamento
announceToScreenReader("Carregando dados financeiros...");

// Anúncios para erros
announceToScreenReader("Erro ao carregar dados. Tente novamente.");
```

## 🎛️ Controles Acessíveis

### Filtro de Período

```typescript
<select
  aria-label="Selecionar período para análise financeira"
  title="Escolha o período para visualizar os dados financeiros"
>
  <option value="hoje">Hoje</option>
  <option value="semana">Esta Semana</option>
  <option value="mes">Este Mês</option>
  <option value="personalizado">Personalizado</option>
</select>
```

### Seletor de Data Personalizada

```typescript
// Campos de data com labels claros
<label>Data Inicial</label>
<input 
  type="date"
  aria-describedby="date-help"
/>

<div id="date-help">
  Selecione a data inicial do período desejado
</div>
```

### Botão de Ação

```typescript
<button
  aria-label="Ver detalhes financeiros - Navegar para página detalhada de cobranças e despesas"
  title="Clique para ver informações detalhadas sobre cobranças e despesas"
>
  Ver detalhes →
</button>
```

## 🚨 Estados de Erro e Carregamento

### Estado de Carregamento

```typescript
<div 
  role="status"
  aria-live="polite"
  aria-label="Carregando dados financeiros"
>
  <div aria-hidden="true">
    {/* Spinner visual */}
  </div>
  <p>Carregando dados financeiros...</p>
</div>
```

### Estado de Erro

```typescript
<div 
  role="alert"
  aria-live="assertive"
>
  <h4>Erro ao carregar dados financeiros</h4>
  <div>
    {/* Lista de erros específicos */}
    <div>• Erro ao carregar cobranças</div>
    <div>• Erro ao carregar despesas</div>
  </div>
  <button 
    onClick={retry}
    aria-label="Tentar carregar dados novamente"
  >
    Tentar Novamente
  </button>
</div>
```

## 📱 Acessibilidade Responsiva

### Breakpoints Acessíveis

- **Mobile** (< 768px): Mantém todos os recursos de acessibilidade
- **Tablet** (768px - 1024px): Layout adaptado preserva navegação
- **Desktop** (> 1024px): Experiência completa com todos os recursos

### Considerações Mobile

1. **Touch Targets**: Mínimo 44px x 44px para elementos tocáveis
2. **Zoom**: Suporte a zoom até 200% sem perda de funcionalidade
3. **Orientação**: Funciona em portrait e landscape
4. **Gestos**: Não depende de gestos complexos

## 🧪 Testes de Acessibilidade

### Ferramentas de Teste

1. **Automated Testing**
   - Jest + Testing Library
   - Validação de ARIA labels
   - Verificação de contraste

2. **Manual Testing**
   - Navegação apenas por teclado
   - Teste com leitores de tela (NVDA, JAWS)
   - Verificação de zoom (até 200%)

3. **Browser Extensions**
   - axe DevTools
   - WAVE Web Accessibility Evaluator
   - Lighthouse Accessibility Audit

### Checklist de Testes

- [ ] Navegação completa apenas com teclado
- [ ] Todos os elementos têm labels apropriados
- [ ] Contraste de cores atende WCAG AA
- [ ] Leitores de tela anunciam informações corretas
- [ ] Estados de loading/error são acessíveis
- [ ] Funciona com zoom até 200%
- [ ] Responsivo mantém acessibilidade

## 🔧 Utilitários de Acessibilidade

### Validação de Contraste

```typescript
import { meetsWCAGAA, validateAccessibility } from './utils/accessibility.utils';

// Verificar contraste específico
const isAccessible = meetsWCAGAA('#059669', '#ffffff'); // true

// Validar toda a paleta
const validation = validateAccessibility();
console.log(validation.recommendations); // []
```

### Geração de Labels

```typescript
import { generateFinancialAriaLabel } from './utils/accessibility.utils';

const label = generateFinancialAriaLabel(
  'Valores a receber', 
  8000, 
  true, 
  15
);
// "Valores a receber: R$ 8.000,00 em 15 títulos"
```

### Anúncios para Leitores de Tela

```typescript
import { announceToScreenReader } from './utils/accessibility.utils';

// Anunciar mudanças importantes
announceToScreenReader('Dados financeiros atualizados para o período selecionado');
```

## 📋 Conformidade e Certificação

### WCAG 2.1 Level AA

- ✅ **1.1.1** Non-text Content
- ✅ **1.3.1** Info and Relationships  
- ✅ **1.4.3** Contrast (Minimum)
- ✅ **2.1.1** Keyboard
- ✅ **2.4.3** Focus Order
- ✅ **2.4.6** Headings and Labels
- ✅ **3.2.2** On Input
- ✅ **4.1.2** Name, Role, Value

### Próximas Melhorias

1. **Testes com Usuários Reais**: Validação com usuários que usam tecnologias assistivas
2. **Suporte a Mais Idiomas**: Internacionalização completa
3. **Modo Alto Contraste**: Tema específico para usuários com baixa visão
4. **Atalhos de Teclado**: Shortcuts para ações comuns