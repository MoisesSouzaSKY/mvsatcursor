import { getDb } from '../config/database.config';
import { addDoc, collection, doc, getDoc, getDocs, updateDoc, deleteDoc, query, where } from 'firebase/firestore';

export async function criarCobranca(payload: any) {
  const ref = await addDoc(collection(getDb(), 'cobrancas'), payload);
  const snap = await getDoc(ref);
  return { ok: true, id: ref.id, cobranca: snap.data() };
}

export async function listarCobrancas() {
  try {
    const db = getDb();
    const cobrancasRef = collection(db, 'cobrancas');
    const snap = await getDocs(cobrancasRef);
    
    const dados = snap.docs.map(d => {
      const docData = d.data();
      return { id: d.id, ...docData };
    });
    
    return dados;
  } catch (error) {
    console.error('Erro em listarCobrancas:', error);
    throw error;
  }
}

export async function atualizarCobranca(id: string, dados: any) {
  await updateDoc(doc(getDb(), 'cobrancas', id), { 
    ...dados, 
    data_atualizacao: new Date() 
  });
  const snap = await getDoc(doc(getDb(), 'cobrancas', id));
  return { ok: true, id, cobranca: snap.data() };
}

function getLastDayOfMonth(year: number, monthIndexZeroBased: number): number {
  // monthIndexZeroBased: 0..11
  return new Date(year, monthIndexZeroBased + 1, 0).getDate();
}

function computeNextDueDateKeepingDay(currentDue: Date): Date {
  console.log('🔍 [COMPUTE DATE] Calculando próxima data a partir de:', currentDue);
  
  // Validar entrada
  if (!currentDue || isNaN(currentDue.getTime())) {
    console.error('❌ [COMPUTE DATE] Data de entrada inválida:', currentDue);
    throw new Error('Data de entrada inválida para cálculo de próxima data');
  }
  
  const currentDay = currentDue.getDate();
  const currentMonth = currentDue.getMonth();
  const currentYear = currentDue.getFullYear();
  
  console.log('🔍 [COMPUTE DATE] Data atual decomposta:', {
    dia: currentDay,
    mes: currentMonth + 1, // +1 para exibição humana
    ano: currentYear
  });
  
  let nextMonth = currentMonth + 1;
  let nextYear = currentYear;
  if (nextMonth > 11) {
    nextMonth = 0;
    nextYear += 1;
    console.log('🔍 [COMPUTE DATE] Passando para próximo ano:', nextYear);
  }
  
  const lastDayNextMonth = getLastDayOfMonth(nextYear, nextMonth);
  let day = Math.min(currentDay, lastDayNextMonth);
  
  // Casos especiais para dias que não existem
  if (currentDay > lastDayNextMonth) {
    console.log('⚠️ [COMPUTE DATE] Dia original não existe no próximo mês:', {
      diaOriginal: currentDay,
      ultimoDiaProximoMes: lastDayNextMonth,
      proximoMes: nextMonth + 1
    });
    
    // Para casos como 31/01 → 28/02, usar o último dia do mês
    day = lastDayNextMonth;
  }
  
  console.log('🔍 [COMPUTE DATE] Cálculo do próximo mês:', {
    proximoMes: nextMonth + 1, // +1 para exibição humana
    proximoAno: nextYear,
    ultimoDiaDoMes: lastDayNextMonth,
    diaOriginal: currentDay,
    diaFinal: day
  });
  
  const result = new Date(nextYear, nextMonth, day);
  
  // Validar resultado
  if (isNaN(result.getTime())) {
    console.error('❌ [COMPUTE DATE] Resultado inválido:', result);
    throw new Error('Erro no cálculo da próxima data');
  }
  
  console.log('✅ [COMPUTE DATE] Resultado final:', result);
  
  return result;
}

