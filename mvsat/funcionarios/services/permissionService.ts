import { Permission, PermissionOverride, PermissionMatrix, SystemModule, SystemAction } from '../types';
import { PermissionUtils } from '../utils';

export interface EmployeePermissions {
  employeeId: string;
  rolePermissions: PermissionMatrix;
  overrides: PermissionMatrix;
  finalPermissions: PermissionMatrix;
}

export interface PermissionOverrideRequest {
  employeeId: string;
  module: SystemModule;
  action: SystemAction;
  granted: boolean;
  reason?: string;
}

export class PermissionService {
  /**
   * Obtém todas as permissões de um funcionário (role + overrides)
   */
  static async getEmployeePermissions(employeeId: string): Promise<EmployeePermissions> {
    try {
      // Buscar funcionário e seu role
      const employee = await this.findEmployeeWithRole(employeeId);
      if (!employee) {
        throw new Error('Funcionário não encontrado');
      }

      // Obter permissões do role
      const rolePermissions = await this.getRolePermissions(employee.roleId);
      
      // Obter overrides individuais
      const overrides = await this.getEmployeeOverrides(employeeId);
      
      // Mesclar permissões
      const finalPermissions = PermissionUtils.mergePermissions(rolePermissions, overrides);

      return {
        employeeId,
        rolePermissions,
        overrides,
        finalPermissions
      };
    } catch (error) {
      console.error('Erro ao obter permissões do funcionário:', error);
      throw error;
    }
  }

  /**
   * Verifica se funcionário tem permissão específica
   */
  static async hasPermission(
    employeeId: string, 
    module: SystemModule, 
    action: SystemAction
  ): Promise<boolean> {
    try {
      const permissions = await this.getEmployeePermissions(employeeId);
      return PermissionUtils.hasPermission(permissions.finalPermissions, module, action);
    } catch (error) {
      console.error('Erro ao verificar permissão:', error);
      return false;
    }
  }

  /**
   * Verifica múltiplas permissões de uma vez
   */
  static async hasMultiplePermissions(
    employeeId: string,
    checks: Array<{ module: SystemModule; action: SystemAction }>
  ): Promise<{ [key: string]: boolean }> {
    try {
      const permissions = await this.getEmployeePermissions(employeeId);
      const results: { [key: string]: boolean } = {};

      checks.forEach(check => {
        const key = `${check.module}:${check.action}`;
        results[key] = PermissionUtils.hasPermission(
          permissions.finalPermissions, 
          check.module, 
          check.action
        );
      });

      return results;
    } catch (error) {
      console.error('Erro ao verificar múltiplas permissões:', error);
      return {};
    }
  }

  /**
   * Aplica override de permissão individual
   */
  static async applyPermissionOverride(
    request: PermissionOverrideRequest,
    createdBy: string
  ): Promise<boolean> {
    try {
      // Validar se funcionário existe
      const employee = await this.findEmployeeById(request.employeeId);
      if (!employee) {
        throw new Error('Funcionário não encontrado');
      }

      // Validar módulo e ação
      if (!this.isValidModuleAction(request.module, request.action)) {
        throw new Error('Módulo ou ação inválidos');
      }

      // Verificar se já existe override
      const existingOverride = await this.findOverride(
        request.employeeId, 
        request.module, 
        request.action
      );

      if (existingOverride) {
        // Atualizar override existente
        await this.updateOverride(existingOverride.id, {
          granted: request.granted,
          reason: request.reason
        });
      } else {
        // Criar novo override
        await this.createOverride({
          employeeId: request.employeeId,
          module: request.module,
          action: request.action,
          granted: request.granted,
          reason: request.reason,
          createdBy
        });
      }

      return true;
    } catch (error) {
      console.error('Erro ao aplicar override de permissão:', error);
      throw error;
    }
  }

  /**
   * Remove override de permissão (volta ao padrão do role)
   */
  static async removePermissionOverride(
    employeeId: string,
    module: SystemModule,
    action: SystemAction
  ): Promise<boolean> {
    try {
      const override = await this.findOverride(employeeId, module, action);
      if (!override) {
        return true; // Já não existe
      }

      await this.deleteOverride(override.id);
      return true;
    } catch (error) {
      console.error('Erro ao remover override de permissão:', error);
      return false;
    }
  }

