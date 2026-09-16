import React from 'react';
import { Modal } from '../../../shared/components/ui/Modal';
import { Button } from '../../../shared/components/ui/Button';
import { OptimizedCobranca } from '../../utils/dataProcessing';

interface ExcluirCobrancaModalProps {
  open: boolean;
  cobranca: OptimizedCobranca | null;
  loading?: boolean;
  error?: string;
  onClose: () => void;
  onConfirm: () => void;
}

export function ExcluirCobrancaModal({
  open,
  cobranca,
  loading = false,
  error,
  onClose,
  onConfirm
}: ExcluirCobrancaModalProps) {
  if (!cobranca) return null;
  const dueDate = cobranca._parsedDate?.toLocaleDateString('pt-BR') || 'Não informado';
  const value = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cobranca.valor || 0);

  return (
    <Modal
      open={open}
      onClose={loading ? () => undefined : onClose}
      title="🗑 Excluir cobrança?"
      size="sm"
      className="cobrancas-modal cobrancas-modal--delete"
      closable={!loading}
      maskClosable={!loading}
    >
      <div className="cobrancas-modal__body">
        <p className="cobrancas-modal__description">Esta ação removerá a cobrança selecionada.</p>
        <div className="cobrancas-delete-card">
          <strong>{cobranca.cliente_nome || 'Cliente não informado'}</strong>
          <span>{cobranca.tipo || 'Cobrança'} · {cobranca.bairro || 'Bairro não informado'}</span>
          <span>Vencimento: {dueDate} · Valor: {value}</span>
        </div>
        <div className="cobrancas-delete-warning">⚠ Esta ação não poderá ser desfeita.</div>
        {error && <div className="cobrancas-modal__error">{error}</div>}
        <div className="cobrancas-modal__footer">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button variant="danger" onClick={onConfirm} disabled={loading}>
            {loading ? '⏳ Excluindo...' : '🗑 Excluir cobrança'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
