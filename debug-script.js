console.log("🚀 Iniciando debug geral – Verificando todas as tabelas");

// Lista de tabelas que você deseja verificar
const tabelas = [
  "clientes",
  "equipamentos",
  "assinaturas", 
  "cobrancas",
  "funcionarios",
  "tvbox_assinaturas",
  "tvbox_equipamentos",
  "tvbox_pagamentos",
  "faturas",
  "custos_mensais",
  "empresa_configuracoes"
];

// Função para buscar e exibir dados de cada tabela
async function debugTabela(tabela) {
  try {
    const { data, error } = await supabase.from(tabela).select('*');

    if (error) {
      console.error(`❌ Erro na tabela '${tabela}':`, error);
    } else if (!data || data.length === 0) {
      console.warn(`⚠️ Tabela '${tabela}' está vazia.`);
    } else {
      console.log(`📊 Dados da tabela '${tabela}':`, data);
    }
  } catch (err) {
    console.error(`❗ Erro inesperado ao acessar tabela '${tabela}':`, err);
  }
}

// Executa debug para todas as tabelas
tabelas.forEach((tabela) => {
  debugTabela(tabela);
});