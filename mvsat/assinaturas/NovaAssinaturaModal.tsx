import React, { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { getDb } from '../config/database.config';
import { Modal } from '../shared/components/ui/Modal';
import { Button } from '../shared/components/ui/Button';
import { Input } from '../shared/components/ui/Input';
import { formatPhoneNumber, normalizePhoneNumber, validatePhoneNumber } from '../shared/utils/phoneFormatter';

interface NovaAssinaturaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

interface NovaAssinatura {
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

export default function NovaAssinaturaModal({ isOpen, onClose, onSave }: NovaAssinaturaModalProps) {
  const [loading, setLoading] = useState(false);
  const [assinatura, setAssinatura] = useState<NovaAssinatura>({
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!assinatura.codigo || !assinatura.nomeCompleto || !assinatura.cpf) {
      alert('Por favor, preencha os campos obrigatórios (Código, Nome Completo e CPF)');
      return;
    }

    try {
      setLoading(true);
      await addDoc(collection(getDb(), 'assinaturas'), {
        ...assinatura,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      onSave();
      onClose();
      
      // Resetar formulário
      setAssinatura({
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
    } catch (error: any) {
      alert('Erro ao criar assinatura: ' + error.message);
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
      setAssinatura(prev => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof NovaAssinatura] as any),
          [child]: value
        }
      }));
    } else {
      setAssinatura(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Nova Assinatura"
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
              value={assinatura.codigo}
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
              value={assinatura.nomeCompleto}
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
                value={assinatura.cpf}
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
                value={assinatura.rg}
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
              value={assinatura.dataNascimento}
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
                value={assinatura.email}
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
                value={assinatura.telefone}
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
                value={assinatura.plano}
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
                value={assinatura.status}
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
                    value={assinatura.endereco.estado}
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
                    value={assinatura.endereco.cidade}
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
                    value={assinatura.endereco.bairro}
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
                    value={assinatura.endereco.cep}
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
                    value={assinatura.endereco.rua}
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
                    value={assinatura.endereco.numero}
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
            {loading ? 'Criando...' : 'Criar Assinatura'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
