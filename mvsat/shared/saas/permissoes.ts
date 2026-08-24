import { getAuth } from 'firebase/auth';
import { getTipoFromSession, type TipoUsuario } from './session';

export type RequiredRole = TipoUsuario;

export function verificarPermissao(rolesPermitidos: RequiredRole[]): boolean {
  const auth = getAuth();
  if (!auth.currentUser) return false;

  const tipo = getTipoFromSession();
  if (!tipo) return false;

  return rolesPermitidos.includes(tipo);
}

export function isAdmin(): boolean {
  return verificarPermissao(['admin']);
}

export function isAdminOrGerente(): boolean {
  return verificarPermissao(['admin', 'gerente']);
}

