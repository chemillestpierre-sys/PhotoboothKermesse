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
    <main className="flex h-dvh w-screen flex-col overflow-hidden bg-[#FAF8F4] p-4 select-none sm:p-6 landscape:flex-row landscape:items-center landscape:justify-center landscape:gap-8">
      {/* Photo display area — maximized in both portrait and landscape */}
      <div className="flex min-h-0 flex-1 items-center justify-center landscape:h-full landscape:max-w-[65vw]">
        <button
          type="button"
          onClick={openZoomModal}
          aria-label="Agrandir la photo en plein écran"
          className="group relative flex h-full max-h-full w-auto max-w-full items-center justify-center focus:outline-none">
          <img
            src={photo.url}
            alt="Votre photo de la kermesse"
            className="max-h-full max-w-full rounded-2xl bg-white object-contain shadow-[0_14px_40px_rgba(15,23,42,0.14)] ring-1 ring-slate-900/10"
          />
          <span className="absolute right-3 bottom-3 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900/70 text-white backdrop-blur-sm transition group-hover:bg-slate-900">
            <Maximize2 className="h-5 w-5" />
          </span>
        </button>
      </div>

      {/* Three big tactile action buttons */}
      <div className="mt-4 flex shrink-0 flex-row items-stretch justify-center gap-3 sm:gap-4 landscape:mt-0 landscape:w-72 landscape:flex-col landscape:gap-5">
        <button
          type="button"
          onClick={onRetry}
          className="flex flex-1 min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-3xl bg-white px-4 py-3 text-slate-800 shadow-[0_6px_0_0_#CBD5E1] ring-1 ring-slate-200 transition hover:bg-slate-50 active:translate-y-1 active:shadow-[0_2px_0_0_#CBD5E1] sm:min-h-[84px] sm:flex-row sm:gap-3 sm:px-6 landscape:flex-none landscape:min-h-[84px]">
          <RotateCcw className="h-7 w-7 shrink-0 text-slate-700" strokeWidth={2.4} />
          <span className="font-display text-lg font-extrabold sm:text-xl whitespace-nowrap">
            Recommencer
          </span>
        </button>

        <button
          type="button"
          onClick={onPrint}
          className="flex flex-1 min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-3xl bg-[#0EA5E9] px-4 py-3 text-white shadow-[0_6px_0_0_#0369A1] transition hover:bg-[#0284C7] active:translate-y-1 active:shadow-[0_2px_0_0_#0369A1] sm:min-h-[84px] sm:flex-row sm:gap-3 sm:px-6 landscape:flex-none landscape:min-h-[84px]">
          <Printer className="h-7 w-7 shrink-0" strokeWidth={2.4} />
          <span className="font-display text-lg font-extrabold sm:text-xl whitespace-nowrap">
            Imprimer
          </span>
        </button>

        <button
          type="button"
          onClick={onFinish}
          className="flex flex-1 min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-3xl bg-[#10B981] px-4 py-3 text-white shadow-[0_6px_0_0_#047857] transition hover:bg-[#059669] active:translate-y-1 active:shadow-[0_2px_0_0_#047857] sm:min-h-[84px] sm:flex-row sm:gap-3 sm:px-6 landscape:flex-none landscape:min-h-[84px]">
          <Check className="h-7 w-7 shrink-0" strokeWidth={2.8} />
          <span className="font-display text-lg font-extrabold sm:text-xl whitespace-nowrap">
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
            className="max-h-[96dvh] max-w-[96vw] select-none object-contain"
          />

          <div className="pointer-events-none fixed inset-x-0 top-0 flex items-center justify-between p-4 sm:p-6">
            <div className="inline-flex items-center gap-2 rounded-2xl bg-slate-900/75 px-4 py-2.5 text-sm font-medium text-white backdrop-blur-md">
              <ZoomIn className="h-4 w-4 shrink-0" />
              <span>Écartez les doigts pour zoomer</span>
            </div>

            <button
              type="button"
              onClick={closeZoomModal}
              className="pointer-events-auto inline-flex min-h-[52px] items-center gap-2 rounded-2xl bg-white px-5 py-3 text-base font-bold text-slate-900 shadow-lg transition active:scale-95">
              <X className="h-5 w-5" />
              <span>Fermer</span>
            </button>
          </div>
        </div>
      )}
    </main>
  );
};
