import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { useToast } from '@/shared/hooks/use-toast';
import { Upload, Image, Check, X } from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';

interface FaviconConfigProps {
  onFaviconUpdate?: (newFaviconUrl: string) => void;
}

export const FaviconConfig = ({ onFaviconUpdate }: FaviconConfigProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [currentFavicon, setCurrentFavicon] = useState<string>('/favicon.ico');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Carregar favicon customizado salvo no localStorage
  useEffect(() => {
    const savedFavicon = localStorage.getItem('customFavicon');
    if (savedFavicon) {
      setCurrentFavicon(savedFavicon);
      updateFaviconInHead(savedFavicon);
    }
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    const isValidType = file.type === 'image/x-icon' || 
                       file.type === 'image/png' || 
                       file.type === 'image/vnd.microsoft.icon' ||
                       file.name.toLowerCase().endsWith('.ico') ||
                       file.name.toLowerCase().endsWith('.png');
    
    if (!isValidType) {
      toast({
        title: "Formato não suportado",
        description: "Por favor, selecione um arquivo .ico ou .png",
        variant: "destructive",
      });
      return;
    }

    // Validar tamanho do arquivo (máximo 500KB)
    if (file.size > 500 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O arquivo deve ter no máximo 500KB",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    
    // Criar preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    
    try {
      // Criar um FormData para simular o upload
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      // Simular delay de upload
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simular salvamento do arquivo
      // Na prática, você faria um upload real para o servidor
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        
        // Salvar no localStorage para simular persistência
        localStorage.setItem('customFavicon', base64);
        localStorage.setItem('customFaviconType', selectedFile.type);
        
        // Atualizar o favicon atual
        setCurrentFavicon(base64);
        
        // Atualizar o link no head da página
        updateFaviconInHead(base64);
        
        // Callback para notificar atualização
        onFaviconUpdate?.(base64);
        
        toast({
          title: "Favicon atualizado",
          description: "O favicon foi atualizado com sucesso!",
        });
        
        // Limpar seleção
        setSelectedFile(null);
        setPreviewUrl(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      };
      
      reader.readAsDataURL(selectedFile);
      
    } catch (error) {
      toast({
        title: "Erro no upload",
        description: "Ocorreu um erro ao fazer o upload do favicon",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const updateFaviconInHead = (newFaviconUrl: string) => {
    // Remover favicon existente
    const existingFavicon = document.querySelector('link[rel="icon"]');
    if (existingFavicon) {
      existingFavicon.remove();
    }

    // Adicionar novo favicon
    const link = document.createElement('link');
    link.rel = 'icon';
    link.href = newFaviconUrl;
    link.type = newFaviconUrl.includes('.png') ? 'image/png' : 'image/x-icon';
    document.head.appendChild(link);

    // Forçar atualização do favicon
    const timestamp = new Date().getTime();
    link.href = `${newFaviconUrl}?v=${timestamp}`;
  };

  const cancelSelection = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getFileTypeInfo = (type: string) => {
    if (type.includes('image/x-icon') || type.includes('image/vnd.microsoft.icon')) {
      return { label: 'ICO', color: 'bg-blue-100 text-blue-800' };
    } else if (type.includes('image/png')) {
      return { label: 'PNG', color: 'bg-green-100 text-green-800' };
    }
    return { label: 'Unknown', color: 'bg-gray-100 text-gray-800' };
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Image className="h-5 w-5" />
          <span>Favicon do Site</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Favicon atual */}
        <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <img 
              src={currentFavicon} 
              alt="Favicon atual" 
              className="w-8 h-8"
              onError={(e) => {
                e.currentTarget.src = '/favicon.ico';
              }}
            />
            <div>
              <p className="font-medium">Favicon Atual</p>
              <p className="text-sm text-gray-600">{currentFavicon}</p>
            </div>
          </div>
        </div>

        {/* Upload de arquivo */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="favicon-upload">Selecionar Novo Favicon</Label>
            <Input
              id="favicon-upload"
              type="file"
              accept=".ico,.png"
              onChange={handleFileSelect}
              ref={fileInputRef}
              className="mt-2"
            />
            <p className="text-sm text-gray-500 mt-1">
              Formatos aceitos: .ico, .png | Tamanho máximo: 500KB
            </p>
          </div>

          {/* Preview do arquivo selecionado */}
          {selectedFile && previewUrl && (
            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-start space-x-4">
                <img 
                  src={previewUrl} 
                  alt="Preview do favicon" 
                  className="w-16 h-16 border border-gray-300 rounded"
                />
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <p className="font-medium">{selectedFile.name}</p>
                    <Badge className={getFileTypeInfo(selectedFile.type).color}>
                      {getFileTypeInfo(selectedFile.type).label}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    Tamanho: {formatFileSize(selectedFile.size)}
                  </p>
                  <div className="flex space-x-2">
                    <Button
                      onClick={handleUpload}
                      disabled={isUploading}
                      size="sm"
                      className="flex items-center space-x-1"
                    >
                      {isUploading ? (
                        <>
                          <Upload className="h-4 w-4 animate-spin" />
                          <span>Enviando...</span>
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4" />
                          <span>Confirmar</span>
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={cancelSelection}
                      variant="outline"
                      size="sm"
                      className="flex items-center space-x-1"
                    >
                      <X className="h-4 w-4" />
                      <span>Cancelar</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Informações sobre tamanhos recomendados */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Tamanhos Recomendados</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li><strong>.ico:</strong> Múltiplos tamanhos embutidos (16x16 até 256x256)</li>
            <li><strong>.png:</strong> 32x32, 64x64 ou 128x128 (fallback para navegadores)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};







