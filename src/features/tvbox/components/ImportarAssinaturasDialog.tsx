import { useState, useRef } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Upload, FileSpreadsheet, Download, Paperclip } from 'lucide-react';
import { useToast } from '@/shared/hooks/use-toast';
import { useUserContext } from '@/shared/hooks/useUserContext';
import { createTVBoxAssinatura } from '@/shared/lib/firebaseWrapper';

interface ImportarAssinaturasDialogProps {
  onImportComplete: () => void;
}

interface AssinaturaImport {
  nome: string;
  login: string;
  senha: string;
  data_renovacao: string;
}

export const ImportarAssinaturasDialog = ({ onImportComplete }: ImportarAssinaturasDialogProps) => {
  const { userId } = useUserContext();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [csvData, setCsvData] = useState('');
  const [importing, setImporting] = useState(false);
  const [previewData, setPreviewData] = useState<AssinaturaImport[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    // Criando um CSV com ponto e vírgula para melhor compatibilidade com Excel brasileiro
    const template = `Nome;Login;Senha;Data Renovacao
Assinatura Cliente 1;user001;senha123;11/07/2025
Assinatura Cliente 2;user002;senha456;15/08/2025
Assinatura Cliente 3;user003;senha789;20/12/2025
Assinatura Cliente 4;user004;senha101;25/09/2025
Assinatura Cliente 5;user005;senha202;30/11/2025`;
    
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'template_assinaturas_tvbox.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Template baixado",
      description: "Abra o arquivo CSV no Excel. Se as colunas não estiverem separadas, use 'Dados > Texto para Colunas' e selecione ';' como delimitador.",
    });
  };

  const parseCsvData = (csvText: string): AssinaturaImport[] => {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];

    // Detectar delimitador (vírgula ou ponto e vírgula)
    const firstLine = lines[0];
    const delimiter = firstLine.includes(';') ? ';' : ',';
    
    const headers = firstLine.split(delimiter).map(h => h.trim());
    const data: AssinaturaImport[] = [];

    // Função para converter data de dd/MM/yyyy para yyyy-MM-dd
    const convertDate = (dateStr: string): string => {
      if (!dateStr) return '';
      
      // Se já está no formato correto, retorna
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return dateStr;
      
      // Converte do formato dd/MM/yyyy para yyyy-MM-dd
      const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (match) {
        const [, day, month, year] = match;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      
      return dateStr; // Retorna como está se não conseguir converter
    };

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // Pular linhas vazias
      
      const values = line.split(delimiter).map(v => v.trim());
      console.log(`Linha ${i}:`, values);
      
      if (values.length >= 4) { // Nome, Login, senha, data_renovacao obrigatórios
        const nome = values[0] || '';
        const login = values[1] || '';
        const senha = values[2] || '';
        const dataOriginal = values[3] || '';
        const dataConvertida = convertDate(dataOriginal);
        
        console.log(`Processando: Nome="${nome}", Login="${login}", Senha="${senha}", Data Original="${dataOriginal}", Data Convertida="${dataConvertida}"`);
        
        const row: AssinaturaImport = {
          nome,
          login,
          senha,
          data_renovacao: dataConvertida
        };
        
        // Validar se todos os campos obrigatórios estão preenchidos
        if (row.nome && row.login && row.senha && row.data_renovacao) {
          data.push(row);
          console.log('Linha válida adicionada:', row);
        } else {
          console.log('Linha inválida ignorada:', { nome: row.nome, login: row.login, senha: row.senha, data_renovacao: row.data_renovacao, dataOriginal });
        }
      } else {
        console.log(`Linha ${i} tem apenas ${values.length} colunas, esperado 4 ou mais`);
      }
    }
    
    return data;
  };

  const handlePreview = () => {
    if (!csvData.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, insira os dados CSV.",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('CSV Data:', csvData);
      const parsed = parseCsvData(csvData);
      console.log('Parsed Data:', parsed);
      
      if (parsed.length === 0) {
        toast({
          title: "Erro",
          description: "Nenhum dado válido encontrado no CSV. Verifique o formato.",
          variant: "destructive",
        });
        return;
      }
      
      setPreviewData(parsed);
      toast({
        title: "Sucesso",
        description: `${parsed.length} assinaturas encontradas para importação.`,
      });
    } catch (error) {
      console.error('Erro ao processar CSV:', error);
      toast({
        title: "Erro",
        description: "Erro ao processar CSV. Verifique o formato dos dados.",
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setCsvData(content);
      toast({
        title: "Arquivo carregado",
        description: "Dados do arquivo foram carregados com sucesso.",
      });
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (previewData.length === 0) {
      toast({
        title: "Erro",
        description: "Nenhum dado para importar. Faça a prévia primeiro.",
        variant: "destructive",
      });
      return;
    }

    setImporting(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const item of previewData) {
        try {
          // Criar a assinatura
          const { error } = await createTVBoxAssinatura({
            nome: item.nome,
            login: item.login,
            senha: item.senha,
            data_renovacao: item.data_renovacao,
            status: 'ativa'
          });

          if (error) {
            console.error('Erro ao criar assinatura:', error);
            errorCount++;
            continue;
          }

          successCount++;
        } catch (error) {
          console.error('Erro ao processar item:', error);
          errorCount++;
        }
      }

      toast({
        title: "Importação Concluída",
        description: `${successCount} assinaturas importadas com sucesso. ${errorCount} erros encontrados.`,
        variant: errorCount > 0 ? "destructive" : "default",
      });

      if (successCount > 0) {
        onImportComplete();
        setOpen(false);
        setCsvData('');
        setPreviewData([]);
      }
    } catch (error) {
      console.error('Erro na importação:', error);
      toast({
        title: "Erro",
        description: "Erro durante a importação em massa.",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Importar por Planilha
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importação em Massa de Assinaturas</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Instruções */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Formato do CSV
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                O arquivo deve ser organizado em colunas (cada campo em uma coluna separada):
              </p>
              <div className="bg-gray-50 p-3 rounded text-sm">
                <strong>Nome | Login | Senha | Data Renovacao</strong>
              </div>
              <div className="bg-blue-50 p-3 rounded text-sm mt-2">
                <strong>💡 Dica:</strong> Baixe o template e abra no Excel. Se as colunas não estiverem separadas automaticamente, vá em <strong>Dados → Texto para Colunas</strong> e escolha ";" como delimitador.
              </div>
              <div className="text-sm">
                <strong>Campos obrigatórios:</strong>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Nome - Nome da assinatura</li>
                  <li>Login - Login da assinatura</li>
                  <li>Senha - Senha da assinatura</li>
                  <li>Data Renovacao - Data no formato dd/MM/yyyy (ex: 11/07/2025)</li>
                </ul>
              </div>
              <Button onClick={downloadTemplate} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Baixar Template
              </Button>
            </CardContent>
          </Card>

          {/* Área de entrada de dados */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Label htmlFor="csvData">Dados CSV</Label>
              <Button 
                onClick={() => fileInputRef.current?.click()} 
                variant="outline" 
                size="sm"
                className="flex items-center gap-2"
              >
                <Paperclip className="h-4 w-4" />
                Anexar Arquivo
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
            <Textarea
              id="csvData"
              placeholder="Cole aqui os dados em formato de colunas ou anexe um arquivo CSV...&#10;&#10;Exemplo:&#10;Nome;Login;Senha;Data Renovacao&#10;Assinatura 1;user001;senha123;11/07/2025&#10;Assinatura 2;user002;senha456;15/08/2025"
              value={csvData}
              onChange={(e) => setCsvData(e.target.value)}
              rows={8}
              className="font-mono text-sm"
            />
            <div className="flex gap-2">
              <Button onClick={handlePreview} variant="outline">
                Visualizar Prévia
              </Button>
              <Button 
                onClick={handleImport} 
                disabled={previewData.length === 0 || importing}
              >
                {importing ? 'Importando...' : `Importar ${previewData.length} Assinaturas`}
              </Button>
            </div>
          </div>

          {/* Prévia dos dados */}
          {previewData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Prévia dos Dados ({previewData.length} itens)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border p-2 text-left">Nome</th>
                        <th className="border p-2 text-left">Login</th>
                        <th className="border p-2 text-left">Senha</th>
                        <th className="border p-2 text-left">Data Renovação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.slice(0, 5).map((item, index) => (
                        <tr key={index}>
                          <td className="border p-2">{item.nome}</td>
                          <td className="border p-2">{item.login}</td>
                          <td className="border p-2">***</td>
                          <td className="border p-2">{item.data_renovacao}</td>
                        </tr>
                      ))}
                      {previewData.length > 5 && (
                        <tr>
                          <td colSpan={4} className="border p-2 text-center text-gray-500">
                            ... e mais {previewData.length - 5} itens
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};







