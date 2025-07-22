import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/shared/components/ui/alert-dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Trash2, AlertTriangle, Database, RefreshCcw } from 'lucide-react';
import { firebase } from '@/shared/lib/firebaseWrapper';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/shared/hooks/use-toast';

export const SystemResetCard = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [step, setStep] = useState<'initial' | 'confirm' | 'processing'>('initial');
  
  const resetDatabase = async () => {
    if (!user) return;
    
    setStep('processing');
    setIsLoading(true);

    try {
      const deleteOperations = [
        // Deletar TVBox pagamentos
        firebase.from('tvbox_pagamentos').delete().eq('user_id', user.id),
        
        // Deletar TVBox equipamentos
        firebase.from('tvbox_equipamentos').delete().eq('user_id', user.id),
        
        // Deletar TVBox assinaturas
        firebase.from('tvbox_assinaturas').delete().eq('user_id', user.id),
        
        // Deletar faturas
        firebase.from('faturas').delete().eq('user_id', user.id),
        
        // Deletar cobranças
        firebase.from('cobrancas').delete().eq('user_id', user.id),
        
        // Deletar histórico de equipamentos
        firebase.from('equipamento_historico').delete().eq('user_id', user.id),
        
        // Deletar equipamentos
        firebase.from('equipamentos').delete().eq('user_id', user.id),
        
        // Deletar permissões de funcionários
        firebase.from('funcionario_permissoes').delete().eq('user_id', user.id),
        
        // Deletar funcionários
        firebase.from('funcionarios').delete().eq('user_id', user.id),
        
        // Deletar clientes
        firebase.from('clientes').delete().eq('user_id', user.id),
      ];

      // Executar todas as operações de delete
      const results = await Promise.allSettled(deleteOperations);
      
      // Verificar se houve erros
      const errors = results.filter(result => result.status === 'rejected').map(result => result.reason);
      
      if (errors.length > 0) {
        console.error('Erros durante a limpeza:', errors);
        toast({
          title: "Aviso",
          description: "Alguns dados podem não ter sido removidos completamente. Verifique os logs.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Sistema Limpo!",
          description: "Todos os dados foram removidos com sucesso. Você pode começar a cadastrar os dados reais.",
          variant: "default",
        });
      }

      // Reset form
      setStep('initial');
      setConfirmText('');
      
    } catch (error) {
      console.error('Erro ao limpar dados:', error);
      toast({
        title: "Erro",
        description: "Erro ao limpar os dados do sistema. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = () => {
    if (confirmText.toLowerCase() === 'limpar sistema') {
      resetDatabase();
    } else {
      toast({
        title: "Confirmação Incorreta",
        description: "Digite exatamente 'LIMPAR SISTEMA' para confirmar.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="border-red-200 bg-red-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-700">
          <AlertTriangle className="h-5 w-5" />
          Reset do Sistema - Limpeza Geral
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-white p-4 rounded-lg border border-red-200">
          <h3 className="font-semibold text-red-800 mb-2">⚠️ ATENÇÃO - OPERAÇÃO IRREVERSÍVEL</h3>
          <p className="text-sm text-gray-700 mb-3">
            Esta função irá remover <strong>TODOS</strong> os dados do sistema:
          </p>
          
          <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-4">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-red-500" />
              <span>Clientes</span>
            </div>
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-red-500" />
              <span>TV Box</span>
            </div>
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-red-500" />
              <span>Equipamentos</span>
            </div>
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-red-500" />
              <span>Cobranças</span>
            </div>
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-red-500" />
              <span>Funcionários</span>
            </div>
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-red-500" />
              <span>Faturas</span>
            </div>
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-red-500" />
              <span>Históricos</span>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
            <p className="text-sm text-yellow-800">
              <strong>Use esta função apenas para:</strong><br />
              • Limpar dados de teste<br />
              • Recomeçar com dados reais<br />
              • Reset completo do sistema
            </p>
          </div>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full" disabled={isLoading}>
              <Trash2 className="mr-2 h-4 w-4" />
              {isLoading ? 'Limpando Sistema...' : 'Limpar Todos os Dados'}
            </Button>
          </AlertDialogTrigger>
          
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="h-5 w-5" />
                Confirmação de Reset do Sistema
              </AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação é <strong>IRREVERSÍVEL</strong> e removerá todos os dados do sistema.
                Para confirmar, digite <strong>"LIMPAR SISTEMA"</strong> no campo abaixo:
              </AlertDialogDescription>
            </AlertDialogHeader>
            
            <div className="py-4">
              <Label htmlFor="confirm-text">Digite "LIMPAR SISTEMA" para confirmar:</Label>
              <Input
                id="confirm-text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="LIMPAR SISTEMA"
                className="mt-2"
              />
            </div>
            
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setConfirmText('')}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirm}
                className="bg-red-600 hover:bg-red-700"
                disabled={confirmText.toLowerCase() !== 'limpar sistema'}
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                Confirmar Limpeza
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};







