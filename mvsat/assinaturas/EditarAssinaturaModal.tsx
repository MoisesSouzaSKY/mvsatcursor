import React, { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { getDb } from '../config/database.config';
import { Modal } from '../shared/components/ui/Modal';
import { Input } from '../shared/components/ui/Input';
import './NovaAssinaturaModal.css';

interface EditarAssinaturaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  assinatura: {
    id: string;
    codigo: string;
    nomeCompleto: string;
    cpf: string;
    rg: string;
    dataNascimento: string;
    email: string;
    telefone: string;
    plano: string;
    status: string;
    endereco: {
      estado: string;
      cidade: string;
      bairro: string;
      rua: string;
      numero: string;
      cep: string;
    };
  } | null;
}

interface AssinaturaEditavel {
  codigo: string;
  nomeCompleto: string;
  cpf: string;
  rg: string;
  dataNascimento: string;
  email: string;
  telefone: string;
  plano: string;
  status: string;
  endereco: {
    estado: string;
    cidade: string;
    bairro: string;
    rua: string;
    numero: string;
    cep: string;
  };
}

export default function EditarAssinaturaModal({ isOpen, onClose, onSave, assinatura }: EditarAssinaturaModalProps) {
  // Adicionar estilos CSS para animações
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideInRight {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);

  const [loading, setLoading] = useState(false);
  const [assinaturaEditavel, setAssinaturaEditavel] = useState<AssinaturaEditavel>({
    codigo: '',
    nomeCompleto: '',
    cpf: '',
    rg: '',
    dataNascimento: '',
    email: '',
    telefone: '',
    plano: 'Básico',
    status: 'Ativa',
    endereco: {
      estado: '',
      cidade: '',
      bairro: '',
      rua: '',
      numero: '',
      cep: ''
    }
  });

  // Atualiza o estado quando a assinatura muda
  useEffect(() => {
    if (assinatura) {
      setAssinaturaEditavel({
        codigo: assinatura.codigo || '',
        nomeCompleto: assinatura.nomeCompleto || '',
        cpf: assinatura.cpf || '',
        rg: assinatura.rg || '',
        dataNascimento: assinatura.dataNascimento || '',
        email: assinatura.email || '',
        telefone: assinatura.telefone || '',
        plano: assinatura.plano || 'Básico',
        status: assinatura.status || 'Ativa',
        endereco: {
          estado: assinatura.endereco?.estado || '',
          cidade: assinatura.endereco?.cidade || '',
          bairro: assinatura.endereco?.bairro || '',
          rua: assinatura.endereco?.rua || '',
          numero: assinatura.endereco?.numero || '',
          cep: assinatura.endereco?.cep || ''
        }
      });
    }
  }, [assinatura]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!assinatura || !assinaturaEditavel.codigo || !assinaturaEditavel.nomeCompleto || !assinaturaEditavel.cpf) {
      alert('Por favor, preencha os campos obrigatórios (Código, Nome Completo e CPF)');
      return;
    }

    try {
      setLoading(true);
      await updateDoc(doc(getDb(), 'assinaturas', assinatura.id), {
        ...assinaturaEditavel,
        updatedAt: new Date()
      });
      
      onSave();
      onClose();
    } catch (error: any) {
      alert('Erro ao atualizar assinatura: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    // Formatação automática para campos de telefone
    if (field === 'telefone') {
      // Remove formatação existente e aplica nova
      const cleaned = value.replace(/\D/g, '');
      if (cleaned.length <= 11) {
        // Aplica formatação apenas se não exceder 11 dígitos
        if (cleaned.length === 11) {
          value = `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
        } else if (cleaned.length === 10) {
          value = `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
        } else if (cleaned.length >= 2) {
          value = `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
        } else if (cleaned.length === 1) {
          value = `(${cleaned}`;
        }
      }
    }

    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setAssinaturaEditavel(prev => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof AssinaturaEditavel] as any),
          [child]: value
        }
      }));
    } else {
      setAssinaturaEditavel(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  if (!assinatura) return null;

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Editar Dados da Assinatura"
      size="lg"
    >
      <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
            {/* Identificação */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '6px', 
                  fontSize: '12px', 
                  fontWeight: '600', 
                  color: '#374151' 
                }}>
                  Código da Assinatura*
                </label>
                <Input
                  type="text"
                  value={assinaturaEditavel.codigo}
                  onChange={(e) => handleInputChange('codigo', e.target.value)}
                  placeholder="Digite o código"
                  required
                  style={{ height: '36px', width: '100%' }}
                />
              </div>
            </div>

            {/* Nome Completo */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '6px', 
                fontSize: '12px', 
                fontWeight: '600', 
                color: '#374151' 
              }}>
                Nome Completo*
              </label>
              <Input
                type="text"
                value={assinaturaEditavel.nomeCompleto}
                onChange={(e) => handleInputChange('nomeCompleto', e.target.value)}
                placeholder="Digite o nome completo"
                required
                style={{ height: '36px', width: '100%' }}
              />
            </div>

            {/* CPF e RG */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '12px',
              marginBottom: '20px'
            }}>
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '6px', 
                  fontSize: '12px', 
                  fontWeight: '600', 
                  color: '#374151' 
                }}>
                  CPF*
                </label>
                <Input
                  type="text"
                  value={assinaturaEditavel.cpf}
                  onChange={(e) => handleInputChange('cpf', e.target.value)}
                  placeholder="000.000.000-00"
                  required
                  style={{ height: '36px', width: '100%' }}
                />
              </div>
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '6px', 
                  fontSize: '12px', 
                  fontWeight: '600', 
                  color: '#374151' 
                }}>
                  RG
                </label>
                <Input
                  type="text"
                  value={assinaturaEditavel.rg}
                  onChange={(e) => handleInputChange('rg', e.target.value)}
                  placeholder="Digite o RG"
                  style={{ height: '36px', width: '100%' }}
                />
              </div>
            </div>

            {/* Data de Nascimento */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '6px', 
                fontSize: '12px', 
                fontWeight: '600', 
                color: '#374151' 
              }}>
                Data de Nascimento
              </label>
              <Input
                type="date"
                value={assinaturaEditavel.dataNascimento}
                onChange={(e) => handleInputChange('dataNascimento', e.target.value)}
                style={{ height: '36px', width: '100%' }}
              />
            </div>

            {/* E-mail */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '6px', 
                fontSize: '12px', 
                fontWeight: '600', 
                color: '#374151' 
              }}>
                E-mail
              </label>
              <Input
                type="email"
                value={assinaturaEditavel.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="exemplo@email.com"
                style={{ height: '36px', width: '100%' }}
              />
            </div>

            {/* Telefone */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '6px', 
                fontSize: '12px', 
                fontWeight: '600', 
                color: '#374151' 
              }}>
                Telefone
              </label>
              <Input
                type="tel"
                value={assinaturaEditavel.telefone}
                onChange={(e) => handleInputChange('telefone', e.target.value)}
                placeholder="(00) 00000-0000"
                style={{ height: '36px', width: '100%' }}
              />
            </div>

            {/* Plano e Status */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '12px',
              marginBottom: '20px'
            }}>
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '6px', 
                  fontSize: '12px', 
                  fontWeight: '600', 
                  color: '#374151' 
                }}>
                  Plano
                </label>
                <select
                  value={assinaturaEditavel.plano}
                  onChange={(e) => handleInputChange('plano', e.target.value)}
                  style={{
                    width: '100%',
                    height: '36px',
                    padding: '0 12px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '14px',
                    outline: 'none',
                    backgroundColor: 'white'
                  }}
                >
                  <option value="Básico">Básico</option>
                  <option value="Premium">Premium</option>
                  <option value="VIP">VIP</option>
                  <option value="Personalizado">Personalizado</option>
                </select>
              </div>
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '6px', 
                  fontSize: '12px', 
                  fontWeight: '600', 
                  color: '#374151' 
                }}>
                  Status
                </label>
                <select
                  value={assinaturaEditavel.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  style={{
                    width: '100%',
                    height: '36px',
                    padding: '0 12px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '14px',
                    outline: 'none',
                    backgroundColor: 'white'
                  }}
                >
                  <option value="Ativa">Ativa</option>
                  <option value="Inativa">Inativa</option>
                  <option value="Suspensa">Suspensa</option>
                  <option value="Cancelada">Cancelada</option>
                </select>
              </div>
            </div>

            {/* Endereço Detalhado */}
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ 
                marginBottom: '12px', 
                fontSize: '14px', 
                fontWeight: '600', 
                color: '#374151',
                borderBottom: '1px solid #e5e7eb',
                paddingBottom: '6px'
              }}>
                Endereço Detalhado
              </h4>
              
              {/* Estado e Cidade */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 2fr', 
                gap: '12px',
                marginBottom: '12px'
              }}>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '6px', 
                    fontSize: '12px', 
                    fontWeight: '600', 
                    color: '#374151' 
                  }}>
                    Estado
                  </label>
                  <Input
                    type="text"
                    value={assinaturaEditavel.endereco.estado}
                    onChange={(e) => handleInputChange('endereco.estado', e.target.value)}
                    placeholder="Digite o estado"
                    style={{ height: '36px', width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '6px', 
                    fontSize: '12px', 
                    fontWeight: '600', 
                    color: '#374151' 
                  }}>
                    Cidade
                  </label>
                  <Input
                    type="text"
                    value={assinaturaEditavel.endereco.cidade}
                    onChange={(e) => handleInputChange('endereco.cidade', e.target.value)}
                    placeholder="Digite a cidade"
                    style={{ height: '36px', width: '100%' }}
                  />
                </div>
              </div>

              {/* Bairro */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '6px', 
                  fontSize: '12px', 
                  fontWeight: '600', 
                  color: '#374151' 
                }}>
                  Bairro
                </label>
                <Input
                  type="text"
                  value={assinaturaEditavel.endereco.bairro}
                  onChange={(e) => handleInputChange('endereco.bairro', e.target.value)}
                  placeholder="Digite o bairro"
                  style={{ height: '36px', width: '100%' }}
                />
              </div>

              {/* Rua */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '6px', 
                  fontSize: '12px', 
                  fontWeight: '600', 
                  color: '#374151' 
                }}>
                  Rua
                </label>
                <Input
                  type="text"
                  value={assinaturaEditavel.endereco.rua}
                  onChange={(e) => handleInputChange('endereco.rua', e.target.value)}
                  placeholder="Digite a rua"
                  style={{ height: '36px', width: '100%' }}
                />
              </div>

              {/* Número e CEP */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: '12px',
                marginBottom: '12px'
              }}>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '6px', 
                    fontSize: '12px', 
                    fontWeight: '600', 
                    color: '#374151' 
                  }}>
                    Número
                  </label>
                  <Input
                    type="text"
                    value={assinaturaEditavel.endereco.numero}
                    onChange={(e) => handleInputChange('endereco.numero', e.target.value)}
                    placeholder="Nº"
                    style={{ height: '36px', width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '6px', 
                    fontSize: '12px', 
                    fontWeight: '600', 
                    color: '#374151' 
                  }}>
                    CEP
                  </label>
                  <Input
                    type="text"
                    value={assinaturaEditavel.endereco.cep}
                    onChange={(e) => handleInputChange('endereco.cep', e.target.value)}
                    placeholder="00000-000"
                    style={{ height: '36px', width: '100%' }}
                  />
                </div>
              </div>

              {/* Ponto de Referência */}
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '6px', 
                  fontSize: '12px', 
                  fontWeight: '600', 
                  color: '#374151' 
                }}>
                  Ponto de Referência
                </label>
                <Input
                  type="text"
                  placeholder="Ex: Próximo à padaria Silva"
                  style={{ height: '36px', width: '100%' }}
                />
              </div>
            </div>

        {/* Botões de Ação */}
        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          justifyContent: 'flex-end', 
          marginTop: '24px',
          paddingTop: '16px',
          borderTop: '1px solid #e5e7eb'
        }}>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{
              height: '36px',
              padding: '0 20px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              backgroundColor: 'white',
              color: '#6b7280',
              fontSize: '14px',
              fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            style={{
              height: '36px',
              padding: '0 20px',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: loading ? '#9ca3af' : '#3b82f6',
              color: 'white',
              fontSize: '14px',
              fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {loading && (
              <div style={{
                width: '14px',
                height: '14px',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                borderTop: '2px solid white',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
            )}
            {loading ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </form>
    </Modal>
  );
}