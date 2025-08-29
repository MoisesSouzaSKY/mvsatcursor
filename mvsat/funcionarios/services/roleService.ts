import { Role, RolePermission, DEFAULT_ROLES } from '../types';
import { PermissionUtils } from '../utils';
import { getDb } from '../../config/database.config';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  addDoc,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';

export interface CreateRoleData {
  name: string;
  description: string;
  permissions: string[]; // Array de strings no formato "module:action"
}

export interface UpdateRoleData {
  name?: string;
  description?: string;
  permissions?: string[];
}

export class RoleService {
  /**
   * Inicializa perfis padrão do sistema
   */
  static async initializeDefaultRoles(): Promise<void> {
    try {
      for (const roleTemplate of DEFAULT_ROLES) {
        const existingRole = await this.findRoleByName(roleTemplate.name);
        
        if (!existingRole) {
          await this.createRole({
            name: roleTemplate.name,
            description: roleTemplate.description,
            permissions: roleTemplate.permissions
          });
          
          console.log(`Perfil padrão criado: ${roleTemplate.name}`);
        } else {
          // Atualizar permissões se necessário
          await this.updateRolePermissions(existingRole.id, roleTemplate.permissions);
          console.log(`Perfil padrão atualizado: ${roleTemplate.name}`);
        }
      }
    } catch (error) {
      console.error('Erro ao inicializar perfis padrão:', error);
      throw error;
    }
  }

  /**
   * Cria um novo perfil
   */
  static async createRole(data: CreateRoleData): Promise<Role> {
    try {
      // Validar dados
      this.validateRoleData(data);

      // Verificar se nome já existe
      const existingRole = await this.findRoleByName(data.name);
      if (existingRole) {
        throw new Error(`Perfil com nome "${data.name}" já existe`);
      }

      // Criar perfil
      const role = await this.insertRole({
        name: data.name,
        description: data.description,
        isDefault: false
      });

      // Criar permissões
      await this.updateRolePermissions(role.id, data.permissions);

      return await this.getRoleById(role.id);
    } catch (error) {
      console.error('Erro ao criar perfil:', error);
      throw error;
    }
  }

  /**
   * Atualiza um perfil existente
   */
  static async updateRole(roleId: string, data: UpdateRoleData): Promise<Role> {
    try {
      const role = await this.getRoleById(roleId);
      if (!role) {
        throw new Error('Perfil não encontrado');
      }

      // Não permitir edição de perfis padrão do sistema
      if (role.isDefault && (data.name || data.permissions)) {
        throw new Error('Não é possível alterar nome ou permissões de perfis padrão');
      }

      // Atualizar dados básicos
      if (data.name || data.description) {
        await this.updateRoleBasicData(roleId, {
          name: data.name || role.name,
          description: data.description || role.description
        });
      }

      // Atualizar permissões
      if (data.permissions) {
        await this.updateRolePermissions(roleId, data.permissions);
      }

      return await this.getRoleById(roleId);
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      throw error;
    }
  }

  /**
   * Remove um perfil
   */
  static async deleteRole(roleId: string): Promise<boolean> {
    try {
      const role = await this.getRoleById(roleId);
      if (!role) {
        throw new Error('Perfil não encontrado');
      }

      if (role.isDefault) {
        throw new Error('Não é possível remover perfis padrão do sistema');
      }

      // Verificar se há funcionários usando este perfil
      const employeeCount = await this.countEmployeesWithRole(roleId);
      if (employeeCount > 0) {
        throw new Error(`Não é possível remover perfil em uso por ${employeeCount} funcionário(s)`);
      }

      // Remover permissões do perfil
      await this.deleteRolePermissions(roleId);

      // Remover perfil
      await this.deleteRoleRecord(roleId);

      return true;
    } catch (error) {
      console.error('Erro ao remover perfil:', error);
      throw error;
    }
  }

  /**
   * Obtém todos os perfis
   */
  static async getAllRoles(): Promise<Role[]> {
    try {
      return await this.findAllRoles();
    } catch (error) {
      console.error('Erro ao buscar perfis:', error);
      return [];
    }
  }

  /**
   * Obtém um perfil por ID
   */
  static async getRoleById(roleId: string): Promise<Role | null> {
    try {
      return await this.findRoleById(roleId);
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
      return null;
    }
  }

  /**
   * Obtém perfis padrão do sistema
   */
  static async getDefaultRoles(): Promise<Role[]> {
    try {
      return await this.findDefaultRoles();
    } catch (error) {
      console.error('Erro ao buscar perfis padrão:', error);
      return [];
    }
  }

  /**
   * Clona um perfil existente
   */
  static async cloneRole(sourceRoleId: string, newName: string, newDescription?: string): Promise<Role> {
    try {
      const sourceRole = await this.getRoleById(sourceRoleId);
      if (!sourceRole) {
        throw new Error('Perfil origem não encontrado');
      }

      // Converter permissões para formato de string
      const permissions = this.convertPermissionsToStrings(sourceRole.permissions);

      return await this.createRole({
        name: newName,
        description: newDescription || `Cópia de ${sourceRole.name}`,
        permissions
      });
    } catch (error) {
      console.error('Erro ao clonar perfil:', error);
      throw error;
    }
  }

  /**
   * Obtém estatísticas de uso dos perfis
   */
  static async getRoleUsageStats(): Promise<Array<{
    roleId: string;
    roleName: string;
    employeeCount: number;
    isDefault: boolean;
  }>> {
    try {
      const roles = await this.getAllRoles();
      const stats = [];

      for (const role of roles) {
        const employeeCount = await this.countEmployeesWithRole(role.id);
        stats.push({
          roleId: role.id,
          roleName: role.name,
          employeeCount,
          isDefault: role.isDefault
        });
      }

      return stats.sort((a, b) => b.employeeCount - a.employeeCount);
    } catch (error) {
      console.error('Erro ao obter estatísticas de perfis:', error);
      return [];
    }
  }

