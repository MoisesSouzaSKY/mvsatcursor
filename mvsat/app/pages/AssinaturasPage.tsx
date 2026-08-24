import React from 'react';
import { collection, onSnapshot, getDocs } from 'firebase/firestore';
import { getDb } from '../../config/database.config';
import { useClienteAssinaturaValidation } from '../../shared/hooks/useClienteAssinaturaValidation';
import { ValidationAlert } from '../../shared/components/ValidationAlert';
import { CheckupSistemaModal } from '../../assinaturas/components/modals/CheckupSistemaModal';
import type {
  AssinaturaCheckItem,
  CheckIssue,
  ClienteSemCobrancaRow,
  DefectEquipmentRow,
  SystemCheckupResult,
} from '../../assinaturas/types/checkup.types';
import { tenantCollection } from '../../shared/saas/firestoreTenant';
import NovaAssinaturaModal from '../../assinaturas/NovaAssinaturaModal';

// Componente de Card de Estatísticas
const StatsCard: React.FC<{
  title: string;
  value: number | string;
  icon: string;
  gradient: string;
  subtitle?: string;
}> = ({ title, value, icon, gradient, subtitle }) => {
  return (
    <div style={{
      background: gradient,
      borderRadius: '12px',
      padding: '20px',
      color: 'white',
      minWidth: '200px',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ margin: 0, fontSize: '14px', opacity: 0.9, fontWeight: '500' }}>{title}</p>
          <p style={{ margin: '8px 0 4px 0', fontSize: '28px', fontWeight: '700' }}>{value}</p>
          {subtitle && <p style={{ margin: 0, fontSize: '12px', opacity: 0.8 }}>{subtitle}</p>}
        </div>
        <div style={{ fontSize: '32px', opacity: 0.8 }}>{icon}</div>
      </div>
    </div>
  );
};

interface Assinatura {
  id: string;
  codigo: string;
  nomeCompleto: string;
  cpf: string;
  rg: string;
  dataNascimento: string;
  email: string;
  telefone: string;
  plano: string;
  status: string;
  ultimoVencimento?: string; // Data do último vencimento gerado
  endereco: {
    estado: string;
    cidade: string;
    bairro: string;
    rua: string;
    numero: string;
    cep: string;
  };
  legacy_id?: string;
}

