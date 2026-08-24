import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getStorageInstance } from '../../config/database.config';

export interface UploadedFileInfo {
  storageUrl: string;
  storagePath: string;
  filename: string;
  mimeType: string;
  uploadedAt: Date;
}

function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export async function uploadFileToStorage(params: {
  folder: string;
  entityId: string;
  file: File;
}): Promise<UploadedFileInfo> {
  const { folder, entityId, file } = params;
  const storage = getStorageInstance();
  const safeName = sanitizeFilename(file.name || 'arquivo');
  const unique = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const storagePath = `${folder}/${entityId}/${unique}_${safeName}`;

  const storageRef = ref(storage, storagePath);
  const snapshot = await uploadBytes(storageRef, file, {
    contentType: file.type || 'application/octet-stream'
  });
  const storageUrl = await getDownloadURL(snapshot.ref);

  return {
    storageUrl,
    storagePath,
    filename: file.name,
    mimeType: file.type || 'application/octet-stream',
    uploadedAt: new Date()
  };
}
