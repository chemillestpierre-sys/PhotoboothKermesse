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
    <main className="home-screen select-none">
      {/* Top corner row: discreet install button on left (hidden once installed) + 3s long-press admin corner on right */}
      <div className="home-top-actions">
        <div>
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

      {/* Joyful minimal top bunting band (6% landscape / 5% portrait) */}
      <div aria-hidden="true" className="home-bunting opacity-90">
        <svg
          viewBox="0 0 1200 64"
          className="h-full w-full max-w-6xl"
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

      {/* Main layout: 2 columns in landscape (55% / 45%), vertical rows in portrait */}
      <div className="home-content">
        {/* Left column (landscape) / 45% row (portrait): Graines d'Artistes theme logo */}
        <div className="home-theme-logo-slot">
          <div className="home-theme-logo-box">
            <img
              src={themeLogoUrl}
              alt="Logo du thème Graines d’Artistes 2026.2027"
              referrerPolicy="no-referrer"
              className="home-img rounded-2xl sm:rounded-3xl"
            />
          </div>
        </div>

        {/* Right column (landscape) / split into 25% + 20% + 5% tracks (portrait) */}
        <div className="home-right-col">
          <div className="home-brand-block">
            <div className="home-school-logo-box">
              <img
                src="/logo-ecole.svg"
                alt="Logo École Saint-Pierre"
                referrerPolicy="no-referrer"
                className="home-img"
              />
            </div>

            <h1 className="home-title font-display font-extrabold tracking-tight text-slate-900 text-balance">
              Photobooth de la kermesse
            </h1>

            <p className="home-subtitle font-medium text-slate-600">
              École Saint-Pierre · Chemillé-en-Anjou
            </p>
          </div>

          <div className="home-cta-slot">
            <button
              type="button"
              onClick={onStart}
              className="home-cta-btn flex items-center justify-center rounded-[1.75rem] bg-[#FF5A36] font-extrabold text-white shadow-[0_8px_0_0_#C93B1D] transition-all hover:bg-[#F34F2B] active:translate-y-1.5 active:shadow-[0_2px_0_0_#C93B1D] sm:rounded-[2rem] whitespace-nowrap">
              <Camera className="home-cta-icon shrink-0" strokeWidth={2.5} />
              <span>Prendre une photo</span>
            </button>
          </div>

          <footer className="home-credit text-center font-medium text-slate-500">
            Application réalisée par Jean-Michel Robineau – robineau.jm@gmail.com
          </footer>
        </div>
      </div>
    </main>
  );
};
