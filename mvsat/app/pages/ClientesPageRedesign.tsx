import React from 'react';
import { collection, deleteDoc, getDocs, query, updateDoc, where, writeBatch } from 'firebase/firestore';
import { getDb } from '../../config/database.config';
import { tenantCollection, tenantDoc } from '../../shared/saas/firestoreTenant';
import { formatPhoneNumber } from '../../shared/utils/phoneFormatter';
import { formatNomePadrao } from '../../shared/utils/nameFormatter';
import EditarClienteModal from '../../clientes/EditarClienteModal';
import NovoClienteModal from '../../clientes/NovoClienteModal';
import { ConfirmacaoDesativacaoModal, SucessoDesativacaoModal } from '../../shared/components/ui';
import { useModulePermissions } from '../../shared/hooks/useModulePermissions';
import './ClientesPageRedesign.css';

interface Cliente {
  id: string;
  nome: string;
  nomeCompleto?: string;
  bairro?: string;
  telefones?: string;
  telefone?: string;
  telefoneSecundario?: string;
  email?: string;
  dataNascimento?: string;
  cpf?: string;
  rg?: string;
  endereco?: {
    rua?: string;
    numero?: string;
    bairro?: string;
    cidade?: string;
    estado?: string;
    cep?: string;
    pontoReferencia?: string;
  };
  observacoes?: string;
  status?: string;
}

type StatusTab = 'todos' | 'ativos' | 'inativos';

const pick = (obj: any, keys: string[], fallback = '') => {
  for (const key of keys) {
    if (obj?.[key] !== undefined && obj[key] !== null && obj[key] !== '') return obj[key];
  }
  return fallback;
};

const normalize = (value: unknown) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const digitsOnly = (value: unknown) => String(value || '').replace(/\D/g, '');

const normalizeCliente = (obj: any, id: string): Cliente => {
  const nome = formatNomePadrao(String(pick(obj, ['nome', 'name', 'fullName', 'nome_completo'], '')));
  const bairro = String(pick(obj, ['bairro', 'district', 'neighborhood'], obj?.endereco?.bairro || ''));
  const telefone = String(pick(obj, ['telefone', 'telefone1', 'telefones', 'phone', 'celular'], ''));
  return {
    id,
    nome,
    nomeCompleto: nome,
    bairro,
    telefone,
    telefones: telefone,
    telefoneSecundario: String(pick(obj, ['telefone2', 'telefone_secundario'], '')),
    email: String(pick(obj, ['email', 'e_mail'], '')),
    dataNascimento: String(pick(obj, ['data_nascimento', 'nascimento', 'birth_date'], '')),
    cpf: String(pick(obj, ['cpf', 'documento'], '')),
    rg: String(pick(obj, ['rg', 'identidade'], '')),
    endereco: {
      rua: String(pick(obj, ['rua', 'logradouro', 'endereco_rua'], obj?.endereco?.rua || '')),
      numero: String(pick(obj, ['numero', 'endereco_numero'], obj?.endereco?.numero || '')),
      bairro,
      cidade: String(pick(obj, ['cidade', 'municipio'], obj?.endereco?.cidade || '')),
      estado: String(pick(obj, ['estado', 'uf'], obj?.endereco?.estado || '')),
      cep: String(pick(obj, ['cep', 'codigo_postal'], obj?.endereco?.cep || '')),
      pontoReferencia: String(pick(obj, ['ponto_referencia', 'referencia'], obj?.endereco?.pontoReferencia || '')),
    },
    observacoes: String(pick(obj, ['observacoes', 'obs', 'notas'], '')),
    status: String(pick(obj, ['status', 'situacao', 'state'], 'ativo')).toLowerCase(),
  };
};

const statusMeta = (status: string) => {
  const value = normalize(status);
  if (value === 'ativo') return { label: 'Ativo', className: 'is-success' };
  if (value === 'suspenso') return { label: 'Suspenso', className: 'is-warning' };
  if (value === 'cancelado') return { label: 'Cancelado', className: 'is-danger' };
  if (value === 'desativado') return { label: 'Desativado', className: 'is-danger' };
  return { label: status || 'Sem status', className: 'is-muted' };
};

