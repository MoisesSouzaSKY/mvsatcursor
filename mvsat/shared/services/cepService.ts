/**
 * Serviço para busca de endereço por CEP usando a API ViaCEP
 */

export interface EnderecoViaCEP {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  ibge: string;
  gia: string;
  ddd: string;
  siafi: string;
  erro?: boolean;
}

export interface EnderecoFormatado {
  cep: string;
  rua: string;
  bairro: string;
  cidade: string;
  estado: string;
}

/**
 * Formata CEP removendo caracteres especiais
 */
export function formatCEP(cep: string): string {
  if (!cep) return '';
  
  // Remove todos os caracteres não numéricos
  const cleaned = cep.replace(/\D/g, '');
  
  // Se não tiver 8 dígitos, retorna como está
  if (cleaned.length !== 8) return cep;
  
  // Formata: 00000-000
  return `${cleaned.slice(0, 5)}-${cleaned.slice(5)}`;
}

/**
 * Valida se o CEP tem formato correto
 */
export function validateCEP(cep: string): boolean {
  if (!cep) return false;
  
  const cleaned = cep.replace(/\D/g, '');
  return cleaned.length === 8;
}

/**
 * Busca endereço por CEP na API ViaCEP
 */
export async function buscarEnderecoPorCEP(cep: string): Promise<EnderecoFormatado | null> {
  try {
    // Remove formatação do CEP
    const cepLimpo = cep.replace(/\D/g, '');
    
    // Valida CEP
    if (!validateCEP(cepLimpo)) {
      throw new Error('CEP inválido');
    }
    
    // Faz a requisição para a API ViaCEP
    const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
    
    if (!response.ok) {
      throw new Error('Erro ao buscar CEP');
    }
    
    const data: EnderecoViaCEP = await response.json();
    
    // Verifica se houve erro na API
    if (data.erro) {
      throw new Error('CEP não encontrado');
    }
    
    // Retorna dados formatados
    return {
      cep: formatCEP(data.cep),
      rua: data.logradouro,
      bairro: data.bairro,
      cidade: data.localidade,
      estado: data.uf
    };
    
  } catch (error) {
    console.error('Erro ao buscar CEP:', error);
    throw error;
  }
}

/**
 * Aplica máscara de CEP durante a digitação
 */
export function applyCEPMask(value: string): string {
  // Remove tudo que não é número
  const cleaned = value.replace(/\D/g, '');
  
  // Aplica a máscara 00000-000
  if (cleaned.length <= 5) {
    return cleaned;
  } else {
    return `${cleaned.slice(0, 5)}-${cleaned.slice(5, 8)}`;
  }
}