  /**
   * Valida se as permissões de um perfil são consistentes
   */
  static validateRolePermissions(permissions: string[]): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    try {
      const matrix = PermissionUtils.buildPermissionMatrix(permissions);
      
      // Verificar dependências (view é pré-requisito)
      if (!PermissionUtils.validatePermissionDependencies(matrix)) {
        errors.push('Permissão "view" é obrigatória para usar outras ações do módulo');
      }

      // Verificar se há permissões conflitantes
      for (const permission of permissions) {
        if (permission.startsWith('!') && permissions.includes(permission.substring(1))) {
          errors.push(`Conflito: permissão negada e concedida para ${permission.substring(1)}`);
        }
      }

      return {
        isValid: errors.length === 0,
        errors
      };
    } catch (error) {
      errors.push('Formato de permissão inválido');
      return { isValid: false, errors };
    }
  }

  // Métodos privados para acesso ao banco de dados

  private static validateRoleData(data: CreateRoleData): void {
    if (!data.name?.trim()) {
      throw new Error('Nome do perfil é obrigatório');
    }

    if (data.name.length > 100) {
      throw new Error('Nome do perfil deve ter no máximo 100 caracteres');
    }

    if (!data.permissions || data.permissions.length === 0) {
      throw new Error('Pelo menos uma permissão deve ser definida');
    }

    const validation = this.validateRolePermissions(data.permissions);
    if (!validation.isValid) {
      throw new Error(`Permissões inválidas: ${validation.errors.join(', ')}`);
    }
  }

  private static async findRoleByName(name: string): Promise<Role | null> {
    const db = getDb();
    const ref = collection(db, 'roles');
    const q = query(ref, where('name', '==', name));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    const role = { id: d.id, ...d.data() } as unknown as Role;
    role.permissions = await this.getRolePermissionsFromSubcol(role.id);
    return role;
  }

  private static async findRoleById(id: string): Promise<Role | null> {
    const db = getDb();
    const ref = doc(db, 'roles', id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const role = { id: snap.id, ...snap.data() } as unknown as Role;
    role.permissions = await this.getRolePermissionsFromSubcol(role.id);
    return role;
  }

  private static async findAllRoles(): Promise<Role[]> {
    const db = getDb();
    const ref = collection(db, 'roles');
    const snap = await getDocs(ref);
    const roles: Role[] = [];
    for (const d of snap.docs) {
      const base = { id: d.id, ...d.data() } as unknown as Role;
      base.permissions = await this.getRolePermissionsFromSubcol(base.id);
      roles.push(base);
    }
    return roles;
  }

  private static async findDefaultRoles(): Promise<Role[]> {
    const db = getDb();
    const ref = collection(db, 'roles');
    const q = query(ref, where('isDefault', '==', true));
    const snap = await getDocs(q);
    const roles: Role[] = [];
    for (const d of snap.docs) {
      const base = { id: d.id, ...d.data() } as unknown as Role;
      base.permissions = await this.getRolePermissionsFromSubcol(base.id);
      roles.push(base);
    }
    return roles;
  }

  private static async insertRole(data: { name: string; description: string; isDefault: boolean }): Promise<Role> {
    const db = getDb();
    const ref = collection(db, 'roles');
    const docRef = await addDoc(ref, {
      name: data.name,
      description: data.description,
      isDefault: data.isDefault,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    const snap = await getDoc(docRef);
    return { id: snap.id, ...(snap.data() as any), permissions: [] } as Role;
  }

  private static async updateRoleBasicData(roleId: string, data: { name: string; description: string }): Promise<void> {
    const db = getDb();
    const ref = doc(db, 'roles', roleId);
    await updateDoc(ref, { ...data, updatedAt: new Date() });
  }

  private static async updateRolePermissions(roleId: string, permissions: string[]): Promise<void> {
    const db = getDb();
    // Apaga subcoleção role_permissions
    const sub = collection(db, 'roles', roleId, 'permissions');
    const existing = await getDocs(sub);
    await Promise.all(existing.docs.map(d => deleteDoc(d.ref)));

    // Recria baseado na matriz
    const matrix = PermissionUtils.buildPermissionMatrix(permissions);
    const ops: Promise<any>[] = [];
    for (const moduleName of Object.keys(matrix)) {
      for (const actionName of Object.keys(matrix[moduleName])) {
        const granted = matrix[moduleName][actionName];
        ops.push(addDoc(sub, { module: moduleName, action: actionName, granted }));
      }
    }
    await Promise.all(ops);
  }

  private static async deleteRolePermissions(roleId: string): Promise<void> {
    const db = getDb();
    const sub = collection(db, 'roles', roleId, 'permissions');
    const snap = await getDocs(sub);
    await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
  }

  private static async deleteRoleRecord(roleId: string): Promise<void> {
    const db = getDb();
    await deleteDoc(doc(db, 'roles', roleId));
  }

  private static async countEmployeesWithRole(roleId: string): Promise<number> {
    const db = getDb();
    const ref = collection(db, 'employees');
    const q = query(ref, where('roleId', '==', roleId));
    const snap = await getDocs(q);
    return snap.size;
  }

  private static convertPermissionsToStrings(permissions: RolePermission[]): string[] {
    return permissions
      .filter(p => p.granted)
      .map(p => `${p.module}:${p.action}`);
  }
}