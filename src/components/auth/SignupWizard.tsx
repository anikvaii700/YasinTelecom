/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useId } from 'react';
import confetti from 'canvas-confetti';
import {
  Store,
  Phone,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  AlertCircle,
  Building2,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { BusinessCategory, SignupFormData } from '../../types/auth';
import { BUSINESS_CATEGORIES, getCategoryInfo } from '../../utils/categories';
import {
  formatBDPhoneDisplay,
  getBDOperator,
  isValidBDMobile,
  normalizeBDMobile,
} from '../../utils/phone';
import {
  generateShopCode,
  validateShopPin,
} from '../../utils/pin';
import { PinInput } from './PinInput';

interface SignupWizardProps {
  onSuccess: () => void;
  onSwitchToLogin: () => void;
}

type WizardStep = 'mobile' | 'name' | 'pin' | 'confirm_pin' | 'preview' | 'success';

export const SignupWizard: React.FC<SignupWizardProps> = ({
  onSuccess,
  onSwitchToLogin,
}) => {
  const { t } = useLanguage();
  const { signupShop, ownedShops } = useAuth();
  const { showToast } = useToast();

  const [step, setStep] = useState<WizardStep>('mobile');
  const [formData, setFormData] = useState<SignupFormData>({
    mobileNumber: '',
    shopName: '',
    pin: '',
    confirmPin: '',
    category: 'general_store',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewShopCode] = useState(() => generateShopCode(ownedShops.length));
  const categorySelectId = useId();

  // Mobile validation
  const normalizedPhone = normalizeBDMobile(formData.mobileNumber);
  const isMobileValid = isValidBDMobile(formData.mobileNumber);
  const operator = getBDOperator(formData.mobileNumber);

  // Shop name validation
  const isShopNameValid = formData.shopName.trim().length >= 3;

  // PIN validation
  const pinValidation = validateShopPin(formData.pin);
  const isPinValid = pinValidation.isValid;
  const isPinMatch = formData.pin === formData.confirmPin && formData.confirmPin.length === 6;

  // Steps array for progress
  const stepsList: { id: WizardStep; label: string }[] = [
    { id: 'mobile', label: t('stepA') },
    { id: 'name', label: t('stepB') },
    { id: 'pin', label: t('stepC') },
    { id: 'confirm_pin', label: t('stepD') },
    { id: 'preview', label: t('stepE') },
    { id: 'success', label: t('stepF') },
  ];

  const currentStepIndex = stepsList.findIndex((s) => s.id === step);

  // Trigger celebration confetti
  const triggerCelebration = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#059669', '#10B981', '#34D399', '#F59E0B'],
      });
    } catch {
      // safe fallback
    }
  };

  const handleCreateShop = async () => {
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await signupShop(formData);
      setStep('success');
      triggerCelebration();
      showToast({
        type: 'success',
        title: t('stepFSuccessTitle'),
        message: `${formData.shopName} - ${t('shopIdLabel')}: ${previewShopCode}`,
      });
    } catch (err: unknown) {
      const errorStr = String(err);
      if (errorStr.includes('DUPLICATE_SHOP_NAME')) {
        setErrorMessage(t('duplicateShopName'));
      } else {
        setErrorMessage(t('invalidCredentials'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* Header & Step Indicator */}
      <div className="p-6 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-emerald-600/10 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 flex items-center justify-center font-bold text-sm">
              {currentStepIndex + 1}
            </span>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {t('signupTitle')}
            </h2>
          </div>
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
          >
            {t('login')} →
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-emerald-600 h-full transition-all duration-300 ease-out"
            style={{ width: `${((currentStepIndex + 1) / stepsList.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Step Content */}
      <div className="p-6 sm:p-8">
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl border border-rose-200 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/30 flex items-start gap-3 text-rose-800 dark:text-rose-200 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
            <div className="flex-1">{errorMessage}</div>
          </div>
        )}

        {/* ---------------- STEP A: MOBILE NUMBER ---------------- */}
        {step === 'mobile' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {t('stepAMobileTitle')}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {t('independentAppNotice')}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t('mobileNumber')} *
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3 flex items-center gap-1.5 text-slate-400 pointer-events-none">
                  <span className="text-base">🇧🇩</span>
                  <span className="text-xs font-mono font-medium text-slate-500 dark:text-slate-400">+88</span>
                </div>
                <input
                  type="tel"
                  inputMode="tel"
                  autoFocus
                  placeholder="01XXXXXXXXX"
                  value={formData.mobileNumber}
                  onChange={(e) => {
                    setErrorMessage(null);
                    setFormData({ ...formData, mobileNumber: e.target.value });
                  }}
                  className="w-full pl-20 pr-12 py-3 text-base font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                />
                {isMobileValid && (
                  <CheckCircle2 className="absolute right-3.5 w-5 h-5 text-emerald-600" />
                )}
              </div>

              {/* Operator Badge & Validation Hint */}
              <div className="flex items-center justify-between min-h-[22px] pt-1">
                {operator ? (
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium border ${operator.bgLight}`}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: operator.color }} />
                    <span>{operator.nameBn} ({operator.name})</span>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400">
                    {t('mobileNumberPlaceholder')}
                  </span>
                )}

                {formData.mobileNumber && !isMobileValid && (
                  <span className="text-xs text-rose-500 font-medium">
                    {t('invalidMobile')}
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              disabled={!isMobileValid}
              onClick={() => setStep('name')}
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <span>{t('nextStep')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ---------------- STEP B: SHOP NAME & CATEGORY ---------------- */}
        {step === 'name' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {t('stepBShopTitle')}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {t('signupSubtitle')}
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t('shopName')} *
                </label>
                <div className="relative">
                  <Store className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    autoFocus
                    placeholder={t('shopNamePlaceholder')}
                    value={formData.shopName}
                    onChange={(e) => {
                      setErrorMessage(null);
                      setFormData({ ...formData, shopName: e.target.value });
                    }}
                    className="w-full pl-11 pr-4 py-3 text-base rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                {!isShopNameValid && formData.shopName.length > 0 && (
                  <span className="text-xs text-rose-500">
                    {t('shopNameMinLength')}
                  </span>
                )}
              </div>

              {/* Business Category Selection */}
              <div className="space-y-2">
                <label htmlFor={categorySelectId} className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t('businessCategory')}
                </label>
                <select
                  id={categorySelectId}
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      category: e.target.value as BusinessCategory,
                    })
                  }
                  className="w-full px-3.5 py-3 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                >
                  {BUSINESS_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.nameBn}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep('mobile')}
                className="py-3 px-4 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-sm font-semibold"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{t('previousStep')}</span>
              </button>
              <button
                type="button"
                disabled={!isShopNameValid}
                onClick={() => setStep('pin')}
                className="flex-1 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <span>{t('nextStep')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ---------------- STEP C: CREATE 6-DIGIT PIN ---------------- */}
        {step === 'pin' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {t('stepCPinTitle')}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {t('sixDigitPin')}
              </p>
            </div>

            <div className="space-y-3">
              <PinInput
                value={formData.pin}
                onChange={(pin) => {
                  setErrorMessage(null);
                  setFormData({ ...formData, pin });
                }}
                hasError={Boolean(formData.pin.length === 6 && !isPinValid)}
                autoFocus
                label={t('sixDigitPin')}
              />

              <div className="text-xs text-slate-500 dark:text-slate-400">
                {pinValidation.isWeak ? (
                  <span className="text-rose-600 font-medium">
                    ⚠️ {t('pinWeakError')}
                  </span>
                ) : (
                  <span>🔒 {t('pinLengthError')}</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep('name')}
                className="py-3 px-4 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-sm font-semibold"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{t('previousStep')}</span>
              </button>
              <button
                type="button"
                disabled={!isPinValid}
                onClick={() => setStep('confirm_pin')}
                className="flex-1 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <span>{t('nextStep')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ---------------- STEP D: CONFIRM PIN ---------------- */}
        {step === 'confirm_pin' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {t('stepDConfirmPinTitle')}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {t('confirmSixDigitPin')}
              </p>
            </div>

            <div className="space-y-3">
              <PinInput
                value={formData.confirmPin}
                onChange={(confirmPin) => {
                  setErrorMessage(null);
                  setFormData({ ...formData, confirmPin });
                }}
                hasError={Boolean(formData.confirmPin.length === 6 && !isPinMatch)}
                autoFocus
                label={t('confirmSixDigitPin')}
              />

              {formData.confirmPin.length === 6 && !isPinMatch && (
                <p className="text-xs text-rose-600 font-medium">
                  {t('pinMismatchError')}
                </p>
              )}
              {isPinMatch && (
                <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>পিন হুবহু মিলেছে!</span>
                </p>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep('pin')}
                className="py-3 px-4 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-sm font-semibold"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{t('previousStep')}</span>
              </button>
              <button
                type="button"
                disabled={!isPinMatch}
                onClick={() => setStep('preview')}
                className="flex-1 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <span>{t('stepEPreviewTitle')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ---------------- STEP E: LIVE SHOP PREVIEW CARD ---------------- */}
        {step === 'preview' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {t('stepEPreviewTitle')}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                দোকান তৈরির আগে নিচের তথ্যগুলো একবার দেখে নিন
              </p>
            </div>

            {/* Live Shop Pass Card */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-lg relative overflow-hidden border border-slate-700">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] tracking-wider uppercase text-emerald-400 font-mono font-bold">
                    {t('appName')}
                  </span>
                  <h4 className="text-2xl font-bold mt-1 text-white">
                    {formData.shopName}
                  </h4>
                  <p className="text-xs text-slate-300 mt-0.5">
                    {getCategoryInfo(formData.category || 'general_store').nameBn}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300">
                  <Store className="w-6 h-6" />
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-slate-700/80 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">{t('shopIdLabel')}</span>
                  <span className="font-mono font-bold text-emerald-400 tracking-wider">
                    {previewShopCode}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">{t('mobileNumber')}</span>
                  <span className="font-mono font-semibold text-slate-200">
                    {formatBDPhoneDisplay(formData.mobileNumber)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">{t('ownerLabel')}</span>
                  <span className="font-medium text-slate-200">স্বত্বাধিকারী (Owner)</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">নিরাপত্তা</span>
                  <span className="font-medium text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>৬-সংখ্যার পিন সুরক্ষিত</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep('confirm_pin')}
                className="py-3 px-4 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-sm font-semibold"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{t('previousStep')}</span>
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleCreateShop}
                className="flex-1 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                {isSubmitting ? (
                  <span>{t('loading')}</span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>{t('confirmAndCreate')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ---------------- STEP F: SUCCESS SCREEN ---------------- */}
        {step === 'success' && (
          <div className="text-center py-6 space-y-6">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {t('stepFSuccessTitle')}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-sm mx-auto">
                <span className="font-semibold text-slate-900 dark:text-slate-100">{formData.shopName}</span>{' '}
                সফলভাবে শুরু হয়েছে। আপনার ৬-সংখ্যার পিন মনে রাখুন।
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 max-w-sm mx-auto text-left space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">{t('shopIdLabel')}:</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{previewShopCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{t('mobileNumber')}:</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">{formatBDPhoneDisplay(formData.mobileNumber)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{t('businessCategory')}:</span>
                <span className="text-slate-800 dark:text-slate-200">{getCategoryInfo(formData.category || 'general_store').nameBn}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onSuccess}
              className="w-full max-w-sm mx-auto py-3.5 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <span>{t('goToDashboard')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
