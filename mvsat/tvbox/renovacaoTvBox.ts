import { getDb } from '../config/database.config';
import { doc, runTransaction, serverTimestamp, increment, arrayUnion } from 'firebase/firestore';
import { tenantConfigDoc, tenantDoc } from '../shared/saas/firestoreTenant';

type RenovacaoResult = {
  ok: true;
  competencia: string;
  ultimoPagamentoEm: Date;
  proximoVencimento: Date;
  creditoConsumido: boolean;
  duplicada: boolean;
} | {
  ok: false;
  error: string;
};

export const TVBOX_RENEWAL_EXPENSE_VALUE = 10.00;

function formatCompetenciaFromDateBelem(date: Date): string {
  // YYYY-MM da data informada considerando America/Belem
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Belem',
    year: 'numeric',
    month: '2-digit'
  }).format(date);
}

function computeNextDueDateMonthOverflow(currentDue: Date, baseDay: number): Date {
  // Renovação baseada no próximo mês mantendo o dia, com overflow automático
  const year = currentDue.getUTCFullYear();
  const month = currentDue.getUTCMonth();
  return new Date(Date.UTC(year, month + 1, baseDay, 12, 0, 0));
}

function addMonthsToCompetencia(baseCompetencia: string, offset: number): string {
  const [yearStr, monthStr] = baseCompetencia.split('-');
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;
  const baseDate = new Date(Date.UTC(year, monthIndex + offset, 1, 12, 0, 0));
  return formatCompetenciaFromDateBelem(baseDate);
}

function computeDueDateForCompetencia(competencia: string, baseDay: number): Date {
  const [yearStr, monthStr] = competencia.split('-');
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;
  return new Date(Date.UTC(year, monthIndex, baseDay, 12, 0, 0));
}

function updateMonthEntry(entry: any, competencia: string, vencimento: Date): any {
  if (typeof entry === 'string') {
    return competencia;
  }
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    return entry;
  }
  const updated = { ...entry };
  if ('competencia' in updated) updated.competencia = competencia;
  else if ('mes' in updated) updated.mes = competencia;
  else if ('mesAno' in updated) updated.mesAno = competencia;
  else if ('mes_ano' in updated) updated.mes_ano = competencia;
  else if ('mesReferencia' in updated) updated.mesReferencia = competencia;
  else if ('mes_referencia' in updated) updated.mes_referencia = competencia;
  else if ('monthYear' in updated) updated.monthYear = competencia;

  if ('dataVencimento' in updated) updated.dataVencimento = vencimento;
  else if ('vencimento' in updated) updated.vencimento = vencimento;
  else if ('data' in updated && (updated.data instanceof Date || updated.data?.toDate)) updated.data = vencimento;
  return updated;
}

function rebuildProjectionMonths(existing: any[], baseCompetencia: string, baseDay: number, defaultCount = 12): any[] {
  const existingArray = Array.isArray(existing) ? existing : [];
  const count = existingArray.length > 0 ? existingArray.length : defaultCount;
  const hasObjectEntry = existingArray.some((item) => item && typeof item === 'object' && !Array.isArray(item));
  const template = hasObjectEntry
    ? existingArray.find((item) => item && typeof item === 'object' && !Array.isArray(item))
    : null;
  const result: any[] = [];

  for (let i = 0; i < count; i += 1) {
    const competencia = addMonthsToCompetencia(baseCompetencia, i);
    const vencimento = computeDueDateForCompetencia(competencia, baseDay);
    if (hasObjectEntry) {
      const baseEntry = existingArray[i] && typeof existingArray[i] === 'object' && !Array.isArray(existingArray[i])
        ? existingArray[i]
        : (template ? { ...template } : {});
      result.push(updateMonthEntry(baseEntry, competencia, vencimento));
    } else {
      result.push(competencia);
    }
  }

  return result;
}

