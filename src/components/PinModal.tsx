import {Delete, Lock, X} from 'lucide-react';
import React, {useState} from 'react';

interface PinModalProps {
  expectedPin: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export const PinModal: React.FC<PinModalProps> = ({
  expectedPin,
  onSuccess,
  onCancel,
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handleDigit = (digit: string) => {
    if (pin.length >= expectedPin.length) return;
    const next = pin + digit;
    setPin(next);
    setError(false);

    if (next.length === expectedPin.length) {
      if (next === expectedPin) {
        onSuccess();
      } else {
        setError(true);
        window.setTimeout(() => {
          setPin('');
        }, 450);
      }
    }
  };

  const handleBackspace = () => {
    setError(false);
    setPin((prev) => prev.slice(0, -1));
  };

  return (
    <div
      style={{
        paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
        paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
        paddingLeft: 'max(0.75rem, env(safe-area-inset-left))',
        paddingRight: 'max(0.75rem, env(safe-area-inset-right))',
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-sm select-none"
      onClick={onCancel}>
      <div
        className="max-h-[94dvh] w-full max-w-sm overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-7"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-800 sm:h-11 sm:w-11">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900 sm:text-xl">
                Espace bénévole
              </h2>
              <p className="text-xs text-slate-500 sm:text-sm">Entrez le code PIN</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Fermer"
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 hover:bg-slate-200 sm:h-11 sm:w-11">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* PIN dots */}
        <div
          className={`my-4 flex items-center justify-center gap-4 transition-transform sm:my-6 ${
            error ? 'translate-x-1' : ''
          }`}>
          {Array.from({length: expectedPin.length}).map((_, i) => {
            const filled = i < pin.length;
            return (
              <div
                key={i}
                className={`h-4 w-4 rounded-full border-2 transition-colors sm:h-5 sm:w-5 ${
                  error
                    ? 'border-red-500 bg-red-500'
                    : filled
                      ? 'border-slate-900 bg-slate-900'
                      : 'border-slate-300 bg-white'
                }`}
              />
            );
          })}
        </div>

        {error && (
          <p className="mb-3 text-center text-sm font-semibold text-red-600">
            Code incorrect, réessayez.
          </p>
        )}

        {/* Tactile numeric keypad */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => handleDigit(d)}
              style={{height: 'clamp(2.75rem, 11dvh, 4rem)'}}
              className="flex items-center justify-center rounded-2xl bg-slate-100 font-display text-xl font-bold text-slate-900 transition hover:bg-slate-200 active:scale-95 tabular-nums sm:text-2xl">
              {d}
            </button>
          ))}
          <button
            type="button"
            onClick={onCancel}
            style={{height: 'clamp(2.75rem, 11dvh, 4rem)'}}
            className="flex items-center justify-center rounded-2xl bg-slate-50 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 active:scale-95">
            Annuler
          </button>
          <button
            type="button"
            onClick={() => handleDigit('0')}
            style={{height: 'clamp(2.75rem, 11dvh, 4rem)'}}
            className="flex items-center justify-center rounded-2xl bg-slate-100 font-display text-xl font-bold text-slate-900 transition hover:bg-slate-200 active:scale-95 tabular-nums sm:text-2xl">
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            aria-label="Effacer"
            style={{height: 'clamp(2.75rem, 11dvh, 4rem)'}}
            className="flex items-center justify-center rounded-2xl bg-slate-100 text-slate-700 transition hover:bg-slate-200 active:scale-95">
            <Delete className="h-6 w-6" />
          </button>
        </div>
      </div>
    </div>
  );
};
