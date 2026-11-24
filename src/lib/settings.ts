import {PhotoboothSettings} from '../types';

const SETTINGS_KEY = 'kermesse_photobooth_settings_v1';

export function formatFrenchDate(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function getDefaultSettings(): PhotoboothSettings {
  return {
    bannerText: 'Kermesse – École Saint-Pierre – Chemillé-en-Anjou',
    bannerDate: formatFrenchDate(new Date()),
    countdownSeconds: 3,
    previewTimeoutSeconds: 120,
    otherTimeoutSeconds: 30,
    mirrorEffect: true,
    cameraFacing: 'user',
    adminPin: '1234',
  };
}

export function loadSettings(): PhotoboothSettings {
  const defaults = getDefaultSettings();
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<PhotoboothSettings>;
    return {
      bannerText:
        typeof parsed.bannerText === 'string'
          ? parsed.bannerText
          : defaults.bannerText,
      bannerDate:
        typeof parsed.bannerDate === 'string'
          ? parsed.bannerDate
          : defaults.bannerDate,
      countdownSeconds:
        typeof parsed.countdownSeconds === 'number' &&
        parsed.countdownSeconds >= 1 &&
        parsed.countdownSeconds <= 15
          ? parsed.countdownSeconds
          : defaults.countdownSeconds,
      previewTimeoutSeconds:
        typeof parsed.previewTimeoutSeconds === 'number' &&
        parsed.previewTimeoutSeconds >= 10 &&
        parsed.previewTimeoutSeconds <= 600
          ? parsed.previewTimeoutSeconds
          : defaults.previewTimeoutSeconds,
      otherTimeoutSeconds:
        typeof parsed.otherTimeoutSeconds === 'number' &&
        parsed.otherTimeoutSeconds >= 10 &&
        parsed.otherTimeoutSeconds <= 300
          ? parsed.otherTimeoutSeconds
          : defaults.otherTimeoutSeconds,
      mirrorEffect:
        typeof parsed.mirrorEffect === 'boolean'
          ? parsed.mirrorEffect
          : defaults.mirrorEffect,
      cameraFacing:
        parsed.cameraFacing === 'environment' ? 'environment' : 'user',
      adminPin:
        typeof parsed.adminPin === 'string' && /^\d{4,8}$/.test(parsed.adminPin)
          ? parsed.adminPin
          : defaults.adminPin,
    };
  } catch {
    return defaults;
  }
}

export function saveSettings(settings: PhotoboothSettings): void {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage quota issues on settings
  }
}
