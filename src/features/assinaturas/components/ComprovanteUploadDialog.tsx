import { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Upload, X, FileImage, File } from 'lucide-react';
import { updateFatura, firebase } from '@/shared/lib/firebaseWrapper';
import { useAutoCustos } from '@/shared/hooks/useAutoCustos';
import { toast } from '@/shared/hooks/use-toast';
import { auth, storage } from '@/integrations/firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { onAuthStateChanged } from 'firebase/auth';

interface ComprovanteUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  faturaId: string;
  assinaturaId: string;
}

export const ComprovanteUploadDialog = ({ 
  open, 
  onOpenChange, 
  faturaId, 
  assinaturaId 
}: ComprovanteUploadDialogProps) => {
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { calcularCustosMensais } = useAutoCustos();

  // DEBUG: Monitor auth state changes
  useEffect(() => {
    console.log('🔄 Componente ComprovanteUploadDialog carregado');
    console.log('🔐 Estado inicial do auth:', auth.currentUser);
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('🔄 Auth state changed in ComprovanteUpload:', user?.email || 'no user');
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Logar o estado do usuário autenticado sempre que o componente renderizar
    setTimeout(() => {
      console.log('DEBUG AUTH (MONTAGEM):', auth.currentUser);
    }, 1000);
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      
      // Criar preview se for imagem
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => setPreview(e.target?.result as string);
        reader.readAsDataURL(file);
      } else {
        setPreview(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      // Logar o estado do usuário autenticado no momento do upload
      console.log('DEBUG AUTH (UPLOAD):', auth.currentUser);
      // DEBUG: Verificar todos os tipos de autenticação
      console.log('🔐 === DIAGNÓSTICO COMPLETO DE AUTENTICAÇÃO ===');
      console.log('auth.currentUser:', auth.currentUser);
      console.log('localStorage employee_session:', localStorage.getItem('employee_session'));
      
      let userId: string | null = null;
      let userType: 'owner' | 'employee' | 'none' = 'none';
      
      // 1. Verificar se é proprietário logado no Firebase Auth
      if (auth.currentUser) {
        userId = auth.currentUser.uid;
        userType = 'owner';
        console.log('✅ Usuário PROPRIETÁRIO autenticado:', userId);
      } 
      // 2. Verificar se é funcionário logado
      else {
        const employeeSession = localStorage.getItem('employee_session');
        if (employeeSession) {
          try {
            const employee = JSON.parse(employeeSession);
            if (employee.ownerId) {
              userId = employee.ownerId; // Usar o ownerId para o upload
              userType = 'employee';
              console.log('✅ FUNCIONÁRIO autenticado, usando ownerId:', userId);
            }
          } catch (error) {
            console.error('❌ Erro ao processar session do funcionário:', error);
          }
        }
      }

      // 3. Verificar se conseguimos identificar algum usuário
      if (!userId) {
        console.error('❌ ERRO: Nenhum usuário identificado!');
        console.error('❌ Firebase Auth:', auth.currentUser ? 'CONECTADO' : 'DESCONECTADO');
        console.error('❌ Employee Session:', localStorage.getItem('employee_session') ? 'EXISTE' : 'NÃO EXISTE');
        
        toast({
          title: "Erro de Autenticação",
          description: "Você precisa estar logado para enviar comprovantes. Faça login novamente.",
          variant: "destructive"
        });
        setUploading(false);
        return;
      }

      console.log(`✅ Upload autorizado para ${userType.toUpperCase()}: ${userId}`);

      // Nome do arquivo: user_id/assinatura_id/fatura_id/timestamp_filename
      const timestamp = Date.now();
      const fileName = `${userId}/${assinaturaId}/${faturaId}/${timestamp}_${selectedFile.name}`;
      
      console.log('📁 Nome do arquivo:', fileName);

      // Upload usando Firebase Storage
      const storageRef = ref(storage, `comprovantes/${fileName}`);
      const uploadResult = await uploadBytes(storageRef, selectedFile);
      const downloadURL = await getDownloadURL(uploadResult.ref);

      console.log('Upload realizado com sucesso:', downloadURL);

      // Marcar fatura como paga 
      await updateFatura(faturaId, { 
        status: 'pago',
        data_pagamento: new Date(),
        metodo_pagamento: 'comprovante'
      });

      // Calcular custos mensais após atualização
      await calcularCustosMensais();

      toast({
        title: "Comprovante enviado com sucesso!",
        description: "Fatura marcada como paga e custos mensais atualizados.",
      });
      
      onOpenChange(false);
      setSelectedFile(null);
      setPreview(null);
    } catch (error) {
      console.error('Erro no upload:', error);
      toast({
        title: "Erro no upload",
        description: "Erro ao fazer upload do comprovante",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload de Comprovante</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="comprovante">Selecionar Comprovante</Label>
            <Input
              ref={fileInputRef}
              id="comprovante"
              type="file"
              accept="image/*,.pdf,.doc,.docx"
              onChange={handleFileSelect}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Formatos aceitos: PDF, DOC, DOCX, PNG, JPG, JPEG
            </p>
          </div>

          {selectedFile && (
            <div className="border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium">Arquivo Selecionado</h4>
                <Button variant="ghost" size="sm" onClick={removeFile}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex items-center gap-3">
                {preview ? (
                  <img 
                    src={preview} 
                    alt="Preview" 
                    className="w-16 h-16 object-cover rounded border"
                  />
                ) : (
                  <div className="w-16 h-16 bg-muted rounded border flex items-center justify-center">
                    {selectedFile.type.includes('pdf') ? (
                      <File className="h-8 w-8 text-red-500" />
                    ) : (
                      <FileImage className="h-8 w-8 text-gray-500" />
                    )}
                  </div>
                )}
                
                <div>
                  <p className="text-sm font-medium">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleUpload} 
              disabled={!selectedFile || uploading}
            >
              {uploading ? (
                <>Enviando...</>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Enviar Comprovante
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};







