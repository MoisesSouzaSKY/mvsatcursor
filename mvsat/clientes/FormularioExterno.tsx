import React from 'react';
import { criarCliente } from './clientes.functions';
import { formatPhoneNumber, normalizePhoneNumber } from '../shared/utils/phoneFormatter';
import { buscarEnderecoPorCEP, formatCEP, applyCEPMask } from '../shared/services/cepService';
import { formatCpfCnpj, validateCPF } from '../shared/utils/documentFormatter';

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

export default function FormularioExterno() {
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
  const [formSubmitted, setFormSubmitted] = React.useState(false); // Novo estado para controlar o envio do formulário

  const handleInputChange = (field: string, value: string) => {
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    if (field === 'telefone' || field === 'telefoneSecundario' || field === 'pessoasReferencia.telefone1' || field === 'pessoasReferencia.telefone2') {
      const cleaned = value.replace(/\D/g, '');
      if (cleaned.length <= 11) {
        if (cleaned.length === 11) {
          value = `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
        } else if (cleaned.length === 10) {
          value = `(${cleaned.slice(0, 2)}) 9${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
        } else if (cleaned.length >= 2) {
          value = `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
        } else if (cleaned.length === 1) {
          value = `(${cleaned}`;
        }
      } else {
        const limited = cleaned.slice(0, 11);
        value = `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`;
      }
    }

    if (field === 'cpf') {
      const cleaned = value.replace(/\D/g, '');
      if (cleaned.length <= 11) {
        value = formatCpfCnpj(cleaned);
      } else {
        value = formatCpfCnpj(cleaned.slice(0, 11));
      }
    }

    if (field === 'endereco.cep') {
      const cleaned = value.replace(/\D/g, '');
      if (cleaned.length <= 8) {
        value = applyCEPMask(cleaned);
        if (cleaned.length === 8) {
          buscarCEP(cleaned);
        }
      } else {
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
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({ ...prev, [field]: 'Por favor, selecione apenas arquivos de imagem (JPG, PNG, etc.)' }));
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, [field]: 'O arquivo deve ter no máximo 5MB' }));
        return;
      }
      
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
              rua: endereco.logradouro || '',
              bairro: endereco.bairro || '',
              cidade: endereco.localidade || '',
              estado: endereco.uf || ''
            }
          }));
          setErrors(prev => ({ ...prev, 'endereco.cep': '' })); // Limpa o erro do CEP ao encontrar
        } else {
          setErrors(prev => ({ ...prev, 'endereco.cep': 'CEP não encontrado ou inválido' }));
        }
      } catch (error) {
        console.error('Erro ao buscar CEP:', error);
        setErrors(prev => ({ ...prev, 'endereco.cep': 'Erro ao buscar CEP. Tente novamente.' }));
      } finally {
        setBuscandoCEP(false);
      }
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.nomeCompleto.trim()) {
      newErrors.nomeCompleto = 'Nome completo é obrigatório';
    }

    if (!formData.telefone.trim()) {
      newErrors.telefone = 'Telefone é obrigatório';
    } else {
      const telefoneLimpo = formData.telefone.replace(/\D/g, '');
      if (telefoneLimpo.length !== 11) {
        newErrors.telefone = 'Telefone deve ter exatamente 11 dígitos';
      }
    }

    // Telefone Secundário não é obrigatório, só valida se preenchido
    if (formData.telefoneSecundario.trim()) {
      const telefoneSecLimpo = formData.telefoneSecundario.replace(/\D/g, '');
      if (telefoneSecLimpo.length !== 11) {
        newErrors.telefoneSecundario = 'Telefone secundário deve ter exatamente 11 dígitos se preenchido';
      }
    }

    if (!formData.email.trim()) {
      newErrors.email = 'E-mail é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'E-mail inválido';
    }

    if (!formData.dataNascimento.trim()) {
      newErrors.dataNascimento = 'Data de nascimento é obrigatória';
    }

    if (!formData.cpf.trim()) {
      newErrors.cpf = 'CPF é obrigatório';
    } else {
      const cpfLimpo = formData.cpf.replace(/\D/g, '');
      if (cpfLimpo.length !== 11) {
        newErrors.cpf = 'CPF deve ter exatamente 11 dígitos';
      } else if (!validateCPF(cpfLimpo)) {
        newErrors.cpf = 'CPF inválido';
      }
    }

    if (!formData.rg.trim()) {
      newErrors.rg = 'RG é obrigatório';
    }

    // Validação dos documentos anexados (obrigatórios)
    if (!formData.documentoFrente) {
      newErrors.documentoFrente = 'É obrigatório anexar a frente do documento (RG ou CNH)';
    }
    if (!formData.documentoVerso) {
      newErrors.documentoVerso = 'É obrigatório anexar o verso do documento (RG ou CNH)';
    }

    if (!formData.endereco.cep.trim()) {
      newErrors['endereco.cep'] = 'CEP é obrigatório';
    } else {
      const cepLimpo = formData.endereco.cep.replace(/\D/g, '');
      if (cepLimpo.length !== 8) {
        newErrors['endereco.cep'] = 'CEP deve ter exatamente 8 dígitos';
      }
    }

    if (!formData.endereco.rua.trim()) {
      newErrors['endereco.rua'] = 'Rua é obrigatória';
    }
    if (!formData.endereco.numero.trim()) {
      newErrors['endereco.numero'] = 'Número é obrigatório';
    }
    if (!formData.endereco.cidade.trim()) {
      newErrors['endereco.cidade'] = 'Cidade é obrigatória';
    }
    if (!formData.endereco.estado.trim()) {
      newErrors['endereco.estado'] = 'Estado é obrigatório';
    }
    if (!formData.endereco.pontoReferencia.trim()) {
      newErrors['endereco.pontoReferencia'] = 'Ponto de referência é obrigatório';
    }

    if (!formData.pessoasReferencia.nome1.trim()) {
      newErrors['pessoasReferencia.nome1'] = 'Nome da 1ª pessoa de referência é obrigatório';
    }
    if (!formData.pessoasReferencia.telefone1.trim()) {
      newErrors['pessoasReferencia.telefone1'] = 'Telefone da 1ª pessoa de referência é obrigatório';
    } else {
      const telefone1Limpo = formData.pessoasReferencia.telefone1.replace(/\D/g, '');
      if (telefone1Limpo.length !== 11) {
        newErrors['pessoasReferencia.telefone1'] = 'Telefone da 1ª pessoa deve ter exatamente 11 dígitos';
      }
    }
    if (!formData.pessoasReferencia.parentesco1.trim()) {
      newErrors['pessoasReferencia.parentesco1'] = 'Parentesco da 1ª pessoa é obrigatório';
    }

    if (!formData.pessoasReferencia.nome2.trim()) {
      newErrors['pessoasReferencia.nome2'] = 'Nome da 2ª pessoa de referência é obrigatório';
    }
    if (!formData.pessoasReferencia.telefone2.trim()) {
      newErrors['pessoasReferencia.telefone2'] = 'Telefone da 2ª pessoa de referência é obrigatório';
    } else {
      const telefone2Limpo = formData.pessoasReferencia.telefone2.replace(/\D/g, '');
      if (telefone2Limpo.length !== 11) {
        newErrors['pessoasReferencia.telefone2'] = 'Telefone da 2ª pessoa deve ter exatamente 11 dígitos';
      }
    }
    if (!formData.pessoasReferencia.parentesco2.trim()) {
      newErrors['pessoasReferencia.parentesco2'] = 'Parentesco da 2ª pessoa é obrigatório';
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
      
      const dadosParaSalvar = {
        nome: formData.nomeCompleto,
        nomeCompleto: formData.nomeCompleto,
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
        bairro: formData.endereco?.bairro || '', 
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
      setFormSubmitted(true); // Marca o formulário como enviado com sucesso
      // Não limpar formulário aqui, para exibir a mensagem de sucesso
      // setFormData para resetar manualmente se necessário
      // setErrors({});
    } catch (error) {
      console.error('Erro ao criar cliente:', error);
      alert('Erro ao criar cliente. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (formSubmitted) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f3f4f6',
        padding: '20px',
        textAlign: 'center'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '40px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          maxWidth: '500px',
          width: '100%'
        }}>
          <h2 style={{ color: '#10b981', fontSize: '2rem', marginBottom: '20px' }}>✅ Sucesso!</h2>
          <p style={{ fontSize: '1.1rem', color: '#4b5563', marginBottom: '30px' }}>
            Seus dados foram enviados com sucesso! Agradecemos por preencher o formulário.
          </p>
          <button
            onClick={() => {
              setFormSubmitted(false);
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
              setErrors({});
            }}
            style={{
              padding: '12px 24px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background-color 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
          >
            Preencher Novo Formulário
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f3f4f6',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        width: '90%',
        maxWidth: '800px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        padding: '32px'
      }}>
        <h2 style={{
          margin: '0 0 32px 0',
          fontSize: '2rem',
          fontWeight: '700',
          color: '#111827',
          textAlign: 'center'
        }}>
          Cadastro de Novo Cliente
        </h2>
        <form onSubmit={handleSubmit}>
          {/* Informações Pessoais */}
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
              <span style={{ color: '#8b5cf6', fontSize: '18px' }}>👤</span>
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
                   Nome Completo *
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
                    transition: 'all 0.2s ease',
                    borderColor: errors.nomeCompleto ? 'red' : '#d1d5db'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = errors.nomeCompleto ? 'red' : '#d1d5db';
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
                   placeholder="(DD) 9XXXX-XXXX"
                   maxLength={15} // (XX) 9XXXX-XXXX = 15 caracteres
                   required
                   style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    transition: 'all 0.2s ease',
                    borderColor: errors.telefone ? 'red' : (formData.telefone.replace(/\D/g, '').length === 11 ? '#10b981' : '#d1d5db')
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    const telefoneLimpo = formData.telefone.replace(/\D/g, '');
                    e.currentTarget.style.borderColor = errors.telefone ? 'red' : (telefoneLimpo.length === 11 ? '#10b981' : '#d1d5db');
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
                   placeholder="(DD) 9XXXX-XXXX"
                   maxLength={15} // (XX) 9XXXX-XXXX = 15 caracteres
                   style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    transition: 'all 0.2s ease',
                    borderColor: errors.telefoneSecundario ? 'red' : (formData.telefoneSecundario.replace(/\D/g, '').length === 11 ? '#10b981' : '#d1d5db')
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
                   E-mail *
                 </label>
                                 <input
                   type="email"
                   value={formData.email}
                   onChange={(e) => handleInputChange('email', e.target.value)}
                   required
                   style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    transition: 'all 0.2s ease',
                    borderColor: errors.email ? 'red' : '#d1d5db'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = errors.email ? 'red' : '#d1d5db';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
                {errors.email && (
                  <p style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>{errors.email}</p>
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
                   Data de Nascimento *
                 </label>
                <div style={{ position: 'relative' }}>
                                     <input
                     type="text"
                     value={formData.dataNascimento}
                     onChange={(e) => handleInputChange('dataNascimento', e.target.value)}
                     placeholder="dd/mm/aaaa"
                     required
                     style={{
                      width: '100%',
                      padding: '10px 12px',
                      paddingRight: '40px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      transition: 'all 0.2s ease',
                      borderColor: errors.dataNascimento ? 'red' : '#d1d5db'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#3b82f6';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = errors.dataNascimento ? 'red' : '#d1d5db';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                  <span style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#6b7280',
                    pointerEvents: 'none'
                  }}>
                    📅
                  </span>
                </div>
                {errors.dataNascimento && (
                  <p style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>{errors.dataNascimento}</p>
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
                   CPF *
                 </label>
                                 <input
                   type="text"
                   value={formData.cpf}
                   onChange={(e) => handleInputChange('cpf', e.target.value)}
                   placeholder="000.000.000-00"
                   maxLength={14} // 000.000.000-00 = 14 caracteres
                   required
                   style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    transition: 'all 0.2s ease',
                    borderColor: errors.cpf ? 'red' : (formData.cpf.replace(/\D/g, '').length === 11 && validateCPF(formData.cpf.replace(/\D/g, '')) ? '#10b981' : '#d1d5db')
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    const cpfLimpo = formData.cpf.replace(/\D/g, '');
                    e.currentTarget.style.borderColor = errors.cpf ? 'red' : (cpfLimpo.length === 11 && validateCPF(cpfLimpo) ? '#10b981' : '#d1d5db');
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
                {errors.cpf && (
                  <p style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>{errors.cpf}</p>
                )}
                {formData.cpf && !errors.cpf && formData.cpf.replace(/\D/g, '').length === 11 && validateCPF(formData.cpf.replace(/\D/g, '')) && (
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
                 RG *
               </label>
                             <input
                 type="text"
                 value={formData.rg}
                 onChange={(e) => handleInputChange('rg', e.target.value)}
                 placeholder="00.000.000-0"
                 required
                 style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  transition: 'all 0.2s ease',
                  borderColor: errors.rg ? 'red' : '#d1d5db'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#3b82f6';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = errors.rg ? 'red' : '#d1d5db';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
              {errors.rg && (
                <p style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>{errors.rg}</p>
              )}
            </div>

            <div style={{ marginTop: '16px' }}>
              <label style={{
                display: 'block',
                marginBottom: '12px',
                fontWeight: '600',
                color: '#374151',
                fontSize: '14px'
              }}>
                📄 Anexar Documento (RG ou CNH) *
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
                    Frente do Documento *
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
                    justifyContent: 'center',
                    borderColor: errors.documentoFrente ? 'red' : '#d1d5db'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.backgroundColor = '#f0f9ff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = errors.documentoFrente ? 'red' : '#d1d5db';
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
                    Verso do Documento *
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
                    justifyContent: 'center',
                    borderColor: errors.documentoVerso ? 'red' : '#d1d5db'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.backgroundColor = '#f0f9ff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = errors.documentoVerso ? 'red' : '#d1d5db';
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
                      transition: 'all 0.2s ease',
                      borderColor: errors['endereco.cep'] ? 'red' : '#d1d5db'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#3b82f6';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = errors['endereco.cep'] ? 'red' : '#d1d5db';
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
                  {formData.endereco.cep && !buscandoCEP && !errors['endereco.cep'] && formData.endereco.cep.replace(/\D/g, '').length === 8 && (
                    <div style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#10b981',
                      fontSize: '16px'
                    }}>
                      ✅
                    </div>
                  )}
                </div>
                {errors['endereco.cep'] && (
                  <p style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>{errors['endereco.cep']}</p>
                )}
                {formData.endereco.cep && !errors['endereco.cep'] && formData.endereco.cep.replace(/\D/g, '').length === 8 && (
                  <p style={{ color: '#10b981', fontSize: '12px', marginTop: '4px' }}>
                    ✅ Endereço preenchido automaticamente
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
                    transition: 'all 0.2s ease',
                    borderColor: errors['endereco.rua'] ? 'red' : '#d1d5db'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = errors['endereco.rua'] ? 'red' : '#d1d5db';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
                {errors['endereco.rua'] && (
                  <p style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>{errors['endereco.rua']}</p>
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
                    transition: 'all 0.2s ease',
                    borderColor: errors['endereco.numero'] ? 'red' : '#d1d5db'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = errors['endereco.numero'] ? 'red' : '#d1d5db';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
                {errors['endereco.numero'] && (
                  <p style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>{errors['endereco.numero']}</p>
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
                    transition: 'all 0.2s ease',
                    borderColor: errors['endereco.bairro'] ? 'red' : '#d1d5db'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = errors['endereco.bairro'] ? 'red' : '#d1d5db';
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
                   required
                   style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    transition: 'all 0.2s ease',
                    borderColor: errors['endereco.cidade'] ? 'red' : '#d1d5db'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = errors['endereco.cidade'] ? 'red' : '#d1d5db';
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
                    transition: 'all 0.2s ease',
                    borderColor: errors['endereco.estado'] ? 'red' : '#d1d5db'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = errors['endereco.estado'] ? 'red' : '#d1d5db';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
                {errors['endereco.estado'] && (
                  <p style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>{errors['endereco.estado']}</p>
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
                   Ponto de Referência *
                 </label>
                 <input
                   type="text"
                   value={formData.endereco.pontoReferencia}
                   onChange={(e) => handleInputChange('endereco.pontoReferencia', e.target.value)}
                   required
                   style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    transition: 'all 0.2s ease',
                    borderColor: errors['endereco.pontoReferencia'] ? 'red' : '#d1d5db'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = errors['endereco.pontoReferencia'] ? 'red' : '#d1d5db';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
                {errors['endereco.pontoReferencia'] && (
                  <p style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>{errors['endereco.pontoReferencia']}</p>
                )}
              </div>
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
              <span style={{ color: '#f59e0b', fontSize: '18px' }}>👨‍👩‍👧‍👦</span>
              Pessoas de Referência
            </h3>

            {/* 1ª Pessoa de Referência */}
            <div style={{ marginBottom: '24px', padding: '16px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
              <h4 style={{ margin: '0 0 16px 0', fontSize: '1rem', fontWeight: '600', color: '#4b5563' }}>1ª Pessoa de Referência</h4>
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
                     value={formData.pessoasReferencia.nome1}
                     onChange={(e) => handleInputChange('pessoasReferencia.nome1', e.target.value)}
                     required
                     style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      transition: 'all 0.2s ease',
                      borderColor: errors['pessoasReferencia.nome1'] ? 'red' : '#d1d5db'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#3b82f6';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = errors['pessoasReferencia.nome1'] ? 'red' : '#d1d5db';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                  {errors['pessoasReferencia.nome1'] && (
                    <p style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>{errors['pessoasReferencia.nome1']}</p>
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
                     Telefone *
                   </label>
                   <input
                     type="tel"
                     value={formData.pessoasReferencia.telefone1}
                     onChange={(e) => handleInputChange('pessoasReferencia.telefone1', e.target.value)}
                     placeholder="(DD) 9XXXX-XXXX"
                     maxLength={15}
                     required
                     style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      transition: 'all 0.2s ease',
                      borderColor: errors['pessoasReferencia.telefone1'] ? 'red' : (formData.pessoasReferencia.telefone1.replace(/\D/g, '').length === 11 ? '#10b981' : '#d1d5db')
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#3b82f6';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }}
                    onBlur={(e) => {
                      const tel1Limpo = formData.pessoasReferencia.telefone1.replace(/\D/g, '');
                      e.currentTarget.style.borderColor = errors['pessoasReferencia.telefone1'] ? 'red' : (tel1Limpo.length === 11 ? '#10b981' : '#d1d5db');
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                  {errors['pessoasReferencia.telefone1'] && (
                    <p style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>{errors['pessoasReferencia.telefone1']}</p>
                  )}
                  {formData.pessoasReferencia.telefone1 && !errors['pessoasReferencia.telefone1'] && formData.pessoasReferencia.telefone1.replace(/\D/g, '').length === 11 && (
                    <p style={{ color: '#10b981', fontSize: '12px', marginTop: '4px' }}>
                      ✅ Telefone válido (11 dígitos)
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
                   Parentesco *
                 </label>
                 <input
                   type="text"
                   value={formData.pessoasReferencia.parentesco1}
                   onChange={(e) => handleInputChange('pessoasReferencia.parentesco1', e.target.value)}
                   required
                   style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    transition: 'all 0.2s ease',
                    borderColor: errors['pessoasReferencia.parentesco1'] ? 'red' : '#d1d5db'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = errors['pessoasReferencia.parentesco1'] ? 'red' : '#d1d5db';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
                {errors['pessoasReferencia.parentesco1'] && (
                  <p style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>{errors['pessoasReferencia.parentesco1']}</p>
                )}
              </div>
            </div>

            {/* 2ª Pessoa de Referência */}
            <div style={{ padding: '16px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
              <h4 style={{ margin: '0 0 16px 0', fontSize: '1rem', fontWeight: '600', color: '#4b5563' }}>2ª Pessoa de Referência</h4>
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
                     value={formData.pessoasReferencia.nome2}
                     onChange={(e) => handleInputChange('pessoasReferencia.nome2', e.target.value)}
                     required
                     style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      transition: 'all 0.2s ease',
                      borderColor: errors['pessoasReferencia.nome2'] ? 'red' : '#d1d5db'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#3b82f6';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = errors['pessoasReferencia.nome2'] ? 'red' : '#d1d5db';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                  {errors['pessoasReferencia.nome2'] && (
                    <p style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>{errors['pessoasReferencia.nome2']}</p>
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
                     Telefone *
                   </label>
                   <input
                     type="tel"
                     value={formData.pessoasReferencia.telefone2}
                     onChange={(e) => handleInputChange('pessoasReferencia.telefone2', e.target.value)}
                     placeholder="(DD) 9XXXX-XXXX"
                     maxLength={15}
                     required
                     style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      transition: 'all 0.2s ease',
                      borderColor: errors['pessoasReferencia.telefone2'] ? 'red' : (formData.pessoasReferencia.telefone2.replace(/\D/g, '').length === 11 ? '#10b981' : '#d1d5db')
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#3b82f6';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }}
                    onBlur={(e) => {
                      const tel2Limpo = formData.pessoasReferencia.telefone2.replace(/\D/g, '');
                      e.currentTarget.style.borderColor = errors['pessoasReferencia.telefone2'] ? 'red' : (tel2Limpo.length === 11 ? '#10b981' : '#d1d5db');
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                  {errors['pessoasReferencia.telefone2'] && (
                    <p style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>{errors['pessoasReferencia.telefone2']}</p>
                  )}
                  {formData.pessoasReferencia.telefone2 && !errors['pessoasReferencia.telefone2'] && formData.pessoasReferencia.telefone2.replace(/\D/g, '').length === 11 && (
                    <p style={{ color: '#10b981', fontSize: '12px', marginTop: '4px' }}>
                      ✅ Telefone válido (11 dígitos)
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
                   Parentesco *
                 </label>
                 <input
                   type="text"
                   value={formData.pessoasReferencia.parentesco2}
                   onChange={(e) => handleInputChange('pessoasReferencia.parentesco2', e.target.value)}
                   required
                   style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    transition: 'all 0.2s ease',
                    borderColor: errors['pessoasReferencia.parentesco2'] ? 'red' : '#d1d5db'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = errors['pessoasReferencia.parentesco2'] ? 'red' : '#d1d5db';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
                {errors['pessoasReferencia.parentesco2'] && (
                  <p style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>{errors['pessoasReferencia.parentesco2']}</p>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '12px 24px',
                backgroundColor: loading ? '#9ca3af' : '#22c55e',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = '#16a34a')}
              onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = '#22c55e')}
            >
              {loading ? 'Salvando...' : 'Salvar Cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


