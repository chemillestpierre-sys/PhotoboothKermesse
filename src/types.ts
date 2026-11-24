export type AppScreen = 'home' | 'camera' | 'preview' | 'admin';

export type CameraFacing = 'user' | 'environment';

export interface PhotoboothSettings {
  bannerText: string;
  bannerDate: string;
  countdownSeconds: number;
  previewTimeoutSeconds: number;
  otherTimeoutSeconds: number;
  mirrorEffect: boolean;
  cameraFacing: CameraFacing;
  adminPin: string;
}

export interface PhotoRecord {
  id: string;
  createdAt: number;
  blob: Blob;
  printCount: number;
}

export interface PendingPhoto {
  id: string;
  createdAt: number;
  blob: Blob;
  url: string;
  printCount: number;
}
