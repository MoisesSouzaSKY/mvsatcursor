import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Upload, Eye, CheckCircle, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { useToast } from '@/shared/hooks/use-toast';
import { firebase } from '@/shared/lib/firebaseWrapper';
import * as XLSX from 'xlsx';

interface CobrancaMassa {
  nome: string;
  bairro: string;
  diaVencimento: number;
  valor: number;
  tipo: 'sky' | 'tvbox' | 'combo';
  cliente_id?: string;
  cliente_encontrado?: boolean;
}

interface Props {
  onCobrancasGeradas: () => void;
}

export const GerarCobrancasMassaDialog = ({ onCobrancasGeradas }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const [cobrancas, setCobrancas] = useState<CobrancaMassa[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

      const cobrancasProcessadas: CobrancaMassa[] = jsonData.map((row) => ({
        nome: String(row.Nome || row.nome || '').trim(),
        bairro: String(row.Bairro || row.bairro || '').trim(),
        diaVencimento: Number(row['Dia Vencimento'] || row.dia_vencimento || row.diaVencimento || 1),
        valor: Number(row.Valor || row.valor || 0),
        tipo: (row['Tipo de Cobrança'] || row.tipo || 'sky').toLowerCase() as 'sky' | 'tvbox' | 'combo'
      }));

      // Validar dados
      const cobrancasValidas = cobrancasProcessadas.filter(c => 
        c.nome && c.bairro && c.valor > 0 && c.diaVencimento >= 1 && c.diaVencimento <= 31
      );

      if (cobrancasValidas.length === 0) {
        toast({
          title: "Erro na planilha",
          description: "Não foram encontrados dados válidos na planilha.",
          variant: "destructive"
        });
        return;
      }

      setCobrancas(cobrancasValidas);
      toast({
        title: "Planilha carregada",
        description: `${cobrancasValidas.length} cobranças encontradas.`,
        variant: "default"
      });

    } catch (error) {
      console.error('Erro ao processar planilha:', error);
      toast({
        title: "Erro no upload",
        description: "Não foi possível processar a planilha.",
        variant: "destructive"
      });
    }
  };

  const buscarClientes = async () => {
    if (cobrancas.length === 0) return;

    setIsProcessing(true);
    try {
      const cobrancasAtualizadas = await Promise.all(
        cobrancas.map(async (cobranca) => {
          const { data, error } = await supabase
            .from('clientes')
            .select('id, nome, bairro')
            .ilike('nome', `%${cobranca.nome}%`)
            .ilike('bairro', `%${cobranca.bairro}%`)
            .limit(1)
            .single();

          if (error || !data) {
            return {
              ...cobranca,
              cliente_encontrado: false
            };
          }

          return {
            ...cobranca,
            cliente_id: data.id,
            cliente_encontrado: true
          };
        })
      );

      setCobrancas(cobrancasAtualizadas);
      setShowPreview(true);

      const encontrados = cobrancasAtualizadas.filter(c => c.cliente_encontrado).length;
      const naoEncontrados = cobrancasAtualizadas.length - encontrados;

      toast({
        title: "Busca concluída",
        description: `${encontrados} clientes encontrados, ${naoEncontrados} não localizados.`,
        variant: "default"
      });

    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
      toast({
        title: "Erro na busca",
        description: "Erro ao buscar clientes.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const gerarCobrancas = async () => {
    const cobrancasValidas = cobrancas.filter(c => c.cliente_encontrado && c.cliente_id);
    
    if (cobrancasValidas.length === 0) {
      toast({
        title: "Nenhuma cobrança válida",
        description: "Não há cobranças com clientes válidos para gerar.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    try {
      // Obter user_id do usuário atual
      const { data: { user } } = await firebase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Gerar data de referência (mês/ano atual)
      const hoje = new Date();
      const mesReferencia = `${String(hoje.getMonth() + 1).padStart(2, '0')}/${hoje.getFullYear()}`;

      const cobrancasInserir = cobrancasValidas.map(cobranca => {
        // Data de vencimento com o dia específico da planilha no mês atual
        const dataVencimento = new Date(hoje.getFullYear(), hoje.getMonth(), cobranca.diaVencimento);
        const dataVencimentoStr = dataVencimento.toISOString().split('T')[0];
        
        return {
          user_id: user.id,
          cliente_id: cobranca.cliente_id!,
          valor: cobranca.valor,
          tipo: cobranca.tipo,
          data_vencimento: dataVencimentoStr,
          status: 'pendente' as const,
          observacoes: `Cobrança gerada em massa - Referência: ${mesReferencia} - Vencimento dia ${cobranca.diaVencimento}`
        };
      });

      const { error } = await supabase
        .from('cobrancas')
        .insert(cobrancasInserir);

      if (error) {
        throw error;
      }

      toast({
        title: "Cobranças geradas",
        description: `${cobrancasValidas.length} cobranças foram criadas com sucesso.`,
        variant: "default"
      });

      // Resetar estado e fechar dialog
      setCobrancas([]);
      setShowPreview(false);
      setIsOpen(false);
      onCobrancasGeradas();

    } catch (error) {
      console.error('Erro ao gerar cobranças:', error);
      toast({
        title: "Erro ao gerar cobranças",
        description: "Não foi possível criar as cobranças.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadTemplate = () => {
    const template = [
      { Nome: 'João da Silva', Bairro: 'Jurunas', 'Dia Vencimento': 20, Valor: 130.00, 'Tipo de Cobrança': 'tvbox' },
      { Nome: 'Maria Oliveira', Bairro: 'Marituba', 'Dia Vencimento': 15, Valor: 160.00, 'Tipo de Cobrança': 'combo' },
      { Nome: 'Carlos Andrade', Bairro: 'Sacramenta', 'Dia Vencimento': 10, Valor: 120.00, 'Tipo de Cobrança': 'sky' }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template Cobranças");
    XLSX.writeFile(wb, "template_cobrancas_massa.xlsx");

    toast({
      title: "Template baixado",
      description: "Use este modelo para organizar seus dados.",
      variant: "default"
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload size={16} className="mr-2" />
          Gerar Cobranças em Massa
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerar Cobranças em Massa</DialogTitle>
        </DialogHeader>

        {!showPreview ? (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5" />
                  Upload de Planilha
                </CardTitle>
                <CardDescription>
                  Carregue uma planilha Excel com as colunas: Nome, Bairro, Dia Vencimento, Valor, Tipo de Cobrança
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button variant="outline" onClick={downloadTemplate} size="sm">
                    <FileSpreadsheet size={16} className="mr-2" />
                    Baixar Template
                  </Button>
                </div>
                
                <div>
                  <Label htmlFor="file-upload">Selecionar Planilha</Label>
                  <Input
                    id="file-upload"
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                    className="mt-1"
                  />
                </div>

                {cobrancas.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground mb-2">
                      {cobrancas.length} cobranças carregadas da planilha
                    </p>
                    <Button onClick={buscarClientes} disabled={isProcessing}>
                      <Eye size={16} className="mr-2" />
                      {isProcessing ? 'Buscando clientes...' : 'Pré-visualizar cobranças'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Instruções</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p>• <strong>Nome:</strong> Nome do cliente (deve corresponder ao nome cadastrado)</p>
                <p>• <strong>Bairro:</strong> Usado para identificação mais precisa do cliente</p>
                <p>• <strong>Dia Vencimento:</strong> Dia do mês para vencimento (1-31)</p>
                <p>• <strong>Valor:</strong> Valor da cobrança em reais</p>
                <p>• <strong>Tipo de Cobrança:</strong> sky, tvbox ou combo</p>
                <p>• As cobranças serão criadas para o mês atual com o dia especificado</p>
                <p>• Status inicial: "Pendente" até ser dado baixa</p>
                <p>• Cobranças recorrentes: Geradas automaticamente mensalmente quando pagas</p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Pré-visualização das Cobranças</h3>
              <Button variant="outline" onClick={() => setShowPreview(false)}>
                Voltar
              </Button>
            </div>

            <div className="max-h-96 overflow-y-auto border rounded-lg">
              <div className="grid gap-2 p-4">
                {cobrancas.map((cobranca, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {cobranca.cliente_encontrado ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-600" />
                        )}
                        <span className="font-medium">{cobranca.nome}</span>
                        <span className="text-sm text-muted-foreground">• {cobranca.bairro}</span>
                        <span className="text-sm text-muted-foreground">• Venc: dia {cobranca.diaVencimento}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{cobranca.tipo.toUpperCase()}</Badge>
                      <span className="font-medium">R$ {cobranca.valor.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                {cobrancas.filter(c => c.cliente_encontrado).length} de {cobrancas.length} clientes encontrados
              </div>
              <Button 
                onClick={gerarCobrancas} 
                disabled={isProcessing || cobrancas.filter(c => c.cliente_encontrado).length === 0}
              >
                {isProcessing ? 'Gerando...' : 'Confirmar Geração'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};







