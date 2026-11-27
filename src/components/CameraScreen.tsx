import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  RefreshCw,
  RotateCw,
} from 'lucide-react';
import {AnimatePresence, motion} from 'motion/react';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {composePhotoBlob} from '../lib/canvas';
import {
  playCountdownBeep,
  playShutterSound,
  unlockAudio,
} from '../lib/sound';
import {PhotoboothSettings} from '../types';

interface CameraScreenProps {
  settings: PhotoboothSettings;
  onBack: () => void;
  onCaptured: (blob: Blob) => void;
  onBusyChange?: (busy: boolean) => void;
}

type CameraErrorKind = 'permission' | 'not_found' | 'in_use' | 'unsupported' | null;

export const CameraScreen: React.FC<CameraScreenProps> = ({
  settings,
  onBack,
  onCaptured,
  onBusyChange,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const viewfinderSlotRef = useRef<HTMLDivElement | null>(null);
  const viewfinderRef = useRef<HTMLDivElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [errorKind, setErrorKind] = useState<CameraErrorKind>(null);
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [frameSize, setFrameSize] = useState<{width: number; height: number}>({
    width: 300,
    height: 200,
  });
  const [isDevicePortrait, setIsDevicePortrait] = useState(() =>
    typeof window !== 'undefined'
      ? window.innerHeight > window.innerWidth
      : false,
  );

  const updateViewfinderLayout = useCallback(() => {
    setIsDevicePortrait(window.innerHeight > window.innerWidth);
    const slot = viewfinderSlotRef.current;
    if (!slot) return;
    const rect = slot.getBoundingClientRect();
    const availW = Math.max(80, rect.width - 16);
    const availH = Math.max(80, rect.height - 12);
    const targetRatio =
      settings.photoOrientation === 'portrait' ? 2 / 3 : 3 / 2;

    if (availW / availH > targetRatio) {
      const h = Math.floor(availH);
      const w = Math.floor(h * targetRatio);
      setFrameSize({width: w, height: h});
    } else {
      const w = Math.floor(availW);
      const h = Math.floor(w / targetRatio);
      setFrameSize({width: w, height: h});
    }
  }, [settings.photoOrientation]);

  useEffect(() => {
    updateViewfinderLayout();
    const slot = viewfinderSlotRef.current;
    let observer: ResizeObserver | null = null;
    if (slot && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => updateViewfinderLayout());
      observer.observe(slot);
    }

    let settleTimer: number | null = null;
    const handleOrientation = () => {
      updateViewfinderLayout();
      if (settleTimer !== null) window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => {
        updateViewfinderLayout();
      }, 140);
    };

    window.addEventListener('resize', handleOrientation);
    window.addEventListener('orientationchange', handleOrientation);
    return () => {
      observer?.disconnect();
      if (settleTimer !== null) window.clearTimeout(settleTimer);
      window.removeEventListener('resize', handleOrientation);
      window.removeEventListener('orientationchange', handleOrientation);
    };
  }, [updateViewfinderLayout]);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const isSelfie = settings.captureMode === 'selfie';
  const activeDeviceId = isSelfie
    ? settings.selfieCameraDeviceId
    : settings.cameraDeviceId;
  const activeFacing = isSelfie ? 'user' : settings.cameraFacing;

  const startCamera = useCallback(async () => {
    stopStream();
    setIsLoading(true);
    setIsReady(false);
    setErrorKind(null);
    setFallbackNotice(null);

    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      setIsLoading(false);
      setErrorKind('unsupported');
      return;
    }

    const highRes = {
      width: {ideal: 2560},
      height: {ideal: 1920},
    };

    try {
      let stream: MediaStream;
      let notice: string | null = null;

      if (activeDeviceId) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              deviceId: {exact: activeDeviceId},
              ...highRes,
            },
            audio: false,
          });
        } catch (err) {
          const errName = err instanceof DOMException ? err.name : '';
          if (
            errName === 'OverconstrainedError' ||
            errName === 'NotFoundError'
          ) {
            stream = await navigator.mediaDevices.getUserMedia({
              video: {
                facingMode: {ideal: activeFacing},
                ...highRes,
              },
              audio: false,
            });
            notice =
              'Caméra choisie indisponible : autre caméra utilisée.';
          } else {
            throw err;
          }
        }
      } else if (activeFacing === 'environment') {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: {exact: 'environment'},
              ...highRes,
            },
            audio: false,
          });
        } catch (err) {
          const errName = err instanceof DOMException ? err.name : '';
          if (
            errName === 'OverconstrainedError' ||
            errName === 'NotFoundError'
          ) {
            stream = await navigator.mediaDevices.getUserMedia({
              video: highRes,
              audio: false,
            });
            notice = 'Caméra arrière absente : caméra disponible utilisée.';
          } else {
            throw err;
          }
        }
      } else {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: {exact: 'user'},
              ...highRes,
            },
            audio: false,
          });
        } catch (err) {
          const errName = err instanceof DOMException ? err.name : '';
          if (
            errName === 'OverconstrainedError' ||
            errName === 'NotFoundError'
          ) {
            try {
              stream = await navigator.mediaDevices.getUserMedia({
                video: {
                  facingMode: {ideal: 'user'},
                  ...highRes,
                },
                audio: false,
              });
            } catch {
              stream = await navigator.mediaDevices.getUserMedia({
                video: highRes,
                audio: false,
              });
              notice = 'Caméra frontale absente : caméra disponible utilisée.';
            }
          } else {
            throw err;
          }
        }
      }

      if (!notice && !activeDeviceId) {
        const trackFacing = stream.getVideoTracks()[0]?.getSettings().facingMode;
        if (activeFacing === 'environment' && trackFacing === 'user') {
          notice = 'Caméra arrière absente : caméra disponible utilisée.';
        } else if (activeFacing === 'user' && trackFacing === 'environment') {
          notice = 'Caméra frontale absente : caméra disponible utilisée.';
        }
      }

      streamRef.current = stream;
      setFallbackNotice(notice);
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play().catch(() => {});
        setIsReady(true);
      }
      setIsLoading(false);
    } catch (err) {
      setIsLoading(false);
      const name = err instanceof DOMException ? err.name : '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setErrorKind('permission');
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setErrorKind('not_found');
      } else if (name === 'NotReadableError' || name === 'TrackStartError') {
        setErrorKind('in_use');
      } else {
        setErrorKind('permission');
      }
    }
  }, [activeDeviceId, activeFacing, stopStream]);

  useEffect(() => {
    void startCamera();
    return () => {
      stopStream();
    };
  }, [startCamera, stopStream]);

  useEffect(() => {
    onBusyChange?.(countdown !== null || isCapturing);
  }, [countdown, isCapturing, onBusyChange]);

  const captureNow = useCallback(() => {
    setCountdown(null);
    setIsCapturing(true);
    setIsFlashing(true);
    playShutterSound();

    const video = videoRef.current;
    window.setTimeout(() => {
      setIsFlashing(false);
    }, 420);

    if (video) {
      const cropRects = viewfinderRef.current
        ? {
            videoRect: video.getBoundingClientRect(),
            viewfinderRect: viewfinderRef.current.getBoundingClientRect(),
            mirroredPreview: isSelfie,
          }
        : null;
      composePhotoBlob(video, settings, cropRects)
        .then((blob) => {
          window.setTimeout(() => {
            stopStream();
            onCaptured(blob);
          }, 220);
        })
        .catch(() => {
          setIsCapturing(false);
        });
    } else {
      setIsCapturing(false);
    }
  }, [isSelfie, onCaptured, settings, stopStream]);

  const handleStartCountdown = () => {
    if (!isReady || countdown !== null || isCapturing) return;
    unlockAudio();

    const effectiveCountdown = isSelfie
      ? Math.max(3, settings.countdownSeconds)
      : settings.countdownSeconds;

    if (effectiveCountdown <= 0) {
      captureNow();
      return;
    }

    setCountdown(effectiveCountdown);
    playCountdownBeep(effectiveCountdown === 1);
  };

  useEffect(() => {
    if (countdown === null) return;

    if (countdown <= 0) {
      captureNow();
      return;
    }

    const timer = window.setTimeout(() => {
      const next = countdown - 1;
      if (next > 0) {
        playCountdownBeep(next === 1);
      }
      setCountdown(next);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [captureNow, countdown]);

  const renderErrorContent = () => {
    if (errorKind === 'permission') {
      return {
        title: 'Accès à la caméra refusé',
        steps: [
          'Appuyez sur l’icône de cadenas ou de caméra dans la barre d’adresse du navigateur.',
          'Autorisez l’accès à l’appareil photo pour ce site.',
          'Appuyez ensuite sur le bouton « Réessayer » ci-dessous.',
        ],
      };
    }
    if (errorKind === 'not_found') {
      return {
        title: 'Aucune caméra détectée',
        steps: [
          'Vérifiez que la tablette dispose bien d’une caméra fonctionnelle.',
          'Dans l’espace bénévole, vérifiez le choix de caméra (arrière ou frontale).',
          'Appuyez sur « Réessayer » une fois la caméra prête.',
        ],
      };
    }
    if (errorKind === 'in_use') {
      return {
        title: 'La caméra est occupée',
        steps: [
          'Une autre application utilise déjà l’appareil photo.',
          'Fermez les autres applications ouvertes sur la tablette.',
          'Puis appuyez sur « Réessayer ».',
        ],
      };
    }
    return {
      title: 'Caméra indisponible',
      steps: [
        'Votre navigateur ne permet pas d’ouvrir la caméra ici.',
        'Ouvrez l’application dans Safari (iPad) ou Chrome (Android).',
      ],
    };
  };

  return (
    <main className="app-viewport relative flex flex-col justify-between bg-slate-950 select-none">
      {/* Live video feed: mirrored in Selfie mode preview only, never on saved photo */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        onLoadedMetadata={() => {
          setIsReady(true);
          updateViewfinderLayout();
        }}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
          isSelfie ? '-scale-x-100' : ''
        } ${isReady && !errorKind ? 'opacity-100' : 'opacity-0'}`}
      />

      {/* Top bar: Back button + discreet rotation / fallback notices */}
      <div
        style={{
          paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
          paddingLeft: 'max(0.75rem, env(safe-area-inset-left))',
          paddingRight: 'max(0.75rem, env(safe-area-inset-right))',
        }}
        className="relative z-20 flex shrink-0 items-start justify-between gap-2 pb-1">
        {countdown === null && !isCapturing ? (
          <button
            type="button"
            onClick={() => {
              stopStream();
              onBack();
            }}
            style={{
              fontSize: 'clamp(0.875rem, 2.3vmin, 1.05rem)',
              padding:
                'clamp(0.5rem, 1.2dvh, 0.75rem) clamp(0.9rem, 2.5vw, 1.25rem)',
            }}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-slate-900/65 font-bold text-white backdrop-blur-md transition hover:bg-slate-900/80 active:scale-95">
            <ArrowLeft className="h-5 w-5 shrink-0" />
            <span>Retour</span>
          </button>
        ) : (
          <div />
        )}

        <div className="flex flex-col items-end gap-1.5">
          {settings.photoOrientation !== 'portrait' &&
            isDevicePortrait &&
            isReady &&
            !errorKind &&
            countdown === null &&
            !isCapturing && (
              <div className="inline-flex items-center gap-1.5 rounded-2xl bg-slate-900/75 px-3 py-1.5 text-xs font-medium text-white/95 backdrop-blur-md sm:text-sm">
                <RotateCw className="h-4 w-4 shrink-0" />
                <span>Tournez l’appareil en paysage</span>
              </div>
            )}

          {fallbackNotice && isReady && !errorKind && (
            <div className="rounded-2xl bg-slate-900/65 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur-md sm:text-sm">
              {fallbackNotice}
            </div>
          )}
        </div>
      </div>

      {/* Middle flexible slot: holds viewfinder frame OR loading/error state */}
      <div
        ref={viewfinderSlotRef}
        style={{
          paddingLeft: 'max(0.5rem, env(safe-area-inset-left))',
          paddingRight: 'max(0.5rem, env(safe-area-inset-right))',
        }}
        className="relative z-10 flex min-h-0 flex-1 items-center justify-center overflow-hidden">
        {isReady && !errorKind && (
          <div
            aria-hidden="true"
            className={`pointer-events-none flex items-center justify-center transition-opacity ${
              countdown === null && !isCapturing ? 'opacity-100' : 'opacity-0'
            }`}>
            <div
              ref={viewfinderRef}
              style={{
                width: `${frameSize.width}px`,
                height: `${frameSize.height}px`,
                boxShadow: '0 0 0 9999px rgba(2, 6, 23, 0.56)',
              }}
              className="relative rounded-xl ring-1 ring-white/45">
              <div className="absolute -top-0.5 -left-0.5 h-7 w-7 rounded-tl-xl border-t-4 border-l-4 border-white sm:h-8 sm:w-8" />
              <div className="absolute -top-0.5 -right-0.5 h-7 w-7 rounded-tr-xl border-t-4 border-r-4 border-white sm:h-8 sm:w-8" />
              <div className="absolute -bottom-0.5 -left-0.5 h-7 w-7 rounded-bl-xl border-b-4 border-l-4 border-white sm:h-8 sm:w-8" />
              <div className="absolute -bottom-0.5 -right-0.5 h-7 w-7 rounded-br-xl border-b-4 border-r-4 border-white sm:h-8 sm:w-8" />
            </div>
          </div>
        )}

        {isLoading && !errorKind && (
          <div className="relative z-20 rounded-3xl bg-slate-900/80 px-6 py-5 text-center text-white backdrop-blur-md sm:px-8 sm:py-6">
            <div className="mx-auto mb-3 h-9 w-9 animate-spin rounded-full border-4 border-white/30 border-t-white" />
            <p
              style={{fontSize: 'clamp(1rem, 2.8vmin, 1.25rem)'}}
              className="font-display font-bold">
              Ouverture de l’appareil photo…
            </p>
          </div>
        )}

        {errorKind && (
          <div className="relative z-20 max-h-full w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-5 text-slate-900 shadow-2xl sm:p-8">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 sm:h-14 sm:w-14">
                <AlertTriangle className="h-7 w-7 sm:h-8 sm:w-8" />
              </div>
              <h2
                style={{fontSize: 'clamp(1.15rem, 3.4vmin, 1.75rem)'}}
                className="font-display font-extrabold text-slate-900">
                {renderErrorContent().title}
              </h2>
            </div>

            <ol className="mt-4 space-y-2.5 text-sm leading-relaxed text-slate-700 sm:mt-6 sm:space-y-3 sm:text-base">
              {renderErrorContent().steps.map((step, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-800 sm:h-7 sm:w-7 sm:text-sm">
                    {idx + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>

            <div className="mt-6 flex flex-col gap-2.5 sm:mt-8 sm:flex-row sm:gap-3">
              <button
                type="button"
                onClick={() => void startCamera()}
                className="flex flex-1 min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-[#FF5A36] px-5 py-3 text-base font-bold text-white transition hover:bg-[#F34F2B] active:scale-[0.98]">
                <RefreshCw className="h-5 w-5" />
                <span>Réessayer</span>
              </button>
              <button
                type="button"
                onClick={onBack}
                className="flex flex-1 min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-slate-100 px-5 py-3 text-base font-bold text-slate-700 transition hover:bg-slate-200 active:scale-[0.98]">
                <span>Accueil</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Selfie mode: big centered child-friendly trigger button */}
      {isSelfie &&
        isReady &&
        !errorKind &&
        countdown === null &&
        !isCapturing && (
          <div className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center p-4">
            <button
              type="button"
              onClick={handleStartCountdown}
              style={{
                fontSize: 'clamp(1.5rem, 5vmin, 2.75rem)',
                padding:
                  'clamp(1.1rem, 3.2dvh, 2rem) clamp(2.2rem, 8vw, 4.75rem)',
              }}
              className="pointer-events-auto flex items-center justify-center gap-[clamp(0.75rem,2.4vw,1.25rem)] rounded-[2.25rem] bg-[#FF5A36] font-display font-extrabold text-white shadow-[0_10px_0_0_#C93B1D,0_20px_40px_rgba(0,0,0,0.45)] transition-all hover:bg-[#F34F2B] active:translate-y-2 active:shadow-[0_3px_0_0_#C93B1D] whitespace-nowrap">
              <Camera
                style={{
                  width: 'clamp(1.75rem, 5vmin, 3rem)',
                  height: 'clamp(1.75rem, 5vmin, 3rem)',
                }}
                className="shrink-0"
                strokeWidth={2.6}
              />
              <span>C’est parti !</span>
            </button>
          </div>
        )}

      {/* Animated big countdown overlay */}
      <AnimatePresence mode="wait">
        {countdown !== null && countdown > 0 && (
          <motion.div
            key={countdown}
            initial={{scale: 0.45, opacity: 0}}
            animate={{scale: 1, opacity: 1}}
            exit={{scale: 1.35, opacity: 0}}
            transition={{duration: 0.32, ease: [0.16, 1, 0.3, 1]}}
            className={`pointer-events-none fixed inset-0 z-30 flex items-center justify-center ${
              isSelfie ? 'bg-slate-950/35' : 'bg-slate-950/20'
            }`}>
            {isSelfie ? (
              <div className="flex h-[clamp(11rem,44vmin,22rem)] w-[clamp(11rem,44vmin,22rem)] items-center justify-center rounded-full bg-slate-950/45 ring-4 ring-white/40 backdrop-blur-sm shadow-2xl">
                <span
                  style={{fontSize: 'clamp(6.5rem, 34vmin, 16rem)'}}
                  className="font-display leading-none font-extrabold text-white drop-shadow-[0_12px_32px_rgba(0,0,0,0.65)] tabular-nums">
                  {countdown}
                </span>
              </div>
            ) : (
              <span
                style={{fontSize: 'clamp(5rem, 28vmin, 14rem)'}}
                className="font-display leading-none font-extrabold text-white drop-shadow-[0_12px_32px_rgba(0,0,0,0.6)] tabular-nums">
                {countdown}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom primary CTA anchored in thumb zone (Classic mode) */}
      <div
        style={{
          paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
          paddingLeft: 'max(0.75rem, env(safe-area-inset-left))',
          paddingRight: 'max(0.75rem, env(safe-area-inset-right))',
        }}
        className="relative z-20 flex shrink-0 justify-center pt-1.5">
        {!isSelfie &&
          isReady &&
          !errorKind &&
          countdown === null &&
          !isCapturing && (
            <button
              type="button"
              onClick={handleStartCountdown}
              style={{
                fontSize: 'clamp(1.15rem, 3.6vmin, 2.2rem)',
                padding:
                  'clamp(0.65rem, 2dvh, 1.25rem) clamp(1.6rem, 6vw, 3.5rem)',
              }}
              className="flex items-center justify-center gap-[clamp(0.6rem,2vw,1rem)] rounded-[1.75rem] bg-[#FF5A36] font-extrabold text-white shadow-[0_8px_0_0_#C93B1D] transition-all hover:bg-[#F34F2B] active:translate-y-1.5 active:shadow-[0_2px_0_0_#C93B1D] sm:rounded-[2rem] whitespace-nowrap">
              <Camera
                style={{
                  width: 'clamp(1.4rem, 3.8vmin, 2.4rem)',
                  height: 'clamp(1.4rem, 3.8vmin, 2.4rem)',
                }}
                className="shrink-0"
                strokeWidth={2.5}
              />
              <span>C’est parti !</span>
            </button>
          )}
      </div>

      {/* Fullscreen white flash overlay */}
      <div
        aria-hidden="true"
        className={`pointer-events-none fixed inset-0 z-50 bg-white transition-opacity duration-300 ${
          isFlashing ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </main>
  );
};
