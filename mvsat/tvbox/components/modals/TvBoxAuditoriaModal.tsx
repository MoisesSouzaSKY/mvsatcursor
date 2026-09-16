import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from '../../../shared/components/ui/Modal';
import { Button } from '../../../shared/components/ui/Button';
import type { TvBoxAuditoriaResult } from '../../types/auditoria.types';

interface TvBoxAuditoriaModalProps {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  result: TvBoxAuditoriaResult | null;
  onRun: () => void;
  onApplyFix?: () => Promise<void>;
  fixCount?: number;
}

function formatDateTimeBR(iso: string) {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return iso;
  return dt.toLocaleString('pt-BR');
}

function toFileDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function TvBoxAuditoriaModal({ open, onClose, loading, result, onRun, onApplyFix, fixCount = 0 }: TvBoxAuditoriaModalProps) {
  const modalRef = useRef<HTMLDivElement | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const [confirmingFix, setConfirmingFix] = useState(false);

  useEffect(() => {
    if (open) {
      setCopyStatus('idle');
      setConfirmingFix(false);
    }
  }, [open]);

  const whatsappText = useMemo(() => {
    if (!result) {
      return [
        '*Auditoria TV Box — MV Locadora*',
        'Ainda não foi executada.',
        '',
        'Abra a auditoria e toque em *Executar* para gerar o relatório.'
      ].join('\n');
    }

    const dash = '────────────────────────';
    const asAss = (s: any) => String(s ?? '').replace(/\s+/g, ' ').trim();
    const shortAss = (s: string) => asAss(s).replace(/^assinatura\s+/i, '').trim();

    const lines: string[] = [];
    lines.push(`*Auditoria TV Box — MV Locadora*`);
    lines.push(`Rodado em: *${formatDateTimeBR(result.ranAt)}*`);
    lines.push(dash);
    lines.push('*TOTAIS*');
    lines.push(`Assinaturas: *${result.totals.totalAssinaturas}*`);
    lines.push('');
    lines.push('*Aparelhos*');
    lines.push(`- Faltando 1 aparelho (precisa 2): *${result.totals.assinaturasFaltando1Aparelho}*`);
    lines.push(`- Com “Disponível”: *${result.totals.assinaturasComDisponivel}*`);
    lines.push('');
    lines.push('*Cobrança*');
    lines.push(`- Clientes sem cobrança recente: *${result.totals.clientesSemCobrancaTvBox}*`);
    lines.push('');
    lines.push('*IDs*');
    lines.push(`- Assinaturas sem device_id: *${result.totals.assinaturasSemDeviceId}*`);
    lines.push(dash);

    const max = 80;

    lines.push('*1) CLIENTES SEM COBRANÇA*');
    if (!result.clientesSemCobranca.length) {
      lines.push('Nenhum.');
    } else {
      const rows = [...result.clientesSemCobranca].sort((a, b) =>
        String(a.nome).localeCompare(String(b.nome), 'pt-BR')
      );
      rows.slice(0, max).forEach((c, idx) => {
        const ass = (c.assinaturas || []).map((a) => shortAss(String(a))).join(', ') || '—';
        const bairro = asAss(c.bairro) || '—';
        lines.push(`${idx + 1}. *${asAss(c.nome)}* — ${bairro} — Ass.: ${ass}`);
      });
      if (rows.length > max) lines.push(`... (+${rows.length - max})`);
    }
    lines.push(dash);

    // "ASSINATURAS SEM DEVICE_ID" fica no modal/PDF, mas NÃO vai no texto do WhatsApp (muito grande).

    lines.push('*2) ASSINATURAS COM “DISPONÍVEL”*');
    if (!result.comDisponivel.length) {
      lines.push('Nenhuma.');
    } else {
      const rows = [...result.comDisponivel].sort((a, b) =>
        (b.quantidadeDisponiveis - a.quantidadeDisponiveis) || String(a.assinatura).localeCompare(String(b.assinatura), 'pt-BR')
      );
      rows.slice(0, max).forEach((r, idx) => {
        lines.push(`${idx + 1}. Ass. ${shortAss(String(r.assinatura))} — disponíveis: *${r.quantidadeDisponiveis}* — status: ${asAss(r.status)}`);
      });
      if (rows.length > max) lines.push(`... (+${rows.length - max})`);
    }

    return lines.join('\n');
  }, [result]);

  const handleCopyWhatsApp = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(whatsappText);
      } else {
        const ta = document.createElement('textarea');
        ta.value = whatsappText;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        ta.style.top = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopyStatus('copied');
      window.setTimeout(() => setCopyStatus('idle'), 2000);
    } catch (e) {
      console.error('Erro ao copiar:', e);
      setCopyStatus('error');
      window.setTimeout(() => setCopyStatus('idle'), 2500);
    }
  };

  const handleExportPdf = async () => {
    if (!modalRef.current) return;
    setExportingPdf(true);
    try {
      const [{ default: html2canvas }, jspdfModule] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);
      const { jsPDF } = jspdfModule as any;

      const canvas = await html2canvas(modalRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;

      while (heightLeft > 2) {
        pdf.addPage();
        position = heightLeft - imgHeight;
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pageHeight;
      }

      pdf.save(`auditoria-tvbox-${toFileDate(new Date())}.pdf`);
    } catch (e) {
      console.error('Erro ao exportar PDF:', e);
    } finally {
      setExportingPdf(false);
    }
  };

  if (!open) return null;

  const sectionTitleStyle: React.CSSProperties = {
    margin: 0,
    fontSize: '14px',
    fontWeight: 700,
    letterSpacing: '0.06em',
    color: 'var(--text-secondary)',
  };

  const cardBase: React.CSSProperties = {
    borderRadius: '14px',
    border: '1px solid var(--border-primary)',
    padding: '16px',
    backgroundColor: 'var(--surface-primary)',
    boxShadow: 'var(--shadow-sm)',
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Auditoria TV Box"
      size="xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={exportingPdf || loading}>
            Fechar
          </Button>
          <Button variant="secondary" onClick={handleCopyWhatsApp} disabled={exportingPdf || loading}>
            {copyStatus === 'copied' ? 'Copiado!' : copyStatus === 'error' ? 'Falhou ao copiar' : 'Copiar (WhatsApp)'}
          </Button>
          <Button variant="secondary" onClick={onRun} loading={loading} disabled={exportingPdf}>
            {result ? 'Atualizar Auditoria' : 'Executar Auditoria'}
          </Button>
          {onApplyFix && fixCount > 0 && (
            <Button variant="secondary" onClick={() => setConfirmingFix(true)} disabled={loading || exportingPdf}>
              Aplicar correções ({fixCount})
            </Button>
          )}
          <Button onClick={handleExportPdf} loading={exportingPdf} disabled={!result || loading}>
            Exportar PDF
          </Button>
        </>
      }
    >
      <div ref={modalRef} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ ...cardBase }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
            <div>
              <div style={sectionTitleStyle}>RELATÓRIO</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                {result ? `Última execução: ${formatDateTimeBR(result.ranAt)}` : 'Ainda não executado.'}
              </div>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 700 }}>
              {loading ? '⏳ Executando...' : result ? '✅ Pronto' : '—'}
            </div>
          </div>
        </div>

        {/* Cards removidos a pedido (evitar poluição visual) */}

        {result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Mostrar apenas se houver itens (evita seção vazia) */}
            {result.faltandoAparelho.length > 0 && (
              <div style={{ ...cardBase, borderColor: '#fde68a', background: '#fffbeb' }}>
                <div style={{ fontWeight: 900, color: '#92400e', marginBottom: '10px' }}>
                  📦 Assinaturas faltando 1 aparelho (precisa 2)
                </div>
                <div style={{ maxHeight: '42vh', overflow: 'auto', paddingRight: '6px' }}>
                  {result.faltandoAparelho.map((r) => (
                    <div key={r.tvboxId} style={{ padding: '10px 0', borderBottom: '1px solid rgba(146, 64, 14, 0.15)' }}>
                      <div style={{ fontWeight: 900, color: '#92400e' }}>{r.assinatura}</div>
                      <div style={{ fontSize: '12px', color: '#92400e', opacity: 0.85, fontWeight: 700, marginTop: '4px' }}>
                        status: {r.status} • aparelhos reais: {r.totalAparelhosReais}/2
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ ...cardBase, borderColor: '#bfdbfe', background: 'linear-gradient(180deg, rgba(37,99,235,0.06), var(--surface-primary))' }}>
              <div style={{ fontWeight: 900, color: '#1d4ed8', marginBottom: '10px' }}>
                💰 Clientes com TV Box sem cobrança recente
              </div>
              {result.clientesSemCobranca.length === 0 ? (
                <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Nenhum cliente sem cobrança recente encontrado.</div>
              ) : (
                <div style={{ maxHeight: '42vh', overflow: 'auto', paddingRight: '6px' }}>
                  {result.clientesSemCobranca.map((c) => (
                    <div key={c.clienteId} style={{ padding: '10px 0', borderBottom: '1px solid #e5e7eb' }}>
                      <div style={{ fontWeight: 900, color: '#1d4ed8' }}>
                        {c.nome} <span style={{ color: 'var(--text-secondary)', fontWeight: 700 }}>({c.bairro})</span>
                      </div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '4px' }}>
                        Assinaturas: {c.assinaturas.join(', ') || '—'} • {c.motivo}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {result && (result.comDisponivel.length > 0 || result.assinaturasSemDeviceId.length > 0) && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {result.comDisponivel.length > 0 && (
              <div style={{ ...cardBase }}>
                <div style={{ fontWeight: 900, color: 'var(--text-primary)', marginBottom: '10px' }}>
                  ✅ Assinaturas com aparelhos “Disponível”
                </div>
                <div style={{ maxHeight: '36vh', overflow: 'auto', paddingRight: '6px' }}>
                  {result.comDisponivel.map((r) => (
                    <div key={r.tvboxId} style={{ padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ fontWeight: 900, color: '#0f172a' }}>{r.assinatura}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 700, marginTop: '4px' }}>
                        disponíveis: {r.quantidadeDisponiveis} • status: {r.status}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.assinaturasSemDeviceId.length > 0 && (
              <div style={{ ...cardBase, borderColor: '#fecaca', background: '#fef2f2' }}>
                <div style={{ fontWeight: 900, color: '#991b1b', marginBottom: '10px' }}>
                  🆔 Assinaturas sem ID (device_id)
                </div>
                <div style={{ maxHeight: '36vh', overflow: 'auto', paddingRight: '6px' }}>
                  {result.assinaturasSemDeviceId.map((a) => (
                    <div key={a.tvboxId} style={{ padding: '10px 0', borderBottom: '1px solid rgba(153, 27, 27, 0.15)' }}>
                      <div style={{ fontWeight: 900, color: '#7f1d1d' }}>{a.assinatura}</div>
                      <div style={{ fontSize: '12px', color: '#991b1b', opacity: 0.9, fontWeight: 700, marginTop: '4px' }}>
                        {a.slotsSemId.map(s => `slot ${s.slot}`).join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {confirmingFix && onApplyFix && (
          <div style={{ padding: '16px', border: '1px solid #fbbf24', borderRadius: 12, background: '#fffbeb' }}>
            <div style={{ fontWeight: 900, color: '#92400e' }}>Confirmar correções</div>
            <p style={{ margin: '8px 0 14px', color: '#78350f', fontSize: 13 }}>
              A auditoria encontrou {fixCount} registro(s) que podem ser corrigidos. Esta ação alterará dados dos aparelhos no Firestore.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Button variant="secondary" onClick={() => setConfirmingFix(false)} disabled={loading}>Cancelar</Button>
              <Button onClick={async () => { setConfirmingFix(false); await onApplyFix(); }} loading={loading} disabled={loading}>Confirmar correções</Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

