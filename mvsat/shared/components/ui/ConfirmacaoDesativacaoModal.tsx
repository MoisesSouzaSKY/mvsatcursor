import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

interface ConfirmacaoDesativacaoModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  clienteNome: string;
  loading?: boolean;
}

export function ConfirmacaoDesativacaoModal({
  open,
  onClose,
  onConfirm,
  clienteNome,
  loading = false
}: ConfirmacaoDesativacaoModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title=""
      size="sm"
    >
      <div style={{ padding: '32px 24px', textAlign: 'center' }}>
        {/* Ícone de aviso */}
        <div style={{
          width: '80px',
          height: '80px',
          backgroundColor: 'var(--color-warning-100)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
          border: '4px solid var(--color-warning-200)'
        }}>
          <svg 
            style={{ width: '40px', height: '40px', color: 'var(--color-warning-600)' }} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" 
            />
          </svg>
        </div>

        {/* Título */}
        <h2 style={{
          fontSize: '24px',
          fontWeight: '700',
          color: 'var(--text-primary)',
          margin: '0 0 16px 0',
          lineHeight: '1.3'
        }}>
          Desativar Cliente
        </h2>

        {/* Mensagem */}
        <p style={{
          fontSize: '16px',
          color: 'var(--text-secondary)',
          margin: '0 0 32px 0',
          lineHeight: '1.6',
          maxWidth: '400px'
        }}>
          Tem certeza que deseja desativar o cliente{' '}
          <strong style={{ color: 'var(--text-primary)' }}>{clienteNome}</strong>?
        </p>

        {/* Informação adicional */}
        <div style={{
          backgroundColor: 'var(--color-warning-50)',
          border: '1px solid var(--color-warning-200)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '32px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          textAlign: 'left'
        }}>
          <div style={{
            width: '20px',
            height: '20px',
            backgroundColor: 'var(--color-warning-500)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            marginTop: '2px'
          }}>
            <svg style={{ width: '12px', height: '12px', color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p style={{
              fontSize: '14px',
              color: 'var(--color-warning-700)',
              margin: '0 0 4px 0',
              fontWeight: '600'
            }}>
              O que acontece quando um cliente é desativado?
            </p>
            <p style={{
              fontSize: '13px',
              color: 'var(--color-warning-600)',
              margin: 0,
              lineHeight: '1.4'
            }}>
              • O cliente será movido para a lista de ex-clientes<br/>
              • Não receberá mais cobranças automáticas<br/>
              • Poderá ser reativado a qualquer momento<br/>
              • <strong>Equipamentos associados serão automaticamente liberados</strong><br/>
              • <strong>TV Boxes associadas serão automaticamente liberadas</strong><br/>
              • Todos os equipamentos ficarão disponíveis para novos clientes
            </p>
          </div>
        </div>

        {/* Botões */}
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'center'
        }}>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
            style={{
              minWidth: '120px',
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={onConfirm}
            loading={loading}
            style={{
              minWidth: '120px',
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            {loading ? 'Desativando...' : 'Desativar Cliente'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
