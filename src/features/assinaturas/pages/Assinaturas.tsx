import React, { useState, useEffect, useRef } from 'react';
import { collection, getDocs, doc, updateDoc, addDoc, query, where, orderBy, deleteDoc } from 'firebase/firestore';
import { db } from '@/integrations/firebase/config';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/components/ui/dialog';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { CalendarIcon, Search, Edit, Eye, Trash2, Plus, FileText, Download, Receipt } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '@/integrations/firebase/config';

interface Assinatura {
  id: string;
  codigo: string;
  nome_completo: string;
  cpf: string;
  rg: string;
  data_nascimento: string;
  data_vencimento?: string;
  email: string;
  telefone: string;
  estado: string;
  cidade: string;
  bairro: string;
  rua: string;
  numero: string;
  cep: string;
  ponto_referencia?: string;
  status: string;
  cliente_id?: string;
  cliente_nome?: string;
  plano?: string;
  valor?: number;
  created_at: any;
  updated_at: any;
}

interface Fatura {
  id: string;
  assinatura_id: string;
  valor: number;
  data_vencimento: string;
  data_geracao: string;
  data_corte: string;
  mes_referencia: string;
  status: 'GERADA' | 'PAGA' | 'VENCIDA' | 'EM DIAS';
  valor_pago?: number;
  data_pagamento?: string;
  comprovante_url?: string;
}

