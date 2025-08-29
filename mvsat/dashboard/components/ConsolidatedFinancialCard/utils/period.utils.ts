import { DateRange } from '../types/financial.types';

// Validate custom date range
export const validateDateRange = (start: Date, end: Date): { isValid: boolean; error?: string } => {
  if (start > end) {
    return { isValid: false, error: 'Data inicial deve ser anterior à data final' };
  }
  
  const hoje = new Date();
  const maxDate = new Date(hoje.getFullYear() + 1, hoje.getMonth(), hoje.getDate());
  
  if (end > maxDate) {
    return { isValid: false, error: 'Data final não pode ser superior a um ano no futuro' };
  }
  
  const minDate = new Date(hoje.getFullYear() - 5, hoje.getMonth(), hoje.getDate());
  
  if (start < minDate) {
    return { isValid: false, error: 'Data inicial não pode ser superior a 5 anos no passado' };
  }
  
  return { isValid: true };
};

