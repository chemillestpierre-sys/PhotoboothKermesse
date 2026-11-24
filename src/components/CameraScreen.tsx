import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  RefreshCw,
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
  const streamRef = useRef<MediaStream | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [errorKind, setErrorKind] = useState<CameraErrorKind>(null);
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

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

      if (settings.cameraDeviceId) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              deviceId: {exact: settings.cameraDeviceId},
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
                facingMode: {ideal: settings.cameraFacing},
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
      } else if (settings.cameraFacing === 'environment') {
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
              facingMode: {ideal: 'user'},
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
            notice = 'Caméra frontale absente : caméra disponible utilisée.';
          } else {
            throw err;
          }
        }
      }

      if (!notice && !settings.cameraDeviceId && settings.cameraFacing === 'environment') {
        const trackFacing = stream.getVideoTracks()[0]?.getSettings().facingMode;
        if (trackFacing === 'user') {
          notice = 'Caméra arrière absente : caméra disponible utilisée.';
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
  }, [settings.cameraDeviceId, settings.cameraFacing, stopStream]);

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
      composePhotoBlob(video, settings)
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
  }, [onCaptured, settings, stopStream]);

  const handleStartCountdown = () => {
    if (!isReady || countdown !== null || isCapturing) return;
    unlockAudio();

    if (settings.countdownSeconds <= 0) {
      captureNow();
      return;
    }

    const total = settings.countdownSeconds;
    setCountdown(total);
    playCountdownBeep(total === 1);
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
    <main className="relative flex h-dvh w-screen flex-col justify-between overflow-hidden bg-slate-950 select-none">
      {/* Fullscreen live video feed (never mirrored) */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        onLoadedMetadata={() => setIsReady(true)}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
          isReady && !errorKind ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Subtle framing corner guides */}
      {isReady && !errorKind && countdown === null && !isCapturing && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center p-6 sm:p-10">
          <div className="relative h-full max-h-[82dvh] aspect-[3/4] max-w-[88vw]">
            <div className="absolute top-0 left-0 h-10 w-10 rounded-tl-2xl border-t-4 border-l-4 border-white/55" />
            <div className="absolute top-0 right-0 h-10 w-10 rounded-tr-2xl border-t-4 border-r-4 border-white/55" />
            <div className="absolute bottom-0 left-0 h-10 w-10 rounded-bl-2xl border-b-4 border-l-4 border-white/55" />
            <div className="absolute bottom-0 right-0 h-10 w-10 rounded-br-2xl border-b-4 border-r-4 border-white/55" />
          </div>
        </div>
      )}

      {/* Top bar: Back button + discreet fallback notice if rear camera unavailable */}
      <div className="relative z-20 flex items-start justify-between gap-3 p-4 sm:p-6">
        {countdown === null && !isCapturing ? (
          <button
            type="button"
            onClick={() => {
              stopStream();
              onBack();
            }}
            className="inline-flex min-h-[52px] items-center gap-2.5 rounded-2xl bg-slate-900/65 px-5 py-3 text-base font-bold text-white backdrop-blur-md transition hover:bg-slate-900/80 active:scale-95">
            <ArrowLeft className="h-6 w-6 shrink-0" />
            <span>Retour</span>
          </button>
        ) : (
          <div />
        )}

        {fallbackNotice && isReady && !errorKind && (
          <div className="rounded-2xl bg-slate-900/65 px-3.5 py-2 text-xs font-medium text-white/90 backdrop-blur-md sm:text-sm">
            {fallbackNotice}
          </div>
        )}
      </div>

      {/* Loading state */}
      {isLoading && !errorKind && (
        <div className="relative z-20 flex flex-1 items-center justify-center">
          <div className="rounded-3xl bg-slate-900/80 px-8 py-6 text-center text-white backdrop-blur-md">
            <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-white/30 border-t-white" />
            <p className="font-display text-xl font-bold">
              Ouverture de l’appareil photo…
            </p>
          </div>
        </div>
      )}

      {/* Camera error state */}
      {errorKind && (
        <div className="relative z-20 flex flex-1 items-center justify-center p-6">
          <div className="w-full max-w-lg rounded-3xl bg-white p-7 text-slate-900 shadow-2xl sm:p-9">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                <AlertTriangle className="h-8 w-8" />
              </div>
              <h2 className="font-display text-2xl font-extrabold text-slate-900 sm:text-3xl">
                {renderErrorContent().title}
              </h2>
            </div>

            <ol className="mt-6 space-y-3 text-base leading-relaxed text-slate-700 sm:text-lg">
              {renderErrorContent().steps.map((step, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-800">
                    {idx + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => void startCamera()}
                className="flex flex-1 min-h-[56px] items-center justify-center gap-2.5 rounded-2xl bg-[#FF5A36] px-6 py-3.5 text-lg font-bold text-white transition hover:bg-[#F34F2B] active:scale-[0.98]">
                <RefreshCw className="h-5 w-5" />
                <span>Réessayer</span>
              </button>
              <button
                type="button"
                onClick={onBack}
                className="flex flex-1 min-h-[56px] items-center justify-center gap-2 rounded-2xl bg-slate-100 px-6 py-3.5 text-lg font-bold text-slate-700 transition hover:bg-slate-200 active:scale-[0.98]">
                <span>Accueil</span>
              </button>
            </div>
          </div>
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
            className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center bg-slate-950/20">
            <span className="font-display text-[11rem] leading-none font-extrabold text-white drop-shadow-[0_12px_32px_rgba(0,0,0,0.6)] sm:text-[15rem] tabular-nums">
              {countdown}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom primary CTA */}
      <div className="relative z-20 flex justify-center px-6 pb-8 pt-4 sm:pb-10">
        {isReady && !errorKind && countdown === null && !isCapturing && (
          <button
            type="button"
            onClick={handleStartCountdown}
            className="flex min-h-[84px] items-center justify-center gap-4 rounded-[2rem] bg-[#FF5A36] px-12 py-5 text-3xl font-extrabold text-white shadow-[0_10px_0_0_#C93B1D] transition-all hover:bg-[#F34F2B] active:translate-y-2 active:shadow-[0_2px_0_0_#C93B1D] sm:min-h-[96px] sm:px-16 sm:text-4xl whitespace-nowrap">
            <Camera className="h-9 w-9 shrink-0 sm:h-10 sm:w-10" strokeWidth={2.5} />
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
