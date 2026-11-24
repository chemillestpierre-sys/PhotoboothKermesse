import {PhotoboothSettings} from '../types';

const SETTINGS_KEY = 'kermesse_photobooth_settings_v2';
const LEGACY_SETTINGS_KEY = 'kermesse_photobooth_settings_v1';

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
    cameraFacing: 'environment',
    cameraDeviceId: '',
    photoOrientation: 'landscape',
    adminPin: '1234',
  };
}

export function loadSettings(): PhotoboothSettings {
  const defaults = getDefaultSettings();
  try {
    const rawV2 = window.localStorage.getItem(SETTINGS_KEY);
    if (rawV2) {
      const parsed = JSON.parse(rawV2) as Partial<PhotoboothSettings>;
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
          parsed.countdownSeconds >= 0 &&
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
        cameraFacing:
          parsed.cameraFacing === 'user' ? 'user' : 'environment',
        cameraDeviceId:
          typeof parsed.cameraDeviceId === 'string'
            ? parsed.cameraDeviceId
            : '',
        photoOrientation:
          parsed.photoOrientation === 'portrait' ? 'portrait' : 'landscape',
        adminPin:
          typeof parsed.adminPin === 'string' &&
          /^\d{4,8}$/.test(parsed.adminPin)
            ? parsed.adminPin
            : defaults.adminPin,
      };
    }

    // Migrate non-camera preferences from v1 while switching default camera to rear ('environment')
    const rawV1 = window.localStorage.getItem(LEGACY_SETTINGS_KEY);
    if (rawV1) {
      const parsed = JSON.parse(rawV1) as Partial<PhotoboothSettings>;
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
          parsed.countdownSeconds >= 0 &&
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
        cameraFacing: 'environment',
        cameraDeviceId: '',
        photoOrientation: 'landscape',
        adminPin:
          typeof parsed.adminPin === 'string' &&
          /^\d{4,8}$/.test(parsed.adminPin)
            ? parsed.adminPin
            : defaults.adminPin,
      };
    }

    return defaults;
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
