import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, addDoc, query, where, orderBy } from 'firebase/firestore';
import { db } from '../integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { CalendarIcon, Search, Edit, Eye, Trash2, Plus, FileText, Download, Receipt } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Assinatura {
  id: string;
  codigo: string;
  nome_completo: string;
  cpf: string;
  rg: string;
  data_nascimento: string;
  email: string;
  telefone: string;
  estado: string;
  cidade: string;
  bairro: string;
  rua: string;
  numero: string;
  cep: string;
  ponto_referencia?: string;
  status: 'GERADA' | 'EM DIAS' | 'VENCIDA' | 'CANCELADA';
  cliente_id?: string;
  cliente_nome?: string;
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
  const [assinaturas, setAssinaturas] = useState<Assinatura[]>([]);
  const [faturas, setFaturas] = useState<Fatura[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAssinatura, setSelectedAssinatura] = useState<Assinatura | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Assinatura>>({});
  const [gerarFaturaModalOpen, setGerarFaturaModalOpen] = useState(false);
  const [novaFatura, setNovaFatura] = useState({
    valor: 0,
    mes_referencia: '',
    data_vencimento: ''
  });

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
      
      const assinaturasData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Assinatura[];
      
      setAssinaturas(assinaturasData);
    } catch (error) {
      console.error('Erro ao carregar assinaturas:', error);
    } finally {
      setLoading(false);
    }
  };

  const carregarFaturas = async () => {
    try {
      const faturasRef = collection(db, 'faturas');
      const snapshot = await getDocs(faturasRef);
      
      const faturasData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Fatura[];
      
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
    setSelectedAssinatura(assinatura);
    setEditForm(assinatura);
    setEditModalOpen(true);
  };

  const salvarAlteracoes = async () => {
    if (!selectedAssinatura) return;
    
    try {
      const assinaturaRef = doc(db, 'assinaturas', selectedAssinatura.id);
      await updateDoc(assinaturaRef, {
        ...editForm,
        updated_at: new Date()
      });
      
      await carregarAssinaturas();
      setEditModalOpen(false);
      setSelectedAssinatura(null);
      setEditForm({});
    } catch (error) {
      console.error('Erro ao salvar alterações:', error);
    }
  };

  const gerarFatura = async () => {
    if (!selectedAssinatura || !novaFatura.valor || !novaFatura.mes_referencia) return;
    
    try {
      const faturaRef = collection(db, 'faturas');
      const novaFaturaData = {
        assinatura_id: selectedAssinatura.id,
        valor: novaFatura.valor,
        data_vencimento: novaFatura.data_vencimento,
        data_geracao: new Date().toISOString(),
        data_corte: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 dias
        mes_referencia: novaFatura.mes_referencia,
        status: 'GERADA' as const,
        created_at: new Date(),
        updated_at: new Date()
      };
      
      await addDoc(faturaRef, novaFaturaData);
      await carregarFaturas();
      setGerarFaturaModalOpen(false);
      setNovaFatura({ valor: 0, mes_referencia: '', data_vencimento: '' });
    } catch (error) {
      console.error('Erro ao gerar fatura:', error);
    }
  };

  const getFaturasAssinatura = (assinaturaId: string) => {
    return faturas.filter(fatura => fatura.assinatura_id === assinaturaId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'GERADA': return 'bg-yellow-500';
      case 'EM DIAS': return 'bg-green-500';
      case 'VENCIDA': return 'bg-red-500';
      case 'CANCELADA': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const formatarData = (data: string) => {
    try {
      return format(new Date(data), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return data;
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
          <p className="text-gray-600 mt-1">Painel de Gestão de Assinaturas</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Nova Assinatura
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Buscar por nome, código ou CPF..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
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
                {filtrarAssinaturas().map((assinatura) => (
                  <tr key={assinatura.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input type="radio" name="equipamento" className="h-4 w-4 text-blue-600" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {assinatura.codigo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {assinatura.nome_completo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {assinatura.cpf}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {assinatura.data_vencimento ? formatarData(assinatura.data_vencimento) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={`${getStatusColor(assinatura.status)} text-white`}>
                        {assinatura.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedAssinatura(assinatura)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => abrirModalEdicao(assinatura)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Detalhes da Assinatura */}
      {selectedAssinatura && (
        <Dialog open={!!selectedAssinatura} onOpenChange={() => setSelectedAssinatura(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Assinatura - {selectedAssinatura.codigo}</DialogTitle>
            </DialogHeader>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Dados da Assinatura */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Dados da Assinatura</CardTitle>
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
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
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-gray-500">RG</Label>
                      <p className="text-sm font-medium">{selectedAssinatura.rg}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">E-mail</Label>
                      <p className="text-sm font-medium">{selectedAssinatura.email}</p>
                    </div>
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
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Rua</Label>
                    <p className="text-sm font-medium">{selectedAssinatura.rua}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-gray-500">Bairro</Label>
                      <p className="text-sm font-medium">{selectedAssinatura.bairro}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Número</Label>
                      <p className="text-sm font-medium">{selectedAssinatura.numero}</p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">CEP</Label>
                    <p className="text-sm font-medium">{selectedAssinatura.cep}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Gerar Fatura */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Gerar Fatura</CardTitle>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => setGerarFaturaModalOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Gerar Fatura
                </Button>
              </CardContent>
            </Card>

            {/* Fatura do Mês Atual */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Fatura do Mês Atual</CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const faturasMes = getFaturasAssinatura(selectedAssinatura.id);
                  const faturaAtual = faturasMes.find(f => 
                    f.status === 'GERADA' && 
                    new Date(f.data_geracao).getMonth() === new Date().getMonth()
                  );
                  
                  if (!faturaAtual) {
                    return <p className="text-gray-500">Nenhuma fatura encontrada para o mês atual</p>;
                  }
                  
                  return (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(faturaAtual.status)}`}></div>
                        <span className="text-sm font-medium">{faturaAtual.status}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs text-gray-500">Valor da Fatura</Label>
                          <p className="text-lg font-bold">{formatarValor(faturaAtual.valor)}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">Data de Vencimento</Label>
                          <p className="text-sm font-medium">{formatarData(faturaAtual.data_vencimento)}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">Data de Geração</Label>
                          <p className="text-sm font-medium">{formatarData(faturaAtual.data_geracao)}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">Data de Corte</Label>
                          <p className="text-sm font-medium">{formatarData(faturaAtual.data_corte)}</p>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Mês de Referência</Label>
                        <p className="text-sm font-medium">{faturaAtual.mes_referencia}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Baixar Pagamento da Fatura
                        </Button>
                        <Button variant="outline" size="sm" className="text-red-600">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Apagar Informações
                        </Button>
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            {/* Histórico de Faturas */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Histórico de Faturas</CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const faturasHistorico = getFaturasAssinatura(selectedAssinatura.id);
                  
                  if (faturasHistorico.length === 0) {
                    return <p className="text-gray-500">Nenhuma fatura encontrada no histórico</p>;
                  }
                  
                  return (
                    <div className="space-y-3">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left text-xs font-medium text-gray-500">Valor Pago</th>
                            <th className="text-left text-xs font-medium text-gray-500">Data do Pagamento</th>
                            <th className="text-left text-xs font-medium text-gray-500">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {faturasHistorico.map((fatura) => (
                            <tr key={fatura.id} className="border-b">
                              <td className="py-2">
                                <span className="text-green-600 font-medium">
                                  {fatura.valor_pago ? formatarValor(fatura.valor_pago) : formatarValor(fatura.valor)}
                                </span>
                              </td>
                              <td className="py-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm">{formatarData(fatura.data_pagamento || fatura.data_geracao)}</span>
                                  {fatura.status === 'PAGA' && (
                                    <Badge className="bg-green-500 text-white text-xs">PAGO</Badge>
                                  )}
                                </div>
                              </td>
                              <td className="py-2">
                                <div className="flex gap-2">
                                  <Button variant="ghost" size="sm">
                                    <Receipt className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="text-red-600">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <p className="text-xs text-gray-500">Referência: {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</p>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal de Edição */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Dados da Assinatura</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Dados da Assinatura */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Dados da Assinatura</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="codigo">Código da Assinatura *</Label>
                  <Input
                    id="codigo"
                    value={editForm.codigo || ''}
                    onChange={(e) => setEditForm({...editForm, codigo: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="nome">Nome Completo *</Label>
                  <Input
                    id="nome"
                    value={editForm.nome_completo || ''}
                    onChange={(e) => setEditForm({...editForm, nome_completo: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="cpf">CPF *</Label>
                  <Input
                    id="cpf"
                    value={editForm.cpf || ''}
                    onChange={(e) => setEditForm({...editForm, cpf: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="rg">RG *</Label>
                  <Input
                    id="rg"
                    value={editForm.rg || ''}
                    onChange={(e) => setEditForm({...editForm, rg: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="nascimento">Data de Nascimento *</Label>
                  <Input
                    id="nascimento"
                    type="date"
                    value={editForm.data_nascimento || ''}
                    onChange={(e) => setEditForm({...editForm, data_nascimento: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="email">E-mail *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={editForm.email || ''}
                    onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="telefone">Telefone *</Label>
                  <Input
                    id="telefone"
                    value={editForm.telefone || ''}
                    onChange={(e) => setEditForm({...editForm, telefone: e.target.value})}
                  />
                </div>
              </div>
            </div>

            {/* Endereço Detalhado */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Endereço Detalhado</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="estado">Estado</Label>
                  <Select value={editForm.estado || ''} onValueChange={(value) => setEditForm({...editForm, estado: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o estado" />
                    </SelectTrigger>
                    <SelectContent>
                      {estados.map((estado) => (
                        <SelectItem key={estado} value={estado}>{estado}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input
                    id="cidade"
                    value={editForm.cidade || ''}
                    onChange={(e) => setEditForm({...editForm, cidade: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="bairro">Bairro</Label>
                  <Input
                    id="bairro"
                    value={editForm.bairro || ''}
                    onChange={(e) => setEditForm({...editForm, bairro: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="rua">Rua</Label>
                  <Input
                    id="rua"
                    value={editForm.rua || ''}
                    onChange={(e) => setEditForm({...editForm, rua: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="numero">Número</Label>
                  <Input
                    id="numero"
                    value={editForm.numero || ''}
                    onChange={(e) => setEditForm({...editForm, numero: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="cep">CEP</Label>
                  <Input
                    id="cep"
                    value={editForm.cep || ''}
                    onChange={(e) => setEditForm({...editForm, cep: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="referencia">Ponto de Referência</Label>
                <Textarea
                  id="referencia"
                  placeholder="Ex: Próximo à padaria Silva"
                  value={editForm.ponto_referencia || ''}
                  onChange={(e) => setEditForm({...editForm, ponto_referencia: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={salvarAlteracoes} className="bg-blue-600 hover:bg-blue-700">
              Salvar Alterações
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Gerar Fatura */}
      <Dialog open={gerarFaturaModalOpen} onOpenChange={setGerarFaturaModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerar Nova Fatura</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="valor">Valor da Fatura</Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                value={novaFatura.valor}
                onChange={(e) => setNovaFatura({...novaFatura, valor: parseFloat(e.target.value) || 0})}
              />
            </div>
            <div>
              <Label htmlFor="mes">Mês de Referência</Label>
              <Input
                id="mes"
                value={novaFatura.mes_referencia}
                onChange={(e) => setNovaFatura({...novaFatura, mes_referencia: e.target.value})}
                placeholder="Ex: julho de 2025"
              />
            </div>
            <div>
              <Label htmlFor="vencimento">Data de Vencimento</Label>
              <Input
                id="vencimento"
                type="date"
                value={novaFatura.data_vencimento}
                onChange={(e) => setNovaFatura({...novaFatura, data_vencimento: e.target.value})}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setGerarFaturaModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={gerarFatura} className="bg-blue-600 hover:bg-blue-700">
              Gerar Fatura
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Assinaturas; 