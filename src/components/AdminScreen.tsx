import {
  Archive,
  ArrowLeft,
  Camera,
  Check,
  CheckCircle2,
  Images,
  LayoutGrid,
  Minus,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  Settings,
  Smile,
  Smartphone,
  Square,
  Trash2,
  WifiOff,
  X,
} from 'lucide-react';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useOfflineReady, usePWAInstall} from '../hooks/usePWAInstall';
import {
  clearAllPhotos,
  deletePhoto,
  getAllPhotos,
} from '../lib/db';
import {formatFrenchDate, getDefaultSettings} from '../lib/settings';
import {exportPhotosAsZip} from '../lib/zipExport';
import {
  CaptureMode,
  PhotoRecord,
  PhotoboothSettings,
  PrintFormat,
} from '../types';
import {PWAInstallButton} from './PWAInstallButton';

interface AdminScreenProps {
  settings: PhotoboothSettings;
  onUpdateSettings: (next: PhotoboothSettings) => void;
  onPrintPhoto: (photo: PhotoRecord, format: PrintFormat) => Promise<void>;
  onClose: () => void;
  onBusyChange?: (busy: boolean) => void;
}

interface PhotoWithUrl extends PhotoRecord {
  url: string;
}

export const AdminScreen: React.FC<AdminScreenProps> = ({
  settings,
  onUpdateSettings,
  onPrintPhoto,
  onClose,
  onBusyChange,
}) => {
  const [activeTab, setActiveTab] = useState<'gallery' | 'settings'>('gallery');
  const [photos, setPhotos] = useState<PhotoWithUrl[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Confirmations & modals
  const [reprintTarget, setReprintTarget] = useState<PhotoWithUrl | null>(null);
  const [isReprinting, setIsReprinting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PhotoWithUrl | null>(null);
  const [clearStep, setClearStep] = useState<0 | 1 | 2>(0);
  const [lightboxPhoto, setLightboxPhoto] = useState<PhotoWithUrl | null>(null);

  // Settings draft
  const [draft, setDraft] = useState<PhotoboothSettings>(settings);
  const [pinError, setPinError] = useState('');
  const [savedNotice, setSavedNotice] = useState(false);

  // Available cameras enumeration
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>(
    [],
  );
  const [loadingCameras, setLoadingCameras] = useState(false);
  const [cameraListError, setCameraListError] = useState('');

  const {isOfflineReady, checking: checkingOffline, refresh: refreshOffline} =
    useOfflineReady();
  const {isInstalled: isInstalledAppMode} = usePWAInstall();

  const activeUrlsRef = useRef<string[]>([]);

  const loadGallery = async () => {
    setLoadingPhotos(true);
    try {
      const records = await getAllPhotos();
      activeUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      const withUrls = records.map((r) => ({
        ...r,
        url: URL.createObjectURL(r.blob),
      }));
      activeUrlsRef.current = withUrls.map((p) => p.url);
      setPhotos(withUrls);
    } finally {
      setLoadingPhotos(false);
    }
  };

  useEffect(() => {
    void loadGallery();
    return () => {
      activeUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      activeUrlsRef.current = [];
    };
  }, []);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  const refreshCameras = useCallback(async (requestPermission = false) => {
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.enumerateDevices
    ) {
      setCameraListError(
        'La détection des caméras n’est pas prise en charge par ce navigateur.',
      );
      return;
    }

    setLoadingCameras(true);
    setCameraListError('');
    try {
      let devices = await navigator.mediaDevices.enumerateDevices();
      let videoInputs = devices.filter((d) => d.kind === 'videoinput');

      const hasLabels = videoInputs.some((d) => Boolean(d.label));
      if (requestPermission && !hasLabels && navigator.mediaDevices.getUserMedia) {
        try {
          const tempStream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: {
                ideal:
                  draft.captureMode === 'selfie' ? 'user' : 'environment',
              },
            },
            audio: false,
          });
          tempStream.getTracks().forEach((t) => t.stop());
          devices = await navigator.mediaDevices.enumerateDevices();
          videoInputs = devices.filter((d) => d.kind === 'videoinput');
        } catch {
          setCameraListError(
            'Autorisez l’accès à la caméra pour afficher le nom de chaque objectif.',
          );
        }
      }

      setAvailableCameras(videoInputs);
    } catch {
      setCameraListError('Impossible de lister les caméras disponibles.');
    } finally {
      setLoadingCameras(false);
    }
  }, [draft.captureMode]);

  useEffect(() => {
    if (activeTab === 'settings') {
      void refreshCameras(false);
    }
  }, [activeTab, refreshCameras]);

  useEffect(() => {
    onBusyChange?.(isExporting);
  }, [isExporting, onBusyChange]);

  const totalSinglePrints = useMemo(
    () => photos.reduce((acc, p) => acc + (p.printCount || 0), 0),
    [photos],
  );

  const totalMiniaturesPrints = useMemo(
    () => photos.reduce((acc, p) => acc + (p.miniaturesPrintCount || 0), 0),
    [photos],
  );

  const totalShares = useMemo(
    () => photos.reduce((acc, p) => acc + (p.shareCount || 0), 0),
    [photos],
  );

  const formatTime = (ts: number) =>
    new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(ts));

  const formatDay = (ts: number) =>
    new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(ts));

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    await deletePhoto(deleteTarget.id);
    URL.revokeObjectURL(deleteTarget.url);
    setPhotos((prev) => prev.filter((p) => p.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  const handleConfirmClearAll = async () => {
    await clearAllPhotos();
    photos.forEach((p) => URL.revokeObjectURL(p.url));
    setPhotos([]);
    setClearStep(0);
  };

  const handleExportZip = async () => {
    if (photos.length === 0 || isExporting) return;
    setIsExporting(true);
    try {
      await exportPhotosAsZip(photos);
    } finally {
      setIsExporting(false);
    }
  };

  const handleReprint = async (photo: PhotoWithUrl, format: PrintFormat) => {
    if (isReprinting) return;
    setIsReprinting(true);
    try {
      await onPrintPhoto(photo, format);
      setPhotos((prev) =>
        prev.map((p) => {
          if (p.id !== photo.id) return p;
          if (format === 'miniatures4') {
            return {
              ...p,
              miniaturesPrintCount: (p.miniaturesPrintCount || 0) + 1,
            };
          }
          return {...p, printCount: (p.printCount || 0) + 1};
        }),
      );
      setReprintTarget(null);
    } finally {
      setIsReprinting(false);
    }
  };

  const handleSelectCaptureMode = (mode: CaptureMode) => {
    const next: PhotoboothSettings = {
      ...draft,
      captureMode: mode,
      countdownSeconds:
        mode === 'selfie'
          ? Math.max(3, draft.countdownSeconds)
          : draft.countdownSeconds,
    };
    setDraft(next);
    onUpdateSettings(next);
    setSavedNotice(true);
    window.setTimeout(() => setSavedNotice(false), 2500);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{4,8}$/.test(draft.adminPin)) {
      setPinError('Le code PIN doit contenir entre 4 et 8 chiffres.');
      return;
    }
    const normalized: PhotoboothSettings = {
      ...draft,
      countdownSeconds:
        draft.captureMode === 'selfie'
          ? Math.max(3, draft.countdownSeconds)
          : draft.countdownSeconds,
    };
    setPinError('');
    setDraft(normalized);
    onUpdateSettings(normalized);
    setSavedNotice(true);
    window.setTimeout(() => setSavedNotice(false), 2500);
  };

  const handleResetDefaults = () => {
    const def = getDefaultSettings();
    setDraft(def);
    onUpdateSettings(def);
    setPinError('');
    setSavedNotice(true);
    window.setTimeout(() => setSavedNotice(false), 2500);
  };

  return (
    <div className="app-viewport flex flex-col bg-[#FAF8F4] text-slate-900">
      {/* Top Bar */}
      <header
        style={{
          paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
          paddingLeft: 'max(1rem, env(safe-area-inset-left))',
          paddingRight: 'max(1rem, env(safe-area-inset-right))',
        }}
        className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white pb-3 sm:pb-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-slate-900 px-3.5 py-2 text-sm font-bold text-white transition hover:bg-slate-800 active:scale-95 whitespace-nowrap sm:min-h-[48px] sm:px-4 sm:text-base">
            <ArrowLeft className="h-5 w-5" />
            <span>Retour au photobooth</span>
          </button>
          <h1 className="font-display text-xl font-extrabold text-slate-900 sm:text-3xl">
            Espace bénévole
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          {/* Active capture mode indicator */}
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold sm:px-3.5 sm:text-sm">
            {settings.captureMode === 'selfie' ? (
              <Smile className="h-4 w-4 shrink-0 text-[#FF5A36] sm:h-5 sm:w-5" />
            ) : (
              <Camera className="h-4 w-4 shrink-0 text-sky-600 sm:h-5 sm:w-5" />
            )}
            <span className="text-slate-700">
              Mode actuel :{' '}
              <strong className="text-slate-900">
                {settings.captureMode === 'selfie' ? 'Selfie' : 'Classique'}
              </strong>
            </span>
          </div>

          {/* Installed standalone/fullscreen mode indicator */}
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold sm:px-3.5 sm:text-sm">
            <Smartphone
              className={`h-4 w-4 shrink-0 sm:h-5 sm:w-5 ${
                isInstalledAppMode ? 'text-emerald-600' : 'text-amber-600'
              }`}
            />
            <span className="text-slate-700">
              Mode application installée :{' '}
              <strong
                className={
                  isInstalledAppMode ? 'text-emerald-700' : 'text-amber-700'
                }>
                {isInstalledAppMode ? 'oui' : 'non'}
              </strong>
            </span>
          </div>

          {/* Offline readiness indicator */}
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold sm:px-3.5 sm:text-sm">
            {isOfflineReady ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 sm:h-5 sm:w-5" />
            ) : (
              <WifiOff className="h-4 w-4 shrink-0 text-amber-600 sm:h-5 sm:w-5" />
            )}
            <span className="text-slate-700">
              Prête pour le hors ligne :{' '}
              <strong
                className={
                  isOfflineReady ? 'text-emerald-700' : 'text-amber-700'
                }>
                {checkingOffline ? 'Vérification…' : isOfflineReady ? 'Oui' : 'Non'}
              </strong>
            </span>
            <button
              type="button"
              onClick={() => void refreshOffline()}
              title="Vérifier à nouveau"
              aria-label="Vérifier la disponibilité hors ligne"
              className="ml-1 flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-200 hover:text-slate-800">
              <RefreshCw
                className={`h-4 w-4 ${checkingOffline ? 'animate-spin' : ''}`}
              />
            </button>
          </div>

          <PWAInstallButton variant="admin" />
        </div>
      </header>

      {/* Navigation tabs */}
      <div
        style={{
          paddingLeft: 'max(1rem, env(safe-area-inset-left))',
          paddingRight: 'max(1rem, env(safe-area-inset-right))',
        }}
        className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white py-2.5 sm:py-3">
        <div className="inline-flex rounded-2xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setActiveTab('gallery')}
            className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition sm:px-5 sm:text-base ${
              activeTab === 'gallery'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}>
            <Images className="h-5 w-5" />
            <span>Galerie ({photos.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition sm:px-5 sm:text-base ${
              activeTab === 'settings'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}>
            <Settings className="h-5 w-5" />
            <span>Réglages</span>
          </button>
        </div>

        <div className="hidden text-sm font-medium text-slate-600 sm:flex sm:items-center sm:gap-2 tabular-nums">
          <span>
            <strong className="text-slate-900">{photos.length}</strong>{' '}
            {photos.length > 1 ? 'photos' : 'photo'}
          </span>
          <span aria-hidden="true">·</span>
          <span>
            <strong className="text-slate-900">{totalSinglePrints}</strong>{' '}
            « 1 photo »
          </span>
          <span aria-hidden="true">·</span>
          <span>
            <strong className="text-slate-900">{totalMiniaturesPrints}</strong>{' '}
            « 4 min. »
          </span>
          <span aria-hidden="true">·</span>
          <span>
            <strong className="text-slate-900">{totalShares}</strong>{' '}
            {totalShares > 1 ? 'partages' : 'partage'}
          </span>
        </div>
      </div>

      {/* Main scrollable content */}
      <div
        style={{
          paddingLeft: 'max(1rem, env(safe-area-inset-left))',
          paddingRight: 'max(1rem, env(safe-area-inset-right))',
          paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
        }}
        className="min-h-0 flex-1 overflow-y-auto pt-4 sm:pt-6">
        {activeTab === 'gallery' ? (
          <div className="mx-auto max-w-6xl space-y-6">
            {/* Gallery summary + bulk actions */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="text-base font-medium text-slate-600 tabular-nums">
                <strong className="text-slate-900">{photos.length}</strong>{' '}
                {photos.length > 1 ? 'photos enregistrées' : 'photo enregistrée'}
                {' · '}
                <strong className="text-slate-900">
                  {totalSinglePrints}
                </strong>{' '}
                {totalSinglePrints > 1
                  ? 'impressions « 1 photo »'
                  : 'impression « 1 photo »'}
                {' · '}
                <strong className="text-slate-900">
                  {totalMiniaturesPrints}
                </strong>{' '}
                {totalMiniaturesPrints > 1
                  ? 'impressions « 4 miniatures »'
                  : 'impression « 4 miniatures »'}
                {' · '}
                <strong className="text-slate-900">{totalShares}</strong>{' '}
                {totalShares > 1 ? 'partages' : 'partage'}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => void handleExportZip()}
                  disabled={photos.length === 0 || isExporting}
                  className="inline-flex min-h-[48px] items-center gap-2.5 rounded-2xl bg-sky-600 px-5 py-2.5 text-base font-bold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-45 active:scale-95 whitespace-nowrap">
                  <Archive className="h-5 w-5 shrink-0" />
                  <span>
                    {isExporting
                      ? 'Préparation du ZIP…'
                      : 'Exporter tout en ZIP'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setClearStep(1)}
                  disabled={photos.length === 0}
                  className="inline-flex min-h-[48px] items-center gap-2 rounded-2xl border border-red-200 bg-white px-5 py-2.5 text-base font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-45 active:scale-95 whitespace-nowrap">
                  <Trash2 className="h-5 w-5 shrink-0" />
                  <span>Tout effacer</span>
                </button>
              </div>
            </div>

            {loadingPhotos ? (
              <div className="py-20 text-center text-lg font-medium text-slate-500">
                Chargement des photos…
              </div>
            ) : photos.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center">
                <Images className="mx-auto h-12 w-12 text-slate-300" />
                <p className="mt-4 font-display text-xl font-bold text-slate-800">
                  Aucune photo enregistrée pour le moment
                </p>
                <p className="mt-1 text-base text-slate-500">
                  Les photos validées par les familles apparaîtront ici.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {photos.map((photo) => (
                  <article
                    key={photo.id}
                    className="flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <button
                      type="button"
                      onClick={() => setLightboxPhoto(photo)}
                      className={`${
                        settings.photoOrientation === 'portrait'
                          ? 'aspect-[2/3]'
                          : 'aspect-[3/2]'
                      } w-full overflow-hidden bg-slate-100 focus:outline-none`}>
                      <img
                        src={photo.url}
                        alt={`Photo prise à ${formatTime(photo.createdAt)}`}
                        className="h-full w-full object-contain transition hover:scale-[1.02]"
                      />
                    </button>

                    <div className="flex flex-col gap-3 p-4">
                      <div className="flex items-baseline justify-between gap-2 text-sm tabular-nums">
                        <span className="font-bold text-slate-900">
                          {formatTime(photo.createdAt)}
                        </span>
                        <span className="text-slate-500">
                          {formatDay(photo.createdAt)}
                        </span>
                      </div>

                      <div className="space-y-0.5 text-xs font-medium text-slate-600 tabular-nums sm:text-sm">
                        <div>
                          Impressions « 1 photo » :{' '}
                          <strong className="text-slate-900">
                            {photo.printCount || 0}
                          </strong>
                        </div>
                        <div>
                          Impressions « 4 miniatures » :{' '}
                          <strong className="text-slate-900">
                            {photo.miniaturesPrintCount || 0}
                          </strong>
                        </div>
                        <div>
                          Partages :{' '}
                          <strong className="text-slate-900">
                            {photo.shareCount || 0}
                          </strong>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setReprintTarget(photo)}
                          className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-sky-50 px-3 py-2 text-sm font-bold text-sky-700 transition hover:bg-sky-100 active:scale-95">
                          <Printer className="h-4 w-4 shrink-0" />
                          <span>Réimprimer</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(photo)}
                          aria-label="Supprimer cette photo"
                          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-red-50 text-red-600 transition hover:bg-red-100 active:scale-95">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        ) : (
          <form
            onSubmit={handleSaveSettings}
            className="mx-auto max-w-3xl space-y-6 pb-12">
            {/* Bandeau photo */}
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
              <h2 className="font-display text-xl font-bold text-slate-900">
                Bandeau de la photo (
                {draft.photoOrientation === 'portrait'
                  ? '10 × 15 cm'
                  : '15 × 10 cm'}
                )
              </h2>

              <div>
                <label
                  htmlFor="bannerText"
                  className="block text-sm font-semibold text-slate-700">
                  Texte du bandeau
                </label>
                <input
                  id="bannerText"
                  type="text"
                  value={draft.bannerText}
                  onChange={(e) =>
                    setDraft({...draft, bannerText: e.target.value})
                  }
                  className="mt-2 w-full min-h-[48px] rounded-2xl border border-slate-300 px-4 py-2.5 text-base text-slate-900 focus:border-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="bannerDate"
                  className="block text-sm font-semibold text-slate-700">
                  Date affichée sous le texte
                </label>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <input
                    id="bannerDate"
                    type="text"
                    value={draft.bannerDate}
                    onChange={(e) =>
                      setDraft({...draft, bannerDate: e.target.value})
                    }
                    placeholder="Ex. 20 juin 2027"
                    className="flex-1 min-h-[48px] rounded-2xl border border-slate-300 px-4 py-2.5 text-base text-slate-900 focus:border-slate-900 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        bannerDate: formatFrenchDate(new Date()),
                      })
                    }
                    className="min-h-[48px] rounded-2xl bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-200 whitespace-nowrap">
                    Date du jour
                  </button>
                </div>
              </div>
            </section>

            {/* Caméra & déclenchement */}
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
              <h2 className="font-display text-xl font-bold text-slate-900">
                Caméra et compte à rebours
              </h2>

              {/* Mode de prise de vue */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <div className="text-base font-semibold text-slate-900">
                    Mode de prise de vue
                  </div>
                  <div className="text-sm text-slate-500">
                    {draft.captureMode === 'selfie'
                      ? 'Tablette sur pied : caméra frontale, aperçu miroir, gros bouton centré'
                      : 'Tenu par un bénévole : caméra arrière sans miroir'}
                  </div>
                </div>
                <div className="inline-flex rounded-2xl bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => handleSelectCaptureMode('classic')}
                    className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${
                      draft.captureMode !== 'selfie'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}>
                    <Camera className="h-4 w-4" />
                    <span>Classique</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectCaptureMode('selfie')}
                    className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${
                      draft.captureMode === 'selfie'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}>
                    <Smile className="h-4 w-4" />
                    <span>Selfie</span>
                  </button>
                </div>
              </div>

              {/* Orientation de la photo */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <div className="text-base font-semibold text-slate-900">
                    Orientation de la photo
                  </div>
                  <div className="text-sm text-slate-500">
                    S’applique à la photo finale, au cadre de visée et à
                    l’impression
                  </div>
                </div>
                <div className="inline-flex rounded-2xl bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() =>
                      setDraft({...draft, photoOrientation: 'landscape'})
                    }
                    className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${
                      draft.photoOrientation !== 'portrait'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600'
                    }`}>
                    <span className="inline-block h-3.5 w-5 rounded-[3px] border-2 border-current" />
                    <span>Paysage</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDraft({...draft, photoOrientation: 'portrait'})
                    }
                    className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${
                      draft.photoOrientation === 'portrait'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600'
                    }`}>
                    <span className="inline-block h-5 w-3.5 rounded-[3px] border-2 border-current" />
                    <span>Portrait</span>
                  </button>
                </div>
              </div>

              {/* Format par défaut */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <div className="text-base font-semibold text-slate-900">
                    Format par défaut
                  </div>
                  <div className="text-sm text-slate-500">
                    Sélectionné automatiquement pour chaque nouvelle photo
                  </div>
                </div>
                <div className="inline-flex rounded-2xl bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() =>
                      setDraft({...draft, defaultPhotoFormat: 'single'})
                    }
                    className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${
                      draft.defaultPhotoFormat !== 'miniatures4'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600'
                    }`}>
                    <Square className="h-4 w-4" />
                    <span>1 photo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDraft({...draft, defaultPhotoFormat: 'miniatures4'})
                    }
                    className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${
                      draft.defaultPhotoFormat === 'miniatures4'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600'
                    }`}>
                    <LayoutGrid className="h-4 w-4" />
                    <span>4 miniatures</span>
                  </button>
                </div>
              </div>

              {/* Camera facing (Classic mode) or front camera info (Selfie mode) */}
              {draft.captureMode !== 'selfie' ? (
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="text-base font-semibold text-slate-900">
                      Caméra par défaut (mode Classique)
                    </div>
                    <div className="text-sm text-slate-500">
                      Caméra arrière recommandée pour photographier les familles
                    </div>
                  </div>
                  <div className="inline-flex rounded-2xl bg-slate-100 p-1">
                    <button
                      type="button"
                      onClick={() =>
                        setDraft({
                          ...draft,
                          cameraFacing: 'environment',
                          cameraDeviceId: '',
                        })
                      }
                      className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${
                        draft.cameraFacing === 'environment'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600'
                      }`}>
                      <Camera className="h-4 w-4" />
                      <span>Arrière</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setDraft({
                          ...draft,
                          cameraFacing: 'user',
                          cameraDeviceId: '',
                        })
                      }
                      className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${
                        draft.cameraFacing === 'user'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600'
                      }`}>
                      <Camera className="h-4 w-4" />
                      <span>Frontale</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="text-base font-semibold text-slate-900">
                      Caméra utilisée (mode Selfie)
                    </div>
                    <div className="text-sm text-slate-500">
                      Caméra frontale sélectionnée automatiquement pour le mode
                      Selfie
                    </div>
                  </div>
                  <span className="inline-flex min-h-[40px] items-center gap-2 rounded-2xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-800">
                    <Camera className="h-4 w-4" />
                    <span>Frontale</span>
                  </span>
                </div>
              )}

              {/* Specific camera device selector (stored separately per mode) */}
              {(() => {
                const isSelfieMode = draft.captureMode === 'selfie';
                const currentDeviceId = isSelfieMode
                  ? draft.selfieCameraDeviceId
                  : draft.cameraDeviceId;
                const setDeviceIdForMode = (deviceId: string) =>
                  setDraft(
                    isSelfieMode
                      ? {...draft, selfieCameraDeviceId: deviceId}
                      : {...draft, cameraDeviceId: deviceId},
                  );

                return (
                  <div className="border-t border-slate-100 pt-5 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-base font-semibold text-slate-900">
                          Objectif / caméra précise (mode{' '}
                          {isSelfieMode ? 'Selfie' : 'Classique'})
                        </div>
                        <div className="text-sm text-slate-500">
                          Choix mémorisé séparément pour le mode{' '}
                          {isSelfieMode ? 'Selfie' : 'Classique'}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => void refreshCameras(true)}
                        disabled={loadingCameras}
                        className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-slate-100 px-3.5 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200 active:scale-95 disabled:opacity-50">
                        <RefreshCw
                          className={`h-4 w-4 ${loadingCameras ? 'animate-spin' : ''}`}
                        />
                        <span>Détecter les caméras</span>
                      </button>
                    </div>

                    {cameraListError && (
                      <p className="text-sm font-medium text-amber-700">
                        {cameraListError}
                      </p>
                    )}

                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => setDeviceIdForMode('')}
                        className={`flex w-full min-h-[48px] items-center justify-between rounded-2xl border px-4 py-2.5 text-left text-sm font-semibold transition ${
                          currentDeviceId === ''
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                        }`}>
                        <span>
                          Automatique (
                          {isSelfieMode || draft.cameraFacing === 'user'
                            ? 'caméra frontale'
                            : 'caméra arrière'}
                          )
                        </span>
                        {currentDeviceId === '' && (
                          <Check className="h-4 w-4 shrink-0" />
                        )}
                      </button>

                      {availableCameras.map((cam, index) => {
                        const selected = currentDeviceId === cam.deviceId;
                        const label =
                          cam.label.trim() || `Caméra détectée ${index + 1}`;
                        return (
                          <button
                            key={cam.deviceId || `cam-${index}`}
                            type="button"
                            onClick={() => setDeviceIdForMode(cam.deviceId)}
                            className={`flex w-full min-h-[48px] items-center justify-between gap-3 rounded-2xl border px-4 py-2.5 text-left text-sm font-semibold transition ${
                              selected
                                ? 'border-slate-900 bg-slate-900 text-white'
                                : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                            }`}>
                            <span className="truncate">{label}</span>
                            {selected && <Check className="h-4 w-4 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Countdown duration (0s allowed in Classic, min 3s in Selfie) */}
              {(() => {
                const minCountdown = draft.captureMode === 'selfie' ? 3 : 0;
                return (
                  <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-5">
                    <div>
                      <div className="text-base font-semibold text-slate-900">
                        Durée du compte à rebours
                      </div>
                      <div className="text-sm text-slate-500">
                        {draft.captureMode === 'selfie'
                          ? 'Minimum 3 s en mode Selfie pour laisser le temps de prendre la pose (défaut : 3 s)'
                          : '0 s = déclenchement immédiat sans attente (défaut : 3 s)'}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        disabled={draft.countdownSeconds <= minCountdown}
                        onClick={() =>
                          setDraft({
                            ...draft,
                            countdownSeconds: Math.max(
                              minCountdown,
                              draft.countdownSeconds - 1,
                            ),
                          })
                        }
                        aria-label="Diminuer"
                        className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-800 hover:bg-slate-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40">
                        <Minus className="h-5 w-5" />
                      </button>
                      <span className="min-w-[6.5rem] text-center font-display text-xl font-bold tabular-nums">
                        {draft.countdownSeconds === 0
                          ? '0 s (immédiat)'
                          : `${draft.countdownSeconds} s`}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setDraft({
                            ...draft,
                            countdownSeconds: Math.min(
                              10,
                              draft.countdownSeconds + 1,
                            ),
                          })
                        }
                        aria-label="Augmenter"
                        className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-800 hover:bg-slate-200 active:scale-95">
                        <Plus className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                );
              })()}
            </section>

            {/* Délais d'inactivité & sécurité */}
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
              <h2 className="font-display text-xl font-bold text-slate-900">
                Délais d’inactivité et sécurité
              </h2>

              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-base font-semibold text-slate-900">
                    Retour automatique (Visualisation)
                  </div>
                  <div className="text-sm text-slate-500">
                    Enregistre la photo et revient à l’accueil (défaut : 120 s)
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        previewTimeoutSeconds: Math.max(
                          15,
                          draft.previewTimeoutSeconds - 15,
                        ),
                      })
                    }
                    aria-label="Diminuer"
                    className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-800 hover:bg-slate-200 active:scale-95">
                    <Minus className="h-5 w-5" />
                  </button>
                  <span className="w-20 text-center font-display text-xl font-bold tabular-nums">
                    {draft.previewTimeoutSeconds} s
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        previewTimeoutSeconds: Math.min(
                          600,
                          draft.previewTimeoutSeconds + 15,
                        ),
                      })
                    }
                    aria-label="Augmenter"
                    className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-800 hover:bg-slate-200 active:scale-95">
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-5">
                <div>
                  <div className="text-base font-semibold text-slate-900">
                    Retour automatique (Autres écrans)
                  </div>
                  <div className="text-sm text-slate-500">
                    Caméra et code PIN sans action (défaut : 30 s)
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        otherTimeoutSeconds: Math.max(
                          10,
                          draft.otherTimeoutSeconds - 5,
                        ),
                      })
                    }
                    aria-label="Diminuer"
                    className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-800 hover:bg-slate-200 active:scale-95">
                    <Minus className="h-5 w-5" />
                  </button>
                  <span className="w-20 text-center font-display text-xl font-bold tabular-nums">
                    {draft.otherTimeoutSeconds} s
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        otherTimeoutSeconds: Math.min(
                          300,
                          draft.otherTimeoutSeconds + 5,
                        ),
                      })
                    }
                    aria-label="Augmenter"
                    className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-800 hover:bg-slate-200 active:scale-95">
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-5">
                <label
                  htmlFor="adminPin"
                  className="block text-base font-semibold text-slate-900">
                  Code PIN bénévole (4 à 8 chiffres)
                </label>
                <input
                  id="adminPin"
                  type="text"
                  inputMode="numeric"
                  pattern="\d{4,8}"
                  maxLength={8}
                  value={draft.adminPin}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      adminPin: e.target.value.replace(/\D/g, ''),
                    })
                  }
                  className="mt-2 w-48 min-h-[48px] rounded-2xl border border-slate-300 px-4 py-2.5 font-display text-xl font-bold tracking-widest text-slate-900 tabular-nums focus:border-slate-900 focus:outline-none"
                />
                {pinError && (
                  <p className="mt-2 text-sm font-semibold text-red-600">
                    {pinError}
                  </p>
                )}
              </div>
            </section>

            {/* Save actions */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <button
                type="button"
                onClick={handleResetDefaults}
                className="inline-flex min-h-[52px] items-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 py-3 text-base font-bold text-slate-700 hover:bg-slate-50 active:scale-95">
                <RotateCcw className="h-4 w-4" />
                <span>Valeurs par défaut</span>
              </button>

              <div className="flex items-center gap-4">
                {savedNotice && (
                  <span className="inline-flex items-center gap-1.5 text-base font-bold text-emerald-700">
                    <Check className="h-5 w-5" />
                    Réglages enregistrés
                  </span>
                )}
                <button
                  type="submit"
                  className="inline-flex min-h-[52px] items-center gap-2 rounded-2xl bg-[#10B981] px-8 py-3 text-lg font-extrabold text-white shadow-sm transition hover:bg-[#059669] active:scale-95">
                  <Check className="h-5 w-5" />
                  <span>Enregistrer</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Reprint format chooser */}
      {reprintTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-6 backdrop-blur-sm"
          onClick={() => !isReprinting && setReprintTarget(null)}>
          <div
            className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl sm:p-7"
            onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-2xl font-bold text-slate-900">
              Réimprimer cette photo
            </h3>
            <p className="mt-1.5 text-sm text-slate-600 sm:text-base">
              Choisissez le format d’impression pour la photo prise à{' '}
              {formatTime(reprintTarget.createdAt)} :
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={isReprinting}
                onClick={() => void handleReprint(reprintTarget, 'single')}
                className="flex min-h-[76px] flex-col items-center justify-center gap-2 rounded-2xl bg-[#0EA5E9] px-4 py-3 font-display text-base font-extrabold text-white shadow-sm transition hover:bg-[#0284C7] active:scale-95 disabled:opacity-60">
                <Square className="h-6 w-6" />
                <span>1 photo</span>
              </button>
              <button
                type="button"
                disabled={isReprinting}
                onClick={() =>
                  void handleReprint(reprintTarget, 'miniatures4')
                }
                className="flex min-h-[76px] flex-col items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 font-display text-base font-extrabold text-white shadow-sm transition hover:bg-slate-800 active:scale-95 disabled:opacity-60">
                <LayoutGrid className="h-6 w-6" />
                <span>4 miniatures</span>
              </button>
            </div>
            <button
              type="button"
              disabled={isReprinting}
              onClick={() => setReprintTarget(null)}
              className="mt-4 w-full min-h-[48px] rounded-2xl bg-slate-100 font-bold text-slate-700 hover:bg-slate-200 disabled:opacity-60">
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Single photo delete confirmation */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-6 backdrop-blur-sm"
          onClick={() => setDeleteTarget(null)}>
          <div
            className="w-full max-w-sm rounded-3xl bg-white p-7 shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-2xl font-bold text-slate-900">
              Supprimer cette photo ?
            </h3>
            <p className="mt-2 text-base text-slate-600">
              La photo prise à {formatTime(deleteTarget.createdAt)} sera
              définitivement effacée de la tablette.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 min-h-[48px] rounded-2xl bg-slate-100 font-bold text-slate-700 hover:bg-slate-200">
                Annuler
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmDelete()}
                className="flex-1 min-h-[48px] rounded-2xl bg-red-600 font-bold text-white hover:bg-red-700">
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear all double confirmation */}
      {clearStep > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-6 backdrop-blur-sm"
          onClick={() => setClearStep(0)}>
          <div
            className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            {clearStep === 1 ? (
              <>
                <h3 className="font-display text-2xl font-bold text-slate-900">
                  Tout effacer ?
                </h3>
                <p className="mt-2 text-base text-slate-600">
                  Vous êtes sur le point de supprimer les{' '}
                  <strong>{photos.length}</strong> photos stockées sur cette
                  tablette. Pensez à exporter le fichier ZIP avant !
                </p>
                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setClearStep(0)}
                    className="flex-1 min-h-[48px] rounded-2xl bg-slate-100 font-bold text-slate-700 hover:bg-slate-200">
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={() => setClearStep(2)}
                    className="flex-1 min-h-[48px] rounded-2xl bg-red-600 font-bold text-white hover:bg-red-700">
                    Continuer
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="font-display text-2xl font-bold text-red-700">
                  Confirmation définitive
                </h3>
                <p className="mt-2 text-base text-slate-700">
                  Cette action est irréversible. Toutes les photos seront
                  perdues définitivement.
                </p>
                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setClearStep(0)}
                    className="flex-1 min-h-[48px] rounded-2xl bg-slate-100 font-bold text-slate-700 hover:bg-slate-200">
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleConfirmClearAll()}
                    className="flex-1 min-h-[48px] rounded-2xl bg-red-700 font-bold text-white hover:bg-red-800">
                    Oui, tout supprimer
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Lightbox preview */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-6"
          onClick={() => setLightboxPhoto(null)}>
          <button
            type="button"
            onClick={() => setLightboxPhoto(null)}
            aria-label="Fermer"
            style={{
              top: 'max(1rem, env(safe-area-inset-top))',
              right: 'max(1rem, env(safe-area-inset-right))',
            }}
            className="fixed flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-900 shadow-lg">
            <X className="h-6 w-6" />
          </button>
          <img
            src={lightboxPhoto.url}
            alt="Aperçu"
            className="max-h-[90dvh] max-w-[90vw] rounded-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};
