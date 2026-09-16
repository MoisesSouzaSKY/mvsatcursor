export type TipoUsuario = 'admin' | 'gerente' | 'funcionario';

export interface TenantSession {
  uid: string;
  email: string;
  nome: string;
  empresaId: string;
  tipo: TipoUsuario;
  ativo: boolean;
  mustChangePassword?: boolean;
  loadedAt: number; // epoch ms
}

const STORAGE_KEY = 'mvsat:tenantSession:v1';

export function loadTenantSession(): TenantSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<TenantSession>;
    if (!parsed || typeof parsed !== 'object') return null;

    const ok =
      typeof parsed.uid === 'string' &&
      typeof parsed.email === 'string' &&
      typeof parsed.nome === 'string' &&
      typeof parsed.empresaId === 'string' &&
      (parsed.tipo === 'admin' || parsed.tipo === 'gerente' || parsed.tipo === 'funcionario') &&
      typeof parsed.ativo === 'boolean' &&
      typeof parsed.loadedAt === 'number';

    return ok ? (parsed as TenantSession) : null;
  } catch {
    return null;
  }
}

export function saveTenantSession(session: TenantSession): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearTenantSession(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function getEmpresaIdFromSession(): string | null {
  return loadTenantSession()?.empresaId ?? null;
}

export function getTipoFromSession(): TipoUsuario | null {
  return loadTenantSession()?.tipo ?? null;
}

