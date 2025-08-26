import { useState, useCallback } from 'react';
import { clienteAssinaturaService } from '../services/ClienteAssinaturaService';

export interface ValidationResult {
  isValid: boolean;
  issues: string[];
  clientesCount: number;
  equipamentosCount: number;
  isLoading: boolean;
  error: string | null;
}

export const useClienteAssinaturaValidation = () => {
  const [validationResults, setValidationResults] = useState<Map<string, ValidationResult>>(new Map());

  const validateAssinatura = useCallback(async (assinaturaId: string): Promise<ValidationResult> => {
    // Marca como carregando
    const loadingResult: ValidationResult = {
      isValid: false,
      issues: [],
      clientesCount: 0,
      equipamentosCount: 0,
      isLoading: true,
      error: null
    };
    
    setValidationResults(prev => new Map(prev).set(assinaturaId, loadingResult));

    try {
      const validation = await clienteAssinaturaService.validateClienteAssinaturaIntegrity(assinaturaId);
      
      const result: ValidationResult = {
        ...validation,
        isLoading: false,
        error: null
      };

      setValidationResults(prev => new Map(prev).set(assinaturaId, result));
      return result;

    } catch (error) {
      const errorResult: ValidationResult = {
        isValid: false,
        issues: [`Erro na validação: ${error}`],
        clientesCount: 0,
        equipamentosCount: 0,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };

      setValidationResults(prev => new Map(prev).set(assinaturaId, errorResult));
      return errorResult;
    }
  }, []);

  const getValidationResult = useCallback((assinaturaId: string): ValidationResult | null => {
    return validationResults.get(assinaturaId) || null;
  }, [validationResults]);

  const clearValidation = useCallback((assinaturaId: string) => {
    setValidationResults(prev => {
      const newMap = new Map(prev);
      newMap.delete(assinaturaId);
      return newMap;
    });
  }, []);

  const clearAllValidations = useCallback(() => {
    setValidationResults(new Map());
  }, []);

  return {
    validateAssinatura,
    getValidationResult,
    clearValidation,
    clearAllValidations,
    validationResults: Array.from(validationResults.entries())
  };
};