/**
 * Utilitários para formatação de documentos brasileiros
 */

/**
 * Formata CPF no padrão 000.000.000-00
 */
export function formatCPF(cpf: string): string {
  if (!cpf) return '';
  
  // Remove todos os caracteres não numéricos
  const cleaned = cpf.replace(/\D/g, '');
  
  // Se não tiver 11 dígitos, retorna como está
  if (cleaned.length !== 11) return cpf;
  
  // Formata: 000.000.000-00
  return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
}

/**
 * Formata CNPJ no padrão 00.000.000/0000-00
 */
export function formatCNPJ(cnpj: string): string {
  if (!cnpj) return '';
  
  // Remove todos os caracteres não numéricos
  const cleaned = cnpj.replace(/\D/g, '');
  
  // Se não tiver 14 dígitos, retorna como está
  if (cleaned.length !== 14) return cnpj;
  
  // Formata: 00.000.000/0000-00
  return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8, 12)}-${cleaned.slice(12)}`;
}

/**
 * Formata CPF ou CNPJ automaticamente baseado no tamanho
 */
export function formatCpfCnpj(document: string): string {
  if (!document) return '';
  
  const cleaned = document.replace(/\D/g, '');
  
  if (cleaned.length === 11) {
    return formatCPF(cleaned);
  } else if (cleaned.length === 14) {
    return formatCNPJ(cleaned);
  }
  
  return document;
}

/**
 * Valida CPF
 */
export function validateCPF(cpf: string): boolean {
  if (!cpf) return false;
  
  const cleaned = cpf.replace(/\D/g, '');
  
  if (cleaned.length !== 11) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(cleaned)) return false;
  
  // Validação do primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned.charAt(i)) * (10 - i);
  }
  let remainder = 11 - (sum % 11);
  let digit1 = remainder >= 10 ? 0 : remainder;
  
  if (digit1 !== parseInt(cleaned.charAt(9))) return false;
  
  // Validação do segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned.charAt(i)) * (11 - i);
  }
  remainder = 11 - (sum % 11);
  let digit2 = remainder >= 10 ? 0 : remainder;
  
  return digit2 === parseInt(cleaned.charAt(10));
}

/**
 * Valida CNPJ
 */
export function validateCNPJ(cnpj: string): boolean {
  if (!cnpj) return false;
  
  const cleaned = cnpj.replace(/\D/g, '');
  
  if (cleaned.length !== 14) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{13}$/.test(cleaned)) return false;
  
  // Validação dos dígitos verificadores
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleaned.charAt(i)) * weights1[i];
  }
  let remainder = sum % 11;
  let digit1 = remainder < 2 ? 0 : 11 - remainder;
  
  if (digit1 !== parseInt(cleaned.charAt(12))) return false;
  
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleaned.charAt(i)) * weights2[i];
  }
  remainder = sum % 11;
  let digit2 = remainder < 2 ? 0 : 11 - remainder;
  
  return digit2 === parseInt(cleaned.charAt(13));
}

/**
 * Remove formatação de documento (deixa apenas números)
 */
export function cleanDocument(document: string): string {
  if (!document) return '';
  return document.replace(/\D/g, '');
}