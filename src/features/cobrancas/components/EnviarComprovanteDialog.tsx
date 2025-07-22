import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Textarea } from '@/shared/components/ui/textarea';
import { Upload, Check } from 'lucide-react';
import { toast } from '@/shared/hooks/use-toast';
import { firebase } from '@/shared/lib/firebaseWrapper';
import { updateCobranca, createCobranca } from '@/shared/lib/firebaseWrapper';
import { auth, storage } from '@/integrations/firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface EnviarComprovanteDialogProps {
  cobrancaId: string;
  onComprovanteEnviado: () => void;
}

export const EnviarComprovanteDialog = ({ cobrancaId, onComprovanteEnviado }: EnviarComprovanteDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [dataPagamento, setDataPagamento] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('');
  const [detalhesPersonalizados, setDetalhesPersonalizados] = useState('');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [valorRecebido, setValorRecebido] = useState('');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Verificar se é uma imagem ou PDF
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Formato inválido",
          description: "Apenas imagens (JPG, PNG) e PDFs são permitidos.",
          variant: "destructive"
        });
        return;
      }
      
      // Verificar tamanho (máximo 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "Arquivo muito grande",
          description: "O arquivo deve ter no máximo 10MB.",
          variant: "destructive"
        });
        return;
      }
      
      setArquivo(file);
    }
  };

  const calcularStatusObservacao = (dataVencimento: string, dataPagamento: string) => {
    const vencimento = new Date(dataVencimento);
    const pagamento = new Date(dataPagamento);
    
    const diferenca = Math.ceil((pagamento.getTime() - vencimento.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diferenca === 0) {
      return "Cliente pagou na data certa";
    } else if (diferenca > 0) {
      return `Cliente pagou com ${diferenca} dias de atraso`;
    } else {
      return `Cliente adiantou ${Math.abs(diferenca)} dias`;
    }
  };

  const handleEnviarComprovante = async () => {
    if (!dataPagamento || !formaPagamento || !valorRecebido) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    try {
      let comprovanteUrl = '';
      
      // Fazer upload do arquivo se fornecido
      if (arquivo) {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          throw new Error('Usuário não autenticado');
        }
        
        const fileExt = arquivo.name.split('.').pop();
        const fileName = `${currentUser.uid}/${Date.now()}.${fileExt}`;
        
        // Upload usando Firebase Storage
        const storageRef = ref(storage, `comprovantes/${fileName}`);
        const uploadResult = await uploadBytes(storageRef, arquivo);
        const downloadURL = await getDownloadURL(uploadResult.ref);
        
        comprovanteUrl = fileName;
      }

      // Calcular status da observação
      const statusObservacao = 'Pagamento registrado via comprovante';
      
      // Preparar detalhes do pagamento
      const detalhes = formaPagamento === 'outros' ? detalhesPersonalizados : formaPagamento;

      // Atualizar cobrança usando o wrapper
      const { error: updateError } = await updateCobranca(cobrancaId, {
        data_pagamento: new Date(dataPagamento),
        metodo_pagamento: detalhes,
        status: 'pago',
        comprovante_url: comprovanteUrl,
        valor_recebido: parseFloat(valorRecebido),
        status_observacao: statusObservacao
      });

      if (updateError) throw updateError;

      // Gerar próxima cobrança automaticamente
      const { data: assinatura } = await supabase
        .from('cobrancas')
        .select('assinatura_id, cliente_id, valor, data_vencimento')
        .eq('id', cobrancaId)
        .single();

      if (assinatura) {
        const proximoVencimento = new Date(assinatura.data_vencimento);
        proximoVencimento.setMonth(proximoVencimento.getMonth() + 1);
        
        // Verificar se já não existe cobrança para o próximo mês
        const { data: cobrancaExistente } = await supabase
          .from('cobrancas')
          .select('id')
          .eq('assinatura_id', assinatura.assinatura_id)
          .eq('data_vencimento', proximoVencimento.toISOString().split('T')[0])
          .single();

        if (!cobrancaExistente) {
          await createCobranca({
            assinatura_id: assinatura.assinatura_id,
            cliente_id: assinatura.cliente_id,
            valor: assinatura.valor,
            data_vencimento: proximoVencimento.toISOString().split('T')[0],
            status: 'pendente'
          });
        }
      }

      toast({
        title: "Comprovante enviado com sucesso!",
        description: "O pagamento foi registrado e a próxima cobrança foi gerada automaticamente.",
      });

      onComprovanteEnviado();
      setIsOpen(false);
      
      // Limpar formulário
      setDataPagamento('');
      setFormaPagamento('');
      setDetalhesPersonalizados('');
      setArquivo(null);
      setValorRecebido('');
    } catch (error) {
      console.error('Erro ao enviar comprovante:', error);
      toast({
        title: "Erro ao enviar comprovante",
        description: "Ocorreu um erro ao enviar o comprovante. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-green-600 hover:bg-green-700">
          <Check className="h-4 w-4 mr-1" />
          Enviar Comprovante
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar Comprovante de Pagamento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dataPagamento">Data do Pagamento *</Label>
            <Input
              id="dataPagamento"
              type="date"
              value={dataPagamento}
              onChange={(e) => setDataPagamento(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="valorRecebido">Valor Recebido *</Label>
            <Input
              id="valorRecebido"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={valorRecebido}
              onChange={(e) => setValorRecebido(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="formaPagamento">Forma de Pagamento *</Label>
            <Select value={formaPagamento} onValueChange={setFormaPagamento}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a forma de pagamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="loteria">Lotérica</SelectItem>
                <SelectItem value="em_maos">Em Mãos</SelectItem>
                <SelectItem value="outros">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formaPagamento === 'outros' && (
            <div className="space-y-2">
              <Label htmlFor="detalhes">Detalhes do Pagamento</Label>
              <Textarea
                id="detalhes"
                placeholder="Descreva os detalhes do pagamento..."
                value={detalhesPersonalizados}
                onChange={(e) => setDetalhesPersonalizados(e.target.value)}
                rows={3}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="comprovante">Comprovante (Imagem ou PDF)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="comprovante"
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileChange}
                className="flex-1"
              />
              <Upload className="h-4 w-4 text-gray-500" />
            </div>
            {arquivo && (
              <p className="text-sm text-green-600">
                Arquivo selecionado: {arquivo.name}
              </p>
            )}
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEnviarComprovante} disabled={isUploading}>
              {isUploading ? 'Enviando...' : 'Enviar Comprovante'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};







