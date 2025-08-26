/**
 * Utilitário para formatação de telefones brasileiros
 */

export function formatPhoneNumber(phone: string): string {
  if (!phone) return '-';
  
  // Remove todos os caracteres não numéricos
  const cleaned = phone.replace(/\D/g, '');
  
  // Se não tiver números suficientes, retorna o original
  if (cleaned.length < 10) return phone;
  
  // Formata baseado no tamanho
  if (cleaned.length === 11) {
    // Celular: (XX) XXXXX-XXXX
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  } else if (cleaned.length === 10) {
    // Fixo: (XX) XXXX-XXXX
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  } else if (cleaned.length > 11) {
    // Se tiver mais de 11 dígitos, pega apenas os primeiros 11
    const truncated = cleaned.slice(0, 11);
    return `(${truncated.slice(0, 2)}) ${truncated.slice(2, 7)}-${truncated.slice(7)}`;
  }
  
  return phone;
}

export function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  
  // Remove todos os caracteres não numéricos
  const cleaned = phone.replace(/\D/g, '');
  
  // Se não tiver números suficientes, retorna vazio
  if (cleaned.length < 10) return '';
  
  // Retorna apenas os números para armazenamento
  return cleaned;
}

export function validatePhoneNumber(phone: string): boolean {
  if (!phone) return false;
  
  const cleaned = phone.replace(/\D/g, '');
  
  // Telefone brasileiro deve ter 10 ou 11 dígitos
  return cleaned.length >= 10 && cleaned.length <= 11;
}
