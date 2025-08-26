import React, { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { getDb } from '../config/database.config';
import { Modal } from '../shared/components/ui/Modal';
import { Button } from '../shared/components/ui/Button';
import { Input } from '../shared/components/ui/Input';
import { formatPhoneNumber, normalizePhoneNumber, validatePhoneNumber } from '../shared/utils/phoneFormatter';

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
      size="xl"
    >
      <form onSubmit={handleSubmit} style={{ padding: '20px 0' }}>
        <div style={{ display: 'grid', gap: '20px' }}>
          {/* Código da Assinatura */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>
              Código da Assinatura*
            </label>
            <Input
              type="text"
              value={assinaturaEditavel.codigo}
              onChange={(e) => handleInputChange('codigo', e.target.value)}
              placeholder="Digite o código da assinatura"
              required
            />
          </div>

          {/* Nome Completo */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>
              Nome Completo*
            </label>
            <Input
              type="text"
              value={assinaturaEditavel.nomeCompleto}
              onChange={(e) => handleInputChange('nomeCompleto', e.target.value)}
              placeholder="Digite o nome completo"
              required
            />
          </div>

          {/* CPF e RG */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>
                CPF*
              </label>
              <Input
                type="text"
                value={assinaturaEditavel.cpf}
                onChange={(e) => handleInputChange('cpf', e.target.value)}
                placeholder="000.000.000-00"
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>
                RG
              </label>
              <Input
                type="text"
                value={assinaturaEditavel.rg}
                onChange={(e) => handleInputChange('rg', e.target.value)}
                placeholder="Digite o RG"
              />
            </div>
          </div>

          {/* Data de Nascimento */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>
              Data de Nascimento
            </label>
            <Input
              type="date"
              value={assinaturaEditavel.dataNascimento}
              onChange={(e) => handleInputChange('dataNascimento', e.target.value)}
            />
          </div>

          {/* E-mail e Telefone */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>
                E-mail
              </label>
              <Input
                type="email"
                value={assinaturaEditavel.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="exemplo@email.com"
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>
                Telefone
              </label>
              <Input
                type="tel"
                value={assinaturaEditavel.telefone}
                onChange={(e) => handleInputChange('telefone', e.target.value)}
                placeholder="(91) 98548-0800"
              />
            </div>
          </div>

          {/* Plano e Status */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>
                Plano
              </label>
              <select
                value={assinaturaEditavel.plano}
                onChange={(e) => handleInputChange('plano', e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  fontSize: '16px',
                  transition: 'all 0.3s ease',
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
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>
                Status
              </label>
              <select
                value={assinaturaEditavel.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  fontSize: '16px',
                  transition: 'all 0.3s ease',
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
          <div>
            <h4 style={{ 
              marginBottom: '16px', 
              fontSize: '18px', 
              fontWeight: '700', 
              color: '#374151',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              📍 Endereço Detalhado
            </h4>
            
            <div style={{ display: 'grid', gap: '16px' }}>
              {/* Estado e Cidade */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>
                    Estado
                  </label>
                  <Input
                    type="text"
                    value={assinaturaEditavel.endereco.estado}
                    onChange={(e) => handleInputChange('endereco.estado', e.target.value)}
                    placeholder="Digite o estado"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>
                    Cidade
                  </label>
                  <Input
                    type="text"
                    value={assinaturaEditavel.endereco.cidade}
                    onChange={(e) => handleInputChange('endereco.cidade', e.target.value)}
                    placeholder="Digite a cidade"
                  />
                </div>
              </div>

              {/* Bairro e CEP */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>
                    Bairro
                  </label>
                  <Input
                    type="text"
                    value={assinaturaEditavel.endereco.bairro}
                    onChange={(e) => handleInputChange('endereco.bairro', e.target.value)}
                    placeholder="Digite o bairro"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>
                    CEP
                  </label>
                  <Input
                    type="text"
                    value={assinaturaEditavel.endereco.cep}
                    onChange={(e) => handleInputChange('endereco.cep', e.target.value)}
                    placeholder="00000-000"
                  />
                </div>
              </div>

              {/* Rua e Número */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>
                    Rua
                  </label>
                  <Input
                    type="text"
                    value={assinaturaEditavel.endereco.rua}
                    onChange={(e) => handleInputChange('endereco.rua', e.target.value)}
                    placeholder="Digite a rua"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>
                    Número
                  </label>
                  <Input
                    type="text"
                    value={assinaturaEditavel.endereco.numero}
                    onChange={(e) => handleInputChange('endereco.numero', e.target.value)}
                    placeholder="Nº"
                  />
                </div>
              </div>

              {/* Ponto de Referência */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>
                  Ponto de Referência
                </label>
                <Input
                  type="text"
                  placeholder="Ex: Próximo à padaria Silva"
                />
              </div>
            </div>
          </div>
        </div>

        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          justifyContent: 'flex-end', 
          marginTop: '32px',
          paddingTop: '20px',
          borderTop: '1px solid #e5e7eb'
        }}>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            loading={loading}
            disabled={loading}
          >
            {loading ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
