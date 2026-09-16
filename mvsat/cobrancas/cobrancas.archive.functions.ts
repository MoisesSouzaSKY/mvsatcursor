import { getDb } from '../config/database.config';
import { 
  getDocs, 
  getDoc,
  setDoc,
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit
} from 'firebase/firestore';
import { tenantCollection, tenantDoc } from '../shared/saas/firestoreTenant';

/**
 * Move uma cobrança paga para o histórico usando o mesmo ID.
 * É idempotente: se o documento já estiver arquivado, não duplica registros.
 */
export async function arquivarCobrancaPagaPorId(id: string) {
  const db = getDb();
  const cobrancaRef = tenantDoc(db, 'cobrancas', id);
  const snap = await getDoc(cobrancaRef);
  if (!snap.exists()) return { arquivada: false, motivo: 'nao_encontrada' };

  const cobranca = { id: snap.id, ...snap.data() } as any;
  const status = String(cobranca.status || '').toUpperCase();
  if (status !== 'PAGO' && status !== 'PAGA' && status !== 'PAGO') {
    return { arquivada: false, motivo: 'nao_paga' };
  }

  const dataPagamento = cobranca.pagoEm || cobranca.data_pagamento || cobranca.dataPagamento || new Date();
  await setDoc(tenantDoc(db, 'cobrancas_arquivadas', id), {
    ...cobranca,
    arquivadoEm: new Date(),
    arquivadoPor: 'sistema_automatico',
    motivoArquivamento: 'cobranca_paga',
    dataOriginalPagamento: dataPagamento
  }, { merge: true });
  await deleteDoc(cobrancaRef);
  return { arquivada: true, id };
}

/**
 * Arquiva cobranças pagas em lotes ultra pequenos (modo ultra conservador)
 * Para usar quando o Firebase está muito sobrecarregado
 */
