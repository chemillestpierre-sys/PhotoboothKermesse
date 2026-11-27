export type AppScreen = 'home' | 'camera' | 'preview' | 'admin';

export type CameraFacing = 'user' | 'environment';

export type PhotoOrientation = 'landscape' | 'portrait';

export type PrintFormat = 'single' | 'miniatures4';

export type CaptureMode = 'classic' | 'selfie';

export interface PhotoboothSettings {
  bannerText: string;
  bannerDate: string;
  countdownSeconds: number;
  previewTimeoutSeconds: number;
  otherTimeoutSeconds: number;
  captureMode: CaptureMode;
  cameraFacing: CameraFacing;
  cameraDeviceId: string;
  selfieCameraDeviceId: string;
  photoOrientation: PhotoOrientation;
  defaultPhotoFormat: PrintFormat;
  adminPin: string;
}

export interface PhotoRecord {
  id: string;
  createdAt: number;
  blob: Blob;
  printCount: number;
  miniaturesPrintCount?: number;
  shareCount?: number;
}

export interface PendingPhoto {
  id: string;
  createdAt: number;
  blob: Blob;
  url: string;
  printCount: number;
  miniaturesPrintCount: number;
  shareCount: number;
}
