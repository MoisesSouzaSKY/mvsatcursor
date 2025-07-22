import { useState, useEffect } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/shared/components/ui/alert-dialog';
import { Eye, Download, Trash2 } from 'lucide-react';
import { useToast } from '@/shared/hooks/use-toast';
import { firebase } from '@/shared/lib/firebaseWrapper';

interface VisualizarComprovanteDialogProps {
  cobrancaId: string;
  comprovanteUrl: string;
  clienteNome: string;
  valorRecebido: number;
  dataPagamento: string;
  metodoPagamento: string;
  statusObservacao: string;
  isAdmin?: boolean;
  onComprovanteExcluido?: () => void;
}

export const VisualizarComprovanteDialog = ({
  cobrancaId,
  comprovanteUrl,
  clienteNome,
  valorRecebido,
  dataPagamento,
  metodoPagamento,
  statusObservacao,
  isAdmin = false,
  onComprovanteExcluido
}: VisualizarComprovanteDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [comprovanteData, setComprovanteData] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [fileType, setFileType] = useState<'image' | 'pdf' | null>(null);
  const { toast } = useToast();

  const loadComprovante = async () => {
    if (!comprovanteUrl) return;
    
    setIsLoading(true);
    try {
      // Extrair o caminho do arquivo da URL completa
      let filePath = comprovanteUrl;
      if (comprovanteUrl.includes('/storage/v1/object/public/comprovantes/')) {
        filePath = comprovanteUrl.split('/storage/v1/object/public/comprovantes/')[1];
      }

      const { data, error } = await firebase.storage
        .from('comprovantes')
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      setComprovanteData(url);
      
      // Detectar tipo de arquivo
      const extension = filePath.split('.').pop()?.toLowerCase();
      setFileType(extension === 'pdf' ? 'pdf' : 'image');
    } catch (error) {
      console.error('Erro ao carregar comprovante:', error);
      toast({
        title: "Erro ao carregar comprovante",
        description: "Não foi possível carregar o comprovante.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!comprovanteData) return;
    
    const link = document.createElement('a');
    link.href = comprovanteData;
    link.download = `comprovante_${clienteNome.replace(/\s+/g, '_')}_${dataPagamento}.${fileType === 'pdf' ? 'pdf' : 'jpg'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteComprovante = async () => {
    setIsDeleting(true);
    try {
      // Extrair o caminho do arquivo da URL completa
      let filePath = comprovanteUrl;
      if (comprovanteUrl.includes('/storage/v1/object/public/comprovantes/')) {
        filePath = comprovanteUrl.split('/storage/v1/object/public/comprovantes/')[1];
      }

      // Deletar arquivo do storage
      const { error: deleteError } = await firebase.storage
        .from('comprovantes')
        .remove([filePath]);

      if (deleteError) throw deleteError;

      // Atualizar cobrança para remover referência do comprovante
      const { error: updateError } = await supabase
        .from('cobrancas')
        .update({
          comprovante_url: null,
          status: 'pendente',
          data_pagamento: null,
          metodo_pagamento: null,
          valor_recebido: null,
          status_observacao: null
        })
        .eq('id', cobrancaId);

      if (updateError) throw updateError;

      toast({
        title: "Comprovante excluído",
        description: "O comprovante foi excluído e a cobrança foi revertida para pendente.",
      });

      onComprovanteExcluido?.();
      setIsOpen(false);
    } catch (error) {
      console.error('Erro ao excluir comprovante:', error);
      toast({
        title: "Erro ao excluir comprovante",
        description: "Não foi possível excluir o comprovante.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadComprovante();
    }
    
    return () => {
      if (comprovanteData) {
        URL.revokeObjectURL(comprovanteData);
      }
    };
  }, [isOpen, comprovanteUrl]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Eye className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Comprovante de Pagamento - {clienteNome}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Informações do pagamento */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-600">Data do Pagamento</p>
              <p className="text-lg">{new Date(dataPagamento).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Valor Recebido</p>
              <p className="text-lg font-semibold text-green-600">R$ {valorRecebido.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Método de Pagamento</p>
              <p className="text-lg">{metodoPagamento}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Status</p>
              <p className="text-lg">{statusObservacao}</p>
            </div>
          </div>

          {/* Comprovante */}
          <div className="border rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Comprovante</h3>
              <div className="flex space-x-2">
                {comprovanteData && (
                  <Button onClick={handleDownload} variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                )}
                {isAdmin && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Comprovante</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja excluir este comprovante? Esta ação não pode ser desfeita
                          e a cobrança será revertida para pendente.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteComprovante}
                          disabled={isDeleting}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          {isDeleting ? 'Excluindo...' : 'Excluir'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>

            <div className="min-h-96 bg-gray-100 rounded-lg flex items-center justify-center">
              {isLoading ? (
                <p>Carregando comprovante...</p>
              ) : comprovanteData ? (
                fileType === 'pdf' ? (
                  <iframe
                    src={comprovanteData}
                    className="w-full h-96 rounded-lg"
                    title="Comprovante PDF"
                  />
                ) : (
                  <img
                    src={comprovanteData}
                    alt="Comprovante de pagamento"
                    className="max-w-full max-h-96 object-contain rounded-lg"
                  />
                )
              ) : (
                <p className="text-gray-500">Comprovante não disponível</p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};







