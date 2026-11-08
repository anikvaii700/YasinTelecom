/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Store,
  QrCode,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Receipt,
  Boxes,
  Wallet,
  Settings,
  ShieldCheck,
  PlusCircle,
  Copy,
  Printer,
  Calendar,
  Warehouse,
  AlertTriangle,
  ShoppingBag,
  Users,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { getInventoryValuation, getPurchasesByShop } from '../../services/inventoryStorage';
import { getCategoryInfo } from '../../utils/categories';
import { formatBDPhoneDisplay } from '../../utils/phone';

interface DashboardOverviewProps {
  onNavigate: (module: string) => void;
  onOpenNewShopModal: () => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  onNavigate,
  onOpenNewShopModal,
}) => {
  const { currentShop, currentProfile, ownedShops } = useAuth();
  const { t } = useLanguage();
  const { showToast } = useToast();

  if (!currentShop) return null;

  const categoryInfo = getCategoryInfo(currentShop.category);
  const valuation = getInventoryValuation(currentShop.id);
  const purchases = getPurchasesByShop(currentShop.id);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(currentShop.shopCode);
    showToast({
      type: 'info',
      title: t('copied'),
      message: `${currentShop.shopCode}`,
    });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* 1. Welcome & Shop Identity Hero Card */}
      <div
        className="rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-lg border border-slate-800 transition-all"
        style={{
          background: `linear-gradient(135deg, ${currentShop.brandColor || '#059669'} 0%, #0f172a 100%)`,
        }}
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4 sm:gap-5">
            {/* Shop Logo / Default Icon */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-2 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
              {currentShop.logoUrl ? (
                <img
                  src={currentShop.logoUrl}
                  alt={currentShop.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain"
                />
              ) : (
                <Store className="w-10 h-10 text-white" />
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1 text-xs">
                <span className="font-mono px-2 py-0.5 rounded-md bg-white/20 font-bold tracking-wider text-emerald-200">
                  {currentShop.shopCode}
                </span>
                <span className="text-white/80 font-medium">
                  {categoryInfo.nameBn}
                </span>
                <span className="text-white/60">·</span>
                <span className="text-white/80 font-mono text-[11px]">
                  {formatBDPhoneDisplay(currentShop.mobileNumber)}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                {currentShop.name}
              </h1>

              <p className="text-xs sm:text-sm text-white/90 mt-1 max-w-xl">
                {currentShop.welcomeText || currentShop.description || t('welcomeSubheading')}
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-center">
            <button
              onClick={() => onNavigate('pos')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-slate-900 hover:bg-slate-100 font-extrabold text-xs transition-all shadow-md active:scale-95"
            >
              <Receipt className="w-3.5 h-3.5 text-emerald-600" />
              <span>POS টার্মিনাল</span>
            </button>
            <button
              onClick={() => onNavigate('settings')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-sm text-xs font-semibold transition-all border border-white/20"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>{t('navSettings')}</span>
            </button>
            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-sm text-xs font-semibold transition-all border border-white/20"
              title="Copy Shop Code"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{t('copy')} ID</span>
            </button>
          </div>
        </div>

        {/* Ambient background blur */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 rounded-full bg-white/5 pointer-events-none" />
      </div>

      {/* 2. Key Retail Metric Counters (Live from Step 2 Inventory) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Unique Products */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold">{t('totalItems')}</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 tabular-nums">
              {valuation.totalItems} <span className="text-sm font-sans font-normal text-slate-400">আইটেম</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              ক্যাটালগে সক্রিয় পণ্য
            </span>
          </div>
        </div>

        {/* Total Stock Units */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold">{t('totalStockUnits')}</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Warehouse className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 tabular-nums">
              {valuation.totalStockUnits} <span className="text-sm font-sans font-normal text-slate-400">ইউনিট</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              বর্তমান ইনভেন্টরি ব্যালেন্স
            </span>
          </div>
        </div>

        {/* Stock Valuation */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold">{t('stockValuation')}</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold font-mono text-emerald-600 tabular-nums">
              {valuation.totalValuation.toLocaleString('bn-BD', { minimumFractionDigits: 0 })}{' '}
              <span className="text-sm font-sans font-normal text-slate-400">৳</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              ক্রয় মূল্যে সংরক্ষিত মজুদ
            </span>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold">স্টক সতর্কতা</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold font-mono text-amber-600 tabular-nums">
              {valuation.lowStockCount}{' '}
              <span className="text-sm font-sans font-normal text-slate-400">আইটেম</span>
            </div>
            <span className="text-[11px] text-rose-600 font-semibold mt-1 block">
              {valuation.outOfStockCount > 0 ? `${valuation.outOfStockCount} টি স্টক শেষ!` : 'রি-অর্ডার প্রয়োজন'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Action Shortcuts & Roadmap Architecture */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Launch Cards */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            মডিউল নেভিগেশন ও শর্টকাট
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Shortcut 1: Products (Step 2 Active) */}
            <button
              onClick={() => onNavigate('products')}
              className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-500 text-left transition-all group flex flex-col justify-between shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center">
                    <Boxes className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200">
                    সক্রিয় (Step 2)
                  </span>
                </div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-blue-600 transition-colors">
                  {t('navProducts')}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  পণ্য ক্যাটালগ, মূল্য, বারকোড এবং ভ্যারিয়েন্ট ম্যানেজমেন্ট।
                </p>
              </div>
              <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-blue-600">
                <span>পণ্য ক্যাটালগ খুলুন</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

            {/* Shortcut 2: Inventory (Step 2 Active) */}
            <button
              onClick={() => onNavigate('inventory')}
              className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-500 text-left transition-all group flex flex-col justify-between shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
                    <Warehouse className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200">
                    সক্রিয় (Step 2)
                  </span>
                </div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 transition-colors">
                  {t('navInventory')}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  ইনভেন্টরি ভ্যালুয়েশন, ড্যামেজ ট্র্যাকিং ও স্টক মুভমেন্ট হিস্ট্রি।
                </p>
              </div>
              <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-emerald-600">
                <span>ইনভেন্টরি ড্যাশবোর্ড খুলুন</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

            {/* Shortcut 3: Purchases (Step 2 Active) */}
            <button
              onClick={() => onNavigate('purchases')}
              className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-500 text-left transition-all group flex flex-col justify-between shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 flex items-center justify-center">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200">
                    সক্রিয় (Step 2)
                  </span>
                </div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-purple-600 transition-colors">
                  {t('navPurchases')}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  সরবরাহকারী চালান এন্ট্রি, স্টক-ইন ও পাওনাদার হিসাব।
                </p>
              </div>
              <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-purple-600">
                <span>ক্রয় চালান তালিকা দেখুন</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

            {/* Shortcut 4: Customers & Suppliers (Step 2 Active) */}
            <button
              onClick={() => onNavigate('customers')}
              className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-500 text-left transition-all group flex flex-col justify-between shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200">
                    সক্রিয় (Step 2)
                  </span>
                </div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-teal-600 transition-colors">
                  {t('navCustomers')} ও {t('navSuppliers')}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  বাকি খাতা, বকেয়া আদায় এবং সরবরাহকারী লেজার।
                </p>
              </div>
              <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-teal-600">
                <span>গ্রাহক খাতা খুলুন</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

            {/* Shortcut 5: Shop Branding Settings (Active in Step 1) */}
            <button
              onClick={() => onNavigate('settings')}
              className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-500 text-left transition-all group flex flex-col justify-between shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
                    <Settings className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200">
                    সক্রিয় (Step 1)
                  </span>
                </div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 transition-colors">
                  {t('navSettings')}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  দোকানের লোগো আপলোড, রশিদ হেডার/ফুটার এবং ব্র্যান্ডের রঙ পরিবর্তন।
                </p>
              </div>
              <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-emerald-600">
                <span>সেটিংস ওপেন করুন</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

            {/* Shortcut 4: Add Another Shop (Multi-shop feature) */}
            <button
              onClick={onOpenNewShopModal}
              className="p-4 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 text-left transition-all group flex flex-col justify-between bg-slate-50/50 dark:bg-slate-900/50"
            >
              <div>
                <div className="w-9 h-9 rounded-xl bg-slate-200/60 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center mb-2">
                  <PlusCircle className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 transition-colors">
                  {t('addNewShop')}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  একই মোবাইল নম্বরের অধীনে একাধিক স্বতন্ত্র ব্রাঞ্চ বা দোকান পরিচালনা।
                </p>
              </div>
              <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <span>নতুন দোকান শুরু করুন</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          </div>
        </div>

        {/* Right Column: Security & Tenancy Info */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            নিরাপত্তা ও অ্যাকাউন্ট পরিচিতি
          </h3>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-slate-900 dark:text-slate-100 block">
                  নিরাপদ ৬-সংখ্যার পিন আর্কিটেকচার
                </span>
                <span className="text-[11px] text-slate-500">
                  PBKDF2 SHA-256 এনক্রিপ্টেড
                </span>
              </div>
            </div>

            <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
              <div className="flex justify-between">
                <span className="text-slate-500">মালিকের মোবাইল:</span>
                <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                  {formatBDPhoneDisplay(currentShop.mobileNumber)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">বর্তমান দোকানের সংখ্যা:</span>
                <span className="font-mono font-bold text-emerald-600">
                  {ownedShops.length} টি
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">রেট লিমিটিং সুরক্ষা:</span>
                <span className="text-emerald-700 dark:text-emerald-400 font-medium">সক্রিয় (৫ ভুল পিনে ১৫ মি. লক)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">রশিদ প্রিন্টার সাইজ:</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">
                  {currentShop.receiptFormat}
                </span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => onNavigate('settings')}
                className="w-full py-2 px-3 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 font-semibold text-center hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                রশিদ প্রিভিউ ও সেটিংস
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