async function findExistingNextCharge(params: { clienteId?: string | null; contratoId?: string | null; tipo?: string | null; referenciaAno: number; referenciaMes: number; }): Promise<any | null> {
  const db = getDb();
  const ref = collection(db, 'cobrancas');
  const filters = [] as any[];
  if (params.clienteId) filters.push(where('cliente_id', '==', params.clienteId));
  if (params.contratoId) filters.push(where('contrato_id', '==', params.contratoId));
  if (params.tipo) filters.push(where('tipo', '==', params.tipo));
  filters.push(where('referenciaAno', '==', params.referenciaAno));
  filters.push(where('referenciaMes', '==', params.referenciaMes));
  const q = query(ref, ...filters);
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const docSnap = snap.docs[0];
  return { id: docSnap.id, ...docSnap.data() };
}

export async function marcarComoPaga(
  id: string,
  data: {
    valorTotalPago: number;
    formaPagamento: string;
    juros?: number;
    multa?: number;
    pagoEm?: Date;
    diasAtraso?: number;
    comprovante?: {
      base64: string;
      mimeType: string;
      filename: string;
      uploadedAt: Date;
    } | null;
  }
) {
  const db = getDb();
  const cobrancaRef = doc(db, 'cobrancas', id);
  const snapBefore = await getDoc(cobrancaRef);
  const before = snapBefore.data() || {};

  const pagoEm = data.pagoEm || new Date();

  // Atualizar cobrança atual como PAGO com campos padronizados
  await updateDoc(cobrancaRef, {
    status: 'PAGO',
    pagoEm,
    valorTotalPago: data.valorTotalPago,
    formaPagamento: data.formaPagamento,
    juros: data.juros ?? null,
    multa: data.multa ?? null,
    diasAtraso: data.diasAtraso ?? null,
    ...(data.comprovante
      ? { comprovante: {
            base64: data.comprovante.base64,
            mimeType: data.comprovante.mimeType,
            filename: data.comprovante.filename,
            uploadedAt: data.comprovante.uploadedAt
          }
        }
      : {}),
    data_atualizacao: new Date(),
    historicoEventos: [...(before.historicoEventos || []), {
      tipo: 'BAIXA',
      dataHora: new Date(),
      usuarioId: (before.usuarioIdUltimaAcao || null),
      detalhes: { cobrancaId: id, valorTotalPago: data.valorTotalPago, formaPagamento: data.formaPagamento }
    }]
  } as any);

  // Calcular próxima cobrança (idempotência por consulta)
  // Usar sempre a data de vencimento original, nunca a data atual
  console.log('🔍 [PRÓXIMA FATURA] Iniciando cálculo para cobrança:', id);
  console.log('🔍 [PRÓXIMA FATURA] Dados da cobrança antes:', {
    vencimento: before.vencimento,
    data_vencimento: before.data_vencimento,
    pagoEm: pagoEm,
    cliente: before.cliente_nome
  });

  let vencimentoAtual: Date;
  
  // Tentar múltiplas fontes de data de vencimento com validação
  if (before.vencimento && before.vencimento.seconds) {
    vencimentoAtual = new Date(before.vencimento.seconds * 1000);
    console.log('✅ [PRÓXIMA FATURA] Usando campo vencimento (Timestamp):', vencimentoAtual);
  } else if (before.vencimento && before.vencimento instanceof Date) {
    vencimentoAtual = before.vencimento;
    console.log('✅ [PRÓXIMA FATURA] Usando campo vencimento (Date):', vencimentoAtual);
  } else if (before.data_vencimento) {
    // Tentar múltiplos formatos de parsing
    try {
      if (typeof before.data_vencimento === 'string') {
        // Tentar formato ISO primeiro
        vencimentoAtual = new Date(before.data_vencimento);
        if (isNaN(vencimentoAtual.getTime())) {
          // Tentar formato brasileiro DD/MM/YYYY
          const parts = before.data_vencimento.split('/');
          if (parts.length === 3) {
            vencimentoAtual = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
          }
        }
      } else {
        vencimentoAtual = new Date(before.data_vencimento);
      }
      
      // Validar se a data é válida
      if (isNaN(vencimentoAtual.getTime())) {
        throw new Error('Data inválida após parsing');
      }
      
      console.log('✅ [PRÓXIMA FATURA] Usando campo data_vencimento:', vencimentoAtual);
    } catch (error) {
      console.error('❌ [PRÓXIMA FATURA] Erro ao fazer parsing da data_vencimento:', error);
      // Fallback: usar data atual
      vencimentoAtual = new Date();
      console.warn('⚠️ [PRÓXIMA FATURA] Usando data atual como fallback:', vencimentoAtual);
    }
  } else {
    console.error('❌ [PRÓXIMA FATURA] Data de vencimento não encontrada para cobrança:', before);
    // Fallback: usar data atual
    vencimentoAtual = new Date();
    console.warn('⚠️ [PRÓXIMA FATURA] Usando data atual como fallback:', vencimentoAtual);
  }
  
  // Validação final da data
  if (isNaN(vencimentoAtual.getTime())) {
    console.error('❌ [PRÓXIMA FATURA] Data de vencimento inválida após todos os tratamentos');
    throw new Error('Não foi possível determinar uma data de vencimento válida');
  }
  
  console.log('🔍 [PRÓXIMA FATURA] Data de vencimento atual extraída:', {
    data: vencimentoAtual,
    dia: vencimentoAtual.getDate(),
    mes: vencimentoAtual.getMonth() + 1,
    ano: vencimentoAtual.getFullYear()
  });
  
  const proximoVencimento = computeNextDueDateKeepingDay(vencimentoAtual);
  console.log('🔍 [PRÓXIMA FATURA] Próximo vencimento calculado:', {
    data: proximoVencimento,
    dia: proximoVencimento.getDate(),
    mes: proximoVencimento.getMonth() + 1,
    ano: proximoVencimento.getFullYear()
  });
  
  const referenciaAno = proximoVencimento.getFullYear();
  const referenciaMes = proximoVencimento.getMonth() + 1; // 1..12
  
  console.log('🔍 [PRÓXIMA FATURA] Referência para busca:', {
    ano: referenciaAno,
    mes: referenciaMes
  });

  const existing = await findExistingNextCharge({
    clienteId: before.cliente_id || null,
    contratoId: before.contrato_id || null,
    tipo: before.tipo || before.tipoAssinatura || null,
    referenciaAno,
    referenciaMes
  });

  console.log('🔍 [PRÓXIMA FATURA] Verificação de cobrança existente:', {
    encontrada: !!existing,
    dadosExistente: existing ? {
      id: existing.id,
      vencimento: existing.vencimento,
      status: existing.status
    } : null
  });

  if (!existing) {
    console.log('✅ [PRÓXIMA FATURA] Criando nova cobrança automática');
    
    const payload: any = {
      status: 'PENDENTE',
      valor: before.valor,
      vencimento: proximoVencimento,
      // ADICIONAR campo data_vencimento para compatibilidade com frontend
      data_vencimento: proximoVencimento.toISOString().split('T')[0], // Formato YYYY-MM-DD
      geradoAutomaticamente: true,
      cliente_id: before.cliente_id || null,
      cliente_nome: before.cliente_nome || null,
      bairro: before.bairro || null,
      contrato_id: before.contrato_id || null,
      tipo: (() => {
        // Normalizar nomes dos tipos para padrão
        const tipoOriginal = before.tipo || before.tipoAssinatura || null;
        if (!tipoOriginal) return null;
        
        const tipoNormalizado = String(tipoOriginal).toUpperCase();
        if (tipoNormalizado === 'TV_BOX' || tipoNormalizado === 'TVBOX') {
          return 'TV BOX';
        } else if (tipoNormalizado === 'SKY') {
          return 'SKY';
        } else if (tipoNormalizado === 'COMBO') {
          return 'COMBO';
        } else {
          return tipoOriginal; // Manter original se não for um dos tipos conhecidos
        }
      })(),
      referenciaAno,
      referenciaMes,
      data_criacao: new Date(),
      historicoEventos: [{
        tipo: 'GERACAO_AUTOMATICA',
        dataHora: new Date(),
        usuarioId: (before.usuarioIdUltimaAcao || null),
        detalhes: { origemCobrancaId: id }
      }]
    };
    
    console.log('🔍 [PRÓXIMA FATURA] Payload da nova cobrança:', {
      vencimento: payload.vencimento,
      valor: payload.valor,
      cliente: payload.cliente_nome,
      tipo: payload.tipo,
      referenciaAno: payload.referenciaAno,
      referenciaMes: payload.referenciaMes
    });
    
    const novaCobrancaRef = await addDoc(collection(db, 'cobrancas'), payload);
    console.log('✅ [PRÓXIMA FATURA] Nova cobrança criada com ID:', novaCobrancaRef.id);
  } else {
    console.log('ℹ️ [PRÓXIMA FATURA] Cobrança já existe, não criando duplicata');
  }

  const snap = await getDoc(cobrancaRef);
  return { ok: true, id, cobranca: snap.data() };
}

