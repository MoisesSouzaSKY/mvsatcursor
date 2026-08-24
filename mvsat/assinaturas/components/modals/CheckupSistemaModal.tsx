import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from '../../../shared/components/ui/Modal';
import { Button } from '../../../shared/components/ui/Button';
import type { SystemCheckupResult } from '../../types/checkup.types';

interface CheckupSistemaModalProps {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  result: SystemCheckupResult | null;
  onRun: () => void;
}

const currencyNever = new Intl.NumberFormat('pt-BR');

function formatDateTimeBR(iso: string) {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return iso;
  return dt.toLocaleString('pt-BR');
}

function toFileDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function CheckupSistemaModal({ open, onClose, loading, result, onRun }: CheckupSistemaModalProps) {
  const modalRef = useRef<HTMLDivElement | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const [clientesSemCobrancaLimit, setClientesSemCobrancaLimit] = useState<number>(200);

  useEffect(() => {
    if (open) {
      setCopyStatus('idle');
      setClientesSemCobrancaLimit(200);
    }
  }, [open]);

  useEffect(() => {
    // Quando chega um novo resultado, resetar paginação
    if (!open) return;
    setClientesSemCobrancaLimit(200);
  }, [open, result?.ranAt]);

  const defeitosPorAssinatura = useMemo(() => {
    if (!result) return [] as Array<{ assinatura: string; quantidade: number }>;
    const map = new Map<string, number>();
    for (const r of result.equipamentosComDefeito || []) {
      const key = String(r.assinatura || '—');
      map.set(key, (map.get(key) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([assinatura, quantidade]) => ({ assinatura, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade || a.assinatura.localeCompare(b.assinatura, 'pt-BR'));
  }, [result]);

  const clientesSemCobrancaRows = useMemo(() => {
    if (!result) return [];
    return result.clientesSemCobranca.slice(0, clientesSemCobrancaLimit);
  }, [result, clientesSemCobrancaLimit]);

  const whatsappText = useMemo(() => {
    if (!result) {
      return [
        '*Checkup do Sistema — MV Locadora*',
        'Ainda não foi executado.',
        '',
        'Abra o checkup e toque em *Executar* para gerar o relatório.'
      ].join('\n');
    }

    const lines: string[] = [];
    lines.push(`*Checkup do Sistema — MV Locadora*`);
    lines.push(`Rodado em: *${formatDateTimeBR(result.ranAt)}*`);
    lines.push('');

    lines.push('*TOTAIS*');
    lines.push(`• Total de assinaturas: *${currencyNever.format(result.totals.totalAssinaturas)}*`);
    lines.push(`• Equipamentos com defeito: *${currencyNever.format(result.totals.equipamentosComDefeito)}*`);
    lines.push(`• Clientes sem cobrança: *${currencyNever.format(result.totals.clientesSemCobranca)}*`);
    lines.push('');

    if (result.alerts?.length) {
      lines.push('*ALERTAS*');
      for (const a of result.alerts.slice(0, 10)) lines.push(`• ${a}`);
      if (result.alerts.length > 10) lines.push(`• ... (+${result.alerts.length - 10})`);
      lines.push('');
    }

    const maxItems = 60;

    lines.push('*EQUIPAMENTOS COM DEFEITO/MANUTENÇÃO/INATIVO*');
    if (!result.equipamentosComDefeito.length) {
      lines.push('• Nenhum encontrado.');
    } else {
      for (const e of defeitosPorAssinatura.slice(0, maxItems)) {
        lines.push(`• Assinatura ${e.assinatura}: ${e.quantidade}`);
      }
      if (defeitosPorAssinatura.length > maxItems) lines.push(`• ... (+${defeitosPorAssinatura.length - maxItems})`);
    }
    lines.push('');

    lines.push('*CLIENTES ATIVOS SEM COBRANÇA RECENTE*');
    if (!result.clientesSemCobranca.length) {
      lines.push('• Nenhum encontrado.');
    } else {
      for (const c of result.clientesSemCobranca.slice(0, maxItems)) {
        const ass = c.assinaturas?.length ? c.assinaturas.join(', ') : '—';
        lines.push(`• ${c.nome} (${c.bairro}) — Ass.: ${ass} — ${c.motivo}`);
      }
      if (result.clientesSemCobranca.length > maxItems) lines.push(`• ... (+${result.clientesSemCobranca.length - maxItems})`);
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
      console.error('Erro ao copiar para área de transferência:', e);
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

      pdf.save(`checkup-sistema-${toFileDate(new Date())}.pdf`);
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
      title="Checkup do Sistema"
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
            {result ? 'Atualizar Checkup' : 'Executar Checkup'}
          </Button>
          <Button onClick={handleExportPdf} loading={exportingPdf} disabled={!result || loading}>
            Exportar PDF
          </Button>
        </>
      }
    >
      <div ref={modalRef} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Cabeçalho / Status */}
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
          {!result && (
            <div style={{ marginTop: '10px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Toque em <b>Executar Checkup</b> para gerar o resumo.
            </div>
          )}
          {result?.alerts?.length ? (
            <div style={{
              marginTop: '12px',
              backgroundColor: '#fffbeb',
              border: '1px solid #fed7aa',
              borderRadius: '12px',
              padding: '12px 14px',
              color: '#92400e',
              fontWeight: 700,
              fontSize: '13px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              {result.alerts.map((a, idx) => (
                <div key={idx}>{a}</div>
              ))}
            </div>
          ) : null}
        </div>

        {/* Totais */}
        {result && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '12px' }}>
            <div style={{ ...cardBase, background: '#f8fafc' }}>
              <div style={{ ...sectionTitleStyle, color: '#475569' }}>TOTAL ASSINATURAS</div>
              <div style={{ fontSize: '22px', fontWeight: 900, marginTop: '8px', color: '#0f172a' }}>
                {result.totals.totalAssinaturas}
              </div>
            </div>
            <div style={{ ...cardBase, borderColor: '#bbf7d0', background: '#f0fdf4' }}>
              <div style={{ ...sectionTitleStyle, color: '#166534' }}>EQUIP. COM DEFEITO</div>
              <div style={{ fontSize: '22px', fontWeight: 900, marginTop: '8px', color: '#166534' }}>
                {result.totals.equipamentosComDefeito}
              </div>
            </div>
            <div style={{ ...cardBase, borderColor: '#bfdbfe', background: '#eff6ff' }}>
              <div style={{ ...sectionTitleStyle, color: '#1d4ed8' }}>CLIENTES SEM COBRANÇA</div>
              <div style={{ fontSize: '22px', fontWeight: 900, marginTop: '8px', color: '#1d4ed8' }}>
                {result.totals.clientesSemCobranca}
              </div>
            </div>
          </div>
        )}

        {/* Tabelas / listas secundárias */}
        {result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* FOCO: clientes ativos sem cobrança */}
            <div style={{ ...cardBase, borderColor: '#bfdbfe', background: 'linear-gradient(180deg, rgba(37,99,235,0.06), var(--surface-primary))' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontWeight: 900, color: '#1d4ed8', marginBottom: '4px' }}>
                    💰 Clientes ativos sem cobrança recente
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 700 }}>
                    Mês atual / mês anterior (considera referência ou vencimento)
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 800 }}>
                  {result.clientesSemCobranca.length}
                </div>
              </div>

              {result.clientesSemCobranca.length === 0 ? (
                <div style={{ marginTop: '10px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                  Nenhum cliente ativo sem cobrança recente encontrado.
                </div>
              ) : (
                <div style={{ marginTop: '10px', maxHeight: '42vh', overflow: 'auto', paddingRight: '6px' }}>
                  {clientesSemCobrancaRows.map((c) => (
                    <div key={c.clienteId} style={{ padding: '10px 0', borderBottom: '1px solid #e5e7eb' }}>
                      <div style={{ fontWeight: 900, color: '#1d4ed8' }}>
                        {c.nome} <span style={{ color: 'var(--text-secondary)', fontWeight: 700 }}>({c.bairro})</span>
                      </div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '4px' }}>
                        Assinaturas: {c.assinaturas.join(', ') || '—'} • Motivo: {c.motivo}
                      </div>
                    </div>
                  ))}
                  {result.clientesSemCobranca.length > clientesSemCobrancaLimit && (
                    <div style={{ marginTop: '10px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 700 }}>
                        Mostrando {clientesSemCobrancaRows.length} de {result.clientesSemCobranca.length}.
                      </div>
                      <Button
                        variant="secondary"
                        onClick={() => setClientesSemCobrancaLimit((v) => Math.min(result.clientesSemCobranca.length, v + 200))}
                      >
                        Carregar mais
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => setClientesSemCobrancaLimit(result.clientesSemCobranca.length)}
                      >
                        Mostrar tudo
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Abaixo: equipamentos com defeito (resumo por assinatura) */}
            <div style={{ ...cardBase }}>
              <div style={{ fontWeight: 900, color: 'var(--text-primary)', marginBottom: '10px' }}>
                ⚠️ Aparelhos com defeito/manutenção/inativo
              </div>
              {defeitosPorAssinatura.length === 0 ? (
                <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                  Nenhum equipamento com defeito/manutenção/inativo encontrado.
                </div>
              ) : (
                <div className="table-container">
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc' }}>
                        <th style={{ textAlign: 'left', padding: '10px', borderBottom: '1px solid #e2e8f0' }}>Assinatura</th>
                        <th style={{ textAlign: 'left', padding: '10px', borderBottom: '1px solid #e2e8f0' }}>Quantidade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {defeitosPorAssinatura.map((r) => (
                        <tr key={r.assinatura}>
                          <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', fontWeight: 800, color: '#0f172a' }}>
                            {r.assinatura}
                          </td>
                          <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', fontWeight: 900, color: '#991b1b' }}>
                            {r.quantidade}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

