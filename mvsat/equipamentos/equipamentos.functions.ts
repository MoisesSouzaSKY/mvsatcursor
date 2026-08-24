import { getDb } from '../config/database.config';
import { addDoc, collection, doc, getDoc, getDocs, query, runTransaction, serverTimestamp, updateDoc, where, deleteDoc } from 'firebase/firestore';
import { tenantCollection, tenantDoc } from '../shared/saas/firestoreTenant';
import { loadTenantSession } from '../shared/saas/session';

export async function cadastrarEquipamento(payload: any) {
  const ref = await addDoc(tenantCollection(getDb(), 'equipamentos'), payload);
  const snap = await getDoc(ref);
  return { ok: true, id: ref.id, equipamento: snap.data() };
}

export async function listarEquipamentos() {
  const snap = await getDocs(tenantCollection(getDb(), 'equipamentos'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function atualizarEquipamento(id: string, updates: any) {
  const db = getDb();
  await updateDoc(tenantDoc(db, 'equipamentos', id), updates);
  const snap = await getDoc(tenantDoc(db, 'equipamentos', id));
  return { ok: true, id, equipamento: snap.data() };
}

export async function removerEquipamento(id: string) {
  await deleteDoc(tenantDoc(getDb(), 'equipamentos', id));
  return { ok: true, id };
}

function normalizeSmartcardForSave(value: string): string {
  const digits = (value || '').replace(/[^0-9]/g, '');
  if (!digits) return '';
  let d12 = digits.length > 12 ? digits.slice(-12) : digits.padStart(12, '0');
  if (d12.endsWith('00')) d12 = d12.slice(-2) + d12.slice(0, 10);
  return `${d12.slice(0, 4)} ${d12.slice(4, 8)} ${d12.slice(8, 12)}`;
}

export async function cadastrarEquipamentoDisponivel(payload: { nds: string; smartcard: string }): Promise<{ ok: true; id: string }> {
  const nds = String(payload?.nds || '').trim();
  const smartcardRaw = String(payload?.smartcard || '').trim();
  const smartcard = normalizeSmartcardForSave(smartcardRaw);

  if (!nds) throw new Error('NDS é obrigatório.');
  if (!smartcard) throw new Error('Smart Card é obrigatório.');

  const db = getDb();

  // Duplicatas
  const ndsQ = query(tenantCollection(db, 'equipamentos'), where('nds', '==', nds));
  const scQ = query(tenantCollection(db, 'equipamentos'), where('smartcard', '==', smartcard));
  const [ndsSnap, scSnap] = await Promise.all([getDocs(ndsQ), getDocs(scQ)]);
  if (!ndsSnap.empty) throw new Error('Este NDS já está em uso por outro equipamento.');
  if (!scSnap.empty) throw new Error('Este Smart Card já está em uso por outro equipamento.');

  const equipamentoData: any = {
    nds,
    numero_nds: nds,
    smartcard,
    smart_card: smartcard,
    status: 'disponivel',
    status_aparelho: 'disponivel',
    cliente: '',
    cliente_nome: '',
    clienteId: null,
    cliente_id: null,
    codigo: '',
    nomeCompleto: '',
    assinatura: null,
    assinaturaId: null,
    assinatura_id: null,
    dataUltimaAtualizacao: new Date(),
  };

  const ref = await addDoc(tenantCollection(db, 'equipamentos'), equipamentoData);
  return { ok: true, id: ref.id };
}

export type StatusEquipamento =
  | 'disponivel'
  | 'em_uso'
  | 'reserva'
  | 'defeito'
  | 'descartado'
  | 'inativo'
  // compat/legado
  | 'alugado'
  | 'problema'
  | string;

export type MotivoTrocaEquipamento =
  | 'Defeito'
  | 'Garantia'
  | 'Atualização de equipamento'
  | 'Troca solicitada pelo cliente'
  | 'Outro';

export type MotivoExclusaoEquipamento =
  | 'Equipamento retirado da grade'
  | 'Equipamento vendido'
  | 'Equipamento devolvido ao fornecedor'
  | 'Equipamento sucateado'
  | 'Equipamento perdido'
  | 'Outro';

export interface ExcluirEquipamentoInput {
  equipamentoId: string;
  motivo: MotivoExclusaoEquipamento;
  motivoOutroTexto?: string;
}

export interface TrocaEquipamentoInput {
  equipamentoAntigoId: string;
  equipamentoNovoId: string;
  motivo: MotivoTrocaEquipamento;
  motivoOutroTexto?: string;
  /**
   * Status final do equipamento antigo (ex.: defeito/reserva/descartado).
   * Se omitido, o default é:
   * - Defeito/Garantia -> defeito
   * - outros -> reserva
   */
  statusEquipamentoAntigoAposTroca?: StatusEquipamento;
}

function normalizeStatus(status: any): string {
  const s = String(status || '').toLowerCase().trim();
  if (!s) return '';
  if (s === 'alugado' || s === 'em uso' || s === 'em_uso' || s === 'emuso') return 'em_uso';
  if (s === 'problema' || s === 'com_problema' || s === 'defeito') return 'defeito';
  if (s === 'disponível') return 'disponivel';
  if (s === 'excluido' || s === 'excluído') return 'inativo';
  return s;
}

function isDisponivel(status: any): boolean {
  return normalizeStatus(status) === 'disponivel';
}

function isEmUso(status: any): boolean {
  return normalizeStatus(status) === 'em_uso';
}

export async function trocarEquipamento(input: TrocaEquipamentoInput): Promise<{ ok: true; swapId: string }> {
  const db = getDb();
  const session = loadTenantSession();
  const performedBy = session
    ? { uid: session.uid, email: session.email, nome: session.nome, tipo: session.tipo }
    : { uid: 'unknown', email: '', nome: 'Usuário', tipo: 'funcionario' as const };

  const equipamentoAntigoRef = tenantDoc(db, 'equipamentos', input.equipamentoAntigoId);
  const equipamentoNovoRef = tenantDoc(db, 'equipamentos', input.equipamentoNovoId);

  const statusAntigoAposTroca =
    input.statusEquipamentoAntigoAposTroca ||
    (input.motivo === 'Defeito' || input.motivo === 'Garantia' ? 'defeito' : 'reserva');

  // Gerar 1 swapId e escrever em ambos históricos
  const swapId = doc(collection(db, '__swap_ids__')).id;
  const now = serverTimestamp();

  await runTransaction(db, async (tx) => {
    const [oldSnap, newSnap] = await Promise.all([tx.get(equipamentoAntigoRef), tx.get(equipamentoNovoRef)]);
    if (!oldSnap.exists()) throw new Error('Equipamento atual não encontrado.');
    if (!newSnap.exists()) throw new Error('Novo equipamento não encontrado.');

    const oldData = oldSnap.data() as any;
    const newData = newSnap.data() as any;

    const oldStatus = normalizeStatus(oldData?.status || oldData?.status_aparelho);
    if (!isEmUso(oldStatus)) {
      throw new Error('A troca só é permitida para equipamentos com status "Em Uso".');
    }

    const newStatus = normalizeStatus(newData?.status || newData?.status_aparelho);
    if (!isDisponivel(newStatus)) {
      throw new Error('O novo equipamento deve estar com status "Disponível".');
    }

    const assinaturaId =
      String(oldData?.assinaturaId || oldData?.assinatura_id || '').trim() || null;
    const clienteId =
      String(oldData?.clienteId || oldData?.cliente_id || '').trim() || null;

    if (!assinaturaId || !clienteId) {
      throw new Error('Equipamento atual sem cliente/assinatura vinculados. Não é possível trocar.');
    }

    const newHasVinculo =
      Boolean(newData?.assinaturaId || newData?.assinatura_id) || Boolean(newData?.clienteId || newData?.cliente_id);
    if (newHasVinculo) {
      throw new Error('O novo equipamento já possui vínculo com cliente/assinatura.');
    }

    // Carregar nomes para registro e para preencher campos de exibição
    const clienteRef = tenantDoc(db, 'clientes', clienteId);
    const assinaturaRef = tenantDoc(db, 'assinaturas', assinaturaId);
    const [clienteSnap, assinaturaSnap] = await Promise.all([tx.get(clienteRef), tx.get(assinaturaRef)]);

    const clienteNome =
      (clienteSnap.exists() ? String((clienteSnap.data() as any)?.nomeCompleto || (clienteSnap.data() as any)?.nome || '') : '') ||
      String(oldData?.cliente_nome || oldData?.cliente || '');

    const assinaturaCodigo =
      (assinaturaSnap.exists()
        ? String((assinaturaSnap.data() as any)?.codigo || (assinaturaSnap.data() as any)?.codigo_assinatura || '')
        : '') || String(oldData?.codigo || oldData?.assinatura?.codigo || '');

    const assinaturaNome =
      (assinaturaSnap.exists() ? String((assinaturaSnap.data() as any)?.nomeCompleto || '') : '') ||
      String(oldData?.assinatura?.nomeAssinatura || '');

    const oldNds = String(oldData?.numero_nds || oldData?.nds || '').trim();
    const oldSmart = String(oldData?.smart_card || oldData?.smartcard || '').trim();
    const newNds = String(newData?.numero_nds || newData?.nds || '').trim();
    const newSmart = String(newData?.smart_card || newData?.smartcard || '').trim();

    // 1) Equipamento NOVO assume cliente+assinatura e fica em uso
    tx.update(equipamentoNovoRef, {
      status: 'em_uso',
      status_aparelho: 'em_uso',
      cliente: clienteNome,
      cliente_nome: clienteNome,
      clienteId,
      cliente_id: clienteId,
      assinaturaId,
      assinatura_id: assinaturaId,
      codigo: assinaturaCodigo,
      assinatura: assinaturaCodigo || assinaturaNome ? { codigo: assinaturaCodigo, nomeAssinatura: assinaturaNome } : null,
      dataUltimaAtualizacao: new Date(),
    });

    // 2) Equipamento ANTIGO perde vínculo e muda status conforme seleção
    tx.update(equipamentoAntigoRef, {
      status: statusAntigoAposTroca,
      status_aparelho: statusAntigoAposTroca,
      cliente: '',
      cliente_nome: '',
      clienteId: null,
      cliente_id: null,
      assinaturaId: null,
      assinatura_id: null,
      codigo: '',
      assinatura: null,
      dataUltimaAtualizacao: new Date(),
    });

    // 3) Registrar histórico (em ambos equipamentos)
    const motivoOutro = input.motivo === 'Outro' ? String(input.motivoOutroTexto || '').trim() : '';
    const historicoBase = {
      createdAt: now,
      performedBy,
      clienteId,
      clienteNome,
      assinaturaId,
      assinaturaCodigo,
      assinaturaNome,
      equipamentoAntigoId: input.equipamentoAntigoId,
      equipamentoAntigoNds: oldNds,
      equipamentoAntigoSmartcard: oldSmart,
      equipamentoNovoId: input.equipamentoNovoId,
      equipamentoNovoNds: newNds,
      equipamentoNovoSmartcard: newSmart,
      motivo: input.motivo,
      motivoOutroTexto: motivoOutro || null,
      statusEquipamentoAntigoAntes: oldStatus,
      statusEquipamentoAntigoDepois: normalizeStatus(statusAntigoAposTroca),
      statusEquipamentoNovoAntes: newStatus,
      statusEquipamentoNovoDepois: 'em_uso',
    };

    const oldHistRef = doc(
      collection(db, 'empresas', String(session?.empresaId || ''), 'equipamentos', input.equipamentoAntigoId, 'trocas'),
      swapId
    );
    const newHistRef = doc(
      collection(db, 'empresas', String(session?.empresaId || ''), 'equipamentos', input.equipamentoNovoId, 'trocas'),
      swapId
    );

    // Segurança: se sessão não estiver carregada, a regra `getEmpresaIdOrThrow` do tenantCollection não funciona aqui.
    // Mesmo assim, como o app já trava sem sessão, mantemos o caminho por empresaId da sessão.
    if (!session?.empresaId) {
      throw new Error('Empresa não definida na sessão. Faça login novamente.');
    }

    tx.set(oldHistRef, historicoBase);
    tx.set(newHistRef, historicoBase);

    // Log adicional centralizado (opcional, ajuda auditoria por empresa)
    const auditRef = doc(collection(db, 'empresas', session.empresaId, 'audit_logs'), swapId);
    tx.set(auditRef, { ...historicoBase, type: 'TROCA_EQUIPAMENTO' });
  });

  return { ok: true, swapId };
}

export async function excluirEquipamentoComHistorico(input: ExcluirEquipamentoInput): Promise<{ ok: true; exclusionId: string }> {
  const db = getDb();
  const session = loadTenantSession();
  if (!session?.empresaId) throw new Error('Empresa não definida na sessão. Faça login novamente.');

  const performedBy = { uid: session.uid, email: session.email, nome: session.nome, tipo: session.tipo };

  const equipamentoRef = tenantDoc(db, 'equipamentos', input.equipamentoId);
  const exclusionId = doc(collection(db, '__exclusion_ids__')).id;
  const now = serverTimestamp();

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(equipamentoRef);
    if (!snap.exists()) throw new Error('Equipamento não encontrado.');
    const data = snap.data() as any;

    const statusAtual = normalizeStatus(data?.status || data?.status_aparelho);
    if (statusAtual === 'inativo') {
      throw new Error('Este equipamento já está inativo.');
    }

    // Snapshot do vínculo atual (para exibir na aba "Excluídos")
    const clienteNome = String(data?.cliente_nome || data?.cliente || '').trim();
    const clienteId = String(data?.clienteId || data?.cliente_id || '').trim() || null;
    const assinaturaId = String(data?.assinaturaId || data?.assinatura_id || '').trim() || null;
    const assinaturaCodigo = String(data?.codigo || data?.assinatura?.codigo || '').trim();
    const assinaturaNome = String(data?.assinatura?.nomeAssinatura || '').trim();
    const nds = String(data?.numero_nds || data?.nds || '').trim();
    const smartcard = String(data?.smart_card || data?.smartcard || '').trim();

    const motivoOutro = input.motivo === 'Outro' ? String(input.motivoOutroTexto || '').trim() : '';
    if (input.motivo === 'Outro' && !motivoOutro) {
      throw new Error('Informe o motivo da exclusão.');
    }

    const record = {
      createdAt: now,
      performedBy,
      motivo: input.motivo,
      motivoOutroTexto: motivoOutro || null,
      equipamentoId: input.equipamentoId,
      nds,
      smartcard,
      clienteId,
      clienteNome: clienteNome || null,
      assinaturaId,
      assinaturaCodigo: assinaturaCodigo || null,
      assinaturaNome: assinaturaNome || null,
      statusAntes: statusAtual || null,
      statusDepois: 'inativo',
      type: 'EXCLUSAO_EQUIPAMENTO',
    };

    // Atualiza o equipamento (soft delete)
    tx.update(equipamentoRef, {
      status: 'inativo',
      status_aparelho: 'inativo',
      inativadoEm: now,
      inativadoPor: performedBy,
      inativacaoMotivo: input.motivo,
      inativacaoMotivoOutroTexto: motivoOutro || null,
      // manter vínculo para histórico (não apaga assinatura/cliente)
      dataUltimaAtualizacao: new Date(),
    });

    // Histórico por equipamento
    const histRef = doc(collection(db, 'empresas', session.empresaId, 'equipamentos', input.equipamentoId, 'exclusoes'), exclusionId);
    tx.set(histRef, record);

    // Registro centralizado para listagem rápida
    const centralRef = doc(collection(db, 'empresas', session.empresaId, 'equipamentos_excluidos'), input.equipamentoId);
    tx.set(centralRef, { ...record, updatedAt: now }, { merge: true } as any);

    // Audit log
    const auditRef = doc(collection(db, 'empresas', session.empresaId, 'audit_logs'), exclusionId);
    tx.set(auditRef, record);
  });

  return { ok: true, exclusionId };
}

export async function restaurarEquipamento(equipamentoId: string): Promise<{ ok: true }> {
  const db = getDb();
  const session = loadTenantSession();
  if (!session?.empresaId) throw new Error('Empresa não definida na sessão. Faça login novamente.');
  const performedBy = { uid: session.uid, email: session.email, nome: session.nome, tipo: session.tipo };

  const equipamentoRef = tenantDoc(db, 'equipamentos', equipamentoId);
  const restoreId = doc(collection(db, '__restore_ids__')).id;
  const now = serverTimestamp();

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(equipamentoRef);
    if (!snap.exists()) throw new Error('Equipamento não encontrado.');
    const data = snap.data() as any;
    const statusAtual = normalizeStatus(data?.status || data?.status_aparelho);
    if (statusAtual !== 'inativo') throw new Error('Este equipamento não está inativo.');

    tx.update(equipamentoRef, {
      status: 'disponivel',
      status_aparelho: 'disponivel',
      restauradoEm: now,
      restauradoPor: performedBy,
      dataUltimaAtualizacao: new Date(),
    });

    // Histórico de restauração (mantém o mesmo histórico do equipamento)
    const histRef = doc(collection(db, 'empresas', session.empresaId, 'equipamentos', equipamentoId, 'exclusoes'), restoreId);
    tx.set(histRef, {
      createdAt: now,
      performedBy,
      motivo: 'Restaurado',
      equipamentoId,
      type: 'RESTAURAR_EQUIPAMENTO',
    });

    const auditRef = doc(collection(db, 'empresas', session.empresaId, 'audit_logs'), restoreId);
    tx.set(auditRef, {
      createdAt: now,
      performedBy,
      equipamentoId,
      type: 'RESTAURAR_EQUIPAMENTO',
    });
  });

  return { ok: true };
}


