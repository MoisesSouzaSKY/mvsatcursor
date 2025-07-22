export interface DatabaseTables {
  // Clientes
  clientes: {
    id: string;
    nome: string;
    documento?: string;
    rg?: string;
    email?: string;
    telefone?: string;
    telefone_secundario?: string;
    endereco?: string;
    bairro?: string;
    data_nascimento?: string;
    tipo_cliente?: string;
    responsavel?: string;
    status?: string;
    user_id: string;
    created_at: Date;
    updated_at: Date;
  };

  // Assinaturas
  assinaturas: {
    id: string;
    cliente_id?: string;
    codigo_assinatura?: string;
    plano: string;
    valor: number;
    data_inicio: Date;
    data_fim?: Date;
    status?: string;
    observacoes?: string;
    user_id: string;
    created_at: Date;
    updated_at: Date;
  };

  // Equipamentos
  equipamentos: {
    id: string;
    numero_nds: string;
    smart_card: string;
    status_aparelho: string;
    cliente_atual_id?: string;
    assinatura_id?: string;
    problema?: string;
    descricao_problema?: string;
    revendedor_responsavel?: string;
    com_quem_esta?: string;
    user_id: string;
    created_at: Date;
    updated_at: Date;
  };

  // Cobranças
  cobrancas: {
    id: string;
    cliente_id?: string;
    assinatura_id?: string;
    valor: number;
    valor_recebido?: number;
    data_vencimento: Date;
    data_pagamento?: Date;
    status?: string;
    tipo?: string;
    metodo_pagamento?: string;
    detalhes_pagamento?: string;
    comprovante_url?: string;
    status_observacao?: string;
    observacoes?: string;
    user_id: string;
    created_at: Date;
    updated_at: Date;
  };

  // Funcionários
  funcionarios: {
    id: string;
    nome: string;
    email?: string;
    telefone?: string;
    cargo?: string;
    salario?: number;
    data_admissao?: Date;
    status?: string;
    login_sistema?: string;
    senha_sistema?: string;
    ativo_sistema?: boolean;
    is_admin?: boolean;
    user_id: string;
    created_at: Date;
    updated_at: Date;
  };

  // Permissões de Funcionários
  funcionario_permissoes: {
    id: string;
    funcionario_id: string;
    modulo: string;
    permissao: string;
    ativo: boolean;
    criado_por?: string;
    user_id: string;
    created_at: Date;
    updated_at: Date;
  };

  // Logs de Funcionários
  funcionario_logs: {
    id: string;
    funcionario_id?: string;
    acao: string;
    tabela_afetada?: string;
    registro_id?: string;
    detalhes?: any;
    ip_address?: string;
    user_agent?: string;
    user_id: string;
    created_at: Date;
  };

  // TV Box Assinaturas
  tvbox_assinaturas: {
    id: string;
    cliente_id?: string;
    nome?: string;
    login: string;
    senha: string;
    data_renovacao: Date;
    status: string;
    observacoes?: string;
    user_id: string;
    created_at: Date;
    updated_at: Date;
  };

  // TV Box Equipamentos
  tvbox_equipamentos: {
    id: string;
    mac_address: string;
    serial_number: string;
    id_aparelho?: string;
    assinatura_id?: string;
    atualizacao_feita: boolean;
    user_id: string;
    created_at: Date;
    updated_at: Date;
  };

  // TV Box Pagamentos
  tvbox_pagamentos: {
    id: string;
    assinatura_id: string;
    valor: number;
    data_pagamento: Date;
    forma_pagamento: string;
    status: string;
    comprovante_url?: string;
    observacoes?: string;
    user_id: string;
    created_at: Date;
    updated_at: Date;
  };

  // Faturas
  faturas: {
    id: string;
    assinatura_id: string;
    mes_referencia: string;
    data_geracao: Date;
    data_corte: Date;
    data_vencimento: Date;
    data_pagamento?: Date;
    valor: number;
    status: string;
    metodo_pagamento?: string;
    observacoes?: string;
    user_id: string;
    created_at: Date;
    updated_at: Date;
  };

  // Custos Mensais
  custos_mensais: {
    id: string;
    descricao: string;
    tipo_custo: string;
    valor: number;
    mes_referencia: string;
    data_vencimento?: Date;
    status: string;
    observacoes?: string;
    user_id: string;
    created_at: Date;
    updated_at: Date;
  };

  // Histórico de Equipamentos
  equipamento_historico: {
    id: string;
    equipamento_id?: string;
    cliente_id?: string;
    assinatura_id?: string;
    status: string;
    data_inicio: Date;
    data_fim?: Date;
    observacoes?: string;
    user_id: string;
    created_at: Date;
    updated_at: Date;
  };

  // Configurações da Empresa
  empresa_configuracoes: {
    id: string;
    nome_empresa?: string;
    logo_url?: string;
    whatsapp_empresa?: string;
    mensagem_padrao?: string;
    tema_cores?: any;
    tema_imagem_url?: string;
    user_id: string;
    created_at: Date;
    updated_at: Date;
  };

  // Profiles
  profiles: {
    id: string;
    user_id: string;
    nome?: string;
    email?: string;
    permissoes?: string[];
    created_at: Date;
    updated_at: Date;
  };
}

// Tipos para autenticação de funcionários
export interface EmployeeUser {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  permissions: string[];
  type: 'employee';
  ownerId: string;
  login?: string;
  password?: string;
  lastUpdated?: string;
}

// Tipos para Context de autenticação
export interface EmployeeContext {
  employee_id: string;
  employee_name: string;
  employee_email: string;
  is_admin: boolean;
  permissions: string[];
  owner_id: string;
}

export type CollectionName = keyof DatabaseTables;
export type DocumentData<T extends CollectionName> = DatabaseTables[T]; 