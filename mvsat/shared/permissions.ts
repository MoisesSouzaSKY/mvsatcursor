import { getAuth } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { getDb } from '../config/database.config';
import { getTipoFromSession } from './saas/session';
import { tenantDoc } from './saas/firestoreTenant';

export type SystemModule = string;
export type SystemAction = string;

// Regras padrão por cargo (fallback caso não haja overrides por usuário)
export async function hasPermissionForCurrentUser(module: SystemModule, action: SystemAction): Promise<boolean> {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) return false;

  // Preferir tipo do multitenant (usuarios/{uid} -> sessão local)
  const sessionTipo = getTipoFromSession();
  if (sessionTipo === 'admin') return true;

  // A permissão efetiva é materializada pelo backend no documento do UID.
  // Não existe fallback aberto por cargo: ausência explícita significa negar.
  try {
    const db = getDb();
    const permSnap = await getDoc(tenantDoc(db, 'employee_permissions', user.uid));
    const map = permSnap.exists() ? (permSnap.data()?.permissions || {}) : {};
    return map?.[module]?.[action] === true;
  } catch {}

  return false;
}