export default function AssinaturasPage() {
  // Adicionar estilos CSS para animações dos modais
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      @keyframes slideInRight {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      
      @keyframes slideInUp {
        from {
          transform: translateY(20px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
      
      @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  const [loading, setLoading] = React.useState(false);
  const [items, setItems] = React.useState<Assinatura[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [editingItem, setEditingItem] = React.useState<Assinatura | null>(null);
  const [showEquipamentosModal, setShowEquipamentosModal] = React.useState(false);
  const [equipamentosSearch, setEquipamentosSearch] = React.useState<string>('');
  const [assinaturaSelecionada, setAssinaturaSelecionada] = React.useState<string | null>(null);
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('asc');
  const [showValidation, setShowValidation] = React.useState<boolean>(false);
  const [equipamentos, setEquipamentos] = React.useState<any[]>([]);
  const [clientes, setClientes] = React.useState<any[]>([]);
  const [assinaturasLoaded, setAssinaturasLoaded] = React.useState(false);
  const [equipamentosLoaded, setEquipamentosLoaded] = React.useState(false);
  const [clientesLoaded, setClientesLoaded] = React.useState(false);
  const [forceRefreshToken, setForceRefreshToken] = React.useState<number>(0);
  const [checkupLoading, setCheckupLoading] = React.useState<boolean>(false);
  const [checkupResult, setCheckupResult] = React.useState<SystemCheckupResult | null>(null);
  const [showCheckupModal, setShowCheckupModal] = React.useState<boolean>(false);
  const [showNovaAssinaturaModal, setShowNovaAssinaturaModal] = React.useState<boolean>(false);
  
  // Hook de validação
  const { validateAssinatura, getValidationResult, clearValidation } = useClienteAssinaturaValidation();

  const normalizeText = React.useCallback((value: any): string => {
    return String(value ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }, []);

  React.useEffect(() => {
    if (showEquipamentosModal) {
      setEquipamentosSearch('');
    }
  }, [showEquipamentosModal, editingItem?.id]);



  const fetchEquipamentosNow = React.useCallback(async () => {
    try {
      // Limpar cache local antes de recarregar
      setEquipamentos([]);
      const snap = await getDocs(tenantCollection(getDb(), 'equipamentos'));
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setEquipamentos(docs);
    } catch (err) {
      console.error('Erro ao atualizar equipamentos agora:', err);
    }
  }, []);

  React.useEffect(() => {
    setLoading(true);
    const db = getDb();

    const unsubscribeAssinaturas = onSnapshot(
      tenantCollection(db, 'assinaturas'),
      (snap) => {
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Assinatura[];
        setItems(docs);
        setError(null);
        setAssinaturasLoaded(true);
        setLoading(false);
      },
      (err) => {
        console.error('Erro ao carregar assinaturas:', err);
        setError(err?.message || 'Falha ao carregar assinaturas');
        setLoading(false);
      }
    );

    const unsubscribeEquipamentos = onSnapshot(
      tenantCollection(db, 'equipamentos'),
      (snap) => {
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setEquipamentos(docs);
        setEquipamentosLoaded(true);
      },
      (err) => {
        console.error('Erro ao carregar equipamentos:', err);
      }
    );

    const unsubscribeClientes = onSnapshot(
      tenantCollection(db, 'clientes'),
      (snap) => {
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setClientes(docs);
        setClientesLoaded(true);
      },
      (err) => {
        console.error('Erro ao carregar clientes:', err);
      }
    );

    return () => {
      unsubscribeAssinaturas();
      unsubscribeEquipamentos();
      unsubscribeClientes();
    };
  }, [forceRefreshToken]);

  const matchesAssinatura = React.useCallback((equip: any, assinatura: Assinatura) => {
    const equipAssDocId = equip?.assinatura?.id ?? equip?.assinatura_id ?? equip?.assinaturaId ?? '';
    const equipAssCodigo =
      equip?.assinatura?.codigo ??
      equip?.assinatura_codigo ??
      equip?.assinaturaCodigo ??
      equip?.codigo_assinatura ??
      equip?.assinatura_id ??
      '';
    const equipAssLegacy =
      equip?.assinatura?.legacy_id ??
      equip?.assinatura_legacy_id ??
      equip?.assinaturaLegacyId ??
      // legado: alguns registros salvam o legacy_id direto no equipamento
      equip?.legacy_id ??
      // e outros reutilizam assinatura_id como legacy_id (quando não é docId)
      null;

    const matchByDocId = String(equipAssDocId || '') === String(assinatura.id);
    const matchByCodigo = String(equipAssCodigo || '') === String(assinatura.codigo || '');

    // Compatibilidade: se assinatura_id não bate como docId, ele pode ser legacy_id
    const equipAssIdAsLegacy = equip?.assinatura_id ?? equip?.assinaturaId ?? null;
    const matchByLegacy = assinatura.legacy_id
      ? String(equipAssLegacy || '') === String(assinatura.legacy_id)
          || String(equipAssIdAsLegacy || '') === String(assinatura.legacy_id)
      : false;

    return matchByDocId || matchByCodigo || matchByLegacy;
  }, []);

  const getClienteNomeFromEquipamento = React.useCallback((equip: any) => {
    // Para ficar consistente com a aba de Equipamentos:
    // se o equipamento estiver "sem cliente" (cliente/cliente_nome vazio), aqui também deve ficar vazio,
    // mesmo que ainda exista algum cliente_id antigo no documento.
    const nome = String(equip?.cliente || equip?.cliente_nome || '').trim();
    return nome;
  }, [clientes]);

  const digitsOnly = React.useCallback((v: any) => String(v ?? '').replace(/\D/g, ''), []);

  const isClienteAtivo = React.useCallback((cliente: any) => {
    const st = String(cliente?.status || cliente?.situacao || 'ativo').toLowerCase();
    if (!st) return true;
    if (st.includes('desativ') || st.includes('inativ') || st.includes('cancel')) return false;
    return true;
  }, []);

  const asDate = React.useCallback((value: any): Date | null => {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (value && typeof value.toDate === 'function') return value.toDate();
    if (value && typeof value.seconds === 'number') return new Date(value.seconds * 1000);
    const dt = new Date(value);
    return isNaN(dt.getTime()) ? null : dt;
  }, []);

  const hasCobrancaRecente = React.useCallback((cobrancasDoCliente: any[], now: Date) => {
    const atual = { y: now.getFullYear(), m: now.getMonth() };
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const anterior = { y: prev.getFullYear(), m: prev.getMonth() };
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const proximo = { y: next.getFullYear(), m: next.getMonth() };

    for (const c of cobrancasDoCliente) {
      const dt = asDate(
        c.data_vencimento ||
          c.vencimento ||
          c.data ||
          c.referencia ||
          c.pagoEm ||
          c.data_pagamento
      );

      // Muitas cobranças usam referenciaAno/referenciaMes
      const refAno = Number(c.referenciaAno ?? c.ano ?? c.anoReferencia ?? NaN);
      const refMes = Number(c.referenciaMes ?? c.mes ?? c.mesReferencia ?? NaN); // 1..12

      const y = dt ? dt.getFullYear() : (Number.isFinite(refAno) ? refAno : null);
      const m = dt ? dt.getMonth() : (Number.isFinite(refMes) ? (refMes - 1) : null); // 0..11
      if (y == null || m == null) continue;

      // Considerar mês atual, anterior e próximo (muita gente gera cobrança adiantada)
      if (
        (y === atual.y && m === atual.m) ||
        (y === anterior.y && m === anterior.m) ||
        (y === proximo.y && m === proximo.m)
      ) return true;
    }
    return false;
  }, [asDate]);

  const resolveClienteForAssinatura = React.useCallback((assinatura: any) => {
    const directIds = [
      assinatura?.cliente_id,
      assinatura?.clienteId,
      assinatura?.cliente?.id,
      assinatura?.cliente?.cliente_id,
      Array.isArray(assinatura?.clientes) ? assinatura.clientes?.[0]?.id : null,
      Array.isArray(assinatura?.clientes) ? assinatura.clientes?.[0]?.cliente_id : null,
    ].filter((v) => v != null && v !== '');

    for (const id of directIds) {
      const found = clientes.find((c: any) => String(c.id) === String(id) || String(c.legacy_id) === String(id) || String(c.clienteId) === String(id));
      if (found) return found;
    }

    const cpf = digitsOnly(assinatura?.cpf || assinatura?.documento || assinatura?.cpf_cliente);
    if (cpf) {
      const foundByCpf = clientes.find((c: any) => digitsOnly(c.cpf || c.documento || c.cpf_cliente || c.cpfCnpj || c.cpf_cnpj) === cpf);
      if (foundByCpf) return foundByCpf;
    }

    return null;
  }, [clientes, digitsOnly]);

  const extractClienteIdsFromEquipamentos = React.useCallback((eqs: any[]) => {
    const ids = new Set<string>();
    for (const eq of eqs || []) {
      // Para ficar consistente com a aba de Equipamentos:
      // só considerar cliente quando o equipamento tem texto de cliente (não inflar com IDs antigos).
      const nome = String(eq?.cliente || eq?.cliente_nome || '').trim();
      if (!nome) continue;

      const current =
        eq?.cliente_atual_id ??
        eq?.clienteAtualId ??
        eq?.clienteId ??
        eq?.cliente_id ??
        eq?.cliente?.id ??
        null;

      if (current != null && current !== '') ids.add(String(current));
    }
    return Array.from(ids.values());
  }, []);

  const resolveClienteById = React.useCallback((id: string) => {
    return clientes.find((c: any) =>
      String(c.id) === String(id) ||
      String(c.legacy_id) === String(id) ||
      String(c.clienteId) === String(id)
    ) || null;
  }, [clientes]);

  const resolveClientesForAssinatura = React.useCallback((assinatura: any, eqs: any[]) => {
    const ids = extractClienteIdsFromEquipamentos(eqs);
    const resolved: any[] = [];

    for (const id of ids) {
      const c = resolveClienteById(id);
      if (c) resolved.push(c);
    }

    if (resolved.length > 0) return resolved;

    const fallback = resolveClienteForAssinatura(assinatura);
    return fallback ? [fallback] : [];
  }, [extractClienteIdsFromEquipamentos, resolveClienteById, resolveClienteForAssinatura]);

  const runSystemCheckup = React.useCallback(async () => {
    setCheckupLoading(true);
    try {
      const db = getDb();
      const now = new Date();

      // Carregar cobranças sob demanda (evita snapshot contínuo pesado)
      const cobrSnap = await getDocs(tenantCollection(db, 'cobrancas'));
      const cobrancas = cobrSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Index cobranças por chaves possíveis (id/legacy/nome)
      const cobrancasPorClienteKey = new Map<string, any[]>();
      const cobrancasPorNome = new Map<string, any[]>();

      const pushToMap = (map: Map<string, any[]>, keyRaw: any, value: any) => {
        const key = String(keyRaw ?? '').trim();
        if (!key) return;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(value);
      };

      cobrancas.forEach((c: any) => {
        pushToMap(cobrancasPorClienteKey, c.cliente_id, c);
        pushToMap(cobrancasPorClienteKey, c.clienteId, c);

        const nome = normalizeText(c.cliente_nome || c.clienteNome || c.cliente || c.nome_cliente || '');
        if (nome) pushToMap(cobrancasPorNome, nome, c);
      });

      const getCobrancasDoCliente = (cliente: any): any[] => {
        const out: any[] = [];
        const seen = new Set<string>();

        const keys = [
          cliente?.id,
          cliente?.legacy_id,
          cliente?.clienteId,
          cliente?.cliente_id,
        ]
          .filter((v: any) => v != null && String(v).trim() !== '')
          .map((v: any) => String(v).trim());

        for (const k of keys) {
          const arr = cobrancasPorClienteKey.get(k) || [];
          for (const item of arr) {
            const id = String(item?.id ?? '');
            if (id && seen.has(id)) continue;
            if (id) seen.add(id);
            out.push(item);
          }
        }

        // Fallback por nome (para casos onde a cobrança não gravou cliente_id corretamente)
        if (out.length === 0) {
          const nomeCli = normalizeText(cliente?.nomeCompleto || cliente?.nome || '');
          const arr = nomeCli ? (cobrancasPorNome.get(nomeCli) || []) : [];
          for (const item of arr) {
            const id = String(item?.id ?? '');
            if (id && seen.has(id)) continue;
            if (id) seen.add(id);
            out.push(item);
          }
        }

        return out;
      };

      // Equipamentos com defeito/manutenção/inativo
      const equipamentosComDefeito: DefectEquipmentRow[] = [];
      const defectStatuses = ['defeito', 'problema', 'manut', 'inativ'];

      equipamentos.forEach((e: any) => {
        const st = String(e.status || e.status_aparelho || e.statusAparelho || '').toLowerCase();
        if (!defectStatuses.some((k) => st.includes(k))) return;
        const nds = String(e.nds || e.numero_nds || '').trim() || '—';
        const cliente = getClienteNomeFromEquipamento(e) || '—';
        const assinaturaMatch = items.find((a) => matchesAssinatura(e, a));
        const assinaturaLabel = assinaturaMatch ? (assinaturaMatch.codigo || assinaturaMatch.id) : '—';
        equipamentosComDefeito.push({
          equipamentoId: String(e.id || '—'),
          nds,
          cliente,
          assinatura: String(assinaturaLabel),
          status: String(e.status || e.status_aparelho || e.statusAparelho || '—'),
        });
      });

      // Checks por assinatura
      const problemas: AssinaturaCheckItem[] = [];
      const atencoes: AssinaturaCheckItem[] = [];
      const ok: AssinaturaCheckItem[] = [];

      for (const a of items) {
        const issues: CheckIssue[] = [];
        const eqs = equipamentos.filter((e: any) => matchesAssinatura(e, a));

        if (eqs.length === 0) {
          issues.push({ severity: 'PROBLEMA', message: 'Assinatura sem equipamento vinculado' });
        } else {
          // duplicidade: NDS/smart_card repetido dentro da assinatura
          const seen = new Set<string>();
          const dup = new Set<string>();
          for (const e of eqs) {
            const nds = String(e.nds || e.numero_nds || '').trim().toUpperCase();
            const sc = String(e.smart_card || e.smartcard || '').trim().toUpperCase();
            const key = nds ? `NDS:${nds}` : sc ? `SC:${sc}` : '';
            if (!key) continue;
            if (seen.has(key)) dup.add(key);
            seen.add(key);
          }
          if (dup.size > 0) {
            issues.push({ severity: 'ATENCAO', message: `Possível duplicidade de equipamentos (${dup.size})` });
          }
        }

        const clientesResolvidos = resolveClientesForAssinatura(a, eqs);
        const clienteIdsResolvidos = clientesResolvidos.map((c: any) => String(c.id));

        if (clientesResolvidos.length === 0) {
          issues.push({ severity: 'PROBLEMA', message: 'Assinatura sem cliente vinculado' });
        } else {
          if (clienteIdsResolvidos.length > 1) {
            issues.push({ severity: 'ATENCAO', message: `Múltiplos clientes vinculados (${clienteIdsResolvidos.length})` });
          }

          // Cobrança: se existir ao menos um cliente ativo, precisa ter cobrança recente para algum deles.
          const ativos = clientesResolvidos.filter((c: any) => isClienteAtivo(c));
          if (ativos.length > 0) {
            const algumComCobranca = ativos.some((c: any) => {
              const cobrancasDoCliente = getCobrancasDoCliente(c);
              return hasCobrancaRecente(cobrancasDoCliente, now);
            });
            if (!algumComCobranca) {
              issues.push({ severity: 'PROBLEMA', message: 'Cliente ativo sem cobrança recente (mês atual/anterior/próximo)' });
            }
          }
        }

        const item: AssinaturaCheckItem = {
          assinaturaId: a.id,
          codigo: String(a.codigo || a.id),
          nome: String(a.nomeCompleto || a.codigo || a.id),
          issues,
        };

        const hasProblem = issues.some((i) => i.severity === 'PROBLEMA');
        const hasWarn = issues.some((i) => i.severity === 'ATENCAO');
        if (hasProblem) problemas.push(item);
        else if (hasWarn) atencoes.push(item);
        else ok.push(item);
      }

      // Clientes ativos sem cobrança (entre clientes vinculados via EQUIPAMENTOS/ASSINATURAS)
      const clienteToAssinaturas = new Map<string, { nome: string; bairro: string; assinaturas: string[]; ativo: boolean }>();
      for (const a of items) {
        const eqs = equipamentos.filter((e: any) => matchesAssinatura(e, a));
        const cls = resolveClientesForAssinatura(a, eqs);
        for (const cli of cls) {
          if (!cli) continue;
          const id = String(cli.id);
          if (!clienteToAssinaturas.has(id)) {
            clienteToAssinaturas.set(id, {
              nome: String(cli.nomeCompleto || cli.nome || '—'),
              bairro: String(cli.bairro || cli.endereco?.bairro || ''),
              assinaturas: [],
              ativo: isClienteAtivo(cli),
            });
          }
          clienteToAssinaturas.get(id)!.assinaturas.push(String(a.codigo || a.id));
        }
      }

      const clientesSemCobranca: ClienteSemCobrancaRow[] = [];
      for (const [clienteId, info] of clienteToAssinaturas.entries()) {
        if (!info.ativo) continue;
        const cli = resolveClienteById(clienteId);
        const cobrancasDoCliente = cli ? getCobrancasDoCliente(cli) : (cobrancasPorClienteKey.get(clienteId) || []);
        const hasRecent = hasCobrancaRecente(cobrancasDoCliente, now);
        if (!hasRecent) {
          clientesSemCobranca.push({
            clienteId,
            nome: info.nome,
            bairro: info.bairro || '—',
            assinaturas: info.assinaturas,
            motivo: 'Sem cobrança recente (mês atual/anterior/próximo)',
          });
        }
      }

      const alerts: string[] = [];
      if (clientesSemCobranca.length > 0) alerts.push('⚠️ Existem clientes ativos sem cobrança recente');
      if (equipamentosComDefeito.length > 0) alerts.push('⚠️ Existem equipamentos com defeito/manutenção/inativos');
      if (problemas.length > 0) alerts.push('⚠️ Existem assinaturas incompletas');

      const result: SystemCheckupResult = {
        ranAt: new Date().toISOString(),
        totals: {
          totalAssinaturas: items.length,
          assinaturasComProblema: problemas.length,
          assinaturasComAtencao: atencoes.length,
          equipamentosComDefeito: equipamentosComDefeito.length,
          clientesSemCobranca: clientesSemCobranca.length,
        },
        assinaturas: { problemas, atencoes, ok },
        equipamentosComDefeito: equipamentosComDefeito
          .sort((a, b) => a.status.localeCompare(b.status, 'pt-BR') || a.cliente.localeCompare(b.cliente, 'pt-BR')),
        clientesSemCobranca: clientesSemCobranca.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
        alerts,
      };

      setCheckupResult(result);
    } catch (e: any) {
      console.error('Erro no checkup do sistema:', e);
      alert(`Erro ao executar checkup: ${e?.message || e}`);
    } finally {
      setCheckupLoading(false);
    }
  }, [
    equipamentos,
    items,
    matchesAssinatura,
    getClienteNomeFromEquipamento,
    resolveClienteForAssinatura,
    isClienteAtivo,
    hasCobrancaRecente,
  ]);

  // Rodar automaticamente ao abrir o modal (mantém a tela limpa)
  React.useEffect(() => {
    if (!showCheckupModal) return;
    if (!assinaturasLoaded || !equipamentosLoaded || !clientesLoaded) return;
    if (checkupLoading) return;

    const last = checkupResult?.ranAt ? new Date(checkupResult.ranAt).getTime() : 0;
    const stale = !last || (Date.now() - last) > (2 * 60 * 1000);
    if (!stale) return;

    runSystemCheckup();
  }, [
    showCheckupModal,
    assinaturasLoaded,
    equipamentosLoaded,
    clientesLoaded,
    checkupLoading,
    checkupResult?.ranAt,
    runSystemCheckup,
  ]);

  const normalizeStatus = React.useCallback((equip: any) => {
    const raw = String(equip.status || equip.status_aparelho || equip.statusAparelho || '').toLowerCase();
    if (raw.includes('defeito') || raw.includes('problema')) {
      return 'defeito';
    }
    if (raw.includes('disponivel') || raw.includes('livre')) {
      return 'disponivel';
    }
    return 'ativo';
  }, []);

  const shouldHideCliente = React.useCallback((statusKey: string, equip: any) => {
    if (statusKey === 'disponivel') return true;
    if (statusKey === 'defeito') {
      const hasCliente = Boolean(
        equip?.cliente_atual_id ||
        equip?.clienteAtualId ||
        equip?.cliente?.id
      );
      return !hasCliente;
    }
    return false;
  }, []);

  const stats = React.useMemo(() => {
    const totalAssinaturas = items.length;
    const assinaturasAtivas = items.filter(a => a.status === 'ativo' || a.status === 'ativa').length;

    const equipamentosVinculados = equipamentos.filter((equip: any) =>
      items.some(assinatura => matchesAssinatura(equip, assinatura))
    );

    const clientesUnicosSet = new Set<string>();
    equipamentosVinculados.forEach((equip: any) => {
      const nomeCliente = getClienteNomeFromEquipamento(equip);
      if (nomeCliente) {
        clientesUnicosSet.add(nomeCliente);
      }
    });

    return {
      totalAssinaturas,
      assinaturasAtivas,
      totalEquipamentos: equipamentosVinculados.length,
      clientesUnicos: clientesUnicosSet.size
    };
  }, [items, equipamentos, matchesAssinatura, getClienteNomeFromEquipamento]);

  const assinaturaStatsMap = React.useMemo(() => {
    const map = new Map<string, { total: number; clientesUnicos: number; defeito: number; disponivel: number; ativo: number }>();

    items.forEach((assinatura) => {
      const equipamentosVinculados = equipamentos.filter((equip: any) =>
        matchesAssinatura(equip, assinatura)
      );

      const clientesSet = new Set<string>();
      let defeito = 0;
      let disponivel = 0;
      let ativo = 0;

      equipamentosVinculados.forEach((equip: any) => {
        const status = normalizeStatus(equip);
        if (status === 'defeito') defeito += 1;
        else if (status === 'disponivel') disponivel += 1;
        else ativo += 1;

        const nomeCliente = getClienteNomeFromEquipamento(equip);
        if (nomeCliente) {
          clientesSet.add(nomeCliente);
        }
      });

      map.set(assinatura.id, {
        total: equipamentosVinculados.length,
        clientesUnicos: clientesSet.size,
        defeito,
        disponivel,
        ativo
      });
    });

    return map;
  }, [items, equipamentos, matchesAssinatura, normalizeStatus, getClienteNomeFromEquipamento]);

  // Função para ordenar as assinaturas por nome
  const sortedItems = React.useMemo(() => {
    return [...items].sort((a, b) => {
      const nameA = a.nomeCompleto.toLowerCase();
      const nameB = b.nomeCompleto.toLowerCase();
      
      if (sortOrder === 'asc') {
        return nameA.localeCompare(nameB, 'pt-BR');
      } else {
        return nameB.localeCompare(nameA, 'pt-BR');
      }
    });
  }, [items, sortOrder]);

  // Função para alternar a ordem de classificação
  const toggleSortOrder = () => {
    console.log('🔄 Alternando ordem de classificação de', sortOrder, 'para', sortOrder === 'asc' ? 'desc' : 'asc');
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  // Debug: mostrar quando sortedItems muda
  React.useEffect(() => {
    console.log('📋 sortedItems atualizado:', {
      total: sortedItems.length,
      sortOrder: sortOrder,
      primeirosNomes: sortedItems.slice(0, 5).map(a => a.nomeCompleto)
    });
  }, [sortedItems, sortOrder]);

  // Bairro: não tentar "adivinhar" pelo cliente antigo (mantém consistência com Equipamentos)
  const resolverBairroCliente = (equipamento: any): string => {
    // 1. Primeiro tenta usar o bairro direto do equipamento
    if (equipamento.bairro && equipamento.bairro.trim() !== '') {
      return equipamento.bairro.trim();
    }
    
    // 2. Se não tem, busca no endereço do equipamento
    if (equipamento.endereco?.bairro && equipamento.endereco.bairro.trim() !== '') {
      return equipamento.endereco.bairro.trim();
    }

    return 'Não informado';
  };

  const resolverClienteInfo = (equip: any, bairroResolvido: string) => {
    const nome = String(equip?.cliente || equip?.cliente_nome || '').trim();
    if (!nome) {
      return { nome: '-', id: null, bairro: '-' };
    }
    // Mantém o texto exatamente como o documento já traz (mesmo padrão da aba Equipamentos)
    const id = equip?.cliente_atual_id ?? equip?.clienteAtualId ?? equip?.cliente?.id ?? null;
    return { nome, id, bairro: bairroResolvido };
  };

  const equipamentosDaAssinatura = React.useMemo(() => {
    if (!editingItem) return [];

    const equipamentosVinculados = equipamentos.filter((equip: any) =>
      matchesAssinatura(equip, editingItem)
    );

    return equipamentosVinculados.map((equip: any) => {
      const bairroResolvido = resolverBairroCliente(equip);
      const clienteInfo = resolverClienteInfo(equip, bairroResolvido);
      const statusKey = normalizeStatus(equip);
      const ocultarCliente = shouldHideCliente(statusKey, equip);
      const clienteInfoFinal = ocultarCliente ? { nome: '-', id: null, bairro: '-' } : clienteInfo;
      const bairroFinal = ocultarCliente ? '-' : (clienteInfoFinal?.nome === '-' ? '-' : bairroResolvido);

      const statusFonte = String(equip.status || equip.status_aparelho || equip.statusAparelho || '');
      const statusFonteLower = statusFonte.toLowerCase();
      const divergeDisponivel = statusFonteLower.includes('disp') && statusKey !== 'disponivel';
      const divergeDefeito = (statusFonteLower.includes('defeito') || statusFonteLower.includes('problema')) && statusKey !== 'defeito';
      const divergencia = divergeDisponivel || divergeDefeito;

      console.log('[Assinaturas][Equipamento]', {
        id: equip.id,
        statusFonte,
        statusExibido: statusKey,
        divergencia
      });

      if (divergencia) {
        console.warn('[Assinaturas][Equipamento] Divergencia detectada', {
          id: equip.id,
          statusFonte,
          statusExibido: statusKey
        });
      }

      return {
        ...equip,
        clienteInfo: clienteInfoFinal,
        nds: equip.numero_nds || equip.nds || equip.nds_id || equip.numero_serie || 'N/A',
        cartao: equip.smart_card || equip.cartao || equip.numero_cartao || equip.cartao_id || 'N/A',
        bairro: bairroFinal,
        statusKey
      };
    });
  }, [editingItem, equipamentos, clientes, matchesAssinatura, normalizeStatus, shouldHideCliente]);

  const equipamentosDaAssinaturaFiltrados = React.useMemo(() => {
    const term = normalizeText(equipamentosSearch);
    if (!term) return equipamentosDaAssinatura;

    return equipamentosDaAssinatura.filter((equip: any) => {
      const nds = normalizeText(equip.nds || equip.nds_id || '');
      const cartao = normalizeText(equip.cartao || equip.numero_cartao || '');
      const cliente = normalizeText(equip.clienteInfo?.nome || '');
      const bairro = normalizeText(equip.bairro || '');
      const status = normalizeText(equip.statusKey || equip.status || '');

      return (
        nds.includes(term) ||
        cartao.includes(term) ||
        cliente.includes(term) ||
        bairro.includes(term) ||
        status.includes(term)
      );
    });
  }, [equipamentosDaAssinatura, equipamentosSearch, normalizeText]);

  const clientesUnicos = React.useMemo(() => {
    const clientesUnicosSet = new Set<string>();
    equipamentosDaAssinatura.forEach((equip: any) => {
      if (equip.clienteInfo?.nome && equip.clienteInfo.nome !== 'Cliente não encontrado') {
        clientesUnicosSet.add(equip.clienteInfo.nome);
      }
    });
    return clientesUnicosSet.size;
  }, [equipamentosDaAssinatura]);

  const selectedStats = React.useMemo(() => {
    if (!editingItem) {
      return { total: 0, clientesUnicos: 0, ativo: 0, defeito: 0, disponivel: 0 };
    }
    return assinaturaStatsMap.get(editingItem.id) || { total: 0, clientesUnicos: 0, ativo: 0, defeito: 0, disponivel: 0 };
  }, [editingItem, assinaturaStatsMap]);



  return (
    <>
      <div style={{ padding: '20px', width: '100%', maxWidth: 'none' }}>
        {/* Mostrar erro no topo se houver */}
        {error && (
          <div style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '14px'
          }}>
            ❌ {error}
          </div>
        )}

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
          {/* Ícone de assinaturas no canto esquerdo */}
          <div style={{
            position: 'absolute',
            left: '32px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '56px',
            opacity: '0.25',
            color: 'white'
          }}>
            📋
          </div>
          
          {/* Efeito decorativo no canto direito */}
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
          
          {/* Conteúdo centralizado */}
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
              ASSINATURAS
            </h1>
            <p style={{
              fontSize: '20px',
              color: 'rgba(255, 255, 255, 0.95)',
              fontWeight: '400',
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
              maxWidth: '600px',
              margin: '0 auto'
            }}>
              Gerencie todas as assinaturas do sistema de forma centralizada e organizada
            </p>
          </div>
        </div>

        {/* Ação: Nova Assinatura */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          <button
            onClick={() => setShowNovaAssinaturaModal(true)}
            style={{
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: '16px 32px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
              transition: 'all 0.2s ease',
              outline: 'none'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#059669';
              e.currentTarget.style.boxShadow = '0 8px 20px rgba(16, 185, 129, 0.4)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#10b981';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.25)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <span style={{ fontSize: '16px' }}>➕</span>
            Nova Assinatura
          </button>
        </div>

        {/* Header removido conforme solicitado */}
        <div style={{ marginBottom: '24px' }}>
          {/* Título e subtítulo removidos */}
        </div>

        {/* Cards de Resumo Modernos */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
          gap: '24px', 
          marginBottom: '40px' 
        }}>
          {/* Card 1 - Assinaturas */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '32px',
            position: 'relative',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            border: '1px solid #f1f5f9',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 20px 40px -10px rgba(0, 0, 0, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
          }}>
            <div style={{ 
              position: 'absolute', 
              top: '24px', 
              right: '24px', 
              fontSize: '32px', 
              opacity: '0.2' 
            }}>
              📋
            </div>
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ 
                fontSize: '18px', 
                fontWeight: '600', 
                color: '#1e293b', 
                margin: '0 0 16px 0' 
              }}>
                Assinaturas
              </h3>
              <div style={{ fontSize: '48px', fontWeight: '700', color: '#3b82f6', marginBottom: '12px' }}>
                {stats.totalAssinaturas}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: '600', color: '#059669' }}>
                  {stats.assinaturasAtivas}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>
                  Ativas
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: '600', color: '#d97706' }}>
                  {stats.totalAssinaturas - stats.assinaturasAtivas}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>
                  Pendentes
                </div>
              </div>
            </div>
          </div>

          {/* Card 2 - Clientes Únicos */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '32px',
            position: 'relative',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            border: '1px solid #f1f5f9',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 20px 40px -10px rgba(0, 0, 0, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
          }}>
            <div style={{ 
              position: 'absolute', 
              top: '24px', 
              right: '24px', 
              fontSize: '32px', 
              opacity: '0.2' 
            }}>
              👥
            </div>
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ 
                fontSize: '18px', 
                fontWeight: '600', 
                color: '#1e293b', 
                margin: '0 0 16px 0' 
              }}>
                Clientes Únicos
              </h3>
              <div style={{ fontSize: '48px', fontWeight: '700', color: '#10b981', marginBottom: '12px' }}>
                {stats.clientesUnicos}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>
                Média: {stats.totalAssinaturas > 0 ? (stats.clientesUnicos / stats.totalAssinaturas).toFixed(1) : '0'} equipamentos/cliente
              </div>
            </div>
          </div>

          {/* Card 3 - Equipamentos Alugados */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '32px',
            position: 'relative',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            border: '1px solid #f1f5f9',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 20px 40px -10px rgba(0, 0, 0, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
          }}>
            <div style={{ 
              position: 'absolute', 
              top: '24px', 
              right: '24px', 
              fontSize: '32px', 
              opacity: '0.2' 
            }}>
              📺
            </div>
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ 
                fontSize: '18px', 
                fontWeight: '600', 
                color: '#1e293b', 
                margin: '0 0 16px 0' 
              }}>
                Equipamentos Vinculados
              </h3>
              <div style={{ fontSize: '48px', fontWeight: '700', color: '#f59e0b', marginBottom: '12px' }}>
                {stats.totalEquipamentos}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>
                {stats.totalAssinaturas > 0 ? Math.round((stats.totalEquipamentos / stats.totalAssinaturas) * 100) : 0}% do total
              </div>
            </div>
          </div>


        </div>

        {/* Checkup do Sistema (mesmo padrão do "Resumo": abre em modal) */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          padding: '16px',
          marginBottom: '24px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap'
          }}>
            <div>
              <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '16px' }}>
                Auditoria / Checkup do Sistema
              </div>
              <div style={{ color: '#64748b', fontSize: '13px', marginTop: '4px' }}>
                Abre um resumo completo (problemas, atenções, OK, equipamentos e clientes sem cobrança).
              </div>
              <div style={{ color: '#64748b', fontSize: '12px', marginTop: '8px', fontWeight: 700 }}>
                {assinaturasLoaded && equipamentosLoaded && clientesLoaded
                  ? (checkupResult?.ranAt ? `Última execução: ${new Date(checkupResult.ranAt).toLocaleString('pt-BR')}` : 'Ainda não executado.')
                  : 'Carregando dados...'}
              </div>
            </div>

            <button
              onClick={() => setShowCheckupModal(true)}
              style={{
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                padding: '12px 16px',
                fontSize: '13px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 6px 16px rgba(37, 99, 235, 0.25)',
              }}
              title="Abrir Checkup do Sistema"
            >
              📋 Abrir Checkup
            </button>
          </div>
        </div>

        <CheckupSistemaModal
          open={showCheckupModal}
          onClose={() => setShowCheckupModal(false)}
          loading={checkupLoading}
          result={checkupResult}
          onRun={runSystemCheckup}
        />

        {/* Aviso */}
        <div style={{
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '14px 18px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          color: '#475569',
          fontSize: '14px',
          fontWeight: '600'
        }}>
          <span>ℹ️ Você pode cadastrar novas assinaturas aqui. Equipamentos continuam sendo gerenciados na aba Equipamentos.</span>
          <button
            onClick={async () => {
              await fetchEquipamentosNow();
              setForceRefreshToken(Date.now());
            }}
            style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 14px',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
            title="Atualizar agora"
          >
            🔄 Atualizar agora
          </button>
        </div>

        {/* Tabela */}
        <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        border: '1px solid #e2e8f0'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ 
              backgroundColor: '#f8fafc',
              borderBottom: '2px solid #e2e8f0'
            }}>
              <th style={{ 
                padding: '16px 20px', 
                textAlign: 'left', 
                fontWeight: '700', 
                fontSize: '11px', 
                color: '#374151', 
                textTransform: 'uppercase', 
                letterSpacing: '0.1em',
                borderRight: '1px solid #f1f5f9'
              }}>
                Equipamentos
              </th>
              <th style={{ 
                padding: '16px 20px', 
                textAlign: 'left', 
                fontWeight: '700', 
                fontSize: '11px', 
                color: '#374151', 
                textTransform: 'uppercase', 
                letterSpacing: '0.1em',
                borderRight: '1px solid #f1f5f9'
              }}>
                Código
              </th>
              <th 
                style={{ 
                  padding: '16px 20px', 
                  textAlign: 'left', 
                  fontWeight: '700', 
                  fontSize: '11px', 
                  color: '#374151', 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.1em',
                  cursor: 'pointer',
                  userSelect: 'none',
                  borderRight: '1px solid #f1f5f9',
                  transition: 'background-color 0.2s ease'
                }}
                onClick={toggleSortOrder}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f1f5f9';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Nome Completo
                  <span style={{ 
                    fontSize: '12px', 
                    opacity: 0.7,
                    transition: 'transform 0.2s ease',
                    color: '#3b82f6'
                  }}>
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </span>
                </div>
              </th>
              <th style={{ 
                padding: '16px 20px', 
                textAlign: 'left', 
                fontWeight: '700', 
                fontSize: '11px', 
                color: '#374151', 
                textTransform: 'uppercase', 
                letterSpacing: '0.1em',
                borderRight: '1px solid #f1f5f9'
              }}>
                CPF
              </th>
              <th style={{ 
                padding: '16px 20px', 
                textAlign: 'left', 
                fontWeight: '700', 
                fontSize: '11px', 
                color: '#374151', 
                textTransform: 'uppercase', 
                letterSpacing: '0.1em',
                borderRight: '1px solid #f1f5f9'
              }}>
                Equipamentos
              </th>
              <th style={{ 
                padding: '16px 20px', 
                textAlign: 'left', 
                fontWeight: '700', 
                fontSize: '11px', 
                color: '#374151', 
                textTransform: 'uppercase', 
                letterSpacing: '0.1em',
                borderRight: '1px solid #f1f5f9'
              }}>
                Clientes
              </th>
              <th style={{ 
                padding: '16px 20px', 
                textAlign: 'left', 
                fontWeight: '700', 
                fontSize: '11px', 
                color: '#374151', 
                textTransform: 'uppercase', 
                letterSpacing: '0.1em',
                borderRight: '1px solid #f1f5f9'
              }}>
                Ativos
              </th>
              <th style={{ 
                padding: '16px 20px', 
                textAlign: 'left', 
                fontWeight: '700', 
                fontSize: '11px', 
                color: '#374151', 
                textTransform: 'uppercase', 
                letterSpacing: '0.1em',
                borderRight: '1px solid #f1f5f9'
              }}>
                Com defeito
              </th>
              <th style={{ 
                padding: '16px 20px', 
                textAlign: 'left', 
                fontWeight: '700', 
                fontSize: '11px', 
                color: '#374151', 
                textTransform: 'uppercase', 
                letterSpacing: '0.1em',
                borderRight: '1px solid #f1f5f9'
              }}>
                Disponíveis
              </th>

              <th style={{ 
                padding: '16px 20px', 
                textAlign: 'left', 
                fontWeight: '700', 
                fontSize: '11px', 
                color: '#374151', 
                textTransform: 'uppercase', 
                letterSpacing: '0.1em',
                borderRight: '1px solid #f1f5f9'
              }}>
                Status
              </th>
              <th style={{ 
                padding: '16px 20px', 
                textAlign: 'left', 
                fontWeight: '700', 
                fontSize: '11px', 
                color: '#374151', 
                textTransform: 'uppercase', 
                letterSpacing: '0.1em'
              }}>
                Modo
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedItems.map((item, index) => {
              const assinaturaStats = assinaturaStatsMap.get(item.id) || {
                total: 0,
                clientesUnicos: 0,
                ativo: 0,
                defeito: 0,
                disponivel: 0
              };
              return (
              <tr key={item.id} style={{ 
                borderBottom: '1px solid #f1f5f9',
                backgroundColor: index % 2 === 0 ? '#ffffff' : '#fafbfc',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f0f9ff';
                e.currentTarget.style.transform = 'scale(1.001)';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#ffffff' : '#fafbfc';
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = 'none';
              }}>
                <td style={{ 
                  padding: '16px 20px',
                  borderRight: '1px solid #f1f5f9'
                }}>
                  <button
                    onClick={() => {
                      // Se já está selecionado, desseleciona
                      if (assinaturaSelecionada === item.id) {
                        setAssinaturaSelecionada(null);
                        setShowEquipamentosModal(false);
                        setEditingItem(null);
                        setShowValidation(false);
                      } else {
                        // Seleciona nova assinatura
                        setAssinaturaSelecionada(item.id);
                        setEditingItem(item);
                        setShowEquipamentosModal(true);
                        setShowValidation(false);
                      }
                    }}
                    style={{ 
                      padding: '8px 12px',
                      borderRadius: '8px', 
                      border: assinaturaSelecionada === item.id 
                        ? '2px solid #059669' 
                        : '2px solid #e5e7eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      backgroundColor: assinaturaSelecionada === item.id 
                        ? '#059669' 
                        : 'white',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      outline: 'none',
                      boxShadow: assinaturaSelecionada === item.id 
                        ? '0 2px 8px rgba(5, 150, 105, 0.3)' 
                        : '0 1px 3px rgba(0, 0, 0, 0.1)',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}
                    title={assinaturaSelecionada === item.id ? "Ocultar Equipamentos" : "Ver Equipamentos"}
                    onMouseEnter={(e) => {
                      if (assinaturaSelecionada !== item.id) {
                        e.currentTarget.style.borderColor = '#059669';
                        e.currentTarget.style.backgroundColor = '#f0fdf4';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 4px 8px rgba(5, 150, 105, 0.2)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (assinaturaSelecionada !== item.id) {
                        e.currentTarget.style.borderColor = '#e5e7eb';
                        e.currentTarget.style.backgroundColor = 'white';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
                      }
                    }}
                  >
                    {assinaturaSelecionada === item.id ? (
                      <>
                        <span style={{ color: 'white', fontSize: '12px' }}>✓</span>
                        <span style={{ color: 'white' }}>Equipamentos</span>
                      </>
                    ) : (
                      <>
                        <span style={{ color: '#6b7280', fontSize: '12px' }}>📋</span>
                        <span style={{ color: '#6b7280' }}>Ver Equipamentos</span>
                      </>
                    )}
                  </button>
                </td>
                <td style={{ 
                  padding: '16px 20px', 
                  fontWeight: '600', 
                  color: '#1f2937', 
                  fontSize: '14px',
                  borderRight: '1px solid #f1f5f9'
                }}>{item.codigo}</td>
                <td style={{ 
                  padding: '16px 20px', 
                  color: '#374151', 
                  fontSize: '14px',
                  fontWeight: '500',
                  borderRight: '1px solid #f1f5f9'
                }}>{item.nomeCompleto}</td>
                <td style={{ 
                  padding: '16px 20px', 
                  color: '#6b7280', 
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  borderRight: '1px solid #f1f5f9'
                }}>{item.cpf}</td>
                <td style={{ 
                  padding: '16px 20px',
                  borderRight: '1px solid #f1f5f9',
                  fontWeight: '600',
                  color: '#1f2937',
                  fontSize: '14px'
                }}>
                  {assinaturaStats.total}
                </td>
                <td style={{ 
                  padding: '16px 20px',
                  borderRight: '1px solid #f1f5f9',
                  fontWeight: '600',
                  color: '#1f2937',
                  fontSize: '14px'
                }}>
                  {assinaturaStats.clientesUnicos}
                </td>
                <td style={{ 
                  padding: '16px 20px',
                  borderRight: '1px solid #f1f5f9',
                  fontWeight: '600',
                  color: '#1f2937',
                  fontSize: '14px'
                }}>
                  {assinaturaStats.ativo}
                </td>
                <td style={{ 
                  padding: '16px 20px',
                  borderRight: '1px solid #f1f5f9',
                  fontWeight: '600',
                  color: '#dc2626',
                  fontSize: '14px'
                }}>
                  {assinaturaStats.defeito}
                </td>
                <td style={{ 
                  padding: '16px 20px',
                  borderRight: '1px solid #f1f5f9',
                  fontWeight: '600',
                  color: '#2563eb',
                  fontSize: '14px'
                }}>
                  {assinaturaStats.disponivel}
                </td>

                <td style={{ 
                  padding: '16px 20px',
                  borderRight: '1px solid #f1f5f9'
                }}>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    backgroundColor: '#dbeafe',
                    borderRadius: '16px',
                    fontSize: '11px',
                    fontWeight: '700',
                    color: '#1e40af',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    border: '1px solid #bfdbfe'
                  }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#3b82f6' }}></div>
                    EM DIAS
                  </div>
                </td>
                <td style={{ padding: '16px 20px' }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    backgroundColor: '#f1f5f9',
                    borderRadius: '14px',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#475569',
                    border: '1px solid #e2e8f0'
                  }}>
                    🔒 Somente leitura
                  </span>
                </td>
              </tr>
            );
            })}
          </tbody>
        </table>
        </div>

        {/* Seção de Equipamentos Expansível */}
        {showEquipamentosModal && editingItem && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          border: '1px solid #e2e8f0',
          marginTop: '24px'
        }}>
          {/* Cabeçalho da Seção */}
          <div style={{
            backgroundColor: '#f8fafc',
            padding: '20px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
                             <h3 style={{ 
                 margin: 0, 
                 fontSize: '1.5rem', 
                 fontWeight: '700',
                 color: '#374151',
                 display: 'flex',
                 alignItems: 'center',
                 gap: '8px'
               }}>
                 🖥️ Equipamentos da Assinatura - {editingItem.nomeCompleto}
               </h3>
               <p style={{ 
                 margin: '4px 0 0 0', 
                 color: '#6b7280',
                 fontSize: '14px'
               }}>
                {selectedStats.total} equipamento(s) • {clientesUnicos} cliente(s) único(s) • {selectedStats.ativo} ativo(s) • {selectedStats.defeito} com defeito • {selectedStats.disponivel} disponível(is)
               </p>
            </div>
            <button
              onClick={() => setShowEquipamentosModal(false)}
              style={{
                backgroundColor: '#ef4444',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 16px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#dc2626';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#ef4444';
              }}
            >
              ✕ Fechar
            </button>
          </div>

          {/* Tabela de Equipamentos */}
          <div style={{ padding: '24px' }}>
            {/* Alerta de Validação */}
            {showValidation && editingItem && getValidationResult(editingItem.id) && (
              <ValidationAlert
                {...getValidationResult(editingItem.id)!}
                onDismiss={() => {
                  setShowValidation(false);
                  clearValidation(editingItem.id);
                }}
                onRetry={() => validateAssinatura(editingItem.id)}
              />
            )}

            {/* Barra de pesquisa (somente leitura) */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                marginBottom: '16px',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ minWidth: 260, flex: 1 }}>
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 800,
                    letterSpacing: '0.06em',
                    color: '#64748b',
                    marginBottom: '6px',
                  }}
                >
                  PESQUISAR EQUIPAMENTOS
                </div>
                <input
                  value={equipamentosSearch}
                  onChange={(e) => setEquipamentosSearch(e.target.value)}
                  placeholder="Buscar por nome do cliente, NDS, cartão, bairro ou status..."
                  style={{
                    width: '100%',
                    height: '42px',
                    padding: '0 14px',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    outline: 'none',
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
                  }}
                />
              </div>

              {equipamentosSearch.trim() ? (
                <button
                  onClick={() => setEquipamentosSearch('')}
                  style={{
                    height: '42px',
                    padding: '0 14px',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    backgroundColor: '#f8fafc',
                    color: '#0f172a',
                    cursor: 'pointer',
                    fontWeight: 800,
                  }}
                  title="Limpar busca"
                >
                  ✕ Limpar
                </button>
              ) : (
                <div style={{ height: '42px' }} />
              )}
            </div>
            
            {equipamentosDaAssinaturaFiltrados.length > 0 ? (
              <div style={{
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                overflow: 'hidden',
                border: '1px solid #e2e8f0'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ 
                      backgroundColor: '#f1f5f9',
                      borderBottom: '1px solid #e2e8f0'
                    }}>
                      <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', fontSize: '14px', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        NDS
                      </th>
                      <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', fontSize: '14px', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Cartão
                      </th>
                      <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', fontSize: '14px', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Cliente
                      </th>
                      <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', fontSize: '14px', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Bairro
                      </th>
                      <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', fontSize: '14px', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Status
                      </th>

                    </tr>
                  </thead>
                  <tbody>
                    {equipamentosDaAssinaturaFiltrados.map((equip, index) => (
                      <tr key={equip.id} style={{ 
                        borderBottom: index < equipamentosDaAssinaturaFiltrados.length - 1 ? '1px solid #f1f5f9' : 'none',
                        transition: 'background-color 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f8fafc';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}>
                        <td style={{ padding: '16px', fontWeight: '500', color: '#1f2937', fontSize: '14px' }}>
                          {equip.nds || equip.nds_id || 'N/A'}
                        </td>
                        <td style={{ padding: '16px', color: '#374151', fontSize: '14px' }}>
                          {equip.cartao || equip.numero_cartao || 'N/A'}
                        </td>
                        <td style={{ padding: '16px', color: '#374151', fontSize: '14px' }}>
                          {equip.clienteInfo ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {equip.clienteInfo.nome !== '-' && (
                                <div style={{
                                  width: '8px',
                                  height: '8px',
                                  borderRadius: '50%',
                                  backgroundColor: equip.clienteInfo.nome === 'Cliente não encontrado' ? '#ef4444' : '#10b981'
                                }}></div>
                              )}
                              <span style={{ 
                                fontWeight: equip.clienteInfo.nome === 'Cliente não encontrado' ? '400' : '500',
                                color: equip.clienteInfo.nome === '-' ? '#6b7280' : (equip.clienteInfo.nome === 'Cliente não encontrado' ? '#6b7280' : '#374151')
                              }}>
                                {equip.clienteInfo.nome}
                              </span>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                backgroundColor: '#ef4444'
                              }}></div>
                              <span style={{ fontWeight: '400', color: '#6b7280' }}>
                                Cliente não encontrado
                              </span>
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '16px', color: '#6b7280', fontSize: '14px' }}>
                          {equip.bairro || 'Não informado'}
                        </td>
                        <td style={{ padding: '16px' }}>
                          {(() => {
                            const statusKey = equip.statusKey || 'ativo';
                            const statusInfo = statusKey === 'defeito'
                              ? { label: 'Com defeito', bg: '#fee2e2', color: '#991b1b', dot: '#ef4444' }
                              : statusKey === 'disponivel'
                                ? { label: 'Disponível', bg: '#dbeafe', color: '#1e40af', dot: '#3b82f6' }
                                : { label: 'Ativo', bg: '#dcfce7', color: '#166534', dot: '#22c55e' };

                            return (
                              <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '6px 12px',
                                backgroundColor: statusInfo.bg,
                                borderRadius: '12px',
                                fontSize: '12px',
                                fontWeight: '600',
                                color: statusInfo.color
                              }}>
                                <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: statusInfo.dot }}></div>
                                {statusInfo.label}
                              </div>
                            );
                          })()}
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div
                style={{
                  textAlign: 'center',
                  padding: '40px',
                  color: '#6b7280',
                  fontSize: '16px',
                  backgroundColor: '#f8fafc',
                  border: '1px dashed #e2e8f0',
                  borderRadius: '12px',
                }}
              >
                {equipamentosDaAssinatura.length === 0
                  ? 'Nenhum equipamento encontrado para esta assinatura.'
                  : 'Nenhum equipamento corresponde à sua busca.'}
              </div>
            )}
          </div>
        </div>
        )}


      </div>

      <NovaAssinaturaModal
        isOpen={showNovaAssinaturaModal}
        onClose={() => setShowNovaAssinaturaModal(false)}
        onSave={() => setShowNovaAssinaturaModal(false)}
      />
    </>
  );
}