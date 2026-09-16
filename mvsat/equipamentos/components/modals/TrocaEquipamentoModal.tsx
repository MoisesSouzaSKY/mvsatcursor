import React from 'react';
import './EquipmentModals.css';

export type MotivoTrocaEquipamento =
  | 'Defeito'
  | 'Garantia'
  | 'Atualização de equipamento'
  | 'Troca solicitada pelo cliente'
  | 'Outro';

export type StatusEquipamento = 'disponivel' | 'em_uso' | 'reserva' | 'defeito' | 'descartado' | string;

export interface EquipamentoLite {
  id: string;
  nds: string;
  smartcard: string;
  status: StatusEquipamento;
  cliente?: string;
  clienteId?: string | null;
  assinatura?: { codigo: string; nomeAssinatura?: string } | null;
  assinaturaId?: string | null;
  codigo?: string;
  nomeCompleto?: string;
}

export interface TrocaEquipamentoPayload {
  equipamentoAntigoId: string;
  equipamentoNovoId: string;
  novoEquipamentoCadastro?: {
    nds: string;
    smartcard: string;
  };
  motivo: MotivoTrocaEquipamento;
  motivoOutroTexto?: string;
  statusEquipamentoAntigoAposTroca: StatusEquipamento;
}

interface TrocaEquipamentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  equipamentoAtual: EquipamentoLite | null;
  equipamentosDisponiveis: EquipamentoLite[];
  onConfirm: (payload: TrocaEquipamentoPayload) => Promise<void>;
}

const formatSmartCard = (value: string): string => {
  if (!value) return '';
  const digits = String(value).replace(/\D/g, '');
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
};

