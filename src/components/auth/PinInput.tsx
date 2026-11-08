/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface PinInputProps {
  value: string;
  onChange: (pin: string) => void;
  disabled?: boolean;
  hasError?: boolean;
  autoFocus?: boolean;
  label?: string;
}

export const PinInput: React.FC<PinInputProps> = ({
  value,
  onChange,
  disabled = false,
  hasError = false,
  autoFocus = false,
  label,
}) => {
  const [showPin, setShowPin] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const digits = Array.from({ length: 6 }, (_, i) => value[i] || '');

  const handleChange = (index: number, char: string) => {
    // Only accept numeric digit
    if (char && !/^\d$/.test(char)) return;

    const newDigits = [...digits];
    newDigits[index] = char;
    const combined = newDigits.join('').slice(0, 6);
    onChange(combined);

    // Auto-advance to next input
    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim();
    const cleanNumbers = pasted.replace(/\D/g, '').slice(0, 6);
    if (cleanNumbers) {
      onChange(cleanNumbers);
      const targetIndex = Math.min(cleanNumbers.length, 5);
      inputRefs.current[targetIndex]?.focus();
    }
  };

  return (
    <div className="w-full">
      {label && (
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {label}
          </label>
          <button
            type="button"
            onClick={() => setShowPin(!showPin)}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{showPin ? 'গোপন করুন' : 'পিন দেখুন'}</span>
          </button>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 sm:gap-3" onPaste={handlePaste}>
        {Array.from({ length: 6 }).map((_, i) => {
          const isFilled = Boolean(digits[i]);
          return (
            <input
              key={i}
              ref={(el) => {
                inputRefs.current[i] = el;
              }}
              type={showPin ? 'text' : 'password'}
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={digits[i]}
              disabled={disabled}
              autoFocus={autoFocus && i === 0}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-bold font-mono rounded-xl border transition-all duration-150 outline-none
                ${
                  hasError
                    ? 'border-rose-400 bg-rose-50 text-rose-800 dark:border-rose-700 dark:bg-rose-950/40 dark:text-rose-200 focus:ring-2 focus:ring-rose-500/20'
                    : isFilled
                    ? 'border-emerald-600 bg-emerald-50/50 text-emerald-950 dark:border-emerald-500 dark:bg-emerald-950/30 dark:text-emerald-100 focus:ring-2 focus:ring-emerald-500/20'
                    : 'border-slate-300 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            />
          );
        })}
      </div>
    </div>
  );
};
