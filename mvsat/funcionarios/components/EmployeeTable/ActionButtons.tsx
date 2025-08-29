import React, { useEffect, useState } from 'react';
import { Employee } from '../../types/employee.types';
import { hasPermissionForCurrentUser } from '../../../shared/permissions';

interface ActionButtonsProps {
  employee: Employee;
  onViewProfile: (employee: Employee) => void;
  onEditPermissions: (employee: Employee) => void;
  onResetPassword: (employee: Employee) => void;
  onRemove: (employee: Employee) => void;
}

export function ActionButtons({
  employee,
  onViewProfile,
  onEditPermissions,
  onResetPassword,
  onRemove
}: ActionButtonsProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [canDelete, setCanDelete] = useState(false);

  useEffect(() => {
    (async () => {
      setCanEdit(await hasPermissionForCurrentUser('funcionarios', 'update'));
      setCanDelete(await hasPermissionForCurrentUser('funcionarios', 'delete'));
    })();
  }, []);

  // Fechar dropdown quando clicar fora
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showDropdown) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showDropdown]);

  const actions = [
    {
      label: 'Ver Perfil',
      icon: '👤',
      onClick: () => onViewProfile(employee),
      color: '#3b82f6'
    },
    {
      label: 'Permissões',
      icon: '🔐',
      onClick: () => onEditPermissions(employee),
      color: '#8b5cf6'
    },
    {
      label: 'Resetar Senha',
      icon: '🔑',
      onClick: () => onResetPassword(employee),
      color: '#6b7280'
    },
    {
      label: 'Remover',
      icon: '🗑️',
      onClick: () => onRemove(employee),
      color: '#ef4444'
    }
  ];

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowDropdown(!showDropdown);
        }}
        style={{
          backgroundColor: '#f3f4f6',
          border: 'none',
          borderRadius: '6px',
          padding: '6px 8px',
          cursor: 'pointer',
          fontSize: '14px',
          color: '#374151',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          transition: 'all 0.2s ease',
          outline: 'none'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#e5e7eb';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#f3f4f6';
        }}
      >
        ⚙️
        <span style={{ fontSize: '12px' }}>▼</span>
      </button>

      {showDropdown && (
        <>
          {/* Dropdown menu */}
          <div
            style={{
              position: 'fixed',
              top: 'auto',
              left: 'auto',
              right: 'auto',
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
              border: '1px solid #e5e7eb',
              minWidth: '180px',
              zIndex: 9999,
              overflow: 'hidden'
            }}
            ref={(el) => {
              if (el) {
                const button = el.previousElementSibling as HTMLElement;
                if (button) {
                  const rect = button.getBoundingClientRect();
                  el.style.top = `${rect.bottom + 4}px`;
                  el.style.left = `${rect.right - 180}px`;
                }
              }
            }}
          >
            {actions.map((action, index) => (
              <button
                key={index}
                disabled={(action.label === 'Remover' && !canDelete) || (action.label !== 'Ver Perfil' && action.label !== 'Permissões' && action.label !== 'Resetar Senha' && !canEdit)}
                onClick={(e) => {
                  e.stopPropagation();
                  if (((action.label === 'Remover' && !canDelete) || (action.label !== 'Ver Perfil' && action.label !== 'Permissões' && action.label !== 'Resetar Senha' && !canEdit))) {
                    return;
                  }
                  action.onClick();
                  setShowDropdown(false);
                }}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#374151',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'background-color 0.2s ease',
                  outline: 'none'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f9fafb';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <span style={{ fontSize: '12px' }}>{action.icon}</span>
                <span style={{ color: action.color }}>{action.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}