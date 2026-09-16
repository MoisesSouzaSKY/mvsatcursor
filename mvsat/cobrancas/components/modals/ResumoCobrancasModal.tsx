import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from '../../../shared/components/ui/Modal';
import { Button } from '../../../shared/components/ui/Button';
import { OptimizedCobranca, normalizeStatusValue } from '../../utils/dataProcessing';
import { listarPagamentosDaData } from '../../services/cobrancasReadService';
import './CobrancasModals.css';
import { asCivilPaymentDate } from '../../../shared/utils/civilDate';
import {
  cobrancaActionLabel,
  filterLogsByDate,
  formatAuditDateTime,
  formatAuditWhatsApp,
  listCobrancaAuditLogs,
  writeCobrancaAudit,
  type CobrancaAuditLog,
} from '../../services/cobrancasAuditService';

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
    asPaymentDate((c as any).pagoEm) ||
    asPaymentDate((c as any).data_pagamento) ||
    asPaymentDate((c as any).dataPagamento) ||
    asPaymentDate((c as any).pago_em) ||
    asPaymentDate((c as any).dataOriginalPagamento)
  );
}

function asPaymentDate(value: any): Date | null {
  return asCivilPaymentDate(value);
}

function getPaidValue(c: OptimizedCobranca): number {
  const v = Number((c as any).valorTotalPago ?? (c as any).valor_pago ?? (c as any).valor ?? 0);
  return Number.isFinite(v) ? v : 0;
}

function getChargeValue(c: OptimizedCobranca): number {
  const v = Number((c as any).valor ?? 0);
  return Number.isFinite(v) ? v : 0;
}

