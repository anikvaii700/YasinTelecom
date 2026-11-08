/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useId } from 'react';
import {
  Phone,
  Store,
  Lock,
  ArrowRight,
  AlertCircle,
  AlertTriangle,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { getShopsByOwnerPhone } from '../../services/storage';
import { Shop } from '../../types/auth';
import {
  formatBDPhoneDisplay,
  getBDOperator,
  isValidBDMobile,
  normalizeBDMobile,
} from '../../utils/phone';
import { ForgotPinModal } from './ForgotPinModal';
import { PinInput } from './PinInput';

interface LoginViewProps {
  onSuccess: () => void;
  onSwitchToSignup: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onSuccess,
  onSwitchToSignup,
}) => {
  const { t } = useLanguage();
  const { loginShop, checkLockout } = useAuth();
  const { showToast } = useToast();

  const [mobileNumber, setMobileNumber] = useState('');
  const [availableShops, setAvailableShops] = useState<Shop[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<string>('');
  const [pin, setPin] = useState('');
  const [rememberDevice, setRememberDevice] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutRemaining, setLockoutRemaining] = useState<number>(0);
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const shopSelectId = useId();

  const isMobileValid = isValidBDMobile(mobileNumber);
  const operator = getBDOperator(mobileNumber);

  // Auto-detect shops for this mobile number whenever mobile number changes
  useEffect(() => {
    if (isMobileValid) {
      const shops = getShopsByOwnerPhone(mobileNumber);
      setAvailableShops(shops);
      if (shops.length > 0) {
        setSelectedShopId(shops[0].id);
        // Check if chosen shop is locked
        const lock = checkLockout(shops[0].id);
        if (lock.isLocked) {
          setIsLocked(true);
          setLockoutRemaining(lock.remainingSeconds);
        } else {
          setIsLocked(false);
          setLockoutRemaining(0);
        }
      } else {
        setSelectedShopId('');
      }
    } else {
      setAvailableShops([]);
      setSelectedShopId('');
      setIsLocked(false);
      setLockoutRemaining(0);
    }
  }, [mobileNumber, isMobileValid, checkLockout]);

  // Handle selected shop change and its lockout status
  const handleShopChange = (id: string) => {
    setSelectedShopId(id);
    setPin('');
    setErrorMessage(null);
    const lock = checkLockout(id);
    if (lock.isLocked) {
      setIsLocked(true);
      setLockoutRemaining(lock.remainingSeconds);
    } else {
      setIsLocked(false);
      setLockoutRemaining(0);
    }
  };

  // Lockout countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isLocked && lockoutRemaining > 0) {
      timer = setInterval(() => {
        setLockoutRemaining((prev) => {
          if (prev <= 1) {
            setIsLocked(false);
            setErrorMessage(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isLocked, lockoutRemaining]);

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isMobileValid) {
      setErrorMessage(t('invalidMobile'));
      return;
    }

    if (!selectedShopId) {
      setErrorMessage(t('noShopsFound'));
      return;
    }

    if (pin.length !== 6) {
      setErrorMessage(t('pinLengthError'));
      return;
    }

    setIsLoading(true);
    try {
      const loggedShop = await loginShop(mobileNumber, selectedShopId, pin, rememberDevice);
      showToast({
        type: 'success',
        title: `${loggedShop.name} - ${t('loginTitle')}`,
        message: t('welcomeHeading'),
      });
      onSuccess();
    } catch (err: unknown) {
      const errStr = String(err);
      if (errStr.includes('ACCOUNT_LOCKED')) {
        const secs = parseInt(errStr.split(':')[1] || '900', 10);
        setIsLocked(true);
        setLockoutRemaining(secs);
        setErrorMessage(t('accountLocked'));
      } else if (errStr.includes('INVALID_PIN')) {
        const remaining = errStr.split(':')[1] || '1';
        setErrorMessage(t('remainingAttempts', { n: remaining }));
      } else {
        setErrorMessage(t('invalidCredentials'));
      }
      setPin('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-6 sm:p-8 border-b border-slate-100 dark:border-slate-800">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          {t('loginTitle')}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {t('loginSubtitle')}
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5">
        {/* Lockout Notice */}
        {isLocked && (
          <div className="p-4 rounded-xl border border-rose-300 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>{t('accountLocked')}</span>
            </div>
            <p className="text-xs leading-relaxed text-rose-800 dark:text-rose-300">
              {t('accountLockedDesc')}
            </p>
            <div className="flex items-center gap-2 pt-1 font-mono font-bold text-rose-700 dark:text-rose-300 text-sm">
              <Clock className="w-4 h-4 animate-spin" />
              <span>
                {t('lockoutCountdown')}: {formatCountdown(lockoutRemaining)}
              </span>
            </div>
          </div>
        )}

        {/* Generic Error Notice */}
        {errorMessage && !isLocked && (
          <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/30 flex items-start gap-2.5 text-rose-800 dark:text-rose-200 text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
            <div className="flex-1">{errorMessage}</div>
          </div>
        )}

        {/* 1. Mobile Number */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
            {t('mobileNumber')} *
          </label>
          <div className="relative">
            <div className="absolute left-3 top-3 flex items-center gap-1 text-slate-400 pointer-events-none">
              <span className="text-sm">🇧🇩</span>
              <span className="text-xs font-mono font-medium text-slate-500">+88</span>
            </div>
            <input
              type="tel"
              inputMode="tel"
              placeholder="01XXXXXXXXX"
              value={mobileNumber}
              disabled={isLocked}
              onChange={(e) => {
                setErrorMessage(null);
                setMobileNumber(e.target.value);
              }}
              className="w-full pl-18 pr-10 py-2.5 text-sm font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
            />
            {isMobileValid && (
              <CheckCircle2 className="absolute right-3 top-3 w-4 h-4 text-emerald-600" />
            )}
          </div>

          {/* Operator indicator */}
          <div className="flex items-center justify-between min-h-[18px]">
            {operator && (
              <span className="text-[11px] font-medium text-slate-500">
                {operator.nameBn} ({operator.name})
              </span>
            )}
          </div>
        </div>

        {/* 2. Shop Selection (Appears if multiple shops exist) */}
        {isMobileValid && availableShops.length > 0 && (
          <div className="space-y-1.5 animate-fade-in">
            <label htmlFor={shopSelectId} className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
              {t('selectShop')} *
            </label>
            <div className="relative">
              <Store className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <select
                id={shopSelectId}
                value={selectedShopId}
                disabled={isLocked}
                onChange={(e) => handleShopChange(e.target.value)}
                className="w-full pl-9 pr-8 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600"
              >
                {availableShops.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.shopCode})
                  </option>
                ))}
              </select>
            </div>
            {availableShops.length > 1 && (
              <span className="text-[11px] text-emerald-600 font-medium">
                এই মোবাইল নম্বরে {availableShops.length}টি দোকান সংযুক্ত আছে
              </span>
            )}
          </div>
        )}

        {isMobileValid && availableShops.length === 0 && (
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-200">
            {t('noShopsFound')}। অনুগ্রহ করে নতুন দোকান নিবন্ধন করুন।
          </div>
        )}

        {/* 3. 6-Digit PIN */}
        <div className="space-y-1.5">
          <PinInput
            value={pin}
            onChange={(val) => {
              setErrorMessage(null);
              setPin(val);
            }}
            disabled={isLocked || !selectedShopId}
            label={t('sixDigitPin')}
          />
        </div>

        {/* Remember device & Forgot PIN */}
        <div className="flex items-center justify-between text-xs pt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600 dark:text-slate-400">
            <input
              type="checkbox"
              checked={rememberDevice}
              onChange={(e) => setRememberDevice(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
            />
            <span>{t('rememberDevice')}</span>
          </label>

          <button
            type="button"
            onClick={() => setIsForgotModalOpen(true)}
            className="text-emerald-700 dark:text-emerald-400 hover:underline font-semibold"
          >
            {t('forgotPin')}
          </button>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || isLocked || !isMobileValid || !selectedShopId || pin.length !== 6}
          className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm text-sm"
        >
          {isLoading ? (
            <span>{t('loading')}</span>
          ) : (
            <>
              <span>{t('login')}</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        {/* Switch to Signup */}
        <div className="text-center pt-2">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            নতুন দোকান খুলতে চান?{' '}
            <button
              type="button"
              onClick={onSwitchToSignup}
              className="font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
            >
              {t('signup')}
            </button>
          </p>
        </div>
      </form>

      {/* Forgot PIN Recovery Modal */}
      <ForgotPinModal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        initialMobile={mobileNumber}
      />
    </div>
  );
};
