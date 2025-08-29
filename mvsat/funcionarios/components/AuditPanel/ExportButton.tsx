import React, { useState } from 'react';

interface ExportButtonProps {
  onExport: () => Promise<void>;
}

export function ExportButton({ onExport }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await onExport();
    } catch (error) {
      console.error('Erro ao exportar:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      style={{
        backgroundColor: '#059669',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        padding: '10px 16px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: isExporting ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        transition: 'all 0.2s ease',
        outline: 'none',
        opacity: isExporting ? 0.6 : 1
      }}
      onMouseEnter={(e) => {
        if (!isExporting) {
          e.currentTarget.style.backgroundColor = '#047857';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(5, 150, 105, 0.25)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isExporting) {
          e.currentTarget.style.backgroundColor = '#059669';
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
        }
      }}
    >
      <span style={{ fontSize: '14px' }}>
        {isExporting ? '⏳' : '📤'}
      </span>
      {isExporting ? 'Exportando...' : 'Exportar CSV'}
    </button>
  );
}