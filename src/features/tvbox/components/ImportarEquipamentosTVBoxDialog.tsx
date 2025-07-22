import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Textarea } from '@/shared/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/components/ui/dialog';
import { useToast } from '@/shared/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useUserContext } from '@/shared/hooks/useUserContext';
import { firebase } from '@/shared/lib/firebaseWrapper';
import { Download, Upload, CheckCircle, Info, Monitor } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ImportarEquipamentosTVBoxDialogProps {
  onImportComplete: () => void;
}

export const ImportarEquipamentosTVBoxDialog = ({ onImportComplete }: ImportarEquipamentosTVBoxDialogProps) => {
  const { toast } = useToast();
  const { user, employee } = useAuth();
  const { userId } = useUserContext();
  
  const [open, setOpen] = useState(false);
  const [inputData, setInputData] = useState('');
  const [parsedData, setParsedData] = useState<string[][]>([]);
  const [hasHeader, setHasHeader] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: number;
    errors: Array<{ row: number; error: string; }>;
  } | null>(null);

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
    const headers = ['S/N', 'MAC', 'ID'];
    const example = ['SN123456789', '00:1A:2B:3C:4D:5E', 'TVBOX001'];
    
    // Create Excel workbook
    const ws = XLSX.utils.aoa_to_sheet([headers, example]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Equipamentos TV Box');
    
    // Download as Excel file
    XLSX.writeFile(wb, 'planilha_importacao_tvbox.xlsx');
  };

  const validateEquipment = (equipmentData: Record<string, string>) => {
    const errors: string[] = [];
    
    if (!equipmentData.serial_number?.trim()) {
      errors.push('S/N é obrigatório');
    }
    
    if (!equipmentData.mac_address?.trim()) {
      errors.push('MAC é obrigatório');
    }
    
    return errors;
  };

  const importEquipments = async () => {
    if (!userId || parsedData.length === 0) return;
    
    setIsProcessing(true);
    const errors: Array<{ row: number; error: string; }> = [];
    let successCount = 0;
    
    try {
      const dataToProcess = hasHeader ? parsedData.slice(1) : parsedData;
      
      for (let i = 0; i < dataToProcess.length; i++) {
        const row = dataToProcess[i];
        const rowNumber = hasHeader ? i + 2 : i + 1;
        
        if (row.length < 2) {
          errors.push({ row: rowNumber, error: 'Linha deve conter ao menos 2 colunas (S/N e MAC)' });
          continue;
        }
        
        const equipmentData = {
          serial_number: row[0],
          mac_address: row[1],
          id_aparelho: row[2] || '' // ID is optional
        };
        
        const validationErrors = validateEquipment(equipmentData);
        if (validationErrors.length > 0) {
          errors.push({ row: rowNumber, error: validationErrors.join(', ') });
          continue;
        }
        
        const insertData = {
          user_id: userId,
          serial_number: equipmentData.serial_number,
          mac_address: equipmentData.mac_address,
          id_aparelho: equipmentData.id_aparelho,
          atualizacao_feita: false,
          assinatura_id: null // Campo opcional - null em vez de string vazia
        };
        
        const { error } = await supabase
          .from('tvbox_equipamentos')
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

  const resetDialog = () => {
    setInputData('');
    setParsedData([]);
    setImportResult(null);
    setHasHeader(true);
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      setOpen(newOpen);
      if (!newOpen) resetDialog();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Monitor className="h-4 w-4 mr-2" />
          Importar por Planilha
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>📦 Importar Equipamentos TV Box</DialogTitle>
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
                <span>Importar Equipamentos TV Box</span>
              </CardTitle>
              <CardDescription>
                Importe rapidamente os equipamentos TV Box usando uma planilha Excel ou texto colado. Cada linha representa um equipamento. Os campos devem estar separados por vírgula (,) ou tabulação (TAB) e organizados em colunas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm font-medium mb-2">Campos obrigatórios:</p>
                  <ul className="text-sm space-y-1">
                    <li>• <strong>S/N</strong> (Número de Série)</li>
                    <li>• <strong>MAC</strong> (MAC Address)</li>
                  </ul>
                  <p className="text-sm font-medium mb-2 mt-3">Campos opcionais:</p>
                  <ul className="text-sm space-y-1">
                    <li>• <strong>ID</strong> (ID do Aparelho)</li>
                  </ul>
                </div>
                
                <Button variant="outline" onClick={downloadTemplate} className="w-full sm:w-auto">
                  <Download className="h-4 w-4 mr-2" />
                  Download Modelo Excel
                </Button>
                
                <div className="space-y-2">
                  <label htmlFor="file-upload-tvbox" className="text-sm font-medium">Upload da Planilha:</label>
                  <input
                    id="file-upload-tvbox"
                    name="file-upload-tvbox"
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileUpload}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Área de Input (Opcional) */}
          <Card>
            <CardHeader>
              <CardTitle>Cole os Dados (Alternativa)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                id="input-data-tvbox"
                name="input-data-tvbox"
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
                {isProcessing ? 'Importando...' : `Importar ${hasHeader ? parsedData.length - 1 : parsedData.length} Equipamento(s)`}
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







