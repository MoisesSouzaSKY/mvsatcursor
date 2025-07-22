import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Upload, X, FileImage, File, CalendarIcon } from 'lucide-react';
import { Calendar } from '@/shared/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/shared/lib/utils';
import { auth, storage } from '@/integrations/firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface ComprovanteUploadMesAtualDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  faturaId: string;
  assinaturaId: string;
  onUpload: (dataPagamento: string, formaPagamento: string, darBaixa?: boolean) => void;
}

export const ComprovanteUploadMesAtualDialog = ({ 
  open, 
  onOpenChange, 
  faturaId, 
  assinaturaId,
  onUpload 
}: ComprovanteUploadMesAtualDialogProps) => {
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dataPagamento, setDataPagamento] = useState<Date>();
  const [formaPagamento, setFormaPagamento] = useState('');
  const [outrasFormas, setOutrasFormas] = useState('');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (!selectedFile || !dataPagamento || !formaPagamento) {
      alert('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    if (formaPagamento === 'outros' && !outrasFormas) {
      alert('Por favor, especifique a forma de pagamento');
      return;
    }

    setUploading(true);
    try {
      // DEBUG: Verificar todos os tipos de autenticação
      console.log('🔐 === DIAGNÓSTICO COMPLETO DE AUTENTICAÇÃO (Mês Atual) ===');
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
        alert('Você precisa estar logado para enviar comprovantes. Faça login novamente.');
        setUploading(false);
        return;
      }

      console.log(`✅ Upload autorizado para ${userType.toUpperCase()}: ${userId}`);

      // Nome do arquivo: user_id/assinatura_id/fatura_id/timestamp_filename
      const timestamp = Date.now();
      const fileName = `${userId}/${assinaturaId}/${faturaId}/${timestamp}_${selectedFile.name}`;
      
      console.log('📁 Nome do arquivo:', fileName);

      // NOVA ABORDAGEM: Usar API REST do Firebase Storage
      try {
        console.log('🔄 Tentativa 1: Upload via API REST do Firebase Storage...');
        
        // Obter token de autenticação
        const token = await auth.currentUser?.getIdToken();
        if (!token) {
          throw new Error('Token de autenticação não disponível');
        }

        // Fazer upload via API REST
        const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/mvsatimportado.appspot.com/o?name=comprovantes%2F${encodeURIComponent(fileName)}`;
        
        const response = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': selectedFile.type,
          },
          body: selectedFile
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const uploadResult = await response.json();
        console.log('✅ Upload via API REST bem-sucedido:', uploadResult);

        // Obter URL de download
        const downloadURL = `https://firebasestorage.googleapis.com/v0/b/mvsatimportado.appspot.com/o/comprovantes%2F${encodeURIComponent(fileName)}?alt=media`;

        console.log('Upload realizado com sucesso:', downloadURL);

      } catch (restError) {
        console.warn('⚠️ Upload via API REST falhou:', restError);
        console.log('🔄 Tentativa 2: Upload via SDK do Firebase...');

        // Fallback: tentar com o SDK original
        const storageRef = ref(storage, `comprovantes/${fileName}`);
        const uploadResult = await uploadBytes(storageRef, selectedFile);
        const downloadURL = await getDownloadURL(uploadResult.ref);

        console.log('✅ Upload via SDK bem-sucedido:', downloadURL);
      }

      const formaFinal = formaPagamento === 'outros' ? outrasFormas : formaPagamento;
      // Automaticamente dar baixa na fatura após upload
      const dataFormatted = dataPagamento ? format(dataPagamento, 'yyyy-MM-dd') : '';
      onUpload(dataFormatted, formaFinal, true); // true indica que deve dar baixa
      
      // Reset form
      setSelectedFile(null);
      setPreview(null);
      setDataPagamento(undefined);
      setFormaPagamento('');
      setOutrasFormas('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Erro no upload:', error);
      alert('Erro ao fazer upload do comprovante');
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
          <DialogTitle>Baixar Pagamento da Fatura</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="dataPagamento">Data do Pagamento *</Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <div
                  className={cn(
                    "flex items-center justify-between rounded-md border p-2 shadow-sm",
                    !dataPagamento && "text-muted-foreground"
                  )}
                >
                  <span className="text-sm font-medium">
                    {dataPagamento ? format(dataPagamento, "PPP", { locale: ptBR }) : <span>Selecione a data</span>}
                  </span>
                  <CalendarIcon className="h-4 w-4 opacity-50" />
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dataPagamento}
                  onSelect={setDataPagamento}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label htmlFor="formaPagamento">Forma de Pagamento *</Label>
            <Select value={formaPagamento} onValueChange={setFormaPagamento}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Selecione a forma de pagamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="loterica">Lotérica</SelectItem>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="internet_banking">Internet Banking</SelectItem>
                <SelectItem value="outros">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formaPagamento === 'outros' && (
            <div>
              <Label htmlFor="outrasFormas">Especificar forma de pagamento *</Label>
              <Input
                id="outrasFormas"
                type="text"
                value={outrasFormas}
                onChange={(e) => setOutrasFormas(e.target.value)}
                placeholder="Digite a forma de pagamento"
                className="mt-2"
              />
            </div>
          )}

          <div>
            <Label htmlFor="comprovante">Selecionar Comprovante *</Label>
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
              disabled={!selectedFile || !dataPagamento || !formaPagamento || uploading}
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







