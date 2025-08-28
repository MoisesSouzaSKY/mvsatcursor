import React, { useState } from 'react';
import EnhancedButton from './EnhancedButton';

interface NovaDespesaData {
  descricao: string;
  valor: number;
  dataVencimento: string;
  categoria: string;
  origemTipo: string;
  origemNome: string;
  observacoes?: string;
  nomeMotoBoy?: string;
  descricaoOutros?: string;
}

interface NovaDespesaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: NovaDespesaData) => void;
  loading?: boolean;
}

const NovaDespesaModal: React.FC<NovaDespesaModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  loading = false
}) => {
  const [formData, setFormData] = useState<NovaDespesaData>({
    descricao: '',
    valor: 0,
    dataVencimento: '',
    categoria: '',
    origemTipo: '',
    origemNome: '',
    observacoes: '',
    nomeMotoBoy: '',
    descricaoOutros: ''
  });

  const [errors, setErrors] = useState<Partial<NovaDespesaData>>({});

  const handleInputChange = (field: keyof NovaDespesaData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Limpar erro do campo quando usuário começa a digitar
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<NovaDespesaData> = {};

    if (!formData.descricao.trim()) {
      newErrors.descricao = 'Descrição é obrigatória';
    }

    if (formData.valor <= 0) {
      newErrors.valor = 'Valor deve ser maior que zero';
    }

    if (!formData.dataVencimento) {
      newErrors.dataVencimento = 'Data de vencimento é obrigatória';
    }

    // Validação específica para Moto boy
    if (formData.descricao === 'Moto boy' && !formData.nomeMotoBoy?.trim()) {
      newErrors.nomeMotoBoy = 'Nome do moto boy é obrigatório';
    }

    // Validação específica para Outros
    if (formData.descricao === 'Outros' && !formData.descricaoOutros?.trim()) {
      newErrors.descricaoOutros = 'Descrição é obrigatória';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      // Preparar dados para envio
      const dadosParaEnvio = {
        ...formData,
        // Se for "Moto boy", usar o nome do moto boy como descrição final
        descricao: formData.descricao === 'Moto boy' 
          ? `Moto boy - ${formData.nomeMotoBoy || ''}` 
          : formData.descricao === 'Outros' 
            ? formData.descricaoOutros || '' 
            : formData.descricao
      };
      
      onConfirm(dadosParaEnvio);
    }
  };

  const handleClose = () => {
    setFormData({
      descricao: '',
      valor: 0,
      dataVencimento: '',
      categoria: '',
      origemTipo: '',
      origemNome: '',
      observacoes: '',
      nomeMotoBoy: '',
      descricaoOutros: ''
    });
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '32px',
        maxWidth: '600px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        position: 'relative'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '24px',
            fontWeight: '700',
            color: '#111827',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span style={{ fontSize: '28px' }}>➕</span>
            Nova Despesa
          </h2>
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#6b7280',
              padding: '4px',
              borderRadius: '4px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f3f4f6';
              e.currentTarget.style.color = '#374151';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#6b7280';
            }}
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <div style={{ marginBottom: '24px' }}>
          {/* Descrição */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '8px'
            }}>
              Descrição *
            </label>
            <select
              value={formData.descricao}
              onChange={(e) => handleInputChange('descricao', e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: errors.descricao ? '1px solid #ef4444' : '1px solid #d1d5db',
                fontSize: '14px',
                backgroundColor: 'white',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                transition: 'all 0.2s ease',
                outline: 'none',
                cursor: 'pointer'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#1e3a8a';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(30, 58, 138, 0.1)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = errors.descricao ? '#ef4444' : '#d1d5db';
                e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
              }}
            >
              <option value="">Selecione uma descrição</option>
              <option value="Moto boy">Moto boy</option>
              <option value="Envio barco">Envio barco</option>
              <option value="Renovação IPTV">Renovação IPTV</option>
              <option value="Fatura SKY">Fatura SKY</option>
              <option value="Outros">Outros</option>
            </select>
            {errors.descricao && (
              <p style={{
                margin: '4px 0 0 0',
                fontSize: '12px',
                color: '#ef4444'
              }}>
                {errors.descricao}
              </p>
            )}
          </div>

          {/* Campo condicional para Nome do Moto Boy */}
          {formData.descricao === 'Moto boy' && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Nome do Moto Boy *
              </label>
              <input
                type="text"
                value={formData.nomeMotoBoy}
                onChange={(e) => handleInputChange('nomeMotoBoy', e.target.value)}
                placeholder="Digite o nome do moto boy..."
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: errors.nomeMotoBoy ? '1px solid #ef4444' : '1px solid #d1d5db',
                  fontSize: '14px',
                  backgroundColor: 'white',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                  transition: 'all 0.2s ease',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#1e3a8a';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(30, 58, 138, 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = errors.nomeMotoBoy ? '#ef4444' : '#d1d5db';
                  e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
                }}
              />
              {errors.nomeMotoBoy && (
                <p style={{
                  margin: '4px 0 0 0',
                  fontSize: '12px',
                  color: '#ef4444'
                }}>
                  {errors.nomeMotoBoy}
                </p>
              )}
            </div>
          )}

          {/* Campo condicional para Descrição de Outros */}
          {formData.descricao === 'Outros' && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Descrição da Despesa *
              </label>
              <input
                type="text"
                value={formData.descricaoOutros}
                onChange={(e) => handleInputChange('descricaoOutros', e.target.value)}
                placeholder="Digite a descrição da despesa..."
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: errors.descricaoOutros ? '1px solid #ef4444' : '1px solid #d1d5db',
                  fontSize: '14px',
                  backgroundColor: 'white',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                  transition: 'all 0.2s ease',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#1e3a8a';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(30, 58, 138, 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = errors.descricaoOutros ? '#ef4444' : '#d1d5db';
                  e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
                }}
              />
              {errors.descricaoOutros && (
                <p style={{
                  margin: '4px 0 0 0',
                  fontSize: '12px',
                  color: '#ef4444'
                }}>
                  {errors.descricaoOutros}
                </p>
              )}
            </div>
          )}

          {/* Valor e Data de Vencimento */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
            marginBottom: '20px'
          }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Valor (R$) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.valor}
                onChange={(e) => handleInputChange('valor', parseFloat(e.target.value) || 0)}
                placeholder="0,00"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: errors.valor ? '1px solid #ef4444' : '1px solid #d1d5db',
                  fontSize: '14px',
                  backgroundColor: 'white',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                  transition: 'all 0.2s ease',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#1e3a8a';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(30, 58, 138, 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = errors.valor ? '#ef4444' : '#d1d5db';
                  e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
                }}
              />
              {errors.valor && (
                <p style={{
                  margin: '4px 0 0 0',
                  fontSize: '12px',
                  color: '#ef4444'
                }}>
                  {errors.valor}
                </p>
              )}
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Data de Vencimento *
              </label>
              <input
                type="date"
                value={formData.dataVencimento}
                onChange={(e) => handleInputChange('dataVencimento', e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: errors.dataVencimento ? '1px solid #ef4444' : '1px solid #d1d5db',
                  fontSize: '14px',
                  backgroundColor: 'white',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                  transition: 'all 0.2s ease',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#1e3a8a';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(30, 58, 138, 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = errors.dataVencimento ? '#ef4444' : '#d1d5db';
                  e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
                }}
              />
              {errors.dataVencimento && (
                <p style={{
                  margin: '4px 0 0 0',
                  fontSize: '12px',
                  color: '#ef4444'
                }}>
                  {errors.dataVencimento}
                </p>
              )}
            </div>
          </div>

          {/* Status sempre pago - Informação */}
          <div style={{
            backgroundColor: '#f0f9ff',
            border: '1px solid #0ea5e9',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ fontSize: '16px' }}>✅</span>
              <span style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#0369a1'
              }}>
                Status: Sempre definido como "Pago"
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end'
        }}>
          <EnhancedButton
            variant="secondary"
            size="md"
            onClick={handleClose}
            disabled={loading}
          >
            Cancelar
          </EnhancedButton>
          <EnhancedButton
            variant="success"
            size="md"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Salvando...' : 'Confirmar'}
          </EnhancedButton>
        </div>
      </div>
    </div>
  );
};

export default NovaDespesaModal;
