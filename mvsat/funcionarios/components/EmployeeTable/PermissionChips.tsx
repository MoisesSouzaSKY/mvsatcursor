import React from 'react';
import { Employee } from '../../types/employee.types';

interface PermissionChipsProps {
  employee: Employee & { permissionMap?: { [module: string]: { [action: string]: boolean } } };
}

export function PermissionChips({ employee }: PermissionChipsProps) {
  // Se existir um mapa de permissões personalizadas, gera um resumo real
  if (employee.permissionMap) {
    const summary: string[] = [];
    const map = employee.permissionMap;
    const importantModules = ['clientes', 'assinaturas', 'equipamentos', 'cobrancas', 'despesas', 'tvbox', 'funcionarios'];
    importantModules.forEach(mod => {
      const actions = map[mod];
      if (!actions) return;
      const grantedActions = Object.keys(actions).filter(a => actions[a]);
      if (grantedActions.length > 0) {
        summary.push(`${mod}: ${grantedActions.slice(0, 2).join(', ')}`);
      }
    });
    const visible = summary.slice(0, 2);
    const remaining = summary.length - visible.length;
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
        {visible.map((text, idx) => (
          <div key={idx} style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: '500', whiteSpace: 'nowrap' }}>{text}</div>
        ))}
        {remaining > 0 && (
          <div style={{ backgroundColor: '#f3f4f6', color: '#6b7280', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: '500' }}>+{remaining}</div>
        )}
      </div>
    );
  }

  // Fallback baseado no role
  const getPermissionSummary = (roleName: string | undefined) => {
    switch (roleName) {
      case 'Admin':
        return ['Todos os módulos', 'Configurações'];
      case 'Gerente':
        return ['Quase tudo', 'Sem config. sistema'];
      case 'Financeiro':
        return ['Cobranças', 'Despesas'];
      case 'Atendimento':
        return ['Clientes', 'Assinaturas', 'TV Box'];
      case 'Manutenção/Estoque':
        return ['Manutenções', 'Equipamentos'];
      case 'Leitor':
        return ['Somente leitura'];
      default:
        return ['Sem permissões'];
    }
  };

  const permissions = getPermissionSummary(employee.role?.name);
  const maxVisible = 2;
  const visiblePermissions = permissions.slice(0, maxVisible);
  const remainingCount = permissions.length - maxVisible;

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: '4px',
      alignItems: 'center'
    }}>
      {visiblePermissions.map((permission, index) => (
        <div
          key={index}
          style={{
            backgroundColor: '#e0f2fe',
            color: '#0369a1',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: '500',
            whiteSpace: 'nowrap'
          }}
        >
          {permission}
        </div>
      ))}
      
      {remainingCount > 0 && (
        <div
          style={{
            backgroundColor: '#f3f4f6',
            color: '#6b7280',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: '500'
          }}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  );
}