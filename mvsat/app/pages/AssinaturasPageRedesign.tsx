import React from 'react';
import { collection, getDocs, onSnapshot } from 'firebase/firestore';
import { getDb } from '../../config/database.config';
import { tenantCollection } from '../../shared/saas/firestoreTenant';
import EditarAssinaturaModal from '../../assinaturas/EditarAssinaturaModal';
import NovaAssinaturaModal from '../../assinaturas/NovaAssinaturaModal';
import { removerAssinatura } from '../../assinaturas/assinatura.functions';
import { ConfirmModal } from '../../shared/components/ui';
import { useModulePermissions } from '../../shared/hooks/useModulePermissions';
import './AssinaturasPageRedesign.css';

type AnyRecord = Record<string, any>;
type EquipmentStatus = 'ativo' | 'defeito' | 'disponivel';
type DrawerTab = 'resumo' | 'equipamentos' | 'clientes';
type EquipmentFilter = 'todos' | EquipmentStatus;

interface Assinatura extends AnyRecord {
  id: string;
  codigo?: string;
  nomeCompleto?: string;
  cpf?: string;
  status?: string;
}

interface Equipment extends AnyRecord {
  id: string;
}

const normalize = (value: any) =>
  String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const digitsOnly = (value: any) => String(value ?? '').replace(/\D/g, '');

function equipmentStatus(equipment: Equipment): EquipmentStatus {
  const raw = normalize(equipment.status || equipment.status_aparelho || equipment.statusAparelho);
  if (raw.includes('defeito') || raw.includes('problema') || raw.includes('manut')) return 'defeito';
  if (raw.includes('dispon') || raw.includes('livre') || raw.includes('estoque')) return 'disponivel';
  return 'ativo';
}

function equipmentSignatureKeys(equipment: Equipment) {
  const assinatura = equipment.assinatura || {};
  return [
    equipment.assinatura_id,
    equipment.assinaturaId,
    equipment.subscriptionId,
    equipment.ownerId,
    equipment.titularId,
    equipment.codigo_assinatura,
    equipment.assinaturaCodigo,
    equipamentoValue(assinatura, 'id'),
    equipamentoValue(assinatura, 'codigo'),
    equipamentoValue(assinatura, 'legacy_id'),
  ].filter((value) => value !== undefined && value !== null && String(value).trim() !== '').map(String);
}

function equipamentoValue(value: any, key: string) {
  return value && typeof value === 'object' ? value[key] : undefined;
}

function matchesSignature(equipment: Equipment, signature: Assinatura) {
  const keys = equipmentSignatureKeys(equipment);
  const signatureKeys = [
    signature.id,
    signature.codigo,
    signature.legacy_id,
    signature.codigo_assinatura,
  ].filter(Boolean).map(String);
  return signatureKeys.some((key) => keys.includes(key));
}

function equipmentNds(equipment: Equipment) {
  return equipment.nds || equipment.numero_nds || equipment.nds_id || equipment.numero_serie || 'N/A';
}

function equipmentCard(equipment: Equipment) {
  return equipment.smart_card || equipment.smartcard || equipment.cartao || equipment.numero_cartao || equipment.cartao_id || 'N/A';
}

function equipmentClientId(equipment: Equipment) {
  return equipment.cliente_atual_id || equipment.clienteAtualId || equipment.clienteId || equipment.cliente_id || equipamentoValue(equipment.cliente, 'id') || null;
}

function equipmentClientName(equipment: Equipment) {
  return String(equipment.cliente_nome || (typeof equipment.cliente === 'string' ? equipment.cliente : '') || '').trim();
}

function equipmentNeighborhood(equipment: Equipment, client?: AnyRecord) {
  return equipment.bairro || equipment.endereco?.bairro || client?.bairro || client?.endereco?.bairro || 'Não informado';
}

