/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useId } from 'react';
import {
  Store,
  Upload,
  Trash2,
  RefreshCw,
  Palette,
  Receipt,
  Shield,
  Save,
  CheckCircle2,
  AlertCircle,
  FileText,
  Printer,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  Hash,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { BusinessCategory, Shop } from '../../types/auth';
import { BUSINESS_CATEGORIES, getCategoryInfo } from '../../utils/categories';
import { PinInput } from '../auth/PinInput';
import { validateShopPin } from '../../utils/pin';
import { getInvoiceConfig, saveInvoiceConfig } from '../../services/financeStorage';
import { InvoiceConfig } from '../../types/finance';

const BRAND_PALETTES = [
  { name: 'Emerald Green', hex: '#059669', bgClass: 'bg-emerald-600' },
  { name: 'Classic Indigo', hex: '#4F46E5', bgClass: 'bg-indigo-600' },
  { name: 'Ocean Blue', hex: '#0284C7', bgClass: 'bg-sky-600' },
  { name: 'Amber Sunset', hex: '#D97706', bgClass: 'bg-amber-600' },
  { name: 'Rose Crimson', hex: '#E11D48', bgClass: 'bg-rose-600' },
  { name: 'Slate Neutral', hex: '#475569', bgClass: 'bg-slate-600' },
];

export const ShopSettings: React.FC = () => {
  const { currentShop, updateShop, resetPin } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'general' | 'branding' | 'receipt' | 'invoice' | 'security'>('general');
  const [formData, setFormData] = useState<Partial<Shop>>({
    name: currentShop?.name || '',
    category: currentShop?.category || 'general_store',
    address: currentShop?.address || '',
    mobileNumber: currentShop?.mobileNumber || '',
    email: currentShop?.email || '',
    description: currentShop?.description || '',
    currency: currentShop?.currency || 'BDT',
    language: currentShop?.language || 'bn',
    receiptHeader: currentShop?.receiptHeader || 'বিসমিল্লাহির রাহমানির রাহিম',
    receiptFooter: currentShop?.receiptFooter || 'ধন্যবাদ, আবার আসবেন!',
    receiptFormat: currentShop?.receiptFormat || '80mm',
    brandColor: currentShop?.brandColor || '#059669',
    welcomeText: currentShop?.welcomeText || '',
    logoUrl: currentShop?.logoUrl || '',
  });

  // Invoice configuration state
  const [invoiceConfig, setInvoiceConfig] = useState<InvoiceConfig>(() =>
    currentShop ? getInvoiceConfig(currentShop.id) : {
      prefix: 'MS',
      format: 'PREFIX-YEAR-SEQ',
      currentSequence: 101,
      padding: 6,
    }
  );
  const [isSavingInvoice, setIsSavingInvoice] = useState(false);

  // Fit style for logo
  const [logoFit, setLogoFit] = useState<'contain' | 'cover' | 'circle'>('contain');
  const [isSaving, setIsSaving] = useState(false);

  // Security tab state
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const businessCatSelectId = useId();
  const currencySelectId = useId();
  const languageSelectId = useId();

  if (!currentShop) return null;

  // Handle Logo Upload (PNG, JPG, JPEG, WebP <= 2MB)
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      showToast({
        type: 'error',
        title: t('invalidFileType'),
      });
      return;
    }

    // Check size (2MB = 2 * 1024 * 1024 bytes)
    if (file.size > 2 * 1024 * 1024) {
      showToast({
        type: 'error',
        title: t('fileTooLarge'),
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setFormData((prev) => ({ ...prev, logoUrl: result }));
      showToast({
        type: 'success',
        title: t('logoUploadSuccess'),
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setFormData((prev) => ({ ...prev, logoUrl: '' }));
    showToast({
      type: 'info',
      title: t('logoRemovedSuccess'),
    });
  };

  const handleSaveGeneralOrBranding = async () => {
    setIsSaving(true);
    try {
      await updateShop(formData);
      showToast({
        type: 'success',
        title: t('changesSavedSuccess'),
      });
    } catch {
      showToast({
        type: 'error',
        title: 'Error saving changes',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePin = async () => {
    setPinError(null);
    const valid = validateShopPin(newPin);
    if (!valid.isValid) {
      setPinError(t(valid.errorKey || 'pinLengthError'));
      return;
    }
    if (newPin !== confirmNewPin) {
      setPinError(t('pinMismatchError'));
      return;
    }

    try {
      await resetPin(currentShop.id, newPin);
      setNewPin('');
      setConfirmNewPin('');
      showToast({
        type: 'success',
        title: t('pinResetSuccess'),
      });
    } catch {
      setPinError('Failed to change PIN');
    }
  };

  const handleSaveInvoiceConfig = () => {
    if (!currentShop) return;
    setIsSavingInvoice(true);
    try {
      saveInvoiceConfig(currentShop.id, invoiceConfig);
      showToast({
        type: 'success',
        title: 'ইনভয়েস কনফিগারেশন সংরক্ষিত হয়েছে',
        message: `প্রিফিক্স: ${invoiceConfig.prefix}`,
      });
    } catch {
      showToast({
        type: 'error',
        title: 'কনফিগারেশন সংরক্ষণে সমস্যা হয়েছে',
      });
    } finally {
      setIsSavingInvoice(false);
    }
  };

  const previewInvoiceNumber = () => {
    const year = new Date().getFullYear();
    const seqStr = String(invoiceConfig.currentSequence || 1).padStart(invoiceConfig.padding || 6, '0');
    if (invoiceConfig.format === 'PREFIX-SEQ') {
      return `${invoiceConfig.prefix || 'MS'}-${seqStr}`;
    }
    return `${invoiceConfig.prefix || 'MS'}-${year}-${seqStr}`;
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {t('settingsTitle')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t('settingsSubtitle')}
          </p>
        </div>

        <button
          onClick={activeTab === 'invoice' ? handleSaveInvoiceConfig : handleSaveGeneralOrBranding}
          disabled={isSaving || isSavingInvoice}
          className="self-start sm:self-auto flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-semibold text-sm shadow-sm transition-all"
          style={{ backgroundColor: formData.brandColor || '#059669' }}
        >
          <Save className="w-4 h-4" />
          <span>{isSaving || isSavingInvoice ? t('loading') : t('saveChanges')}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'general'
              ? 'border-emerald-600 text-emerald-600 dark:border-emerald-500 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>{t('generalTab')}</span>
        </button>

        <button
          onClick={() => setActiveTab('branding')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'branding'
              ? 'border-emerald-600 text-emerald-600 dark:border-emerald-500 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Palette className="w-4 h-4" />
          <span>{t('brandingTab')}</span>
        </button>

        <button
          onClick={() => setActiveTab('receipt')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'receipt'
              ? 'border-emerald-600 text-emerald-600 dark:border-emerald-500 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>{t('receiptTab')}</span>
        </button>

        <button
          onClick={() => setActiveTab('invoice')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'invoice'
              ? 'border-emerald-600 text-emerald-600 dark:border-emerald-500 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Hash className="w-4 h-4" />
          <span>ইনভয়েস কনফিগারেশন</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'security'
              ? 'border-emerald-600 text-emerald-600 dark:border-emerald-500 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>{t('securityTab')}</span>
        </button>
      </div>

      {/* ---------------- 1. GENERAL TAB ---------------- */}
      {activeTab === 'general' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
          {/* Shop Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t('shopName')} *
            </label>
            <input
              type="text"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600"
            />
          </div>

          {/* Business Category */}
          <div className="space-y-1.5">
            <label htmlFor={businessCatSelectId} className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t('businessCategory')}
            </label>
            <select
              id={businessCatSelectId}
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value as BusinessCategory })
              }
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600"
            >
              {BUSINESS_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.nameBn}
                </option>
              ))}
            </select>
          </div>

          {/* Mobile Number */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t('mobileNumber')}
            </label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                disabled
                value={formData.mobileNumber || ''}
                className="w-full pl-10 pr-3.5 py-2.5 text-sm font-mono rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500 cursor-not-allowed"
              />
            </div>
            <span className="text-[11px] text-slate-400">মালিকের মোবাইল নম্বর পরিবর্তন অযোগ্য</span>
          </div>

          {/* Shop Email */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t('shopEmail')}
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="email"
                placeholder={t('shopEmailPlaceholder')}
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          {/* Shop Address */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t('shopAddress')}
            </label>
            <div className="relative">
              <MapPin className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder={t('shopAddressPlaceholder')}
                value={formData.address || ''}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          {/* Slogan / Description */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t('shopDescription')}
            </label>
            <textarea
              rows={2}
              placeholder={t('shopDescriptionPlaceholder')}
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600"
            />
          </div>

          {/* Currency & Language */}
          <div className="space-y-1.5">
            <label htmlFor={currencySelectId} className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t('currency')}
            </label>
            <select
              id={currencySelectId}
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            >
              <option value="BDT">৳ BDT (বাংলাদেশি টাকা)</option>
              <option value="USD">$ USD (US Dollar)</option>
              <option value="EUR">€ EUR (Euro)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor={languageSelectId} className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t('languageSelect')}
            </label>
            <select
              id={languageSelectId}
              value={language}
              onChange={(e) => {
                const lang = e.target.value as 'bn' | 'en';
                setLanguage(lang);
                setFormData({ ...formData, language: lang });
              }}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            >
              <option value="bn">বাংলা (Bengali - Default)</option>
              <option value="en">English</option>
            </select>
          </div>

          {/* Negative Stock Policy */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              নেগেটিভ স্টক নীতি (Negative Stock Policy)
            </label>
            <select
              value={formData.negativeStockPolicy || 'allow'}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  negativeStockPolicy: e.target.value as 'allow' | 'block',
                })
              }
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            >
              <option value="allow">স্টক ০ হলেও বিক্রি চালু রাখুন (সতর্কবার্তা সহ)</option>
              <option value="block">স্টক ০ হলে বিক্রয় সম্পূর্ণ ব্লক করুন (সুরক্ষিত)</option>
            </select>
          </div>

          {/* Default VAT / Tax Rate */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              ডিফল্ট ভ্যাট / ট্যাক্স হার (%)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={formData.defaultVatRate ?? 0}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  defaultVatRate: parseFloat(e.target.value) || 0,
                })
              }
              placeholder="0"
              className="w-full px-3.5 py-2.5 text-sm font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600"
            />
          </div>
        </div>
      )}

      {/* ---------------- 2. BRANDING TAB (LOGO & COLORS) ---------------- */}
      {activeTab === 'branding' && (
        <div className="space-y-6">
          {/* Logo Section */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {t('shopLogo')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t('logoHint')}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Logo Preview Container */}
              <div
                className={`w-32 h-32 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-center overflow-hidden relative shadow-sm ${
                  logoFit === 'circle' ? 'rounded-full' : ''
                }`}
              >
                {formData.logoUrl ? (
                  <img
                    src={formData.logoUrl}
                    alt={formData.name || 'Shop Logo'}
                    referrerPolicy="no-referrer"
                    className={`w-full h-full ${
                      logoFit === 'contain'
                        ? 'object-contain p-2'
                        : logoFit === 'cover'
                        ? 'object-cover'
                        : 'object-cover rounded-full'
                    }`}
                  />
                ) : (
                  <div className="text-center p-3 text-slate-400">
                    <Store className="w-8 h-8 mx-auto mb-1 opacity-50" />
                    <span className="text-[11px] block">লোগো নেই</span>
                  </div>
                )}
              </div>

              {/* Action Controls */}
              <div className="space-y-3 flex-1 text-center sm:text-left">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png, image/jpeg, image/jpg, image/webp"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm"
                  >
                    <Upload className="w-4 h-4" />
                    <span>{formData.logoUrl ? t('changeLogo') : t('uploadLogo')}</span>
                  </button>

                  {formData.logoUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="flex items-center gap-1.5 px-3 py-2 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl text-xs font-semibold transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>{t('removeLogo')}</span>
                    </button>
                  )}
                </div>

                {/* Logo Fit Selection */}
                {formData.logoUrl && (
                  <div className="pt-2">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                      {t('logoCropFit')}:
                    </span>
                    <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
                      <button
                        type="button"
                        onClick={() => setLogoFit('contain')}
                        className={`px-3 py-1 rounded-md font-medium transition-all ${
                          logoFit === 'contain'
                            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {t('fitContain')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setLogoFit('cover')}
                        className={`px-3 py-1 rounded-md font-medium transition-all ${
                          logoFit === 'cover'
                            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {t('fitCover')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setLogoFit('circle')}
                        className={`px-3 py-1 rounded-md font-medium transition-all ${
                          logoFit === 'circle'
                            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {t('fitCircle')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Brand Color Palette */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {t('brandColor')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t('brandColorDesc')}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {BRAND_PALETTES.map((color) => {
                const isSelected = formData.brandColor === color.hex;
                return (
                  <button
                    key={color.hex}
                    type="button"
                    onClick={() => setFormData({ ...formData, brandColor: color.hex })}
                    className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all ${
                      isSelected
                        ? 'border-slate-900 dark:border-white shadow-sm ring-2 ring-emerald-500/30'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-400'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded-full ${color.bgClass}`} />
                    <span className="text-slate-800 dark:text-slate-200">{color.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Welcome Text */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <label className="text-sm font-bold text-slate-900 dark:text-slate-100 block">
              {t('welcomeText')}
            </label>
            <input
              type="text"
              value={formData.welcomeText || ''}
              onChange={(e) => setFormData({ ...formData, welcomeText: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600"
            />
          </div>
        </div>
      )}

      {/* ---------------- 3. RECEIPT CUSTOMIZATION TAB ---------------- */}
      {activeTab === 'receipt' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-5">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {t('receiptTab')}
            </h3>

            {/* Receipt Format Width */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t('receiptFormat')}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: '80mm', label: t('thermal80') },
                  { id: '58mm', label: t('thermal58') },
                  { id: 'a4', label: t('slipA4') },
                ].map((fmt) => (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        receiptFormat: fmt.id as '58mm' | '80mm' | 'a4',
                      })
                    }
                    className={`py-2 px-3 text-xs font-medium rounded-xl border transition-all text-center ${
                      formData.receiptFormat === fmt.id
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200 font-bold'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {fmt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Header Message */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t('receiptHeader')}
              </label>
              <input
                type="text"
                placeholder={t('receiptHeaderPlaceholder')}
                value={formData.receiptHeader || ''}
                onChange={(e) => setFormData({ ...formData, receiptHeader: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600"
              />
            </div>

            {/* Footer Message */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t('receiptFooter')}
              </label>
              <textarea
                rows={2}
                placeholder={t('receiptFooterPlaceholder')}
                value={formData.receiptFooter || ''}
                onChange={(e) => setFormData({ ...formData, receiptFooter: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          {/* Live Receipt Paper Simulation */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <span className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1.5">
              <Printer className="w-3.5 h-3.5" />
              <span>{t('liveReceiptPreview')} ({formData.receiptFormat})</span>
            </span>

            {/* Thermal Slip */}
            <div
              className={`w-full max-w-[320px] bg-white text-slate-900 p-5 rounded-lg border border-slate-300 shadow-md font-mono text-xs space-y-3 leading-tight ${
                formData.receiptFormat === '58mm' ? 'max-w-[260px] text-[11px] p-3.5' : ''
              }`}
              style={{
                borderTop: `4px solid ${formData.brandColor || '#059669'}`,
              }}
            >
              {/* Receipt Header Text */}
              {formData.receiptHeader && (
                <div className="text-center font-bold text-slate-600 pb-1 border-b border-dashed border-slate-300">
                  {formData.receiptHeader}
                </div>
              )}

              {/* Logo & Shop Name */}
              <div className="text-center space-y-1">
                {formData.logoUrl && (
                  <img
                    src={formData.logoUrl}
                    alt="Receipt Logo"
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 mx-auto object-contain"
                  />
                )}
                <h4 className="font-bold text-sm tracking-tight">
                  {formData.name || currentShop.name}
                </h4>
                <p className="text-[10px] text-slate-600">
                  {formData.address || 'দোকান ১২, নিউ মার্কেট, ঢাকা'}
                </p>
                <p className="text-[10px] text-slate-600">
                  মোবাইল: {formData.mobileNumber}
                </p>
              </div>

              {/* Meta */}
              <div className="border-t border-b border-dashed border-slate-300 py-1.5 space-y-0.5 text-[10px]">
                <div className="flex justify-between">
                  <span>বিল নং: #INV-00102</span>
                  <span>{new Date().toLocaleDateString('bn-BD')}</span>
                </div>
                <div className="flex justify-between">
                  <span>ক্যাশিয়ার: স্বত্বাধিকারী</span>
                  <span className="text-emerald-700 font-bold">পরিশোধিত</span>
                </div>
              </div>

              {/* Table */}
              <div className="space-y-1">
                <div className="flex justify-between font-bold border-b border-slate-200 pb-0.5 text-[10px]">
                  <span>পণ্য বিবরণ</span>
                  <span>মোট (৳)</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span>১x প্রিমিয়াম সুতি পাঞ্জাবি</span>
                  <span className="tabular-nums">১,৪৫০.০০</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span>২x ম্যাচিং মাস্ক ও ক্যাপ</span>
                  <span className="tabular-nums">২০০.০০</span>
                </div>
              </div>

              {/* Calculations */}
              <div className="border-t border-dashed border-slate-300 pt-1.5 space-y-0.5 text-[11px]">
                <div className="flex justify-between text-slate-600">
                  <span>{t('subtotal')}:</span>
                  <span className="tabular-nums">১,৬৫০.০০</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>{t('discount')}:</span>
                  <span className="tabular-nums">-৫০.০০</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-slate-900 border-t border-slate-400 pt-1">
                  <span>{t('netPayable')}:</span>
                  <span className="tabular-nums">১,৬০০.০০ ৳</span>
                </div>
              </div>

              {/* Footer text */}
              {formData.receiptFooter && (
                <div className="text-center text-[10px] text-slate-600 pt-2 border-t border-dashed border-slate-300">
                  {formData.receiptFooter}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---------------- 4. INVOICE CONFIGURATION TAB ---------------- */}
      {activeTab === 'invoice' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Hash className="w-4 h-4 text-emerald-600" />
                <span>স্বতন্ত্র ইনভয়েস নাম্বারিং কনফিগারেশন</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                আপনার দোকানের প্রতিটি বিক্রির জন্য অনন্য ও ধারাবাহিক ইনভয়েস/মেমো নাম্বার ফরম্যাট নির্ধারণ করুন।
              </p>
            </div>

            {/* Prefix */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                ইনভয়েস প্রিফিক্স (Prefix)
              </label>
              <input
                type="text"
                maxLength={8}
                value={invoiceConfig.prefix}
                onChange={(e) =>
                  setInvoiceConfig({
                    ...invoiceConfig,
                    prefix: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''),
                  })
                }
                placeholder="যেমন: MS, INV, TRD"
                className="w-full px-3.5 py-2.5 text-sm font-mono uppercase rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600"
              />
              <span className="text-[11px] text-slate-400">
                সর্বোচ্চ ৮ অক্ষর (ইংরেজি বর্ণ বা সংখ্যা)।
              </span>
            </div>

            {/* Numbering Format */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                ইনভয়েস ফরম্যাট কাঠামো
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setInvoiceConfig({ ...invoiceConfig, format: 'PREFIX-YEAR-SEQ' })
                  }
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    invoiceConfig.format === 'PREFIX-YEAR-SEQ'
                      ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  <span className="text-xs font-bold block">বছরসহ ফরম্যাট (প্রস্তাবিত)</span>
                  <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-300 block mt-1">
                    {invoiceConfig.prefix || 'MS'}-{new Date().getFullYear()}-000001
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-1">
                    প্রতি বছর নতুন সিকোয়েন্স বা সহজে অডিটযোগ্য
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setInvoiceConfig({ ...invoiceConfig, format: 'PREFIX-SEQ' })
                  }
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    invoiceConfig.format === 'PREFIX-SEQ'
                      ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  <span className="text-xs font-bold block">সংক্ষিপ্ত ধারাবাহিক ফরম্যাট</span>
                  <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-300 block mt-1">
                    {invoiceConfig.prefix || 'MS'}-000001
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-1">
                    সরাসরি প্রিফিক্স ও সংখ্যা সিকোয়েন্স
                  </span>
                </button>
              </div>
            </div>

            {/* Zero Padding & Next Sequence */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  সংখ্যার দৈর্ঘ্য (Padding Digits)
                </label>
                <div className="flex gap-2">
                  {[4, 5, 6, 7].map((digits) => (
                    <button
                      key={digits}
                      type="button"
                      onClick={() => setInvoiceConfig({ ...invoiceConfig, padding: digits })}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                        invoiceConfig.padding === digits
                          ? 'border-emerald-600 bg-emerald-600 text-white'
                          : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                      }`}
                    >
                      {digits} ডিজিট
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  পরবর্তী মেমো ক্রম (Current Sequence)
                </label>
                <input
                  type="number"
                  min={1}
                  value={invoiceConfig.currentSequence}
                  onChange={(e) =>
                    setInvoiceConfig({
                      ...invoiceConfig,
                      currentSequence: Math.max(1, parseInt(e.target.value) || 1),
                    })
                  }
                  className="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleSaveInvoiceConfig}
                disabled={isSavingInvoice}
                className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>{isSavingInvoice ? 'সংরক্ষণ হচ্ছে...' : 'ইনভয়েস সেটিংস সংরক্ষণ করুন'}</span>
              </button>
            </div>
          </div>

          {/* Live Invoice Badge Preview */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-lg space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-400">লাইভ ইনভয়েস প্রিভিউ</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-mono">
                  অনন্য ডুপ্লিকেটরোধী
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-center space-y-2">
                <span className="text-[11px] text-slate-400">পরবর্তী বিক্রয়ে প্রিন্ট হবে:</span>
                <div className="text-2xl sm:text-3xl font-extrabold font-mono tracking-wider text-emerald-400 select-all">
                  {previewInvoiceNumber()}
                </div>
              </div>

              <div className="text-xs text-slate-400 space-y-1.5 border-t border-slate-800 pt-3">
                <div className="flex justify-between">
                  <span>দোকানের কোড:</span>
                  <span className="font-mono text-white">{currentShop.shopCode}</span>
                </div>
                <div className="flex justify-between">
                  <span>নির্ধারিত প্রিফিক্স:</span>
                  <span className="font-mono text-white">{invoiceConfig.prefix}</span>
                </div>
                <div className="flex justify-between">
                  <span>সিরিজ লেন্থ:</span>
                  <span className="font-mono text-white">{invoiceConfig.padding} ডিজিট প্যাডিং</span>
                </div>
                <div className="flex justify-between">
                  <span>ডাবল-ক্লিক সুরক্ষা:</span>
                  <span className="text-emerald-400 font-semibold">Idempotency Guard সক্রিয়</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- 5. SECURITY & PIN TAB ---------------- */}
      {activeTab === 'security' && (
        <div className="max-w-lg mx-auto bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {t('securityTab')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                আপনার ৬-সংখ্যার গোপন শপ পিন পরিবর্তন করুন
              </p>
            </div>
          </div>

          {pinError && (
            <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/30 text-rose-800 dark:text-rose-200 text-xs font-medium">
              {pinError}
            </div>
          )}

          <div className="space-y-4">
            <PinInput
              value={newPin}
              onChange={setNewPin}
              label={t('newPin')}
            />

            <PinInput
              value={confirmNewPin}
              onChange={setConfirmNewPin}
              label={t('confirmNewPin')}
            />

            <button
              type="button"
              onClick={handleChangePin}
              disabled={newPin.length !== 6 || confirmNewPin.length !== 6}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-colors shadow-sm"
            >
              {t('saveChanges')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