function getPaymentMethod(c: OptimizedCobranca) {
  const value = String((c as any).formaPagamento || '').trim();
  return value || null;
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
  const [paymentRows, setPaymentRows] = useState<OptimizedCobranca[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [activityLogs, setActivityLogs] = useState<CobrancaAuditLog[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [includeHistory, setIncludeHistory] = useState(true);

  // Resetar data ao abrir (atualiza automaticamente ao abrir)
  useEffect(() => {
    if (open) {
      setSelectedDate(startOfDay(new Date()));
      setCopyStatus('idle');
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    const loadPayments = async () => {
      setPaymentsLoading(true);
      try {
        const dates = [startOfDay(new Date()), selectedDate];
        const uniqueDates = dates.filter((date, index) => index === dates.findIndex((item) => isSameDay(item, date)));
        const results = await Promise.all(uniqueDates.map((date) => listarPagamentosDaData(date)));
        if (active) setPaymentRows(results.flat() as OptimizedCobranca[]);
      } catch (error) {
        console.error('Erro ao carregar pagamentos do resumo:', error);
        if (active) setPaymentRows([]);
      } finally {
        if (active) setPaymentsLoading(false);
      }
    };
    loadPayments();
    return () => { active = false; };
  }, [open, selectedDate]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    const loadHistory = async () => {
      setActivityLoading(true);
      try {
        const logs = await listCobrancaAuditLogs(300);
        if (active) setActivityLogs(logs);
      } catch (error) {
        console.error('Erro ao carregar histórico de cobranças:', error);
        if (active) setActivityLogs([]);
      } finally {
        if (active) setActivityLoading(false);
      }
    };
    loadHistory();
    return () => { active = false; };
  }, [open, selectedDate]);

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
    return paymentRows
      .filter((c) => {
        const pay = getPaymentDate(c);
        if (!pay) return false;
        return isSameDay(startOfDay(pay), hoje);
      })
      .sort((a, b) => getPaidValue(b) - getPaidValue(a));
  }, [paymentRows, hoje]);

  const pagosSelecionado = useMemo(() => {
    return paymentRows
      .filter((c) => {
        const pay = getPaymentDate(c);
        if (!pay) return false;
        return isSameDay(startOfDay(pay), selectedDate);
      })
      .sort((a, b) => getPaidValue(b) - getPaidValue(a));
  }, [paymentRows, selectedDate]);

  const totalVencido = useMemo(() => vencidos.reduce((acc, v) => acc + getChargeValue(v.cobranca), 0), [vencidos]);
  const totalHoje = useMemo(() => pagosHoje.reduce((acc, c) => acc + getPaidValue(c), 0), [pagosHoje]);
  const totalSelecionado = useMemo(() => pagosSelecionado.reduce((acc, c) => acc + getPaidValue(c), 0), [pagosSelecionado]);
  const dayLogs = useMemo(() => filterLogsByDate(activityLogs, selectedDate), [activityLogs, selectedDate]);

  const whatsappText = useMemo(() => {
    const lines: string[] = [];
    lines.push(`*MV SAT | RESUMO DE COBRANÇAS*`);
    lines.push(`📅 *${formatDateBR(selectedDate)}*`);
    lines.push('');
    lines.push(`*RESUMO FINANCEIRO*`);
    lines.push(`🔴 Em atraso: *${currency.format(totalVencido)}*`);
    lines.push(`   ${vencidos.length} cobranças vencidas`);
    lines.push(`🟢 Recebido hoje: *${currency.format(totalHoje)}*`);
    lines.push(`   ${pagosHoje.length} pagamentos`);
    lines.push(`🔵 Recebido em ${formatDateBR(selectedDate)}: *${currency.format(totalSelecionado)}*`);
    lines.push(`   ${pagosSelecionado.length} pagamentos`);
    lines.push('');

    lines.push(`*COBRANÇAS VENCIDAS — ${vencidos.length}*`);
    lines.push(`Total: *${currency.format(totalVencido)}*`);
    if (vencidos.length === 0) {
      lines.push(`Nenhuma cobrança vencida.`);
    } else {
      for (const v of vencidos) {
        const nome = outField((v.cobranca as any).cliente_nome);
        const valor = currency.format(getChargeValue(v.cobranca));
        const venc = formatDateBR(v.due);
        lines.push(`🔴 *${nome}*`);
        lines.push(`${valor} • venc. ${venc} • ${v.diasAtraso} dias em atraso`);
      }
    }
    lines.push('');

    lines.push(`*RECEBIMENTOS — ${formatDateBR(selectedDate)}*`);
    lines.push(`Total: *${currency.format(totalSelecionado)}* • ${pagosSelecionado.length} pagamentos`);
    if (pagosSelecionado.length === 0) {
      lines.push(`Nenhum pagamento registrado nesta data.`);
    } else {
      for (const c of pagosSelecionado) {
        const nome = outField((c as any).cliente_nome);
        const valor = currency.format(getPaidValue(c));
        const method = getPaymentMethod(c);
        lines.push(`✅ *${nome}*`);
        lines.push(`${valor}${method ? ` • ${method}` : ''}`);
      }
    }
    lines.push('');
    if (includeHistory) {
      lines.push(formatAuditWhatsApp(dayLogs, formatDateBR(selectedDate)));
      lines.push('');
    }
    lines.push(`Gerado pelo MV SAT`);

    return lines.join('\n');
  }, [
    selectedDate,
    totalVencido,
    totalHoje,
    totalSelecionado,
    vencidos,
    pagosHoje.length,
    pagosSelecionado,
    includeHistory,
    dayLogs,
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
      await writeCobrancaAudit({
        action: 'COBRANCA_COPY_WHATSAPP',
        summary: `Resumo de cobranças copiado para WhatsApp (${formatDateBR(selectedDate)})${includeHistory ? ` com ${dayLogs.length} movimentação(ões)` : ''}.`,
      });
    } catch (e) {
      console.error('Erro ao copiar para área de transferência:', e);
      setCopyStatus('error');
      window.setTimeout(() => setCopyStatus('idle'), 2500);
    }
  };

  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      const jspdfModule = await import('jspdf');
      const { jsPDF } = jspdfModule as any;
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 16;
      let y = 18;
      const addPageIfNeeded = (height = 8) => {
        if (y + height <= pageHeight - 18) return;
        pdf.addPage();
        y = 18;
      };
      const money = (value: number) => currency.format(value);
      const drawHeader = () => {
        pdf.setTextColor(16, 42, 67);
        pdf.setFontSize(18);
        pdf.setFont('helvetica', 'bold');
        pdf.text('MV SAT', margin, y);
        y += 8;
        pdf.setFontSize(13);
        pdf.text('RELATÓRIO DE COBRANÇAS', margin, y);
        y += 6;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(98, 125, 152);
        pdf.text('Resumo financeiro e acompanhamento de recebimentos', margin, y);
        y += 6;
        pdf.text(`Data de referência: ${formatDateBR(selectedDate)}   •   Gerado em: ${formatDateBR(new Date())}`, margin, y);
        y += 10;
      };
      const drawKpi = (x: number, label: string, value: string, detail: string, color: [number, number, number]) => {
        pdf.setFillColor(248, 250, 252);
        pdf.setDrawColor(229, 234, 240);
        pdf.roundedRect(x, y, 56, 25, 3, 3, 'FD');
        pdf.setTextColor(...color);
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'bold');
        pdf.text(label, x + 4, y + 6);
        pdf.setFontSize(13);
        pdf.text(value, x + 4, y + 14);
        pdf.setTextColor(98, 125, 152);
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'normal');
        pdf.text(detail, x + 4, y + 20);
      };
      const drawFooter = () => {
        const pages = pdf.getNumberOfPages();
        for (let index = 1; index <= pages; index += 1) {
          pdf.setPage(index);
          pdf.setDrawColor(229, 234, 240);
          pdf.line(margin, pageHeight - 13, pageWidth - margin, pageHeight - 13);
          pdf.setTextColor(130, 154, 177);
          pdf.setFontSize(8);
          pdf.text('MV SAT • Relatório de Cobranças', margin, pageHeight - 7);
          pdf.text(`Página ${index} de ${pages}`, pageWidth - margin - 26, pageHeight - 7);
        }
      };

      drawHeader();
      drawKpi(margin, 'TOTAL VENCIDO', money(totalVencido), `${vencidos.length} cobranças`, [185, 28, 28]);
      drawKpi(margin + 61, 'RECEBIDO HOJE', money(totalHoje), `${pagosHoje.length} pagamentos`, [21, 128, 61]);
      drawKpi(margin + 122, 'RECEBIDO NA DATA', money(totalSelecionado), `${pagosSelecionado.length} pagamentos`, [37, 99, 235]);
      y += 34;

      pdf.setTextColor(36, 59, 83);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('RESUMO EXECUTIVO', margin, y);
      y += 7;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      [
        `Cobranças vencidas: ${vencidos.length}`,
        `Valor vencido: ${money(totalVencido)}`,
        `Maior atraso: ${vencidos[0]?.diasAtraso || 0} dias`,
        `Pagamentos na data: ${pagosSelecionado.length}`,
        `Recebido na data: ${money(totalSelecionado)}`
      ].forEach((line) => { pdf.text(line, margin, y); y += 5; });
      y += 5;

      const drawTable = (title: string, headers: string[], rows: string[][], empty: string) => {
        addPageIfNeeded(22);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        pdf.setTextColor(36, 59, 83);
        pdf.text(title, margin, y);
        y += 7;
        const positions = [margin, margin + 72, margin + 112, margin + 150];
        const drawTableHeader = () => {
          pdf.setFillColor(239, 246, 255);
          pdf.rect(margin, y - 4, pageWidth - margin * 2, 8, 'F');
          pdf.setFontSize(8);
          pdf.setTextColor(72, 101, 129);
          pdf.setFont('helvetica', 'bold');
          headers.forEach((header, index) => pdf.text(header, positions[index], y));
          y += 9;
        };
        drawTableHeader();
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(36, 59, 83);
        if (!rows.length) {
          pdf.text(empty, margin, y);
          y += 8;
          return;
        }
        rows.forEach((row) => {
          if (y + 8 > pageHeight - 18) {
            pdf.addPage();
            y = 18;
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(10);
            pdf.setTextColor(36, 59, 83);
            pdf.text(`${title} (continuação)`, margin, y);
            y += 7;
            drawTableHeader();
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(36, 59, 83);
          }
          row.forEach((value, index) => pdf.text(String(value).slice(0, index === 0 ? 32 : 22), positions[index], y));
          y += 7;
          pdf.setDrawColor(237, 241, 245);
          pdf.line(margin, y - 4, pageWidth - margin, y - 4);
        });
        y += 3;
      };

      drawTable('COBRANÇAS VENCIDAS', ['Cliente', 'Vencimento', 'Atraso', 'Valor'], vencidos.map(({ cobranca, due, diasAtraso }) => [
        outField((cobranca as any).cliente_nome),
        formatDateBR(due),
        `${diasAtraso} dias`,
        money(getChargeValue(cobranca))
      ]), 'Nenhuma cobrança vencida encontrada.');
      drawTable(`RECEBIMENTOS — ${formatDateBR(selectedDate)}`, ['Cliente', 'Data', 'Método', 'Recebido'], pagosSelecionado.map((payment) => [
        outField((payment as any).cliente_nome),
        formatDateBR(getPaymentDate(payment)),
        getPaymentMethod(payment) || '—',
        money(getPaidValue(payment))
      ]), 'Nenhum pagamento registrado na data selecionada.');

      if (includeHistory) {
        addPageIfNeeded(24);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        pdf.setTextColor(36, 59, 83);
        pdf.text(`HISTÓRICO DE MOVIMENTAÇÕES — ${formatDateBR(selectedDate)}`, margin, y);
        y += 6;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(98, 125, 152);
        pdf.text(`${dayLogs.length} ação(ões) com funcionário, cobrança afetada e alterações`, margin, y);
        y += 8;
        if (!dayLogs.length) {
          pdf.setTextColor(36, 59, 83);
          pdf.text('Nenhuma movimentação registrada nesta data.', margin, y);
          y += 8;
        } else {
          dayLogs.forEach((log) => {
            const changeLines = log.changes.length
              ? log.changes.map((item) => `${item.label}: ${item.from} → ${item.to}`)
              : [log.summary || 'Sem detalhe adicional'];
            const blockHeight = 18 + changeLines.length * 4;
            addPageIfNeeded(blockHeight);
            pdf.setFillColor(248, 250, 252);
            pdf.roundedRect(margin, y - 4, pageWidth - margin * 2, blockHeight, 2, 2, 'F');
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(9);
            pdf.setTextColor(16, 42, 67);
            pdf.text(cobrancaActionLabel(log.action), margin + 3, y + 2);
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(8);
            pdf.setTextColor(72, 101, 129);
            pdf.text(`${formatAuditDateTime(log.timestamp)}  •  ${log.actorName}${log.actorEmail ? `  •  ${log.actorEmail}` : ''}`, margin + 3, y + 7);
            pdf.setTextColor(36, 59, 83);
            pdf.text(`Cobrança: ${String(log.targetName || 'Não informada').slice(0, 70)}`, margin + 3, y + 12);
            changeLines.forEach((line, index) => {
              pdf.setTextColor(55, 75, 95);
              pdf.text(String(line).slice(0, 95), margin + 3, y + 17 + index * 4);
            });
            y += blockHeight + 3;
          });
        }
      }

      drawFooter();
      const dataStr = toInputDateValue(selectedDate);
      pdf.save(`MV-SAT-Resumo-Cobrancas-${dataStr}.pdf`);
      await writeCobrancaAudit({
        action: 'COBRANCA_EXPORT_PDF',
        summary: `PDF do resumo de cobranças exportado (${formatDateBR(selectedDate)})${includeHistory ? ` com ${dayLogs.length} movimentação(ões)` : ''}.`,
      });
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
      className="cobrancas-modal cobrancas-modal--summary"
      footer={
        <>
          <label className="summary-history-toggle">
            <input type="checkbox" checked={includeHistory} onChange={(event) => setIncludeHistory(event.target.checked)} />
            Incluir histórico no PDF e WhatsApp
          </label>
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
      <div ref={resumoRef} className="cobrancas-summary-report" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="summary-modal-intro">
          <div className="summary-modal-intro__icon">▣</div>
          <div>
            <h3>Resumo financeiro</h3>
            <p>Acompanhamento diário de cobranças e recebimentos</p>
            <small>Atualizado em {formatDateBR(new Date())}</small>
          </div>
        </div>
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
            <div style={mutedStyle}>{paymentsLoading ? 'Consultando pagamentos...' : `${pagosHoje.length} pagamento(s) hoje`}</div>
          </div>

          <div style={{ ...cardBase, borderColor: 'var(--color-primary-200)', background: 'linear-gradient(180deg, rgba(37,99,235,0.08), var(--surface-primary))' }}>
            <div style={{ ...sectionTitleStyle, color: 'var(--color-primary-700)' }}>TOTAL RECEBIDO NA DATA</div>
            <div style={{ fontSize: '22px', fontWeight: 800, marginTop: '8px', color: 'var(--color-primary-700)' }}>
              {currency.format(totalSelecionado)}
            </div>
            <div style={mutedStyle}>Data: {formatDateBR(selectedDate)}</div>
          </div>
        </div>

        <div className="summary-modal-secondary">
          <div><span>MAIOR ATRASO</span><strong>{vencidos[0]?.diasAtraso ? `${vencidos[0].diasAtraso} dias` : '—'}</strong></div>
          <div><span>TICKET MÉDIO RECEBIDO</span><strong>{pagosSelecionado.length ? currency.format(totalSelecionado / pagosSelecionado.length) : '—'}</strong></div>
          <div><span>MAIOR PAGAMENTO DO DIA</span><strong>{pagosSelecionado.length ? currency.format(Math.max(...pagosSelecionado.map(getPaidValue))) : '—'}</strong></div>
          <div><span>TOTAL DE PAGAMENTOS</span><strong>{pagosSelecionado.length || '—'}</strong></div>
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
              {paymentsLoading ? (
                <div style={mutedStyle}>Consultando pagamentos registrados...</div>
              ) : pagosSelecionado.length === 0 ? (
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

        <div style={{ ...cardBase, borderColor: '#c7d2fe' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px' }}>
            <div>
              <div style={{ ...sectionTitleStyle, color: '#3730a3' }}>HISTÓRICO DE MOVIMENTAÇÕES</div>
              <div style={mutedStyle}>Funcionário, data, ação, cobrança afetada e alterações</div>
            </div>
            <div style={{ ...mutedStyle, fontWeight: 700 }}>{dayLogs.length}</div>
          </div>
          <div style={{ marginTop: '12px' }}>
            {activityLoading ? (
              <div style={mutedStyle}>Carregando movimentações...</div>
            ) : dayLogs.length === 0 ? (
              <div style={mutedStyle}>Nenhuma movimentação registrada nesta data. Ações novas de criar, editar, pagar, excluir, copiar e exportar passam a aparecer aqui com o nome do funcionário.</div>
            ) : (
              <div className="summary-history-list">
                {dayLogs.map((log) => (
                  <article key={log.id} className="summary-history-item">
                    <div className="summary-history-item__head">
                      <strong>{cobrancaActionLabel(log.action)}</strong>
                      <span>{formatAuditDateTime(log.timestamp)}</span>
                    </div>
                    <p><b>Funcionário:</b> {log.actorName}{log.actorEmail ? ` • ${log.actorEmail}` : ''}</p>
                    <p><b>Cobrança:</b> {log.targetName || 'Não informada'}</p>
                    {log.changes.length ? (
                      <ul>
                        {log.changes.map((item) => (
                          <li key={`${log.id}-${item.field}`}>{item.label}: {item.from} → {item.to}</li>
                        ))}
                      </ul>
                    ) : (
                      <p>{log.summary}</p>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

