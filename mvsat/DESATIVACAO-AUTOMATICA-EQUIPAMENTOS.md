# Desativação Automática de Equipamentos

## Visão Geral

Este sistema implementa uma funcionalidade que automaticamente libera equipamentos quando um cliente é desativado. Isso garante que:

- ✅ Equipamentos não fiquem "presos" a clientes inativos
- ✅ Recursos sejam disponibilizados para novos clientes
- ✅ O inventário seja mantido atualizado
- ✅ Não haja perda de equipamentos

## Como Funciona

### 1. Desativação de Cliente

Quando um cliente é desativado através da interface:

1. **Status do cliente é alterado** para `'desativado'`
2. **Sistema busca automaticamente** todos os equipamentos associados ao cliente
3. **Equipamentos são liberados** com as seguintes alterações:
   - `cliente_id`: `null`
   - `cliente_nome`: `null`
   - `status`: `'disponivel'`
   - `dataUltimaAtualizacao`: Data atual
   - `cliente_anterior`: Nome do cliente desativado
   - `data_desativacao_cliente`: Data da desativação

### 2. Tipos de Equipamentos Suportados

O sistema libera automaticamente:

- **Equipamentos SKY** (coleção `equipamentos`)
- **TV Boxes** (coleção `tvbox`)

### 3. Processo de Liberação

```typescript
// Exemplo do processo automático
const handleConfirmarDesativacao = async () => {
  // 1. Desativa o cliente
  await updateDoc(doc(db, 'clientes', clienteId), {
    status: 'desativado',
    dataUltimaAtualizacao: new Date()
  });
  
  // 2. Busca e libera equipamentos
  const equipamentos = await getDocs(query(
    collection(db, 'equipamentos'),
    where('cliente_id', '==', clienteId)
  ));
  
  // 3. Atualiza status dos equipamentos
  equipamentos.docs.forEach(doc => {
    batch.update(doc.ref, {
      cliente_id: null,
      status: 'disponivel',
      // ... outros campos
    });
  });
};
```

## Interface do Usuário

### Modal de Confirmação

Ao tentar desativar um cliente, o sistema mostra:

- ⚠️ **Aviso** sobre a desativação
- 📋 **Informações** sobre o que acontece
- 🔄 **Processo automático** de liberação de equipamentos

### Feedback de Sucesso

Após a desativação, o usuário recebe:

- ✅ **Confirmação** da desativação
- 📊 **Contador** de equipamentos liberados
- 💡 **Informações** sobre disponibilidade

## Script de Verificação

### Executar Verificação Manual

Para verificar e corrigir equipamentos de clientes já desativados:

```bash
# Navegue para a pasta do projeto
cd mvsat

# Execute o script
node scripts/verificar-equipamentos-clientes-desativados.cjs
```

### O que o Script Faz

1. **Identifica** todos os clientes com status `'desativado'`
2. **Verifica** se eles ainda têm equipamentos associados
3. **Libera** automaticamente esses equipamentos
4. **Fornece** relatório detalhado da operação

### Exemplo de Saída

```
🔍 Iniciando verificação de equipamentos de clientes desativados...

📋 Buscando clientes desativados...
✅ Encontrados 3 clientes desativados

🔍 Verificando equipamentos do cliente: João Silva (ID: abc123)
  ✅ 2 equipamento(s) e 1 TV Box(es) liberados

🔍 Verificando equipamentos do cliente: Maria Santos (ID: def456)
  ℹ️ Nenhum equipamento encontrado para este cliente

📊 RESUMO DA OPERAÇÃO:
   • Clientes desativados verificados: 3
   • Equipamentos liberados: 2
   • TV Boxes liberadas: 1
   • Total de itens liberados: 3

✅ Todos os equipamentos de clientes desativados foram liberados com sucesso!
   Eles agora estão disponíveis para novos clientes.
```

## Campos Adicionados aos Equipamentos

### Novos Campos

- `cliente_anterior`: Nome do último cliente que usou o equipamento
- `data_desativacao_cliente`: Data em que o cliente foi desativado
- `observacao`: Nota sobre a liberação automática

### Campos Atualizados

- `status`: Muda para `'disponivel'`
- `cliente_id`: Limpo para `null`
- `cliente_nome`: Limpo para `null`
- `dataUltimaAtualizacao`: Atualizada para data atual

## Benefícios

### Para o Negócio

- 🎯 **Inventário sempre atualizado**
- 💰 **Melhor aproveitamento** dos recursos
- 📈 **Visibilidade** do status dos equipamentos
- 🔄 **Processo automatizado** sem intervenção manual

### Para os Usuários

- 🚀 **Interface intuitiva** com confirmações
- 📊 **Feedback claro** sobre as operações
- ⚡ **Processo rápido** e eficiente
- 🛡️ **Prevenção de erros** humanos

## Monitoramento

### Logs do Sistema

O sistema registra todas as operações:

```typescript
console.log(`✅ ${equipamentosSnap.size} equipamento(s) liberado(s) automaticamente`);
console.log(`✅ ${tvboxSnap.size} TV Box(es) liberada(s) automaticamente`);
```

### Histórico de Alterações

Cada equipamento liberado mantém:

- **Data da liberação**
- **Cliente anterior**
- **Motivo da liberação**
- **Status atual**

## Troubleshooting

### Problemas Comuns

1. **Equipamento não liberado**
   - Verifique se o `cliente_id` está correto
   - Confirme se o cliente foi realmente desativado

2. **Erro na operação em lote**
   - Verifique permissões do Firestore
   - Confirme se as coleções existem

3. **Equipamentos duplicados**
   - Execute o script de verificação
   - Verifique se há inconsistências no banco

### Soluções

- 🔍 **Execute o script** de verificação manual
- 📋 **Verifique logs** do console
- 🔧 **Confirme permissões** do Firebase
- 📞 **Entre em contato** com o suporte se necessário

## Manutenção

### Verificações Periódicas

Recomenda-se executar o script de verificação:

- 🗓️ **Mensalmente** para manutenção preventiva
- 🔄 **Após atualizações** do sistema
- 📊 **Para auditorias** de inventário

### Backup

Antes de executar operações em lote:

- 💾 **Faça backup** dos dados
- 📋 **Teste em ambiente** de desenvolvimento
- 🔒 **Confirme permissões** de escrita

## Conclusão

Esta funcionalidade garante que o sistema mantenha sempre um inventário atualizado e preciso, liberando automaticamente equipamentos de clientes desativados e disponibilizando-os para novos clientes de forma transparente e eficiente.
