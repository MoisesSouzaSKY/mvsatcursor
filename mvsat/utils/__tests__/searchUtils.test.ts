/**
 * Testes para utilitários de busca
 */

import {
  normalizeNDS,
  normalizeSmartCard,
  sanitizeSearchInput,
  containsText,
  normalizeForSearch,
  matchNDS,
  matchSmartCard
} from '../searchUtils';

describe('searchUtils', () => {
  describe('normalizeNDS', () => {
    test('deve remover espaços e converter para lowercase', () => {
      expect(normalizeNDS('  123ABC  ')).toBe('123abc');
    });

    test('deve remover zeros à esquerda', () => {
      expect(normalizeNDS('000123')).toBe('123');
      expect(normalizeNDS('00000')).toBe('');
    });

    test('deve tratar string vazia', () => {
      expect(normalizeNDS('')).toBe('');
      expect(normalizeNDS(null as any)).toBe('');
      expect(normalizeNDS(undefined as any)).toBe('');
    });

    test('deve remover espaços internos', () => {
      expect(normalizeNDS('1 2 3')).toBe('123');
    });
  });

  describe('normalizeSmartCard', () => {
    test('deve remover formatação comum', () => {
      expect(normalizeSmartCard('1234 5678 9012')).toBe('123456789012');
      expect(normalizeSmartCard('1234-5678-9012')).toBe('123456789012');
      expect(normalizeSmartCard('1234.5678.9012')).toBe('123456789012');
    });

    test('deve remover parênteses e caracteres especiais', () => {
      expect(normalizeSmartCard('(1234) 5678-9012')).toBe('123456789012');
    });

    test('deve manter apenas números e letras', () => {
      expect(normalizeSmartCard('1234@#$%5678')).toBe('12345678');
    });

    test('deve converter para lowercase', () => {
      expect(normalizeSmartCard('1234ABCD')).toBe('1234abcd');
    });

    test('deve tratar string vazia', () => {
      expect(normalizeSmartCard('')).toBe('');
      expect(normalizeSmartCard(null as any)).toBe('');
    });
  });

  describe('sanitizeSearchInput', () => {
    test('deve remover caracteres perigosos', () => {
      expect(sanitizeSearchInput('test<script>')).toBe('testscript');
      expect(sanitizeSearchInput('test"quote')).toBe('testquote');
    });

    test('deve limitar tamanho máximo', () => {
      const longString = 'a'.repeat(100);
      expect(sanitizeSearchInput(longString)).toHaveLength(50);
    });

    test('deve converter para lowercase', () => {
      expect(sanitizeSearchInput('TEST')).toBe('test');
    });
  });

  describe('containsText', () => {
    test('deve encontrar texto case-insensitive', () => {
      expect(containsText('Hello World', 'hello')).toBe(true);
      expect(containsText('Hello World', 'WORLD')).toBe(true);
    });

    test('deve normalizar acentos', () => {
      expect(containsText('João', 'joao')).toBe(true);
      expect(containsText('Ação', 'acao')).toBe(true);
    });

    test('deve retornar false para strings vazias', () => {
      expect(containsText('', 'test')).toBe(false);
      expect(containsText('test', '')).toBe(false);
    });
  });

  describe('matchNDS', () => {
    test('deve encontrar correspondência exata', () => {
      expect(matchNDS('123', '123')).toBe(true);
      expect(matchNDS('ABC123', 'abc123')).toBe(true);
    });

    test('deve encontrar correspondência parcial', () => {
      expect(matchNDS('123456', '123')).toBe(true);
      expect(matchNDS('ABC123DEF', '123')).toBe(true);
    });

    test('deve tratar zeros à esquerda', () => {
      expect(matchNDS('123', '00123')).toBe(true);
      expect(matchNDS('00123', '123')).toBe(true);
    });

    test('deve retornar false para não correspondências', () => {
      expect(matchNDS('123', '456')).toBe(false);
      expect(matchNDS('ABC', '123')).toBe(false);
    });

    test('deve tratar strings vazias', () => {
      expect(matchNDS('', '123')).toBe(false);
      expect(matchNDS('123', '')).toBe(false);
    });
  });

  describe('matchSmartCard', () => {
    test('deve encontrar correspondência exata', () => {
      expect(matchSmartCard('1234567890', '1234567890')).toBe(true);
    });

    test('deve encontrar correspondência ignorando formatação', () => {
      expect(matchSmartCard('1234 5678 9012', '123456789012')).toBe(true);
      expect(matchSmartCard('1234-5678-9012', '1234 5678 9012')).toBe(true);
    });

    test('deve encontrar correspondência parcial', () => {
      expect(matchSmartCard('1234567890', '1234')).toBe(true);
      expect(matchSmartCard('1234 5678 9012', '5678')).toBe(true);
    });

    test('deve ser case-insensitive', () => {
      expect(matchSmartCard('1234ABCD', '1234abcd')).toBe(true);
      expect(matchSmartCard('abcd1234', 'ABCD')).toBe(true);
    });

    test('deve retornar false para não correspondências', () => {
      expect(matchSmartCard('1234567890', '0987654321')).toBe(false);
    });

    test('deve tratar strings vazias', () => {
      expect(matchSmartCard('', '123')).toBe(false);
      expect(matchSmartCard('123', '')).toBe(false);
    });
  });

  describe('normalizeForSearch', () => {
    test('deve remover acentos', () => {
      expect(normalizeForSearch('João')).toBe('joao');
      expect(normalizeForSearch('Ação')).toBe('acao');
      expect(normalizeForSearch('Coração')).toBe('coracao');
    });

    test('deve normalizar espaços', () => {
      expect(normalizeForSearch('  hello   world  ')).toBe('hello world');
    });

    test('deve converter para lowercase', () => {
      expect(normalizeForSearch('HELLO WORLD')).toBe('hello world');
    });

    test('deve tratar string vazia', () => {
      expect(normalizeForSearch('')).toBe('');
      expect(normalizeForSearch(null as any)).toBe('');
    });
  });
});