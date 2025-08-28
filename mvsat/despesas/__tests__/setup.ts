// Jest setup for despesas tests
import '@testing-library/jest-dom';

// Mock Firebase functions
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  getDocs: jest.fn(),
  updateDoc: jest.fn(),
  doc: jest.fn(),
  serverTimestamp: jest.fn(() => new Date()),
}));

// Mock database config
jest.mock('../../config/database.config', () => ({
  getDb: jest.fn(() => ({})),
}));

// Mock base64 utility
jest.mock('../../shared/base64', () => ({
  fileToBase64: jest.fn(() => Promise.resolve('mock-base64-string')),
}));

// Mock window.alert
global.alert = jest.fn();

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};