# Modal de Nova Assinatura TV Box

Este modal permite criar novas assinaturas de TV Box no sistema MV SAT.

## Funcionalidades

- ✅ Criação de assinaturas com nome personalizado
- ✅ Configuração de status (Pendente, Ativa, Cancelada)
- ✅ Definição de login e senha
- ✅ Seleção de tipo de serviço (IPTV, SAT, Híbrido)
- ✅ Configuração de dia de renovação (obrigatório para assinaturas ativas)
- ✅ Gerenciamento de até 2 equipamentos por assinatura
- ✅ Configuração de NDS e MAC para cada equipamento
- ✅ Vinculação de clientes aos equipamentos
- ✅ Validação de campos obrigatórios
- ✅ Indicadores visuais de progresso

## Como Usar

### 1. Acessar o Modal
- Na página de TV Box, clique no botão **"➕ Nova Assinatura"** localizado na seção de filtros

### 2. Preencher Dados da Assinatura
- **Número da Assinatura***: Nome único para a assinatura (ex: "Assinatura 48")
- **Status**: Selecione o status inicial
- **Login***: Credencial de acesso (deve ser único)
- **Senha***: Senha de acesso
- **Tipo**: Selecione o tipo de serviço
- **Dia de Renovação**: Obrigatório se status for "Ativa"

**⚠️ Importante:** 
- Números de 1 a 47 já existem, use a partir de 48
- O sistema gera automaticamente o próximo número disponível
- Clique em "🔄 Gerar Próximo Número" para sugestão automática

### 3. Configurar Equipamentos
- **NDS**: Número de série do equipamento
- **MAC**: Endereço MAC do equipamento
- **Cliente**: Selecione um cliente ou deixe como "Disponível"

### 4. Salvar
- Clique em **"💾 Criar Assinatura"** para salvar
- O sistema validará os campos obrigatórios
- Após o sucesso, a lista será atualizada automaticamente

## Validações

- ✅ Nome da assinatura é obrigatório
- ✅ Login é obrigatório
- ✅ Senha é obrigatória
- ✅ Dia de renovação é obrigatório para assinaturas ativas
- ✅ Pelo menos um equipamento deve ter NDS e MAC configurados
- ✅ **Número da assinatura deve ser 48 ou maior** (1-47 já existem)
- ✅ **Assinatura não pode ser duplicada**
- ✅ **Login não pode ser duplicado**

## Estrutura dos Dados

```typescript
interface NovaAssinaturaTvBox {
  assinatura: string;           // Nome da assinatura
  status: 'ativa' | 'pendente' | 'cancelada';
  tipo: string;                 // IPTV, SAT, Híbrido
  login: string;                // Credencial de acesso
  senha: string;                // Senha de acesso
  renovacaoDia: number | null;  // Dia do mês para renovação
  equipamentos: {
    nds: string;                // Número de série
    mac: string;                // Endereço MAC
    cliente_id: string | null;  // ID do cliente vinculado
    cliente_nome: string;       // Nome do cliente
  }[];
}
```

## Integração

O modal está integrado à página principal de TV Box (`TvBoxPage.tsx`) e:

- Carrega automaticamente a lista de clientes disponíveis
- Atualiza a lista de assinaturas após criação
- Mantém o estado sincronizado com o Firestore
- Usa a coleção `tvbox_assinaturas` para persistência

## Arquivos Relacionados

- `NovaAssinaturaTvBoxModal.tsx` - Componente do modal
- `TvBoxPage.tsx` - Página principal que integra o modal
- `index.ts` - Exportações dos componentes
- `tvbox.functions.ts` - Funções auxiliares para TV Box
