import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '@/integrations/firebase/config';

// Upload de arquivo para o Firebase Storage
export const uploadFile = async (
  file: File,
  bucket: string = 'comprovantes',
  fileName?: string
): Promise<{ data: { path: string; url: string } | null; error: any }> => {
  try {
    // Gerar nome único se não fornecido
    const finalFileName = fileName || `${Date.now()}-${file.name}`;
    
    // Criar referência do arquivo
    const fileRef = ref(storage, `${bucket}/${finalFileName}`);
    
    // Upload do arquivo
    const snapshot = await uploadBytes(fileRef, file);
    
    // Obter URL de download
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return {
      data: {
        path: snapshot.ref.fullPath,
        url: downloadURL
      },
      error: null
    };
  } catch (error) {
    console.error('Erro no upload:', error);
    return {
      data: null,
      error
    };
  }
};

// Download/obter URL de um arquivo
export const getFileUrl = async (
  path: string
): Promise<{ data: string | null; error: any }> => {
  try {
    const fileRef = ref(storage, path);
    const downloadURL = await getDownloadURL(fileRef);
    
    return {
      data: downloadURL,
      error: null
    };
  } catch (error) {
    console.error('Erro ao obter URL do arquivo:', error);
    return {
      data: null,
      error
    };
  }
};

// Deletar arquivo
export const deleteFile = async (
  path: string
): Promise<{ error: any }> => {
  try {
    const fileRef = ref(storage, path);
    await deleteObject(fileRef);
    
    return {
      error: null
    };
  } catch (error) {
    console.error('Erro ao deletar arquivo:', error);
    return {
      error
    };
  }
};

// Utilitário para upload de comprovantes de pagamento
export const uploadComprovante = async (
  file: File,
  cobrancaId: string
): Promise<{ data: { path: string; url: string } | null; error: any }> => {
  const fileName = `comprovante-${cobrancaId}-${Date.now()}.${file.name.split('.').pop()}`;
  return uploadFile(file, 'comprovantes', fileName);
};

// Utilitário para upload de logos da empresa
export const uploadLogo = async (
  file: File,
  empresaId: string
): Promise<{ data: { path: string; url: string } | null; error: any }> => {
  const fileName = `logo-${empresaId}-${Date.now()}.${file.name.split('.').pop()}`;
  return uploadFile(file, 'logos', fileName);
}; 