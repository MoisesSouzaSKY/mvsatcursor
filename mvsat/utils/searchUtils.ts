/**
 * Utilitários para busca e normalização de dados de equipamentos
 */

/**
 * Normaliza NDS removendo espaços, zeros à esquerda desnecessários e convertendo para lowercase
 * @param nds - Número NDS a ser normalizado
 * @returns NDS normalizado
 */
export const normalizeNDS = (nds: string): string => {
  if (!nds) return '';
  
  return nds
    .trim()
    .toLowerCase()
    .replace(/^0+/, '') // Remove zeros à esquerda
    .replace(/\s+/g, ''); // Remove espaços
};

/**
 * Normaliza Smart Card removendo espaços, hífens, pontos e formatação
 * @param smartCard - Número do smart card a ser normalizado
 * @returns Smart card normalizado
 */
export const normalizeSmartCard = (smartCard: string): string => {
  if (!smartCard) return '';
  
  return smartCard
    .replace(/[\s\-\.\(\)]/g, '') // Remove espaços, hífens, pontos, parênteses
    .replace(/[^0-9a-zA-Z]/g, '') // Manter apenas números e letras
    .toLowerCase()
    .trim();
};

/**
 * Sanitiza entrada de busca removendo caracteres perigosos
 * @param input - Texto de entrada
 * @returns Texto sanitizado
 */
export const sanitizeSearchInput = (input: string): string => {
  if (!input) return '';
  
  return input
    .trim()
    .slice(0, 50) // Limitar tamanho máximo
    .replace(/[<>\"']/g, '') // Remover caracteres perigosos
    .toLowerCase();
};

/**
 * Verifica se um texto contém outro texto (busca case-insensitive e flexível)
 * @param text - Texto onde buscar
 * @param search - Texto a ser buscado
 * @returns true se encontrou, false caso contrário
 */
export const containsText = (text: string, search: string): boolean => {
  if (!text || !search) return false;
  
  const normalizedText = normalizeForSearch(text);
  const normalizedSearch = normalizeForSearch(search);
  
  return normalizedText.includes(normalizedSearch);
};

/**
 * Normaliza texto para busca (remove acentos, espaços extras, etc.)
 * @param text - Texto a ser normalizado
 * @returns Texto normalizado para busca
 */
export const normalizeForSearch = (text: string): string => {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .trim()
    .normalize('NFD') // Decompor caracteres acentuados
    .replace(/[\u0300-\u036f]/g, '') // Remover acentos
    .replace(/\s+/g, ' '); // Normalizar espaços
};

/**
 * Busca flexível para NDS - tenta diferentes variações
 * @param nds - NDS do equipamento
 * @param search - Termo de busca
 * @returns true se encontrou correspondência
 */
export const matchNDS = (nds: string, search: string): boolean => {
  if (!nds || !search) return false;
  
  const normalizedNDS = normalizeNDS(nds);
  const normalizedSearch = normalizeNDS(search);
  
  // Busca exata
  if (normalizedNDS === normalizedSearch) return true;
  
  // Busca parcial
  if (normalizedNDS.includes(normalizedSearch)) return true;
  
  // Busca com zeros à esquerda
  const paddedSearch = normalizedSearch.padStart(normalizedNDS.length, '0');
  if (normalizedNDS === paddedSearch) return true;
  
  return false;
};

/**
 * Busca flexível para Smart Card - tenta diferentes variações
 * @param smartCard - Smart card do equipamento
 * @param search - Termo de busca
 * @returns true se encontrou correspondência
 */
export const matchSmartCard = (smartCard: string, search: string): boolean => {
  if (!smartCard || !search) return false;
  
  const normalizedCard = normalizeSmartCard(smartCard);
  const normalizedSearch = normalizeSmartCard(search);
  
  // Busca exata
  if (normalizedCard === normalizedSearch) return true;
  
  // Busca parcial
  if (normalizedCard.includes(normalizedSearch)) return true;
  
  // Busca ignorando formatação original
  const originalCard = smartCard.replace(/\s/g, '').toLowerCase();
  const originalSearch = search.replace(/\s/g, '').toLowerCase();
  if (originalCard.includes(originalSearch)) return true;
  
  return false;
};