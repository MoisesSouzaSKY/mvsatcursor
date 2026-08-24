import React from 'react';
import { criarCliente } from './clientes.functions';
import { formatPhoneNumber, normalizePhoneNumber, validatePhoneNumber } from '../shared/utils/phoneFormatter';
import { buscarEnderecoPorCEP, formatCEP, applyCEPMask } from '../shared/services/cepService';
import { formatCpfCnpj, validateCPF, validateCNPJ } from '../shared/utils/documentFormatter';
import { formatNomePadrao } from '../shared/utils/nameFormatter';

interface NovoClienteData {
  nomeCompleto: string;
  telefone: string;
  telefoneSecundario: string;
  email: string;
  dataNascimento: string;
  cpf: string;
  rg: string;
  documentoFrente: File | null;
  documentoVerso: File | null;
  endereco: {
    rua: string;
    numero: string;
    bairro: string;
    cidade: string;
    estado: string;
    cep: string;
    pontoReferencia: string;
  };
  pessoasReferencia: {
    nome1: string;
    telefone1: string;
    parentesco1: string;
    nome2: string;
    telefone2: string;
    parentesco2: string;
  };
}

interface NovoClienteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export default function NovoClienteModal({ isOpen, onClose, onSave }: NovoClienteModalProps) {
  // Adicionar estilos CSS para animações
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        from { transform: translateY(-50%) rotate(0deg); }
        to { transform: translateY(-50%) rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);

