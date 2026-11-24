import JSZip from 'jszip';
import {PhotoRecord} from '../types';

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function formatPhotoFilename(createdAt: number): string {
  const d = new Date(createdAt);
  const year = d.getFullYear();
  const month = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  const hours = pad2(d.getHours());
  const minutes = pad2(d.getMinutes());
  const seconds = pad2(d.getSeconds());
  return `${year}-${month}-${day}_${hours}h${minutes}m${seconds}`;
}

export async function exportPhotosAsZip(photos: PhotoRecord[]): Promise<void> {
  const zip = new JSZip();
  const usedNames = new Map<string, number>();

  for (const photo of photos) {
    const base = formatPhotoFilename(photo.createdAt);
    const count = usedNames.get(base) ?? 0;
    usedNames.set(base, count + 1);
    const filename = count === 0 ? `${base}.jpg` : `${base}_${count + 1}.jpg`;
    zip.file(filename, photo.blob);
  }

  const content = await zip.generateAsync({
    type: 'blob',
    compression: 'STORE', // JPEG is already compressed; STORE is instant on tablets
  });

  const now = new Date();
  const zipName = `photobooth-kermesse_${now.getFullYear()}-${pad2(
    now.getMonth() + 1,
  )}-${pad2(now.getDate())}.zip`;

  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = zipName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}
