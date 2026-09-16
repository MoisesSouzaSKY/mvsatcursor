import React from 'react';
import './EquipmentModals.css';

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
  const [confirmacao, setConfirmacao] = React.useState(false);

  React.useEffect(() => {
    if (!isOpen) return;
    setMotivo('Equipamento retirado da grade');
    setMotivoOutroTexto('');
    setSaving(false);
    setError(null);
    setConfirmacao(false);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, saving, onClose]);

  if (!isOpen || !equipamento) return null;

  const canConfirm = confirmacao && (motivo !== 'Outro' || motivoOutroTexto.trim().length > 0);

  const handleConfirm = async () => {
    setError(null);
    if (!canConfirm) {
      setError(
        !confirmacao
          ? 'Confirme que deseja remover o equipamento da grade principal.'
          : 'Informe o motivo da exclusão.'
      );
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
    <div className="eq-modal-overlay" role="presentation">
      <div className="eq-modal eq-modal--delete" role="dialog" aria-modal="true" aria-labelledby="excluir-equipamento-title">
        <header className="eq-modal__header">
          <div className="eq-modal__header-main">
            <div className="eq-modal__icon eq-modal__icon--danger" aria-hidden="true">🗑</div>
            <div>
              <h2 id="excluir-equipamento-title" className="eq-modal__title">Excluir equipamento</h2>
              <p className="eq-modal__subtitle">Remova o equipamento da operação sem apagar seu histórico.</p>
            </div>
          </div>
          <button type="button" className="eq-modal__close" onClick={onClose} disabled={saving} aria-label="Fechar">✕</button>
        </header>

        <div className="eq-modal__body">
          {error && <div className="eq-alert eq-alert--error">{error}</div>}

          <div className="eq-alert eq-alert--warn">
            <strong>ATENÇÃO</strong>
            <span>Este equipamento será removido da grade principal e não poderá mais ser utilizado em novas assinaturas.</span>
            <span>O histórico existente será preservado.</span>
          </div>

          <div className="eq-grid-2">
            <section className="eq-card">
              <span className="eq-kv">
                <div className="eq-kv__full">
                  <span>Equipamento</span>
                  <strong>{equipamento.nds || '—'}</strong>
                  <em>{formatSmartCard(equipamento.smartcard) || '—'}</em>
                </div>
              </span>
            </section>
            <section className="eq-card">
              <div className="eq-kv">
                <div className="eq-kv__full">
                  <span>Vínculo atual</span>
                  <strong>{clienteNome}</strong>
                  <em>Assinatura {assinaturaCodigo}</em>
                </div>
              </div>
            </section>
          </div>

          <section className="eq-card eq-card--spaced">
            <label className="eq-label" htmlFor="motivo-exclusao">Motivo da exclusão <span>*</span></label>
            <select id="motivo-exclusao" className="eq-select" value={motivo} onChange={(e) => setMotivo(e.target.value as MotivoExclusaoEquipamento)} disabled={saving}>
              <option value="Equipamento retirado da grade">Equipamento retirado da grade</option>
              <option value="Equipamento vendido">Equipamento vendido</option>
              <option value="Equipamento devolvido ao fornecedor">Equipamento devolvido ao fornecedor</option>
              <option value="Equipamento sucateado">Equipamento sucateado</option>
              <option value="Equipamento perdido">Equipamento perdido</option>
              <option value="Outro">Outro</option>
            </select>
            {motivo === 'Outro' && (
              <input className="eq-input eq-input--follow" value={motivoOutroTexto} onChange={(e) => setMotivoOutroTexto(e.target.value)} disabled={saving} placeholder="Descreva o motivo" />
            )}
            <label className="eq-check">
              <input type="checkbox" checked={confirmacao} onChange={(event) => setConfirmacao(event.target.checked)} disabled={saving} />
              <span>Confirmo que desejo remover este equipamento da grade principal.</span>
            </label>
          </section>
        </div>

        <footer className="eq-modal__footer">
          <button type="button" className="eq-btn eq-btn--secondary" onClick={onClose} disabled={saving}>Cancelar</button>
          <button type="button" className="eq-btn eq-btn--danger" onClick={handleConfirm} disabled={saving || !canConfirm}>
            {saving ? 'Removendo...' : '🗑 Confirmar exclusão'}
          </button>
        </footer>
      </div>
    </div>
  );
}
