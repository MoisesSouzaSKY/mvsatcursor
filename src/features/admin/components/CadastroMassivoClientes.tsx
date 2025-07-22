import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Progress } from '@/shared/components/ui/progress';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { useToast } from '@/shared/hooks/use-toast';
import { firebase } from '@/shared/lib/firebaseWrapper';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

interface ClienteData {
  nome: string;
  bairro: string;
  telefone1: string;
  telefone2?: string;
  smartCard: string;
  nds: string;
  valor: number;
  vencimento: number;
}

export const CadastroMassivoClientes = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<Array<{
    nome: string;
    status: 'success' | 'error';
    message: string;
  }>>([]);
  const { toast } = useToast();

  // Dados dos clientes para cadastro - Lote 1
  const clientes: ClienteData[] = [
    { nome: "Adriano Cezar", bairro: "Matadouro", telefone1: "86 99482-5235", telefone2: "86 99811-6652", smartCard: "1218455119", nds: "CE0A012554902806A", valor: 110.0, vencimento: 10 },
    { nome: "Alberto Carlos", bairro: "Bela vista 2", telefone1: "86 98812-6381", telefone2: "86 98833-5917", smartCard: "1150503504", nds: "670AAC25381503144", valor: 100.0, vencimento: 15 },
    { nome: "Alex Luiz", bairro: "Dirceu", telefone1: "86 99973-1094", telefone2: "86 99957-2096", smartCard: "1220486672", nds: "CE0A0125564811836", valor: 100.0, vencimento: 25 },
    { nome: "Ana Raquel", bairro: "Deus Quer", telefone1: "86 99833-4975", telefone2: "86 98887-4883", smartCard: "1152434880", nds: "CE0A012082690738F", valor: 110.0, vencimento: 10 },
    { nome: "Antonio Silva", bairro: "Pedra Mole", telefone1: "86 99833-2999", telefone2: "86 99814-6972", smartCard: "1221792805", nds: "CE0A0125576102216", valor: 110.0, vencimento: 20 },
    { nome: "Antonio Wellington", bairro: "Campestre", telefone1: "86 99404-8160", telefone2: "86 99535-5982", smartCard: "1221226960", nds: "670A0125566827513", valor: 110.0, vencimento: 10 },
    { nome: "Bruno Mikael", bairro: "Vale do Gaviao", telefone1: "86 99833-2999", telefone2: "86 99521-3186", smartCard: "767928559", nds: "CE0A2036209846494", valor: 120.0, vencimento: 20 },
    { nome: "Carlito Gomes", bairro: "Parque Piauí", telefone1: "86 98844-9898", telefone2: "99 3212-0562", smartCard: "1211278609", nds: "CE0A0125512704933", valor: 110.0, vencimento: 25 },
    { nome: "Carlito Gomes", bairro: "Parque Piauí", telefone1: "86 98844-9898", telefone2: "99 3212-0562", smartCard: "1218176046", nds: "CE0A0125532327302", valor: 100.0, vencimento: 25 },
    { nome: "Carlos Moreira", bairro: "São João", telefone1: "86 99586-5306", smartCard: "1221337965", nds: "CE0A012557584205F", valor: 110.0, vencimento: 10 },
    { nome: "Claudio", bairro: "Pastel", telefone1: "86 99421-9564", smartCard: "1147631475", nds: "CE0A0125389964053", valor: 110.0, vencimento: 10 },
    { nome: "Cristemberre Camelo", bairro: "Mocambinho", telefone1: "86 99436-7576", telefone2: "86 99414-3111", smartCard: "1221111808", nds: "CE0A012557607454B", valor: 120.0, vencimento: 25 },
    { nome: "Daniel Cesar", bairro: "Portal Da Alegria", telefone1: "86 99436-1586", telefone2: "86 99533-8522", smartCard: "1150137188", nds: "670A203539009859D", valor: 110.0, vencimento: 30 },
    { nome: "Darlan Furtado", bairro: "Fátima", telefone1: "86 99916-4153", smartCard: "1206966754", nds: "670A0125501588153", valor: 110.0, vencimento: 10 },
    { nome: "Darlan Furtado", bairro: "Fátima", telefone1: "86 99916-4153", smartCard: "1201801592", nds: "670A0125548904509E", valor: 110.0, vencimento: 10 },
    { nome: "Divaldo Furtado", bairro: "Saci", telefone1: "86 99945-3949", telefone2: "86 99916-4153", smartCard: "1131982892", nds: "CE0A0125440812833", valor: 110.0, vencimento: 15 },
    { nome: "Eduardo Damasceno", bairro: "Aeroporto", telefone1: "86 99419-2654", smartCard: "1149418947", nds: "CE0A0120824493067", valor: 100.0, vencimento: 20 },
    { nome: "Evandro de Souza", bairro: "Centro", telefone1: "86 98812-7465", telefone2: "86 98849-8898", smartCard: "1204632085", nds: "CE0A0125494994826", valor: 110.0, vencimento: 30 },
    { nome: "Francisco Brendo", bairro: "Tabajaras", telefone1: "86 9555-0038", smartCard: "1217736220", nds: "CE0A012553312556B", valor: 100.0, vencimento: 10 },
    { nome: "Francisco Brendo", bairro: "Tabajaras", telefone1: "86 99555-0038", smartCard: "1221016775", nds: "CE0A0125576370082", valor: 100.0, vencimento: 25 },
    { nome: "Francisco Eduardo", bairro: "Taquari", telefone1: "86 99454-7499", smartCard: "647479773", nds: "CE0AA63613249813A", valor: 110.0, vencimento: 5 },
    { nome: "Francisco Eduardo", bairro: "Taquari", telefone1: "86 99454-7499", smartCard: "772228789", nds: "CE0A012548276738F", valor: 110.0, vencimento: 5 },
    { nome: "Francisco Jefisson", bairro: "Novo horizonte", telefone1: "86 99576-7914", telefone2: "86 99481-2078", smartCard: "1203044480", nds: "CE0A012549496081F", valor: 100.0, vencimento: 5 },
    { nome: "Francisco Jhone", bairro: "Cajueiro", telefone1: "86 98818-4418", smartCard: "1152551683", nds: "CE0A0120828877367", valor: 110.0, vencimento: 5 },
    { nome: "Francisco Pereira", bairro: "Parque Piauí 1", telefone1: "86 98803-1268", telefone2: "86 98187-0687", smartCard: "1211204662", nds: "CE0A012551444272A", valor: 100.0, vencimento: 5 }
  ];

  const normalizeSmartCard = (smartCard: string): string => {
    return smartCard.padStart(12, '0');
  };

  const processarCliente = async (cliente: ClienteData, assinaturaId: string) => {
    try {
      // Obter usuário atual
      const { data: { user } } = await firebase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // 1. Criar cliente
      const { data: novoCliente, error: clienteError } = await supabase
        .from('clientes')
        .insert({
          nome: cliente.nome,
          bairro: cliente.bairro,
          telefone: cliente.telefone1,
          tipo_cliente: 'pessoa_fisica',
          status: 'ativo',
          user_id: user.id
        })
        .select()
        .single();

      if (clienteError) throw new Error(`Erro ao criar cliente: ${clienteError.message}`);

      // 2. Encontrar equipamento pelo SmartCard normalizado
      const smartCardNormalizado = normalizeSmartCard(cliente.smartCard);
      const { data: equipamento, error: equipamentoError } = await supabase
        .from('equipamentos')
        .select('*')
        .eq('smart_card', smartCardNormalizado)
        .eq('numero_nds', cliente.nds)
        .single();

      if (equipamentoError || !equipamento) {
        throw new Error(`Equipamento não encontrado - SmartCard: ${smartCardNormalizado}`);
      }

      // 3. Vincular equipamento ao cliente e assinatura
      const { error: vinculacaoError } = await supabase
        .from('equipamentos')
        .update({
          cliente_atual_id: novoCliente.id,
          assinatura_id: assinaturaId,
          status_aparelho: 'alugado'
        })
        .eq('id', equipamento.id);

      if (vinculacaoError) throw new Error(`Erro ao vincular equipamento: ${vinculacaoError.message}`);

      // 4. Criar cobrança recorrente com valores específicos do cliente
      const dataVencimento = new Date();
      dataVencimento.setMonth(dataVencimento.getMonth() + 1);
      dataVencimento.setDate(cliente.vencimento); // Vencimento conforme especificado

      const { error: cobrancaError } = await supabase
        .from('cobrancas')
        .insert({
          cliente_id: novoCliente.id,
          assinatura_id: assinaturaId,
          valor: cliente.valor, // Valor específico do cliente
          data_vencimento: dataVencimento.toISOString().split('T')[0],
          status: 'pendente',
          tipo: 'sky',
          observacoes: 'Cobrança automática gerada no cadastro em massa',
          user_id: user.id
        });

      if (cobrancaError) throw new Error(`Erro ao criar cobrança: ${cobrancaError.message}`);

      return { success: true, message: 'Cliente cadastrado com sucesso' };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  };

  const iniciarProcessamento = async () => {
    setIsProcessing(true);
    setProgress(0);
    setResults([]);

    const assinaturaId = '52c58251-d54f-4db2-9452-743bb2cf8776'; // ID da assinatura Carlos Henrique
    const total = clientes.length;

    for (let i = 0; i < total; i++) {
      const cliente = clientes[i];
      const resultado = await processarCliente(cliente, assinaturaId);
      
      setResults(prev => [...prev, {
        nome: cliente.nome,
        status: resultado.success ? 'success' : 'error',
        message: resultado.message
      }]);

      setProgress(((i + 1) / total) * 100);
    }

    setIsProcessing(false);
    toast({
      title: "Processamento concluído",
      description: `${results.filter(r => r.status === 'success').length} clientes cadastrados com sucesso`,
    });
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Cadastro em Massa - Clientes SKY</CardTitle>
        <CardDescription>
          Cadastro de {clientes.length} clientes para a assinatura Carlos Henrique de Souza Rosa (Código: 1526458038)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            Total de clientes para processar: {clientes.length}
          </p>
          <Button 
            onClick={iniciarProcessamento} 
            disabled={isProcessing}
            className="min-w-[150px]"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              'Iniciar Cadastro'
            )}
          </Button>
        </div>

        {isProcessing && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progresso</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold">Resultados do Processamento</h3>
            <ScrollArea className="h-[400px] border rounded-md p-4">
              {results.map((result, index) => (
                <div key={index} className="flex items-center gap-2 py-2 border-b last:border-b-0">
                  {result.status === 'success' ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium">{result.nome}</p>
                    <p className="text-sm text-muted-foreground">{result.message}</p>
                  </div>
                </div>
              ))}
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
};