const Assinaturas: React.FC = () => {
  // Estados
  const [assinaturas, setAssinaturas] = useState<Assinatura[]>([]);
  const [faturas, setFaturas] = useState<Fatura[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAssinatura, setSelectedAssinatura] = useState<Assinatura | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Assinatura>>({});
  const [gerarFaturaModalOpen, setGerarFaturaModalOpen] = useState(false);
  const [baixarPagamentoModalOpen, setBaixarPagamentoModalOpen] = useState(false);
  const [deletarFaturaModalOpen, setDeletarFaturaModalOpen] = useState(false);
  const [novaFatura, setNovaFatura] = useState({
    valor: 0,
    mes_referencia: '',
    data_vencimento: '',
    data_geracao: '',
    data_corte: ''
  });
  const [pagamentoFatura, setPagamentoFatura] = useState({
    data_pagamento: '',
    valor_pago: 0,
    comprovante: null as File | null
  });

  // Estados para o sistema de PDF e histórico
  const [faturaSelecionada, setFaturaSelecionada] = useState<Fatura | null>(null);
  const [modalComprovanteOpen, setModalComprovanteOpen] = useState(false);
  const [faturaParaDeletar, setFaturaParaDeletar] = useState<Fatura | null>(null);
  const [comprovanteModalOpen, setComprovanteModalOpen] = useState(false);

  // Estados para valores de exibição (sem formatação)
  const [valorDisplay, setValorDisplay] = useState('');
  const [editValorDisplay, setEditValorDisplay] = useState('');
  const [valorPagoDisplay, setValorPagoDisplay] = useState('');

  // Estado para carregamento do salvamento
  const [salvando, setSalvando] = useState(false);

  // Refs para controlar o cursor
  const valorInputRef = useRef<HTMLInputElement>(null);
  const editValorInputRef = useRef<HTMLInputElement>(null);
  const valorPagoInputRef = useRef<HTMLInputElement>(null);

  // Função para formatar valor mantendo o cursor
  const handleValorChange = (value: string, setter: (valor: number) => void, displaySetter: (display: string) => void, ref: React.RefObject<HTMLInputElement>) => {
    const input = ref.current;
    if (!input) return;

    const cursorPosition = input.selectionStart || 0;
    
    // Remove caracteres não numéricos exceto vírgula e ponto
    const valorNumerico = value.replace(/[^\d,.]/g, '').replace(',', '.');
    const valor = parseFloat(valorNumerico) || 0;
    
    setter(valor);
    displaySetter(value);
    
    // Restaura a posição do cursor
    requestAnimationFrame(() => {
      if (input) {
        const newCursorPosition = Math.min(cursorPosition, value.length);
        input.setSelectionRange(newCursorPosition, newCursorPosition);
      }
    });
  };

  // Função para formatar valor quando o campo perde o foco
  const handleValorBlur = (valor: number, displaySetter: (display: string) => void) => {
    if (valor > 0) {
      displaySetter(formatarValor(valor));
    } else {
      displaySetter('');
    }
  };

  // Estados brasileiros
  const estados = [
    'Acre', 'Alagoas', 'Amapá', 'Amazonas', 'Bahia', 'Ceará', 'Distrito Federal',
    'Espírito Santo', 'Goiás', 'Maranhão', 'Mato Grosso', 'Mato Grosso do Sul',
    'Minas Gerais', 'Pará', 'Paraíba', 'Paraná', 'Pernambuco', 'Piauí', 'Rio de Janeiro',
    'Rio Grande do Norte', 'Rio Grande do Sul', 'Rondônia', 'Roraima', 'Santa Catarina',
    'São Paulo', 'Sergipe', 'Tocantins'
  ];

  useEffect(() => {
    carregarAssinaturas();
    carregarFaturas();
  }, []);

  const carregarAssinaturas = async () => {
    try {
      setLoading(true);
      const assinaturasRef = collection(db, 'assinaturas');
      const q = query(assinaturasRef, orderBy('created_at', 'desc'));
      const snapshot = await getDocs(q);
      
      const assinaturasData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Garantir que as datas sejam processadas corretamente
          created_at: data.created_at,
          updated_at: data.updated_at,
          data_nascimento: data.data_nascimento || '',
          data_vencimento: data.data_vencimento || '',
          // Garantir que todos os campos string existam
          codigo: data.codigo || '',
          nome_completo: data.nome_completo || '',
          cpf: data.cpf || '',
          rg: data.rg || '',
          email: data.email || '',
          telefone: data.telefone || '',
          estado: data.estado || '',
          cidade: data.cidade || '',
          bairro: data.bairro || '',
          rua: data.rua || '',
          numero: data.numero || '',
          cep: data.cep || '',
          status: data.status || 'ativa',
          plano: data.plano || '',
          valor: data.valor || 0
        };
      }) as Assinatura[];
      
      setAssinaturas(assinaturasData);
    } catch (error) {
      console.error('Erro ao carregar assinaturas:', error);
    } finally {
      setLoading(false);
    }
  };

  const carregarFaturas = async () => {
    try {
      console.log('Carregando faturas do Firebase...');
      const faturasRef = collection(db, 'faturas');
      const snapshot = await getDocs(faturasRef);
      
      console.log('Snapshot recebido:', snapshot);
      console.log('Número de documentos:', snapshot.docs.length);
      
      const faturasData = snapshot.docs.map(doc => {
        const data = doc.data();
        console.log('Documento:', doc.id, data);
        return {
          id: doc.id,
          ...data
        };
      }) as Fatura[];
      
      console.log('Faturas carregadas:', faturasData);
      setFaturas(faturasData);
    } catch (error) {
      console.error('Erro ao carregar faturas:', error);
    }
  };

  const filtrarAssinaturas = () => {
    if (!searchTerm) return assinaturas;
    
    return assinaturas.filter(assinatura =>
      assinatura.nome_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assinatura.codigo?.includes(searchTerm) ||
      assinatura.cpf?.includes(searchTerm)
    );
  };

  const abrirModalEdicao = (assinatura: Assinatura) => {
    console.log('Abrindo modal de edição para assinatura:', assinatura);
    
    // Formatar a data de nascimento para o formato YYYY-MM-DD (necessário para input type="date")
    const formatarDataParaInput = (dataString: string) => {
      if (!dataString) return '';
      
      // Se a data já está no formato YYYY-MM-DD, retornar como está
      if (dataString.includes('-')) {
        return dataString;
      }
      
      // Se a data está no formato DD/MM/YYYY, converter para YYYY-MM-DD
      if (dataString.includes('/')) {
        const [day, month, year] = dataString.split('/');
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      
      return dataString;
    };
    
    // Preencher o formulário com os dados da assinatura
    setEditForm({
      id: assinatura.id,
      codigo: assinatura.codigo || '',
      nome_completo: assinatura.nome_completo || '',
      cpf: assinatura.cpf || '',
      rg: assinatura.rg || '',
      data_nascimento: formatarDataParaInput(assinatura.data_nascimento || ''),
      email: assinatura.email || '',
      telefone: assinatura.telefone || '',
      estado: assinatura.estado || '',
      cidade: assinatura.cidade || '',
      bairro: assinatura.bairro || '',
      rua: assinatura.rua || '',
      numero: assinatura.numero || '',
      cep: assinatura.cep || '',
      ponto_referencia: assinatura.ponto_referencia || '',
      status: assinatura.status || '',
      plano: assinatura.plano || '',
      valor: assinatura.valor || 0,
      created_at: assinatura.created_at,
      updated_at: assinatura.updated_at
    });
    
    setEditModalOpen(true);
  };

  const gerarFatura = async () => {
    try {
      // Verificar se há uma assinatura selecionada (pode ser do modal de detalhes ou da tabela)
      const assinaturaAtual = selectedAssinatura;
      if (!assinaturaAtual) {
        mostrarToast('Nenhuma assinatura selecionada', 'error');
        return;
      }

      if (!novaFatura.valor || novaFatura.valor <= 0) {
        mostrarToast('Valor da fatura deve ser maior que zero', 'error');
        return;
      }

      if (!novaFatura.data_vencimento) {
        mostrarToast('Data de vencimento é obrigatória', 'error');
        return;
      }

      console.log('Gerando fatura para assinatura:', assinaturaAtual);
      console.log('Dados da fatura:', novaFatura);

      // Calcular mes_referencia baseado na data de vencimento
      const mesReferencia = new Date(novaFatura.data_vencimento).toLocaleDateString('pt-BR', { 
        month: 'long', 
        year: 'numeric' 
      });

      // Calcular status inicial baseado na data atual
      const hoje = new Date();
      const dataGeracao = new Date(novaFatura.data_geracao);
      const statusInicial = hoje < dataGeracao ? 'EM DIAS' : 'GERADA';

      // Dados da nova fatura
      const novaFaturaData = {
        assinatura_id: assinaturaAtual.id,
        valor: novaFatura.valor,
        data_vencimento: novaFatura.data_vencimento,
        data_geracao: novaFatura.data_geracao,
        data_corte: novaFatura.data_corte,
        mes_referencia: mesReferencia,
        status: statusInicial as const,
        created_at: new Date(),
        updated_at: new Date()
      };

      console.log('Dados para salvar no Firebase:', novaFaturaData);

      // Adicionar nova fatura ao Firebase
      const novaFaturaRef = await addDoc(collection(db, 'faturas'), novaFaturaData);
      console.log('Fatura criada no Firebase com ID:', novaFaturaRef.id);

      // Adicionar à lista local
      const novaFaturaCompleta = {
        id: novaFaturaRef.id,
        ...novaFaturaData
      };
      
      setFaturas(prev => [novaFaturaCompleta, ...prev]);
      console.log('Fatura adicionada à lista local');

      // Limpar formulário
      setNovaFatura({ 
        valor: 0, 
        mes_referencia: '', 
        data_vencimento: '', 
        data_geracao: '', 
        data_corte: '' 
      });
      setValorDisplay('');

      // Fechar modal se estiver aberto
      setGerarFaturaModalOpen(false);
      
      mostrarToast('Fatura gerada com sucesso!', 'success');
      
    } catch (error) {
      console.error('Erro ao gerar fatura:', error);
      mostrarToast('Erro ao gerar fatura. Tente novamente.', 'error');
    }
  };

  const baixarPagamento = async () => {
    try {
      if (!pagamentoFatura.data_pagamento) {
        mostrarToast('Informe a data de pagamento', 'warning');
        return;
      }

      if (!pagamentoFatura.valor_pago || pagamentoFatura.valor_pago <= 0) {
        mostrarToast('Informe o valor pago', 'warning');
        return;
      }

      // Verificar se há uma fatura atual para baixar
      const faturaAtual = getFaturaAtual(selectedAssinatura?.id || '');
      if (!faturaAtual) {
        mostrarToast('Nenhuma fatura disponível para baixar', 'error');
        return;
      }

      console.log('Iniciando baixa de pagamento para fatura:', faturaAtual);

      // Referência para o documento da fatura
      const faturaRef = doc(db, 'faturas', faturaAtual.id);

      // Dados para atualização
      const updateData: any = {
        status: 'PAGA',
        valor_pago: pagamentoFatura.valor_pago,
        data_pagamento: pagamentoFatura.data_pagamento,
        updated_at: new Date()
      };

      // Se tiver comprovante, tentar fazer upload (opcional)
      let comprovanteUrl = null;
      if (pagamentoFatura.comprovante) {
        try {
          console.log('Tentando fazer upload do comprovante:', pagamentoFatura.comprovante);
          
          // Criar referência para o arquivo no Storage
          const storageRef = ref(storage, `comprovantes/${faturaAtual.id}_${Date.now()}`);
          
          // Fazer upload do arquivo
          const uploadTask = await uploadBytes(storageRef, pagamentoFatura.comprovante);
          console.log('Upload realizado com sucesso:', uploadTask);
          
          // Obter URL do arquivo
          comprovanteUrl = await getDownloadURL(storageRef);
          console.log('URL do comprovante:', comprovanteUrl);
          
          // Adicionar URL do comprovante aos dados de atualização
          updateData.comprovante_url = comprovanteUrl;
        } catch (error) {
          console.error('Erro ao fazer upload do comprovante:', error);
          console.log('Continuando sem o comprovante...');
          // Não bloquear o processo se o upload falhar
          // O pagamento será registrado sem o comprovante
        }
      }

      // Atualizar a fatura no Firestore
      await updateDoc(faturaRef, updateData);
      console.log('Fatura atualizada com sucesso:', updateData);

      // Atualizar a lista local de faturas
      const faturasAtualizadas = faturas.map(f =>
        f.id === faturaAtual.id
          ? { ...f, ...updateData }
          : f
      );
      setFaturas(faturasAtualizadas);

      // Fechar modal e limpar form
      setBaixarPagamentoModalOpen(false);
      setPagamentoFatura({
        data_pagamento: '',
        valor_pago: 0,
        comprovante: null
      });
      setValorPagoDisplay('');

      mostrarToast('Pagamento registrado com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao baixar pagamento:', error);
      mostrarToast('Erro ao registrar pagamento. Tente novamente.', 'error');
    }
  };

  // Função auxiliar para mostrar toasts
  const mostrarToast = (mensagem: string, tipo: 'success' | 'error' | 'warning') => {
    const cores = {
      success: 'bg-green-600',
      error: 'bg-red-600',
      warning: 'bg-yellow-600'
    };
    
    const icones = {
      success: `<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>`,
      error: `<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>`,
      warning: `<path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>`
    };
    
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 ${cores[tipo]} text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2`;
    toast.innerHTML = `
      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        ${icones[tipo]}
      </svg>
      <span class="font-medium">${mensagem}</span>
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 3000);
  };

  // Função para testar conexão com Firebase
  const testarConexaoFirebase = async () => {
    try {
      console.log('Testando conexão com Firebase...');
      
      // Testar leitura do Firestore
      const testRef = collection(db, 'test');
      const snapshot = await getDocs(testRef);
      console.log('Conexão com Firestore OK');
      
      // Testar Storage
      const testStorageRef = ref(storage, 'test/test.txt');
      console.log('Conexão com Storage OK');
      
      mostrarToast('Conexão com Firebase funcionando!', 'success');
    } catch (error) {
      console.error('Erro na conexão com Firebase:', error);
      mostrarToast('Erro na conexão com Firebase', 'error');
    }
  };

  const deletarFatura = async () => {
    try {
      if (!faturaParaDeletar) {
        console.error('Erro: faturaParaDeletar é null');
        mostrarToast('Nenhuma fatura selecionada para exclusão', 'error');
        return;
      }

      console.log('=== INICIANDO EXCLUSÃO DE FATURA ===');
      console.log('Fatura para deletar:', faturaParaDeletar);
      console.log('Faturas antes da exclusão:', faturas);

      // Verificar se tem comprovante para deletar
      if (faturaParaDeletar.comprovante_url) {
        try {
          console.log('Tentando deletar comprovante:', faturaParaDeletar.comprovante_url);
          // Extrair o caminho do arquivo do URL
          const urlObj = new URL(faturaParaDeletar.comprovante_url);
          const filePath = decodeURIComponent(urlObj.pathname.split('/o/')[1].split('?')[0]);
          
          // Criar referência para o arquivo no Storage
          const fileRef = ref(storage, filePath);
          
          // Deletar o arquivo
          await deleteObject(fileRef);
          console.log('Comprovante deletado com sucesso');
        } catch (error) {
          console.error('Erro ao deletar comprovante:', error);
          // Continuar mesmo com erro no comprovante
        }
      }

      // Deletar a fatura no Firestore
      const faturaRef = doc(db, 'faturas', faturaParaDeletar.id);
      await deleteDoc(faturaRef);
      console.log('Fatura deletada do Firestore com sucesso');

      // Atualizar a lista local de faturas
      const faturasAtualizadas = faturas.filter(f => f.id !== faturaParaDeletar.id);
      console.log('Faturas após filtro:', faturasAtualizadas);
      setFaturas(faturasAtualizadas);

      // Fechar modal
      setDeletarFaturaModalOpen(false);
      setFaturaParaDeletar(null);

      console.log('=== EXCLUSÃO CONCLUÍDA ===');
      mostrarToast('Fatura excluída com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao deletar fatura:', error);
      mostrarToast('Erro ao excluir fatura. Tente novamente.', 'error');
    }
  };

  const getFaturasAssinatura = (assinaturaId: string) => {
    return faturas.filter(f => f.assinatura_id === assinaturaId);
  };

  const getFaturaAtual = (assinaturaId: string) => {
    return faturas.find(f => f.assinatura_id === assinaturaId && f.status === 'GERADA');
  };

  const getFaturasHistoricas = (assinaturaId: string) => {
    // Filtrar faturas pagas (status PAGA) da assinatura
    const faturasPagas = faturas.filter(f => f.assinatura_id === assinaturaId && f.status === 'PAGA');
    return faturasPagas;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'GERADA': return 'bg-yellow-500';
      case 'EM DIAS': return 'bg-green-500';
      case 'VENCIDA': return 'bg-red-500';
      case 'PAGA': return 'bg-green-500';
      case 'CANCELADA': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  // Função para calcular o status automático da fatura
  const calcularStatusFatura = (fatura: Fatura) => {
    if (fatura.status === 'PAGA') return 'PAGA';
    
    const hoje = new Date();
    const dataVencimento = new Date(fatura.data_vencimento);
    const dataGeracao = new Date(fatura.data_geracao);
    
    // 5 dias antes do vencimento
    const cincoDiasAntes = new Date(dataVencimento);
    cincoDiasAntes.setDate(cincoDiasAntes.getDate() - 5);
    
    if (hoje < dataGeracao) {
      return 'EM DIAS';
    } else if (hoje >= dataGeracao && hoje < cincoDiasAntes) {
      return 'GERADA';
    } else if (hoje >= dataVencimento) {
      return 'VENCIDA';
    } else {
      return 'GERADA';
    }
  };

  const formatarData = (data: any) => {
    if (!data) return '-';
    
    try {
      let dataObj: Date;
      
      if (data instanceof Date) {
        dataObj = data;
      } else if (typeof data === 'string') {
        // Se for uma string de data (YYYY-MM-DD), criar a data localmente
        if (data.includes('T')) {
          // Se tem 'T', é um timestamp ISO
          dataObj = new Date(data);
        } else {
          // Se não tem 'T', é uma data simples (YYYY-MM-DD)
          const [year, month, day] = data.split('-').map(Number);
          dataObj = new Date(year, month - 1, day); // month - 1 porque Date usa 0-11
        }
      } else if (data.seconds) {
        // Firebase Timestamp
        dataObj = new Date(data.seconds * 1000);
      } else {
        return '-';
      }
      
      // Formatar para DD/MM/YYYY sem alterar a data
      const dia = String(dataObj.getDate()).padStart(2, '0');
      const mes = String(dataObj.getMonth() + 1).padStart(2, '0');
      const ano = dataObj.getFullYear();
      
      return `${dia}/${mes}/${ano}`;
    } catch (error) {
      console.error('Erro ao formatar data:', error, data);
      return '-';
    }
  };

  const formatarValor = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const salvarAlteracoes = async () => {
    if (!editForm.id) {
      mostrarToast('Erro: ID da assinatura não encontrado', 'error');
      return;
    }

    // Validação dos campos obrigatórios
    const camposObrigatorios = [
      { campo: 'codigo', nome: 'Código da Assinatura' },
      { campo: 'nome_completo', nome: 'Nome Completo' },
      { campo: 'cpf', nome: 'CPF' },
      { campo: 'rg', nome: 'RG' },
      { campo: 'data_nascimento', nome: 'Data de Nascimento' },
      { campo: 'email', nome: 'E-mail' },
      { campo: 'telefone', nome: 'Telefone' },
      { campo: 'estado', nome: 'Estado' },
      { campo: 'cidade', nome: 'Cidade' },
      { campo: 'bairro', nome: 'Bairro' },
      { campo: 'rua', nome: 'Rua' },
      { campo: 'numero', nome: 'Número' },
      { campo: 'cep', nome: 'CEP' }
    ];

    for (const { campo, nome } of camposObrigatorios) {
      if (!editForm[campo as keyof typeof editForm] || editForm[campo as keyof typeof editForm] === '') {
        mostrarToast(`Erro: O campo "${nome}" é obrigatório`, 'error');
        return;
      }
    }

    setSalvando(true);

    try {
      console.log('Salvando alterações:', editForm);
      
      // Atualizar a assinatura no Firebase
      const assinaturaRef = doc(db, 'assinaturas', editForm.id);
      const updateData = {
        codigo: editForm.codigo,
        nome_completo: editForm.nome_completo,
        cpf: editForm.cpf,
        rg: editForm.rg,
        data_nascimento: editForm.data_nascimento,
        email: editForm.email,
        telefone: editForm.telefone,
        estado: editForm.estado,
        cidade: editForm.cidade,
        bairro: editForm.bairro,
        rua: editForm.rua,
        numero: editForm.numero,
        cep: editForm.cep,
        ponto_referencia: editForm.ponto_referencia,
        status: editForm.status,
        plano: editForm.plano,
        valor: editForm.valor,
        updated_at: new Date()
      };
      
      console.log('Dados para atualização:', updateData);
      
      await updateDoc(assinaturaRef, updateData);
      console.log('Assinatura atualizada no Firebase com sucesso');

      // Atualizar a lista local
      const assinaturasAtualizadas = assinaturas.map(a => 
        a.id === editForm.id 
          ? { ...a, ...updateData }
          : a
      );
      setAssinaturas(assinaturasAtualizadas);

      // Fechar modal
      setEditModalOpen(false);
      
      // Limpar formulário
      setEditForm({});

      console.log('Alterações salvas com sucesso!');
      mostrarToast('Alterações salvas com sucesso!', 'success');
      
    } catch (error) {
      console.error('Erro ao salvar alterações:', error);
      mostrarToast('Erro ao salvar alterações. Tente novamente.', 'error');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="h-8 w-8" />
            Assinaturas
          </h1>
          <p className="text-gray-600 mt-1">Gerenciamento de assinaturas e planos</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar assinaturas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button onClick={testarConexaoFirebase} variant="outline" size="sm">
            Testar Firebase
          </Button>
          <Button onClick={() => setEditModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Assinatura
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      {/* The search bar is now part of the header, so this section is removed. */}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Carregando assinaturas...</p>
          </div>
        </div>
      )}

      {/* Table */}
      {!loading && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Equipamentos
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Código
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nome Completo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      CPF
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vencimento
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input type="radio" name="equipamento" className="h-4 w-4 text-blue-600" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      1526458038
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      Carlos Henrique de Souza Rosa
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      94137692220
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      26/07/2025
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <Badge className="bg-yellow-500 text-white">GERADA</Badge>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={true} // Desativando o botão do olho
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const assinatura = {
                              id: '1',
                              codigo: '1526458038',
                              nome_completo: 'Carlos Henrique de Souza Rosa',
                              cpf: '94137692220',
                              rg: '4800595',
                              data_nascimento: '1986-09-17',
                              email: 'moisestimesky@gmail.com',
                              telefone: '91982454964',
                              estado: 'Piauí',
                              cidade: 'Teresina',
                              bairro: 'Buenos Aires',
                              rua: 'José Marques da Rocha',
                              numero: '3457',
                              cep: '64009185',
                              status: 'GERADA',
                              plano: 'Premium',
                              valor: 4380.02,
                              created_at: new Date(),
                              updated_at: new Date()
                            };
                            console.log('Abrindo modal de detalhes a partir do botão de editar na tabela');
                            setSelectedAssinatura(assinatura);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal de Detalhes da Assinatura */}
      {selectedAssinatura && (
        <Dialog open={!!selectedAssinatura} onOpenChange={() => setSelectedAssinatura(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-gray-900">
                Detalhes da Assinatura - {selectedAssinatura.codigo}
              </DialogTitle>
            </DialogHeader>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Dados da Assinatura */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Dados da Assinatura</CardTitle>
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        console.log('Abrindo modal de edição a partir do modal de detalhes');
                        abrirModalEdicao(selectedAssinatura); // Open edit modal
                        setSelectedAssinatura(null); // Clear view modal
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-gray-500">Código da Assinatura</Label>
                      <p className="text-sm font-medium">{selectedAssinatura.codigo}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">CPF</Label>
                      <p className="text-sm font-medium">{selectedAssinatura.cpf}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Data de Nascimento</Label>
                      <p className="text-sm font-medium">{formatarData(selectedAssinatura.data_nascimento)}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Telefone</Label>
                      <p className="text-sm font-medium">{selectedAssinatura.telefone}</p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Nome Completo</Label>
                    <p className="text-sm font-medium">{selectedAssinatura.nome_completo}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">RG</Label>
                    <p className="text-sm font-medium">{selectedAssinatura.rg}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">E-mail</Label>
                    <p className="text-sm font-medium">{selectedAssinatura.email}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Endereço Detalhado */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Endereço Detalhado</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-gray-500">Estado</Label>
                      <p className="text-sm font-medium">{selectedAssinatura.estado}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Cidade</Label>
                      <p className="text-sm font-medium">{selectedAssinatura.cidade}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Rua</Label>
                      <p className="text-sm font-medium">{selectedAssinatura.rua}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Número</Label>
                      <p className="text-sm font-medium">{selectedAssinatura.numero}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Bairro</Label>
                      <p className="text-sm font-medium">{selectedAssinatura.bairro}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">CEP</Label>
                      <p className="text-sm font-medium">{selectedAssinatura.cep}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Gerar Fatura */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-sm font-medium">Gerar Fatura</CardTitle>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setGerarFaturaModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Gerar Fatura
                </Button>
              </CardContent>
            </Card>

            {/* Fatura do Mês Atual */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-sm font-medium">Fatura do Mês Atual</CardTitle>
              </CardHeader>
              <CardContent>
                {getFaturaAtual(selectedAssinatura.id) ? (
                  <div className="space-y-4">
                    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${
                            calcularStatusFatura(getFaturaAtual(selectedAssinatura.id)!) === 'EM DIAS' ? 'bg-green-500' :
                            calcularStatusFatura(getFaturaAtual(selectedAssinatura.id)!) === 'GERADA' ? 'bg-yellow-500' :
                            calcularStatusFatura(getFaturaAtual(selectedAssinatura.id)!) === 'VENCIDA' ? 'bg-red-500' :
                            'bg-gray-500'
                          }`}></div>
                          <Badge className={`${
                            calcularStatusFatura(getFaturaAtual(selectedAssinatura.id)!) === 'EM DIAS' ? 'bg-green-500' :
                            calcularStatusFatura(getFaturaAtual(selectedAssinatura.id)!) === 'GERADA' ? 'bg-yellow-500' :
                            calcularStatusFatura(getFaturaAtual(selectedAssinatura.id)!) === 'VENCIDA' ? 'bg-red-500' :
                            'bg-gray-500'
                          } text-white`}>
                            {calcularStatusFatura(getFaturaAtual(selectedAssinatura.id)!)}
                          </Badge>
                          <span className="text-sm text-gray-600">
                            Vencimento: {formatarData(getFaturaAtual(selectedAssinatura.id)?.data_vencimento)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-6 mb-6">
                        <div>
                          <Label className="text-xs text-gray-500">Valor da Fatura</Label>
                          <p className="text-2xl font-bold text-green-600">
                            {formatarValor(getFaturaAtual(selectedAssinatura.id)?.valor || 0)}
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">Data de Geração</Label>
                          <p className="text-sm font-medium">
                            {formatarData(getFaturaAtual(selectedAssinatura.id)?.data_geracao)}
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">Mês de Referência</Label>
                          <p className="text-sm font-medium">
                            {getFaturaAtual(selectedAssinatura.id)?.mes_referencia || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">Data de Corte</Label>
                          <p className="text-sm font-medium">
                            {formatarData(getFaturaAtual(selectedAssinatura.id)?.data_corte)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setPagamentoFatura({
                              data_pagamento: '',
                              valor_pago: 0,
                              comprovante: null
                            });
                            setBaixarPagamentoModalOpen(true);
                          }}
                          className="bg-green-600 hover:bg-green-700 text-white border-green-600"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Baixar Pagamento da Fatura
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => {
                            setFaturaParaDeletar(getFaturaAtual(selectedAssinatura.id));
                            setDeletarFaturaModalOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Apagar Informações
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="mx-auto w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                      <FileText className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500">Nenhuma fatura gerada para este mês</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Histórico de Faturas */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-sm font-medium">Histórico de Faturas</CardTitle>
              </CardHeader>
              <CardContent>
                {getFaturasHistoricas(selectedAssinatura.id).length > 0 ? (
                  <div className="space-y-4">
                    {getFaturasHistoricas(selectedAssinatura.id).map((fatura) => (
                      <div key={fatura.id} className="flex justify-between items-center p-4 border rounded-lg">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">Valor Pago</span>
                            <span className="text-lg font-semibold text-green-600">
                              {formatarValor(fatura.valor_pago || 0)}
                            </span>
                          </div>
                          <div className="text-sm text-gray-500">
                            Referência: {fatura.mes_referencia || 'N/A'}
                          </div>
                        </div>
                        <div className="text-right space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">Data do Pagamento</span>
                            <span className="text-sm font-medium">{formatarData(fatura.data_pagamento)}</span>
                            <Badge className="bg-green-500 text-white">PAGO</Badge>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setFaturaSelecionada(fatura);
                                setComprovanteModalOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Ver Comprovante
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600"
                              onClick={() => {
                                setFaturaParaDeletar(fatura);
                                setDeletarFaturaModalOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-500">Nenhuma fatura no histórico</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal Editar Assinatura */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-900">
              Editar Dados da Assinatura
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Dados da Assinatura e Identificação Pessoal */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <Label htmlFor="codigo" className="text-sm font-medium text-gray-700">
                  Código da Assinatura *
                </Label>
                <Input
                  id="codigo"
                  value={editForm.codigo || ''}
                  onChange={(e) => setEditForm({...editForm, codigo: e.target.value})}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="nome_completo" className="text-sm font-medium text-gray-700">
                  Nome Completo *
                </Label>
                <Input
                  id="nome_completo"
                  value={editForm.nome_completo || ''}
                  onChange={(e) => setEditForm({...editForm, nome_completo: e.target.value})}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="cpf" className="text-sm font-medium text-gray-700">
                  CPF *
                </Label>
                <Input
                  id="cpf"
                  value={editForm.cpf || ''}
                  onChange={(e) => setEditForm({...editForm, cpf: e.target.value})}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="rg" className="text-sm font-medium text-gray-700">
                  RG *
                </Label>
                <Input
                  id="rg"
                  value={editForm.rg || ''}
                  onChange={(e) => setEditForm({...editForm, rg: e.target.value})}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="data_nascimento" className="text-sm font-medium text-gray-700">
                  Data de Nascimento *
                </Label>
                <div className="relative mt-1">
                  <Input
                    id="data_nascimento"
                    type="date"
                    value={editForm.data_nascimento || ''}
                    onChange={(e) => setEditForm({...editForm, data_nascimento: e.target.value})}
                    className="pr-10"
                  />
                  <CalendarIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </div>
              
              <div>
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  E-mail *
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={editForm.email || ''}
                  onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="telefone" className="text-sm font-medium text-gray-700">
                  Telefone *
                </Label>
                <Input
                  id="telefone"
                  value={editForm.telefone || ''}
                  onChange={(e) => setEditForm({...editForm, telefone: e.target.value})}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Endereço Detalhado */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 text-xs font-bold">📍</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Endereço Detalhado</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="estado" className="text-sm font-medium text-gray-700">
                    Estado *
                  </Label>
                  <Input
                    id="estado"
                    value={editForm.estado || ''}
                    onChange={(e) => setEditForm({...editForm, estado: e.target.value})}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="cidade" className="text-sm font-medium text-gray-700">
                    Cidade *
                  </Label>
                  <Input
                    id="cidade"
                    value={editForm.cidade || ''}
                    onChange={(e) => setEditForm({...editForm, cidade: e.target.value})}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="bairro" className="text-sm font-medium text-gray-700">
                    Bairro *
                  </Label>
                  <Input
                    id="bairro"
                    value={editForm.bairro || ''}
                    onChange={(e) => setEditForm({...editForm, bairro: e.target.value})}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="rua" className="text-sm font-medium text-gray-700">
                    Rua *
                  </Label>
                  <Input
                    id="rua"
                    value={editForm.rua || ''}
                    onChange={(e) => setEditForm({...editForm, rua: e.target.value})}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="numero" className="text-sm font-medium text-gray-700">
                    Número *
                  </Label>
                  <Input
                    id="numero"
                    value={editForm.numero || ''}
                    onChange={(e) => setEditForm({...editForm, numero: e.target.value})}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="cep" className="text-sm font-medium text-gray-700">
                    CEP *
                  </Label>
                  <Input
                    id="cep"
                    value={editForm.cep || ''}
                    onChange={(e) => setEditForm({...editForm, cep: e.target.value})}
                    className="mt-1"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="ponto_referencia" className="text-sm font-medium text-gray-700">
                  Ponto de Referência
                </Label>
                <Textarea
                  id="ponto_referencia"
                  value={editForm.ponto_referencia || ''}
                  onChange={(e) => setEditForm({...editForm, ponto_referencia: e.target.value})}
                  placeholder="Ex: Próximo à padaria Silva"
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-6">
            <Button 
              variant="outline" 
              onClick={() => setEditModalOpen(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button 
              onClick={salvarAlteracoes}
              disabled={salvando}
              className="bg-blue-600 hover:bg-blue-700 text-white flex-1"
            >
              {salvando ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Salvando...
                </>
              ) : (
                'Salvar Alterações'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Gerar Fatura */}
      <Dialog open={gerarFaturaModalOpen} onOpenChange={setGerarFaturaModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-600">
              <FileText className="h-5 w-5" />
              Gerar Fatura
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="valor" className="text-sm font-medium text-gray-700">
                    Valor da Fatura
                  </Label>
                  <Input
                    id="valor"
                    type="text"
                    value={valorDisplay}
                    onChange={(e) => handleValorChange(e.target.value, (valor) => setNovaFatura({...novaFatura, valor}), setValorDisplay, valorInputRef)}
                    onBlur={() => handleValorBlur(novaFatura.valor, setValorDisplay)}
                    placeholder="R$ 0,00"
                    className="font-mono text-lg"
                    ref={valorInputRef}
                  />
                </div>
                <div>
                  <Label htmlFor="geracao" className="text-sm font-medium text-gray-700">
                    Data de Geração
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="geracao"
                      type="date"
                      value={novaFatura.data_geracao || ''}
                      readOnly
                      className="bg-gray-50 text-gray-600"
                    />
                    <span className="text-xs text-gray-500">(calculada automaticamente)</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="vencimento" className="text-sm font-medium text-gray-700">
                    Data de Vencimento
                  </Label>
                  <div className="relative">
                    <Input
                      id="vencimento"
                      type="date"
                      value={novaFatura.data_vencimento}
                      onChange={(e) => {
                        const dataVencimento = e.target.value;
                        if (dataVencimento) {
                          // Criar data de vencimento
                          const [year, month, day] = dataVencimento.split('-').map(Number);
                          const vencimento = new Date(year, month - 1, day);
                          
                          // Calcular data de geração (10 dias antes)
                          const geracao = new Date(vencimento);
                          geracao.setDate(geracao.getDate() - 10);
                          
                          // Calcular data de corte (7 dias depois)
                          const corte = new Date(vencimento);
                          corte.setDate(corte.getDate() + 7);
                          
                          // Formatar datas para YYYY-MM-DD
                          const formatarDataParaInput = (data: Date) => {
                            const year = data.getFullYear();
                            const month = String(data.getMonth() + 1).padStart(2, '0');
                            const day = String(data.getDate()).padStart(2, '0');
                            return `${year}-${month}-${day}`;
                          };
                          
                          setNovaFatura({
                            ...novaFatura,
                            data_vencimento: dataVencimento,
                            data_geracao: formatarDataParaInput(geracao),
                            data_corte: formatarDataParaInput(corte)
                          });
                        } else {
                          setNovaFatura({...novaFatura, data_vencimento: dataVencimento});
                        }
                      }}
                      className="pr-10"
                    />
                    <CalendarIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="corte" className="text-sm font-medium text-gray-700">
                    Data de Corte
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="corte"
                      type="date"
                      value={novaFatura.data_corte || ''}
                      readOnly
                      className="bg-gray-50 text-gray-600"
                    />
                    <span className="text-xs text-gray-500">(calculada automaticamente)</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 text-xs font-bold">i</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-800 mb-1">
                    Informações Automáticas
                  </p>
                  <p className="text-sm text-blue-700">
                    A data de geração será 10 dias antes do vencimento e a data de corte será 7 dias após o vencimento.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-6">
            <Button 
              onClick={gerarFatura} 
              className="bg-blue-600 hover:bg-blue-700 text-white flex-1"
              disabled={!novaFatura.valor || !novaFatura.data_vencimento}
            >
              <Plus className="h-4 w-4 mr-2" />
              Confirmar e Gerar
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setGerarFaturaModalOpen(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Baixar Pagamento */}
      <Dialog open={baixarPagamentoModalOpen} onOpenChange={setBaixarPagamentoModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <Download className="h-5 w-5" />
              Registrar Pagamento
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="data_pagamento" className="text-sm font-medium text-gray-700">
                Data do Pagamento
              </Label>
              <Input
                id="data_pagamento"
                type="date"
                value={pagamentoFatura.data_pagamento}
                onChange={(e) => setPagamentoFatura({...pagamentoFatura, data_pagamento: e.target.value})}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="valor_pago" className="text-sm font-medium text-gray-700">
                Valor Pago
              </Label>
              <Input
                id="valor_pago"
                type="text"
                value={valorPagoDisplay}
                onChange={(e) => handleValorChange(e.target.value, (valor) => setPagamentoFatura({...pagamentoFatura, valor_pago: valor}), setValorPagoDisplay, valorPagoInputRef)}
                onBlur={() => handleValorBlur(pagamentoFatura.valor_pago, setValorPagoDisplay)}
                placeholder="R$ 0,00"
                className="font-mono mt-1"
                ref={valorPagoInputRef}
              />
            </div>
            
            <div>
              <Label htmlFor="comprovante" className="text-sm font-medium text-gray-700">
                Comprovante de Pagamento (PDF)
              </Label>
              <Input
                id="comprovante"
                type="file"
                accept=".pdf"
                onChange={(e) => setPagamentoFatura({...pagamentoFatura, comprovante: e.target.files?.[0] || null})}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Envie o comprovante em formato PDF
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-6">
            <Button 
              onClick={() => {
                console.log('=== BOTÃO CLICADO ===');
                console.log('Data pagamento:', pagamentoFatura.data_pagamento);
                console.log('Valor pago:', pagamentoFatura.valor_pago);
                console.log('Assinatura selecionada:', selectedAssinatura);
                console.log('Botão desabilitado:', !pagamentoFatura.data_pagamento || !pagamentoFatura.valor_pago || pagamentoFatura.valor_pago <= 0);
                baixarPagamento();
              }} 
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium flex-1 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
              disabled={!pagamentoFatura.data_pagamento || !pagamentoFatura.valor_pago || pagamentoFatura.valor_pago <= 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Confirmar Pagamento
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setBaixarPagamentoModalOpen(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Deletar Fatura */}
      <Dialog open={deletarFaturaModalOpen} onOpenChange={setDeletarFaturaModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Excluir Fatura
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                    <span className="text-red-600 text-xs font-bold">!</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-red-800 mb-1">
                    Atenção!
                  </p>
                  <p className="text-sm text-red-700">
                    Esta ação irá excluir permanentemente a fatura e não poderá ser desfeita.
                  </p>
                </div>
              </div>
            </div>
            
            {faturaParaDeletar && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium mb-2">Detalhes da Fatura</h3>
                <div className="space-y-2 text-sm">
                  <div><span className="font-medium">Valor:</span> {formatarValor(faturaParaDeletar.valor)}</div>
                  <div><span className="font-medium">Vencimento:</span> {formatarData(faturaParaDeletar.data_vencimento)}</div>
                  {faturaParaDeletar.valor_pago && (
                    <div><span className="font-medium">Valor Pago:</span> {formatarValor(faturaParaDeletar.valor_pago)}</div>
                  )}
                  {faturaParaDeletar.data_pagamento && (
                    <div><span className="font-medium">Data Pagamento:</span> {formatarData(faturaParaDeletar.data_pagamento)}</div>
                  )}
                  <div><span className="font-medium">Status:</span> 
                    <Badge className={`ml-2 ${getStatusColor(faturaParaDeletar.status)}`}>
                      {faturaParaDeletar.status}
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-6">
            <Button 
              onClick={deletarFatura} 
              className="bg-red-600 hover:bg-red-700 text-white flex-1"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir Permanentemente
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setDeletarFaturaModalOpen(false);
                setFaturaParaDeletar(null);
              }}
              className="flex-1"
            >
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Comprovante */}
      <Dialog open={modalComprovanteOpen} onOpenChange={setModalComprovanteOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-600">
              <Download className="h-5 w-5" />
              Comprovante de Pagamento
            </DialogTitle>
          </DialogHeader>
          
          {faturaSelecionada ? (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium mb-2">Detalhes da Fatura</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="font-medium">Valor:</span> {formatarValor(faturaSelecionada.valor)}</div>
                  <div><span className="font-medium">Valor Pago:</span> {formatarValor(faturaSelecionada.valor_pago || 0)}</div>
                  <div><span className="font-medium">Data Pagamento:</span> {formatarData(faturaSelecionada.data_pagamento)}</div>
                  <div><span className="font-medium">Status:</span> 
                    <Badge className={`ml-2 ${getStatusColor(faturaSelecionada.status)}`}>
                      {faturaSelecionada.status}
                    </Badge>
                  </div>
                </div>
              </div>
              
              {faturaSelecionada.comprovante_url ? (
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-2">Comprovante</h3>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600 text-xs font-bold">✓</span>
                      </div>
                      <span className="text-sm text-green-800 font-medium">
                        Comprovante disponível
                      </span>
                    </div>
                  </div>
                  <iframe
                    src={faturaSelecionada.comprovante_url}
                    className="w-full h-96 border rounded"
                    title="Comprovante de Pagamento"
                  />
                  <div className="mt-4 flex gap-2">
                    <Button
                      onClick={() => window.open(faturaSelecionada.comprovante_url, '_blank')}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Baixar PDF
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setModalComprovanteOpen(false)}
                    >
                      Fechar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="border rounded-lg p-8 text-center">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 bg-yellow-100 rounded-full flex items-center justify-center">
                        <span className="text-yellow-600 text-xs font-bold">!</span>
                      </div>
                      <span className="text-sm text-yellow-800 font-medium">
                        Nenhum comprovante anexado
                      </span>
                    </div>
                  </div>
                  <Download className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Comprovante não encontrado</h3>
                  <p className="text-gray-500 mb-4">
                    Esta fatura não possui comprovante de pagamento anexado.
                    <br />
                    <span className="text-sm text-gray-400">
                      O comprovante pode ter sido removido ou não foi enviado durante o registro do pagamento.
                    </span>
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button
                      variant="outline"
                      onClick={() => setModalComprovanteOpen(false)}
                    >
                      Fechar
                    </Button>
                    <Button
                      onClick={() => {
                        console.log('Tentando abrir modal de pagamento para adicionar comprovante');
                        setModalComprovanteOpen(false);
                        setBaixarPagamentoModalOpen(true);
                      }}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Adicionar Comprovante
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">Fatura não encontrada</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Assinaturas; 