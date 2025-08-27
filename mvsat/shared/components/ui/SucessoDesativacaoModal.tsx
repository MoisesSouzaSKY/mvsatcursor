import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

interface SucessoDesativacaoModalProps {
  open: boolean;
  onClose: () => void;
  clienteNome: string;
  equipamentosLiberados?: number;
  tvBoxesLiberadas?: number;
}

export function SucessoDesativacaoModal({
  open,
  onClose,
  clienteNome,
  equipamentosLiberados = 0,
  tvBoxesLiberadas = 0
}: SucessoDesativacaoModalProps) {
  const totalEquipamentos = equipamentosLiberados + tvBoxesLiberadas;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title=""
      size="sm"
    >
      <div style={{ padding: '24px', textAlign: 'center' }}>
        {/* Ícone de sucesso */}
        <div style={{
          width: '60px',
          height: '60px',
          backgroundColor: 'var(--color-success-100)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
          border: '3px solid var(--color-success-200)',
          animation: 'scaleIn 0.3s ease-out'
        }}>
          <svg 
            style={{ width: '30px', height: '30px', color: 'var(--color-success-600)' }} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M5 13l4 4L19 7" 
            />
          </svg>
        </div>

        {/* Título */}
        <h2 style={{
          fontSize: '20px',
          fontWeight: '700',
          color: 'var(--text-primary)',
          margin: '0 0 8px 0',
          lineHeight: '1.3'
        }}>
          Cliente Desativado!
        </h2>

        {/* Mensagem principal */}
        <p style={{
          fontSize: '14px',
          color: 'var(--text-secondary)',
          margin: '0 0 16px 0',
          lineHeight: '1.4'
        }}>
          <strong style={{ color: 'var(--text-primary)' }}>{clienteNome}</strong>
          {' '}foi desativado com sucesso.
        </p>

        {/* Informações sobre equipamentos liberados */}
        {totalEquipamentos > 0 && (
          <div style={{
            backgroundColor: 'var(--color-success-50)',
            border: '1px solid var(--color-success-200)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px',
            textAlign: 'left'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '8px'
            }}>
              <div style={{
                width: '16px',
                height: '16px',
                backgroundColor: 'var(--color-success-500)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg style={{ width: '8px', height: '8px', color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span style={{
                fontSize: '14px',
                fontWeight: '600',
                color: 'var(--color-success-700)'
              }}>
                Equipamentos Liberados Automaticamente
              </span>
            </div>
            
            <div style={{
              fontSize: '13px',
              color: 'var(--color-success-600)',
              lineHeight: '1.4'
            }}>
              {equipamentosLiberados > 0 && (
                <div>• {equipamentosLiberados} equipamento(s) SKY</div>
              )}
              {tvBoxesLiberadas > 0 && (
                <div>• {tvBoxesLiberadas} TV Box(es)</div>
              )}
              <div style={{ marginTop: '8px', fontWeight: '500' }}>
                Todos os equipamentos estão agora disponíveis para novos clientes.
              </div>
            </div>
          </div>
        )}

        {/* Botão de fechar */}
        <Button
          variant="primary"
          onClick={onClose}
          style={{
            minWidth: '120px',
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: '600'
          }}
        >
          Fechar
        </Button>

        {/* Estilos CSS para animação */}
        <style>{`
          @keyframes scaleIn {
            from {
              transform: scale(0.8);
              opacity: 0;
            }
            to {
              transform: scale(1);
              opacity: 1;
            }
          }
        `}</style>
      </div>
    </Modal>
  );
}
