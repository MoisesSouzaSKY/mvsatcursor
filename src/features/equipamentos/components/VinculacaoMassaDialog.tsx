import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/shared/components/ui/dialog';
import { Textarea } from '@/shared/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Progress } from '@/shared/components/ui/progress';
import { CheckCircle, XCircle, Loader2, Users, Settings } from 'lucide-react';
import { firebase } from '@/shared/lib/firebaseWrapper';
import { useToast } from '@/shared/hooks/use-toast';

interface VinculacaoMassaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface VinculacaoData {
  clienteNome: string;
  bairro: string;
  nds: string;
  smartCard: string;
  codigoAssinatura: string;
  tipoCobranca: string;
  valor: number;
  dataVencimento: string;
}

interface ProcessResult {
  success: boolean;
  message: string;
  data: VinculacaoData;
}

export const VinculacaoMassaDialog = ({
  open,
  onOpenChange
}: VinculacaoMassaDialogProps) => {
  const [inputData, setInputData] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<ProcessResult[]>([]);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const parseInputData = (input: string): VinculacaoData[] => {
    const sections = input.split('---').filter(section => section.trim());
    const vinculacoes: VinculacaoData[] = [];

    sections.forEach(section => {
      const lines = section.split('\n').filter(line => line.trim());
      let clienteNome = '';
      let bairro = '';
      let nds = '';
      let smartCard = '';
      let codigoAssinatura = '';
      let tipoCobranca = '';
      let valor = 0;
      let dataVencimento = '';

      lines.forEach(line => {
        if (line.includes('Nome:')) {
          clienteNome = line.split('Nome:')[1]?.trim() || '';
        }
        if (line.includes('Bairro:')) {
          bairro = line.split('Bairro:')[1]?.trim() || '';
        }
        if (line.includes('NDS:')) {
          nds = line.split('NDS:')[1]?.trim() || '';
        }
        if (line.includes('Smart Card:')) {
          smartCard = line.split('Smart Card:')[1]?.trim() || '';
        }
        if (line.includes('Código:')) {
          codigoAssinatura = line.split('Código:')[1]?.trim() || '';
        }
        if (line.includes('Tipo de cobrança:')) {
          tipoCobranca = line.split('Tipo de cobrança:')[1]?.trim() || '';
        }
        if (line.includes('Valor da mensalidade:')) {
          const valorStr = line.split('R$')[1]?.replace(',', '.').trim() || '0';
          valor = parseFloat(valorStr);
        }
        if (line.includes('Data de vencimento:')) {
          dataVencimento = line.split('Data de vencimento:')[1]?.trim() || '';
        }
      });

      if (clienteNome && nds && smartCard && codigoAssinatura) {
        vinculacoes.push({
          clienteNome,
          bairro,
          nds,
          smartCard,
          codigoAssinatura,
          tipoCobranca,
          valor,
          dataVencimento
        });
      }
    });

    return vinculacoes;
  };

  const processVinculacao = async (data: VinculacaoData): Promise<ProcessResult> => {
    try {
      // 1. Buscar cliente pelo nome
      const { data: clientes, error: clienteError } = await supabase
        .from('clientes')
        .select('id')
        .ilike('nome', `%${data.clienteNome}%`)
        .limit(1);

      if (clienteError || !clientes || clientes.length === 0) {
        return {
          success: false,
          message: `Cliente "${data.clienteNome}" não encontrado`,
          data
        };
      }

      const clienteId = clientes[0].id;

      // 2. Buscar assinatura pelo código
      const { data: assinaturas, error: assinaturaError } = await supabase
        .from('assinaturas')
        .select('id')
        .eq('codigo_assinatura', data.codigoAssinatura)
        .limit(1);

      if (assinaturaError || !assinaturas || assinaturas.length === 0) {
        return {
          success: false,
          message: `Assinatura "${data.codigoAssinatura}" não encontrada`,
          data
        };
      }

      const assinaturaId = assinaturas[0].id;

      // 3. Buscar equipamento pelo NDS
      const { data: equipamentos, error: equipamentoError } = await supabase
        .from('equipamentos')
        .select('id')
        .eq('numero_nds', data.nds)
        .limit(1);

      if (equipamentoError || !equipamentos || equipamentos.length === 0) {
        return {
          success: false,
          message: `Equipamento com NDS "${data.nds}" não encontrado`,
          data
        };
      }

      const equipamentoId = equipamentos[0].id;

      // 4. Vincular equipamento ao cliente e assinatura
      const { error: updateError } = await supabase
        .from('equipamentos')
        .update({
          cliente_atual_id: clienteId,
          assinatura_id: assinaturaId,
          status_aparelho: 'alugado'
        })
        .eq('id', equipamentoId);

      if (updateError) {
        return {
          success: false,
          message: `Erro ao vincular equipamento: ${updateError.message}`,
          data
        };
      }

      // 5. Gerar cobrança
      const dataVencimentoFormatada = data.dataVencimento.split('/').reverse().join('-');
      
      // Obter o user_id do usuário atual
      const { data: { user } } = await firebase.auth.getUser();
      
      if (!user) {
        return {
          success: false,
          message: 'Usuário não autenticado',
          data
        };
      }
      
      const { error: cobrancaError } = await supabase
        .from('cobrancas')
        .insert({
          user_id: user.id,
          cliente_id: clienteId,
          assinatura_id: assinaturaId,
          tipo: data.tipoCobranca.toLowerCase(),
          valor: data.valor,
          data_vencimento: dataVencimentoFormatada,
          status: 'pendente',
          observacoes: 'Cobrança gerada automaticamente via vinculação em massa'
        });

      if (cobrancaError) {
        return {
          success: false,
          message: `Erro ao gerar cobrança: ${cobrancaError.message}`,
          data
        };
      }

      return {
        success: true,
        message: 'Vinculação e cobrança criadas com sucesso',
        data
      };

    } catch (error) {
      return {
        success: false,
        message: `Erro inesperado: ${error}`,
        data
      };
    }
  };

  const handleProcessar = async () => {
    if (!inputData.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, insira os dados para processamento",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setResults([]);
    setProgress(0);

    const vinculacoes = parseInputData(inputData);
    
    if (vinculacoes.length === 0) {
      toast({
        title: "Erro",
        description: "Nenhuma vinculação válida encontrada nos dados fornecidos",
        variant: "destructive"
      });
      setIsProcessing(false);
      return;
    }

    const newResults: ProcessResult[] = [];

    for (let i = 0; i < vinculacoes.length; i++) {
      const result = await processVinculacao(vinculacoes[i]);
      newResults.push(result);
      setResults([...newResults]);
      setProgress(((i + 1) / vinculacoes.length) * 100);
      
      // Pequeno delay para não sobrecarregar o banco
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsProcessing(false);
    
    const sucessos = newResults.filter(r => r.success).length;
    const erros = newResults.filter(r => !r.success).length;
    
    toast({
      title: "Processamento concluído",
      description: `${sucessos} vinculações realizadas com sucesso, ${erros} erros`,
      variant: sucessos > 0 ? "default" : "destructive"
    });
  };

  const handleLimpar = () => {
    setInputData('');
    setResults([]);
    setProgress(0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Vinculação em Massa - Clientes e Equipamentos
          </DialogTitle>
          <DialogDescription>
            Vincule múltiplos equipamentos a clientes automaticamente usando texto estruturado.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 overflow-y-auto">
          {/* Coluna de Input */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Dados de Entrada
                </CardTitle>
                <CardDescription>
                  Cole aqui os dados formatados das vinculações
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Cole aqui os dados das vinculações separados por ---"
                  value={inputData}
                  onChange={(e) => setInputData(e.target.value)}
                  className="min-h-[300px] font-mono text-sm"
                />
                
                <div className="flex gap-2">
                  <Button 
                    onClick={handleProcessar}
                    disabled={isProcessing || !inputData.trim()}
                    className="flex-1"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      'Processar Vinculações'
                    )}
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={handleLimpar}
                    disabled={isProcessing}
                  >
                    Limpar
                  </Button>
                </div>

                {isProcessing && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progresso:</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Coluna de Resultados */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Resultados</CardTitle>
                <CardDescription>
                  {results.length > 0 && (
                    <>
                      {results.filter(r => r.success).length} sucessos, {' '}
                      {results.filter(r => !r.success).length} erros
                    </>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
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
                          <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm truncate">
                              {result.data.clienteNome}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {result.data.nds}
                            </Badge>
                          </div>
                          <p className={`text-xs ${
                            result.success ? 'text-green-700' : 'text-red-700'
                          }`}>
                            {result.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {results.length === 0 && !isProcessing && (
                    <div className="text-center text-muted-foreground py-8">
                      Nenhum resultado ainda
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};