export default function ClientesPageRedesign() {
  const clientePermissions = useModulePermissions('clientes', ['create', 'edit', 'delete', 'viewFinancial'] as const);
  const [items, setItems] = React.useState<Cliente[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusTab, setStatusTab] = React.useState<StatusTab>('ativos');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('asc');
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(15);
  const [selected, setSelected] = React.useState<Cliente | null>(null);
  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState<Cliente | null>(null);
  const [showEdit, setShowEdit] = React.useState(false);
  const [showNew, setShowNew] = React.useState(false);
  const [toast, setToast] = React.useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [showSuccess, setShowSuccess] = React.useState(false);
  const [pendingStatus, setPendingStatus] = React.useState<Cliente | null>(null);
  const [processingStatus, setProcessingStatus] = React.useState(false);
  const [releasedEquipment, setReleasedEquipment] = React.useState(0);
  const [releasedTvBox, setReleasedTvBox] = React.useState(0);

  const loadClientes = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const snap = await getDocs(tenantCollection(getDb(), 'clientes'));
      setItems(snap.docs.map((doc) => normalizeCliente(doc.data(), doc.id)));
    } catch (e: any) {
      setError(e?.message || 'Falha ao carregar clientes.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { loadClientes(); }, [loadClientes]);
  React.useEffect(() => { setPage(1); }, [searchTerm, statusTab, sortOrder, pageSize]);
  React.useEffect(() => {
    if (!selected) return;
    const current = items.find((item) => item.id === selected.id);
    if (current) setSelected(current);
  }, [items, selected?.id]);

  const stats = React.useMemo(() => ({
    total: items.length,
    ativos: items.filter((item) => normalize(item.status) === 'ativo').length,
    inativos: items.filter((item) => normalize(item.status) !== 'ativo').length,
    restritos: items.filter((item) => ['suspenso', 'cancelado'].includes(normalize(item.status))).length,
  }), [items]);

  const filteredItems = React.useMemo(() => {
    const term = normalize(searchTerm);
    const termDigits = digitsOnly(searchTerm);
    return items
      .filter((item) => {
        const status = normalize(item.status);
        if (statusTab === 'ativos' && status !== 'ativo') return false;
        if (statusTab === 'inativos' && status === 'ativo') return false;
        if (!term) return true;
        const searchable = normalize(`${item.nome} ${item.bairro} ${item.email} ${item.telefone} ${item.telefoneSecundario}`);
        const searchableDigits = digitsOnly(`${item.cpf} ${item.telefone} ${item.telefoneSecundario}`);
        return searchable.includes(term) || Boolean(termDigits && searchableDigits.includes(termDigits));
      })
      .sort((a, b) => {
        const result = normalize(a.nome).localeCompare(normalize(b.nome), 'pt-BR');
        return sortOrder === 'asc' ? result : -result;
      });
  }, [items, searchTerm, statusTab, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filteredItems.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const start = filteredItems.length ? (currentPage - 1) * pageSize + 1 : 0;
  const end = Math.min(currentPage * pageSize, filteredItems.length);

  const clearFilters = () => {
    setSearchTerm('');
    setStatusTab('todos');
    setPage(1);
  };

  const handleEditSaved = async () => {
    await loadClientes();
    setShowEdit(false);
    setEditing(null);
    setToast({ type: 'success', message: 'Cliente atualizado com sucesso.' });
  };

  const handleDelete = async (cliente: Cliente) => {
    if (!window.confirm(`Tem certeza que deseja excluir o cliente ${cliente.nome}?`)) return;
    try {
      await deleteDoc(tenantDoc(getDb(), 'clientes', cliente.id));
      await loadClientes();
      setToast({ type: 'success', message: 'Cliente excluído com sucesso.' });
    } catch (e: any) {
      setToast({ type: 'error', message: `Erro ao excluir cliente: ${e.message}` });
    }
  };

  const handleToggleStatus = (cliente: Cliente) => {
    if (normalize(cliente.status) === 'ativo') {
      setPendingStatus(cliente);
      setShowConfirm(true);
      return;
    }
    if (!window.confirm(`Tem certeza que deseja ativar o cliente ${cliente.nome}?`)) return;
    updateDoc(tenantDoc(getDb(), 'clientes', cliente.id), { status: 'ativo', dataUltimaAtualizacao: new Date() })
      .then(loadClientes)
      .then(() => setToast({ type: 'success', message: 'Cliente ativado com sucesso.' }))
      .catch((e) => setToast({ type: 'error', message: `Erro ao ativar cliente: ${e.message}` }));
  };

  const confirmDeactivation = async () => {
    if (!pendingStatus) return;
    setProcessingStatus(true);
    try {
      const db = getDb();
      await updateDoc(tenantDoc(db, 'clientes', pendingStatus.id), { status: 'desativado', dataUltimaAtualizacao: new Date() });
      const equipmentSnap = await getDocs(query(tenantCollection(db, 'equipamentos'), where('cliente_id', '==', pendingStatus.id)));
      if (!equipmentSnap.empty) {
        const batch = writeBatch(db);
        equipmentSnap.docs.forEach((doc) => batch.update(doc.ref, {
          cliente_id: null, cliente_nome: null, status: 'disponivel',
          dataUltimaAtualizacao: new Date(), cliente_anterior: pendingStatus.nome,
          data_desativacao_cliente: new Date(),
        }));
        await batch.commit();
      }
      const tvBoxSnap = await getDocs(query(tenantCollection(db, 'tvbox'), where('cliente_id', '==', pendingStatus.id)));
      if (!tvBoxSnap.empty) {
        const batch = writeBatch(db);
        tvBoxSnap.docs.forEach((doc) => batch.update(doc.ref, {
          cliente_id: null, cliente_nome: null, status: 'disponivel',
          dataUltimaAtualizacao: new Date(), cliente_anterior: pendingStatus.nome,
          data_desativacao_cliente: new Date(),
        }));
        await batch.commit();
      }
      setReleasedEquipment(equipmentSnap.size);
      setReleasedTvBox(tvBoxSnap.size);
      await loadClientes();
      setShowConfirm(false);
      setShowSuccess(true);
    } catch (e: any) {
      setToast({ type: 'error', message: `Erro ao desativar cliente: ${e.message}` });
    } finally {
      setProcessingStatus(false);
    }
  };

  const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'CL';

  if (loading) {
    return <div className="clientes-page clientes-state"><div className="clientes-spinner" /><span>Carregando clientes...</span></div>;
  }

  if (error) {
    return <div className="clientes-page clientes-state"><strong>Erro ao carregar clientes.</strong><span>{error}</span><button className="clientes-btn clientes-btn--primary" onClick={loadClientes}>Tentar novamente</button></div>;
  }

  return (
    <div className="clientes-page" onClick={() => openMenuId && setOpenMenuId(null)}>
      {toast && <div className={`clientes-toast clientes-toast--${toast.type}`} role="status">{toast.message}<button onClick={() => setToast(null)} aria-label="Fechar">×</button></div>}
      <header className="clientes-header">
        <div>
          <span className="clientes-eyebrow">GESTÃO DE CLIENTES</span>
          <h1>Clientes</h1>
          <p>Gerencie e consulte os clientes cadastrados no sistema.</p>
        </div>
        <div className="clientes-header__actions clientes-header__actions--below">
          {clientePermissions.create && <button className="clientes-btn clientes-btn--primary" onClick={() => setShowNew(true)}>+ Novo cliente</button>}
        </div>
      </header>

      <section className="clientes-kpis" aria-label="Indicadores de clientes">
        <div className="clientes-kpi clientes-kpi--blue"><span>Total de clientes</span><strong>{stats.total}</strong><small>cadastros encontrados</small></div>
        <div className="clientes-kpi clientes-kpi--green"><span>Clientes ativos</span><strong>{stats.ativos}</strong><small>status ativo</small></div>
        <div className="clientes-kpi clientes-kpi--orange"><span>Inativos</span><strong>{stats.inativos}</strong><small>fora da operação</small></div>
        <div className="clientes-kpi clientes-kpi--red"><span>Com restrição</span><strong>{stats.restritos}</strong><small>suspensos ou cancelados</small></div>
      </section>

      <section className="clientes-card">
        <div className="clientes-card__header">
          <div><h2>Lista de Clientes</h2><span>Consulte e gerencie os clientes cadastrados.</span></div>
          <div className="clientes-toolbar">
            <label className="clientes-search"><span aria-hidden="true">⌕</span><input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar por nome, CPF, telefone ou e-mail..." aria-label="Buscar cliente" /></label>
            <button className="clientes-btn clientes-btn--secondary" onClick={() => setSortOrder((value) => value === 'asc' ? 'desc' : 'asc')}>↕ {sortOrder === 'asc' ? 'Nome A–Z' : 'Nome Z–A'}</button>
          </div>
        </div>
        <div className="clientes-tabs" role="tablist">
          <button className={statusTab === 'ativos' ? 'is-active' : ''} onClick={() => setStatusTab('ativos')}>Ativos <b>{stats.ativos}</b></button>
          <button className={statusTab === 'inativos' ? 'is-active' : ''} onClick={() => setStatusTab('inativos')}>Inativos <b>{stats.inativos}</b></button>
          <button className={statusTab === 'todos' ? 'is-active' : ''} onClick={() => setStatusTab('todos')}>Todos <b>{stats.total}</b></button>
        </div>

        {searchTerm && <div className="clientes-chips"><span>Busca: {searchTerm}<button onClick={() => setSearchTerm('')}>×</button></span><button onClick={clearFilters}>Limpar filtros</button></div>}

        {pageItems.length === 0 ? (
          <div className="clientes-empty"><div className="clientes-empty__icon">⌕</div><strong>Nenhum cliente encontrado</strong><span>Tente alterar sua busca ou os filtros selecionados.</span><button className="clientes-btn clientes-btn--secondary" onClick={clearFilters}>Limpar filtros</button></div>
        ) : (
          <>
            <div className="clientes-table-wrap">
              <table className="clientes-table">
                <thead><tr><th>CLIENTE</th>{clientePermissions.viewFinancial && <th>CPF / CNPJ</th>}<th>CONTATO</th><th>STATUS</th><th aria-label="Ações" /></tr></thead>
                <tbody>
                  {pageItems.map((cliente) => {
                    const meta = statusMeta(cliente.status || '');
                    return <tr key={cliente.id}>
                      <td><button className="clientes-name" onClick={() => setSelected(cliente)}><strong>{cliente.nome || '—'}</strong><small>{cliente.bairro || 'Bairro não informado'}</small></button></td>
                      {clientePermissions.viewFinancial && <td className="clientes-muted">{cliente.cpf || '—'}</td>}
                      <td><div className="clientes-contact"><span>{formatPhoneNumber(cliente.telefone || '') || '—'}</span><small>{cliente.email || '—'}</small></div></td>
                      <td><span className={`clientes-status ${meta.className}`}><i />{meta.label}</span></td>
      <td><div className="clientes-actions"><button className="clientes-icon-btn" onClick={() => setSelected(cliente)} title="Ver detalhes" aria-label={`Ver detalhes de ${cliente.nome}`}>◉</button><div className="clientes-menu-wrap"><button className="clientes-icon-btn" onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === cliente.id ? null : cliente.id); }} aria-label="Mais ações">•••</button>{openMenuId === cliente.id && <div className="clientes-menu">{clientePermissions.edit && <button onClick={() => { setEditing(cliente); setShowEdit(true); }}>Editar</button>}{clientePermissions.edit && <button onClick={() => handleToggleStatus(cliente)}>{normalize(cliente.status) === 'ativo' ? 'Desativar' : 'Ativar'}</button>}{clientePermissions.delete && <button className="is-danger" onClick={() => handleDelete(cliente)}>Excluir</button>}</div>}</div></div></td>
                    </tr>;
                  })}
                </tbody>
              </table>
            </div>
            <footer className="clientes-pagination"><span>Mostrando {start}–{end} de {filteredItems.length} clientes</span><div><button disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>‹</button><b>Página {currentPage} de {totalPages}</b><button disabled={currentPage === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>›</button><select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}><option value={15}>15 por página</option><option value={25}>25 por página</option><option value={50}>50 por página</option></select></div></footer>
          </>
        )}
      </section>

      {selected && <aside className="clientes-drawer" role="dialog" aria-modal="true"><header><div className="clientes-avatar">{initials(selected.nome)}</div><div><span>Detalhes do Cliente</span><h2>{selected.nome}</h2><small>{clientePermissions.viewFinancial ? (selected.cpf || 'Documento não informado') : (selected.bairro || 'Cliente')}</small></div><button onClick={() => setSelected(null)} aria-label="Fechar">×</button></header><div className="clientes-drawer__body"><span className={`clientes-status ${statusMeta(selected.status || '').className}`}><i />{statusMeta(selected.status || '').label}</span><section><h3>Informações pessoais</h3><dl><div><dt>Nome completo</dt><dd>{selected.nome || '—'}</dd></div>{clientePermissions.viewFinancial && <div><dt>CPF / CNPJ</dt><dd>{selected.cpf || '—'}</dd></div>}{clientePermissions.viewFinancial && <div><dt>RG</dt><dd>{selected.rg || '—'}</dd></div>}</dl></section><section><h3>Contato</h3><dl><div><dt>Telefone principal</dt><dd>{formatPhoneNumber(selected.telefone || '') || '—'}</dd></div><div><dt>E-mail</dt><dd>{selected.email || '—'}</dd></div></dl></section><section><h3>Localização</h3><dl><div><dt>Endereço</dt><dd>{[selected.endereco?.rua, selected.endereco?.numero].filter(Boolean).join(', ') || '—'}</dd></div><div><dt>Bairro</dt><dd>{selected.bairro || '—'}</dd></div><div><dt>Cidade / Estado</dt><dd>{[selected.endereco?.cidade, selected.endereco?.estado].filter(Boolean).join(' / ') || '—'}</dd></div></dl></section><section><h3>Observações</h3><p>{selected.observacoes || 'Nenhuma observação registrada.'}</p></section></div><footer>{clientePermissions.edit && <button className="clientes-btn clientes-btn--secondary" onClick={() => { setEditing(selected); setShowEdit(true); setSelected(null); }}>Editar cliente</button>}</footer></aside>}

      <EditarClienteModal isOpen={showEdit} onClose={() => { setShowEdit(false); setEditing(null); }} onSave={handleEditSaved} cliente={editing} />
      <NovoClienteModal isOpen={showNew} onClose={() => setShowNew(false)} onSave={async () => { await loadClientes(); setShowNew(false); setToast({ type: 'success', message: 'Cliente criado com sucesso.' }); }} />
      <ConfirmacaoDesativacaoModal open={showConfirm} onClose={() => setShowConfirm(false)} onConfirm={confirmDeactivation} clienteNome={pendingStatus?.nome || ''} loading={processingStatus} />
      <SucessoDesativacaoModal open={showSuccess} onClose={() => { setShowSuccess(false); setPendingStatus(null); }} clienteNome={pendingStatus?.nome || ''} equipamentosLiberados={releasedEquipment} tvBoxesLiberadas={releasedTvBox} />
    </div>
  );
}
