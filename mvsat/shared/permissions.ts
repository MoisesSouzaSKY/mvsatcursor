import { getAuth } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { getDb } from '../config/database.config';

export type SystemModule = string;
export type SystemAction = string;

// Regras padrão por cargo (fallback caso não haja overrides por usuário)
function roleAllows(role: string, module: SystemModule, action: SystemAction): boolean {
  if (!role) return false;
  const r = role.toLowerCase();
  if (r === 'admin') return true;
  if (r === 'gerente') {
    if (module === 'funcionarios' && action === 'manage_settings') return false;
    return true;
  }
  if (r === 'financeiro') return ['cobrancas', 'despesas', 'dashboard'].includes(module) && action !== 'manage_settings';
  if (r === 'atendimento') return ['clientes', 'assinaturas', 'tvbox', 'dashboard'].includes(module) && action !== 'manage_settings';
  if (r === 'leitor') return action === 'view';
  return false;
}

export async function hasPermissionForCurrentUser(module: SystemModule, action: SystemAction): Promise<boolean> {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) return false;

  // Claims de cargo
  const token = await user.getIdTokenResult();
  const role = (token.claims?.role as string) || '';

  // Tentar achar employee pelo e-mail para carregar overrides
  try {
    const db = getDb();
    const q = query(collection(db, 'employees'), where('email', '==', user.email));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const empDoc = snap.docs[0];
      const permSnap = await getDoc(doc(db, 'employee_permissions', empDoc.id));
      const map = permSnap.exists() ? (permSnap.data()?.permissions || {}) : {};
      const allowed = map?.[module]?.[action];
      if (typeof allowed === 'boolean') return allowed; // override explícito
    }
  } catch {}

  // Fallback para regra por cargo
  return roleAllows(role, module, action);
}



