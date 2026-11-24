import {Check, Maximize2, Printer, RotateCcw, X, ZoomIn} from 'lucide-react';
import React, {useRef, useState} from 'react';
import {PendingPhoto} from '../types';

interface PreviewScreenProps {
  photo: PendingPhoto;
  onRetry: () => void;
  onPrint: () => void;
  onFinish: () => void;
}

export const PreviewScreen: React.FC<PreviewScreenProps> = ({
  photo,
  onRetry,
  onPrint,
  onFinish,
}) => {
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  // Pinch-to-zoom & pan state
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({x: 0, y: 0});

  const gestureRef = useRef<{
    mode: 'none' | 'pan' | 'pinch';
    startDist: number;
    startScale: number;
    startX: number;
    startY: number;
    origTx: number;
    origTy: number;
    lastTap: number;
  }>({
    mode: 'none',
    startDist: 0,
    startScale: 1,
    startX: 0,
    startY: 0,
    origTx: 0,
    origTy: 0,
    lastTap: 0,
  });

  const openZoomModal = () => {
    setScale(1);
    setTranslate({x: 0, y: 0});
    setIsZoomOpen(true);
  };

  const closeZoomModal = () => {
    setIsZoomOpen(false);
    setScale(1);
    setTranslate({x: 0, y: 0});
  };

  const getTouchDistance = (t1: React.Touch, t2: React.Touch) =>
    Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      gestureRef.current.mode = 'pinch';
      gestureRef.current.startDist = getTouchDistance(
        e.touches[0],
        e.touches[1],
      );
      gestureRef.current.startScale = scale;
      gestureRef.current.origTx = translate.x;
      gestureRef.current.origTy = translate.y;
    } else if (e.touches.length === 1) {
      const now = Date.now();
      if (now - gestureRef.current.lastTap < 280) {
        // Double tap toggles zoom
        if (scale > 1.1) {
          setScale(1);
          setTranslate({x: 0, y: 0});
        } else {
          setScale(2.2);
          setTranslate({x: 0, y: 0});
        }
        gestureRef.current.lastTap = 0;
        return;
      }
      gestureRef.current.lastTap = now;
      gestureRef.current.mode = 'pan';
      gestureRef.current.startX = e.touches[0].clientX;
      gestureRef.current.startY = e.touches[0].clientY;
      gestureRef.current.origTx = translate.x;
      gestureRef.current.origTy = translate.y;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (gestureRef.current.mode === 'pinch' && e.touches.length === 2) {
      const dist = getTouchDistance(e.touches[0], e.touches[1]);
      const ratio = dist / Math.max(1, gestureRef.current.startDist);
      const nextScale = Math.min(
        4,
        Math.max(1, gestureRef.current.startScale * ratio),
      );
      setScale(nextScale);
      if (nextScale <= 1.02) {
        setTranslate({x: 0, y: 0});
      }
    } else if (
      gestureRef.current.mode === 'pan' &&
      e.touches.length === 1 &&
      scale > 1.02
    ) {
      const dx = e.touches[0].clientX - gestureRef.current.startX;
      const dy = e.touches[0].clientY - gestureRef.current.startY;
      setTranslate({
        x: gestureRef.current.origTx + dx,
        y: gestureRef.current.origTy + dy,
      });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length === 0) {
      gestureRef.current.mode = 'none';
      if (scale <= 1.05) {
        setScale(1);
        setTranslate({x: 0, y: 0});
      }
    } else if (e.touches.length === 1) {
      gestureRef.current.mode = 'pan';
      gestureRef.current.startX = e.touches[0].clientX;
      gestureRef.current.startY = e.touches[0].clientY;
      gestureRef.current.origTx = translate.x;
      gestureRef.current.origTy = translate.y;
    }
  };

  return (
    <main className="app-viewport safe-area-pad flex flex-col overflow-hidden bg-[#FAF8F4] select-none">
      {/* Photo display area — occupies all remaining flexible space without distortion */}
      <div className="flex min-h-0 min-w-0 flex-1 items-center justify-center p-1 sm:p-2">
        <button
          type="button"
          onClick={openZoomModal}
          aria-label="Agrandir la photo en plein écran"
          className="group relative flex h-full w-full min-h-0 min-w-0 max-h-full max-w-full items-center justify-center overflow-hidden focus:outline-none">
          <div className="relative flex h-full w-full min-h-0 min-w-0 items-center justify-center">
            <img
              src={photo.url}
              alt="Votre photo de la kermesse"
              className="max-h-full max-w-full rounded-2xl bg-white object-contain shadow-[0_12px_36px_rgba(15,23,42,0.14)] ring-1 ring-slate-900/10"
            />
            <span className="pointer-events-none absolute right-2 bottom-2 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900/70 text-white backdrop-blur-sm transition group-hover:bg-slate-900 sm:right-3 sm:bottom-3 sm:h-11 sm:w-11">
              <Maximize2 className="h-4 w-4 sm:h-5 sm:w-5" />
            </span>
          </div>
        </button>
      </div>

      {/* Three tactile action buttons always anchored at the bottom */}
      <div className="mx-auto mt-2 grid w-full max-w-4xl shrink-0 grid-cols-3 gap-2 sm:mt-3 sm:gap-4">
        <button
          type="button"
          onClick={onRetry}
          style={{
            minHeight: 'clamp(3.5rem, 10.5dvh, 5.25rem)',
            padding:
              'clamp(0.45rem, 1.3dvh, 0.9rem) clamp(0.35rem, 1.5vw, 1.25rem)',
          }}
          className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-white text-slate-800 shadow-[0_5px_0_0_#CBD5E1] ring-1 ring-slate-200 transition hover:bg-slate-50 active:translate-y-1 active:shadow-[0_2px_0_0_#CBD5E1] sm:flex-row sm:gap-2.5 sm:rounded-3xl">
          <RotateCcw
            style={{
              width: 'clamp(1.2rem, 3.2vmin, 1.65rem)',
              height: 'clamp(1.2rem, 3.2vmin, 1.65rem)',
            }}
            className="shrink-0 text-slate-700"
            strokeWidth={2.4}
          />
          <span
            style={{fontSize: 'clamp(0.78rem, 2.5vmin, 1.25rem)'}}
            className="font-display font-extrabold whitespace-nowrap">
            Recommencer
          </span>
        </button>

        <button
          type="button"
          onClick={onPrint}
          style={{
            minHeight: 'clamp(3.5rem, 10.5dvh, 5.25rem)',
            padding:
              'clamp(0.45rem, 1.3dvh, 0.9rem) clamp(0.35rem, 1.5vw, 1.25rem)',
          }}
          className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-[#0EA5E9] text-white shadow-[0_5px_0_0_#0369A1] transition hover:bg-[#0284C7] active:translate-y-1 active:shadow-[0_2px_0_0_#0369A1] sm:flex-row sm:gap-2.5 sm:rounded-3xl">
          <Printer
            style={{
              width: 'clamp(1.2rem, 3.2vmin, 1.65rem)',
              height: 'clamp(1.2rem, 3.2vmin, 1.65rem)',
            }}
            className="shrink-0"
            strokeWidth={2.4}
          />
          <span
            style={{fontSize: 'clamp(0.78rem, 2.5vmin, 1.25rem)'}}
            className="font-display font-extrabold whitespace-nowrap">
            Imprimer
          </span>
        </button>

        <button
          type="button"
          onClick={onFinish}
          style={{
            minHeight: 'clamp(3.5rem, 10.5dvh, 5.25rem)',
            padding:
              'clamp(0.45rem, 1.3dvh, 0.9rem) clamp(0.35rem, 1.5vw, 1.25rem)',
          }}
          className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-[#10B981] text-white shadow-[0_5px_0_0_#047857] transition hover:bg-[#059669] active:translate-y-1 active:shadow-[0_2px_0_0_#047857] sm:flex-row sm:gap-2.5 sm:rounded-3xl">
          <Check
            style={{
              width: 'clamp(1.2rem, 3.2vmin, 1.65rem)',
              height: 'clamp(1.2rem, 3.2vmin, 1.65rem)',
            }}
            className="shrink-0"
            strokeWidth={2.8}
          />
          <span
            style={{fontSize: 'clamp(0.78rem, 2.5vmin, 1.25rem)'}}
            className="font-display font-extrabold whitespace-nowrap">
            Terminer
          </span>
        </button>
      </div>

      {/* Fullscreen Pinch-to-Zoom viewer */}
      {isZoomOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-slate-950 touch-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}>
          <img
            src={photo.url}
            alt="Photo en plein écran"
            draggable={false}
            style={{
              transform: `translate3d(${translate.x}px, ${translate.y}px, 0) scale(${scale})`,
              transition:
                gestureRef.current.mode === 'none'
                  ? 'transform 150ms ease-out'
                  : 'none',
            }}
            className="max-h-[94dvh] max-w-[96vw] select-none object-contain"
          />

          <div
            style={{
              paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
              paddingLeft: 'max(0.75rem, env(safe-area-inset-left))',
              paddingRight: 'max(0.75rem, env(safe-area-inset-right))',
            }}
            className="pointer-events-none fixed inset-x-0 top-0 flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-2 rounded-2xl bg-slate-900/75 px-3.5 py-2 text-xs font-medium text-white backdrop-blur-md sm:text-sm">
              <ZoomIn className="h-4 w-4 shrink-0" />
              <span>Écartez les doigts pour zoomer</span>
            </div>

            <button
              type="button"
              onClick={closeZoomModal}
              className="pointer-events-auto inline-flex min-h-[48px] items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-bold text-slate-900 shadow-lg transition active:scale-95 sm:text-base">
              <X className="h-5 w-5" />
              <span>Fermer</span>
            </button>
          </div>
        </div>
      )}
    </main>
  );
};
