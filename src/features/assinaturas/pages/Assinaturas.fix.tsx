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
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
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
  status: 'GERADA' | 'PAGA' | 'VENCIDA';
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

  // Estados para valores de exibição (sem formatação)
  const [valorDisplay, setValorDisplay] = useState('');
  const [editValorDisplay, setEditValorDisplay] = useState('');
  const [valorPagoDisplay, setValorPagoDisplay] = useState('');

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

  const formatarValor = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
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
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Nova Assinatura
        </Button>
      </div>
    </div>
  );
};

export default Assinaturas; 