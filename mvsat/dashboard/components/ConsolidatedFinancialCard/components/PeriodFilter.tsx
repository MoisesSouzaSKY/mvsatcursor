import React, { useState, memo, useCallback, useMemo } from 'react';
import { PeriodFilterProps, PeriodType, DateRange } from '../types/financial.types';
import { generateMonthOptions, getCurrentMonth, validateMonthValue } from '../utils/month.utils';
import { validateDateRange } from '../utils/period.utils';

const PeriodFilter: React.FC<PeriodFilterProps> = memo(({
  selectedPeriod,
  selectedMonth,
  customDateRange,
  onPeriodChange
}) => {
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(
    customDateRange?.start ? customDateRange.start.toISOString().split('T')[0] : ''
  );
  const [tempEndDate, setTempEndDate] = useState(
    customDateRange?.end ? customDateRange.end.toISOString().split('T')[0] : ''
  );
  const [dateError, setDateError] = useState<string>('');

  // Generate month options (Janeiro to Dezembro 2025)
  const monthOptions = useMemo(() => generateMonthOptions(), []);
  
  // Current selected value for the dropdown
  const currentValue = selectedPeriod === 'mes-especifico' 
    ? selectedMonth || getCurrentMonth()
    : selectedPeriod === 'todos-meses'
    ? 'todos'
    : 'personalizado';

  const handleDropdownChange = useCallback((value: string) => {
    if (value === 'personalizado') {
      setShowCustomDatePicker(true);
    } else if (value === 'todos') {
      setShowCustomDatePicker(false);
      onPeriodChange('todos-meses', 'todos');
    } else {
      // It's a month value (YYYY-MM format)
      if (validateMonthValue(value)) {
        setShowCustomDatePicker(false);
        onPeriodChange('mes-especifico', value);
      }
    }
  }, [onPeriodChange]);

  const handleCustomDateApply = useCallback(() => {
    if (!tempStartDate || !tempEndDate) {
      setDateError('Por favor, selecione ambas as datas');
      return;
    }

    const startDate = new Date(tempStartDate);
    const endDate = new Date(tempEndDate);
    
    const validation = validateDateRange(startDate, endDate);
    if (!validation.isValid) {
      setDateError(validation.error || 'Datas inválidas');
      return;
    }

    setDateError('');
    setShowCustomDatePicker(false);
    onPeriodChange('personalizado', { start: startDate, end: endDate });
  }, [tempStartDate, tempEndDate, onPeriodChange]);

  const handleCustomDateCancel = useCallback(() => {
    setShowCustomDatePicker(false);
    setDateError('');
    // Reset to previous values
    if (customDateRange) {
      setTempStartDate(customDateRange.start.toISOString().split('T')[0]);
      setTempEndDate(customDateRange.end.toISOString().split('T')[0]);
    }
  }, [customDateRange]);

  return (
    <div style={{ position: 'relative' }}>
      <select
        value={currentValue}
        onChange={(e) => handleDropdownChange(e.target.value)}
        style={{
          padding: '8px 12px',
          borderRadius: '8px',
          border: '1px solid #d1d5db',
          backgroundColor: 'white',
          fontSize: '14px',
          fontWeight: '500',
          color: '#374151',
          cursor: 'pointer',
          minWidth: '160px'
        }}
        aria-label="Selecionar mês para análise financeira"
        title="Escolha o mês para visualizar os dados financeiros"
      >
        {/* Meses em ordem cronológica (Janeiro, Fevereiro, Março...) */}
        {monthOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
        <option value="personalizado">📅 Período Personalizado</option>
      </select>

      {showCustomDatePicker && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: '8px',
          backgroundColor: 'white',
          border: '1px solid #d1d5db',
          borderRadius: '12px',
          padding: '16px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          zIndex: 1000,
          minWidth: '280px'
        }}>
          <div style={{ marginBottom: '12px' }}>
            <label style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: '600',
              color: '#6b7280',
              marginBottom: '4px'
            }}>
              Data Inicial
            </label>
            <input
              type="date"
              value={tempStartDate}
              onChange={(e) => setTempStartDate(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                fontSize: '14px'
              }}
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: '600',
              color: '#6b7280',
              marginBottom: '4px'
            }}>
              Data Final
            </label>
            <input
              type="date"
              value={tempEndDate}
              onChange={(e) => setTempEndDate(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                fontSize: '14px'
              }}
            />
          </div>

          {dateError && (
            <div style={{
              color: '#ef4444',
              fontSize: '12px',
              marginBottom: '12px',
              padding: '4px 0'
            }}>
              {dateError}
            </div>
          )}

          <div style={{
            display: 'flex',
            gap: '8px',
            justifyContent: 'flex-end'
          }}>
            <button
              onClick={handleCustomDateCancel}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                backgroundColor: 'white',
                color: '#6b7280',
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Cancelar
            </button>
            <button
              onClick={handleCustomDateApply}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#3b82f6',
                color: 'white',
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

PeriodFilter.displayName = 'PeriodFilter';

export default PeriodFilter;