export async function arquivarCobrancasPagasUltraConservador() {
  try {
    console.log('🗄️ [ARQUIVO] Iniciando arquivamento ULTRA conservador de cobranças pagas...');
    
    const db = getDb();
    const cobrancasRef = tenantCollection(db, 'cobrancas');
    
    // Buscar apenas 5 cobranças pagas por vez (reduzido ainda mais)
    const q = query(
      cobrancasRef,
      where('status', 'in', ['PAGO', 'paga', 'pago']),
      limit(5)
    );
    
    const snapshot = await getDocs(q);
    let arquivadas = 0;
    let erros = 0;
    
    console.log(`📊 [ARQUIVO] Encontradas ${snapshot.docs.length} cobranças pagas para arquivar (ultra conservador)`);
    
    // Processar uma por vez com delay maior
    for (const docSnap of snapshot.docs) {
      try {
        const cobranca = { id: docSnap.id, ...docSnap.data() };
        
        // Obter data de pagamento para metadados
        let dataPagamento: Date | null = null;
        
        if ((cobranca as any).pagoEm) {
          if ((cobranca as any).pagoEm.seconds) {
            dataPagamento = new Date((cobranca as any).pagoEm.seconds * 1000);
          } else if ((cobranca as any).pagoEm instanceof Date) {
            dataPagamento = (cobranca as any).pagoEm;
          } else {
            dataPagamento = new Date((cobranca as any).pagoEm);
          }
        } else if ((cobranca as any).data_pagamento) {
          dataPagamento = new Date((cobranca as any).data_pagamento);
        }
        
        console.log(`📦 [ARQUIVO] Arquivando: ${(cobranca as any).cliente_nome} (${arquivadas + 1}/${snapshot.docs.length})`);
        
        // Adicionar metadados de arquivamento
        const cobrancaArquivada = {
          ...cobranca,
          arquivadoEm: new Date(),
          arquivadoPor: 'usuario_manual_ultra_conservador',
          motivoArquivamento: 'cobranca_paga_arquivamento_ultra_conservador',
          dataOriginalPagamento: dataPagamento || new Date()
        };
        
        // Salvar na coleção de arquivo com retry
        let tentativas = 0;
        const maxTentativas = 3;
        
        while (tentativas < maxTentativas) {
          try {
            await setDoc(tenantDoc(db, 'cobrancas_arquivadas', docSnap.id), cobrancaArquivada, { merge: true });
            break;
          } catch (saveError) {
            tentativas++;
            console.warn(`⚠️ [ARQUIVO] Tentativa ${tentativas}/${maxTentativas} falhou para salvar:`, saveError);
            if (tentativas < maxTentativas) {
              await new Promise(resolve => setTimeout(resolve, 2000 * tentativas)); // Delay progressivo
            } else {
              throw saveError;
            }
          }
        }
        
        // Remover da coleção principal com retry
        tentativas = 0;
        while (tentativas < maxTentativas) {
          try {
            await deleteDoc(tenantDoc(db, 'cobrancas', docSnap.id));
            break;
          } catch (deleteError) {
            tentativas++;
            console.warn(`⚠️ [ARQUIVO] Tentativa ${tentativas}/${maxTentativas} falhou para deletar:`, deleteError);
            if (tentativas < maxTentativas) {
              await new Promise(resolve => setTimeout(resolve, 2000 * tentativas)); // Delay progressivo
            } else {
              throw deleteError;
            }
          }
        }
        
        arquivadas++;
        
        // Delay maior entre cada operação (2 segundos)
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.error(`❌ [ARQUIVO] Erro ao arquivar cobrança ${docSnap.id}:`, error);
        erros++;
        // Delay ainda maior em caso de erro (5 segundos)
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    console.log(`✅ [ARQUIVO] Lote ultra conservador concluído: ${arquivadas} cobranças arquivadas, ${erros} erros`);
    
    return {
      success: true,
      arquivadas,
      erros,
      totalEncontradas: snapshot.docs.length,
      modoUltraConservador: true
    };
    
  } catch (error) {
    console.error('❌ [ARQUIVO] Erro no processo de arquivamento ultra conservador:', error);
    throw error;
  }
}

/**
 * Arquiva cobranças pagas em lotes pequenos (modo conservador)
 * Para usar quando há muitas cobranças e o Firebase está sobrecarregado
 */
export async function arquivarCobrancasPagasConservador() {
  try {
    console.log('🗄️ [ARQUIVO] Iniciando arquivamento conservador de cobranças pagas...');
    
    const db = getDb();
    const cobrancasRef = tenantCollection(db, 'cobrancas');
    
    // Buscar apenas 15 cobranças pagas por vez (reduzido ainda mais)
    const q = query(
      cobrancasRef,
      where('status', 'in', ['PAGO', 'paga', 'pago']),
      limit(15)
    );
    
    const snapshot = await getDocs(q);
    let arquivadas = 0;
    let erros = 0;
    
    console.log(`📊 [ARQUIVO] Encontradas ${snapshot.docs.length} cobranças pagas para arquivar (lote conservador)`);
    
    // Processar uma por vez com delay
    for (const docSnap of snapshot.docs) {
      try {
        const cobranca = { id: docSnap.id, ...docSnap.data() };
        
        // Obter data de pagamento para metadados
        let dataPagamento: Date | null = null;
        
        if ((cobranca as any).pagoEm) {
          if ((cobranca as any).pagoEm.seconds) {
            dataPagamento = new Date((cobranca as any).pagoEm.seconds * 1000);
          } else if ((cobranca as any).pagoEm instanceof Date) {
            dataPagamento = (cobranca as any).pagoEm;
          } else {
            dataPagamento = new Date((cobranca as any).pagoEm);
          }
        } else if ((cobranca as any).data_pagamento) {
          dataPagamento = new Date((cobranca as any).data_pagamento);
        }
        
        // Adicionar metadados de arquivamento
        const cobrancaArquivada = {
          ...cobranca,
          arquivadoEm: new Date(),
          arquivadoPor: 'usuario_manual_conservador',
          motivoArquivamento: 'cobranca_paga_arquivamento_conservador',
          dataOriginalPagamento: dataPagamento || new Date()
        };
        
        // Salvar na coleção de arquivo com retry
        let tentativas = 0;
        const maxTentativas = 2;
        
        while (tentativas < maxTentativas) {
          try {
            await setDoc(tenantDoc(db, 'cobrancas_arquivadas', docSnap.id), cobrancaArquivada, { merge: true });
            break;
          } catch (saveError) {
            tentativas++;
            console.warn(`⚠️ [ARQUIVO] Tentativa ${tentativas}/${maxTentativas} falhou para salvar:`, saveError);
            if (tentativas < maxTentativas) {
              await new Promise(resolve => setTimeout(resolve, 1000 * tentativas));
            } else {
              throw saveError;
            }
          }
        }
        
        // Remover da coleção principal com retry
        tentativas = 0;
        while (tentativas < maxTentativas) {
          try {
            await deleteDoc(tenantDoc(db, 'cobrancas', docSnap.id));
            break;
          } catch (deleteError) {
            tentativas++;
            console.warn(`⚠️ [ARQUIVO] Tentativa ${tentativas}/${maxTentativas} falhou para deletar:`, deleteError);
            if (tentativas < maxTentativas) {
              await new Promise(resolve => setTimeout(resolve, 1000 * tentativas));
            } else {
              throw deleteError;
            }
          }
        }
        
        arquivadas++;
        
        // Delay aumentado entre cada operação (800ms)
        await new Promise(resolve => setTimeout(resolve, 800));
        
      } catch (error) {
        console.error(`❌ [ARQUIVO] Erro ao arquivar cobrança ${docSnap.id}:`, error);
        erros++;
        // Delay em caso de erro
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log(`✅ [ARQUIVO] Lote conservador concluído: ${arquivadas} cobranças arquivadas, ${erros} erros`);
    
    return {
      success: true,
      arquivadas,
      erros,
      totalEncontradas: snapshot.docs.length,
      modoConservador: true
    };
    
  } catch (error) {
    console.error('❌ [ARQUIVO] Erro no processo de arquivamento conservador:', error);
    throw error;
  }
}

/**
 * Arquiva cobranças pagas em micro lotes (modo extremo)
 * Para usar quando todos os outros modos falharam
 */
export async function arquivarCobrancasPagasMicroLote() {
  try {
    console.log('🗄️ [ARQUIVO] Iniciando arquivamento MICRO LOTE de cobranças pagas...');
    
    const db = getDb();
    const cobrancasRef = tenantCollection(db, 'cobrancas');
    // Usamos tenantDoc com o mesmo ID para ficar idempotente
    
    // Buscar apenas 1 cobrança paga por vez (extremo)
    const q = query(
      cobrancasRef,
      where('status', 'in', ['PAGO', 'paga', 'pago']),
      limit(1)
    );
    
    const snapshot = await getDocs(q);
    let arquivadas = 0;
    let erros = 0;
    
    console.log(`📊 [ARQUIVO] Encontradas ${snapshot.docs.length} cobranças pagas para arquivar (micro lote)`);
    
    if (snapshot.docs.length === 0) {
      return {
        success: true,
        arquivadas: 0,
        erros: 0,
        totalEncontradas: 0,
        modoMicroLote: true
      };
    }
    
    const docSnap = snapshot.docs[0];
    
    try {
      const cobranca = { id: docSnap.id, ...docSnap.data() };
      
      // Obter data de pagamento para metadados
      let dataPagamento: Date | null = null;
      
      if ((cobranca as any).pagoEm) {
        if ((cobranca as any).pagoEm.seconds) {
          dataPagamento = new Date((cobranca as any).pagoEm.seconds * 1000);
        } else if ((cobranca as any).pagoEm instanceof Date) {
          dataPagamento = (cobranca as any).pagoEm;
        } else {
          dataPagamento = new Date((cobranca as any).pagoEm);
        }
      } else if ((cobranca as any).data_pagamento) {
        dataPagamento = new Date((cobranca as any).data_pagamento);
      }
      
      console.log(`📦 [ARQUIVO] Arquivando (micro): ${(cobranca as any).cliente_nome}`);
      
      // Adicionar metadados de arquivamento
      const cobrancaArquivada = {
        ...cobranca,
        arquivadoEm: new Date(),
        arquivadoPor: 'usuario_manual_micro_lote',
        motivoArquivamento: 'cobranca_paga_arquivamento_micro_lote',
        dataOriginalPagamento: dataPagamento || new Date()
      };
      
      // Salvar na coleção de arquivo com múltiplas tentativas
      let tentativas = 0;
      const maxTentativas = 5;
      
      while (tentativas < maxTentativas) {
        try {
          await setDoc(tenantDoc(db, 'cobrancas_arquivadas', docSnap.id), cobrancaArquivada, { merge: true });
          break;
        } catch (saveError) {
          tentativas++;
          console.warn(`⚠️ [ARQUIVO] Tentativa ${tentativas}/${maxTentativas} falhou para salvar:`, saveError);
          if (tentativas < maxTentativas) {
            await new Promise(resolve => setTimeout(resolve, 3000 * tentativas)); // Delay progressivo longo
          } else {
            throw saveError;
          }
        }
      }
      
      // Aguardar antes de deletar
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Remover da coleção principal com múltiplas tentativas
      tentativas = 0;
      while (tentativas < maxTentativas) {
        try {
          await deleteDoc(tenantDoc(db, 'cobrancas', docSnap.id));
          break;
        } catch (deleteError) {
          tentativas++;
          console.warn(`⚠️ [ARQUIVO] Tentativa ${tentativas}/${maxTentativas} falhou para deletar:`, deleteError);
          if (tentativas < maxTentativas) {
            await new Promise(resolve => setTimeout(resolve, 3000 * tentativas)); // Delay progressivo longo
          } else {
            throw deleteError;
          }
        }
      }
      
      arquivadas++;
      
    } catch (error) {
      console.error(`❌ [ARQUIVO] Erro ao arquivar cobrança ${docSnap.id}:`, error);
      erros++;
    }
    
    console.log(`✅ [ARQUIVO] Micro lote concluído: ${arquivadas} cobranças arquivadas, ${erros} erros`);
    
    return {
      success: true,
      arquivadas,
      erros,
      totalEncontradas: snapshot.docs.length,
      modoMicroLote: true
    };
    
  } catch (error) {
    console.error('❌ [ARQUIVO] Erro no processo de arquivamento micro lote:', error);
    throw error;
  }
}

/**
 * Arquiva todas as cobranças pagas para otimizar performance
 * Move todas as cobranças pagas para coleção separada em lotes
 */
export async function arquivarCobrancasPagas() {
  try {
    console.log('🗄️ [ARQUIVO] Iniciando arquivamento de TODAS as cobranças pagas...');
    
    const db = getDb();
    const cobrancasRef = tenantCollection(db, 'cobrancas');
    
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    const PAGE_LIMIT = 200; // pega 200 por rodada e repete até zerar
    const DELAY_BETWEEN_ITEMS = 180;
    const DELAY_BETWEEN_PAGES = 1200;
    const MAX_LOOPS = 10000; // safety

    let arquivadas = 0;
    let erros = 0;
    let loops = 0;

    while (loops < MAX_LOOPS) {
      loops++;

      const q = query(
        cobrancasRef,
        where('status', 'in', ['PAGO', 'paga', 'pago']),
        limit(PAGE_LIMIT)
      );

      const snapshot = await getDocs(q);
      if (snapshot.empty) break;

      console.log(`📊 [ARQUIVO] Rodada ${loops}: ${snapshot.docs.length} cobranças pagas encontradas...`);

      for (const docSnap of snapshot.docs) {
        try {
          const cobranca = { id: docSnap.id, ...docSnap.data() };

          // Obter data de pagamento para metadados
          let dataPagamento: Date | null = null;

          if ((cobranca as any).pagoEm) {
            if ((cobranca as any).pagoEm.seconds) {
              dataPagamento = new Date((cobranca as any).pagoEm.seconds * 1000);
            } else if ((cobranca as any).pagoEm instanceof Date) {
              dataPagamento = (cobranca as any).pagoEm;
            } else {
              dataPagamento = new Date((cobranca as any).pagoEm);
            }
          } else if ((cobranca as any).data_pagamento) {
            dataPagamento = new Date((cobranca as any).data_pagamento);
          }

          const cobrancaArquivada = {
            ...cobranca,
            arquivadoEm: new Date(),
            arquivadoPor: 'usuario_manual',
            motivoArquivamento: 'cobranca_paga_arquivamento_manual',
            dataOriginalPagamento: dataPagamento || new Date()
          };

          // Idempotente: usa o mesmo ID na coleção arquivada
          await setDoc(tenantDoc(db, 'cobrancas_arquivadas', docSnap.id), cobrancaArquivada, { merge: true });
          await sleep(80);
          await deleteDoc(tenantDoc(db, 'cobrancas', docSnap.id));

          arquivadas++;
          if (arquivadas % 25 === 0) {
            console.log(`✅ [ARQUIVO] Progresso: ${arquivadas} arquivadas (erros: ${erros})`);
          }

          await sleep(DELAY_BETWEEN_ITEMS);
        } catch (error) {
          console.error(`❌ [ARQUIVO] Erro ao arquivar cobrança ${docSnap.id}:`, error);
          erros++;
          await sleep(900);
        }
      }

      await sleep(DELAY_BETWEEN_PAGES);
    }

    console.log(`✅ [ARQUIVO] Arquivamento concluído: ${arquivadas} cobranças arquivadas, ${erros} erros (rodadas: ${loops})`);
    
    return {
      success: true,
      arquivadas,
      erros,
      rodadas: loops
    };
    
  } catch (error) {
    console.error('❌ [ARQUIVO] Erro no processo de arquivamento:', error);
    throw error;
  }
}

/**
 * Lista cobranças arquivadas com filtros
 */
export async function listarCobrancasArquivadas(filtros?: {
  clienteNome?: string;
  dataInicio?: Date;
  dataFim?: Date;
  limite?: number;
}) {
  try {
    const db = getDb();
    const arquivoRef = tenantCollection(db, 'cobrancas_arquivadas');
    
    let q = query(arquivoRef, orderBy('dataOriginalPagamento', 'desc'));
    
    if (filtros?.limite) {
      q = query(q, limit(filtros.limite));
    }
    
    const snapshot = await getDocs(q);
    let dados = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Aplicar filtros adicionais no cliente (para filtros mais complexos)
    if (filtros?.clienteNome) {
      const nomeFilter = filtros.clienteNome.toLowerCase();
      dados = dados.filter(c => 
        ((c as any).cliente_nome || '').toLowerCase().includes(nomeFilter)
      );
    }
    
    if (filtros?.dataInicio || filtros?.dataFim) {
      dados = dados.filter(c => {
        const dataPagamento = (c as any).dataOriginalPagamento;
        if (!dataPagamento) return false;
        
        const data = dataPagamento.seconds ? 
          new Date(dataPagamento.seconds * 1000) : 
          new Date(dataPagamento);
        
        if (filtros.dataInicio && data < filtros.dataInicio) return false;
        if (filtros.dataFim && data > filtros.dataFim) return false;
        
        return true;
      });
    }
    
    return dados;
    
  } catch (error) {
    console.error('❌ [ARQUIVO] Erro ao listar cobranças arquivadas:', error);
    throw error;
  }
}

/**
 * Restaura uma cobrança arquivada para a coleção principal
 */
export async function restaurarCobrancaArquivada(id: string) {
  try {
    const db = getDb();
    const arquivoRef = tenantDoc(db, 'cobrancas_arquivadas', id);
    const cobrancaRef = tenantDoc(db, 'cobrancas', id);
    
    // Buscar cobrança arquivada
    const snap = await getDoc(arquivoRef);
    if (!snap.exists()) {
      throw new Error('Cobrança arquivada não encontrada');
    }
    const cobrancaData = snap.data();
    
    // Remover metadados de arquivamento
    const { arquivadoEm, arquivadoPor, motivoArquivamento, dataOriginalPagamento, ...cobrancaRestaurada } = cobrancaData as any;
    
    // Restaurar na coleção principal (mesmo ID)
    await setDoc(cobrancaRef, {
      ...cobrancaRestaurada,
      restauradoEm: new Date(),
      restauradoPor: 'usuario'
    }, { merge: true });
    
    // Remover do arquivo
    await deleteDoc(arquivoRef);
    
    console.log(`✅ [ARQUIVO] Cobrança restaurada: ${(cobrancaData as any).cliente_nome}`);
    
    return {
      success: true,
      novoId: id
    };
    
  } catch (error) {
    console.error('❌ [ARQUIVO] Erro ao restaurar cobrança:', error);
    throw error;
  }
}

/**
 * Restaura cobranças arquivadas incorretamente (cobranças futuras ou não pagas)
 */
export async function restaurarCobrancasIncorretas() {
  try {
    console.log('🔄 [RESTAURAR] Iniciando restauração de cobranças arquivadas incorretamente...');
    
    const db = getDb();
    const arquivoRef = tenantCollection(db, 'cobrancas_arquivadas');
    
    // Buscar todas as cobranças arquivadas
    const snapshot = await getDocs(arquivoRef);
    let restauradas = 0;
    let erros = 0;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0); // Zerar horas para comparação apenas de data
    
    console.log(`📊 [RESTAURAR] Analisando ${snapshot.docs.length} cobranças arquivadas...`);
    
    for (const docSnap of snapshot.docs) {
      try {
        const cobrancaArquivada = { id: docSnap.id, ...docSnap.data() };
        
        // Verificar se deve ser restaurada
        let deveRestaurar = false;
        let motivo = '';
        
        // 1. Verificar se não está paga (foi arquivada incorretamente)
        const status = (cobrancaArquivada as any).status;
        if (status !== 'PAGO' && status !== 'paga' && status !== 'pago') {
          deveRestaurar = true;
          motivo = `cobrança não paga (status: ${status})`;
        }
        
        // 2. Verificar se tem vencimento futuro (próximos 3 meses)
        let dataVencimento: Date | null = null;
        
        // Tentar múltiplas fontes de data de vencimento
        if ((cobrancaArquivada as any).vencimento) {
          if ((cobrancaArquivada as any).vencimento.seconds) {
            dataVencimento = new Date((cobrancaArquivada as any).vencimento.seconds * 1000);
          } else {
            dataVencimento = new Date((cobrancaArquivada as any).vencimento);
          }
        } else if ((cobrancaArquivada as any).data_vencimento) {
          if (typeof (cobrancaArquivada as any).data_vencimento === 'string') {
            if ((cobrancaArquivada as any).data_vencimento.includes('/')) {
              // Formato DD/MM/YYYY
              const [dia, mes, ano] = (cobrancaArquivada as any).data_vencimento.split('/');
              dataVencimento = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
            } else {
              // Formato YYYY-MM-DD
              const [ano, mes, dia] = (cobrancaArquivada as any).data_vencimento.split('-');
              dataVencimento = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
            }
          } else {
            dataVencimento = new Date((cobrancaArquivada as any).data_vencimento);
          }
        }
        
        // Se tem data de vencimento válida
        if (dataVencimento && !isNaN(dataVencimento.getTime())) {
          dataVencimento.setHours(0, 0, 0, 0); // Zerar horas para comparação
          
          // Calcular 3 meses no futuro
          const tresMesesFuturo = new Date(hoje);
          tresMesesFuturo.setMonth(tresMesesFuturo.getMonth() + 3);
          
          // Se vence hoje ou no futuro (próximos 3 meses), deve ser restaurada
          if (dataVencimento >= hoje && dataVencimento <= tresMesesFuturo) {
            deveRestaurar = true;
            motivo = `vencimento futuro: ${dataVencimento.toLocaleDateString('pt-BR')}`;
          }
          
          // Casos especiais: cobranças que vencem muito no futuro (mais de 3 meses)
          if (dataVencimento > tresMesesFuturo) {
            const mesesDiferenca = Math.round((dataVencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24 * 30));
            if (mesesDiferenca <= 12) { // Até 1 ano no futuro
              deveRestaurar = true;
              motivo = `vencimento muito futuro: ${dataVencimento.toLocaleDateString('pt-BR')} (${mesesDiferenca} meses)`;
            }
          }
        }
        
        if (deveRestaurar) {
          console.log(`🔄 [RESTAURAR] Restaurando: ${(cobrancaArquivada as any).cliente_nome} - ${motivo}`);
          
          // Remover metadados de arquivamento
          const { arquivadoEm, arquivadoPor, motivoArquivamento, dataOriginalPagamento, ...cobrancaRestaurada } = cobrancaArquivada as any;
          
          // Adicionar à coleção principal
          await setDoc(tenantDoc(db, 'cobrancas', docSnap.id), {
            ...cobrancaRestaurada,
            restauradoEm: new Date(),
            restauradoPor: 'sistema_automatico',
            motivoRestauracao: motivo
          }, { merge: true });
          
          // Remover do arquivo
          await deleteDoc(tenantDoc(db, 'cobrancas_arquivadas', docSnap.id));
          
          restauradas++;
          
          // Delay pequeno entre operações
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
      } catch (error) {
        console.error(`❌ [RESTAURAR] Erro ao restaurar cobrança ${docSnap.id}:`, error);
        erros++;
      }
    }
    
    console.log(`✅ [RESTAURAR] Restauração concluída: ${restauradas} cobranças restauradas, ${erros} erros`);
    
    return {
      success: true,
      restauradas,
      erros,
      totalAnalisadas: snapshot.docs.length
    };
    
  } catch (error) {
    console.error('❌ [RESTAURAR] Erro no processo de restauração:', error);
    throw error;
  }
}

/**
 * Obtém estatísticas do arquivo
 */
export async function obterEstatisticasArquivo() {
  try {
    const db = getDb();
    const arquivoRef = tenantCollection(db, 'cobrancas_arquivadas');
    
    const snapshot = await getDocs(arquivoRef);
    const dados = snapshot.docs.map(doc => doc.data());
    
    const totalArquivadas = dados.length;
    const valorTotalArquivado = dados.reduce((acc, c) => acc + (c.valor || 0), 0);
    const valorRecebidoArquivado = dados.reduce((acc, c) => acc + (c.valorTotalPago || c.valor_pago || 0), 0);
    
    // Agrupar por mês
    const porMes = dados.reduce((acc, c) => {
      const data = c.dataOriginalPagamento;
      if (!data) return acc;
      
      const dataObj = data.seconds ? new Date(data.seconds * 1000) : new Date(data);
      const mesAno = `${dataObj.getFullYear()}-${String(dataObj.getMonth() + 1).padStart(2, '0')}`;
      
      if (!acc[mesAno]) {
        acc[mesAno] = { count: 0, valor: 0 };
      }
      
      acc[mesAno].count++;
      acc[mesAno].valor += (c.valorTotalPago || c.valor_pago || 0);
      
      return acc;
    }, {} as Record<string, { count: number; valor: number }>);
    
    return {
      totalArquivadas,
      valorTotalArquivado,
      valorRecebidoArquivado,
      porMes
    };
    
  } catch (error) {
    console.error('❌ [ARQUIVO] Erro ao obter estatísticas:', error);
    throw error;
  }
}