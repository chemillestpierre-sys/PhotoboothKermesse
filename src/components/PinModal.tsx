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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm select-none"
      onClick={onCancel}>
      <div
        className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl sm:p-8"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-800">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-slate-900">
                Espace bénévole
              </h2>
              <p className="text-sm text-slate-500">Entrez le code PIN</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Fermer"
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 hover:bg-slate-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* PIN dots */}
        <div
          className={`my-6 flex items-center justify-center gap-4 transition-transform ${
            error ? 'translate-x-1' : ''
          }`}>
          {Array.from({length: expectedPin.length}).map((_, i) => {
            const filled = i < pin.length;
            return (
              <div
                key={i}
                className={`h-5 w-5 rounded-full border-2 transition-colors ${
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
          <p className="mb-4 text-center text-sm font-semibold text-red-600">
            Code incorrect, réessayez.
          </p>
        )}

        {/* Tactile numeric keypad */}
        <div className="grid grid-cols-3 gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => handleDigit(d)}
              className="flex h-16 items-center justify-center rounded-2xl bg-slate-100 font-display text-2xl font-bold text-slate-900 transition hover:bg-slate-200 active:scale-95 tabular-nums">
              {d}
            </button>
          ))}
          <button
            type="button"
            onClick={onCancel}
            className="flex h-16 items-center justify-center rounded-2xl bg-slate-50 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 active:scale-95">
            Annuler
          </button>
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="flex h-16 items-center justify-center rounded-2xl bg-slate-100 font-display text-2xl font-bold text-slate-900 transition hover:bg-slate-200 active:scale-95 tabular-nums">
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            aria-label="Effacer"
            className="flex h-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 transition hover:bg-slate-200 active:scale-95">
            <Delete className="h-6 w-6" />
          </button>
        </div>
      </div>
    </div>
  );
};
