import React, { useState } from 'react';
// import { 
//   useToastHelpers 
// } from '../../shared';

interface ConfiguracaoEmpresa {
  nomeEmpresa: string;
  cnpj: string;
  endereco: string;
  telefone: string;
  email: string;
  website: string;
}

interface ConfiguracaoSistema {
  timezone: string;
  idioma: string;
  formatoData: string;
  formatoMoeda: string;
  notificacoesEmail: boolean;
  notificacoesSMS: boolean;
  backupAutomatico: boolean;
}

export default function ConfiguracoesPage() {
  const [empresa, setEmpresa] = useState<ConfiguracaoEmpresa>({
    nomeEmpresa: 'MV SAT',
    cnpj: '12.345.678/0001-90',
    endereco: 'Rua das Flores, 123 - São Paulo, SP',
    telefone: '(11) 3333-4444',
    email: 'contato@mvsat.com',
    website: 'www.mvsat.com.br'
  });

  const [sistema, setSistema] = useState<ConfiguracaoSistema>({
    timezone: 'America/Sao_Paulo',
    idioma: 'pt-BR',
    formatoData: 'dd/MM/yyyy',
    formatoMoeda: 'BRL',
    notificacoesEmail: true,
    notificacoesSMS: false,
    backupAutomatico: true
  });

  // const { success, error } = useToastHelpers();

  const handleEmpresaChange = (field: keyof ConfiguracaoEmpresa, value: string) => {
    setEmpresa(prev => ({ ...prev, [field]: value }));
  };

  const handleSistemaChange = (field: keyof ConfiguracaoSistema, value: string | boolean) => {
    setSistema(prev => ({ ...prev, [field]: value }));
  };

  const salvarConfiguracoes = async () => {
    try {
      // Simular salvamento (substituir por chamadas reais da API)
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Configurações salvas com sucesso!');
    } catch (err) {
      console.error('Erro ao salvar:', err);
    }
  };

  const timezones = [
    { value: 'America/Sao_Paulo', label: 'São Paulo (UTC-3)' },
    { value: 'America/Manaus', label: 'Manaus (UTC-4)' },
    { value: 'America/Belem', label: 'Belém (UTC-3)' },
    { value: 'America/Fortaleza', label: 'Fortaleza (UTC-3)' }
  ];

  const idiomas = [
    { value: 'pt-BR', label: 'Português (Brasil)' },
    { value: 'en-US', label: 'English (US)' },
    { value: 'es-ES', label: 'Español' }
  ];

  const formatosData = [
    { value: 'dd/MM/yyyy', label: 'DD/MM/AAAA' },
    { value: 'MM/dd/yyyy', label: 'MM/DD/AAAA' },
    { value: 'yyyy-MM-dd', label: 'AAAA-MM-DD' }
  ];

  const formatosMoeda = [
    { value: 'BRL', label: 'Real (R$)' },
    { value: 'USD', label: 'Dólar ($)' },
    { value: 'EUR', label: 'Euro (€)' }
  ];

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
          Configurações
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
          Configurar sistema e informações da empresa
        </p>
      </div>

      {/* Configurações da Empresa */}
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
            Informações da Empresa
          </h2>
        </div>
        <div style={{ padding: '20px' }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: '20px' 
          }}>
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '500',
                color: 'var(--text-primary)'
              }}>
                Nome da Empresa
              </label>
              <input
                type="text"
                value={empresa.nomeEmpresa}
                onChange={(e) => handleEmpresaChange('nomeEmpresa', e.target.value)}
                placeholder="Nome da empresa"
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
                CNPJ
              </label>
              <input
                type="text"
                value={empresa.cnpj}
                onChange={(e) => handleEmpresaChange('cnpj', e.target.value)}
                placeholder="00.000.000/0000-00"
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
                Endereço
              </label>
              <input
                type="text"
                value={empresa.endereco}
                onChange={(e) => handleEmpresaChange('endereco', e.target.value)}
                placeholder="Endereço completo"
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
                Telefone
              </label>
              <input
                type="text"
                value={empresa.telefone}
                onChange={(e) => handleEmpresaChange('telefone', e.target.value)}
                placeholder="(00) 0000-0000"
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
                Email
              </label>
              <input
                type="email"
                value={empresa.email}
                onChange={(e) => handleEmpresaChange('email', e.target.value)}
                placeholder="contato@empresa.com"
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
                Website
              </label>
              <input
                type="text"
                value={empresa.website}
                onChange={(e) => handleEmpresaChange('website', e.target.value)}
                placeholder="www.empresa.com.br"
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
          </div>
        </div>
      </div>

      {/* Configurações do Sistema */}
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
            Configurações do Sistema
          </h2>
        </div>
        <div style={{ padding: '20px' }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: '20px' 
          }}>
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '500',
                color: 'var(--text-primary)'
              }}>
                Fuso Horário
              </label>
              <select
                value={sistema.timezone}
                onChange={(e) => handleSistemaChange('timezone', e.target.value)}
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
                {timezones.map(tz => (
                  <option key={tz.value} value={tz.value}>{tz.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '500',
                color: 'var(--text-primary)'
              }}>
                Idioma
              </label>
              <select
                value={sistema.idioma}
                onChange={(e) => handleSistemaChange('idioma', e.target.value)}
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
                {idiomas.map(lang => (
                  <option key={lang.value} value={lang.value}>{lang.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '500',
                color: 'var(--text-primary)'
              }}>
                Formato de Data
              </label>
              <select
                value={sistema.formatoData}
                onChange={(e) => handleSistemaChange('formatoData', e.target.value)}
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
                {formatosData.map(fmt => (
                  <option key={fmt.value} value={fmt.value}>{fmt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '500',
                color: 'var(--text-primary)'
              }}>
                Formato de Moeda
              </label>
              <select
                value={sistema.formatoMoeda}
                onChange={(e) => handleSistemaChange('formatoMoeda', e.target.value)}
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
                {formatosMoeda.map(fmt => (
                  <option key={fmt.value} value={fmt.value}>{fmt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Configurações de Notificações */}
          <div style={{ marginTop: '24px' }}>
            <h3 style={{ 
              margin: '0 0 16px 0', 
              fontSize: '1.25rem', 
              fontWeight: '600',
              color: 'var(--text-primary)'
            }}>
              Notificações
            </h3>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
              gap: '16px' 
            }}>
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={sistema.notificacoesEmail}
                  onChange={(e) => handleSistemaChange('notificacoesEmail', e.target.checked)}
                />
                <span style={{ color: 'var(--text-primary)' }}>
                  Notificações por Email
                </span>
              </label>

              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={sistema.notificacoesSMS}
                  onChange={(e) => handleSistemaChange('notificacoesSMS', e.target.checked)}
                />
                <span style={{ color: 'var(--text-primary)' }}>
                  Notificações por SMS
                </span>
              </label>

              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={sistema.backupAutomatico}
                  onChange={(e) => handleSistemaChange('backupAutomatico', e.target.checked)}
                />
                <span style={{ color: 'var(--text-primary)' }}>
                  Backup Automático
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Configurações de Segurança */}
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
            Segurança
          </h2>
        </div>
        <div style={{ padding: '20px' }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: '20px' 
          }}>
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '500',
                color: 'var(--text-primary)'
              }}>
                Sessão (minutos)
              </label>
              <input
                type="number"
                placeholder="30"
                defaultValue="30"
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
                Tentativas de Login
              </label>
              <input
                type="number"
                placeholder="5"
                defaultValue="5"
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
                Complexidade da Senha
              </label>
              <select 
                defaultValue="media"
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
                <option value="baixa">Baixa (6+ caracteres)</option>
                <option value="media">Média (8+ caracteres, números)</option>
                <option value="alta">Alta (10+ caracteres, números, símbolos)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Botões de Ação */}
      <div style={{ 
        display: 'flex', 
        gap: '16px', 
        justifyContent: 'flex-end',
        padding: '24px 0'
      }}>
        <button 
          onClick={() => {}} 
          style={{
            padding: '8px 16px',
            border: '1px solid var(--border-primary)',
            borderRadius: '6px',
            backgroundColor: 'transparent',
            color: 'var(--text-primary)',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          Restaurar Padrões
        </button>
        <button 
          onClick={salvarConfiguracoes}
          style={{
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
          Salvar Configurações
        </button>
      </div>
    </div>
  );
}