export async function reabrirCobranca(
  id: string,
  novoStatus: 'PENDENTE' | 'EM_DIAS' | 'VENCIDO'
) {
  const db = getDb();
  const cobrancaRef = doc(db, 'cobrancas', id);
  const snapBefore = await getDoc(cobrancaRef);
  const before = snapBefore.data() || {};

  // Atualiza status removendo campos de pagamento
  await updateDoc(cobrancaRef, {
    status: novoStatus,
    pagoEm: null,
    valorTotalPago: null,
    formaPagamento: null,
    juros: null,
    multa: null,
    diasAtraso: null,
    data_atualizacao: new Date(),
    historicoEventos: [...(before.historicoEventos || []), {
      tipo: 'REABERTURA',
      dataHora: new Date(),
      usuarioId: (before.usuarioIdUltimaAcao || null),
      detalhes: { cobrancaId: id, de: 'PAGO', para: novoStatus }
    }]
  } as any);

  // Encontrar e excluir apenas a próxima do ciclo se estiver em aberto e gerada automaticamente
  // Usar sempre a data de vencimento original, nunca a data atual
  let vencimentoAtual: Date;
  if (before.vencimento && before.vencimento.seconds) {
    vencimentoAtual = new Date(before.vencimento.seconds * 1000);
  } else if (before.vencimento && before.vencimento instanceof Date) {
    vencimentoAtual = before.vencimento;
  } else if (before.data_vencimento) {
    // CORREÇÃO FINAL: Parsear a data de vencimento garantindo que o dia seja mantido no fuso horário local.
    // O formato 'YYYY-MM-DD' é interpretado como UTC por padrão, causando o problema do dia.
    // Vamos construir a data manualmente para forçar a interpretação local.
    const [year, month, day] = before.data_vencimento.split('-').map(Number);
    vencimentoAtual = new Date(year, month - 1, day); // month - 1 porque o mês é 0-indexado
    console.log('✅ [PRÓXIMA FATURA] Usando campo data_vencimento (parse local):', vencimentoAtual);
  } else {
    console.error('Data de vencimento não encontrada para cobrança:', before);
    throw new Error('Data de vencimento não encontrada');
  }
  
  const proximoVencimento = computeNextDueDateKeepingDay(vencimentoAtual);
  const referenciaAno = proximoVencimento.getFullYear();
  const referenciaMes = proximoVencimento.getMonth() + 1;

  const next = await findExistingNextCharge({
    clienteId: before.cliente_id || null,
    contratoId: before.contrato_id || null,
    tipo: before.tipo || before.tipoAssinatura || null,
    referenciaAno,
    referenciaMes
  });

  if (next && next.geradoAutomaticamente === true && next.status !== 'PAGO') {
    await deleteDoc(doc(db, 'cobrancas', next.id));
    const snapAfter = await getDoc(cobrancaRef);
    const current = snapAfter.data() || {};
    await updateDoc(cobrancaRef, {
      historicoEventos: [...(current.historicoEventos || []), {
        tipo: 'EXCLUSAO_AUTOMATICA',
        dataHora: new Date(),
        usuarioId: (current.usuarioIdUltimaAcao || null),
        detalhes: { cobrancaExcluidaId: next.id }
      }]
    } as any);
  }

  const snap = await getDoc(cobrancaRef);
  return { ok: true, id, cobranca: snap.data() };
}

export async function removerCobranca(id: string) {
  await deleteDoc(doc(getDb(), 'cobrancas', id));
  return { ok: true, id };
}


