import { useState, useEffect } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Textarea } from '@/shared/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Label } from '@/shared/components/ui/label';
import { useToast } from '@/shared/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { firebase } from '@/shared/lib/firebaseWrapper';
import { Download, Upload, CheckCircle, Info, Package, LinkIcon } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ImportarEquipamentosDialogProps {
  onImportComplete: () => void;
}

interface Assinatura {
  id: string;
  plano: string;
  codigo_assinatura: string | null;
  observacoes: string | null;
  clientes: {
    nome: string;
  } | null;
}

export const ImportarEquipamentosDialog = ({ onImportComplete }: ImportarEquipamentosDialogProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [open, setOpen] = useState(false);
  const [inputData, setInputData] = useState('');
  const [parsedData, setParsedData] = useState<string[][]>([]);
  const [hasHeader, setHasHeader] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedAssinaturaId, setSelectedAssinaturaId] = useState<string>('');
  const [assinaturas, setAssinaturas] = useState<Assinatura[]>([]);
  const [isLoadingAssinaturas, setIsLoadingAssinaturas] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: number;
    errors: Array<{ row: number; error: string; }>;
  } | null>(null);

  // Carregar assinaturas disponíveis
  useEffect(() => {
    const loadAssinaturas = async () => {
      if (!user || !open) return;
      
      setIsLoadingAssinaturas(true);
      try {
        const { data, error } = await supabase
          .from('assinaturas')
          .select(`
            id,
            plano,
            codigo_assinatura,
            observacoes,
            clientes (
              nome
            )
          `)
          .eq('user_id', user.id)
          .eq('status', 'ativa')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Erro ao carregar assinaturas:', error);
          toast({
            title: "Erro",
            description: "Erro ao carregar assinaturas disponíveis.",
            variant: "destructive",
          });
        } else {
          setAssinaturas(data || []);
        }
      } catch (error) {
        console.error('Erro ao carregar assinaturas:', error);
      } finally {
        setIsLoadingAssinaturas(false);
      }
    };

    loadAssinaturas();
  }, [user, open]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result;
      if (file.name.endsWith('.csv')) {
        const text = data as string;
        setInputData(text);
        parseData(text);
      } else {
        // Handle Excel files
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const csvData = XLSX.utils.sheet_to_csv(worksheet);
        setInputData(csvData);
        parseData(csvData);
      }
    };
    
    if (file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  };

  const parseData = (data?: string) => {
    const textData = data || inputData;
    if (!textData.trim()) {
      setParsedData([]);
      return;
    }

    const lines = textData.trim().split('\n');
    const hasComma = lines[0].includes(',');
    const hasTab = lines[0].includes('\t');
    
    let separator = hasTab ? '\t' : (hasComma ? ',' : '\t');
    
    const parsed = lines.map(line => 
      line.split(separator).map(cell => cell.trim().replace(/^["']|["']$/g, ''))
    );
    
    setParsedData(parsed);
  };

  const parseInputData = () => parseData();

  const downloadTemplate = () => {
    const headers = ['NDS', 'SMART CARD'];
    const example = ['001221762261', 'CE0A012557599583B'];
    
    // Create Excel workbook
    const ws = XLSX.utils.aoa_to_sheet([headers, example]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Equipamentos');
    
    // Download as Excel file
    XLSX.writeFile(wb, 'planilha_importacao_nds_smartcard.xlsx');
  };

  const validateEquipment = (equipmentData: Record<string, string>) => {
    const errors: string[] = [];
    
    if (!equipmentData.nds?.trim()) {
      errors.push('NDS é obrigatório');
    }
    
    if (!equipmentData.smart_card?.trim()) {
      errors.push('Smart Card é obrigatório');
    }
    
    return errors;
  };

  const importEquipments = async () => {
    if (!user || parsedData.length === 0) return;
    
    setIsProcessing(true);
    const errors: Array<{ row: number; error: string; }> = [];
    let successCount = 0;
    
    try {
      const dataToProcess = hasHeader ? parsedData.slice(1) : parsedData;
      
      for (let i = 0; i < dataToProcess.length; i++) {
        const row = dataToProcess[i];
        const rowNumber = hasHeader ? i + 2 : i + 1;
        
        if (row.length < 2) {
          errors.push({ row: rowNumber, error: 'Linha deve conter ao menos 2 colunas (NDS e Smart Card)' });
          continue;
        }
        
        const equipmentData = {
          nds: row[0],
          smart_card: row[1]
        };
        
        const validationErrors = validateEquipment(equipmentData);
        if (validationErrors.length > 0) {
          errors.push({ row: rowNumber, error: validationErrors.join(', ') });
          continue;
        }
        
        // Buscar cliente_id se uma assinatura foi selecionada
        let clienteId = null;
        if (selectedAssinaturaId && selectedAssinaturaId !== 'none') {
          clienteId = await getClienteIdFromAssinatura(selectedAssinaturaId);
        }

        const insertData = {
          user_id: user.id,
          numero_nds: equipmentData.nds,
          smart_card: equipmentData.smart_card,
          status_aparelho: (selectedAssinaturaId && selectedAssinaturaId !== 'none') ? 'alugado' : 'disponivel',
          assinatura_id: (selectedAssinaturaId && selectedAssinaturaId !== 'none') ? selectedAssinaturaId : null,
          cliente_atual_id: clienteId
        };
        
        const { error } = await supabase
          .from('equipamentos')
          .insert(insertData);
        
        if (error) {
          errors.push({ row: rowNumber, error: error.message });
        } else {
          successCount++;
        }
      }
      
      setImportResult({ success: successCount, errors });
      
      if (successCount > 0) {
        toast({
          title: "Importação concluída",
          description: `${successCount} equipamento(s) importado(s) com sucesso!`,
        });
        onImportComplete();
      }
      
      if (errors.length > 0) {
        toast({
          title: "Alguns erros encontrados",
          description: `${errors.length} erro(s) durante a importação.`,
          variant: "destructive",
        });
      }
      
    } catch (error: any) {
      console.error('Erro na importação:', error);
      toast({
        title: "Erro na importação",
        description: "Erro inesperado durante a importação.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Função para obter cliente_id da assinatura
  const getClienteIdFromAssinatura = async (assinaturaId: string) => {
    try {
      const { data } = await supabase
        .from('assinaturas')
        .select('cliente_id')
        .eq('id', assinaturaId)
        .single();
      
      return data?.cliente_id || null;
    } catch (error) {
      console.error('Erro ao buscar cliente da assinatura:', error);
      return null;
    }
  };

  const resetDialog = () => {
    setInputData('');
    setParsedData([]);
    setImportResult(null);
    setHasHeader(true);
    setSelectedAssinaturaId('none');
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      setOpen(newOpen);
      if (!newOpen) resetDialog();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Package className="h-4 w-4 mr-2" />
          Importar Equipamentos
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>📦 Importar Equipamentos</DialogTitle>
          <DialogDescription>
            Importação em massa via planilha ou texto
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Instruções */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Info className="h-5 w-5" />
                <span>Importar Equipamentos</span>
              </CardTitle>
              <CardDescription>
                Importe rapidamente os equipamentos da sua base de dados usando uma planilha Excel ou texto colado. Cada linha representa um equipamento. Os campos devem estar separados por vírgula (,) ou tabulação (TAB) e organizados em colunas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm font-medium mb-2">Campos obrigatórios:</p>
                  <ul className="text-sm space-y-1">
                    <li>• <strong>NDS</strong></li>
                    <li>• <strong>SMART CARD</strong></li>
                  </ul>
                </div>
                
                <Button variant="outline" onClick={downloadTemplate} className="w-full sm:w-auto">
                  <Download className="h-4 w-4 mr-2" />
                  Download Modelo Excel
                </Button>
                
                <div className="space-y-2">
                  <label htmlFor="file-upload-equipamentos" className="text-sm font-medium">Upload da Planilha:</label>
                  <input
                    id="file-upload-equipamentos"
                    name="file-upload-equipamentos"
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileUpload}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Vinculação com Assinatura (Opcional) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <LinkIcon className="h-5 w-5" />
                <span>Vincular com Assinatura (Opcional)</span>
              </CardTitle>
              <CardDescription>
                Selecione uma assinatura para vincular automaticamente todos os equipamentos importados. 
                Deixe em branco para importar como "disponível".
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="assinatura-select">Assinatura de Destino</Label>
                <Select 
                  value={selectedAssinaturaId} 
                  onValueChange={setSelectedAssinaturaId}
                  disabled={isLoadingAssinaturas}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingAssinaturas ? "Carregando..." : "Selecionar assinatura (opcional)"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma (equipamentos disponíveis)</SelectItem>
                    {assinaturas.map((assinatura) => {
                      // Extrair nome das observações se não há cliente vinculado
                      let nomeExibicao = assinatura.clientes?.nome;
                      
                      if (!nomeExibicao && assinatura.observacoes) {
                        try {
                          const observacoesObj = JSON.parse(assinatura.observacoes);
                          nomeExibicao = observacoesObj.nome_completo;
                        } catch (error) {
                          console.log('Erro ao parsear observações:', error);
                        }
                      }
                      
                      return (
                        <SelectItem key={assinatura.id} value={assinatura.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {nomeExibicao || `Assinatura ${assinatura.codigo_assinatura || 'S/N'}`} - {assinatura.plano}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              Código: {assinatura.codigo_assinatura || 'Sem código'}
                            </span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              
              {selectedAssinaturaId && selectedAssinaturaId !== 'none' && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>📌 Atenção:</strong> Todos os equipamentos importados serão automaticamente vinculados 
                    à assinatura selecionada e marcados como "alugado".
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Área de Input (Alternativa) */}
          <Card>
            <CardHeader>
              <CardTitle>Cole os Dados (Alternativa)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Cole aqui os dados copiados da planilha…"
                value={inputData}
                onChange={(e) => setInputData(e.target.value)}
                rows={6}
                className="font-mono text-sm"
              />
              
              <div className="flex space-x-4">
                <Button onClick={parseInputData} disabled={!inputData.trim()}>
                  Processar Dados
                </Button>
                
                {parsedData.length > 0 && (
                  <span className="text-sm text-muted-foreground self-center">
                    {hasHeader ? parsedData.length - 1 : parsedData.length} equipamento(s) detectado(s)
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Importação automática quando dados são processados */}
          {parsedData.length > 0 && (
            <div className="mt-4">
              <Button 
                onClick={importEquipments} 
                disabled={isProcessing}
                size="lg"
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                {isProcessing ? 'Importando...' : `Importar ${hasHeader ? parsedData.length - 1 : parsedData.length} Equipamento(s)${(selectedAssinaturaId && selectedAssinaturaId !== 'none') ? ' e Vincular' : ''}`}
              </Button>
            </div>
          )}

          {/* Resultado da Importação */}
          {importResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>Resultado da Importação</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      {importResult.success} Sucesso
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="destructive">
                      {importResult.errors.length} Erros
                    </Badge>
                  </div>
                </div>
                
                {importResult.errors.length > 0 && (
                  <div>
                    <strong>Erros encontrados:</strong>
                    <div className="mt-2 p-3 bg-red-50 rounded-md max-h-32 overflow-auto">
                      {importResult.errors.map((error, i) => (
                        <div key={i} className="text-sm text-red-700">
                          Linha {error.row}: {error.error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};