export default function TrocaEquipamentoModal({
  isOpen,
  onClose,
  equipamentoAtual,
  equipamentosDisponiveis,
  onConfirm,
}: TrocaEquipamentoModalProps) {
  const [modoNovoEquipamento, setModoNovoEquipamento] = React.useState<'existente' | 'novo'>('existente');
  const [novoEquipamentoId, setNovoEquipamentoId] = React.useState('');
  const [buscaNovoEquipamento, setBuscaNovoEquipamento] = React.useState('');
  const [novoCadastroNds, setNovoCadastroNds] = React.useState('');
  const [novoCadastroSmartcard, setNovoCadastroSmartcard] = React.useState('');
  const [motivo, setMotivo] = React.useState<MotivoTrocaEquipamento>('Defeito');
  const [motivoOutroTexto, setMotivoOutroTexto] = React.useState('');
  const [statusAntigo, setStatusAntigo] = React.useState<StatusEquipamento>('defeito');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [equipmentDropdownOpen, setEquipmentDropdownOpen] = React.useState(false);
  const equipmentPickerRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    setModoNovoEquipamento('existente');
    setNovoEquipamentoId('');
    setBuscaNovoEquipamento('');
    setNovoCadastroNds('');
    setNovoCadastroSmartcard('');
    setMotivo('Defeito');
    setMotivoOutroTexto('');
    setStatusAntigo('defeito');
    setSaving(false);
    setError(null);
    setEquipmentDropdownOpen(false);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  React.useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!equipmentPickerRef.current?.contains(event.target as Node)) {
        setEquipmentDropdownOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (equipmentDropdownOpen) {
          setEquipmentDropdownOpen(false);
          return;
        }
        if (!saving) onClose();
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, equipmentDropdownOpen, saving, onClose]);

  const equipamentosFiltrados = React.useMemo(() => {
    const term = buscaNovoEquipamento.trim().toLowerCase();
    const digits = buscaNovoEquipamento.replace(/\D/g, '');
    const list = equipamentosDisponiveis.slice().sort((a, b) => (a.nds || '').localeCompare(b.nds || '', 'pt-BR'));
    if (!term) return list;
    return list.filter((e) => {
      const nds = String(e.nds || '').toLowerCase();
      const sc = String(e.smartcard || '').toLowerCase();
      const scDigits = String(e.smartcard || '').replace(/\D/g, '');
      return nds.includes(term) || sc.includes(term) || (digits && scDigits.includes(digits));
    });
  }, [buscaNovoEquipamento, equipamentosDisponiveis]);

  const selecionarEquipamento = (id: string) => {
    setNovoEquipamentoId(id);
    setBuscaNovoEquipamento('');
    setEquipmentDropdownOpen(false);
    setError(null);
  };

  const normalizeNds = (v: string) => String(v || '').trim();
  const normalizeSmartcard = (v: string) => String(v || '').replace(/\D/g, '').trim();

  const canConfirmExistente =
    !!novoEquipamentoId &&
    !!motivo &&
    (motivo !== 'Outro' || motivoOutroTexto.trim().length > 0) &&
    !!statusAntigo;

  const canConfirmNovo =
    normalizeNds(novoCadastroNds).length >= 6 &&
    normalizeSmartcard(novoCadastroSmartcard).length >= 8 &&
    !!motivo &&
    (motivo !== 'Outro' || motivoOutroTexto.trim().length > 0) &&
    !!statusAntigo;

  const canConfirm =
    modoNovoEquipamento === 'existente' ? canConfirmExistente : canConfirmNovo;

  if (!isOpen || !equipamentoAtual) return null;

  const equipamentoNovo = equipamentosDisponiveis.find((e) => e.id === novoEquipamentoId) || null;
  const clienteNome = equipamentoAtual.cliente || equipamentoAtual.nomeCompleto || '—';
  const assinaturaCodigo = equipamentoAtual.assinatura?.codigo || equipamentoAtual.codigo || '—';
  const assinaturaNome = equipamentoAtual.assinatura?.nomeAssinatura || '';

  const handleConfirm = async () => {
    setError(null);
    if (!canConfirm) {
      setError(modoNovoEquipamento === 'existente' && !novoEquipamentoId
        ? 'Selecione um equipamento disponível.'
        : 'Preencha os campos obrigatórios.');
      return;
    }

    const ok = window.confirm('Confirmar troca de equipamento? Esta ação atualiza vínculos e status automaticamente.');
    if (!ok) return;

    setSaving(true);
    try {
      await onConfirm({
        equipamentoAntigoId: equipamentoAtual.id,
        equipamentoNovoId: modoNovoEquipamento === 'existente' ? novoEquipamentoId : '__NOVO__',
        ...(modoNovoEquipamento === 'novo'
          ? {
              novoEquipamentoCadastro: {
                nds: normalizeNds(novoCadastroNds),
                smartcard: normalizeSmartcard(novoCadastroSmartcard),
              },
            }
          : {}),
        motivo,
        motivoOutroTexto: motivo === 'Outro' ? motivoOutroTexto.trim() : undefined,
        statusEquipamentoAntigoAposTroca: statusAntigo,
      });
      onClose();
    } catch (e: any) {
      setError(String(e?.message || 'Falha ao trocar equipamento.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="eq-modal-overlay" role="presentation">
      <div className="eq-modal eq-modal--swap" role="dialog" aria-modal="true" aria-labelledby="troca-equipamento-title">
        <header className="eq-modal__header">
          <div className="eq-modal__header-main">
            <div className="eq-modal__icon" aria-hidden="true">⇄</div>
            <div>
              <h2 id="troca-equipamento-title" className="eq-modal__title">Troca de Equipamento</h2>
              <p className="eq-modal__subtitle">Substitua o equipamento mantendo o vínculo do cliente e da assinatura.</p>
            </div>
          </div>
          <button type="button" className="eq-modal__close" onClick={onClose} disabled={saving} aria-label="Fechar">✕</button>
        </header>

        <div className="eq-modal__body">
          {error && <div className="eq-alert eq-alert--error">{error}</div>}

          <div className="eq-grid-2">
            <section className="eq-card">
              <div className="eq-card__head">
                <h3 className="eq-card__title">Equipamento atual</h3>
                <span className="eq-badge eq-badge--use">Em uso</span>
              </div>
              <div className="eq-kv">
                <div>
                  <span>NDS</span>
                  <strong>{equipamentoAtual.nds || '—'}</strong>
                </div>
                <div>
                  <span>Smart Card</span>
                  <strong>{formatSmartCard(equipamentoAtual.smartcard) || '—'}</strong>
                </div>
                <div className="eq-kv__full">
                  <span>Cliente</span>
                  <strong>{clienteNome}</strong>
                </div>
                <div className="eq-kv__full">
                  <span>Assinatura</span>
                  <strong>{assinaturaCodigo}</strong>
                  {assinaturaNome ? <em>{assinaturaNome}</em> : null}
                </div>
              </div>
            </section>

            <section className="eq-card">
              <div className="eq-card__head">
                <h3 className="eq-card__title">Novo equipamento</h3>
              </div>
              <div className="eq-segment" role="tablist" aria-label="Modo do novo equipamento">
                <button type="button" className={modoNovoEquipamento === 'existente' ? 'is-active' : ''} onClick={() => setModoNovoEquipamento('existente')} disabled={saving}>Selecionar existente</button>
                <button type="button" className={modoNovoEquipamento === 'novo' ? 'is-active' : ''} onClick={() => setModoNovoEquipamento('novo')} disabled={saving}>Cadastrar novo</button>
              </div>
              <div className="eq-alert eq-alert--info">
                <span aria-hidden="true">ⓘ</span>
                <span>Apenas equipamentos com status Disponível podem ser utilizados nesta troca.</span>
              </div>

              {modoNovoEquipamento === 'existente' && (
                <>
                  <div className="eq-field">
                    <label className="eq-label" htmlFor="equipamento-disponivel-search">Buscar equipamento disponível <span>*</span></label>
                    <div className="eq-combobox" ref={equipmentPickerRef}>
                      <div className="eq-combobox__control">
                        <span aria-hidden="true">⌕</span>
                        <input
                          id="equipamento-disponivel-search"
                          value={buscaNovoEquipamento}
                          onChange={(e) => {
                            setBuscaNovoEquipamento(e.target.value);
                            setEquipmentDropdownOpen(true);
                            if (novoEquipamentoId) setNovoEquipamentoId('');
                          }}
                          onFocus={() => setEquipmentDropdownOpen(true)}
                          disabled={saving}
                          placeholder="Digite NDS ou Smart Card..."
                          autoComplete="off"
                          role="combobox"
                          aria-expanded={equipmentDropdownOpen}
                          aria-controls="equipamentos-disponiveis-list"
                        />
                        <button type="button" onClick={() => setEquipmentDropdownOpen((open) => !open)} disabled={saving} aria-label="Abrir equipamentos disponíveis">⌄</button>
                      </div>
                      {equipmentDropdownOpen && (
                        <div className="eq-combobox__menu" id="equipamentos-disponiveis-list" role="listbox">
                          <div className="eq-combobox__count">{equipamentosFiltrados.length} equipamentos disponíveis</div>
                          {equipamentosFiltrados.length === 0 ? (
                            <div className="eq-combobox__empty">
                              <strong>Nenhum equipamento disponível encontrado</strong>
                              <div>Tente outro NDS ou Smart Card.</div>
                            </div>
                          ) : (
                            equipamentosFiltrados.map((eq) => (
                              <button
                                type="button"
                                className={`eq-combobox__option${eq.id === novoEquipamentoId ? ' is-selected' : ''}`}
                                key={eq.id}
                                onClick={() => selecionarEquipamento(eq.id)}
                                role="option"
                                aria-selected={eq.id === novoEquipamentoId}
                              >
                                <span>
                                  <strong>{eq.nds || 'NDS não informado'}</strong>
                                  <small>Smart Card · {formatSmartCard(eq.smartcard) || 'não informado'}</small>
                                </span>
                                <span className="eq-badge eq-badge--ok">Disponível</span>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {equipamentoNovo && (
                    <div className="eq-selected">
                      <div>
                        <span>Equipamento selecionado</span>
                        <strong>{equipamentoNovo.nds}</strong>
                        <em>Smart Card · {formatSmartCard(equipamentoNovo.smartcard)}</em>
                      </div>
                      <button type="button" onClick={() => { setNovoEquipamentoId(''); setBuscaNovoEquipamento(''); setEquipmentDropdownOpen(true); }} disabled={saving}>Alterar</button>
                    </div>
                  )}
                </>
              )}

              {modoNovoEquipamento === 'novo' && (
                <div className="eq-grid-2">
                  <div className="eq-field">
                    <label className="eq-label">NDS do novo equipamento <span>*</span></label>
                    <input className="eq-input" value={novoCadastroNds} onChange={(e) => setNovoCadastroNds(e.target.value)} disabled={saving} placeholder="Ex.: CE0A01255759583B" />
                  </div>
                  <div className="eq-field">
                    <label className="eq-label">Smart Card do novo equipamento <span>*</span></label>
                    <input className="eq-input" value={novoCadastroSmartcard} onChange={(e) => setNovoCadastroSmartcard(e.target.value)} disabled={saving} placeholder="Somente números" inputMode="numeric" />
                  </div>
                </div>
              )}
            </section>
          </div>

          <section className="eq-card eq-card--spaced">
            <h3 className="eq-card__title">Motivo e destino</h3>
            <div className="eq-grid-2 eq-card--spaced">
              <div className="eq-field">
                <label className="eq-label">Motivo da troca <span>*</span></label>
                <select className="eq-select" value={motivo} onChange={(e) => setMotivo(e.target.value as MotivoTrocaEquipamento)} disabled={saving}>
                  <option value="Defeito">Defeito</option>
                  <option value="Garantia">Garantia</option>
                  <option value="Atualização de equipamento">Atualização de equipamento</option>
                  <option value="Troca solicitada pelo cliente">Troca solicitada pelo cliente</option>
                  <option value="Outro">Outro</option>
                </select>
                {motivo === 'Outro' && (
                  <input className="eq-input eq-input--follow" value={motivoOutroTexto} onChange={(e) => setMotivoOutroTexto(e.target.value)} disabled={saving} placeholder="Descreva o motivo" />
                )}
              </div>
              <div className="eq-field">
                <label className="eq-label">Status do equipamento antigo após troca <span>*</span></label>
                <select className="eq-select" value={statusAntigo} onChange={(e) => setStatusAntigo(e.target.value)} disabled={saving}>
                  <option value="defeito">● Defeito</option>
                  <option value="reserva">● Reserva</option>
                  <option value="descartado">● Descartado</option>
                  <option value="disponivel">● Disponível</option>
                </select>
                <p className="eq-hint">Após a troca, o vínculo atual será removido e o equipamento antigo assumirá o status selecionado.</p>
              </div>
            </div>
          </section>
        </div>

        <footer className="eq-modal__footer">
          <button type="button" className="eq-btn eq-btn--secondary" onClick={onClose} disabled={saving}>Cancelar</button>
          <button type="button" className="eq-btn eq-btn--primary" onClick={handleConfirm} disabled={saving || !canConfirm}>
            {saving ? 'Processando troca...' : '⇄ Confirmar troca'}
          </button>
        </footer>
      </div>
    </div>
  );
}
