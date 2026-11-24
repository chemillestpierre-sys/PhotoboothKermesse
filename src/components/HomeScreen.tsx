import {Camera, Lock} from 'lucide-react';
import React, {useEffect, useRef, useState} from 'react';
import {PWAInstallButton} from './PWAInstallButton';

interface HomeScreenProps {
  onStart: () => void;
  onAdminTrigger: () => void;
}

const HOLD_DURATION_MS = 3000;

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onStart,
  onAdminTrigger,
}) => {
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const triggeredRef = useRef(false);

  const cancelHold = () => {
    setIsHolding(false);
    setHoldProgress(0);
    triggeredRef.current = false;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const handleHoldStart = (e: React.PointerEvent) => {
    e.preventDefault();
    if (isHolding) return;
    setIsHolding(true);
    triggeredRef.current = false;
    startTimeRef.current = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const pct = Math.min(1, elapsed / HOLD_DURATION_MS);
      setHoldProgress(pct);
      if (pct >= 1) {
        if (!triggeredRef.current) {
          triggeredRef.current = true;
          cancelHold();
          onAdminTrigger();
        }
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - holdProgress);

  return (
    <main className="relative flex h-dvh w-screen flex-col items-center justify-between overflow-hidden bg-[#FAF8F4] px-6 py-8 select-none sm:px-12 sm:py-10">
      {/* Joyful minimal top bunting geometry (crisp, non-distracting) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 flex justify-center overflow-hidden opacity-90">
        <svg
          viewBox="0 0 1200 64"
          className="h-10 w-full max-w-6xl sm:h-12"
          preserveAspectRatio="none">
          <path
            d="M0 4 Q 300 42 600 10 Q 900 42 1200 4"
            fill="none"
            stroke="#CBD5E1"
            strokeWidth="3"
          />
          <polygon points="90,11 135,14 110,50" fill="#FF5A36" />
          <polygon points="210,20 255,22 230,56" fill="#F59E0B" />
          <polygon points="330,22 375,20 352,55" fill="#0EA5E9" />
          <polygon points="450,15 495,12 472,48" fill="#10B981" />
          <polygon points="705,12 750,15 728,48" fill="#10B981" />
          <polygon points="825,20 870,22 848,55" fill="#0EA5E9" />
          <polygon points="945,22 990,20 968,56" fill="#F59E0B" />
          <polygon points="1065,14 1110,11 1090,50" fill="#FF5A36" />
        </svg>
      </div>

      {/* Top corner row: discreet install button on left (hidden once installed) + 3s long-press admin corner on right */}
      <div className="relative z-20 flex w-full items-start justify-between">
        <div className="pt-2">
          <PWAInstallButton variant="discreet" />
        </div>

        <button
          type="button"
          onPointerDown={handleHoldStart}
          onPointerUp={cancelHold}
          onPointerLeave={cancelHold}
          onPointerCancel={cancelHold}
          onContextMenu={(e) => e.preventDefault()}
          aria-label="Espace bénévole (maintenir 3 secondes)"
          title="Maintenir 3 secondes pour accéder à l'espace bénévole"
          className="relative flex h-16 w-16 touch-none items-center justify-center rounded-2xl text-slate-400 transition-opacity focus:outline-none">
          {isHolding && (
            <svg
              className="absolute inset-0 h-16 w-16 -rotate-90"
              viewBox="0 0 48 48">
              <circle
                cx="24"
                cy="24"
                r={radius}
                fill="none"
                stroke="#E2E8F0"
                strokeWidth="4"
              />
              <circle
                cx="24"
                cy="24"
                r={radius}
                fill="none"
                stroke="#FF5A36"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
              />
            </svg>
          )}
          <Lock
            className={`h-5 w-5 transition-opacity ${
              isHolding ? 'text-[#FF5A36] opacity-100' : 'opacity-25'
            }`}
          />
        </button>
      </div>

      {/* Central focal anchor */}
      <section className="relative z-10 flex max-w-3xl flex-col items-center text-center">
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-[2rem] bg-[#FF5A36]/12 text-[#FF5A36] sm:h-28 sm:w-28">
          <Camera className="h-12 w-12 sm:h-14 sm:w-14" strokeWidth={2.2} />
        </div>

        <h1 className="font-display text-4xl font-extrabold tracking-tight text-slate-900 text-balance sm:text-6xl md:text-7xl">
          Photobooth de la kermesse
        </h1>

        <p className="mt-4 text-lg font-medium text-slate-600 sm:text-2xl">
          École Saint-Pierre · Chemillé-en-Anjou
        </p>

        <button
          type="button"
          onClick={onStart}
          className="mt-10 flex min-h-[88px] items-center justify-center gap-5 rounded-[2rem] bg-[#FF5A36] px-10 py-6 text-2xl font-extrabold text-white shadow-[0_10px_0_0_#C93B1D] transition-all hover:bg-[#F34F2B] active:translate-y-2 active:shadow-[0_2px_0_0_#C93B1D] sm:mt-12 sm:min-h-[104px] sm:px-14 sm:text-4xl whitespace-nowrap">
          <Camera className="h-9 w-9 shrink-0 sm:h-11 sm:w-11" strokeWidth={2.5} />
          <span>Prendre une photo</span>
        </button>
      </section>

      {/* Quiet bottom spacing */}
      <footer className="relative z-10 pb-2 text-center text-sm font-medium text-slate-500 space-y-1">
        <p>Souriez ! Vos photos restent sur la tablette.</p>
        <p className="text-xs text-slate-500">
          Application réalisée par Jean-Michel Robineau – robineau.jm@gmail.com
        </p>
      </footer>
    </main>
  );
};
