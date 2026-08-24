import React from 'react';

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

const labelPillStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '4px 10px',
  borderRadius: 999,
  background: '#eef2ff',
  color: '#3730a3',
  fontSize: 12,
  fontWeight: 700,
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
  }, [isOpen]);

  const equipamentosFiltrados = React.useMemo(() => {
    const term = buscaNovoEquipamento.trim().toLowerCase();
    if (!term) return equipamentosDisponiveis;
    return equipamentosDisponiveis.filter((e) => {
      const nds = String(e.nds || '').toLowerCase();
      const sc = String(e.smartcard || '').toLowerCase();
      return nds.includes(term) || sc.includes(term);
    });
  }, [buscaNovoEquipamento, equipamentosDisponiveis]);

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
      setError('Preencha os campos obrigatórios.');
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
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1200,
        padding: 16,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 860,
          background: 'white',
          borderRadius: 14,
          boxShadow: '0 18px 45px rgba(2, 6, 23, 0.18)',
          overflow: 'hidden',
          maxHeight: '90vh',
          border: '1px solid rgba(15, 23, 42, 0.08)',
        }}
      >
        <div
          style={{
            padding: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #e5e7eb',
            background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
            color: '#0f172a',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: '#ecfdf5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #a7f3d0',
              }}
            >
              🔄
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 16 }}>Troca de Equipamento</div>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>
                Substituir equipamento sem perder dados do cliente/assinatura
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={saving}
            style={{
              background: 'white',
              color: '#0f172a',
              border: '1px solid #e5e7eb',
              width: 38,
              height: 38,
              borderRadius: 10,
              cursor: saving ? 'not-allowed' : 'pointer',
              boxShadow: '0 1px 2px rgba(15, 23, 42, 0.06)',
            }}
            aria-label="Fechar"
            title="Fechar"
            type="button"
          >
            ✕
          </button>
        </div>

        <div style={{ padding: 18, overflow: 'auto' }}>
          {error && (
            <div
              style={{
                background: '#fee2e2',
                color: '#991b1b',
                border: '1px solid #fecaca',
                padding: '10px 12px',
                borderRadius: 10,
                marginBottom: 14,
                fontWeight: 600,
              }}
            >
              {error}
            </div>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 14,
            }}
          >
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 14, background: '#ffffff' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontWeight: 900, color: '#111827' }}>Equipamento atual</div>
                <span style={labelPillStyle}>Em uso</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 700 }}>NDS</div>
                  <div style={{ fontWeight: 900, color: '#111827' }}>{equipamentoAtual.nds || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 700 }}>Smart Card</div>
                  <div style={{ fontWeight: 900, color: '#111827' }}>{formatSmartCard(equipamentoAtual.smartcard) || '—'}</div>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 700 }}>Cliente vinculado</div>
                  <div style={{ fontWeight: 800, color: '#111827' }}>{clienteNome}</div>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 700 }}>Assinatura vinculada</div>
                  <div style={{ fontWeight: 900, color: '#111827' }}>
                    {assinaturaCodigo}
                    {assinaturaNome ? <span style={{ fontWeight: 700, color: '#6b7280' }}> — {assinaturaNome}</span> : null}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 14, background: '#ffffff' }}>
              <div style={{ fontWeight: 900, color: '#111827', marginBottom: 10 }}>Novo equipamento</div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setModoNovoEquipamento('existente')}
                  disabled={saving}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: modoNovoEquipamento === 'existente' ? '1px solid #111827' : '1px solid #e5e7eb',
                    background: modoNovoEquipamento === 'existente' ? '#0f172a' : 'white',
                    color: modoNovoEquipamento === 'existente' ? 'white' : '#0f172a',
                    fontWeight: 900,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    fontSize: 13,
                  }}
                >
                  Selecionar existente
                </button>
                <button
                  type="button"
                  onClick={() => setModoNovoEquipamento('novo')}
                  disabled={saving}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: modoNovoEquipamento === 'novo' ? '1px solid #111827' : '1px solid #e5e7eb',
                    background: modoNovoEquipamento === 'novo' ? '#0f172a' : 'white',
                    color: modoNovoEquipamento === 'novo' ? 'white' : '#0f172a',
                    fontWeight: 900,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    fontSize: 13,
                  }}
                >
                  Cadastrar novo
                </button>
                <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 800, alignSelf: 'center' }}>
                  O novo equipamento precisa estar “Disponível”
                </span>
              </div>

              {modoNovoEquipamento === 'existente' && (
                <>
                  <label style={{ fontSize: 12, color: '#374151', fontWeight: 800, display: 'block', marginBottom: 6 }}>
                    Buscar por NDS ou Smart Card
                  </label>
                  <input
                    value={buscaNovoEquipamento}
                    onChange={(e) => setBuscaNovoEquipamento(e.target.value)}
                    disabled={saving}
                    placeholder="Digite para filtrar..."
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: 10,
                      border: '1px solid #d1d5db',
                      outline: 'none',
                      fontWeight: 700,
                      marginBottom: 10,
                    }}
                  />

              <label style={{ fontSize: 12, color: '#374151', fontWeight: 800, display: 'block', marginBottom: 6 }}>
                Selecionar equipamento disponível <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                value={novoEquipamentoId}
                onChange={(e) => setNovoEquipamentoId(e.target.value)}
                disabled={saving}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 10,
                  border: '1px solid #d1d5db',
                  outline: 'none',
                  fontWeight: 700,
                  cursor: saving ? 'not-allowed' : 'pointer',
                }}
              >
                <option value="">{equipamentosFiltrados.length ? 'Selecione...' : 'Nenhum equipamento disponível'}</option>
                {equipamentosFiltrados
                  .slice()
                  .sort((a, b) => (a.nds || '').localeCompare(b.nds || '', 'pt-BR'))
                  .map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      {eq.nds} — {formatSmartCard(eq.smartcard)}
                    </option>
                  ))}
              </select>

              {equipamentoNovo && (
                <div style={{ marginTop: 10, padding: 12, borderRadius: 10, background: '#f8fafc', border: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 800 }}>Selecionado</div>
                  <div style={{ fontWeight: 900, color: '#111827' }}>{equipamentoNovo.nds}</div>
                  <div style={{ fontSize: 13, color: '#374151', fontWeight: 800 }}>{formatSmartCard(equipamentoNovo.smartcard)}</div>
                </div>
              )}
                </>
              )}

              {modoNovoEquipamento === 'novo' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 12, color: '#374151', fontWeight: 800, display: 'block', marginBottom: 6 }}>
                        NDS do novo equipamento <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        value={novoCadastroNds}
                        onChange={(e) => setNovoCadastroNds(e.target.value)}
                        disabled={saving}
                        placeholder="Ex.: CE0A01255759583B"
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          borderRadius: 10,
                          border: '1px solid #d1d5db',
                          outline: 'none',
                          fontWeight: 700,
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, color: '#374151', fontWeight: 800, display: 'block', marginBottom: 6 }}>
                        Smart Card do novo equipamento <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        value={novoCadastroSmartcard}
                        onChange={(e) => setNovoCadastroSmartcard(e.target.value)}
                        disabled={saving}
                        placeholder="Somente números"
                        inputMode="numeric"
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          borderRadius: 10,
                          border: '1px solid #d1d5db',
                          outline: 'none',
                          fontWeight: 700,
                        }}
                      />
                    </div>
                  </div>
                  <div style={{ marginTop: 10, fontSize: 12, color: '#6b7280', fontWeight: 800 }}>
                    Ao confirmar, o sistema cria este equipamento como <strong>Disponível</strong> e já realiza a troca.
                  </div>
                </>
              )}
            </div>
          </div>

          <div style={{ marginTop: 14, border: '1px solid #e5e7eb', borderRadius: 12, padding: 14, background: '#ffffff' }}>
            <div style={{ fontWeight: 900, color: '#111827', marginBottom: 10 }}>Motivo e status</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: '#374151', fontWeight: 800, display: 'block', marginBottom: 6 }}>
                  Motivo da troca <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value as MotivoTrocaEquipamento)}
                  disabled={saving}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: '1px solid #d1d5db',
                    outline: 'none',
                    fontWeight: 700,
                    cursor: saving ? 'not-allowed' : 'pointer',
                  }}
                >
                  <option value="Defeito">Defeito</option>
                  <option value="Garantia">Garantia</option>
                  <option value="Atualização de equipamento">Atualização de equipamento</option>
                  <option value="Troca solicitada pelo cliente">Troca solicitada pelo cliente</option>
                  <option value="Outro">Outro</option>
                </select>

                {motivo === 'Outro' && (
                  <div style={{ marginTop: 10 }}>
                    <label style={{ fontSize: 12, color: '#374151', fontWeight: 800, display: 'block', marginBottom: 6 }}>
                      Descreva o motivo <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      value={motivoOutroTexto}
                      onChange={(e) => setMotivoOutroTexto(e.target.value)}
                      disabled={saving}
                      placeholder="Ex.: troca por melhoria do sinal..."
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: 10,
                        border: '1px solid #d1d5db',
                        outline: 'none',
                        fontWeight: 700,
                      }}
                    />
                  </div>
                )}
              </div>

              <div>
                <label style={{ fontSize: 12, color: '#374151', fontWeight: 800, display: 'block', marginBottom: 6 }}>
                  Status do equipamento antigo após troca <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  value={statusAntigo}
                  onChange={(e) => setStatusAntigo(e.target.value)}
                  disabled={saving}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: '1px solid #d1d5db',
                    outline: 'none',
                    fontWeight: 700,
                    cursor: saving ? 'not-allowed' : 'pointer',
                  }}
                >
                  <option value="defeito">Defeito</option>
                  <option value="reserva">Reserva</option>
                  <option value="descartado">Descartado</option>
                  <option value="disponivel">Disponível</option>
                </select>
                <div style={{ fontSize: 12, marginTop: 8, color: '#6b7280', fontWeight: 700 }}>
                  O equipamento antigo terá o vínculo removido automaticamente.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            padding: 18,
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            gap: 10,
            background: '#ffffff',
          }}
        >
          <button
            onClick={onClose}
            disabled={saving}
            style={{
              padding: '12px 14px',
              borderRadius: 10,
              border: '1px solid #d1d5db',
              background: 'white',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontWeight: 800,
              color: '#111827',
            }}
            type="button"
          >
            Cancelar
          </button>

          <button
            onClick={handleConfirm}
            disabled={saving || !canConfirm}
            style={{
              padding: '12px 16px',
              borderRadius: 10,
              border: 'none',
              background: saving || !canConfirm ? '#94a3b8' : '#16a34a',
              color: 'white',
              cursor: saving || !canConfirm ? 'not-allowed' : 'pointer',
              fontWeight: 900,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: saving || !canConfirm ? 'none' : '0 10px 22px rgba(22, 163, 74, 0.22)',
            }}
            type="button"
          >
            {saving ? 'Trocando...' : '✅ Confirmar troca'}
          </button>
        </div>
      </div>
    </div>
  );
}

