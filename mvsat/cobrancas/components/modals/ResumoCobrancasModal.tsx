import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from '../../../shared/components/ui/Modal';
import { Button } from '../../../shared/components/ui/Button';
import { OptimizedCobranca, normalizeStatusValue } from '../../utils/dataProcessing';

interface ResumoCobrancasModalProps {
  open: boolean;
  onClose: () => void;
  cobrancas: OptimizedCobranca[];
}

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function outField(v: any) {
  const s = (v ?? '').toString().trim();
  return s.length ? s : 'Não informado';
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function asDate(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (value && typeof value.toDate === 'function') return value.toDate(); // Timestamp
  if (value && typeof value.seconds === 'number') return new Date(value.seconds * 1000);
  const dt = new Date(value);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function getDueDate(c: OptimizedCobranca): Date | null {
  if (c?._parsedDate && !Number.isNaN(c._parsedDate.getTime())) return c._parsedDate;
  return asDate((c as any).data_vencimento ?? (c as any).vencimento);
}

function getPaymentDate(c: OptimizedCobranca): Date | null {
  return (
    asDate((c as any).pagoEm) ||
    asDate((c as any).data_pagamento) ||
    asDate((c as any).dataPagamento) ||
    asDate((c as any).pago_em)
  );
}

function getPaidValue(c: OptimizedCobranca): number {
  const v = Number((c as any).valorTotalPago ?? (c as any).valor_pago ?? (c as any).valor ?? 0);
  return Number.isFinite(v) ? v : 0;
}

function getChargeValue(c: OptimizedCobranca): number {
  const v = Number((c as any).valor ?? 0);
  return Number.isFinite(v) ? v : 0;
}

function formatDateBR(d: Date | null) {
  if (!d) return 'Não informado';
  return d.toLocaleDateString('pt-BR');
}

function toInputDateValue(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseInputDateLocal(value: string): Date | null {
  const s = String(value || '').trim();
  if (!s) return null;
  // IMPORTANT: não usar `new Date('YYYY-MM-DD')` (interpreta como UTC e pode voltar 1 dia no fuso -03).
  const [y, m, d] = s.split('-').map((v) => parseInt(v, 10));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  const dt = new Date(y, m - 1, d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

export function ResumoCobrancasModal({ open, onClose, cobrancas }: ResumoCobrancasModalProps) {
  const resumoRef = useRef<HTMLDivElement | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(() => startOfDay(new Date()));
  const [exportingPdf, setExportingPdf] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');

  // Resetar data ao abrir (atualiza automaticamente ao abrir)
  useEffect(() => {
    if (open) {
      setSelectedDate(startOfDay(new Date()));
      setCopyStatus('idle');
    }
  }, [open]);

  const hoje = startOfDay(new Date());
  const ontem = startOfDay(new Date(new Date().setDate(new Date().getDate() - 1)));

  const vencidos = useMemo(() => {
    const today = startOfDay(new Date());
    return (cobrancas || [])
      .filter((c) => {
        const raw = String((c as any).status || '').toLowerCase();
        const norm = normalizeStatusValue((c as any).status);
        const isVencida = raw.includes('vencid') || norm === 'em_atraso' || (c as any)._effectiveStatus === 'em_atraso';
        if (!isVencida) return false;
        // garantir que não está paga
        const isPaid = normalizeStatusValue((c as any).status) === 'paga' || Boolean(getPaymentDate(c)) || Boolean((c as any).valorTotalPago) || Boolean((c as any).valor_pago);
        if (isPaid) return false;
        // se tiver vencimento, deve ser anterior a hoje
        const due = getDueDate(c);
        if (!due) return true;
        return startOfDay(due) < today;
      })
      .map((c) => {
        const due = getDueDate(c);
        const diff = due ? Math.max(0, Math.floor((startOfDay(new Date()).getTime() - startOfDay(due).getTime()) / (1000 * 60 * 60 * 24))) : 0;
        return { cobranca: c, due, diasAtraso: diff };
      })
      .sort((a, b) => (b.diasAtraso - a.diasAtraso) || (getChargeValue(b.cobranca) - getChargeValue(a.cobranca)));
  }, [cobrancas]);

  const pagosHoje = useMemo(() => {
    return (cobrancas || [])
      .filter((c) => {
        const pay = getPaymentDate(c);
        if (!pay) return false;
        return isSameDay(startOfDay(pay), hoje);
      })
      .sort((a, b) => getPaidValue(b) - getPaidValue(a));
  }, [cobrancas, hoje]);

  const pagosSelecionado = useMemo(() => {
    return (cobrancas || [])
      .filter((c) => {
        const pay = getPaymentDate(c);
        if (!pay) return false;
        return isSameDay(startOfDay(pay), selectedDate);
      })
      .sort((a, b) => getPaidValue(b) - getPaidValue(a));
  }, [cobrancas, selectedDate]);

  const totalVencido = useMemo(() => vencidos.reduce((acc, v) => acc + getChargeValue(v.cobranca), 0), [vencidos]);
  const totalHoje = useMemo(() => pagosHoje.reduce((acc, c) => acc + getPaidValue(c), 0), [pagosHoje]);
  const totalSelecionado = useMemo(() => pagosSelecionado.reduce((acc, c) => acc + getPaidValue(c), 0), [pagosSelecionado]);

  const whatsappText = useMemo(() => {
    const lines: string[] = [];
    lines.push(`*Resumo Financeiro — MV Locadora*`);
    lines.push(`Data: *${formatDateBR(new Date())}*`);
    lines.push(`Pagos (data selecionada): *${formatDateBR(selectedDate)}*`);
    lines.push('');
    lines.push(`*TOTAIS*`);
    lines.push(`• Total vencido: *${currency.format(totalVencido)}* (${vencidos.length})`);
    lines.push(`• Total recebido hoje: *${currency.format(totalHoje)}* (${pagosHoje.length})`);
    lines.push(`• Total recebido na data: *${currency.format(totalSelecionado)}* (${pagosSelecionado.length})`);
    lines.push('');

    lines.push(`*VENCIDOS*`);
    if (vencidos.length === 0) {
      lines.push(`• Nenhuma cobrança vencida.`);
    } else {
      for (const v of vencidos) {
        const nome = outField((v.cobranca as any).cliente_nome);
        const valor = currency.format(getChargeValue(v.cobranca));
        const venc = formatDateBR(v.due);
        lines.push(`• ${nome} — ${valor} — venc: ${venc} — ${v.diasAtraso}d atraso`);
      }
    }
    lines.push('');

    lines.push(`*PAGOS (${formatDateBR(selectedDate)})*`);
    if (pagosSelecionado.length === 0) {
      lines.push(`• Nenhum pagamento na data.`);
    } else {
      for (const c of pagosSelecionado) {
        const nome = outField((c as any).cliente_nome);
        const valor = currency.format(getPaidValue(c));
        lines.push(`• ${nome} — ${valor}`);
      }
    }

    return lines.join('\n');
  }, [
    selectedDate,
    totalVencido,
    totalHoje,
    totalSelecionado,
    vencidos,
    pagosHoje.length,
    pagosSelecionado,
  ]);

  const handleCopyWhatsApp = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(whatsappText);
      } else {
        // Fallback (casos antigos/sem permissão)
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
    if (!resumoRef.current) return;
    setExportingPdf(true);
    try {
      const [{ default: html2canvas }, jspdfModule] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);

      const { jsPDF } = jspdfModule as any;

      const element = resumoRef.current;
      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Converter px -> mm mantendo proporção
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

      const dataStr = toInputDateValue(new Date());
      pdf.save(`resumo-cobrancas-${dataStr}.pdf`);
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

  const listItem: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    padding: '10px 0',
    borderBottom: '1px solid var(--border-primary)',
  };

  const nameStyle: React.CSSProperties = { fontWeight: 600, color: 'var(--text-primary)' };
  const mutedStyle: React.CSSProperties = { fontSize: '12px', color: 'var(--text-secondary)' };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Resumo Financeiro"
      size="xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={exportingPdf}>
            Fechar
          </Button>
          <Button
            variant="secondary"
            onClick={handleCopyWhatsApp}
            disabled={exportingPdf}
          >
            {copyStatus === 'copied' ? 'Copiado!' : copyStatus === 'error' ? 'Falhou ao copiar' : 'Copiar (WhatsApp)'}
          </Button>
          <Button onClick={handleExportPdf} loading={exportingPdf}>
            Exportar PDF
          </Button>
        </>
      }
    >
      <div ref={resumoRef} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Totais */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '12px' }}>
          <div style={{ ...cardBase, borderColor: 'var(--color-error-200)', background: 'linear-gradient(180deg, var(--color-error-50), var(--surface-primary))' }}>
            <div style={{ ...sectionTitleStyle, color: 'var(--color-error-700)' }}>TOTAL VENCIDO</div>
            <div style={{ fontSize: '22px', fontWeight: 800, marginTop: '8px', color: 'var(--color-error-700)' }}>
              {currency.format(totalVencido)}
            </div>
            <div style={mutedStyle}>{vencidos.length} cobrança(s) vencida(s)</div>
          </div>

          <div style={{ ...cardBase, borderColor: 'var(--color-success-200)', background: 'linear-gradient(180deg, var(--color-success-50), var(--surface-primary))' }}>
            <div style={{ ...sectionTitleStyle, color: 'var(--color-success-700)' }}>TOTAL RECEBIDO HOJE</div>
            <div style={{ fontSize: '22px', fontWeight: 800, marginTop: '8px', color: 'var(--color-success-700)' }}>
              {currency.format(totalHoje)}
            </div>
            <div style={mutedStyle}>{pagosHoje.length} pagamento(s) hoje</div>
          </div>

          <div style={{ ...cardBase, borderColor: 'var(--color-primary-200)', background: 'linear-gradient(180deg, rgba(37,99,235,0.08), var(--surface-primary))' }}>
            <div style={{ ...sectionTitleStyle, color: 'var(--color-primary-700)' }}>TOTAL RECEBIDO NA DATA</div>
            <div style={{ fontSize: '22px', fontWeight: 800, marginTop: '8px', color: 'var(--color-primary-700)' }}>
              {currency.format(totalSelecionado)}
            </div>
            <div style={mutedStyle}>Data: {formatDateBR(selectedDate)}</div>
          </div>
        </div>

        {/* Filtro de data */}
        <div style={{ ...cardBase }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
            <div>
              <div style={sectionTitleStyle}>FILTRO DE DATA</div>
              <div style={mutedStyle}>Atualiza a lista de pagamentos pela data selecionada</div>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <Button
                variant={isSameDay(selectedDate, hoje) ? 'primary' : 'secondary'}
                onClick={() => setSelectedDate(hoje)}
              >
                Hoje
              </Button>
              <Button
                variant={isSameDay(selectedDate, ontem) ? 'primary' : 'secondary'}
                onClick={() => setSelectedDate(ontem)}
              >
                Ontem
              </Button>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ ...mutedStyle, marginLeft: '4px' }}>Selecionar data</span>
                <input
                  type="date"
                  value={toInputDateValue(selectedDate)}
                  onChange={(e) => {
                    const dt = parseInputDateLocal(e.target.value);
                    if (dt) setSelectedDate(startOfDay(dt));
                  }}
                  style={{
                    height: '40px',
                    padding: '0 12px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-primary)',
                    backgroundColor: 'var(--surface-primary)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Vencidos + Pagos */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
          {/* VENCIDOS */}
          <div style={{ ...cardBase, borderColor: 'var(--color-error-200)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px' }}>
              <div>
                <div style={{ ...sectionTitleStyle, color: 'var(--color-error-700)' }}>VENCIDOS</div>
                <div style={mutedStyle}>Status “Vencida” / em atraso</div>
              </div>
              <div style={{ ...mutedStyle, fontWeight: 700 }}>{vencidos.length}</div>
            </div>

            <div style={{ marginTop: '12px' }}>
              {vencidos.length === 0 ? (
                <div style={mutedStyle}>Nenhuma cobrança vencida encontrada.</div>
              ) : (
                <div style={{ maxHeight: '42vh', overflow: 'auto', paddingRight: '6px' }}>
                  {vencidos.map(({ cobranca, due, diasAtraso }) => (
                    <div key={cobranca.id} style={listItem}>
                      <div style={{ minWidth: 0 }}>
                        <div style={nameStyle}>{outField((cobranca as any).cliente_nome)}</div>
                        <div style={mutedStyle}>
                          Venc.: {formatDateBR(due)} • {diasAtraso} dia(s) em atraso
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 800, color: 'var(--color-error-700)' }}>
                        {currency.format(getChargeValue(cobranca))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* PAGOS */}
          <div style={{ ...cardBase, borderColor: 'var(--color-success-200)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px' }}>
              <div>
                <div style={{ ...sectionTitleStyle, color: 'var(--color-success-700)' }}>PAGOS HOJE</div>
                <div style={mutedStyle}>{formatDateBR(selectedDate)} (pela data selecionada)</div>
              </div>
              <div style={{ ...mutedStyle, fontWeight: 700 }}>{pagosSelecionado.length}</div>
            </div>

            <div style={{ marginTop: '12px' }}>
              {pagosSelecionado.length === 0 ? (
                <div style={mutedStyle}>Nenhum pagamento encontrado na data.</div>
              ) : (
                <div style={{ maxHeight: '42vh', overflow: 'auto', paddingRight: '6px' }}>
                  {pagosSelecionado.map((c) => (
                    <div key={c.id} style={listItem}>
                      <div style={{ minWidth: 0 }}>
                        <div style={nameStyle}>{outField((c as any).cliente_nome)}</div>
                        <div style={mutedStyle}>Pago em: {formatDateBR(getPaymentDate(c))}</div>
                      </div>
                      <div style={{ textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 800, color: 'var(--color-success-700)' }}>
                        {currency.format(getPaidValue(c))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

