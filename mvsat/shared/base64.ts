export function isBase64String(value: string): boolean {
  if (!value) return false;
  const regex = /^(data:[\w-]+\/[\w\-+.]+;base64,)?[A-Za-z0-9+/=\r\n]+$/;
  return regex.test(value);
}

export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function base64ToBlob(base64DataUrl: string): Blob {
  const [header, data] = base64DataUrl.split(',');
  const mimeMatch = /data:(.*);base64/.exec(header || '');
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  const byteCharacters = atob(data || '');
  const byteArrays: number[] = [];
  for (let i = 0; i < byteCharacters.length; i++) {
    byteArrays.push(byteCharacters.charCodeAt(i));
  }
  return new Blob([new Uint8Array(byteArrays)], { type: mime });
}



