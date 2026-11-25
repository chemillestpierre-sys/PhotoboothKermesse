import {useCallback, useEffect, useRef, useState} from 'react';
import {AdminScreen} from './components/AdminScreen';
import {CameraScreen} from './components/CameraScreen';
import {HomeScreen} from './components/HomeScreen';
import {PinModal} from './components/PinModal';
import {PreviewScreen} from './components/PreviewScreen';
import {PrintSheet} from './components/PrintSheet';
import {composeMiniatures4Blob} from './lib/canvas';
import {incrementPhotoPrintCount, savePhoto} from './lib/db';
import {loadSettings, saveSettings} from './lib/settings';
import {
  AppScreen,
  PendingPhoto,
  PhotoRecord,
  PhotoboothSettings,
  PrintFormat,
} from './types';

function createPhotoId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `photo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('home');
  const [settings, setSettings] = useState<PhotoboothSettings>(() =>
    loadSettings(),
  );
  const [pendingPhoto, setPendingPhoto] = useState<PendingPhoto | null>(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [printImageUrl, setPrintImageUrl] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const pendingPhotoRef = useRef<PendingPhoto | null>(null);
  pendingPhotoRef.current = pendingPhoto;

  const revokePendingPhoto = useCallback(() => {
    setPendingPhoto((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev.url);
      }
      return null;
    });
  }, []);

  const handleUpdateSettings = useCallback((next: PhotoboothSettings) => {
    setSettings(next);
    saveSettings(next);
  }, []);

  const handleCaptured = useCallback((blob: Blob) => {
    const url = URL.createObjectURL(blob);
    setPendingPhoto({
      id: createPhotoId(),
      createdAt: Date.now(),
      blob,
      url,
      printCount: 0,
      miniaturesPrintCount: 0,
      shareCount: 0,
    });
    setScreen('preview');
  }, []);

  const handleFinishPreview = useCallback(async () => {
    const current = pendingPhotoRef.current;
    if (current) {
      await savePhoto({
        id: current.id,
        createdAt: current.createdAt,
        blob: current.blob,
        printCount: current.printCount,
        miniaturesPrintCount: current.miniaturesPrintCount,
        shareCount: current.shareCount,
      });
      revokePendingPhoto();
    }
    setScreen('home');
  }, [revokePendingPhoto]);

  const handleRetryPreview = useCallback(() => {
    revokePendingPhoto();
    setScreen('camera');
  }, [revokePendingPhoto]);

  const triggerBrowserPrint = useCallback((url: string) => {
    setPrintImageUrl(url);
    window.requestAnimationFrame(() => {
      window.setTimeout(() => {
        window.print();
      }, 80);
    });
  }, []);

  const handlePrintFromPreview = useCallback(
    (format: PrintFormat, url: string) => {
      triggerBrowserPrint(url);
      setPendingPhoto((prev) => {
        if (!prev) return null;
        if (format === 'miniatures4') {
          return {
            ...prev,
            miniaturesPrintCount: prev.miniaturesPrintCount + 1,
          };
        }
        return {...prev, printCount: prev.printCount + 1};
      });
    },
    [triggerBrowserPrint],
  );

  const handleSharedFromPreview = useCallback(() => {
    setPendingPhoto((prev) => {
      if (!prev) return null;
      return {...prev, shareCount: prev.shareCount + 1};
    });
  }, []);

  const adminPrintUrlRef = useRef<string | null>(null);

  const handlePrintFromAdmin = useCallback(
    async (record: PhotoRecord, format: PrintFormat = 'single') => {
      const blobToPrint =
        format === 'miniatures4'
          ? await composeMiniatures4Blob(record.blob)
          : record.blob;

      if (adminPrintUrlRef.current) {
        URL.revokeObjectURL(adminPrintUrlRef.current);
      }
      const url = URL.createObjectURL(blobToPrint);
      adminPrintUrlRef.current = url;
      triggerBrowserPrint(url);
      await incrementPhotoPrintCount(record.id, format);
    },
    [triggerBrowserPrint],
  );

  // Inactivity timer for preview (default 120s -> save & go home) and other screens (default 30s -> go home)
  const inactivityTimerRef = useRef<number | null>(null);

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current !== null) {
      window.clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }

    if (isBusy) return;

    // On home screen without PIN modal, already at home
    if (screen === 'home' && !showPinModal) return;

    const timeoutSeconds =
      screen === 'preview'
        ? settings.previewTimeoutSeconds
        : settings.otherTimeoutSeconds;

    inactivityTimerRef.current = window.setTimeout(() => {
      if (showPinModal) {
        setShowPinModal(false);
        return;
      }
      if (screen === 'preview') {
        void handleFinishPreview();
        return;
      }
      if (screen === 'camera' || screen === 'admin') {
        revokePendingPhoto();
        setScreen('home');
      }
    }, timeoutSeconds * 1000);
  }, [
    handleFinishPreview,
    isBusy,
    revokePendingPhoto,
    screen,
    settings.otherTimeoutSeconds,
    settings.previewTimeoutSeconds,
    showPinModal,
  ]);

  useEffect(() => {
    resetInactivityTimer();

    const events: (keyof WindowEventMap)[] = [
      'pointerdown',
      'touchstart',
      'keydown',
      'scroll',
    ];
    const onActivity = () => resetInactivityTimer();

    events.forEach((evt) =>
      window.addEventListener(evt, onActivity, {passive: true}),
    );

    return () => {
      if (inactivityTimerRef.current !== null) {
        window.clearTimeout(inactivityTimerRef.current);
      }
      events.forEach((evt) => window.removeEventListener(evt, onActivity));
    };
  }, [resetInactivityTimer]);

  return (
    <>
      {screen === 'home' && (
        <HomeScreen
          onStart={() => setScreen('camera')}
          onAdminTrigger={() => setShowPinModal(true)}
        />
      )}

      {screen === 'camera' && (
        <CameraScreen
          settings={settings}
          onBack={() => setScreen('home')}
          onCaptured={handleCaptured}
          onBusyChange={setIsBusy}
        />
      )}

      {screen === 'preview' && pendingPhoto && (
        <PreviewScreen
          photo={pendingPhoto}
          defaultFormat={settings.defaultPhotoFormat}
          onRetry={handleRetryPreview}
          onPrint={handlePrintFromPreview}
          onShared={handleSharedFromPreview}
          onFinish={() => void handleFinishPreview()}
          onBusyChange={setIsBusy}
        />
      )}

      {screen === 'admin' && (
        <AdminScreen
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onPrintPhoto={handlePrintFromAdmin}
          onClose={() => setScreen('home')}
          onBusyChange={setIsBusy}
        />
      )}

      {showPinModal && (
        <PinModal
          expectedPin={settings.adminPin}
          onSuccess={() => {
            setShowPinModal(false);
            setScreen('admin');
          }}
          onCancel={() => setShowPinModal(false)}
        />
      )}

      <PrintSheet
        imageUrl={printImageUrl}
        orientation={settings.photoOrientation}
      />
    </>
  );
}