function statusLabel(status: any) {
  const raw = normalize(status);
  if (raw.includes('susp')) return { label: 'Suspensa', tone: 'warning' };
  if (raw.includes('cancel') || raw.includes('inativ')) return { label: 'Inativa', tone: 'muted' };
  if (raw.includes('pend')) return { label: 'Pendente', tone: 'warning' };
  return { label: 'Em dia', tone: 'success' };
}

function statusText(status: EquipmentStatus) {
  return status === 'defeito' ? 'Com defeito' : status === 'disponivel' ? 'Disponível' : 'Ativo';
}

const StatCard = ({ icon, label, value, detail, tone }: { icon: string; label: string; value: number; detail: string; tone: string }) => (
  <div className={`assinaturas-stat assinaturas-stat--${tone}`}>
    <span className="assinaturas-stat__icon" aria-hidden="true">{icon}</span>
    <span className="assinaturas-stat__label">{label}</span>
    <strong>{value}</strong>
    <span className="assinaturas-stat__detail">{detail}</span>
  </div>
);

export default function AssinaturasPageRedesign() {
  const assinaturaPermissions = useModulePermissions('sky', ['assinaturas.create', 'assinaturas.edit', 'assinaturas.delete'] as const);
  const [assinaturas, setAssinaturas] = React.useState<Assinatura[]>([]);
  const [equipamentos, setEquipamentos] = React.useState<Equipment[]>([]);
  const [clientes, setClientes] = React.useState<AnyRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState('');
  const [filter, setFilter] = React.useState<'todas' | 'em_dia' | 'atencao' | 'defeito'>('todas');
  const [selected, setSelected] = React.useState<Assinatura | null>(null);
  const [editing, setEditing] = React.useState<Assinatura | null>(null);
  const [drawerTab, setDrawerTab] = React.useState<DrawerTab>('resumo');
  const [drawerSearch, setDrawerSearch] = React.useState('');
  const [equipmentFilter, setEquipmentFilter] = React.useState<EquipmentFilter>('todos');
  const [showNova, setShowNova] = React.useState(false);
  const [deleting, setDeleting] = React.useState<Assinatura | null>(null);
  const [excluindo, setExcluindo] = React.useState(false);

  React.useEffect(() => {
    const db = getDb();
    setLoading(true);
    const subscriptions = onSnapshot(
      tenantCollection(db, 'assinaturas'),
      (snapshot) => {
        setAssinaturas(snapshot.docs.map((item) => ({ ...item.data(), id: item.id })) as Assinatura[]);
        setLoading(false);
      },
      (reason) => {
        console.error('Erro ao carregar assinaturas:', reason);
        setError(reason.message || 'Não foi possível carregar as assinaturas.');
        setLoading(false);
      },
    );
    const equipmentSubscription = onSnapshot(tenantCollection(db, 'equipamentos'), (snapshot) => {
      setEquipamentos(snapshot.docs.map((item) => ({ ...item.data(), id: item.id })));
    }, (reason) => console.error('Erro ao carregar equipamentos:', reason));
    const clientsSubscription = onSnapshot(tenantCollection(db, 'clientes'), (snapshot) => {
      setClientes(snapshot.docs.map((item) => ({ ...item.data(), id: item.id })));
    }, (reason) => console.error('Erro ao carregar clientes:', reason));
    return () => {
      subscriptions();
      equipmentSubscription();
      clientsSubscription();
    };
  }, []);

  const clientById = React.useMemo(() => {
    const map = new Map<string, AnyRecord>();
    clientes.forEach((client) => {
      [client.id, client.legacy_id, client.legacyId, client.clienteId].filter(Boolean).forEach((key) => map.set(String(key), client));
    });
    return map;
  }, [clientes]);

  const equipmentBySignature = React.useMemo(() => {
    const map = new Map<string, Equipment[]>();
    assinaturas.forEach((signature) => map.set(signature.id, equipamentos.filter((item) => matchesSignature(item, signature))));
    return map;
  }, [assinaturas, equipamentos]);

  const statsBySignature = React.useMemo(() => {
    const map = new Map<string, { total: number; clients: Set<string>; active: number; defect: number; available: number }>();
    assinaturas.forEach((signature) => {
      const stats = { total: 0, clients: new Set<string>(), active: 0, defect: 0, available: 0 };
      (equipmentBySignature.get(signature.id) || []).forEach((item) => {
        stats.total += 1;
        const status = equipmentStatus(item);
        if (status === 'defeito') stats.defect += 1;
        else if (status === 'disponivel') stats.available += 1;
        else stats.active += 1;
        const clientId = equipmentClientId(item);
        const clientName = equipmentClientName(item);
        if (clientId || clientName) stats.clients.add(String(clientId || normalize(clientName)));
      });
      map.set(signature.id, stats);
    });
    return map;
  }, [assinaturas, equipmentBySignature]);

  const globalStats = React.useMemo(() => {
    const linked = equipamentos.filter((item) => assinaturas.some((signature) => matchesSignature(item, signature)));
    const clients = new Set<string>();
    linked.forEach((item) => {
      const id = equipmentClientId(item);
      const name = equipmentClientName(item);
      if (id || name) clients.add(String(id || normalize(name)));
    });
    return {
      signatures: assinaturas.length,
      activeSignatures: assinaturas.filter((item) => ['ativo', 'ativa', 'em_dia', 'em dias'].includes(normalize(item.status))).length,
      clients: clients.size,
      equipment: linked.length,
      active: linked.filter((item) => equipmentStatus(item) === 'ativo').length,
      defect: linked.filter((item) => equipmentStatus(item) === 'defeito').length,
      available: linked.filter((item) => equipmentStatus(item) === 'disponivel').length,
    };
  }, [assinaturas, equipamentos]);

  const filteredSignatures = React.useMemo(() => {
    const term = normalize(search);
    return [...assinaturas]
      .filter((signature) => {
        const stats = statsBySignature.get(signature.id);
        const searchable = normalize(`${signature.nomeCompleto} ${signature.codigo} ${signature.cpf}`);
        const searchableDigits = digitsOnly(`${signature.codigo} ${signature.cpf}`);
        const termDigits = digitsOnly(search);
        if (term && !searchable.includes(term) && !(termDigits && searchableDigits.includes(termDigits))) return false;
        if (filter === 'defeito') return Boolean(stats?.defect);
        if (filter === 'atencao') return Boolean(stats?.defect || !['ativo', 'ativa', 'em_dia', 'em dias'].includes(normalize(signature.status)));
        if (filter === 'em_dia') return !stats?.defect && ['ativo', 'ativa', 'em_dia', 'em dias'].includes(normalize(signature.status));
        return true;
      })
      .sort((a, b) => String(a.nomeCompleto || '').localeCompare(String(b.nomeCompleto || ''), 'pt-BR'));
  }, [assinaturas, filter, search, statsBySignature]);

  const selectedEquipment = selected ? (equipmentBySignature.get(selected.id) || []) : [];
  const selectedStats = selected ? statsBySignature.get(selected.id) : undefined;
  const filteredDrawerEquipment = selectedEquipment.filter((item) => {
    const term = normalize(drawerSearch);
    const client = clientById.get(String(equipmentClientId(item) || ''));
    const searchable = normalize(`${equipmentNds(item)} ${equipmentCard(item)} ${equipmentClientName(item)} ${client?.nomeCompleto || client?.nome || ''} ${equipmentNeighborhood(item, client)}`);
    return (!term || searchable.includes(term)) && (equipmentFilter === 'todos' || equipmentStatus(item) === equipmentFilter);
  });
  const selectedClients = React.useMemo(() => {
    if (!selected) return [];
    const seen = new Set<string>();
    return selectedEquipment.flatMap((item) => {
      const clientId = equipmentClientId(item);
      const client = clientById.get(String(clientId || ''));
      const key = String(clientId || normalize(equipmentClientName(item)));
      if (!key || seen.has(key)) return [];
      seen.add(key);
      return [{ client, item }];
    }).filter(({ client, item }) => {
      const term = normalize(drawerSearch);
      const name = client?.nomeCompleto || client?.nome || equipmentClientName(item);
      return !term || normalize(`${name} ${equipmentNds(item)} ${equipmentCard(item)} ${equipmentNeighborhood(item, client)}`).includes(term);
    });
  }, [clientById, drawerSearch, selected, selectedEquipment]);

  const openDrawer = (signature: Assinatura) => {
    setSelected(signature);
    setDrawerTab('resumo');
    setDrawerSearch('');
    setEquipmentFilter('todos');
  };

  return (
    <div className="assinaturas-page">
      <header className="assinaturas-header">
        <div>
          <span className="assinaturas-eyebrow">GESTÃO OPERACIONAL</span>
          <h1>Assinaturas</h1>
          <p>Visão geral das assinaturas, clientes e equipamentos vinculados.</p>
        </div>
        <div className="assinaturas-header__actions">
          <div className="assinaturas-header__count"><strong>{globalStats.activeSignatures}</strong><span>assinaturas ativas</span></div>
          {assinaturaPermissions['assinaturas.create'] && <button type="button" className="assinaturas-new-button" onClick={() => setShowNova(true)}>+ Nova assinatura</button>}
        </div>
      </header>

      {error && <div className="assinaturas-alert" role="alert">{error}</div>}
      <section className="assinaturas-stats" aria-label="Indicadores das assinaturas">
        <StatCard icon="▣" label="ASSINATURAS" value={globalStats.signatures} detail={`${globalStats.activeSignatures} ativas`} tone="primary" />
        <StatCard icon="♙" label="CLIENTES VINCULADOS" value={globalStats.clients} detail="clientes únicos" tone="success" />
        <StatCard icon="▤" label="EQUIPAMENTOS" value={globalStats.equipment} detail="total vinculado" tone="neutral" />
        <StatCard icon="●" label="EM OPERAÇÃO" value={globalStats.active} detail="equipamentos ativos" tone="success" />
        <StatCard icon="!" label="COM DEFEITO" value={globalStats.defect} detail="atenção necessária" tone="danger" />
        <StatCard icon="○" label="DISPONÍVEIS" value={globalStats.available} detail="não vinculados" tone="muted" />
      </section>

      <section className="assinaturas-card">
        <div className="assinaturas-card__header">
          <div><h2>Assinaturas</h2><span>{filteredSignatures.length} resultado(s)</span></div>
          <div className="assinaturas-toolbar">
            <label className="assinaturas-search"><span aria-hidden="true">⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar assinatura..." aria-label="Buscar assinatura" /></label>
            <div className="assinaturas-filters" role="group" aria-label="Filtros de assinaturas">
              {([['todas', 'Todas'], ['em_dia', 'Em dia'], ['atencao', 'Com atenção'], ['defeito', 'Com defeito']] as const).map(([key, label]) => (
                <button type="button" key={key} className={filter === key ? 'is-active' : ''} onClick={() => setFilter(key)}>{label}</button>
              ))}
            </div>
          </div>
        </div>

        {loading ? <div className="assinaturas-empty">Carregando assinaturas...</div> : filteredSignatures.length === 0 ? <div className="assinaturas-empty">Nenhuma assinatura corresponde à busca.</div> : (
          <div className="assinaturas-table-wrap">
            <table className="assinaturas-table">
              <thead><tr><th>Assinatura</th><th>Código</th><th>Clientes</th><th>Equipamentos</th><th>Situação dos equipamentos</th><th>Status</th><th>Ações</th></tr></thead>
              <tbody>
                {filteredSignatures.map((signature) => {
                  const stats = statsBySignature.get(signature.id) || { total: 0, clients: new Set<string>(), active: 0, defect: 0, available: 0 };
                  const badge = statusLabel(signature.status);
                  return <tr key={signature.id}>
                    <td><div className="assinaturas-name">{signature.nomeCompleto || 'Sem nome'}</div><div className="assinaturas-secondary">{signature.cpf || 'CPF não informado'}</div></td>
                    <td><code>#{signature.codigo || signature.id}</code></td>
                    <td><strong>{stats.clients.size}</strong><span className="assinaturas-secondary"> vinculados</span></td>
                    <td><strong>{stats.total}</strong><span className="assinaturas-secondary"> equipamentos</span></td>
                    <td><div className="assinaturas-equipment-summary"><span className="tone-success">● {stats.active} ativos</span><span className="tone-danger">● {stats.defect} defeitos</span><span className="tone-muted">● {stats.available} disponíveis</span></div></td>
                    <td><span className={`assinaturas-badge assinaturas-badge--${badge.tone}`}><i />{badge.label}</span></td>
                    <td><div className="assinaturas-actions">{assinaturaPermissions['assinaturas.edit'] && <button type="button" className="assinaturas-edit-button" onClick={() => setEditing(signature)}>Editar</button>}{assinaturaPermissions['assinaturas.delete'] && <button type="button" className="assinaturas-delete-button" onClick={() => setDeleting(signature)}>Excluir</button>}<button type="button" className="assinaturas-details-button" onClick={() => openDrawer(signature)}>Ver detalhes <span aria-hidden="true">→</span></button></div></td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selected && <div className="assinaturas-drawer-backdrop" onClick={() => setSelected(null)} aria-hidden="true" />}
      {selected && <aside className="assinaturas-drawer" aria-label="Detalhes da assinatura">
        <div className="assinaturas-drawer__header"><div><span className="assinaturas-eyebrow">DETALHES DA ASSINATURA</span><h2>{selected.nomeCompleto || 'Sem nome'}</h2><code>#{selected.codigo || selected.id}</code></div><button type="button" onClick={() => setSelected(null)} aria-label="Fechar detalhes">×</button></div>
        <div className="assinaturas-drawer__status"><span className={`assinaturas-badge assinaturas-badge--${statusLabel(selected.status).tone}`}><i />{statusLabel(selected.status).label}</span><span className="assinaturas-secondary">{selected.cpf || 'CPF não informado'}</span></div>
        <div className="assinaturas-drawer__metrics"><span><strong>{selectedStats?.total || 0}</strong>Equipamentos</span><span><strong>{selectedStats?.clients.size || 0}</strong>Clientes</span><span><strong>{selectedStats?.active || 0}</strong>Ativos</span><span><strong>{selectedStats?.defect || 0}</strong>Defeitos</span><span><strong>{selectedStats?.available || 0}</strong>Disponíveis</span></div>
        <nav className="assinaturas-drawer__tabs" aria-label="Detalhes"><button type="button" className={drawerTab === 'resumo' ? 'is-active' : ''} onClick={() => setDrawerTab('resumo')}>Resumo</button><button type="button" className={drawerTab === 'equipamentos' ? 'is-active' : ''} onClick={() => setDrawerTab('equipamentos')}>Equipamentos</button><button type="button" className={drawerTab === 'clientes' ? 'is-active' : ''} onClick={() => setDrawerTab('clientes')}>Clientes</button></nav>
        {drawerTab === 'resumo' && <div className="assinaturas-drawer__content"><div className="assinaturas-progress"><span style={{ width: `${selectedStats?.total ? ((selectedStats.active / selectedStats.total) * 100) : 0}%` }} /></div><div className="assinaturas-summary-list"><div><span className="tone-success">●</span> Em operação<strong>{selectedStats?.active || 0}</strong></div><div><span className="tone-danger">●</span> Com defeito<strong>{selectedStats?.defect || 0}</strong></div><div><span className="tone-muted">●</span> Disponíveis<strong>{selectedStats?.available || 0}</strong></div></div><p className="assinaturas-drawer-note">Os dados desta assinatura são derivados dos equipamentos e clientes vinculados no tenant.</p></div>}
        {drawerTab !== 'resumo' && <div className="assinaturas-drawer__content"><label className="assinaturas-search assinaturas-search--drawer"><span aria-hidden="true">⌕</span><input value={drawerSearch} onChange={(event) => setDrawerSearch(event.target.value)} placeholder={drawerTab === 'clientes' ? 'Buscar cliente...' : 'Buscar por NDS, cartão ou cliente...'} aria-label={drawerTab === 'clientes' ? 'Buscar cliente' : 'Buscar equipamento'} /></label>{drawerTab === 'equipamentos' && <div className="assinaturas-filters assinaturas-filters--drawer">{([['todos', 'Todos'], ['ativo', 'Ativos'], ['defeito', 'Com defeito'], ['disponivel', 'Disponíveis']] as const).map(([key, label]) => <button type="button" key={key} className={equipmentFilter === key ? 'is-active' : ''} onClick={() => setEquipmentFilter(key)}>{label}</button>)}</div>}<div className="assinaturas-drawer-list">{drawerTab === 'equipamentos' ? filteredDrawerEquipment.map((item) => { const client = clientById.get(String(equipmentClientId(item) || '')); const state = equipmentStatus(item); return <div className="assinaturas-drawer-row" key={item.id}><div><strong>NDS {equipmentNds(item)}</strong><span>Cartão {equipmentCard(item)}</span><span>Cliente {client?.nomeCompleto || client?.nome || equipmentClientName(item) || 'Não vinculado'}</span></div><span className={`assinaturas-row-status tone-${state === 'defeito' ? 'danger' : state === 'disponivel' ? 'muted' : 'success'}`}>● {statusText(state)}</span></div>; }) : selectedClients.map(({ item, client }) => <div className="assinaturas-drawer-row" key={String(equipmentClientId(item) || item.id)}><div><strong>{client?.nomeCompleto || client?.nome || equipmentClientName(item) || 'Cliente não identificado'}</strong><span>Equipamento/NDS {equipmentNds(item)}</span><span>Cartão {equipmentCard(item)} • {equipmentNeighborhood(item, client)}</span></div><span className="assinaturas-row-status tone-success">● Associado</span></div>)}{((drawerTab === 'equipamentos' && filteredDrawerEquipment.length === 0) || (drawerTab === 'clientes' && selectedClients.length === 0)) && <div className="assinaturas-empty">Nenhum registro encontrado.</div>}</div></div>}
      </aside>}
      <EditarAssinaturaModal isOpen={Boolean(editing)} onClose={() => setEditing(null)} onSave={() => setEditing(null)} assinatura={editing as any} />
      <NovaAssinaturaModal isOpen={showNova} onClose={() => setShowNova(false)} onSave={() => setShowNova(false)} />
      <ConfirmModal
        open={Boolean(deleting)}
        title="Excluir assinatura"
        message={`Tem certeza que deseja excluir a assinatura ${deleting?.nomeCompleto || deleting?.codigo || ''}? Esta ação não pode ser desfeita.`}
        confirmText={excluindo ? 'Excluindo...' : 'Excluir'}
        cancelText="Cancelar"
        type="error"
        loading={excluindo}
        onCancel={() => { if (!excluindo) setDeleting(null); }}
        onConfirm={async () => {
          if (!deleting) return;
          setExcluindo(true);
          try {
            await removerAssinatura(deleting.id);
            if (selected?.id === deleting.id) setSelected(null);
            setDeleting(null);
          } catch (reason: any) {
            setError(reason?.message || 'Não foi possível excluir a assinatura.');
          } finally {
            setExcluindo(false);
          }
        }}
      />
    </div>
  );
}
