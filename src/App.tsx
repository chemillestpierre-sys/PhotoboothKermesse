import {useCallback, useEffect, useRef, useState} from 'react';
import {AdminScreen} from './components/AdminScreen';
import {CameraScreen} from './components/CameraScreen';
import {HomeScreen} from './components/HomeScreen';
import {PinModal} from './components/PinModal';
import {PreviewScreen} from './components/PreviewScreen';
import {PrintSheet} from './components/PrintSheet';
import {incrementPhotoPrintCount, savePhoto} from './lib/db';
import {loadSettings, saveSettings} from './lib/settings';
import {
  AppScreen,
  PendingPhoto,
  PhotoRecord,
  PhotoboothSettings,
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

  const handlePrintFromPreview = useCallback(() => {
    setPendingPhoto((prev) => {
      if (!prev) return null;
      triggerBrowserPrint(prev.url);
      return {...prev, printCount: prev.printCount + 1};
    });
  }, [triggerBrowserPrint]);

  const adminPrintUrlRef = useRef<string | null>(null);

  const handlePrintFromAdmin = useCallback(
    async (record: PhotoRecord) => {
      if (adminPrintUrlRef.current) {
        URL.revokeObjectURL(adminPrintUrlRef.current);
      }
      const url = URL.createObjectURL(record.blob);
      adminPrintUrlRef.current = url;
      triggerBrowserPrint(url);
      await incrementPhotoPrintCount(record.id);
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
          onRetry={handleRetryPreview}
          onPrint={handlePrintFromPreview}
          onFinish={() => void handleFinishPreview()}
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

      <PrintSheet imageUrl={printImageUrl} />
    </>
  );
}