  /**
   * Aplica modo "somente leitura" a um módulo para um funcionário
   */
  static async applyReadOnlyMode(
    employeeId: string,
    module: SystemModule,
    createdBy: string
  ): Promise<boolean> {
    try {
      const actions: SystemAction[] = ['create', 'update', 'delete', 'approve', 'manage_settings'];
      
      // Aplicar overrides para negar todas as ações exceto view
      for (const action of actions) {
        await this.applyPermissionOverride({
          employeeId,
          module,
          action,
          granted: false,
          reason: 'Modo somente leitura aplicado'
        }, createdBy);
      }

      // Garantir que view está habilitado
      await this.applyPermissionOverride({
        employeeId,
        module,
        action: 'view',
        granted: true,
        reason: 'Modo somente leitura aplicado'
      }, createdBy);

      return true;
    } catch (error) {
      console.error('Erro ao aplicar modo somente leitura:', error);
      return false;
    }
  }

  /**
   * Libera todas as permissões de um módulo para um funcionário
   */
  static async grantAllModulePermissions(
    employeeId: string,
    module: SystemModule,
    createdBy: string
  ): Promise<boolean> {
    try {
      const actions: SystemAction[] = ['view', 'create', 'update', 'delete', 'export', 'approve', 'manage_settings'];
      
      for (const action of actions) {
        await this.applyPermissionOverride({
          employeeId,
          module,
          action,
          granted: true,
          reason: 'Todas as permissões liberadas para o módulo'
        }, createdBy);
      }

      return true;
    } catch (error) {
      console.error('Erro ao liberar todas as permissões:', error);
      return false;
    }
  }

  /**
   * Reseta permissões de um módulo para o padrão do role
   */
  static async resetToRoleDefault(
    employeeId: string,
    module: SystemModule
  ): Promise<boolean> {
    try {
      // Remover todos os overrides do módulo
      const overrides = await this.findEmployeeModuleOverrides(employeeId, module);
      
      for (const override of overrides) {
        await this.deleteOverride(override.id);
      }

      return true;
    } catch (error) {
      console.error('Erro ao resetar para padrão do role:', error);
      return false;
    }
  }

  /**
   * Obtém matriz de permissões formatada para exibição
   */
  static async getPermissionMatrix(employeeId: string): Promise<{
    modules: Array<{
      name: string;
      displayName: string;
      actions: Array<{
        name: string;
        displayName: string;
        granted: boolean;
        isOverride: boolean;
        source: 'role' | 'override';
      }>;
    }>;
  }> {
    try {
      const permissions = await this.getEmployeePermissions(employeeId);
      const modules = this.getSystemModules();
      
      const matrix = {
        modules: modules.map(module => ({
          name: module.name,
          displayName: module.displayName,
          actions: module.actions.map(action => {
            const roleGranted = permissions.rolePermissions[module.name]?.[action.name] || false;
            const overrideGranted = permissions.overrides[module.name]?.[action.name];
            const finalGranted = permissions.finalPermissions[module.name]?.[action.name] || false;
            
            return {
              name: action.name,
              displayName: action.displayName,
              granted: finalGranted,
              isOverride: overrideGranted !== undefined,
              source: overrideGranted !== undefined ? 'override' : 'role'
            };
          })
        }))
      };

      return matrix;
    } catch (error) {
      console.error('Erro ao obter matriz de permissões:', error);
      throw error;
    }
  }

  /**
   * Obtém resumo das permissões de um funcionário
   */
  static async getPermissionSummary(employeeId: string): Promise<string[]> {
    try {
      const permissions = await this.getEmployeePermissions(employeeId);
      return PermissionUtils.getPermissionSummary(permissions.finalPermissions);
    } catch (error) {
      console.error('Erro ao obter resumo de permissões:', error);
      return [];
    }
  }

  /**
   * Valida se uma combinação módulo/ação é válida
   */
  private static isValidModuleAction(module: SystemModule, action: SystemAction): boolean {
    const moduleInfo = this.getSystemModules().find(m => m.name === module);
    if (!moduleInfo) return false;
    
    return moduleInfo.actions.some(a => a.name === action);
  }

