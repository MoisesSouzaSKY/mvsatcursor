import React, { useState, useEffect } from 'react';
// import { 
//   useToastHelpers 
// } from '../../shared';

interface Funcionario {
  id: string;
  nome: string;
  email: string;
  cargo: string;
  departamento: string;
  status: 'ativo' | 'inativo';
  dataAdmissao: string;
  telefone: string;
}

export default function FuncionariosPage() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartamento, setFilterDepartamento] = useState('');
  // const { success, error } = useToastHelpers();

  useEffect(() => {
    loadFuncionarios();
  }, []);

  const loadFuncionarios = async () => {
    try {
      setLoading(true);
      
      // Simular carregamento de dados (substituir por chamadas reais da API)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Dados mockados - substituir por dados reais
      const mockFuncionarios: Funcionario[] = [
        {
          id: '1',
          nome: 'João Silva',
          email: 'joao.silva@mvsat.com',
          cargo: 'Técnico de Campo',
          departamento: 'Técnico',
          status: 'ativo',
          dataAdmissao: '2023-01-15',
          telefone: '(11) 99999-9999'
        },
        {
          id: '2',
          nome: 'Maria Santos',
          email: 'maria.santos@mvsat.com',
          cargo: 'Atendente',
          departamento: 'Atendimento',
          status: 'ativo',
          dataAdmissao: '2023-03-20',
          telefone: '(11) 88888-8888'
        },
        {
          id: '3',
          nome: 'Pedro Costa',
          email: 'pedro.costa@mvsat.com',
          cargo: 'Supervisor',
          departamento: 'Administrativo',
          status: 'ativo',
          dataAdmissao: '2022-11-10',
          telefone: '(11) 77777-7777'
        },
        {
          id: '4',
          nome: 'Ana Oliveira',
          email: 'ana.oliveira@mvsat.com',
          cargo: 'Técnico de Campo',
          departamento: 'Técnico',
          status: 'inativo',
          dataAdmissao: '2023-06-05',
          telefone: '(11) 66666-6666'
        }
      ];
      
      setFuncionarios(mockFuncionarios);
      console.log('Funcionários carregados com sucesso!');
    } catch (err) {
      console.error('Erro ao carregar funcionários:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredFuncionarios = funcionarios.filter(funcionario => {
    const matchesSearch = funcionario.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         funcionario.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartamento = !filterDepartamento || funcionario.departamento === filterDepartamento;
    
    return matchesSearch && matchesDepartamento;
  });

  const departamentos = ['Técnico', 'Atendimento', 'Administrativo', 'Financeiro', 'Marketing'];

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '400px' 
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '32px', 
            height: '32px', 
            border: '3px solid #e5e7eb', 
            borderTop: '3px solid #3b82f6', 
            borderRadius: '50%', 
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px auto'
          }}></div>
          <p style={{ color: 'var(--text-secondary)' }}>Carregando funcionários...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div>
        <h1 style={{ 
          fontSize: '2rem', 
          fontWeight: '700', 
          color: 'var(--text-primary)', 
          marginBottom: '8px' 
        }}>
          Funcionários
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
          Gerenciar equipe e colaboradores
        </p>
      </div>

      {/* Filtros e Busca */}
      <div style={{
        backgroundColor: 'var(--surface-primary)',
        border: '1px solid var(--border-primary)',
        borderRadius: '8px',
        padding: '20px'
      }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '16px' 
        }}>
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: '500',
              color: 'var(--text-primary)'
            }}>
              Buscar
            </label>
            <input
              type="text"
              placeholder="Nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--border-primary)',
                borderRadius: '6px',
                backgroundColor: 'var(--surface-primary)',
                color: 'var(--text-primary)',
                fontSize: '14px'
              }}
            />
          </div>
          
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: '500',
              color: 'var(--text-primary)'
            }}>
              Departamento
            </label>
            <select
              value={filterDepartamento}
              onChange={(e) => setFilterDepartamento(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--border-primary)',
                borderRadius: '6px',
                backgroundColor: 'var(--surface-primary)',
                color: 'var(--text-primary)',
                fontSize: '14px'
              }}
            >
              <option value="">Todos os departamentos</option>
              {departamentos.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'end' }}>
            <button 
              onClick={() => {}} 
              style={{ 
                width: '100%',
                padding: '8px 16px',
                backgroundColor: 'var(--color-primary-600)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              + Novo Funcionário
            </button>
          </div>
        </div>
      </div>

      {/* Lista de Funcionários */}
      <div style={{
        backgroundColor: 'var(--surface-primary)',
        border: '1px solid var(--border-primary)',
        borderRadius: '8px',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '20px',
          borderBottom: '1px solid var(--border-primary)',
          backgroundColor: 'var(--surface-secondary)'
        }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '600' }}>
            Lista de Funcionários ({filteredFuncionarios.length})
          </h2>
        </div>
        <div style={{ padding: '20px' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse',
              fontSize: '0.875rem'
            }}>
              <thead>
                <tr style={{ 
                  borderBottom: '2px solid var(--border-primary)',
                  textAlign: 'left'
                }}>
                  <th style={{ padding: '12px', fontWeight: '600', color: 'var(--text-primary)' }}>Nome</th>
                  <th style={{ padding: '12px', fontWeight: '600', color: 'var(--text-primary)' }}>Cargo</th>
                  <th style={{ padding: '12px', fontWeight: '600', color: 'var(--text-primary)' }}>Departamento</th>
                  <th style={{ padding: '12px', fontWeight: '600', color: 'var(--text-primary)' }}>Status</th>
                  <th style={{ padding: '12px', fontWeight: '600', color: 'var(--text-primary)' }}>Data Admissão</th>
                  <th style={{ padding: '12px', fontWeight: '600', color: 'var(--text-primary)' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredFuncionarios.map((funcionario) => (
                  <tr key={funcionario.id} style={{ 
                    borderBottom: '1px solid var(--border-secondary)',
                    backgroundColor: funcionario.status === 'inativo' ? 'var(--color-gray-50)' : 'transparent'
                  }}>
                    <td style={{ padding: '12px' }}>
                      <div>
                        <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                          {funcionario.nome}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {funcionario.email}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px', color: 'var(--text-primary)' }}>
                      {funcionario.cargo}
                    </td>
                    <td style={{ padding: '12px', color: 'var(--text-primary)' }}>
                      {funcionario.departamento}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        backgroundColor: funcionario.status === 'ativo' 
                          ? 'var(--color-success-100)' 
                          : 'var(--color-error-100)',
                        color: funcionario.status === 'ativo' 
                          ? 'var(--color-success-700)' 
                          : 'var(--color-error-700)'
                      }}>
                        {funcionario.status === 'ativo' ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', color: 'var(--text-primary)' }}>
                      {new Date(funcionario.dataAdmissao).toLocaleDateString('pt-BR')}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button style={{
                          padding: '6px 12px',
                          border: '1px solid var(--border-primary)',
                          borderRadius: '4px',
                          backgroundColor: 'transparent',
                          color: 'var(--text-primary)',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}>
                          Editar
                        </button>
                        <button style={{
                          padding: '6px 12px',
                          border: '1px solid var(--color-error-500)',
                          borderRadius: '4px',
                          backgroundColor: 'transparent',
                          color: 'var(--color-error-500)',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}>
                          {funcionario.status === 'ativo' ? 'Desativar' : 'Ativar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
