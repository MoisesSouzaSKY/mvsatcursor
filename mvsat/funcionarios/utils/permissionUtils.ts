import { PermissionMatrix, SystemModule, SystemAction } from '../types';

export class PermissionUtils {
  /**
   * Converte string de permissão no formato "module:action" em objeto
   */
  static parsePermissionString(permission: string): { module: string; action: string } {
    const [module, action] = permission.split(':');
    return { module, action };
  }

  /**
   * Constrói matriz de permissões a partir de array de strings
   */
  static buildPermissionMatrix(permissions: string[]): PermissionMatrix {
    const matrix: PermissionMatrix = {};

    permissions.forEach(permission => {
      if (permission === '*:*') {
        // Acesso total - adiciona todas as permissões
        this.getAllModules().forEach(module => {
          if (!matrix[module]) matrix[module] = {};
          this.getAllActions().forEach(action => {
            matrix[module][action] = true;
          });
        });
      } else if (permission.startsWith('!')) {
        // Negação - remove permissão específica
        const { module, action } = this.parsePermissionString(permission.substring(1));
        if (module === '*') {
          this.getAllModules().forEach(mod => {
            if (!matrix[mod]) matrix[mod] = {};
            if (action === '*') {
              this.getAllActions().forEach(act => {
                matrix[mod][act] = false;
              });
            } else {
              matrix[mod][action] = false;
            }
          });
        } else {
          if (!matrix[module]) matrix[module] = {};
          if (action === '*') {
            this.getAllActions().forEach(act => {
              matrix[module][act] = false;
            });
          } else {
            matrix[module][action] = false;
          }
        }
      } else if (permission.includes('*')) {
        // Wildcard
        const { module, action } = this.parsePermissionString(permission);
        if (module === '*') {
          this.getAllModules().forEach(mod => {
            if (!matrix[mod]) matrix[mod] = {};
            if (action === '*') {
              this.getAllActions().forEach(act => {
                matrix[mod][act] = true;
              });
            } else {
              matrix[mod][action] = true;
            }
          });
        } else {
          if (!matrix[module]) matrix[module] = {};
          if (action === '*') {
            this.getAllActions().forEach(act => {
              matrix[module][act] = true;
            });
          } else {
            matrix[module][action] = true;
          }
        }
      } else {
        // Permissão específica
        const { module, action } = this.parsePermissionString(permission);
        if (!matrix[module]) matrix[module] = {};
        matrix[module][action] = true;
      }
    });

    return matrix;
  }

  /**
   * Mescla permissões do perfil com overrides individuais
   */
  static mergePermissions(
    rolePermissions: PermissionMatrix, 
    overrides: PermissionMatrix
  ): PermissionMatrix {
    const merged = { ...rolePermissions };

    Object.keys(overrides).forEach(module => {
      if (!merged[module]) merged[module] = {};
      Object.keys(overrides[module]).forEach(action => {
        merged[module][action] = overrides[module][action];
      });
    });

    return merged;
  }

  /**
   * Valida dependências de permissões (view é pré-requisito)
   */
  static validatePermissionDependencies(permissions: PermissionMatrix): boolean {
    for (const module of Object.keys(permissions)) {
      const modulePerms = permissions[module];
      
      // Se tem qualquer permissão além de view, deve ter view também
      const hasOtherPermissions = Object.keys(modulePerms).some(
        action => action !== 'view' && modulePerms[action]
      );
      
      if (hasOtherPermissions && !modulePerms.view) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Verifica se usuário tem permissão específica
   */
  static hasPermission(
    permissions: PermissionMatrix,
    module: SystemModule,
    action: SystemAction
  ): boolean {
    return permissions[module]?.[action] === true;
  }

  /**
   * Aplica modo "somente leitura" a um módulo
   */
  static applyReadOnlyMode(permissions: PermissionMatrix, module: string): PermissionMatrix {
    const updated = { ...permissions };
    if (!updated[module]) updated[module] = {};
    
    // Manter apenas view, remover outras ações
    updated[module] = {
      view: true,
      create: false,
      update: false,
      delete: false,
      export: updated[module].export || false, // Manter export se já tinha
      approve: false,
      manage_settings: false
    };
    
    return updated;
  }

  /**
   * Libera todas as permissões de um módulo
   */
  static grantAllPermissions(permissions: PermissionMatrix, module: string): PermissionMatrix {
    const updated = { ...permissions };
    if (!updated[module]) updated[module] = {};
    
    this.getAllActions().forEach(action => {
      updated[module][action] = true;
    });
    
    return updated;
  }

  /**
   * Reseta permissões de um módulo para o padrão do perfil
   */
  static resetToRoleDefault(
    currentPermissions: PermissionMatrix,
    rolePermissions: PermissionMatrix,
    module: string
  ): PermissionMatrix {
    const updated = { ...currentPermissions };
    updated[module] = { ...rolePermissions[module] };
    return updated;
  }

  /**
   * Obtém lista de todos os módulos do sistema
   */
  private static getAllModules(): string[] {
    return [
      'clientes', 'assinaturas', 'equipamentos', 'cobrancas',
      'despesas', 'tvbox', 'locacoes', 'motos', 'manutencoes',
      'multas', 'contratos', 'funcionarios', 'dashboard'
    ];
  }

  /**
   * Obtém lista de todas as ações do sistema
   */
  private static getAllActions(): string[] {
    return ['view', 'create', 'update', 'delete', 'export', 'approve', 'manage_settings'];
  }

  /**
   * Converte matriz de permissões em array de strings legíveis
   */
  static getPermissionSummary(permissions: PermissionMatrix): string[] {
    const summary: string[] = [];
    
    Object.keys(permissions).forEach(module => {
      const modulePerms = permissions[module];
      const grantedActions = Object.keys(modulePerms).filter(action => modulePerms[action]);
      
      if (grantedActions.length > 0) {
        summary.push(`${module}: ${grantedActions.join(', ')}`);
      }
    });
    
    return summary;
  }

  /**
   * Verifica se é um perfil de administrador (acesso total)
   */
  static isAdminRole(permissions: PermissionMatrix): boolean {
    const allModules = this.getAllModules();
    const allActions = this.getAllActions();
    
    return allModules.every(module => 
      allActions.every(action => 
        permissions[module]?.[action] === true
      )
    );
  }
}