  /**
   * Obtém definição dos módulos e ações do sistema
   */
  private static getSystemModules() {
    return [
      {
        name: 'clientes',
        displayName: 'Clientes',
        actions: [
          { name: 'view', displayName: 'Visualizar', requiresView: false },
          { name: 'create', displayName: 'Criar', requiresView: true },
          { name: 'update', displayName: 'Editar', requiresView: true },
          { name: 'delete', displayName: 'Excluir', requiresView: true },
          { name: 'export', displayName: 'Exportar', requiresView: true }
        ]
      },
      {
        name: 'assinaturas',
        displayName: 'Assinaturas',
        actions: [
          { name: 'view', displayName: 'Visualizar', requiresView: false },
          { name: 'create', displayName: 'Criar', requiresView: true },
          { name: 'update', displayName: 'Editar', requiresView: true },
          { name: 'delete', displayName: 'Excluir', requiresView: true },
          { name: 'export', displayName: 'Exportar', requiresView: true },
          { name: 'approve', displayName: 'Aprovar', requiresView: true }
        ]
      },
      {
        name: 'cobrancas',
        displayName: 'Cobranças',
        actions: [
          { name: 'view', displayName: 'Visualizar', requiresView: false },
          { name: 'create', displayName: 'Criar', requiresView: true },
          { name: 'update', displayName: 'Editar', requiresView: true },
          { name: 'delete', displayName: 'Excluir', requiresView: true },
          { name: 'export', displayName: 'Exportar', requiresView: true },
          { name: 'approve', displayName: 'Dar Baixa/Reabrir', requiresView: true }
        ]
      },
      {
        name: 'funcionarios',
        displayName: 'Funcionários',
        actions: [
          { name: 'view', displayName: 'Visualizar', requiresView: false },
          { name: 'create', displayName: 'Criar', requiresView: true },
          { name: 'update', displayName: 'Editar', requiresView: true },
          { name: 'delete', displayName: 'Excluir', requiresView: true },
          { name: 'export', displayName: 'Exportar', requiresView: true },
          { name: 'manage_settings', displayName: 'Gerenciar Configurações', requiresView: true }
        ]
      }
      // Adicionar outros módulos conforme necessário
    ];
  }

  // Métodos privados para acesso ao banco de dados

  private static async findEmployeeWithRole(employeeId: string): Promise<any> {
    // SELECT e.*, r.id as role_id FROM employees e JOIN roles r ON e.role_id = r.id WHERE e.id = ?
    return null; // Placeholder
  }

  private static async findEmployeeById(employeeId: string): Promise<any> {
    // SELECT * FROM employees WHERE id = ?
    return null; // Placeholder
  }

  private static async getRolePermissions(roleId: string): Promise<PermissionMatrix> {
    // SELECT * FROM role_permissions WHERE role_id = ?
    return {}; // Placeholder
  }

  private static async getEmployeeOverrides(employeeId: string): Promise<PermissionMatrix> {
    // SELECT * FROM employee_permission_overrides WHERE employee_id = ?
    return {}; // Placeholder
  }

  private static async findOverride(
    employeeId: string, 
    module: string, 
    action: string
  ): Promise<PermissionOverride | null> {
    // SELECT * FROM employee_permission_overrides WHERE employee_id = ? AND module = ? AND action = ?
    return null; // Placeholder
  }

  private static async createOverride(data: any): Promise<PermissionOverride> {
    // INSERT INTO employee_permission_overrides (employee_id, module, action, granted, reason, created_by)
    return {} as PermissionOverride; // Placeholder
  }

  private static async updateOverride(overrideId: string, data: any): Promise<void> {
    // UPDATE employee_permission_overrides SET granted = ?, reason = ? WHERE id = ?
  }

  private static async deleteOverride(overrideId: string): Promise<void> {
    // DELETE FROM employee_permission_overrides WHERE id = ?
  }

  private static async findEmployeeModuleOverrides(
    employeeId: string, 
    module: string
  ): Promise<PermissionOverride[]> {
    // SELECT * FROM employee_permission_overrides WHERE employee_id = ? AND module = ?
    return []; // Placeholder
  }
}