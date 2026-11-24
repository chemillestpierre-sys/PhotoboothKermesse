import {Camera, Lock} from 'lucide-react';
import React, {useEffect, useRef, useState} from 'react';
import themeLogoUrl from '../assets/images/logo_graines_artistes_1795511260781.jpg';
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
    <main className="app-viewport safe-area-pad relative flex flex-col items-center justify-between select-none">
      {/* Joyful minimal top bunting geometry (crisp, non-distracting) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 flex justify-center overflow-hidden opacity-90">
        <svg
          viewBox="0 0 1200 64"
          className="h-7 w-full max-w-6xl sm:h-11"
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
      <div className="relative z-20 flex w-full shrink-0 items-start justify-between">
        <div className="pt-1">
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
          className="relative flex h-12 w-12 touch-none items-center justify-center rounded-2xl text-slate-400 transition-opacity focus:outline-none sm:h-14 sm:w-14">
          {isHolding && (
            <svg
              className="absolute inset-0 h-full w-full -rotate-90"
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

      {/* Central focal anchor occupying remaining flexible space */}
      <section className="relative z-10 flex min-h-0 w-full max-w-3xl flex-1 flex-col items-center justify-center gap-[clamp(0.4rem,1.8dvh,1.25rem)] px-2 text-center">
        {/* School & Kermesse theme logos */}
        <div className="flex shrink-0 items-center justify-center gap-[clamp(0.75rem,3vw,1.75rem)]">
          <div
            style={{
              width: 'clamp(3.75rem, 16dvh, 8.75rem)',
              height: 'clamp(3.75rem, 16dvh, 8.75rem)',
            }}
            className="flex items-center justify-center overflow-hidden rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-slate-900/8 sm:rounded-3xl sm:p-2">
            <img
              src="/logo-ecole.svg"
              alt="Logo École Saint-Pierre"
              referrerPolicy="no-referrer"
              className="h-full w-full object-contain"
            />
          </div>
          <div
            style={{
              width: 'clamp(3.75rem, 16dvh, 8.75rem)',
              height: 'clamp(3.75rem, 16dvh, 8.75rem)',
            }}
            className="flex items-center justify-center overflow-hidden rounded-2xl bg-white p-1 shadow-sm ring-1 ring-slate-900/8 sm:rounded-3xl sm:p-1.5">
            <img
              src={themeLogoUrl}
              alt="Logo du thème Graines d’Artistes 2026.2027"
              referrerPolicy="no-referrer"
              className="h-full w-full object-contain"
            />
          </div>
        </div>

        <h1
          style={{fontSize: 'clamp(1.35rem, 4.8vmin, 3.75rem)', lineHeight: 1.08}}
          className="font-display font-extrabold tracking-tight text-slate-900 text-balance">
          Photobooth de la kermesse
        </h1>

        <p
          style={{fontSize: 'clamp(0.85rem, 2.4vmin, 1.375rem)'}}
          className="font-medium text-slate-600">
          École Saint-Pierre · Chemillé-en-Anjou
        </p>

        <button
          type="button"
          onClick={onStart}
          style={{
            fontSize: 'clamp(1.1rem, 3.5vmin, 2.2rem)',
            padding:
              'clamp(0.7rem, 2.1dvh, 1.35rem) clamp(1.35rem, 5vw, 3.25rem)',
          }}
          className="mt-1 flex shrink-0 items-center justify-center gap-[clamp(0.6rem,2vw,1.25rem)] rounded-[1.75rem] bg-[#FF5A36] font-extrabold text-white shadow-[0_8px_0_0_#C93B1D] transition-all hover:bg-[#F34F2B] active:translate-y-1.5 active:shadow-[0_2px_0_0_#C93B1D] sm:rounded-[2rem] whitespace-nowrap">
          <Camera
            style={{
              width: 'clamp(1.35rem, 3.8vmin, 2.5rem)',
              height: 'clamp(1.35rem, 3.8vmin, 2.5rem)',
            }}
            className="shrink-0"
            strokeWidth={2.5}
          />
          <span>Prendre une photo</span>
        </button>
      </section>

      {/* Quiet bottom spacing */}
      <footer
        style={{fontSize: 'clamp(0.68rem, 1.7vmin, 0.875rem)'}}
        className="relative z-10 shrink-0 space-y-0.5 text-center font-medium text-slate-500">
        <p>Souriez ! Vos photos restent sur la tablette.</p>
        <p className="opacity-90">
          Application réalisée par Jean-Michel Robineau – robineau.jm@gmail.com
        </p>
      </footer>
    </main>
  );
};
