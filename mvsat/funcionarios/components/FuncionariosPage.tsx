import React, { useState, useEffect } from 'react';
import { collection, getDocs, getDoc, doc } from 'firebase/firestore';
import { getDb } from '../../config/database.config';
import { SummaryCards } from './SummaryCards/SummaryCards';
import { hasPermissionForCurrentUser } from '../../shared/permissions';
import { EmployeeTable } from './EmployeeTable/EmployeeTable';
import { AuditPanel } from './AuditPanel/AuditPanel';
import { NewEmployeeModal } from './Modals/NewEmployeeModal';
import { PermissionsModal } from './Modals/PermissionsModal';
import { EmployeeProfileModal } from './Modals/EmployeeProfileModal';
import { Employee, EmployeeStats } from '../types/employee.types';

export function FuncionariosPage() {
  // Estados principais
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stats, setStats] = useState<EmployeeStats>({
    activeEmployees: 0,
    suspendedEmployees: 0,
    pendingInvites: 0,
    lastAccess: null
  });
  const [loading, setLoading] = useState(true);

  // Estados dos modais
  const [showNewEmployeeModal, setShowNewEmployeeModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Carregar dados iniciais
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Carregar funcionários e estatísticas
      // const [employeesData, statsData] = await Promise.all([
      //   EmployeeService.getAll(),
      //   EmployeeService.getStats()
      // ]);
      
      // setEmployees(employeesData);
      // setStats(statsData);
      
      // Carregar dados reais do Firestore
      const db = getDb();
      
      // Buscar funcionários
      const employeesSnap = await getDocs(collection(db, 'employees'));
      const employeesData: Employee[] = [];
      
      for (const employeeDoc of employeesSnap.docs) {
        const employeeData = employeeDoc.data();
        const roleSnap = await getDoc(doc(db, 'roles', employeeData.roleId));
        const roleData = roleSnap.exists() ? roleSnap.data() : null;
        // Carregar permissões específicas salvas deste funcionário (se existirem)
        let permissionMap: any = undefined;
        try {
          const permSnap = await getDoc(doc(db, 'employee_permissions', employeeDoc.id));
          if (permSnap.exists()) {
            const pdata = permSnap.data();
            permissionMap = pdata?.permissions || undefined;
          }
        } catch (e) {
          // silencioso
        }
        
        employeesData.push({
          id: employeeDoc.id,
          name: employeeData.name,
          email: employeeData.email,
          roleId: employeeData.roleId,
          status: employeeData.status,
          twoFactorEnabled: employeeData.twoFactorEnabled || false,
          lastAccess: employeeData.lastAccess?.toDate?.() || null,
          createdAt: employeeData.createdAt?.toDate?.() || new Date(),
          updatedAt: employeeData.updatedAt?.toDate?.() || new Date(),
          role: roleData ? {
            id: roleSnap.id,
            name: roleData.name,
            description: roleData.description,
            isDefault: roleData.isDefault,
            createdAt: roleData.createdAt?.toDate?.() || new Date(),
            updatedAt: roleData.updatedAt?.toDate?.() || new Date(),
            permissions: []
          } : undefined
        } as any);
        // anexa mapa de permissões customizadas (fora do tipo estrito)
        (employeesData[employeesData.length - 1] as any).permissionMap = permissionMap;
      }
      
      setEmployees(employeesData);
      
      // Calcular estatísticas reais
      const activeCount = employeesData.filter(e => e.status === 'active').length;
      const suspendedCount = employeesData.filter(e => e.status === 'suspended' || e.status === 'blocked').length;
      const pendingCount = employeesData.filter(e => e.status === 'pending_invite').length;
      
      // Calcular último acesso válido
      let lastAccess = null;
      if (employeesData.length > 0) {
        const validDates = employeesData
          .map(e => e.lastAccess)
          .filter(date => date && date instanceof Date && !isNaN(date.getTime()));
        
        if (validDates.length > 0) {
          lastAccess = new Date(Math.max(...validDates.map(d => d!.getTime())));
        }
      }
      
      setStats({
        activeEmployees: activeCount,
        suspendedEmployees: suspendedCount,
        pendingInvites: pendingCount,
        lastAccess
      });

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handlers dos modais
  const handleNewEmployee = () => {
    setShowNewEmployeeModal(true);
  };

  const handleViewProfile = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowProfileModal(true);
  };

  const handleEditPermissions = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowPermissionsModal(true);
  };



  const handleResetPassword = async (employee: Employee) => {
    try {
      // await EmployeeService.resetPassword(employee.id);
      console.log('Resetando senha do funcionário:', employee.name);
    } catch (error) {
      console.error('Erro ao resetar senha:', error);
    }
  };



  const handleRemoveEmployee = async (employee: Employee) => {
    if (window.confirm(`Tem certeza que deseja remover ${employee.name}?`)) {
      try {
        // await EmployeeService.remove(employee.id);
        console.log('Removendo funcionário:', employee.name);
        await loadData(); // Recarregar dados
      } catch (error) {
        console.error('Erro ao remover funcionário:', error);
      }
    }
  };

  return (
    <div style={{
      padding: '20px',
      backgroundColor: '#f9fafb',
      minHeight: '100vh',
      width: '100%',
      maxWidth: 'none'
    }}>
      {/* Banner Informativo */}
      <div style={{
        background: 'linear-gradient(135deg, #1e3a8a 0%, #e5e7eb 100%)',
        borderRadius: '16px',
        padding: '40px 32px',
        marginBottom: '32px',
        width: '100%',
        minHeight: '160px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{
          position: 'absolute',
          left: '32px',
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: '56px',
          opacity: '0.25',
          color: 'white'
        }}>
          👥
        </div>
        
        <div style={{
          position: 'absolute',
          right: '-20px',
          top: '-20px',
          width: '120px',
          height: '120px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '50%',
          filter: 'blur(30px)'
        }} />
        
        <div style={{
          textAlign: 'center',
          paddingLeft: '100px',
          paddingRight: '40px',
          position: 'relative',
          zIndex: 1
        }}>
          <h1 style={{
            fontSize: '48px',
            fontWeight: '700',
            color: 'white',
            margin: '0 0 16px 0',
            textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
            letterSpacing: '2px'
          }}>
            FUNCIONÁRIOS
          </h1>
          <p style={{
            fontSize: '20px',
            color: 'rgba(255, 255, 255, 0.95)',
            fontWeight: '400',
            textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            Gestão completa da equipe com controle de acessos e auditoria
          </p>
        </div>
      </div>

      {/* Header com botão de ação */}
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        {!loading && (
          <button
            onClick={async () => {
              const allowed = await hasPermissionForCurrentUser('funcionarios', 'create');
              if (!allowed) return;
              handleNewEmployee();
            }}
            style={{
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 20px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.2s ease',
              outline: 'none'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#059669';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.25)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#10b981';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
            }}
          >
            <span style={{ fontSize: '14px' }}>➕</span>
            Novo Funcionário
          </button>
        )}
      </div>

      {/* Cards de resumo */}
      <SummaryCards
        stats={stats}
        loading={loading}
      />

      {/* Tabela de funcionários */}
      <div style={{ marginBottom: '32px' }}>
        <EmployeeTable
          employees={employees}
          loading={loading}
          onViewProfile={handleViewProfile}
          onEditPermissions={handleEditPermissions}
          onResetPassword={handleResetPassword}
          onRemove={handleRemoveEmployee}
        />
      </div>

      {/* Painel de auditoria */}
      <AuditPanel />

      {/* Modais */}
      {showNewEmployeeModal && (
        <NewEmployeeModal
          isOpen={showNewEmployeeModal}
          onClose={() => setShowNewEmployeeModal(false)}
          onSave={async (employeeData) => {
            try {
              // await EmployeeService.create(employeeData);
              console.log('Criando funcionário:', employeeData);
              setShowNewEmployeeModal(false);
              await loadData();
            } catch (error) {
              console.error('Erro ao criar funcionário:', error);
            }
          }}
        />
      )}

      {showPermissionsModal && selectedEmployee && (
        <PermissionsModal
          isOpen={showPermissionsModal}
          onClose={() => {
            setShowPermissionsModal(false);
            setSelectedEmployee(null);
          }}
          employee={selectedEmployee}
          onSave={async (permissions) => {
            try {
              // await PermissionService.updateEmployeePermissions(selectedEmployee.id, permissions);
              console.log('Atualizando permissões:', permissions);
              setShowPermissionsModal(false);
              setSelectedEmployee(null);
              await loadData();
            } catch (error) {
              console.error('Erro ao atualizar permissões:', error);
            }
          }}
        />
      )}

      {showProfileModal && selectedEmployee && (
        <EmployeeProfileModal
          isOpen={showProfileModal}
          onClose={() => {
            setShowProfileModal(false);
            setSelectedEmployee(null);
          }}
          employee={selectedEmployee}
        />
      )}
    </div>
  );
}