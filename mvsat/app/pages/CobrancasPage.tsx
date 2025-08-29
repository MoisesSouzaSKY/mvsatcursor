import React, { useState, useEffect } from 'react';


import { Button } from '../../shared/components/ui/Button';
import { Card } from '../../shared/components/ui/Card';
import { Input } from '../../shared/components/ui/Input';

import { Modal } from '../../shared/components/ui/Modal';
import CobrancasStatistics from '../../cobrancas/components/CobrancasStatistics';
import { CobrancasHeader } from '../../cobrancas/components/CobrancasHeader';
import { listarClientes } from '../../clientes/clientes.functions';
import { 
  listarCobrancas, 
  criarCobranca, 
  atualizarCobranca,
  marcarComoPaga, 
  removerCobranca,
  reabrirCobranca
} from '../../cobrancas/cobrancas.functions';

import { useToastHelpers } from '../../shared/contexts/ToastContext';

// Tipos para as cobranças
interface Cobranca {
  id: string;
  cliente_id: string;
  cliente_nome: string;
  bairro: string;
  tipo: string;
  data_vencimento?: any; // legado
  vencimento?: any; // novo
  valor: number;
  status: string; // compatível com 'em_dias' | 'paga' | 'em_atraso' | 'pendente' | 'PENDENTE' | 'EM_DIAS' | 'PAGO' | 'VENCIDO'
  // campos legados
  valor_pago?: number;
  data_pagamento?: any; // legado
  // campos novos
  pagoEm?: any;
  valorTotalPago?: number;
  formaPagamento?: string;
  juros?: number;
  multa?: number;
  diasAtraso?: number;
  geradoAutomaticamente?: boolean;
  referenciaAno?: number;
  referenciaMes?: number;
  comprovante?: {
    base64: string;
    mimeType: string;
    filename: string;
    uploadedAt: any;
  } | null;
  observacao?: string;
  data_criacao: any; // Pode ser Date ou Firestore Timestamp
  data_atualizacao: any; // Pode ser Date ou Firestore Timestamp
}

// Interface para cliente
interface Cliente {
  id: string;
  nome: string;
  bairro: string;
  telefone: string;
  status: string;
}

