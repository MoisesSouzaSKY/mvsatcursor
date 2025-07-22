import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Loader2, Download, Eye, FileImage, File, Calendar, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { auth, storage } from '@/integrations/firebase/config';
import { ref, listAll, getDownloadURL } from 'firebase/storage';

interface ComprovanteViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  faturaId: string;
  assinaturaId: string;
}

export const ComprovanteViewDialog = ({ 
  open, 
  onOpenChange, 
  faturaId, 
  assinaturaId 
}: ComprovanteViewDialogProps) => {
  const [comprovantes, setComprovantes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedComprovante, setSelectedComprovante] = useState<any>(null);

  useEffect(() => {
    if (open) {
      loadComprovantes();
    }
  }, [open, faturaId, assinaturaId]);

  const loadComprovantes = async () => {
    setLoading(true);
    try {
      // Obter o user_id do usuário autenticado
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.error('Usuário não autenticado');
        setComprovantes([]);
        return;
      }

      // Listar arquivos no diretório usando Firebase Storage
      const folderRef = ref(storage, `comprovantes/${currentUser.uid}/${assinaturaId}/${faturaId}`);
      const result = await listAll(folderRef);

      const files = result.items.map(item => ({
        name: item.name,
        fullPath: item.fullPath,
        ref: item
      }));

      setComprovantes(files);
    } catch (error) {
      console.error('Erro ao carregar comprovantes:', error);
      setComprovantes([]);
    } finally {
      setLoading(false);
    }
  };

  const getComprovanteUrl = async (fileRef: any) => {
    try {
      const downloadURL = await getDownloadURL(fileRef);
      return downloadURL;
    } catch (error) {
      console.error('Erro ao obter URL do comprovante:', error);
      return null;
    }
  };

  const handleViewComprovante = async (comprovante: any) => {
    const url = await getComprovanteUrl(comprovante.ref);
    if (url) {
      setSelectedComprovante({ ...comprovante, url });
    }
  };

  const handleDownload = async (comprovante: any) => {
    const url = await getComprovanteUrl(comprovante.ref);
    if (url) {
      const link = document.createElement('a');
      link.href = url;
      link.download = comprovante.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const isImage = (fileName: string) => {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Comprovantes de Pagamento</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          {loading ? (
            <div className="text-center py-8">Carregando comprovantes...</div>
          ) : comprovantes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum comprovante encontrado
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {comprovantes.map((comprovante) => (
                <div key={comprovante.name} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-medium text-sm">{comprovante.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(comprovante.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleViewComprovante(comprovante)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Visualizar
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDownload(comprovante)}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal de visualização */}
        {selectedComprovante && (
          <Dialog open={!!selectedComprovante} onOpenChange={() => setSelectedComprovante(null)}>
            <DialogContent className="sm:max-w-4xl max-h-[90vh]">
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  {selectedComprovante.name}
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setSelectedComprovante(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </DialogTitle>
              </DialogHeader>
              
              <div className="flex justify-center">
                {isImage(selectedComprovante.name) ? (
                  <img 
                    src={selectedComprovante.url} 
                    alt="Comprovante"
                    className="max-w-full max-h-[60vh] object-contain"
                  />
                ) : (
                  <iframe 
                    src={selectedComprovante.url}
                    className="w-full h-[60vh] border"
                    title="Comprovante"
                  />
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
};







