/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  Phone,
  AlertTriangle,
  KeyRound,
  CheckCircle2,
  Store,
  Terminal,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { getShopsByOwnerPhone } from '../../services/storage';
import { Shop } from '../../types/auth';
import { formatBDPhoneDisplay, isValidBDMobile, normalizeBDMobile } from '../../utils/phone';
import { validateShopPin } from '../../utils/pin';
import { PinInput } from './PinInput';

interface ForgotPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMobile?: string;
}

type ForgotStep = 'input_mobile' | 'select_shop' | 'otp_status' | 'set_new_pin' | 'complete';

export const ForgotPinModal: React.FC<ForgotPinModalProps> = ({
  isOpen,
  onClose,
  initialMobile = '',
}) => {
  const { t } = useLanguage();
  const { resetPin } = useAuth();
  const { showToast } = useToast();

  const [mobile, setMobile] = useState(initialMobile);
  const [matchedShops, setMatchedShops] = useState<Shop[]>([]);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [currentStep, setCurrentStep] = useState<ForgotStep>('input_mobile');
  const [sandboxCode, setSandboxCode] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLookupShops = () => {
    setErrorMessage(null);
    if (!isValidBDMobile(mobile)) {
      setErrorMessage(t('invalidMobile'));
      return;
    }

    const shops = getShopsByOwnerPhone(mobile);
    if (shops.length === 0) {
      setErrorMessage(t('noShopsFound'));
      return;
    }

    setMatchedShops(shops);
    if (shops.length === 1) {
      setSelectedShop(shops[0]);
      setCurrentStep('otp_status');
    } else {
      setCurrentStep('select_shop');
    }
  };

  const handleSelectShop = (shop: Shop) => {
    setSelectedShop(shop);
    setCurrentStep('otp_status');
  };

  const handleVerifySandboxOtp = () => {
    if (sandboxCode === '123456') {
      setCurrentStep('set_new_pin');
      setErrorMessage(null);
    } else {
      setErrorMessage('স্যান্ডবক্স ভেরিফিকেশন কোড ভুল (সঠিক কোড: 123456)');
    }
  };

  const handleSaveNewPin = async () => {
    setErrorMessage(null);
    const validation = validateShopPin(newPin);
    if (!validation.isValid) {
      setErrorMessage(t(validation.errorKey || 'pinLengthError'));
      return;
    }
    if (newPin !== confirmNewPin) {
      setErrorMessage(t('pinMismatchError'));
      return;
    }

    if (selectedShop) {
      await resetPin(selectedShop.id, newPin);
      setCurrentStep('complete');
      showToast({
        type: 'success',
        title: t('pinResetSuccess'),
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
              {t('forgotPinTitle')}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {errorMessage && (
            <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/30 text-rose-800 dark:text-rose-200 text-xs font-medium">
              {errorMessage}
            </div>
          )}

          {/* STEP 1: Enter mobile number */}
          {currentStep === 'input_mobile' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {t('forgotPinDesc')}
              </p>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                  {t('mobileNumber')}
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                  <input
                    type="tel"
                    placeholder="01XXXXXXXXX"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleLookupShops}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition-colors"
              >
                {t('nextStep')}
              </button>
            </div>
          )}

          {/* STEP 2: Multiple shops selection */}
          {currentStep === 'select_shop' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                এই মোবাইল নম্বরে একাধিক দোকান রয়েছে। কোন দোকানের পিন পরিবর্তন করতে চান নির্বাচন করুন:
              </p>

              <div className="space-y-2">
                {matchedShops.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleSelectShop(s)}
                    className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-600 text-left flex items-center justify-between transition-colors bg-slate-50 dark:bg-slate-800/40"
                  >
                    <div className="flex items-center gap-3">
                      <Store className="w-5 h-5 text-emerald-600" />
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {s.name}
                        </h4>
                        <span className="text-xs font-mono text-slate-400">{s.shopCode}</span>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-emerald-600">নির্বাচন করুন →</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: OTP Gateway Status (Requirement: Clearly show OTP is not configured) */}
          {currentStep === 'otp_status' && (
            <div className="space-y-5">
              {/* Explicit SMS Gateway Disconnected Notice */}
              <div className="p-4 rounded-xl border border-amber-300 bg-amber-50/80 dark:border-amber-800 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200">
                <div className="flex items-center gap-2 mb-2 font-bold text-sm">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>{t('otpDeliveryNotConfiguredTitle')}</span>
                </div>
                <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-300">
                  {t('otpDeliveryNotConfiguredDesc')}
                </p>
                <div className="mt-3 p-2.5 rounded-lg bg-white/70 dark:bg-slate-900/70 border border-amber-200 dark:border-amber-900 text-[11px] font-mono space-y-1">
                  <div>// SMS Provider Interface:</div>
                  <div>SMS_PROVIDER: &quot;SSL_WIRELESS&quot; (or GREENWEB / TWILIO)</div>
                  <div>SMS_API_KEY: [NOT CONFIGURED]</div>
                  <div>TARGET_PHONE: &quot;{formatBDPhoneDisplay(mobile)}&quot;</div>
                </div>
              </div>

              {/* OTP Delivery Inactive Notice */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-600 dark:text-slate-400 space-y-2">
                <div className="font-semibold text-slate-800 dark:text-slate-200">
                  নিরাপত্তা নির্দেশিকা:
                </div>
                <p className="text-[11px] leading-relaxed">
                  দোকানের আর্থিক ও সেলস ডাটার নিরাপত্তা নিশ্চিত রাখতে এসএমএস ওটিপি ভেরিফিকেশন ছাড়া পিন পরিবর্তন সাময়িকভাবে স্থগিত রয়েছে। আপনার প্রোফাইল বা অ্যাকাউন্টের পিন রিসেট করার প্রয়োজন হলে রেজিস্টার্ড মোবাইল নম্বর দিয়ে সাপোর্ট বা অ্যাডমিনের সাথে যোগাযোগ করুন।
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-semibold rounded-lg text-xs transition-colors"
                  >
                    লগইন স্ক্রিনে ফিরে যান
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Set New PIN */}
          {currentStep === 'set_new_pin' && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{t('simulateOtpSuccess')} - {selectedShop?.name}</span>
              </div>

              <div className="space-y-3">
                <PinInput
                  value={newPin}
                  onChange={setNewPin}
                  label={t('newPin')}
                  autoFocus
                />
              </div>

              <div className="space-y-3">
                <PinInput
                  value={confirmNewPin}
                  onChange={setConfirmNewPin}
                  label={t('confirmNewPin')}
                />
              </div>

              <button
                type="button"
                onClick={handleSaveNewPin}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition-colors mt-2"
              >
                {t('saveChanges')}
              </button>
            </div>
          )}

          {/* STEP 5: Complete */}
          {currentStep === 'complete' && (
            <div className="text-center py-4 space-y-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {t('pinResetSuccess')}
              </p>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition-colors"
              >
                {t('login')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