export default function CobrancasPage() {
  const { successQuick } = useToastHelpers();
  
  // Estados
  const [cobrancas, setCobrancas] = useState<Cobranca[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('alfabetica');
  const [showGerarCobrancaModal, setShowGerarCobrancaModal] = useState(false);
  const [showEditarCobrancaModal, setShowEditarCobrancaModal] = useState(false);
  const [showPagamentoModal, setShowPagamentoModal] = useState(false);
  const [showAtualizarVencModal, setShowAtualizarVencModal] = useState(false);
  const [textoAtualizacao, setTextoAtualizacao] = useState('');
  const [processingAtualizacao, setProcessingAtualizacao] = useState(false);
  const [relatorioAtualizacao, setRelatorioAtualizacao] = useState({
    atualizados: [] as string[],
    naoEncontrados: [] as string[],
    extras: [] as string[],
    desativados: [] as string[]
  });

  // Estado para o filtro de data de vencimento
  const [filtroDataVencimento, setFiltroDataVencimento] = useState<string>('');

  // Novos filtros: mês e status
  const [filtroMes, setFiltroMes] = useState<string>('');
  const [filtroStatus, setFiltroStatus] = useState<string>('');

  // Funções para limpar os novos filtros
  const limparFiltroMes = () => {
    setFiltroMes('');
  };

  const limparFiltroStatus = () => {
    setFiltroStatus('');
  };

  // Função para limpar todos os filtros
  const limparTodosFiltros = () => {
    setFiltroDataVencimento('');
    setFiltroMes('');
    setFiltroStatus('');
    setSearchTerm('');
  };

  const [cobrancaSelecionada, setCobrancaSelecionada] = useState<Cobranca | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [loadingCobrancas, setLoadingCobrancas] = useState(false);
  const [formData, setFormData] = useState({
    cliente_id: '',
    tipoCobranca: 'SKY',
    valor: '',
    dataVencimento: ''
  });
  const [formEditarCobranca, setFormEditarCobranca] = useState({
    cliente_id: '',
    valor: '',
    dataVencimento: '',
    tipoAssinatura: 'SKY',
    observacao: '',
    status: 'EM_DIAS' as string
  });
  const [formPagamento, setFormPagamento] = useState({
    dataPagamento: '',
    metodoPagamento: '',
    valorRecebido: '',
    comprovante: null as File | null,
    observacoes: '',
    mesAnoComprovante: ''
  });

  // Trava de idempotência para pagamento
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Modal de comprovante
  const [showComprovanteModal, setShowComprovanteModal] = useState(false);
  const [comprovanteView, setComprovanteView] = useState<{ base64: string; mimeType: string; filename: string } | null>(null);

  // Debug do modal de comprovante
  useEffect(() => {
    console.log('🔍 Estado do modal de comprovante:', { showComprovanteModal, comprovanteView });
  }, [showComprovanteModal, comprovanteView]);

  // Função de teste para validar as correções (pode ser chamada no console)
  const testarCorrecoes = () => {
    console.log('🧪 [TESTE] Iniciando testes das correções implementadas');
    
    // Teste 1: Validação de base64
    console.log('🧪 [TESTE] 1. Testando validação de base64...');
    const testesBase64 = [
      { input: 'SGVsbG8gV29ybGQ=', esperado: true, descricao: 'Base64 válido simples' },
      { input: 'data:image/png;base64,SGVsbG8gV29ybGQ=', esperado: true, descricao: 'Base64 com prefixo data:' },
      { input: 'invalid-base64!@#', esperado: false, descricao: 'Base64 inválido' },
      { input: '', esperado: false, descricao: 'String vazia' },
      { input: null, esperado: false, descricao: 'Valor null' }
    ];
    
    testesBase64.forEach((teste, index) => {
      const resultado = isValidBase64(teste.input as string);
      const passou = resultado === teste.esperado;
      console.log(`${passou ? '✅' : '❌'} [TESTE] 1.${index + 1} ${teste.descricao}: ${passou ? 'PASSOU' : 'FALHOU'}`);
    });
    
    // Teste 2: Cálculo de próxima data (simulação)
    console.log('🧪 [TESTE] 2. Testando cálculo de próxima data...');
    const testesDatas = [
      { input: new Date(2024, 8, 30), esperado: new Date(2024, 9, 30), descricao: 'Setembro → Outubro (dia 30)' },
      { input: new Date(2024, 0, 31), esperado: new Date(2024, 1, 29), descricao: 'Janeiro → Fevereiro (31 → 29, ano bissexto)' },
      { input: new Date(2023, 0, 31), esperado: new Date(2023, 1, 28), descricao: 'Janeiro → Fevereiro (31 → 28, ano não bissexto)' },
      { input: new Date(2024, 11, 15), esperado: new Date(2025, 0, 15), descricao: 'Dezembro → Janeiro (mudança de ano)' }
    ];
    
    // Simular a função computeNextDueDateKeepingDay localmente para teste
    const computeNextDueDateKeepingDayLocal = (currentDue: Date): Date => {
      const currentDay = currentDue.getDate();
      const currentMonth = currentDue.getMonth();
      const currentYear = currentDue.getFullYear();
      let nextMonth = currentMonth + 1;
      let nextYear = currentYear;
      if (nextMonth > 11) {
        nextMonth = 0;
        nextYear += 1;
      }
      const lastDayNextMonth = new Date(nextYear, nextMonth + 1, 0).getDate();
      const day = Math.min(currentDay, lastDayNextMonth);
      return new Date(nextYear, nextMonth, day);
    };
    
    testesDatas.forEach((teste, index) => {
      try {
        const resultado = computeNextDueDateKeepingDayLocal(teste.input);
        const passou = resultado.getTime() === teste.esperado.getTime();
        console.log(`${passou ? '✅' : '❌'} [TESTE] 2.${index + 1} ${teste.descricao}: ${passou ? 'PASSOU' : 'FALHOU'}`);
        if (!passou) {
          console.log(`   Esperado: ${teste.esperado.toDateString()}, Obtido: ${resultado.toDateString()}`);
        }
      } catch (error) {
        console.log(`❌ [TESTE] 2.${index + 1} ${teste.descricao}: ERRO - ${error}`);
      }
    });
    
    console.log('🧪 [TESTE] Testes concluídos. Verifique os resultados acima.');
    console.log('💡 [TESTE] Para testar comprovantes reais, faça uma baixa de pagamento e tente visualizar o comprovante.');
    console.log('💡 [TESTE] Para testar geração de fatura, marque uma cobrança como paga e verifique se a próxima fatura tem a data correta.');
  };

  // Expor função de teste globalmente para uso no console
  useEffect(() => {
    (window as any).testarCorrecoes = testarCorrecoes;
    console.log('🧪 [TESTE] Função testarCorrecoes() disponível no console');
  }, []);

  // Função para formatar valor monetário
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Helpers de data
  const parseToDate = (raw: any): Date | null => {
    if (!raw) return null;
    
    // Se for um Firestore Timestamp
    if (raw && typeof raw === 'object' && raw.seconds !== undefined) {
      return new Date(raw.seconds * 1000);
    }
    
    // Se for uma string
    let s = String(raw).trim();
    if (s.includes(' ')) s = s.split(' ')[0]; // remove hora "YYYY-MM-DD HH:mm:ss"
    if (s.includes('T')) s = s.split('T')[0]; // remove hora ISO

    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const [y, m, d] = s.split('-').map(Number);
      return new Date(y, (m || 1) - 1, d || 1);
    }
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
      const [d, m, y] = s.split('/').map(Number);
      return new Date(y || 0, (m || 1) - 1, d || 1);
    }
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  };

  const pad2 = (n: number) => String(n).padStart(2, '0');

  // Normaliza para "YYYY-MM-DD" (para inputs type="date")
  const normalizeToInputDate = (raw: any): string => {
    try {
      const d = parseToDate(raw);
      if (!d) return '';
      return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    } catch (error) {
      console.error('Erro ao normalizar data:', error, 'Raw:', raw);
      // Fallback: tentar extrair apenas a parte da data
      if (typeof raw === 'string') {
        const match = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (match) {
          return `${match[1]}-${match[2]}-${match[3]}`;
        }
      }
      return '';
    }
  };

  // Função para obter dias de vencimento padrão com contagem de clientes
  const datasVencimentoDisponiveis = React.useMemo(() => {
    if (!Array.isArray(cobrancas) || cobrancas.length === 0) return [];
    
    const diasPadrao = [5, 10, 15, 20, 25, 30];
    const hoje = new Date();
    const mesAtual = hoje.getMonth();
    const anoAtual = hoje.getFullYear();
    
    return diasPadrao.map(dia => {
      // Conta quantos clientes têm cobranças neste dia do mês
      const count = cobrancas.filter(cobranca => {
        if (!cobranca?.data_vencimento) return false;
        const data = parseToDate(cobranca.data_vencimento);
        if (!data) return false;
        
        // Verifica se é o mesmo dia do mês (independente do mês/ano)
        return data.getDate() === dia;
      }).length;
      
      // Cria uma data para o mês atual para exibição
      const dataExemplo = new Date(anoAtual, mesAtual, dia);
      const dataStr = normalizeToInputDate(dataExemplo);
      
      return { 
        data: dataStr, 
        count,
        dia: dia
      };
    });
  }, [cobrancas]);

  // Função para obter meses disponíveis para filtro
  const mesesDisponiveis = React.useMemo(() => {
    if (!Array.isArray(cobrancas) || cobrancas.length === 0) return [];
    
    const meses = new Set<string>();
    const hoje = new Date();
    
    // Adicionar meses das cobranças existentes
    cobrancas.forEach(cobranca => {
      if (cobranca?.data_vencimento) {
        const data = parseToDate(cobranca.data_vencimento);
        if (data) {
          const mesAno = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
          meses.add(mesAno);
        }
      }
    });
    
    // Adicionar meses futuros (próximos 6 meses)
    for (let i = 0; i < 6; i++) {
      const dataFutura = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
      const mesAno = `${dataFutura.getFullYear()}-${String(dataFutura.getMonth() + 1).padStart(2, '0')}`;
      meses.add(mesAno);
    }
    
    // Adicionar meses passados (últimos 6 meses)
    for (let i = 1; i <= 6; i++) {
      const dataPassada = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const mesAno = `${dataPassada.getFullYear()}-${String(dataPassada.getMonth() + 1).padStart(2, '0')}`;
      meses.add(mesAno);
    }
    
    // Converter para array e ordenar
    return Array.from(meses).sort().map(mesAno => {
      const [ano, mes] = mesAno.split('-');
      const data = new Date(parseInt(ano), parseInt(mes) - 1, 1);
      const nomeMes = data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      
      // Contar cobranças neste mês
      const count = cobrancas.filter(cobranca => {
        if (!cobranca?.data_vencimento) return false;
        const dataVenc = parseToDate(cobranca.data_vencimento);
        if (!dataVenc) return false;
        const mesAnoVenc = `${dataVenc.getFullYear()}-${String(dataVenc.getMonth() + 1).padStart(2, '0')}`;
        return mesAnoVenc === mesAno;
      }).length;
      
      return {
        valor: mesAno,
        label: nomeMes,
        count
      };
    });
  }, [cobrancas]);

  // Formata para exibição "DD/MM/YYYY"
  const formatDateForDisplay = (raw: any): string => {
    const d = parseToDate(raw);
    if (!d) {
      // fallback: se vier "YYYY-MM-DD HH:mm:ss", retorna apenas a parte da data
      if (typeof raw === 'string') {
        return String(raw || '').split(' ')[0].split('T')[0];
      }
      return 'N/A';
    }
    return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
  };

  // Estatísticas calculadas dinamicamente
  const estatisticas = React.useMemo(() => {
    if (!Array.isArray(cobrancas) || cobrancas.length === 0) {
      return { somaValor: 0, totalRecebido: 0, emAtraso: 0, pendentes: 0, taxaRecebimento: 0 };
    }
    
    const somaValor = cobrancas.reduce((acc, c) => acc + (c?.valor || 0), 0);
    const totalRecebido = cobrancas.reduce((acc, c) => acc + (c?.valor_pago || 0), 0);
    const hoje = new Date();
    const emAtraso = cobrancas.reduce((acc, c) => {
      if (!c) return acc;
      const pago = c.status === 'paga';
      const venc = parseToDate(c.data_vencimento);
      if (!pago && venc && venc < hoje) {
        return acc + ((c.valor || 0) - (c.valor_pago || 0));
      }
      return acc;
    }, 0);
    const pendentes = cobrancas.reduce((acc, c) => {
      if (!c) return acc;
      const pago = c.status === 'paga';
      return acc + (pago ? 0 : (c.valor || 0));
    }, 0);
    const taxaRecebimento = somaValor > 0 ? Number(((totalRecebido / somaValor) * 100).toFixed(1)) : 0;
    
    return { somaValor, totalRecebido, emAtraso, pendentes, taxaRecebimento };
  }, [cobrancas]);

  // Função para obter o status badge
  const getStatusBadge = (status: string) => {
    // Normalizar status para comparação
    const statusNormalizado = String(status || '').toLowerCase();
    
    let statusConfig;
    
    if (statusNormalizado === 'paga' || statusNormalizado === 'pago' || statusNormalizado === 'paid') {
      statusConfig = { text: 'Pago', color: 'var(--color-success-500)' };
    } else if (statusNormalizado === 'em_atraso' || statusNormalizado === 'vencido') {
      statusConfig = { text: 'Vencido', color: 'var(--color-error-600)' };
    } else if (statusNormalizado === 'em_dias' || statusNormalizado === 'pendente') {
      statusConfig = { text: 'Em dias', color: '#48D1CC' };
    } else {
      // Status desconhecido
      statusConfig = { text: String(status || 'Desconhecido'), color: 'var(--color-gray-500)' };
    }

    return (
      <span style={{
        backgroundColor: statusConfig.color,
        color: 'white',
        padding: '4px 12px',
        borderRadius: '9999px',
        fontSize: '12px',
        fontWeight: '500'
      }}>
        {statusConfig.text}
      </span>
    );
  };

  // Helper: obter Date do vencimento a partir de data_vencimento (string) OU vencimento (Date/Timestamp)
  const getDataVencimento = (c: any): Date | null => {
    if (!c) return null;
    const raw = c.data_vencimento ?? c.vencimento ?? null;
    return parseToDate(raw);
  };

  // Função para filtrar e ordenar cobranças
  const filteredAndSortedCobrancas = React.useMemo(() => {
    console.log('=== FILTROS ATIVOS ===');
    console.log('Status:', filtroStatus);
    console.log('Mês:', filtroMes);
    console.log('Dia:', filtroDataVencimento);
    console.log('Busca:', searchTerm);
    console.log('Total de cobranças:', cobrancas.length);
    
    let filtered = cobrancas.filter(cobranca => {
      // Filtro por termo de busca
      const matchSearch = (cobranca?.cliente_nome || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (cobranca?.bairro || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      if (!matchSearch) return false;
      
      // Filtro por dia de vencimento (se aplicável)
      if (filtroDataVencimento) {
        const dataVencimento = getDataVencimento(cobranca);
        if (!dataVencimento) return false;
        
        // O filtro agora é diretamente o número do dia
        const diaFiltro = parseInt(filtroDataVencimento);
        
        // Verifica se a cobrança vence no mesmo dia do mês
        if (dataVencimento.getDate() !== diaFiltro) return false;
      }
      
      // Filtro por mês (se aplicável)
      if (filtroMes) {
        const dataVencimento = getDataVencimento(cobranca);
        if (!dataVencimento) return false;
        
        const mesAnoCobranca = `${dataVencimento.getFullYear()}-${String(dataVencimento.getMonth() + 1).padStart(2, '0')}`;
        if (mesAnoCobranca !== filtroMes) return false;
      }
      
      // Filtro por status (se aplicável)
      if (filtroStatus && filtroStatus !== '') {
        console.log(`Verificando status: ${cobranca?.status} vs ${filtroStatus}`);
        
        // Mapear status antigos para novos se necessário
        let statusParaComparar = cobranca?.status;
        if (cobranca?.status === 'pendente') {
          // Se o status é 'pendente', verificar se deveria ser 'em_dias' ou 'em_atraso'
          const dataVencimento = getDataVencimento(cobranca);
          if (dataVencimento) {
            const hoje = new Date();
            if (dataVencimento > hoje) {
              statusParaComparar = 'em_dias';
            } else if (dataVencimento < hoje) {
              statusParaComparar = 'em_atraso';
            }
          }
        }
        
        if (statusParaComparar !== filtroStatus) {
          console.log(`❌ Status não confere: ${cobranca?.status} (mapeado: ${statusParaComparar}) !== ${filtroStatus}`);
          return false;
        }
        console.log(`✅ Status confere: ${cobranca?.status} (mapeado: ${statusParaComparar})`);
      }
      
      return true;
    });

    console.log(`Cobranças após filtros: ${filtered.length}`);

    // Aplicar ordenação com prioridade para status
    // Prioridade: 1) em_atraso (vencidas), 2) em_dias, 3) paga (sempre no final)
    // Esta ordenação garante que cobranças vencidas apareçam primeiro, seguidas por
    // cobranças em dia, e por último as cobranças pagas, independente dos filtros aplicados
    console.log('=== INICIANDO ORDENAÇÃO ===');
    console.log('Status encontrados:', [...new Set(filtered.map(c => c?.status))]);
    
    // FORÇAR ordenação por status primeiro, independente de qualquer outro critério
    console.log('=== ORDENAÇÃO FORÇADA POR STATUS ===');
    
    // DEBUG: Verificar status antes da ordenação
    console.log('🔍 Status antes da ordenação:', filtered.map(c => ({ nome: c?.cliente_nome, status: c?.status })));
    
    // TESTE: Verificar se há algum problema com o status
    const statusUnicos = [...new Set(filtered.map(c => c?.status))];
    console.log('🔍 Status únicos encontrados:', statusUnicos);
    
    // TESTE: Verificar se o status 'paga' está sendo reconhecido corretamente
    const cobrancasComStatusPaga = filtered.filter(c => c?.status === 'paga');
    console.log('🔍 Cobranças com status "paga":', cobrancasComStatusPaga.map(c => ({ nome: c?.cliente_nome, status: c?.status })));
    
    // 1. PRIMEIRO: Todas as cobranças vencidas (em_atraso)
    const vencidas = filtered.filter(c => c?.status === 'em_atraso');
    console.log(`🔴 Vencidas encontradas: ${vencidas.length}`, vencidas.map(c => c?.cliente_nome));
    
    // 2. SEGUNDO: Todas as cobranças em dias (em_dias)
    const emDias = filtered.filter(c => c?.status === 'em_dias');
    console.log(`🟢 Em dias encontradas: ${emDias.length}`, emDias.map(c => c?.cliente_nome));
    
    // 3. TERCEIRO: Todas as cobranças pagas (paga) - SEMPRE NO FINAL
    const pagas = filtered.filter(c => c?.status === 'paga');
    console.log(`✅ Pagas encontradas: ${pagas.length}`, pagas.map(c => c?.cliente_nome));
    
    // TESTE ALTERNATIVO: Verificar se há algum problema com a comparação de string
    const pagasAlt = filtered.filter(c => String(c?.status).toLowerCase() === 'paga');
    console.log(`🔍 Pagas (método alternativo): ${pagasAlt.length}`, pagasAlt.map(c => c?.cliente_nome));
    
    // TESTE: Verificar se há diferença entre maiúsculas/minúsculas
    const pagasCaseInsensitive = filtered.filter(c => {
      const status = String(c?.status || '').toLowerCase();
      return status === 'paga' || status === 'pago' || status === 'paid';
    });
    console.log(`🔍 Pagas (case insensitive): ${pagasCaseInsensitive.length}`, pagasCaseInsensitive.map(c => c?.cliente_nome));
    
    // 4. QUARTO: Outros status (se houver)
    const outros = filtered.filter(c => !['em_atraso', 'em_dias', 'paga'].includes(c?.status || ''));
    console.log(`⚪ Outros status: ${outros.length}`, outros.map(c => c?.cliente_nome));
    
    // VERIFICAÇÃO CRÍTICA: Se não há cobranças pagas, não há o que ordenar
    if (pagas.length === 0) {
      console.log('⚠️ ATENÇÃO: Não há cobranças pagas para ordenar!');
      console.log('🔍 Status disponíveis:', [...new Set(filtered.map(c => c?.status))]);
      
      // TESTE: Tentar método alternativo
      if (pagasAlt.length > 0) {
        console.log('🔄 Tentando método alternativo de detecção de pagas...');
        // Usar o método alternativo
        const pagasParaUsar = pagasAlt;
        console.log(`✅ Usando ${pagasParaUsar.length} cobranças pagas (método alternativo)`);
      } else {
        console.log('❌ Nenhum método encontrou cobranças pagas');
        return filtered;
      }
    }
    
    // VERIFICAÇÃO: Se há cobranças pagas, forçar ordenação
    const pagasParaOrdenar = pagas.length > 0 ? pagas : (pagasAlt.length > 0 ? pagasAlt : pagasCaseInsensitive);
    console.log(`🎯 Encontradas ${pagasParaOrdenar.length} cobranças pagas - FORÇANDO ordenação!`);
    
    if (pagasParaOrdenar.length === 0) {
      console.log('⚠️ ATENÇÃO: Não há cobranças pagas para ordenar!');
      console.log('🔍 Status disponíveis:', [...new Set(filtered.map(c => c?.status))]);
      // NÃO RETORNAR AQUI - CONTINUAR COM A ORDENAÇÃO
    }
    
    // FORÇAR ORDENAÇÃO SIMPLES E DIRETA
    console.log('🚀 FORÇANDO ORDENAÇÃO SIMPLES...');
    
    // Ordenar cada grupo pela ordenação escolhida
    const ordenarPorNome = (a: any, b: any) => {
      const nomeA = (a?.cliente_nome || '').toLowerCase();
      const nomeB = (b?.cliente_nome || '').toLowerCase();
      return nomeA.localeCompare(nomeB, 'pt-BR');
    };
    
    const ordenarPorVencimento = (a: any, b: any) => {
      const dataA = getDataVencimento(a);
      const dataB = getDataVencimento(b);
      if (!dataA && !dataB) return 0;
      if (!dataA) return 1;
      if (!dataB) return -1;
      return dataA.getTime() - dataB.getTime();
    };
    
    const ordenarPorValor = (a: any, b: any) => {
      const valorA = a?.valor || 0;
      const valorB = b?.valor || 0;
      return valorA - valorB;
    };
    
    // Aplicar ordenação específica em cada grupo
    let vencidasOrdenadas = [...vencidas];
    let emDiasOrdenadas = [...emDias];
    let pagasOrdenadas = [...pagasParaOrdenar]; // Usar as pagas detectadas
    let outrosOrdenados = [...outros];
    
    // APLICAR ORDENAÇÃO ESCOLHIDA PELO USUÁRIO
    console.log('🎯 [ORDENAÇÃO] Aplicando ordenação:', sortOrder);
    
    if (sortOrder === 'alfabetica') {
      console.log('📝 [ORDENAÇÃO] Aplicando ordenação alfabética...');
      vencidasOrdenadas.sort(ordenarPorNome);
      emDiasOrdenadas.sort(ordenarPorNome);
      pagasOrdenadas.sort(ordenarPorNome);
      outrosOrdenados.sort(ordenarPorNome);
      console.log('✅ [ORDENAÇÃO] Ordenação alfabética aplicada');
    } else if (sortOrder === 'vencimento') {
      console.log('📅 [ORDENAÇÃO] Aplicando ordenação por vencimento...');
      vencidasOrdenadas.sort(ordenarPorVencimento);
      emDiasOrdenadas.sort(ordenarPorVencimento);
      pagasOrdenadas.sort(ordenarPorVencimento);
      outrosOrdenados.sort(ordenarPorVencimento);
      console.log('✅ [ORDENAÇÃO] Ordenação por vencimento aplicada');
    } else if (sortOrder === 'valor') {
      console.log('💰 [ORDENAÇÃO] Aplicando ordenação por valor...');
      vencidasOrdenadas.sort(ordenarPorValor);
      emDiasOrdenadas.sort(ordenarPorValor);
      pagasOrdenadas.sort(ordenarPorValor);
      outrosOrdenados.sort(ordenarPorValor);
      console.log('✅ [ORDENAÇÃO] Ordenação por valor aplicada');
    } else {
      console.log('⚠️ [ORDENAÇÃO] Tipo de ordenação desconhecido:', sortOrder);
    }
    
    // MONTAR LISTA FINAL NA ORDEM CORRETA - FORÇAR A ORDEM
    const resultadoFinal = [];
    
    // ADICIONAR VENCIDAS PRIMEIRO
    resultadoFinal.push(...vencidasOrdenadas);
    console.log(`➕ Adicionadas ${vencidasOrdenadas.length} vencidas no início`);
    
    // ADICIONAR EM DIAS SEGUNDO
    resultadoFinal.push(...emDiasOrdenadas);
    console.log(`➕ Adicionadas ${emDiasOrdenadas.length} em dias`);
    
    // ADICIONAR PAGAS POR ÚLTIMO - SEMPRE NO FINAL
    resultadoFinal.push(...pagasOrdenadas);
    console.log(`➕ Adicionadas ${pagasOrdenadas.length} pagas NO FINAL`);
    
    // ADICIONAR OUTROS POR ÚLTIMO
    resultadoFinal.push(...outrosOrdenados);
    console.log(`➕ Adicionados ${outrosOrdenados.length} outros`);
    
    // Substituir o array filtrado pelo resultado ordenado
    filtered = resultadoFinal;
    
    // DEBUG: Verificar resultado final
    console.log('🎯 Resultado final da ordenação:');
    resultadoFinal.forEach((c, i) => {
      console.log(`${i + 1}. ${c?.cliente_nome} - ${c?.status}`);
    });
    
    // VERIFICAÇÃO FINAL: Confirmar que pagas estão no final
    const ultimas5 = resultadoFinal.slice(-5);
    console.log('🔍 Últimas 5 cobranças da lista:', ultimas5.map(c => ({ nome: c?.cliente_nome, status: c?.status })));
    
    // VERIFICAÇÃO CRÍTICA: Confirmar que não há cobranças pagas no meio
    const statusOrder = resultadoFinal.map(c => c?.status);
    const pagasIndices = statusOrder.map((status, index) => {
      const statusStr = String(status || '').toLowerCase();
      return (statusStr === 'paga' || statusStr === 'pago' || statusStr === 'paid') ? index : -1;
    }).filter(i => i !== -1);
    
    if (pagasIndices.length > 0) {
      const ultimoIndex = pagasIndices[pagasIndices.length - 1];
      const totalCobrancas = resultadoFinal.length;
      
      console.log(`🎯 Verificação final: Última cobrança paga no índice ${ultimoIndex} de ${totalCobrancas}`);
      
      if (ultimoIndex < totalCobrancas - 1) {
        console.log(`🚨 PROBLEMA: Cobranças pagas não estão no final!`);
        console.log(`Status das últimas 5 cobranças:`, statusOrder.slice(-5));
        
        // FORÇAR correção se necessário
        console.log('🔄 Tentando corrigir ordenação...');
        const naoPagas = resultadoFinal.filter(c => {
          const status = String(c?.status || '').toLowerCase();
          return !(status === 'paga' || status === 'pago' || status === 'paid');
        });
        const apenasPagas = resultadoFinal.filter(c => {
          const status = String(c?.status || '').toLowerCase();
          return (status === 'paga' || status === 'pago' || status === 'paid');
        });
        
        const resultadoCorrigido = [...naoPagas, ...apenasPagas];
        console.log('🔧 Resultado corrigido:', resultadoCorrigido.map(c => ({ nome: c?.cliente_nome, status: c?.status })));
        
        // Substituir pelo resultado corrigido
        filtered = resultadoCorrigido;
      } else {
        console.log(`✅ SUCESSO: Todas as cobranças pagas estão no final!`);
      }
    }
    
    console.log('=== ORDENAÇÃO FINALIZADA ===');
    console.log(`📋 Total final: ${filtered.length} cobranças`);
    console.log(`🔴 Vencidas: ${vencidasOrdenadas.length}`);
    console.log(`🟢 Em dias: ${emDiasOrdenadas.length}`);
    console.log(`✅ Pagas: ${pagasOrdenadas.length} (usando: ${pagasParaOrdenar.length})`);
    console.log(`⚪ Outros: ${outrosOrdenados.length}`);
    
    // Verificar se a ordenação está funcionando corretamente
    console.log('Primeiras 10 cobranças após ordenação:');
    filtered.slice(0, 10).forEach((c, i) => {
      console.log(`${i + 1}. ${c?.cliente_nome} - Status: ${c?.status}`);
    });
    
    // VERIFICAÇÃO FINAL: Confirmar que as pagas estão no final
    const ultimas10 = filtered.slice(-10);
    console.log('🔍 Últimas 10 cobranças da lista:');
    ultimas10.forEach((c, i) => {
      const indexReal = filtered.length - 10 + i;
      console.log(`${indexReal + 1}. ${c?.cliente_nome} - Status: ${c?.status}`);
    });

    console.log(`Cobranças finais: ${filtered.length}`);
    return filtered;
  }, [cobrancas, searchTerm, sortOrder, filtroDataVencimento, filtroMes, filtroStatus]);

  // Função para carregar clientes
  const carregarClientes = async () => {
    try {
      setLoadingClientes(true);
      const clientesData = await listarClientes();
      setClientes(clientesData as Cliente[]);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    } finally {
      setLoadingClientes(false);
    }
  };

  // Função para carregar cobranças
  const carregarCobrancas = async () => {
    try {
      setLoadingCobrancas(true);
      const cobrancasData = await listarCobrancas();
      setCobrancas(cobrancasData as Cobranca[]);
    } catch (error) {
      console.error('Erro ao carregar cobranças:', error);
    } finally {
      setLoadingCobrancas(false);
    }
  };

  // Função para verificar status das cobranças
  const verificarStatusCobrancas = async () => {
    try {
      console.log('Verificando status das cobranças...');
      const hoje = new Date();
      let atualizacoes = 0;
      
      for (const cobranca of cobrancas) {
        if (cobranca.status === 'paga') continue; // Pular cobranças já pagas
        
        const dataVencimento = parseToDate(cobranca.data_vencimento);
        if (!dataVencimento) continue;
        
        let novoStatus = cobranca.status;
        
        // Se a data de vencimento é menor que hoje e não foi paga, marca como vencida
        if (dataVencimento < hoje) {
          novoStatus = 'em_atraso';
        }
        // Se a data de vencimento é maior que hoje, marca como em dias
        else if (dataVencimento > hoje) {
          novoStatus = 'em_dias';
        }
        
        // Se o status mudou, atualizar no Firebase
        if (novoStatus !== cobranca.status) {
          try {
            console.log(`Atualizando status de ${cobranca.cliente_nome}: ${cobranca.status} -> ${novoStatus}`);
            await atualizarCobranca(cobranca.id, { status: novoStatus });
            atualizacoes++;
          } catch (error) {
            console.error(`Erro ao atualizar status de ${cobranca.cliente_nome}:`, error);
          }
        }
      }
      
      if (atualizacoes > 0) {
        console.log(`${atualizacoes} cobranças foram atualizadas`);
        await carregarCobrancas(); // Recarregar para mostrar as mudanças
        successQuick(`${atualizacoes} cobranças foram atualizadas!`);
      } else {
        successQuick('Todas as cobranças já estão com status correto!');
      }
    } catch (error) {
      console.error('Erro ao verificar status das cobranças:', error);
      alert('Erro ao verificar status das cobranças');
    }
  };

  // Carregar dados ao montar o componente
  useEffect(() => {
    // Inicializar Firebase primeiro
    const initData = async () => {
      try {
        const { initFirebase } = await import('../../config/database.config');
        await initFirebase();
        
        // Carregar dados
        await carregarCobrancas();
        await carregarClientes();
      } catch (error) {
        console.error('Erro ao inicializar:', error);
      }
    };
    
    initData();
  }, []);

  // Função para abrir o modal
  const handleOpenGerarCobrancaModal = async () => {
    setShowGerarCobrancaModal(true);
    // Carregar clientes quando abrir o modal
    if (clientes.length === 0) {
      await carregarClientes();
    }
  };

  // Função para fechar o modal
  const handleCloseGerarCobrancaModal = () => {
    setShowGerarCobrancaModal(false);
    setFormData({
      cliente_id: '',
      tipoCobranca: 'SKY',
      valor: '',
      dataVencimento: ''
    });
  };

  // Função para gerar cobrança
  const handleGerarCobranca = async () => {
    try {
      const cliente = clientes.find(c => c.id === formData.cliente_id);
      if (!cliente) {
        alert('Cliente não encontrado');
        return;
      }

      const novaCobranca = {
        cliente_id: formData.cliente_id,
        cliente_nome: cliente.nome,
        bairro: cliente.bairro,
        tipo: formData.tipoCobranca,
        data_vencimento: formData.dataVencimento,
        valor: parseFloat(formData.valor),
        status: 'em_dias' as const,
        data_criacao: new Date(),
        data_atualizacao: new Date()
      };

      await criarCobranca(novaCobranca);
      await carregarCobrancas();
      handleCloseGerarCobrancaModal();
      successQuick('Cobrança criada com sucesso!');
    } catch (error) {
      console.error('Erro ao criar cobrança:', error);
      alert('Erro ao criar cobrança');
    }
  };

  // Função para atualizar o formulário
  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Função para abrir modal de editar cobrança
  const handleOpenEditarCobrancaModal = (cobranca: Cobranca) => {
    // Simplificar a lógica de data para garantir que funcione
    let dataVencimentoNormalizada = '';
    if (cobranca?.data_vencimento) {
      try {
        dataVencimentoNormalizada = normalizeToInputDate(cobranca.data_vencimento);
      } catch (error) {
        console.error('Erro ao normalizar data:', error);
        // Fallback: tentar converter diretamente
        if (typeof cobranca.data_vencimento === 'string') {
          const dataParts = cobranca.data_vencimento.split('T')[0].split(' ')[0];
          dataVencimentoNormalizada = dataParts;
        }
      }
    }
    
    // Definir o formulário com valores padrão seguros
    const formData = {
      cliente_id: cobranca?.cliente_id || '',
      valor: (cobranca?.valor || 0).toString(),
      dataVencimento: dataVencimentoNormalizada,
      tipoAssinatura: cobranca?.tipo || 'SKY',
      observacao: cobranca?.observacao || '',
      status: (String(cobranca?.status || '').toUpperCase() === 'PAGO' ? 'PAGO' : 'EM_DIAS')
    };
    
    setCobrancaSelecionada(cobranca);
    setFormEditarCobranca(formData);
    setShowEditarCobrancaModal(true);
  };

  // Função para fechar modal de editar cobrança
  const handleCloseEditarCobrancaModal = () => {
    setShowEditarCobrancaModal(false);
    setCobrancaSelecionada(null);
    setFormEditarCobranca({
      cliente_id: '',
      valor: '',
      dataVencimento: '',
      tipoAssinatura: 'SKY',
      observacao: '',
      status: 'EM_DIAS'
    });
  };

  // Função para salvar alterações da cobrança
  const handleSalvarCobranca = async () => {
    if (cobrancaSelecionada) {
      try {
        // Validações básicas
        if (!formEditarCobranca.cliente_id) {
          alert('Por favor, selecione um cliente.');
          return;
        }
        
        if (!formEditarCobranca.valor || parseFloat(formEditarCobranca.valor) <= 0) {
          alert('Por favor, insira um valor válido para a cobrança.');
          return;
        }

        if (!formEditarCobranca.dataVencimento) {
          alert('Por favor, insira uma data de vencimento válida.');
          return;
        }

        // Calcular o status automaticamente baseado na data de vencimento
        let novoStatus = formEditarCobranca.status;
        const dataVencimento = parseToDate(formEditarCobranca.dataVencimento);
        const hoje = new Date();
        
        if (dataVencimento) {
          // Se a cobrança já foi paga, mantém como paga
          if (cobrancaSelecionada.status === 'paga' || cobrancaSelecionada.valor_pago) {
            novoStatus = 'paga';
          }
          // Se a data de vencimento é menor que hoje e não foi paga, marca como vencida
          else if (dataVencimento < hoje) {
            novoStatus = 'em_atraso';
          }
          // Se a data de vencimento é maior que hoje, marca como em dias
          else {
            novoStatus = 'em_dias';
          }
        }

        const dadosAtualizados = {
          cliente_id: formEditarCobranca.cliente_id,
          valor: parseFloat(formEditarCobranca.valor),
          data_vencimento: formEditarCobranca.dataVencimento,
          tipo: formEditarCobranca.tipoAssinatura,
          observacao: formEditarCobranca.observacao,
          status: novoStatus
        };

        await atualizarCobranca(cobrancaSelecionada.id, dadosAtualizados);
        await carregarCobrancas();
        handleCloseEditarCobrancaModal();
        successQuick('Cobrança atualizada com sucesso!');
      } catch (error) {
        console.error('Erro ao atualizar cobrança:', error);
        alert('Erro ao atualizar cobrança');
      }
    }
  };

  // Função para abrir modal de pagamento
  const handleOpenPagamentoModal = (cobranca: Cobranca) => {
    setCobrancaSelecionada(cobranca);
    const hoje = new Date();
    
    // Extrair mês/ano da data de vencimento da cobrança
    let mesAnoComprovante = '';
    if (cobranca?.data_vencimento) {
      const dataVencimento = parseToDate(cobranca.data_vencimento);
      if (dataVencimento) {
        const mes = dataVencimento.getMonth() + 1; // getMonth() retorna 0-11
        const ano = dataVencimento.getFullYear();
        mesAnoComprovante = `${ano}-${String(mes).padStart(2, '0')}`;
      }
    }
    
    // Se não conseguir extrair da data de vencimento, usar mês atual
    if (!mesAnoComprovante) {
      const mes = hoje.getMonth() + 1;
      const ano = hoje.getFullYear();
      mesAnoComprovante = `${ano}-${String(mes).padStart(2, '0')}`;
    }
    
    setFormPagamento({
      dataPagamento: hoje.toISOString().split('T')[0],
      metodoPagamento: '',
      valorRecebido: (cobranca?.valor || 0).toString(),
      comprovante: null,
      observacoes: '',
      mesAnoComprovante: mesAnoComprovante
    });
    setShowPagamentoModal(true);
  };

  // Função para fechar modal de pagamento
  const handleClosePagamentoModal = () => {
    setShowPagamentoModal(false);
    setCobrancaSelecionada(null);
    setFormPagamento({
      dataPagamento: '',
      metodoPagamento: '',
      valorRecebido: '',
      comprovante: null,
      observacoes: '',
      mesAnoComprovante: ''
    });
  };

  // Função para calcular próxima data de vencimento (versão local)
  const computeNextDueDateKeepingDay = (currentDue: Date): Date => {
    console.log('🔍 [COMPUTE DATE] Calculando próxima data a partir de:', currentDue.toLocaleDateString('pt-BR'));
    
    const currentDay = currentDue.getDate();
    const currentMonth = currentDue.getMonth();
    const currentYear = currentDue.getFullYear();
    
    let nextMonth = currentMonth + 1;
    let nextYear = currentYear;
    
    if (nextMonth > 11) {
      nextMonth = 0;
      nextYear += 1;
    }
    
    // Obter último dia do próximo mês
    const lastDayNextMonth = new Date(nextYear, nextMonth + 1, 0).getDate();
    let day = currentDay; // SEMPRE manter o dia original da fatura
    
    // LÓGICA CORRETA: Regras especiais para fevereiro e dia 31
    if (nextMonth === 1) { // Fevereiro (mês 1, índice 0)
      // Em fevereiro, sempre usar o último dia do mês
      day = lastDayNextMonth;
      console.log('🔍 [COMPUTE DATE] Fevereiro detectado - usando último dia:', day);
    } else if (currentDay === 31) {
      // Se o dia original é 31, NUNCA usar 31 (exceto em fevereiro)
      // Usar o último dia do próximo mês
      day = lastDayNextMonth;
      console.log('🔍 [COMPUTE DATE] Dia 31 detectado - usando último dia do próximo mês:', day);
    } else if (currentDay > lastDayNextMonth) {
      // Se o dia original não existe no próximo mês, usar o último dia disponível
      day = lastDayNextMonth;
      console.log('🔍 [COMPUTE DATE] Dia original não existe no próximo mês - usando último dia:', day);
    }
    
    const result = new Date(nextYear, nextMonth, day);
    
    console.log('✅ [COMPUTE DATE] Resultado:', result.toLocaleDateString('pt-BR'));
    console.log('🔍 [COMPUTE DATE] Regra aplicada:', 
      nextMonth === 1 ? 'Fevereiro - último dia' : 
      currentDay === 31 ? 'Dia 31 - último dia disponível' : 
      currentDay > lastDayNextMonth ? 'Dia não existe - último dia' : 
      'Mantém dia original'
    );
    
    return result;
  };

  // Função para gerar nova cobrança automaticamente
  const gerarNovaCobrancaAutomatica = async (cobrancaPaga: Cobranca) => {
    try {
      console.log('🔍 [NOVA COBRANÇA] Iniciando geração automática para:', cobrancaPaga.cliente_nome);
      
      // CORREÇÃO: SEMPRE usar a data de vencimento original da fatura
      // NUNCA usar data atual + 30 dias
      let dataVencimentoOriginal: Date;
      
      if (cobrancaPaga.vencimento && cobrancaPaga.vencimento.seconds) {
        dataVencimentoOriginal = new Date(cobrancaPaga.vencimento.seconds * 1000);
        console.log('✅ [NOVA COBRANÇA] Usando campo vencimento (Timestamp):', dataVencimentoOriginal.toLocaleDateString('pt-BR'));
      } else if (cobrancaPaga.vencimento && cobrancaPaga.vencimento instanceof Date) {
        dataVencimentoOriginal = cobrancaPaga.vencimento;
        console.log('✅ [NOVA COBRANÇA] Usando campo vencimento (Date):', dataVencimentoOriginal.toLocaleDateString('pt-BR'));
      } else if (cobrancaPaga.data_vencimento) {
        try {
          if (typeof cobrancaPaga.data_vencimento === 'string') {
            dataVencimentoOriginal = new Date(cobrancaPaga.data_vencimento);
            if (isNaN(dataVencimentoOriginal.getTime())) {
              const parts = cobrancaPaga.data_vencimento.split('/');
              if (parts.length === 3) {
                dataVencimentoOriginal = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
              }
            }
          } else {
            dataVencimentoOriginal = new Date(cobrancaPaga.data_vencimento);
          }
          
          if (isNaN(dataVencimentoOriginal.getTime())) {
            throw new Error('Data de vencimento inválida após parsing');
          }
          
          console.log('✅ [NOVA COBRANÇA] Usando campo data_vencimento:', dataVencimentoOriginal.toLocaleDateString('pt-BR'));
        } catch (error) {
          console.error('❌ [NOVA COBRANÇA] Erro ao fazer parsing da data_vencimento:', error);
          throw new Error('Não foi possível determinar a data de vencimento original');
        }
      } else {
        console.error('❌ [NOVA COBRANÇA] Data de vencimento não encontrada para cobrança:', cobrancaPaga);
        throw new Error('Data de vencimento não encontrada');
      }
      
      console.log('🔍 [NOVA COBRANÇA] Data de vencimento original:', {
        data: dataVencimentoOriginal.toLocaleDateString('pt-BR'),
        dia: dataVencimentoOriginal.getDate(),
        mes: dataVencimentoOriginal.getMonth() + 1,
        ano: dataVencimentoOriginal.getFullYear()
      });
      
      // CORREÇÃO: Calcular próxima data usando a lógica correta
      const proximoVencimento = computeNextDueDateKeepingDay(dataVencimentoOriginal);
      
      console.log('🔍 [NOVA COBRANÇA] Próximo vencimento calculado:', {
        data: proximoVencimento.toLocaleDateString('pt-BR'),
        dia: proximoVencimento.getDate(),
        mes: proximoVencimento.getMonth() + 1,
        ano: proximoVencimento.getFullYear()
      });
      
      // Formatar data para YYYY-MM-DD
      const dataFormatada = proximoVencimento.toISOString().split('T')[0];
      
      const novaCobranca = {
        cliente_id: cobrancaPaga.cliente_id,
        cliente_nome: cobrancaPaga.cliente_nome,
        bairro: cobrancaPaga.bairro,
        tipo: cobrancaPaga.tipo,
        data_vencimento: dataFormatada,
        valor: cobrancaPaga.valor,
        status: 'em_dias' as const,
        data_criacao: new Date(),
        data_atualizacao: new Date(),
        geradoAutomaticamente: true, // Marcar como gerada automaticamente
        referenciaAno: proximoVencimento.getFullYear(),
        referenciaMes: proximoVencimento.getMonth() + 1
      };

      await criarCobranca(novaCobranca);
      console.log(`✅ [NOVA COBRANÇA] Nova cobrança gerada automaticamente para ${cobrancaPaga.cliente_nome}`);
      console.log(`📅 [NOVA COBRANÇA] Vencimento original: ${dataVencimentoOriginal.toLocaleDateString('pt-BR')}`);
      console.log(`🎯 [NOVA COBRANÇA] Próximo vencimento: ${proximoVencimento.toLocaleDateString('pt-BR')}`);
    } catch (error) {
      console.error('❌ [NOVA COBRANÇA] Erro ao gerar nova cobrança automaticamente:', error);
      throw error; // Re-throw para tratamento adequado
    }
  };

  // Função para processar pagamento
  const handleProcessarPagamento = async () => {
    if (cobrancaSelecionada) {
      try {
        if (isProcessingPayment) return;
        setIsProcessingPayment(true);
        // Validar campos obrigatórios
        if (!formPagamento.dataPagamento || !formPagamento.metodoPagamento || !formPagamento.valorRecebido || !formPagamento.comprovante || !formPagamento.mesAnoComprovante) {
          alert('Por favor, preencha todos os campos obrigatórios');
          return;
        }

        // LER ARQUIVO EM BASE64
        const reader = new FileReader();
        const base64: string = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(formPagamento.comprovante!);
        });
        
        // Validação de tamanho (máx. 10MB)
        const fileSizeBytes = formPagamento.comprovante.size || 0;
        const maxBytes = 10 * 1024 * 1024;
        if (fileSizeBytes > maxBytes) {
          alert('Arquivo muito grande. Tamanho máximo permitido é 10MB.');
          return;
        }

        // Extrair somente a parte base64 sem prefixo
        const sep = 'base64,';
        const idx = base64.indexOf(sep);
        const pureBase64 = idx >= 0 ? base64.substring(idx + sep.length).replace(/\s/g, '') : base64.replace(/\s/g, '');

        // Marcar como paga via API nova (gera próxima automaticamente com idempotência)
        console.log('🔍 [PAGAMENTO] Iniciando marcação como paga...');
        console.log('🔍 [PAGAMENTO] ID da cobrança:', cobrancaSelecionada.id);
        console.log('🔍 [PAGAMENTO] Cliente:', cobrancaSelecionada.cliente_nome);
        console.log('🔍 [PAGAMENTO] Data de vencimento original:', cobrancaSelecionada.data_vencimento);
        console.log('🔍 [PAGAMENTO] Campo vencimento:', cobrancaSelecionada.vencimento);
        console.log('🔍 [PAGAMENTO] Data de pagamento:', formPagamento.dataPagamento);
        
        await marcarComoPaga(cobrancaSelecionada.id, {
          valorTotalPago: parseFloat(formPagamento.valorRecebido.replace(/[^\d,]/g, '').replace(',', '.')),
          formaPagamento: formPagamento.metodoPagamento,
          juros: 0,
          multa: 0,
          diasAtraso: 0,
          pagoEm: new Date(formPagamento.dataPagamento + 'T00:00:00'),
          comprovante: {
            base64: pureBase64,
            mimeType: formPagamento.comprovante?.type || 'application/octet-stream',
            filename: formPagamento.comprovante?.name || 'comprovante',
            uploadedAt: new Date()
          }
        });
        
        console.log('✅ [PAGAMENTO] marcarComoPaga executada com sucesso');
        console.log('🔍 [PAGAMENTO] Aguardando recarregamento das cobranças...');

        await carregarCobrancas();
        handleClosePagamentoModal();
        successQuick('✅ Pagamento registrado com sucesso! Próxima cobrança gerada.');
      } catch (error) {
        console.error('Erro ao processar pagamento:', error);
        alert('Erro ao processar pagamento');
      } finally {
        setIsProcessingPayment(false);
      }
    }
  };

  // Função para atualizar formulário de edição
  const handleFormEditarChange = (field: string, value: string) => {
    setFormEditarCobranca(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Função para atualizar formulário de pagamento
  const handleFormPagamentoChange = (field: string, value: string | File | null) => {
    setFormPagamento(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Função para deletar cobrança
  const handleDeletarCobranca = async (cobranca: Cobranca) => {
    if (confirm(`Tem certeza que deseja deletar a cobrança de ${cobranca?.cliente_nome || 'Cliente'}?`)) {
      try {
        await removerCobranca(cobranca.id);
        // Recarregar cobranças após deletar
        carregarCobrancas();
      } catch (error) {
        console.error('Erro ao deletar cobrança:', error);
        alert('Erro ao deletar cobrança');
      }
    }
  };

  // Função para validar formato base64
  const isValidBase64 = (str: string): boolean => {
    try {
      if (!str || typeof str !== 'string') {
        console.log('❌ [BASE64] String inválida ou vazia');
        return false;
      }
      
      // Remove prefixos data: se existirem
      const cleanBase64 = str.replace(/^data:[^;]+;base64,/, '');
      
      // Verificar se tem caracteres válidos de base64
      const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
      if (!base64Regex.test(cleanBase64)) {
        console.log('❌ [BASE64] Caracteres inválidos no base64');
        return false;
      }
      
      // Verificar se o comprimento é múltiplo de 4 (após padding)
      if (cleanBase64.length % 4 !== 0) {
        console.log('❌ [BASE64] Comprimento inválido (não é múltiplo de 4)');
        return false;
      }
      
      // Tentar decodificar e recodificar
      const decoded = atob(cleanBase64);
      const reencoded = btoa(decoded);
      
      const isValid = reencoded === cleanBase64;
      console.log('🔍 [BASE64] Validação:', {
        tamanhoOriginal: cleanBase64.length,
        tamanhoDecodificado: decoded.length,
        valido: isValid
      });
      
      return isValid;
    } catch (error) {
      console.error('❌ [BASE64] Erro na validação:', error);
      return false;
    }
  };

  // Função para visualizar comprovante (a partir do documento da cobrança)
  const visualizarComprovante = async (cobrancaId: string) => {
    try {
      console.log('🔍 [COMPROVANTE] Iniciando visualização para cobrança:', cobrancaId);
      
      // 1. Buscar cobrança
      const alvo = cobrancas.find(c => c.id === cobrancaId);
      console.log('🔍 [COMPROVANTE] Cobrança encontrada:', {
        id: alvo?.id,
        status: alvo?.status,
        temComprovante: !!alvo?.comprovante
      });
      
      if (!alvo) {
        console.error('❌ [COMPROVANTE] Cobrança não encontrada');
        alert('Cobrança não encontrada.');
        return;
      }
      
      // 2. Verificar status da cobrança
      const statusUpper = String(alvo.status || '').toUpperCase();
      console.log('🔍 [COMPROVANTE] Status da cobrança:', statusUpper);
      
      if (statusUpper !== 'PAGO' && statusUpper !== 'PAGA') {
        console.warn('⚠️ [COMPROVANTE] Cobrança não está paga:', statusUpper);
        alert('Esta cobrança ainda não foi paga. Comprovantes só estão disponíveis para cobranças pagas.');
        return;
      }
      
      // 3. Verificar se existe comprovante
      const comp = (alvo as any)?.comprovante;
      console.log('🔍 [COMPROVANTE] Dados do comprovante:', {
        existe: !!comp,
        temBase64: !!comp?.base64,
        temMimeType: !!comp?.mimeType,
        filename: comp?.filename,
        tamanhoBase64: comp?.base64?.length || 0
      });
      
      if (!comp) {
        console.warn('⚠️ [COMPROVANTE] Nenhum comprovante encontrado');
        alert('Nenhum comprovante foi anexado a esta cobrança.');
        return;
      }
      
      // 4. Validar dados do comprovante
      if (!comp.base64) {
        console.error('❌ [COMPROVANTE] Base64 ausente');
        alert('Comprovante corrompido: dados de imagem ausentes.');
        return;
      }
      
      if (!comp.mimeType) {
        console.warn('⚠️ [COMPROVANTE] MimeType ausente, usando fallback');
        comp.mimeType = 'application/octet-stream';
      }
      
      // 5. Validar formato base64
      const cleanBase64 = comp.base64.replace(/^data:[^;]+;base64,/, '');
      if (!isValidBase64(cleanBase64)) {
        console.error('❌ [COMPROVANTE] Base64 inválido');
        alert('Comprovante corrompido: formato de dados inválido.');
        return;
      }
      
      // 6. Preparar dados para o modal
      const comprovanteData = {
        base64: cleanBase64,
        mimeType: comp.mimeType,
        filename: comp.filename || 'comprovante'
      };
      
      console.log('✅ [COMPROVANTE] Abrindo modal com dados válidos:', {
        mimeType: comprovanteData.mimeType,
        filename: comprovanteData.filename,
        tamanhoBase64: comprovanteData.base64.length
      });
      
      setComprovanteView(comprovanteData);
      setShowComprovanteModal(true);
      
    } catch (error) {
      console.error('❌ [COMPROVANTE] Erro inesperado:', error);
      alert('Erro inesperado ao carregar comprovante. Tente novamente.');
    }
  };

  return (
    <div style={{ 
      padding: '24px', 
      backgroundColor: 'var(--color-primary-50)',
      minHeight: '100vh'
    }}>
      {/* Header Banner */}
      <CobrancasHeader 
        totalCobrancas={cobrancas.length}
        valorTotal={cobrancas.reduce((acc, c) => acc + (c?.valor || 0), 0)}
        loading={loadingCobrancas}
      />

      {/* Statistics Cards */}
      <CobrancasStatistics 
        cobrancas={cobrancas}
        loading={loadingCobrancas}
      />

      {/* Botões de ação */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'row', 
        gap: '16px', 
        marginBottom: '24px',
        flexWrap: 'wrap'
      }}>

        <Button variant="primary" icon={
          <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        } onClick={handleOpenGerarCobrancaModal}>
          Gerar Cobranças
        </Button>

      </div>

      {/* Barra de busca e filtros */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '16px', 
        marginBottom: '24px'
      }}>
        {/* Busca */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <span style={{ fontWeight: 'bold', minWidth: '80px' }}>Busca:</span>
          <Input
            placeholder="Buscar por cliente ou bairro..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ flex: 1 }}
            leftIcon={
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0z" />
              </svg>
            }
          />
        </div>
        
        {/* Filtros */}
        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          alignItems: 'center', 
          flexWrap: 'wrap',
          border: '1px solid var(--border-primary)',
          padding: '12px',
          borderRadius: '8px',
          backgroundColor: 'white'
        }}>
          <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-primary)' }}>Filtros:</span>
          
          {/* Ordenação */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px' }}>Ordenar:</span>
            <select
              value={sortOrder}
              onChange={(e) => {
                console.log('🔄 [ORDENAÇÃO] Mudando de', sortOrder, 'para', e.target.value);
                setSortOrder(e.target.value);
              }}
              style={{
                padding: '6px 10px',
                border: '1px solid var(--border-primary)',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              <option value="alfabetica">Alfabética</option>
              <option value="vencimento">Vencimento</option>
              <option value="valor">Valor</option>
            </select>
          </div>

          {/* Filtro por Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px' }}>Status:</span>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              style={{
                padding: '6px 10px',
                border: '1px solid var(--border-primary)',
                borderRadius: '4px',
                fontSize: '14px',
                minWidth: '120px'
              }}
            >
              <option value="">Todos</option>
              <option value="em_dias">Em dias</option>
              <option value="paga">Pagas</option>
              <option value="em_atraso">Vencidas</option>
            </select>
          </div>

          {/* Filtro por Mês */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px' }}>Mês:</span>
            <select
              value={filtroMes}
              onChange={(e) => setFiltroMes(e.target.value)}
              style={{
                padding: '6px 10px',
                border: '1px solid var(--border-primary)',
                borderRadius: '4px',
                fontSize: '14px',
                minWidth: '140px'
              }}
            >
              <option value="">Todos</option>
              {mesesDisponiveis && mesesDisponiveis.length > 0 ? (
                mesesDisponiveis.map(({ valor, label, count }) => (
                  <option key={valor} value={valor}>
                    {label} ({count})
                  </option>
                ))
              ) : (
                <option value="" disabled>Carregando...</option>
              )}
            </select>
          </div>

          {/* Filtro por Dia */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px' }}>Dia:</span>
            <select
              value={filtroDataVencimento}
              onChange={(e) => setFiltroDataVencimento(e.target.value)}
              style={{
                padding: '6px 10px',
                border: '1px solid var(--border-primary)',
                borderRadius: '4px',
                fontSize: '14px',
                minWidth: '100px'
              }}
            >
              <option value="">Todos</option>
              {datasVencimentoDisponiveis && datasVencimentoDisponiveis.length > 0 ? (
                datasVencimentoDisponiveis.map(({ data, dia, count }) => (
                  <option key={dia} value={dia}>
                    Dia {dia} ({count})
                  </option>
                ))
              ) : (
                <option value="" disabled>Carregando...</option>
              )}
            </select>
          </div>

          {/* Botão para limpar todos os filtros */}
          {(filtroStatus || filtroMes || filtroDataVencimento || searchTerm) && (
            <Button 
              variant="outline" 
              onClick={limparTodosFiltros}
              style={{
                fontSize: '12px',
                padding: '6px 12px',
                backgroundColor: 'var(--color-error-50)',
                borderColor: 'var(--color-error-300)',
                color: 'var(--color-error-700)'
              }}
            >
              🗑️ Limpar Filtros
            </Button>
          )}
        </div>
        
        {/* Nota sobre ordenação automática por status */}
        <div style={{
          fontSize: '12px',
          color: 'var(--text-tertiary)',
          fontStyle: 'italic',
          marginTop: '8px',
          padding: '8px 12px',
          backgroundColor: 'var(--color-success-50)',
          border: '1px solid var(--color-success-200)',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <svg style={{ width: '14px', height: '14px', color: 'var(--color-success-500)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>
            <strong>✅ Ordenação automática ativa:</strong> Vencidas → Em dias → Pagas (sempre respeitada)
          </span>
        </div>
      </div>

      {/* Tabela de cobranças */}
      <Card variant="elevated" padding="none">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%' }}>
            <thead style={{ backgroundColor: 'var(--color-gray-50)' }}>
              <tr>
                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Cliente
                </th>
                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Bairro
                </th>
                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Tipo
                </th>
                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Vencimento
                </th>
                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Valor
                </th>
                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Data Pagamento
                </th>
                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Status
                </th>
                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Observação
                </th>
                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Ações
                </th>
              </tr>
            </thead>
            <tbody style={{ backgroundColor: 'white' }}>
              {loadingCobrancas ? (
                <tr>
                  <td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    Carregando cobranças...
                  </td>
                </tr>
              ) : filteredAndSortedCobrancas.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    Nenhuma cobrança encontrada
                  </td>
                </tr>
              ) : (
                filteredAndSortedCobrancas.map((cobranca: Cobranca) => (
                <tr key={cobranca.id} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                  <td style={{ padding: '16px 24px', fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)' }}>
                    {cobranca?.cliente_nome || 'N/A'}
                  </td>
                  <td style={{ padding: '16px 24px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                    {cobranca?.bairro || 'N/A'}
                  </td>
                  <td style={{ padding: '16px 24px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                    {cobranca?.tipo || 'N/A'}
                  </td>
                  <td style={{ padding: '16px 24px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                    {(() => {
                      const d = getDataVencimento(cobranca);
                      return d ? `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}` : 'N/A';
                    })()}
                  </td>
                  <td style={{ padding: '16px 24px', fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)' }}>
                    {cobranca?.valor ? formatCurrency(cobranca.valor) : 'N/A'}
                  </td>
                  <td style={{ padding: '16px 24px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                    {String(cobranca?.status || '').toUpperCase() === 'PAGO' && (cobranca?.pagoEm || cobranca?.data_pagamento) ? formatDateForDisplay(cobranca.pagoEm || cobranca.data_pagamento) : '-'}
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    {getStatusBadge(cobranca.status)}
                  </td>
                  <td style={{ padding: '16px 24px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                    {cobranca.observacao || '-'}
                  </td>
                  <td style={{ padding: '16px 24px', fontSize: '14px', fontWeight: '500' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      {String(cobranca?.status || '').toUpperCase() === 'PAGO' ? (
                        <button 
                          style={{ 
                            color: 'var(--color-primary-600)', 
                            padding: '8px 10px', 
                            borderRadius: '6px',
                            border: '1px solid var(--color-primary-200)',
                            backgroundColor: 'var(--color-primary-50)',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px'
                          }}
                          onClick={() => handleOpenEditarCobrancaModal(cobranca)}
                          title="Visualizar cobrança"
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--color-primary-100)';
                            e.currentTarget.style.borderColor = 'var(--color-primary-300)';
                            e.currentTarget.style.transform = 'scale(1.05)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--color-primary-50)';
                            e.currentTarget.style.borderColor = 'var(--color-primary-200)';
                            e.currentTarget.style.transform = 'scale(1)';
                          }}
                        >
                          <svg style={{ width: '18px', height: '18px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          <span style={{ fontSize: '12px', fontWeight: 500 }}>Visualizar</span>
                        </button>
                      ) : (
                        <button 
                          style={{ 
                            color: 'var(--color-primary-600)', 
                            padding: '8px', 
                            borderRadius: '6px',
                            border: '1px solid var(--color-primary-200)',
                            backgroundColor: 'var(--color-primary-50)',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: '36px',
                            minHeight: '36px'
                          }}
                          onClick={() => handleOpenEditarCobrancaModal(cobranca)}
                          title="Editar cobrança"
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--color-primary-100)';
                            e.currentTarget.style.borderColor = 'var(--color-primary-300)';
                            e.currentTarget.style.transform = 'scale(1.05)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--color-primary-50)';
                            e.currentTarget.style.borderColor = 'var(--color-primary-200)';
                            e.currentTarget.style.transform = 'scale(1)';
                          }}
                        >
                          <svg style={{ width: '18px', height: '18px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      )}
                      {(() => {
                        // Verificar se a cobrança foi paga (por status ou por ter data de pagamento)
                        const statusNormalizado = String(cobranca?.status || '').toLowerCase();
                        const temDataPagamento = !!(cobranca?.pagoEm || cobranca?.data_pagamento);
                        const foiPaga = statusNormalizado === 'paga' || statusNormalizado === 'pago' || statusNormalizado === 'paid' || temDataPagamento;
                        
                        if (foiPaga) {
                          return null; // Não mostrar botão de pagamento para cobranças pagas
                        }
                        
                        return (
                        <button 
                          style={{ 
                            color: 'var(--color-success-600)', 
                            padding: '8px', 
                            borderRadius: '6px',
                            border: '1px solid var(--color-success-200)',
                            backgroundColor: 'var(--color-success-50)',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: '36px',
                            minHeight: '36px'
                          }}
                          onClick={() => handleOpenPagamentoModal(cobranca)}
                          title="Registrar pagamento"
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--color-success-100)';
                            e.currentTarget.style.borderColor = 'var(--color-success-300)';
                            e.currentTarget.style.transform = 'scale(1.05)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--color-success-50)';
                            e.currentTarget.style.borderColor = 'var(--color-success-200)';
                            e.currentTarget.style.transform = 'scale(1)';
                          }}
                        >
                          <svg style={{ width: '18px', height: '18px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                          </svg>
                        </button>
                        );
                      })()}
                      <button 
                        style={{ 
                          color: 'var(--color-error-600)', 
                          padding: '8px', 
                          borderRadius: '6px',
                          border: '1px solid var(--color-error-200)',
                          backgroundColor: 'var(--color-error-50)',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: '36px',
                          minHeight: '36px'
                        }}
                        onClick={() => handleDeletarCobranca(cobranca)}
                        title="Deletar cobrança"
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--color-error-100)';
                          e.currentTarget.style.borderColor = 'var(--color-error-300)';
                          e.currentTarget.style.transform = 'scale(1.05)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--color-error-50)';
                          e.currentTarget.style.borderColor = 'var(--color-error-200)';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        <svg style={{ width: '18px', height: '18px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Gerar Cobrança */}
      <Modal
        open={showGerarCobrancaModal}
        onClose={handleCloseGerarCobrancaModal}
        title="Gerar Cobranças Mensais"
        size="md"
      >
        <div style={{ padding: '24px' }}>
          {/* Título principal */}
          <div style={{ marginBottom: '24px', textAlign: 'center' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '12px',
              marginBottom: '8px'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                backgroundColor: 'var(--color-primary-100)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg style={{ width: '20px', height: '20px', color: 'var(--color-primary-600)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <h2 style={{ 
                fontSize: '20px', 
                fontWeight: '600', 
                color: 'var(--text-primary)',
                margin: 0
              }}>
                Gerar Cobrança de Mensalidade
              </h2>
            </div>
            <p style={{ 
              fontSize: '14px', 
              color: 'var(--text-secondary)',
              margin: 0
            }}>
              Selecione o cliente, tipo de cobrança e valor para gerar uma cobrança de mensalidade.
            </p>
          </div>

          {/* Formulário */}
          <div style={{ marginBottom: '24px' }}>
                        {/* Cliente */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <label style={{ 
                  fontSize: '14px', 
                  fontWeight: '500', 
                  color: 'var(--text-primary)'
                }}>
                  Cliente *
                </label>
                {!loadingClientes && clientes.length > 0 && (
                  <button
                    onClick={carregarClientes}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-primary-600)',
                      cursor: 'pointer',
                      fontSize: '12px',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    title="Atualizar lista de clientes"
                  >
                    <svg style={{ width: '12px', height: '12px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Atualizar
                  </button>
                )}
              </div>
              {loadingClientes ? (
                <div style={{
                  padding: '12px',
                  backgroundColor: 'var(--color-gray-50)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: '8px',
                  textAlign: 'center',
                  color: 'var(--text-secondary)',
                  fontSize: '14px'
                }}>
                  Carregando clientes...
                </div>
              ) : clientes.length === 0 ? (
                <div style={{
                  padding: '12px',
                  backgroundColor: 'var(--color-warning-50)',
                  border: '1px solid var(--color-warning-200)',
                  borderRadius: '8px',
                  textAlign: 'center',
                  color: 'var(--color-warning-700)',
                  fontSize: '14px'
                }}>
                  Nenhum cliente cadastrado no sistema
                </div>
              ) : (
                <select
                  value={formData.cliente_id}
                  onChange={(e) => handleFormChange('cliente_id', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid var(--border-primary)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    color: 'var(--text-primary)',
                    backgroundColor: 'white'
                  }}
                >
                  <option value="">Selecione um cliente</option>
                  {clientes
                    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
                    .map(cliente => (
                      <option key={cliente.id} value={cliente.id}>
                        {cliente.nome}{cliente.bairro ? ` - ${cliente.bairro}` : ''}
                      </option>
                    ))}
                </select>
              )}
            </div>

            {/* Tipo de Cobrança */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '500', 
                color: 'var(--text-primary)',
                marginBottom: '8px'
              }}>
                Tipo de Cobrança *
              </label>
                          <select
              value={formData.tipoCobranca}
              onChange={(e) => handleFormChange('tipoCobranca', e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid var(--border-primary)',
                borderRadius: '8px',
                fontSize: '14px',
                color: 'var(--text-primary)',
                backgroundColor: 'white'
              }}
            >
              <option value="SKY">SKY</option>
              <option value="TV_BOX">TV BOX</option>
              <option value="COMBO">COMBO (SKY E TV BOX)</option>
            </select>
            </div>

            {/* Valor da Mensalidade */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '500', 
                color: 'var(--text-primary)',
                marginBottom: '8px'
              }}>
                Valor da Mensalidade *
              </label>
              <Input
                type="text"
                value={formData.valor ? `R$ ${formData.valor}` : ''}
                onChange={(e) => {
                  const valor = e.target.value.replace(/R\$\s*/g, '');
                  handleFormChange('valor', valor);
                }}
                onBlur={(e) => {
                  if (formData.valor) {
                    const valorFormatado = `${formData.valor},00`;
                    handleFormChange('valor', valorFormatado);
                  }
                }}
                placeholder="R$ 0,00"
              />
            </div>

            {/* Data de Vencimento */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '500', 
                color: 'var(--text-primary)',
                marginBottom: '8px'
              }}>
                Data de Vencimento *
              </label>
              <Input
                type="date"
                value={formData.dataVencimento}
                onChange={(e) => handleFormChange('dataVencimento', e.target.value)}
                leftIcon={
                  <svg style={{ width: '16px', height: '16px', color: 'var(--text-tertiary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                }
              />
            </div>
          </div>

          {/* Mensagem informativa */}
          <div style={{
            backgroundColor: 'var(--color-info-50)',
            border: '1px solid var(--color-info-200)',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px'
          }}>
            <div style={{
              width: '20px',
              height: '20px',
              backgroundColor: 'var(--color-info-500)',
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
            <p style={{
              fontSize: '14px',
              color: 'var(--color-info-700)',
              margin: 0,
              lineHeight: '1.5'
            }}>
              A cobrança será criada com status em dias e poderá receber o comprovante de pagamento posteriormente.
            </p>
          </div>

          {/* Botões de ação */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px'
          }}>
            <Button variant="outline" onClick={handleCloseGerarCobrancaModal}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleGerarCobranca}>
              Gerar Cobrança
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Comprovante de Pagamento */}
      <Modal
        open={showComprovanteModal}
        onClose={() => {
          console.log('🚪 [MODAL] Fechando modal de comprovante via onClose');
          setShowComprovanteModal(false);
          setComprovanteView(null);
        }}
        title={"Comprovante de Pagamento"}
        size="lg"
        maskClosable={true}
        closable={true}
      >
        <div style={{ padding: '16px' }}>
          {!comprovanteView || !comprovanteView.base64 || !comprovanteView.mimeType ? (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              backgroundColor: 'var(--color-error-50)',
              borderRadius: '8px',
              border: '1px solid var(--color-error-200)'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                backgroundColor: 'var(--color-error-100)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px'
              }}>
                <svg style={{ width: '24px', height: '24px', color: 'var(--color-error-600)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 style={{ 
                fontSize: '16px', 
                fontWeight: '600', 
                color: 'var(--color-error-700)', 
                marginBottom: '8px' 
              }}>
                Comprovante não disponível
              </h3>
              <p style={{ 
                fontSize: '14px', 
                color: 'var(--color-error-600)', 
                marginBottom: '0' 
              }}>
                Não foi possível carregar o comprovante. Os dados podem estar corrompidos ou ausentes.
              </p>
            </div>
          ) : (
            <div>
              {(() => {
                console.log('🖼️ [MODAL] Renderizando comprovante:', {
                  mimeType: comprovanteView.mimeType,
                  filename: comprovanteView.filename,
                  tamanhoBase64: comprovanteView.base64?.length || 0
                });

                const mimeType = String(comprovanteView.mimeType || '').toLowerCase();
                
                if (mimeType.startsWith('image/')) {
                  console.log('🖼️ [MODAL] Renderizando como imagem');
                  return (
                    <img
                      src={`data:${comprovanteView.mimeType};base64,${comprovanteView.base64}`}
                      alt={comprovanteView.filename || 'Comprovante'}
                      style={{ 
                        maxWidth: '100%', 
                        maxHeight: '80vh', 
                        display: 'block', 
                        marginBottom: '16px',
                        border: '1px solid var(--color-gray-200)',
                        borderRadius: '8px'
                      }}
                      onLoad={() => console.log('✅ [MODAL] Imagem carregada com sucesso')}
                      onError={(e) => {
                        console.error('❌ [MODAL] Erro ao carregar imagem:', e);
                        alert('Erro ao exibir a imagem. Tente baixar o arquivo.');
                      }}
                    />
                  );
                } else if (mimeType === 'application/pdf') {
                  console.log('📄 [MODAL] Renderizando como PDF');
                  return (
                    <iframe
                      src={`data:application/pdf;base64,${comprovanteView.base64}`}
                      style={{ 
                        width: '100%', 
                        height: '80vh', 
                        border: '1px solid var(--color-gray-200)', 
                        borderRadius: '8px',
                        marginBottom: '16px' 
                      }}
                      title="Comprovante PDF"
                      onLoad={() => console.log('✅ [MODAL] PDF carregado com sucesso')}
                    />
                  );
                } else {
                  console.log('📎 [MODAL] Formato não suportado para visualização:', mimeType);
                  return (
                    <div style={{
                      textAlign: 'center',
                      padding: '40px 20px',
                      backgroundColor: 'var(--color-warning-50)',
                      borderRadius: '8px',
                      border: '1px solid var(--color-warning-200)',
                      marginBottom: '16px'
                    }}>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        backgroundColor: 'var(--color-warning-100)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 16px'
                      }}>
                        <svg style={{ width: '24px', height: '24px', color: 'var(--color-warning-600)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <h3 style={{ 
                        fontSize: '16px', 
                        fontWeight: '600', 
                        color: 'var(--color-warning-700)', 
                        marginBottom: '8px' 
                      }}>
                        Formato não suportado
                      </h3>
                      <p style={{ 
                        fontSize: '14px', 
                        color: 'var(--color-warning-600)', 
                        marginBottom: '0' 
                      }}>
                        Este tipo de arquivo ({mimeType}) não pode ser visualizado no navegador, mas você pode baixá-lo.
                      </p>
                    </div>
                  );
                }
              })()}

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <a
                  href={`data:${comprovanteView.mimeType || 'application/octet-stream'};base64,${comprovanteView.base64}`}
                  download={comprovanteView.filename || 'comprovante'}
                  style={{ textDecoration: 'none' }}
                  onClick={() => console.log('💾 [MODAL] Iniciando download do comprovante')}
                >
                  <Button variant="primary">Baixar Comprovante</Button>
                </a>
                <Button variant="outline" onClick={() => {
                  console.log('🚪 [MODAL] Fechando modal de comprovante via botão');
                  setShowComprovanteModal(false);
                  setComprovanteView(null);
                }}>
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Modal Editar Cobrança */}
      <Modal
        open={showEditarCobrancaModal}
        onClose={handleCloseEditarCobrancaModal}
        title={String(cobrancaSelecionada?.status || '').toUpperCase() === 'PAGO' ? "Visualizar Cobrança" : "Editar Cobrança"}
        size="lg"
      >
        <div style={{ padding: '24px' }}>
          {/* Título e descrição */}
          <div style={{ marginBottom: '32px', textAlign: 'center' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '12px',
              marginBottom: '12px'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                backgroundColor: 'var(--color-primary-100)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg style={{ width: '24px', height: '24px', color: 'var(--color-primary-600)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </div>
              <h2 style={{ 
                fontSize: '24px', 
                fontWeight: '600', 
                color: 'var(--text-primary)',
                margin: 0
              }}>
                {String(cobrancaSelecionada?.status || '').toUpperCase() === 'PAGO' ? 'Visualizar Cobrança' : 'Editar Cobrança'}
              </h2>
            </div>
            <p style={{ 
              fontSize: '16px', 
              color: 'var(--text-secondary)',
              margin: 0,
              lineHeight: '1.5'
            }}>
              {String(cobrancaSelecionada?.status || '').toUpperCase() === 'PAGO' 
                ? 'Visualize os dados da cobrança paga e o comprovante enviado.'
                : 'Modifique os dados da cobrança conforme necessário'
              }
            </p>
          </div>

          {/* Formulário de edição */}
          <div style={{ marginBottom: '32px' }}>
            {/* Cliente */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '16px', 
                fontWeight: '500', 
                color: 'var(--text-primary)',
                marginBottom: '8px'
              }}>
                Cliente *
              </label>
              <select
                value={formEditarCobranca.cliente_id || cobrancaSelecionada?.cliente_id || ''}
                onChange={(e) => {
                  const clienteId = e.target.value;
                  const cliente = clientes.find(c => c.id === clienteId);
                  if (cliente) {
                    setFormEditarCobranca(prev => ({
                      ...prev,
                      cliente_id: clienteId
                    }));
                  }
                }}
                style={{
                  width: '100%',
                  padding: '16px',
                  border: '1px solid var(--border-primary)',
                  borderRadius: '8px',
                  fontSize: '16px',
                  color: 'var(--text-primary)',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
                disabled={String(cobrancaSelecionada?.status || '').toUpperCase() === 'PAGO'}
              >
                <option value="">Selecione um cliente</option>
                {clientes.map(cliente => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nome} - {cliente.bairro}
                  </option>
                ))}
              </select>
            </div>

            {/* Tipo da Cobrança */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '16px', 
                fontWeight: '500', 
                color: 'var(--text-primary)',
                marginBottom: '8px'
              }}>
                Tipo da Cobrança *
              </label>
              <select
                value={formEditarCobranca.tipoAssinatura}
                onChange={(e) => handleFormEditarChange('tipoAssinatura', e.target.value)}
                style={{
                  width: '100%',
                  padding: '16px',
                  border: '1px solid var(--border-primary)',
                  borderRadius: '8px',
                  fontSize: '16px',
                  color: 'var(--text-primary)',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
                disabled={String(cobrancaSelecionada?.status || '').toUpperCase() === 'PAGO'}
              >
                              <option value="SKY">SKY</option>
              <option value="TV_BOX">TV BOX</option>
              <option value="COMBO">COMBO (SKY + TV BOX)</option>
              </select>
            </div>

            {/* Data de Vencimento */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '16px', 
                fontWeight: '500', 
                color: 'var(--text-primary)',
                marginBottom: '8px'
              }}>
                Data de Vencimento *
              </label>
              <Input
                type="date"
                value={formEditarCobranca.dataVencimento}
                onChange={(e) => handleFormEditarChange('dataVencimento', e.target.value)}
                style={{
                  padding: '16px',
                  fontSize: '16px'
                }}
                disabled={String(cobrancaSelecionada?.status || '').toUpperCase() === 'PAGO'}
              />
            </div>

            {/* Valor da Cobrança */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '16px', 
                fontWeight: '500', 
                color: 'var(--text-primary)',
                marginBottom: '8px'
              }}>
                Valor da Cobrança *
              </label>
              <Input
                type="text"
                value={formEditarCobranca.valor ? `R$ ${formEditarCobranca.valor}` : ''}
                onChange={(e) => {
                  // Remove R$ e aceita apenas números
                  const valor = e.target.value.replace(/R\$\s*/g, '');
                  handleFormEditarChange('valor', valor);
                }}
                onBlur={(e) => {
                  // Quando sair do campo, adiciona ,00
                  if (formEditarCobranca.valor) {
                    const valorFormatado = `${formEditarCobranca.valor},00`;
                    handleFormEditarChange('valor', valorFormatado);
                  }
                }}
                placeholder="R$ 0,00"
                style={{
                  padding: '16px',
                  fontSize: '16px'
                }}
                disabled={String(cobrancaSelecionada?.status || '').toUpperCase() === 'PAGO'}
              />
            </div>

            {/* Status (atualizado automaticamente) */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '16px', 
                fontWeight: '500', 
                color: 'var(--text-primary)',
                marginBottom: '8px'
              }}>
                Status da Cobrança
              </label>
              <div style={{
                padding: '16px',
                border: '1px solid var(--border-primary)',
                borderRadius: '8px',
                fontSize: '16px',
                color: 'var(--text-primary)',
                backgroundColor: 'var(--color-gray-50)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                {getStatusBadge(formEditarCobranca.status)}
              </div>
            </div>

            {/* Comprovante (apenas para cobranças pagas) */}
            {String(cobrancaSelecionada?.status || '').toUpperCase() === 'PAGO' && (
              <div style={{ marginBottom: '24px' }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: '16px', 
                  fontWeight: '500', 
                  color: 'var(--text-primary)',
                  marginBottom: '8px'
                }}>
                  Comprovante de Pagamento
                </label>
                <div style={{
                  padding: '16px',
                  border: '1px solid var(--border-primary)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  color: 'var(--text-secondary)',
                  backgroundColor: 'var(--color-gray-50)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <svg style={{ width: '20px', height: '20px', color: 'var(--color-success-500)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Comprovante enviado em {cobrancaSelecionada?.data_pagamento ? formatDateForDisplay(cobrancaSelecionada.data_pagamento) : 'data não informada'}</span>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => cobrancaSelecionada && visualizarComprovante(cobrancaSelecionada.id)}
                    style={{
                      padding: '8px 16px',
                      fontSize: '14px'
                    }}
                  >
                    <svg style={{ width: '16px', height: '16px', marginRight: '8px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Visualizar
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Botões de ação */}
          {String(cobrancaSelecionada?.status || '').toUpperCase() === 'PAGO' ? (
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '16px'
            }}>
              <Button 
                variant="outline" 
                onClick={handleCloseEditarCobrancaModal}
                style={{
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: '500'
                }}
              >
                Fechar
              </Button>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '16px'
            }}>
              <Button 
                variant="outline" 
                onClick={handleCloseEditarCobrancaModal}
                style={{
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: '500'
                }}
              >
                Cancelar
              </Button>
              <Button 
                variant="primary" 
                onClick={handleSalvarCobranca}
                style={{
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: '500'
                }}
              >
                Salvar Alterações
              </Button>
            </div>
          )}
        </div>
      </Modal>

             {/* Modal Pagamento */}
       <Modal
         open={showPagamentoModal}
         onClose={handleClosePagamentoModal}
         title="Baixar Pagamento"
         size="md"
       >
        <div style={{ padding: '24px' }}>
          <div style={{ marginBottom: '24px', textAlign: 'center' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '12px',
              marginBottom: '8px'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                backgroundColor: 'var(--color-primary-100)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg style={{ width: '20px', height: '20px', color: 'var(--color-primary-600)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
                             <h2 style={{ 
                 fontSize: '20px', 
                 fontWeight: '600', 
                 color: 'var(--text-primary)',
                 margin: 0
               }}>
                 Baixar Pagamento
               </h2>
             </div>
             <p style={{ 
               fontSize: '14px', 
               color: 'var(--text-secondary)',
               margin: 0
             }}>
               Registre o pagamento desta cobrança preenchendo as informações abaixo e enviando o comprovante.
             </p>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '500', 
                color: 'var(--text-primary)',
                marginBottom: '8px'
              }}>
                Data do Pagamento *
              </label>
              <Input
                type="date"
                value={formPagamento.dataPagamento}
                onChange={(e) => handleFormPagamentoChange('dataPagamento', e.target.value)}
                leftIcon={
                  <svg style={{ width: '16px', height: '16px', color: 'var(--text-tertiary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                }
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '500', 
                color: 'var(--text-primary)',
                marginBottom: '8px'
              }}>
                Método de Pagamento *
              </label>
              <select
                value={formPagamento.metodoPagamento}
                onChange={(e) => handleFormPagamentoChange('metodoPagamento', e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid var(--border-primary)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  color: 'var(--text-primary)',
                  backgroundColor: 'white'
                }}
              >
                <option value="">Selecione um método</option>
                <option value="PIX">PIX</option>
                <option value="DINHEIRO">Dinheiro</option>
                <option value="LOTERICA">Lotérica</option>
                <option value="CHEQUE">Cheque</option>
                <option value="TED">TED</option>
                <option value="DOC">DOC</option>
              </select>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '500', 
                color: 'var(--text-primary)',
                marginBottom: '8px'
              }}>
                Valor Recebido *
              </label>
              <Input
                type="text"
                value={formPagamento.valorRecebido ? `R$ ${formPagamento.valorRecebido}` : ''}
                onChange={(e) => {
                  const valor = e.target.value.replace(/R\$\s*/g, '');
                  handleFormPagamentoChange('valorRecebido', valor);
                }}
                onBlur={(e) => {
                  if (formPagamento.valorRecebido) {
                    const valorFormatado = `${formPagamento.valorRecebido},00`;
                    handleFormPagamentoChange('valorRecebido', valorFormatado);
                  }
                }}
                placeholder="R$ 0,00"
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '500', 
                color: 'var(--text-primary)',
                marginBottom: '8px'
              }}>
                Comprovante de Pagamento *
              </label>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: '12px', 
                  color: 'var(--text-secondary)',
                  marginBottom: '4px'
                }}>
                  Mês/Ano do Comprovante (baseado na data de vencimento)
                </label>
                <Input
                  type="text"
                  value={formPagamento.mesAnoComprovante}
                  readOnly
                  style={{ 
                    marginBottom: '8px',
                    backgroundColor: 'var(--color-gray-50)',
                    cursor: 'not-allowed'
                  }}
                />
              </div>
              <Input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => handleFormPagamentoChange('comprovante', e.target.files?.[0] || null)}
                leftIcon={
                  <svg style={{ width: '16px', height: '16px', color: 'var(--text-tertiary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                }
              />
              <p style={{ 
                fontSize: '12px', 
                color: 'var(--text-secondary)', 
                marginTop: '4px',
                marginBottom: 0
              }}>
                Aceita imagens (JPG, PNG) e PDFs. O mês/ano é automaticamente baseado na data de vencimento da cobrança.
              </p>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '500', 
                color: 'var(--text-primary)',
                marginBottom: '8px'
              }}>
                Observações
              </label>
              <Input
                type="text"
                value={formPagamento.observacoes}
                onChange={(e) => handleFormPagamentoChange('observacoes', e.target.value)}
                placeholder="Digite observações sobre o pagamento"
                leftIcon={
                  <svg style={{ width: '16px', height: '16px', color: 'var(--text-tertiary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />
            </div>
          </div>

          <div style={{
            backgroundColor: 'var(--color-info-50)',
            border: '1px solid var(--color-info-200)',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px'
          }}>
            <div style={{
              width: '20px',
              height: '20px',
              backgroundColor: 'var(--color-info-500)',
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
            <p style={{
              fontSize: '14px',
              color: 'var(--color-info-700)',
              margin: 0,
              lineHeight: '1.5'
            }}>
              O pagamento será registrado com o valor recebido e a data do pagamento.
            </p>
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px'
          }}>
            <Button variant="outline" onClick={handleClosePagamentoModal}>
              Cancelar
            </Button>
            <Button 
              variant="primary" 
              onClick={handleProcessarPagamento}
              disabled={isProcessingPayment}
            >
              {isProcessingPayment ? 'Processando...' : 'Baixar Pagamento'}
            </Button>
          </div>
        </div>
      </Modal>




    </div>
  );
}