  const [formData, setFormData] = React.useState<NovoClienteData>({
    nomeCompleto: '',
    telefone: '',
    telefoneSecundario: '',
    email: '',
    dataNascimento: '',
    cpf: '',
    rg: '',
    documentoFrente: null,
    documentoVerso: null,
    endereco: {
      rua: '',
      numero: '',
      bairro: '',
      cidade: '',
      estado: '',
      cep: '',
      pontoReferencia: ''
    },
    pessoasReferencia: {
      nome1: '',
      telefone1: '',
      parentesco1: '',
      nome2: '',
      telefone2: '',
      parentesco2: ''
    }
  });
  const [loading, setLoading] = React.useState(false);
  const [buscandoCEP, setBuscandoCEP] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const handleInputChange = (field: string, value: string) => {
    // Limpar erro do campo quando o usuário começa a digitar
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Formatação automática para campos de telefone (padrão brasileiro com 9 dígitos)
    if (field === 'telefone' || field === 'telefoneSecundario' || field === 'pessoasReferencia.telefone1' || field === 'pessoasReferencia.telefone2') {
      const cleaned = value.replace(/\D/g, '');
      
      // Limita a 11 dígitos (DDD + 9 números)
      if (cleaned.length <= 11) {
        if (cleaned.length === 11) {
          // Formato: (XX) 9XXXX-XXXX
          value = `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
        } else if (cleaned.length === 10) {
          // Adiciona o 9 automaticamente: (XX) 9XXXX-XXXX
          value = `(${cleaned.slice(0, 2)}) 9${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
        } else if (cleaned.length >= 2) {
          value = `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
        } else if (cleaned.length === 1) {
          value = `(${cleaned}`;
        }
      } else {
        // Se excedeu 11 dígitos, mantém apenas os primeiros 11
        const limited = cleaned.slice(0, 11);
        value = `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`;
      }
    }

    // Formatação automática para CPF
    if (field === 'cpf') {
      const cleaned = value.replace(/\D/g, '');
      
      // Limita a 11 dígitos para CPF
      if (cleaned.length <= 11) {
        value = formatCpfCnpj(cleaned);
      } else {
        // Se excedeu 11 dígitos, mantém apenas os primeiros 11
        value = formatCpfCnpj(cleaned.slice(0, 11));
      }
    }

    // Formatação automática para CEP
    if (field === 'endereco.cep') {
      const cleaned = value.replace(/\D/g, '');
      
      // Limita a 8 dígitos para CEP
      if (cleaned.length <= 8) {
        value = applyCEPMask(cleaned);
        
        // Busca endereço automaticamente quando CEP está completo
        if (cleaned.length === 8) {
          buscarCEP(cleaned);
        }
      } else {
        // Se excedeu 8 dígitos, mantém apenas os primeiros 8
        value = applyCEPMask(cleaned.slice(0, 8));
      }
    }

    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof NovoClienteData] as any),
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleFileChange = (field: 'documentoFrente' | 'documentoVerso', event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validar tipo de arquivo (apenas imagens)
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({ ...prev, [field]: 'Por favor, selecione apenas arquivos de imagem (JPG, PNG, etc.)' }));
        return;
      }
      
      // Validar tamanho do arquivo (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, [field]: 'O arquivo deve ter no máximo 5MB' }));
        return;
      }
      
      // Limpar erro se existir
      if (errors[field]) {
        setErrors(prev => ({ ...prev, [field]: '' }));
      }
      
      setFormData(prev => ({
        ...prev,
        [field]: file
      }));
    }
  };

  const buscarCEP = async (cep: string) => {
    const cepLimpo = cep.replace(/\D/g, '');
    
    if (cepLimpo.length === 8) {
      setBuscandoCEP(true);
      try {
        const endereco = await buscarEnderecoPorCEP(cepLimpo);
        if (endereco) {
          setFormData(prev => ({
            ...prev,
            endereco: {
              ...prev.endereco,
              cep: endereco.cep,
              rua: endereco.rua,
              bairro: endereco.bairro,
              cidade: endereco.cidade,
              estado: endereco.estado
            }
          }));
        }
      } catch (error) {
        console.error('Erro ao buscar CEP:', error);
        setErrors(prev => ({ ...prev, 'endereco.cep': 'CEP não encontrado ou inválido' }));
      } finally {
        setBuscandoCEP(false);
      }
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validação do nome
    if (!formData.nomeCompleto.trim()) {
      newErrors.nomeCompleto = 'Nome é obrigatório';
    }

    // Validação do telefone principal
    const telefoneLimpo = formData.telefone.replace(/\D/g, '');
    if (!telefoneLimpo) {
      newErrors.telefone = 'Telefone é obrigatório';
    } else if (telefoneLimpo.length !== 11) {
      newErrors.telefone = 'Telefone deve ter exatamente 11 dígitos (DDD + 9 números)';
    }

    // Validação do telefone secundário (se preenchido)
    if (formData.telefoneSecundario) {
      const telefoneSecLimpo = formData.telefoneSecundario.replace(/\D/g, '');
      if (telefoneSecLimpo.length !== 11) {
        newErrors.telefoneSecundario = 'Telefone secundário deve ter exatamente 11 dígitos';
      }
    }

    // Validação do email (opcional, validar formato se preenchido)
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'E-mail inválido';
    }

    // Validação do CPF (opcional)
    if (formData.cpf) {
      const cpfLimpo = formData.cpf.replace(/\D/g, '');
      if (cpfLimpo.length !== 11) {
        newErrors.cpf = 'CPF deve ter exatamente 11 dígitos';
      } else if (!validateCPF(cpfLimpo)) {
        newErrors.cpf = 'CPF inválido';
      }
    }

    // Endereço: apenas bairro obrigatório
    if (!formData.endereco.bairro.trim()) {
      newErrors['endereco.bairro'] = 'Bairro é obrigatório';
    }

    // CEP opcional, valida formato se preenchido
    if (formData.endereco.cep) {
      const cepLimpo = formData.endereco.cep.replace(/\D/g, '');
      if (cepLimpo.length !== 8) {
        newErrors['endereco.cep'] = 'CEP deve ter exatamente 8 dígitos';
      }
    }

    // Telefones de referência opcionais: validar se preenchidos
    if (formData.pessoasReferencia.telefone1) {
      const telefone1Limpo = formData.pessoasReferencia.telefone1.replace(/\D/g, '');
      if (telefone1Limpo.length !== 11) {
        newErrors['pessoasReferencia.telefone1'] = 'Telefone da 1ª pessoa deve ter exatamente 11 dígitos';
      }
    }
    if (formData.pessoasReferencia.telefone2) {
      const telefone2Limpo = formData.pessoasReferencia.telefone2.replace(/\D/g, '');
      if (telefone2Limpo.length !== 11) {
        newErrors['pessoasReferencia.telefone2'] = 'Telefone da 2ª pessoa deve ter exatamente 11 dígitos';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      
      const nomePadrao = formatNomePadrao(formData.nomeCompleto);

      // Preparar dados para salvar - normaliza os telefones para armazenamento
      const dadosParaSalvar = {
        nome: nomePadrao,
        nomeCompleto: nomePadrao,
        telefone: normalizePhoneNumber(formData.telefone || ''),
        telefoneSecundario: normalizePhoneNumber(formData.telefoneSecundario || ''),
        email: formData.email || '',
        dataNascimento: formData.dataNascimento || '',
        cpf: formData.cpf || '',
        rg: formData.rg || '',
        documentoFrente: formData.documentoFrente,
        documentoVerso: formData.documentoVerso,
        endereco: formData.endereco || {
          rua: '',
          numero: '',
          bairro: '',
          cidade: '',
          estado: '',
          cep: '',
          pontoReferencia: ''
        },
        bairro: formData.endereco?.bairro || '', // Campo principal para compatibilidade
        pessoasReferencia: formData.pessoasReferencia || {
          nome1: '',
          telefone1: '',
          parentesco1: '',
          nome2: '',
          telefone2: '',
          parentesco2: ''
        }
      };

      await criarCliente(dadosParaSalvar);
      onSave();
      onClose();
      
      // Limpar formulário
      setFormData({
        nomeCompleto: '',
        telefone: '',
        telefoneSecundario: '',
        email: '',
        dataNascimento: '',
        cpf: '',
        rg: '',
        documentoFrente: null,
        documentoVerso: null,
        endereco: {
          rua: '',
          numero: '',
          bairro: '',
          cidade: '',
          estado: '',
          cep: '',
          pontoReferencia: ''
        },
        pessoasReferencia: {
          nome1: '',
          telefone1: '',
          parentesco1: '',
          nome2: '',
          telefone2: '',
          parentesco2: ''
        }
      });
      
      // Limpar erros
      setErrors({});
    } catch (error) {
      console.error('Erro ao criar cliente:', error);
      alert('Erro ao criar cliente');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        width: '90%',
        maxWidth: '800px',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 24px 0 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #e5e7eb',
          paddingBottom: '20px'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '1.5rem',
            fontWeight: '700',
            color: '#111827'
          }}>
            Novo Cliente
          </h2>
          <button
            onClick={onClose}
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
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {/* Informações Pessoais */}
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{
              margin: '0 0 20px 0',
              fontSize: '1.125rem',
              fontWeight: '600',
              color: '#374151'
            }}>
              Informações Pessoais
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontWeight: '600',
                  color: '#374151',
                  fontSize: '14px'
                }}>
                  Nome *
                </label>
                <input
                  type="text"
                  value={formData.nomeCompleto}
                  onChange={(e) => handleInputChange('nomeCompleto', e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#d1d5db';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
                {errors.nomeCompleto && (
                  <p style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>{errors.nomeCompleto}</p>
                )}
              </div>
              
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontWeight: '600',
                  color: '#374151',
                  fontSize: '14px'
                }}>
                  Telefone Principal *
                </label>
                <input
                  type="tel"
                  value={formData.telefone}
                  onChange={(e) => handleInputChange('telefone', e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: formData.telefone.replace(/\D/g, '').length === 11 ? '1px solid #10b981' : '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    const telefoneLimpo = formData.telefone.replace(/\D/g, '');
                    e.currentTarget.style.borderColor = telefoneLimpo.length === 11 ? '#10b981' : '#d1d5db';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
                {errors.telefone && (
                  <p style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>{errors.telefone}</p>
                )}
                {formData.telefone && !errors.telefone && formData.telefone.replace(/\D/g, '').length === 11 && (
                  <p style={{ color: '#10b981', fontSize: '12px', marginTop: '4px' }}>
                    ✅ Telefone válido (11 dígitos)
                  </p>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                                 <label style={{
                   display: 'block',
                   marginBottom: '6px',
                   fontWeight: '600',
                   color: '#374151',
                   fontSize: '14px'
                 }}>
                   Telefone Secundário
                 </label>
                                 <input
                   type="tel"
                   value={formData.telefoneSecundario}
                   onChange={(e) => handleInputChange('telefoneSecundario', e.target.value)}
                   style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: formData.telefoneSecundario.replace(/\D/g, '').length === 11 ? '1px solid #10b981' : '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    const telefoneSecLimpo = formData.telefoneSecundario.replace(/\D/g, '');
                    e.currentTarget.style.borderColor = telefoneSecLimpo.length === 11 ? '#10b981' : '#d1d5db';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
                {errors.telefoneSecundario && (
                  <p style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>{errors.telefoneSecundario}</p>
                )}
                {formData.telefoneSecundario && !errors.telefoneSecundario && formData.telefoneSecundario.replace(/\D/g, '').length === 11 && (
                  <p style={{ color: '#10b981', fontSize: '12px', marginTop: '4px' }}>
                    ✅ Telefone válido (11 dígitos)
                  </p>
                )}
              </div>
              
              <div>
                                 <label style={{
                   display: 'block',
                   marginBottom: '6px',
                   fontWeight: '600',
                   color: '#374151',
                   fontSize: '14px'
                 }}>
                   E-mail (opcional)
                 </label>
                                 <input
                   type="email"
                   value={formData.email}
                   onChange={(e) => handleInputChange('email', e.target.value)}
                   style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#d1d5db';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                                 <label style={{
                   display: 'block',
                   marginBottom: '6px',
                   fontWeight: '600',
                   color: '#374151',
                   fontSize: '14px'
                 }}>
                   Data de Nascimento (opcional)
                 </label>
                <div style={{ position: 'relative' }}>
                                     <input
                     type="text"
                     value={formData.dataNascimento}
                     onChange={(e) => handleInputChange('dataNascimento', e.target.value)}
                     placeholder="dd/mm/aaaa"
                     
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      paddingRight: '40px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      transition: 'all 0.2s ease'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#3b82f6';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#d1d5db';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                  <span style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#6b7280',
                    fontSize: '16px'
                  }}>
                    📅
                  </span>
                </div>
              </div>
              
              <div>
                                 <label style={{
                   display: 'block',
                   marginBottom: '6px',
                   fontWeight: '600',
                   color: '#374151',
                   fontSize: '14px'
                 }}>
                   CPF (opcional)
                 </label>
                                 <input
                   type="text"
                   value={formData.cpf}
                   onChange={(e) => handleInputChange('cpf', e.target.value)}
                   placeholder="000.000.000-00"
                   
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: formData.cpf.replace(/\D/g, '').length === 11 ? '1px solid #10b981' : '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    const cpfLimpo = formData.cpf.replace(/\D/g, '');
                    e.currentTarget.style.borderColor = cpfLimpo.length === 11 ? '#10b981' : '#d1d5db';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
                {errors.cpf && (
                  <p style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>{errors.cpf}</p>
                )}
                {formData.cpf && !errors.cpf && formData.cpf.replace(/\D/g, '').length === 11 && (
                  <p style={{ color: '#10b981', fontSize: '12px', marginTop: '4px' }}>
                    ✅ CPF válido (11 dígitos)
                  </p>
                )}
              </div>
            </div>

            <div>
                             <label style={{
                 display: 'block',
                 marginBottom: '6px',
                 fontWeight: '600',
                 color: '#374151',
                 fontSize: '14px'
               }}>
                 RG (opcional)
               </label>
                             <input
                 type="text"
                 value={formData.rg}
                 onChange={(e) => handleInputChange('rg', e.target.value)}
                 placeholder="00.000.000-0"
                 
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  transition: 'all 0.2s ease'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#3b82f6';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#d1d5db';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>

            <div style={{ marginTop: '16px' }}>
              <label style={{
                display: 'block',
                marginBottom: '12px',
                fontWeight: '600',
                color: '#374151',
                fontSize: '14px'
              }}>
                📄 Anexar Documento (RG ou CNH) (opcional)
              </label>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* Frente do Documento */}
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontWeight: '600',
                    color: '#4b5563',
                    fontSize: '13px'
                  }}>
                    Frente do Documento (opcional)
                  </label>
                  <div style={{
                    border: '2px dashed #d1d5db',
                    borderRadius: '8px',
                    padding: '16px',
                    textAlign: 'center',
                    backgroundColor: '#f9fafb',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer',
                    position: 'relative',
                    minHeight: '120px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.backgroundColor = '#f0f9ff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#d1d5db';
                    e.currentTarget.style.backgroundColor = '#f9fafb';
                  }}
                  onClick={() => document.getElementById('documento-frente-upload')?.click()}>
                    <input
                      id="documento-frente-upload"
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange('documentoFrente', e)}
                      style={{ display: 'none' }}
                    />
                    {formData.documentoFrente ? (
                      <div>
                        <div style={{ fontSize: '32px', marginBottom: '4px' }}>📄</div>
                        <p style={{ margin: '0 0 2px 0', fontWeight: '600', color: '#374151', fontSize: '12px' }}>
                          {formData.documentoFrente.name}
                        </p>
                        <p style={{ margin: '0', fontSize: '10px', color: '#6b7280' }}>
                          {(formData.documentoFrente.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFormData(prev => ({ ...prev, documentoFrente: null }));
                            if (document.getElementById('documento-frente-upload') as HTMLInputElement) {
                              (document.getElementById('documento-frente-upload') as HTMLInputElement).value = '';
                            }
                          }}
                          style={{
                            marginTop: '6px',
                            padding: '3px 6px',
                            backgroundColor: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            fontSize: '10px',
                            cursor: 'pointer'
                          }}
                        >
                          Remover
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: '32px', marginBottom: '4px' }}>📁</div>
                        <p style={{ margin: '0 0 2px 0', fontWeight: '600', color: '#374151', fontSize: '12px' }}>
                          Frente
                        </p>
                        <p style={{ margin: '0', fontSize: '10px', color: '#6b7280' }}>
                          JPG, PNG (5MB)
                        </p>
                      </div>
                    )}
                  </div>
                  {errors.documentoFrente && (
                    <p style={{ color: 'red', fontSize: '11px', marginTop: '4px' }}>{errors.documentoFrente}</p>
                  )}
                  {formData.documentoFrente && !errors.documentoFrente && (
                    <p style={{ color: '#10b981', fontSize: '11px', marginTop: '4px' }}>
                      ✅ Frente anexada
                    </p>
                  )}
                </div>

                {/* Verso do Documento */}
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontWeight: '600',
                    color: '#4b5563',
                    fontSize: '13px'
                  }}>
                    Verso do Documento (opcional)
                  </label>
                  <div style={{
                    border: '2px dashed #d1d5db',
                    borderRadius: '8px',
                    padding: '16px',
                    textAlign: 'center',
                    backgroundColor: '#f9fafb',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer',
                    position: 'relative',
                    minHeight: '120px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.backgroundColor = '#f0f9ff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#d1d5db';
                    e.currentTarget.style.backgroundColor = '#f9fafb';
                  }}
                  onClick={() => document.getElementById('documento-verso-upload')?.click()}>
                    <input
                      id="documento-verso-upload"
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange('documentoVerso', e)}
                      style={{ display: 'none' }}
                    />
                    {formData.documentoVerso ? (
                      <div>
                        <div style={{ fontSize: '32px', marginBottom: '4px' }}>📄</div>
                        <p style={{ margin: '0 0 2px 0', fontWeight: '600', color: '#374151', fontSize: '12px' }}>
                          {formData.documentoVerso.name}
                        </p>
                        <p style={{ margin: '0', fontSize: '10px', color: '#6b7280' }}>
                          {(formData.documentoVerso.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFormData(prev => ({ ...prev, documentoVerso: null }));
                            if (document.getElementById('documento-verso-upload') as HTMLInputElement) {
                              (document.getElementById('documento-verso-upload') as HTMLInputElement).value = '';
                            }
                          }}
                          style={{
                            marginTop: '6px',
                            padding: '3px 6px',
                            backgroundColor: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            fontSize: '10px',
                            cursor: 'pointer'
                          }}
                        >
                          Remover
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: '32px', marginBottom: '4px' }}>📁</div>
                        <p style={{ margin: '0 0 2px 0', fontWeight: '600', color: '#374151', fontSize: '12px' }}>
                          Verso
                        </p>
                        <p style={{ margin: '0', fontSize: '10px', color: '#6b7280' }}>
                          JPG, PNG (5MB)
                        </p>
                      </div>
                    )}
                  </div>
                  {errors.documentoVerso && (
                    <p style={{ color: 'red', fontSize: '11px', marginTop: '4px' }}>{errors.documentoVerso}</p>
                  )}
                  {formData.documentoVerso && !errors.documentoVerso && (
                    <p style={{ color: '#10b981', fontSize: '11px', marginTop: '4px' }}>
                      ✅ Verso anexado
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Endereço Detalhado */}
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{
              margin: '0 0 20px 0',
              fontSize: '1.125rem',
              fontWeight: '600',
              color: '#374151',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ color: '#ef4444', fontSize: '18px' }}>📍</span>
              Endereço Detalhado
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                                 <label style={{
                   display: 'block',
                   marginBottom: '6px',
                   fontWeight: '600',
                   color: '#374151',
                   fontSize: '14px'
                 }}>
                   CEP *
                 </label>
                <div style={{ position: 'relative' }}>
                                     <input
                     type="text"
                     value={formData.endereco.cep}
                     onChange={(e) => handleInputChange('endereco.cep', e.target.value)}
                     placeholder="00000-000"
                     required
                     style={{
                      width: '100%',
                      padding: '10px 12px',
                      paddingRight: buscandoCEP ? '40px' : '12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      transition: 'all 0.2s ease'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#3b82f6';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#d1d5db';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                  {buscandoCEP && (
                    <div style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#3b82f6',
                      fontSize: '16px',
                      animation: 'spin 1s linear infinite'
                    }}>
                      🔄
                    </div>
                  )}
                </div>
                {errors['endereco.cep'] && (
                  <p style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>{errors['endereco.cep']}</p>
                )}
                {formData.endereco.cep && !buscandoCEP && !errors['endereco.cep'] && (
                  <p style={{ color: '#10b981', fontSize: '12px', marginTop: '4px' }}>
                    ✅ Endereço preenchido automaticamente
                  </p>
                )}
              </div>
              
              <div>
                                 <label style={{
                   display: 'block',
                   marginBottom: '6px',
                   fontWeight: '600',
                   color: '#374151',
                   fontSize: '14px'
                 }}>
                   Rua *
                 </label>
                                 <input
                   type="text"
                   value={formData.endereco.rua}
                   onChange={(e) => handleInputChange('endereco.rua', e.target.value)}
                   required
                   style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#d1d5db';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
                {errors['endereco.rua'] && (
                  <p style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>{errors['endereco.rua']}</p>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontWeight: '600',
                  color: '#374151',
                  fontSize: '14px'
                }}>
                  Bairro *
                </label>
                <input
                  type="text"
                  value={formData.endereco.bairro}
                  onChange={(e) => handleInputChange('endereco.bairro', e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#d1d5db';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
                {errors['endereco.bairro'] && (
                  <p style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>{errors['endereco.bairro']}</p>
                )}
              </div>
              
              <div>
                                 <label style={{
                   display: 'block',
                   marginBottom: '6px',
                   fontWeight: '600',
                   color: '#374151',
                   fontSize: '14px'
                 }}>
                   Cidade *
                 </label>
                                 <input
                   type="text"
                   value={formData.endereco.cidade}
                   onChange={(e) => handleInputChange('endereco.cidade', e.target.value)}
                   placeholder="Nome da cidade"
                   required
                   style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#d1d5db';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
                {errors['endereco.cidade'] && (
                  <p style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>{errors['endereco.cidade']}</p>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                                 <label style={{
                   display: 'block',
                   marginBottom: '6px',
                   fontWeight: '600',
                   color: '#374151',
                   fontSize: '14px'
                 }}>
                   Número *
                 </label>
                                 <input
                   type="text"
                   value={formData.endereco.numero}
                   onChange={(e) => handleInputChange('endereco.numero', e.target.value)}
                   required
                   style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#d1d5db';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
                {errors['endereco.numero'] && (
                  <p style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>{errors['endereco.numero']}</p>
                )}
              </div>
              
              <div>
                                 <label style={{
                   display: 'block',
                   marginBottom: '6px',
                   fontWeight: '600',
                   color: '#374151',
                   fontSize: '14px'
                 }}>
                   Estado *
                 </label>
                                 <input
                   type="text"
                   value={formData.endereco.estado}
                   onChange={(e) => handleInputChange('endereco.estado', e.target.value)}
                   required
                   style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#d1d5db';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
                {errors['endereco.estado'] && (
                  <p style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>{errors['endereco.estado']}</p>
                )}
              </div>
            </div>

            <div>
                             <label style={{
                 display: 'block',
                 marginBottom: '6px',
                 fontWeight: '600',
                 color: '#374151',
                 fontSize: '14px'
               }}>
                 Ponto de Referência *
               </label>
                             <input
                 type="text"
                 value={formData.endereco.pontoReferencia}
                 onChange={(e) => handleInputChange('endereco.pontoReferencia', e.target.value)}
                 placeholder="Próximo ao supermercado, esquina com..."
                 required
                 style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  transition: 'all 0.2s ease'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#3b82f6';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#d1d5db';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>
          </div>

          {/* Pessoas de Referência */}
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{
              margin: '0 0 20px 0',
              fontSize: '1.125rem',
              fontWeight: '600',
              color: '#374151',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ color: '#3b82f6', fontSize: '18px' }}>👥</span>
              Pessoas de Referência
            </h3>
            
            {/* Primeira Pessoa de Referência */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{
                margin: '0 0 16px 0',
                fontSize: '1rem',
                fontWeight: '600',
                color: '#4b5563'
              }}>
                1ª Pessoa de Referência
              </h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                                     <label style={{
                     display: 'block',
                     marginBottom: '6px',
                     fontWeight: '600',
                     color: '#374151',
                     fontSize: '14px'
                   }}>
                     Nome *
                   </label>
                   <input
                     type="text"
                     value={formData.pessoasReferencia.nome1}
                     required
                    onChange={(e) => handleInputChange('pessoasReferencia.nome1', e.target.value)}
                    placeholder="Nome completo"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      transition: 'all 0.2s ease'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#3b82f6';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#d1d5db';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                </div>
                
                <div>
                                     <label style={{
                     display: 'block',
                     marginBottom: '6px',
                     fontWeight: '600',
                     color: '#374151',
                     fontSize: '14px'
                   }}>
                     Telefone *
                   </label>
                   <input
                     type="tel"
                     value={formData.pessoasReferencia.telefone1}
                     required
                    onChange={(e) => handleInputChange('pessoasReferencia.telefone1', e.target.value)}
                    placeholder="(11) 99999-9999"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: formData.pessoasReferencia.telefone1.replace(/\D/g, '').length === 11 ? '1px solid #10b981' : '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      transition: 'all 0.2s ease'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#3b82f6';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }}
                    onBlur={(e) => {
                      const telefoneLimpo = formData.pessoasReferencia.telefone1.replace(/\D/g, '');
                      e.currentTarget.style.borderColor = telefoneLimpo.length === 11 ? '#10b981' : '#d1d5db';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                  {formData.pessoasReferencia.telefone1 && !errors['pessoasReferencia.telefone1'] && formData.pessoasReferencia.telefone1.replace(/\D/g, '').length === 11 && (
                    <p style={{ color: '#10b981', fontSize: '12px', marginTop: '4px' }}>
                      ✅ Telefone válido
                    </p>
                  )}
                </div>
                
                <div>
                                     <label style={{
                     display: 'block',
                     marginBottom: '6px',
                     fontWeight: '600',
                     color: '#374151',
                     fontSize: '14px'
                   }}>
                     Parentesco *
                   </label>
                   <input
                     type="text"
                     value={formData.pessoasReferencia.parentesco1}
                     required
                    onChange={(e) => handleInputChange('pessoasReferencia.parentesco1', e.target.value)}
                    placeholder="Ex: Pai, Mãe, Irmão..."
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      transition: 'all 0.2s ease'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#3b82f6';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#d1d5db';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>
            </div>
            
            {/* Segunda Pessoa de Referência */}
            <div>
              <h4 style={{
                margin: '0 0 16px 0',
                fontSize: '1rem',
                fontWeight: '600',
                color: '#4b5563'
              }}>
                2ª Pessoa de Referência
              </h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                                 <div>
                   <label style={{
                     display: 'block',
                     marginBottom: '6px',
                     fontWeight: '600',
                     color: '#374151',
                     fontSize: '14px'
                   }}>
                     Nome *
                   </label>
                   <input
                     type="text"
                     value={formData.pessoasReferencia.nome2}
                     required
                    onChange={(e) => handleInputChange('pessoasReferencia.nome2', e.target.value)}
                    placeholder="Nome completo"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      transition: 'all 0.2s ease'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#3b82f6';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#d1d5db';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                </div>
                
                                 <div>
                   <label style={{
                     display: 'block',
                     marginBottom: '6px',
                     fontWeight: '600',
                     color: '#374151',
                     fontSize: '14px'
                   }}>
                     Telefone *
                   </label>
                   <input
                     type="tel"
                     value={formData.pessoasReferencia.telefone2}
                     required
                    onChange={(e) => handleInputChange('pessoasReferencia.telefone2', e.target.value)}
                    placeholder="(11) 99999-9999"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: formData.pessoasReferencia.telefone2.replace(/\D/g, '').length === 11 ? '1px solid #10b981' : '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      transition: 'all 0.2s ease'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#3b82f6';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }}
                    onBlur={(e) => {
                      const telefoneLimpo = formData.pessoasReferencia.telefone2.replace(/\D/g, '');
                      e.currentTarget.style.borderColor = telefoneLimpo.length === 11 ? '#10b981' : '#d1d5db';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                  {formData.pessoasReferencia.telefone2 && !errors['pessoasReferencia.telefone2'] && formData.pessoasReferencia.telefone2.replace(/\D/g, '').length === 11 && (
                    <p style={{ color: '#10b981', fontSize: '12px', marginTop: '4px' }}>
                      ✅ Telefone válido
                    </p>
                  )}
                </div>
                
                                 <div>
                   <label style={{
                     display: 'block',
                     marginBottom: '6px',
                     fontWeight: '600',
                     color: '#374151',
                     fontSize: '14px'
                   }}>
                     Parentesco *
                   </label>
                   <input
                     type="text"
                     value={formData.pessoasReferencia.parentesco2}
                     required
                    onChange={(e) => handleInputChange('pessoasReferencia.parentesco2', e.target.value)}
                    placeholder="Ex: Pai, Mãe, Irmão..."
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      transition: 'all 0.2s ease'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#3b82f6';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#d1d5db';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Botões de Ação */}
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
            borderTop: '1px solid #e5e7eb',
            paddingTop: '24px'
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '12px 24px',
                backgroundColor: 'white',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                color: '#374151',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f9fafb';
                e.currentTarget.style.borderColor = '#9ca3af';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white';
                e.currentTarget.style.borderColor = '#d1d5db';
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '12px 24px',
                backgroundColor: '#10b981',
                border: 'none',
                borderRadius: '6px',
                color: 'white',
                fontSize: '14px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.backgroundColor = '#059669';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.backgroundColor = '#10b981';
                }
              }}
            >
              {loading ? 'Criando...' : 'Criar Cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