export async function renovarTvBox(assinaturaId: string): Promise<RenovacaoResult> {
  const db = getDb();
  const assinaturaRef = tenantDoc(db, 'tvbox_assinaturas', assinaturaId);
  const creditosRef = tenantConfigDoc(db, 'creditos_tvbox');

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

      const competencia = formatCompetenciaFromDateBelem(vencimentoAtualEmUTC);

      // ID determinístico para evitar duplicidade por competência
      const despesaId = `ASSINATURA_TVBOX__${assinaturaId}__${competencia}`;
      const despesaRef = tenantDoc(db, 'despesas', despesaId);

      const despesaSnap = await tx.get(despesaRef);
      if (despesaSnap.exists()) {
        // Já existe despesa nesta competência: sincronizar vencimento sem consumir crédito.
        const existente = despesaSnap.data() as any;
        const ultimoPagamentoEm: Date = existente?.dataPagamento?.toDate
          ? existente.dataPagamento.toDate()
          : (existente?.dataPagamento ? new Date(existente.dataPagamento) : vencimentoAtualEmUTC);

        const proximoVencimentoUTC = computeNextDueDateMonthOverflow(vencimentoAtualEmUTC, vencimentoDia);

        // Atualizar meses atuais e futuros (projeção)
        const camposMeses = ['meses', 'competencias', 'projecao', 'projecao_meses'];
        const camposExistentes = camposMeses.filter((campo) => Array.isArray((assinatura as any)[campo]));
        const camposParaAtualizar = camposExistentes.length > 0 ? camposExistentes : ['meses'];
        const mesesAtualizados: Record<string, any> = {};
        for (const campo of camposParaAtualizar) {
          const existentes = Array.isArray((assinatura as any)[campo]) ? (assinatura as any)[campo] : [];
          mesesAtualizados[campo] = rebuildProjectionMonths(existentes, competencia, vencimentoDia);
        }

        // Sincronizar assinatura para o próximo vencimento
        tx.update(assinaturaRef, {
          ultimo_pagamento_em: ultimoPagamentoEm,
          data_renovacao: proximoVencimentoUTC,
          status: 'ativa',
          ...mesesAtualizados,
          updatedAt: serverTimestamp()
        });

        return {
          competencia,
          ultimoPagamentoEm,
          proximoVencimento: proximoVencimentoUTC,
          creditoConsumido: false,
          duplicada: false
        };
      }

      const creditosSnap = await tx.get(creditosRef);
      const creditosDisponiveis = creditosSnap.exists()
        ? Number((creditosSnap.data() as any)?.disponiveis ?? 0)
        : 0;
      if (!Number.isFinite(creditosDisponiveis) || creditosDisponiveis <= 0) {
        throw new Error('SEM_CREDITO');
      }

      // Criar despesa paga de R$10,00
      const dataPagamento = new Date();
      const despesaDoc = {
        origemTipo: 'ASSINATURA_TVBOX',
        origemId: assinaturaId,
        descricao: `Renovação TV Box — login ${login}`,
        origemNome: login,
        valor: TVBOX_RENEWAL_EXPENSE_VALUE,
        competencia: competencia, // YYYY-MM (America/Belem)
        dataVencimento: vencimentoAtualEmUTC, // igual ao valor atual (fixado 12:00 UTC)
        dataPagamento: dataPagamento, // agora (UTC)
        status: 'PAGO',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      tx.set(despesaRef, despesaDoc);

      // Calcular próximo vencimento mantendo o mesmo dia base
      const proximoVencimentoUTC = computeNextDueDateMonthOverflow(vencimentoAtualEmUTC, vencimentoDia);

      // Atualizar meses atuais e futuros (projeção)
      const camposMeses = ['meses', 'competencias', 'projecao', 'projecao_meses'];
      const camposExistentes = camposMeses.filter((campo) => Array.isArray((assinatura as any)[campo]));
      const camposParaAtualizar = camposExistentes.length > 0 ? camposExistentes : ['meses'];
      const mesesAtualizados: Record<string, any> = {};
      for (const campo of camposParaAtualizar) {
        const existentes = Array.isArray((assinatura as any)[campo]) ? (assinatura as any)[campo] : [];
        mesesAtualizados[campo] = rebuildProjectionMonths(existentes, competencia, vencimentoDia);
      }

      // Atualizar assinatura
      tx.update(assinaturaRef, {
        ultimo_pagamento_em: dataPagamento,
        data_renovacao: proximoVencimentoUTC,
        status: 'ativa',
        ...mesesAtualizados,
        updatedAt: serverTimestamp()
      });

      // Consumir crédito somente após salvar a renovação
      tx.set(
        creditosRef,
        {
          disponiveis: increment(-1),
          historico: arrayUnion({
            quantidade: -1,
            data: Date.now(),
            origem: 'renovacao_tvbox',
            assinaturaId,
            competencia
          })
        },
        { merge: true }
      );

      return {
        competencia,
        ultimoPagamentoEm: dataPagamento,
        proximoVencimento: proximoVencimentoUTC,
        creditoConsumido: true,
        duplicada: false
      };
    });

    return { ok: true, ...result } as RenovacaoResult;
  } catch (e: any) {
    if (e?.message === 'SEM_CREDITO') {
      return { ok: false, error: 'SEM_CREDITO' };
    }
    return { ok: false, error: e?.message || 'Falha na renovação' };
  }
}

export function formatDateBelem(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Belem' }).format(date);
}


