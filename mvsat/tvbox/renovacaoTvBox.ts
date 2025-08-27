import { getDb } from '../config/database.config';
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';

type RenovacaoResult = {
  ok: true;
  competencia: string;
  ultimoPagamentoEm: Date;
  proximoVencimento: Date;
} | {
  ok: false;
  error: string;
};

function formatCompetenciaFromNowBelem(now: Date = new Date()): string {
  // Extrai ano e mês considerando America/Belem para a competência
  const belem = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Belem', year: 'numeric', month: '2-digit' }).format(now);
  // en-CA => YYYY-MM
  return belem;
}

function computeNextDueDateKeepingDay(currentDue: Date, baseDay: number): Date {
  // Sempre usar o dia base original, independente do dia atual
  const currentYear = currentDue.getUTCFullYear();
  const currentMonth = currentDue.getUTCMonth();

  // Avançar para o próximo mês
  let nextMonth = currentMonth + 1;
  let nextYear = currentYear;
  if (nextMonth > 11) {
    nextMonth = 0;
    nextYear += 1;
  }

  // Usar sempre o dia base original, ajustando apenas se exceder o último dia do mês
  const lastDayNextMonth = new Date(Date.UTC(nextYear, nextMonth + 1, 0)).getUTCDate();
  const day = Math.min(baseDay, lastDayNextMonth);

  // Hora 12:00 UTC para evitar regressão de data ao formatar em America/Belem (-03:00)
  return new Date(Date.UTC(nextYear, nextMonth, day, 12, 0, 0));
}

export async function renovarTvBox(assinaturaId: string): Promise<RenovacaoResult> {
  const db = getDb();
  const assinaturaRef = doc(db, 'tvbox_assinaturas', assinaturaId);

  try {
    const result = await runTransaction(db, async (tx) => {
      const assinaturaSnap = await tx.get(assinaturaRef);
      if (!assinaturaSnap.exists()) {
        throw new Error('Assinatura não encontrada');
      }
      const assinatura = assinaturaSnap.data() as any;

      const login: string = assinatura.login || '';
      const vencimentoDia: number = assinatura.dia_vencimento;
      const vencimentoAtualEmRaw: any = assinatura.data_renovacao; // Firestore Timestamp ou Date
      
      if (typeof vencimentoDia !== 'number' || vencimentoDia < 1 || vencimentoDia > 31) {
        throw new Error('Dia de vencimento inválido ou ausente');
      }
      if (!vencimentoAtualEmRaw) {
        throw new Error('Vencimento atual não definido');
      }

      const vencimentoAtualEm = vencimentoAtualEmRaw.toDate ? vencimentoAtualEmRaw.toDate() : new Date(vencimentoAtualEmRaw);
      // Normalizar para UTC (zerar hora)
      // Normalizar com hora 12:00 UTC para evitar regressão de data por fuso
      const vencimentoAtualEmUTC = new Date(Date.UTC(
        vencimentoAtualEm.getUTCFullYear(),
        vencimentoAtualEm.getUTCMonth(),
        vencimentoAtualEm.getUTCDate(),
        12, 0, 0
      ));

      const agora = new Date();
      const competencia = formatCompetenciaFromNowBelem(agora);

      // ID determinístico para evitar duplicidade por competência
      const despesaId = `ASSINATURA_TVBOX__${assinaturaId}__${competencia}`;
      const despesaRef = doc(db, 'despesas', despesaId);

      const despesaSnap = await tx.get(despesaRef);
      if (despesaSnap.exists()) {
        throw new Error('Já existe baixa nesta competência');
      }

      // Criar despesa paga de R$10,00
      const dataPagamento = new Date();
      const despesaDoc = {
        origemTipo: 'ASSINATURA_TVBOX',
        origemId: assinaturaId,
        descricao: `Renovação TV Box — login ${login}`,
        valor: 10.00,
        competencia: competencia, // YYYY-MM (America/Belem)
        dataVencimento: vencimentoAtualEmUTC, // igual ao valor atual (fixado 12:00 UTC)
        dataPagamento: dataPagamento, // agora (UTC)
        status: 'PAGO',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      tx.set(despesaRef, despesaDoc);

      // Calcular próximo vencimento mantendo o mesmo dia base
      const proximoVencimentoUTC = computeNextDueDateKeepingDay(vencimentoAtualEmUTC, vencimentoDia);

      // Atualizar assinatura
      tx.update(assinaturaRef, {
        ultimo_pagamento_em: dataPagamento,
        data_renovacao: proximoVencimentoUTC,
        updatedAt: serverTimestamp()
      });

      return {
        competencia,
        ultimoPagamentoEm: dataPagamento,
        proximoVencimento: proximoVencimentoUTC
      };
    });

    return { ok: true, ...result } as RenovacaoResult;
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Falha na renovação' };
  }
}

export function formatDateBelem(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Belem' }).format(date);
}


