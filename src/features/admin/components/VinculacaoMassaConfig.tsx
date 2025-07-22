import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Textarea } from '@/shared/components/ui/textarea';
import { Badge } from '@/shared/components/ui/badge';
import { Progress } from '@/shared/components/ui/progress';
import { AlertCircle, CheckCircle, XCircle, Loader2, Users, Link } from 'lucide-react';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { firebase } from '@/shared/lib/firebaseWrapper';
import { useToast } from '@/shared/hooks/use-toast';

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

export const VinculacaoMassaConfig = () => {
  const [inputData, setInputData] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<ProcessResult[]>([]);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const parseInputData = (input: string): VinculacaoData[] => {
    const sections = input.split(/(?=📌|---)/g).filter(section => section.trim());
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
        const cleanLine = line.replace(/[•⚡🧑💳🔗📌]/g, '').trim();
        
        if (cleanLine.includes('Nome:')) {
          // Extrair nome, removendo informações extra entre parênteses
          let nome = cleanLine.split('Nome:')[1]?.trim() || '';
          // Remover informações extras como "(DELL)" do nome
          nome = nome.replace(/\s*\([^)]*\)\s*/g, '').trim();
          clienteNome = nome;
        }
        if (cleanLine.includes('Bairro:')) {
          bairro = cleanLine.split('Bairro:')[1]?.trim() || '';
        }
        if (cleanLine.includes('NDS:')) {
          nds = cleanLine.split('NDS:')[1]?.trim() || '';
        }
        if (cleanLine.includes('Smart Card:')) {
          smartCard = cleanLine.split('Smart Card:')[1]?.trim() || '';
        }
        if (cleanLine.includes('Código:')) {
          codigoAssinatura = cleanLine.split('Código:')[1]?.trim() || '';
        }
        if (cleanLine.includes('Tipo de cobrança:')) {
          tipoCobranca = cleanLine.split('Tipo de cobrança:')[1]?.trim() || '';
        }
        if (cleanLine.includes('Valor da mensalidade:')) {
          // Capturar valores como "R$ 120" ou apenas "120"
          const valorMatch = cleanLine.match(/R?\$?\s*(\d+(?:[.,]\d+)?)/);
          valor = valorMatch ? parseFloat(valorMatch[1].replace(',', '.')) : 0;
        }
        if (cleanLine.includes('Data de vencimento:')) {
          // Capturar o formato "Dia 10/07/2025"
          const dataMatch = cleanLine.match(/Dia\s+(\d{1,2}\/\d{1,2}\/\d{4})/);
          if (dataMatch) {
            dataVencimento = dataMatch[1];
          } else {
            // Fallback para outros formatos
            const dateMatch = cleanLine.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
            if (dateMatch) {
              dataVencimento = dateMatch[1];
            }
          }
        }
      });

      if (clienteNome && nds && smartCard && dataVencimento) {
        vinculacoes.push({
          clienteNome,
          bairro,
          nds,
          smartCard,
          codigoAssinatura: codigoAssinatura || 'N/A',
          tipoCobranca: tipoCobranca || 'SKY',
          valor: valor || 120,
          dataVencimento
        });
      }
    });

    return vinculacoes;
  };

  const processVinculacao = async (data: VinculacaoData): Promise<ProcessResult> => {
    try {
      console.log('Processando vinculação para:', data);
      
      // Verificar se usuário está autenticado
      const { data: { user } } = await firebase.auth.getUser();
      if (!user) {
        return {
          success: false,
          message: 'Usuário não autenticado',
          data
        };
      }
      
      console.log('Usuário autenticado:', user.id);

      // 1. Buscar cliente pelo nome
      const { data: clientes, error: clienteError } = await supabase
        .from('clientes')
        .select('id, user_id, nome')
        .eq('user_id', user.id)
        .ilike('nome', `%${data.clienteNome}%`)
        .limit(1);

      console.log('Busca de cliente:', { clientes, clienteError, nomeQueryado: data.clienteNome });

      if (clienteError) {
        console.error('Erro ao buscar cliente:', clienteError);
        return {
          success: false,
          message: `Erro ao buscar cliente: ${clienteError.message}`,
          data
        };
      }
      
      if (!clientes || clientes.length === 0) {
        return {
          success: false,
          message: `Cliente "${data.clienteNome}" não encontrado. Verifique se o nome está correto e se o cliente está cadastrado.`,
          data
        };
      }

      const cliente = clientes[0];
      console.log('Cliente encontrado:', cliente);

      // 2. Buscar assinatura existente (opcional, já que equipamentos já estão vinculados)
      let assinaturaId = null;
      
      // Primeiro, tentar buscar por código se fornecido
      if (data.codigoAssinatura && data.codigoAssinatura !== 'N/A') {
        const { data: assinaturas, error: assinaturaError } = await supabase
          .from('assinaturas')
          .select('id, codigo_assinatura')
          .eq('user_id', user.id)
          .eq('codigo_assinatura', data.codigoAssinatura)
          .limit(1);

        console.log('Busca por código de assinatura:', { assinaturas, assinaturaError, codigo: data.codigoAssinatura });

        if (assinaturaError) {
          console.error('Erro ao buscar assinatura por código:', assinaturaError);
        }

        if (assinaturas && assinaturas.length > 0) {
          assinaturaId = assinaturas[0].id;
        }
      }
      
      // Se não encontrou por código, buscar assinatura ativa do cliente
      if (!assinaturaId) {
        const { data: assinaturas, error: assinaturaError } = await supabase
          .from('assinaturas')
          .select('id, status, cliente_id')
          .eq('user_id', user.id)
          .eq('cliente_id', cliente.id)
          .in('status', ['ativa', 'ativo'])
          .limit(1);

        console.log('Busca de assinatura por cliente:', { assinaturas, assinaturaError, clienteId: cliente.id });

        if (assinaturaError) {
          console.error('Erro ao buscar assinatura por cliente:', assinaturaError);
        }

        if (assinaturas && assinaturas.length > 0) {
          assinaturaId = assinaturas[0].id;
        }
      }

      // Se ainda não encontrou assinatura, buscar a assinatura atual do equipamento
      if (!assinaturaId) {
        const { data: equipamentoTemp, error: equipamentoTempError } = await supabase
          .from('equipamentos')
          .select('assinatura_id')
          .eq('user_id', user.id)
          .eq('numero_nds', data.nds)
          .limit(1);

        console.log('Busca assinatura do equipamento:', { equipamentoTemp, equipamentoTempError, nds: data.nds });

        if (!equipamentoTempError && equipamentoTemp && equipamentoTemp.length > 0 && equipamentoTemp[0].assinatura_id) {
          assinaturaId = equipamentoTemp[0].assinatura_id;
          console.log('Usando assinatura atual do equipamento:', assinaturaId);
        }
      }

      console.log('Assinatura final para vinculação:', assinaturaId);

      console.log('Assinatura encontrada:', assinaturaId);

      // 3. Buscar equipamento pelo NDS
      const { data: equipamentos, error: equipamentoError } = await supabase
        .from('equipamentos')
        .select('id, numero_nds, smart_card, status_aparelho')
        .eq('user_id', user.id)
        .eq('numero_nds', data.nds)
        .limit(1);

      console.log('Busca de equipamento:', { equipamentos, equipamentoError, nds: data.nds });

      if (equipamentoError) {
        console.error('Erro ao buscar equipamento:', equipamentoError);
        return {
          success: false,
          message: `Erro ao buscar equipamento: ${equipamentoError.message}`,
          data
        };
      }
      
      if (!equipamentos || equipamentos.length === 0) {
        return {
          success: false,
          message: `Equipamento com NDS "${data.nds}" não encontrado. Verifique se o NDS está correto e se o equipamento está cadastrado.`,
          data
        };
      }

      const equipamento = equipamentos[0];
      console.log('Equipamento encontrado:', equipamento);

      // Verificar se o Smart Card também confere
      if (equipamento.smart_card !== data.smartCard) {
        return {
          success: false,
          message: `Smart Card não confere. Esperado: ${equipamento.smart_card}, Informado: ${data.smartCard}`,
          data
        };
      }

      // 4. Vincular equipamento ao cliente e assinatura
      const { error: updateError } = await supabase
        .from('equipamentos')
        .update({
          cliente_atual_id: cliente.id,
          assinatura_id: assinaturaId,
          status_aparelho: 'alugado'
        })
        .eq('id', equipamento.id);

      console.log('Atualização de equipamento:', { updateError, equipamentoId: equipamento.id });

      if (updateError) {
        console.error('Erro ao vincular equipamento:', updateError);
        return {
          success: false,
          message: `Erro ao vincular equipamento: ${updateError.message}`,
          data
        };
      }

      // 5. Gerar cobrança
      const dataVencimentoFormatada = data.dataVencimento.split('/').reverse().join('-');
      
      console.log('Gerando cobrança:', {
        user_id: user.id,
        cliente_id: cliente.id,
        assinatura_id: assinaturaId,
        valor: data.valor,
        data_vencimento: dataVencimentoFormatada
      });
      
      const { error: cobrancaError } = await supabase
        .from('cobrancas')
        .insert({
          user_id: user.id,
          cliente_id: cliente.id,
          assinatura_id: assinaturaId,
          tipo: data.tipoCobranca.toLowerCase(),
          valor: data.valor,
          data_vencimento: dataVencimentoFormatada,
          status: 'pendente',
          observacoes: 'Cobrança gerada automaticamente via vinculação em massa'
        });

      console.log('Resultado da cobrança:', { cobrancaError });

      if (cobrancaError) {
        console.error('Erro ao gerar cobrança:', cobrancaError);
        return {
          success: false,
          message: `Erro ao gerar cobrança: ${cobrancaError.message}`,
          data
        };
      }

      console.log('Vinculação concluída com sucesso para:', data.clienteNome);

      return {
        success: true,
        message: 'Vinculação e cobrança criadas com sucesso',
        data
      };

    } catch (error) {
      console.error('Erro inesperado na vinculação:', error);
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

  const exampleData = `📌 Vincular Cliente Existente à Assinatura + Gerar Cobrança Recorrente

🧑 Cliente (já cadastrado):
• Nome: Luiz Carlos (DELL)
• Bairro: Cremação
• NDS: CE0A012550645830B
• Smart Card: 0012 0756 3253

💳 Gerar Cobrança:
• Tipo de cobrança: SKY
• Valor da mensalidade: R$ 120
• Data de vencimento: Dia 10/07/2025
• Recorrência: Sim, até devolução do equipamento ou alteração administrativa

---

📌 Vincular Cliente Existente à Assinatura + Gerar Cobrança Recorrente

🧑 Cliente (já cadastrado):
• Nome: Maria Silva
• Bairro: Centro
• NDS: CE0A012553312556B
• Smart Card: 0012 0756 4321

💳 Gerar Cobrança:
• Tipo de cobrança: SKY
• Valor da mensalidade: R$ 150
• Data de vencimento: Dia 15/08/2025
• Recorrência: Sim, até devolução do equipamento ou alteração administrativa`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link className="h-5 w-5" />
          Vinculação em Massa - Clientes e Equipamentos
        </CardTitle>
        <CardDescription>
          Processe múltiplas vinculações de clientes aos equipamentos e crie cobranças automaticamente
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Formato esperado:</strong> Cole os dados formatados separados por "---". Cada seção deve conter as informações do cliente, equipamento (NDS e Smart Card) e dados da cobrança.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Dados das Vinculações
            </label>
            <Textarea
              placeholder={`Cole aqui os dados das vinculações ou clique em "Ver Exemplo" para ver o formato esperado...`}
              value={inputData}
              onChange={(e) => setInputData(e.target.value)}
              className="min-h-[200px] font-mono text-sm"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button 
              onClick={handleProcessar}
              disabled={isProcessing || !inputData.trim()}
              className="flex items-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Users className="h-4 w-4" />
                  Processar Vinculações
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              onClick={handleLimpar}
              disabled={isProcessing}
            >
              Limpar
            </Button>

            <Button
              variant="outline"
              onClick={() => setInputData(exampleData)}
              disabled={isProcessing}
            >
              Ver Exemplo
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
        </div>

        {results.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Resultados do Processamento</h3>
              <div className="flex gap-2">
                <Badge variant="outline" className="text-green-600">
                  {results.filter(r => r.success).length} sucessos
                </Badge>
                <Badge variant="outline" className="text-red-600">
                  {results.filter(r => !r.success).length} erros
                </Badge>
              </div>
            </div>

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
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};







