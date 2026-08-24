import type { User } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getDb } from '../../config/database.config';
import type { TenantSession, TipoUsuario } from './session';
import { clearTenantSession, saveTenantSession } from './session';

export interface UsuarioDoc {
  nome: string;
  email: string;
  empresaId: string;
  tipo: TipoUsuario;
  ativo: boolean;
  criadoEm?: any;
}

export async function fetchUsuarioDoc(uid: string): Promise<UsuarioDoc | null> {
  const db = getDb();
  const ref = doc(db, 'usuarios', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data() as any;
  return {
    nome: String(data?.nome ?? ''),
    email: String(data?.email ?? ''),
    empresaId: String(data?.empresaId ?? ''),
    tipo: (String(data?.tipo ?? '').toLowerCase() as any) || 'funcionario',
    ativo: Boolean(data?.ativo ?? true),
    criadoEm: data?.criadoEm ?? data?.createdAt ?? null,
  };
}

export async function provisionTenantForNewUser(
  user: User,
  profile?: { nome?: string; cpf?: string; telefone?: string } | null
): Promise<void> {
  const db = getDb();
  const empresaId = user.uid;
  const email = String(user.email || '').trim();
  const nome =
    String(profile?.nome || '').trim() ||
    String(user.displayName || '').trim() ||
    email ||
    'Usuário';

  const cpf = String(profile?.cpf || '').trim();
  const telefone = String(profile?.telefone || '').trim();

  // 1) Criar usuarios/{uid} primeiro (para liberar update/merge em empresas/{uid})
  await setDoc(
    doc(db, 'usuarios', user.uid),
    {
      nome,
      email,
      empresaId,
      tipo: 'admin',
      ativo: true,
      criadoEm: serverTimestamp(),
      ...(cpf ? { cpf } : {}),
      ...(telefone ? { telefone } : {}),
    },
    { merge: true }
  );

  // 2) Criar/atualizar empresas/{uid}
  await setDoc(
    doc(db, 'empresas', empresaId),
    {
      nomeEmpresa: nome,
      responsavel: nome,
      email,
      telefone: telefone || '',
      plano: 'padrao',
      status: 'ativo',
      criadoEm: serverTimestamp(),
      limiteClientes: 999999,
      limiteFuncionarios: 999999,
      limiteEquipamentos: 999999,
      ativo: true,
    },
    { merge: true }
  );
}

export async function bootstrapTenantSessionFromUser(user: User): Promise<TenantSession> {
  let usuario = await fetchUsuarioDoc(user.uid);
  if (!usuario) {
    // Auto-reparo: usuário existe no Auth, mas falta usuarios/{uid}.
    // Isso pode acontecer quando o cadastro foi criado antes de regras/fluxo estarem OK.
    try {
      await provisionTenantForNewUser(user, null);
      usuario = await fetchUsuarioDoc(user.uid);
    } catch {
      clearTenantSession();
      throw new Error('Usuário sem cadastro no sistema (documento usuarios/{uid} não encontrado).');
    }
    if (!usuario) {
      clearTenantSession();
      throw new Error('Usuário sem cadastro no sistema (documento usuarios/{uid} não encontrado).');
    }
  }

  const empresaId = String(usuario.empresaId || '').trim();
  const tipoRaw = String(usuario.tipo || '').toLowerCase().trim();
  const tipo: TipoUsuario =
    tipoRaw === 'admin' || tipoRaw === 'gerente' || tipoRaw === 'funcionario'
      ? (tipoRaw as TipoUsuario)
      : 'funcionario';

  if (!empresaId) {
    clearTenantSession();
    throw new Error('Usuário sem empresa vinculada (campo empresaId em usuarios/{uid}).');
  }
  if (!usuario.ativo) {
    clearTenantSession();
    throw new Error('Usuário desativado (campo ativo em usuarios/{uid}).');
  }

  // Travar empresaId por login (garante que NUNCA misture dados entre contas)
  // - Para admins "donos" (tipo=admin), a regra padrão é empresaId == uid
  // - Para casos específicos já definidos (Igor/Moises), validamos contra IDs fixos
  const emailLower = String(usuario.email || user.email || '').toLowerCase().trim();
  const expectedEmpresaByEmail: Record<string, string> = {
    'igor8560@gmail.com': 'I1kzRdTbn7MRFqF88pP2GletSi32',
    'moisestimesky@gmail.com': '5tequCVP8KU601xYdx8RPZCW0Vn1',
  };
  const expectedEmpresa = expectedEmpresaByEmail[emailLower];
  if (expectedEmpresa && empresaId !== expectedEmpresa) {
    clearTenantSession();
    throw new Error('Conta vinculada ao tenant errado. Acesso bloqueado para evitar mistura de dados.');
  }
  if (tipo === 'admin' && !expectedEmpresa && empresaId !== user.uid) {
    clearTenantSession();
    throw new Error('Admin com empresaId inválido. Acesso bloqueado para evitar mistura de dados.');
  }

  // Bloqueio por hostname (evita "misturar" tenants entre sites/canais)
  // Obs: isso é uma barreira de APP (rules não enxergam o host).
  try {
    const host = String(window.location.host || '').toLowerCase();
    const email = emailLower;
    const PROD_HOST = 'mvsat-428a2.web.app';
    const PREVIEW_HOST = 'mvsat-428a2--multitenant-preview-eyc5hhiy.web.app';

    if (host === PROD_HOST && email && email !== 'moisestimesky@gmail.com') {
      clearTenantSession();
      throw new Error('Este usuário não tem permissão para acessar o site de produção.');
    }
    if ((host === PREVIEW_HOST || host.includes('--multitenant-preview')) && email && email !== 'igor8560@gmail.com') {
      clearTenantSession();
      throw new Error('Este usuário não tem permissão para acessar o site de preview.');
    }
  } catch (e) {
    // Re-throw com mensagem já amigável (mantém o fluxo de erro do App.tsx)
    throw e;
  }

  const session: TenantSession = {
    uid: user.uid,
    email: String(usuario.email || user.email || ''),
    nome: String(usuario.nome || user.displayName || user.email || 'Usuário'),
    empresaId,
    tipo,
    ativo: true,
    loadedAt: Date.now(),
  };

  saveTenantSession(session);
  return session;
}

