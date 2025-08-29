/**
 * Utilitário para formatação de telefones brasileiros
 */

export function normalizePhoneTo9Digits(phone: string): string {
  if (!phone) return '';
  
  // Remove todos os caracteres não numéricos
  const cleaned = phone.replace(/\D/g, '');
  
  // Se não tiver números suficientes, retorna vazio
  if (cleaned.length < 10) return '';
  
  // Se tiver 10 dígitos (DDD + 8 números), adiciona o 9 na frente
  if (cleaned.length === 10) {
    return cleaned.slice(0, 2) + '9' + cleaned.slice(2);
  }
  
  // Se já tiver 11 dígitos (DDD + 9 números), retorna como está
  if (cleaned.length === 11) {
    return cleaned;
  }
  
  // Se tiver mais de 11 dígitos, pega apenas os primeiros 11
  if (cleaned.length > 11) {
    return cleaned.slice(0, 11);
  }
  
  return cleaned;
}

export function formatPhoneNumber(phone: string): string {
  if (!phone) return '-';
  
  // Primeiro normaliza para 9 dígitos
  const normalized = normalizePhoneTo9Digits(phone);
  
  if (!normalized) return phone; // Se não conseguiu normalizar, retorna o original
  
  // Formata o telefone normalizado
  if (normalized.length === 11) {
    // Celular: (XX) XXXXX-XXXX
    return `(${normalized.slice(0, 2)}) ${normalized.slice(2, 7)}-${normalized.slice(7)}`;
  }
  
  return phone;
}

export function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  
  // Usa a nova função de normalização
  return normalizePhoneTo9Digits(phone);
}

export function validatePhoneNumber(phone: string): boolean {
  if (!phone) return false;
  
  const cleaned = phone.replace(/\D/g, '');
  
  // Telefone brasileiro deve ter 10 ou 11 dígitos
  return cleaned.length >= 10 && cleaned.length <= 11;
}

export function isPhoneWith9Digits(phone: string): boolean {
  if (!phone) return false;
  
  const cleaned = phone.replace(/\D/g, '');
  
  // Verifica se tem exatamente 11 dígitos (DDD + 9 números)
  return cleaned.length === 11;
}
