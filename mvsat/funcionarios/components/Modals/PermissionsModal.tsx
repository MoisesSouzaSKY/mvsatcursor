import React, { useState } from 'react';
import { Employee } from '../../types';

interface PermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee;
  onSave: (permissions: {[key: string]: {[key: string]: boolean}}) => Promise<void>;
}

export function PermissionsModal({ isOpen, onClose, employee, onSave }: PermissionsModalProps) {
  const [loading, setLoading] = useState(false);
  const [permissions, setPermissions] = useState<{[key: string]: {[key: string]: boolean}}>({});

  const modules = [
    { name: 'clientes', displayName: 'Clientes' },
    { name: 'assinaturas', displayName: 'Assinaturas' },
    { name: 'equipamentos', displayName: 'Equipamentos' },
    { name: 'cobrancas', displayName: 'Cobranças' },
    { name: 'despesas', displayName: 'Despesas' },
    { name: 'tvbox', displayName: 'TV Box' },
    { name: 'funcionarios', displayName: 'Funcionários' }
  ];

  const actions = [
    { name: 'view', displayName: 'Visualizar' },
    { name: 'create', displayName: 'Criar' },
    { name: 'update', displayName: 'Editar' },
    { name: 'delete', displayName: 'Excluir' },
    { name: 'export', displayName: 'Exportar' },
    { name: 'approve', displayName: 'Aprovar' }
  ];

  // Inicializar permissões quando o modal abrir (carrega do Firestore se existir)
  React.useEffect(() => {
    (async () => {
      if (!isOpen || !employee) return;
      try {
        const { getDb } = await import('../../../config/database.config');
        const { doc, getDoc } = await import('firebase/firestore');
        const db = getDb();
        const ref = doc(db, 'employee_permissions', employee.id);
        const snap = await getDoc(ref);

        const base: {[key: string]: {[key: string]: boolean}} = {};
        modules.forEach(m => {
          base[m.name] = {} as any;
          actions.forEach(a => { base[m.name][a.name] = false; });
        });

        if (snap.exists()) {
          const data = snap.data();
          const saved = (data?.permissions || {}) as {[key: string]: {[key: string]: boolean}};
          // merge conservando chaves
          Object.keys(saved).forEach(mod => {
            base[mod] = { ...(base[mod] || {}), ...saved[mod] };
          });
        }

        setPermissions(base);
      } catch (e) {
        // fallback para tudo falso
        const empty: {[key: string]: {[key: string]: boolean}} = {};
        modules.forEach(m => {
          empty[m.name] = {} as any;
          actions.forEach(a => { empty[m.name][a.name] = false; });
        });
        setPermissions(empty);
      }
    })();
  }, [isOpen, employee]);

  if (!isOpen) return null;

  const handlePermissionChange = (module: string, action: string, checked: boolean) => {
    setPermissions(prev => ({
      ...prev,
      [module]: {
        ...prev[module],
        [action]: checked
      }
    }));
  };

  // Salvar no Firestore
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      console.log('Salvando permissões:', permissions); // Debug
      // Persistir no Firestore
      const { getDb } = await import('../../../config/database.config');
      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
      const db = getDb();
      const ref = doc(db, 'employee_permissions', employee.id);
      await setDoc(ref, {
        employeeId: employee.id,
        permissions,
        updatedAt: serverTimestamp()
      }, { merge: true });

      await onSave(permissions);
      onClose();
    } catch (error) {
      console.error('Erro ao salvar permissões:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}
        onClick={onClose}
      >
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            maxWidth: '900px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{
            padding: '24px',
            borderBottom: '1px solid #e5e7eb'
          }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: '#1f2937',
              margin: '0 0 8px 0'
            }}>
              Permissões - {employee.name}
            </h2>
            <p style={{
              fontSize: '14px',
              color: '#6b7280',
              margin: '0'
            }}>
              Perfil atual: {employee.role?.name}
            </p>
          </div>

          <div style={{
            padding: '24px',
            overflowY: 'auto',
            flex: 1
          }}>


            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                border: '1px solid #e5e7eb',
                borderRadius: '8px'
              }}>
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb' }}>
                    <th style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#6b7280',
                      borderBottom: '1px solid #e5e7eb'
                    }}>
                      Módulo
                    </th>
                    {actions.map(action => (
                      <th key={action.name} style={{
                        padding: '12px 8px',
                        textAlign: 'center',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#6b7280',
                        borderBottom: '1px solid #e5e7eb',
                        borderLeft: '1px solid #e5e7eb'
                      }}>
                        {action.displayName}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {modules.map((module, moduleIndex) => (
                    <tr key={module.name} style={{
                      borderBottom: moduleIndex < modules.length - 1 ? '1px solid #f3f4f6' : 'none'
                    }}>
                      <td style={{
                        padding: '12px 16px',
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#1f2937'
                      }}>
                        {module.displayName}
                      </td>
                      {actions.map(action => (
                        <td key={action.name} style={{
                          padding: '12px 8px',
                          textAlign: 'center',
                          borderLeft: '1px solid #f3f4f6'
                        }}>
                          <input
                            type="checkbox"
                            checked={permissions[module.name]?.[action.name] || false}
                            onChange={(e) => handlePermissionChange(module.name, action.name, e.target.checked)}
                            style={{
                              cursor: 'pointer',
                              transform: 'scale(1.2)'
                            }}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{
            padding: '24px',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px'
          }}>
            <button
              onClick={onClose}
              disabled={loading}
              style={{
                backgroundColor: 'transparent',
                color: '#6b7280',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                outline: 'none'
              }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{
                backgroundColor: '#8b5cf6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                outline: 'none'
              }}
            >
              {loading ? 'Salvando...' : 'Salvar Permissões'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}