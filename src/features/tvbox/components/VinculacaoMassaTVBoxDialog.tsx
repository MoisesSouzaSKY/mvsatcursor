import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Textarea } from '@/shared/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Progress } from '@/shared/components/ui/progress';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/shared/hooks/use-toast';
import { firebase } from '@/shared/lib/firebaseWrapper';
import { useUserContext } from '@/shared/hooks/useUserContext';

interface VinculacaoMassaTVBoxDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface VinculacaoData {
  cliente_nome: string;
  login: string;
  codigo_assinatura: string;
}

interface ProcessResult {
  success: boolean;
  message: string;
  data: VinculacaoData;
}

export const VinculacaoMassaTVBoxDialog = ({ open, onOpenChange, onSuccess }: VinculacaoMassaTVBoxDialogProps) => {
  const { userId } = useUserContext();
  const { toast } = useToast();
  const [inputData, setInputData] = useState('');
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<ProcessResult[]>([]);
  const [progress, setProgress] = useState(0);

  const parseInputData = (input: string): VinculacaoData[] => {
    const lines = input.trim().split('\n');
    const vinculacoes: VinculacaoData[] = [];

    for (const line of lines) {
      if (line.trim()) {
        const parts = line.split('\t');
        if (parts.length >= 3) {
          vinculacoes.push({
            cliente_nome: parts[0].trim(),
            login: parts[1].trim(),
            codigo_assinatura: parts[2].trim()
          });
        }
      }
    }

    return vinculacoes;
  };

  const processVinculacao = async (data: VinculacaoData): Promise<ProcessResult> => {
    try {
      console.log('🔍 Processando vinculação:', data);

      // 1. Buscar cliente por nome (busca mais flexível)
      console.log('🔍 Buscando cliente:', data.cliente_nome);
      const { data: clientes, error: clienteError } = await supabase
        .from('clientes')
        .select('id, nome')
        .eq('user_id', userId!)
        .ilike('nome', `%${data.cliente_nome.trim()}%`);

      if (clienteError) {
        console.error('❌ Erro ao buscar cliente:', clienteError);
        throw clienteError;
      }

      console.log('📊 Clientes encontrados:', clientes);
      
      if (!clientes || clientes.length === 0) {
        return {
          success: false,
          message: `Cliente "${data.cliente_nome}" não encontrado. Verifique se o nome está correto.`,
          data
        };
      }

      // Se encontrou múltiplos, pegar o primeiro (melhor match)
      const cliente = clientes[0];
      console.log('✅ Cliente selecionado:', cliente);

      // 2. Buscar assinatura por login
      console.log('🔍 Buscando assinatura com login:', data.login);
      const { data: assinatura, error: assinaturaError } = await supabase
        .from('tvbox_assinaturas')
        .select('id, login, cliente_id')
        .eq('user_id', userId!)
        .eq('login', data.login.trim());

      if (assinaturaError) {
        console.error('❌ Erro ao buscar assinatura:', assinaturaError);
        throw assinaturaError;
      }

      console.log('📊 Assinaturas encontradas:', assinatura);

      if (!assinatura || assinatura.length === 0) {
        return {
          success: false,
          message: `Assinatura com login "${data.login}" não encontrada. Verifique se o login está correto.`,
          data
        };
      }

      const assinaturaObj = assinatura[0];
      console.log('✅ Assinatura selecionada:', assinaturaObj);

      // 3. Buscar equipamento pelo código da assinatura
      console.log('🔍 Buscando equipamento com código:', data.codigo_assinatura);
      const { data: equipamentos, error: equipamentoError } = await supabase
        .from('tvbox_equipamentos')
        .select('id, serial_number, mac_address, id_aparelho, assinatura_id')
        .eq('user_id', userId!)
        .or(`serial_number.eq.${data.codigo_assinatura.trim()},mac_address.eq.${data.codigo_assinatura.trim()},id_aparelho.eq.${data.codigo_assinatura.trim()}`);

      if (equipamentoError) {
        console.error('❌ Erro ao buscar equipamento:', equipamentoError);
        throw equipamentoError;
      }

      console.log('📊 Equipamentos encontrados:', equipamentos);

      if (!equipamentos || equipamentos.length === 0) {
        return {
          success: false,
          message: `Equipamento com código "${data.codigo_assinatura}" não encontrado. Verifique se o código está correto (deve ser serial_number, mac_address ou id_aparelho).`,
          data
        };
      }

      const equipamento = equipamentos[0];
      console.log('✅ Equipamento selecionado:', equipamento);

      // 4. Atualizar assinatura com cliente (só se não tiver cliente ainda)
      if (!assinaturaObj.cliente_id || assinaturaObj.cliente_id !== cliente.id) {
        console.log('🔄 Atualizando assinatura com cliente...');
        const { error: updateAssinaturaError } = await supabase
          .from('tvbox_assinaturas')
          .update({ cliente_id: cliente.id })
          .eq('id', assinaturaObj.id);

        if (updateAssinaturaError) {
          console.error('❌ Erro ao atualizar assinatura:', updateAssinaturaError);
          throw updateAssinaturaError;
        }
        console.log('✅ Assinatura atualizada com cliente');
      } else {
        console.log('ℹ️ Assinatura já vinculada ao cliente');
      }

      // 5. Vincular equipamento à assinatura (só se não estiver vinculado)
      if (!equipamento.assinatura_id || equipamento.assinatura_id !== assinaturaObj.id) {
        console.log('🔄 Vinculando equipamento à assinatura...');
        const { error: updateEquipamentoError } = await supabase
          .from('tvbox_equipamentos')
          .update({ assinatura_id: assinaturaObj.id })
          .eq('id', equipamento.id);

        if (updateEquipamentoError) {
          console.error('❌ Erro ao vincular equipamento:', updateEquipamentoError);
          throw updateEquipamentoError;
        }
        console.log('✅ Equipamento vinculado à assinatura');
      } else {
        console.log('ℹ️ Equipamento já vinculado à assinatura');
      }

      return {
        success: true,
        message: `✅ Vinculação realizada: ${cliente.nome} → ${data.login} → ${data.codigo_assinatura}`,
        data
      };

    } catch (error) {
      console.error('💥 Erro no processamento:', error);
      return {
        success: false,
        message: `❌ Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        data
      };
    }
  };

  const handleProcessar = async () => {
    if (!inputData.trim()) {
      toast({
        title: "Dados necessários",
        description: "Por favor, insira os dados para processar",
        variant: "destructive"
      });
      return;
    }

    setProcessing(true);
    setResults([]);
    setProgress(0);

    try {
      const vinculacoes = parseInputData(inputData);
      
      if (vinculacoes.length === 0) {
        toast({
          title: "Formato inválido",
          description: "Nenhuma vinculação válida encontrada nos dados fornecidos",
          variant: "destructive"
        });
        return;
      }

      const newResults: ProcessResult[] = [];

      for (let i = 0; i < vinculacoes.length; i++) {
        const result = await processVinculacao(vinculacoes[i]);
        newResults.push(result);
        setResults([...newResults]);
        setProgress(((i + 1) / vinculacoes.length) * 100);
      }

      const sucessos = newResults.filter(r => r.success).length;
      toast({
        title: "Processamento concluído",
        description: `${sucessos}/${vinculacoes.length} vinculações realizadas com sucesso`,
        variant: sucessos === vinculacoes.length ? "default" : "destructive"
      });

      if (sucessos > 0 && onSuccess) {
        onSuccess();
      }

    } catch (error) {
      console.error('Erro no processamento:', error);
      toast({
        title: "Erro no processamento",
        description: "Ocorreu um erro durante o processamento dos dados",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleLimpar = () => {
    setInputData('');
    setResults([]);
    setProgress(0);
  };

  const sucessos = results.filter(r => r.success).length;
  const erros = results.filter(r => !r.success).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Vinculação em Massa - TV Box</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Dados para Processamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">
                  Cole os dados no formato: Nome do Cliente → Login → Código do Equipamento (separados por TAB)
                </label>
                <Textarea
                  value={inputData}
                  onChange={(e) => setInputData(e.target.value)}
                  placeholder="Antonio Batista Icui	drubuq	PRO25JAN037247&#10;Basileu Júnior	xyng8w	PRO25JAN037249&#10;..."
                  className="mt-2 min-h-[200px] font-mono text-sm"
                  disabled={processing}
                />
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Formato esperado:</strong> Cada linha deve conter Nome do Cliente, Login da Assinatura e Código do Equipamento separados por TAB.
                  O sistema irá buscar clientes por nome aproximado, assinaturas por login exato e equipamentos por serial_number ou id_aparelho.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {processing && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Processando...</CardTitle>
              </CardHeader>
              <CardContent>
                <Progress value={progress} className="w-full" />
                <p className="text-sm text-gray-600 mt-2">
                  {Math.round(progress)}% concluído
                </p>
              </CardContent>
            </Card>
          )}

          {results.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  Resultados
                  <div className="flex gap-2">
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      {sucessos} sucessos
                    </Badge>
                    <Badge variant="destructive">
                      {erros} erros
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {results.map((result, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border ${
                        result.success
                          ? 'bg-green-50 border-green-200'
                          : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {result.success ? (
                          <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {result.data.cliente_nome} → {result.data.login} → {result.data.codigo_assinatura}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            {result.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleLimpar}
            disabled={processing}
          >
            Limpar
          </Button>
          <Button
            onClick={handleProcessar}
            disabled={processing || !inputData.trim()}
          >
            {processing ? 'Processando...' : 'Processar Vinculações'}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};







