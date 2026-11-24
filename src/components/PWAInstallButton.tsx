import {Download, Share, X} from 'lucide-react';
import React, {useState} from 'react';
import {usePWAInstall} from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'discreet' | 'admin';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'discreet',
}) => {
  const {isInstallable, isInstalled, isIOS, install} = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        className={
          variant === 'admin'
            ? 'inline-flex items-center gap-2.5 rounded-2xl bg-sky-600 px-5 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-sky-700 active:scale-[0.98] whitespace-nowrap shrink-0 min-h-[48px]'
            : 'inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/90 px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-white active:scale-[0.98] whitespace-nowrap shrink-0 min-h-[44px]'
        }>
        <Download className="h-4 w-4 shrink-0" />
        <span>Installer sur la tablette</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={
            variant === 'admin'
              ? 'inline-flex items-center gap-2.5 rounded-2xl bg-sky-600 px-5 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-sky-700 active:scale-[0.98] whitespace-nowrap shrink-0 min-h-[48px]'
              : 'inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/90 px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-white active:scale-[0.98] whitespace-nowrap shrink-0 min-h-[44px]'
          }>
          <Share className="h-4 w-4 shrink-0" />
          <span>Installer sur iPad</span>
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm sm:p-6"
            onClick={() => setShowIOSGuide(false)}>
            <div
              className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-7"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start justify-between gap-4">
                <h3 className="font-display text-2xl font-bold text-slate-900">
                  Installer sur l’écran d’accueil
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Fermer"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 hover:bg-slate-200">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <ol className="mt-5 space-y-4 text-base leading-relaxed text-slate-700">
                <li className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sm font-bold text-sky-800">
                    1
                  </span>
                  <span>
                    Appuyez sur le bouton <strong>Partager</strong> (le carré
                    avec une flèche vers le haut) dans la barre de Safari.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sm font-bold text-sky-800">
                    2
                  </span>
                  <span>
                    Faites défiler et choisissez{' '}
                    <strong>Sur l’écran d’accueil</strong>, puis validez.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sm font-bold text-sky-800">
                    3
                  </span>
                  <span>
                    Ouvrez ensuite l’application depuis l’icône sur l’écran
                    d’accueil pour un affichage plein écran sans internet.
                  </span>
                </li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-7 w-full rounded-2xl bg-slate-900 py-3.5 text-base font-semibold text-white transition hover:bg-slate-800 min-h-[48px]">
                J’ai compris
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
