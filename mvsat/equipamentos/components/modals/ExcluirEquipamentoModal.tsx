import React from 'react';

export type MotivoExclusaoEquipamento =
  | 'Equipamento retirado da grade'
  | 'Equipamento vendido'
  | 'Equipamento devolvido ao fornecedor'
  | 'Equipamento sucateado'
  | 'Equipamento perdido'
  | 'Outro';

export interface ExcluirEquipamentoPayload {
  equipamentoId: string;
  motivo: MotivoExclusaoEquipamento;
  motivoOutroTexto?: string;
}

interface ExcluirEquipamentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  equipamento: { id: string; nds: string; smartcard: string; cliente?: string; assinatura?: { codigo?: string } | null; codigo?: string } | null;
  onConfirm: (payload: ExcluirEquipamentoPayload) => Promise<void>;
}

const formatSmartCard = (value: string): string => {
  if (!value) return '';
  const digits = String(value).replace(/\D/g, '');
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
};

export default function ExcluirEquipamentoModal({ isOpen, onClose, equipamento, onConfirm }: ExcluirEquipamentoModalProps) {
  const [motivo, setMotivo] = React.useState<MotivoExclusaoEquipamento>('Equipamento retirado da grade');
  const [motivoOutroTexto, setMotivoOutroTexto] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    setMotivo('Equipamento retirado da grade');
    setMotivoOutroTexto('');
    setSaving(false);
    setError(null);
  }, [isOpen]);

  if (!isOpen || !equipamento) return null;

  const canConfirm = motivo !== 'Outro' || motivoOutroTexto.trim().length > 0;

  const handleConfirm = async () => {
    setError(null);
    if (!canConfirm) {
      setError('Informe o motivo da exclusão.');
      return;
    }

    const ok = window.confirm(
      'ATENÇÃO: Este equipamento será removido da grade principal e não poderá mais ser utilizado em assinaturas. Deseja continuar?'
    );
    if (!ok) return;

    setSaving(true);
    try {
      await onConfirm({
        equipamentoId: equipamento.id,
        motivo,
        motivoOutroTexto: motivo === 'Outro' ? motivoOutroTexto.trim() : undefined,
      });
      onClose();
    } catch (e: any) {
      setError(String(e?.message || 'Falha ao excluir equipamento.'));
    } finally {
      setSaving(false);
    }
  };

  const assinaturaCodigo = equipamento.assinatura?.codigo || equipamento.codigo || '—';
  const clienteNome = equipamento.cliente || '—';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1300,
        padding: 16,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 720,
          background: 'white',
          borderRadius: 14,
          boxShadow: '0 18px 45px rgba(2, 6, 23, 0.18)',
          overflow: 'hidden',
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
                background: '#fef2f2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #fecaca',
              }}
            >
              🗑️
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 16 }}>Excluir equipamento</div>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>
                Remove da operação diária sem apagar histórico
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

        <div style={{ padding: 18 }}>
          {error && (
            <div
              style={{
                background: '#fee2e2',
                color: '#991b1b',
                border: '1px solid #fecaca',
                padding: '10px 12px',
                borderRadius: 10,
                marginBottom: 14,
                fontWeight: 700,
              }}
            >
              {error}
            </div>
          )}

          <div
            style={{
              background: '#fff7ed',
              border: '1px solid #fed7aa',
              color: '#9a3412',
              borderRadius: 12,
              padding: 12,
              fontWeight: 800,
              marginBottom: 14,
            }}
          >
            ATENÇÃO: Este equipamento será removido da grade principal e não poderá mais ser utilizado em assinaturas.
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, background: '#ffffff' }}>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 800 }}>Equipamento</div>
              <div style={{ fontWeight: 900, color: '#0f172a' }}>{equipamento.nds || '—'}</div>
              <div style={{ fontSize: 13, color: '#334155', fontWeight: 800 }}>{formatSmartCard(equipamento.smartcard) || '—'}</div>
            </div>
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, background: '#ffffff' }}>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 800 }}>Vínculo atual (histórico)</div>
              <div style={{ fontSize: 13, color: '#0f172a', fontWeight: 900 }}>Cliente: {clienteNome}</div>
              <div style={{ fontSize: 13, color: '#0f172a', fontWeight: 900 }}>Assinatura: {assinaturaCodigo}</div>
            </div>
          </div>

          <div style={{ marginTop: 14, border: '1px solid #e5e7eb', borderRadius: 12, padding: 12 }}>
            <label style={{ fontSize: 12, color: '#374151', fontWeight: 900, display: 'block', marginBottom: 6 }}>
              Motivo da exclusão <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              value={motivo}
              onChange={(e) => setMotivo(e.target.value as MotivoExclusaoEquipamento)}
              disabled={saving}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 10,
                border: '1px solid #d1d5db',
                outline: 'none',
                fontWeight: 800,
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              <option value="Equipamento retirado da grade">Equipamento retirado da grade</option>
              <option value="Equipamento vendido">Equipamento vendido</option>
              <option value="Equipamento devolvido ao fornecedor">Equipamento devolvido ao fornecedor</option>
              <option value="Equipamento sucateado">Equipamento sucateado</option>
              <option value="Equipamento perdido">Equipamento perdido</option>
              <option value="Outro">Outro</option>
            </select>

            {motivo === 'Outro' && (
              <div style={{ marginTop: 10 }}>
                <label style={{ fontSize: 12, color: '#374151', fontWeight: 900, display: 'block', marginBottom: 6 }}>
                  Descreva o motivo <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  value={motivoOutroTexto}
                  onChange={(e) => setMotivoOutroTexto(e.target.value)}
                  disabled={saving}
                  placeholder="Ex.: retirado por manutenção definitiva..."
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: '1px solid #d1d5db',
                    outline: 'none',
                    fontWeight: 800,
                  }}
                />
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: 18, borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', gap: 10 }}>
          <button
            onClick={onClose}
            disabled={saving}
            style={{
              padding: '12px 14px',
              borderRadius: 10,
              border: '1px solid #d1d5db',
              background: 'white',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontWeight: 900,
              color: '#0f172a',
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
              background: saving || !canConfirm ? '#94a3b8' : '#ef4444',
              color: 'white',
              cursor: saving || !canConfirm ? 'not-allowed' : 'pointer',
              fontWeight: 900,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: saving || !canConfirm ? 'none' : '0 10px 22px rgba(239, 68, 68, 0.22)',
            }}
            type="button"
          >
            {saving ? 'Excluindo...' : '🗑️ Confirmar exclusão'}
          </button>
        </div>
      </div>
    </div>
  );
}

