/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Database,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCw,
  Copy,
  ExternalLink,
  ShieldCheck,
  Server,
  X,
  Layers,
  ArrowUpRight,
  MessageSquareOff,
  CloudUpload,
} from 'lucide-react';
import { verifySupabaseConnection, SupabaseHealthReport, isSupabaseConfigured } from '../../services/supabase';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import {
  getCategoriesByShop,
  getCustomersByShop,
  getProductsByShop,
  getPurchasesByShop,
  getSuppliersByShop,
} from '../../services/inventoryStorage';
import { getSupabaseClient } from '../../services/supabase';

interface SupabaseStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseStatusModal: React.FC<SupabaseStatusModalProps> = ({ isOpen, onClose }) => {
  const { showToast } = useToast();
  const { currentShop } = useAuth();
  const [report, setReport] = useState<SupabaseHealthReport | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [otpInfo, setOtpInfo] = useState<{ enabled: boolean; message: string }>({
    enabled: false,
    message: 'রিয়েল এসএমএস গেটওয়ে এখনো কনফিগার করা হয়নি। ফোন ওটিপি রিকভারি নিষ্ক্রিয় রয়েছে।',
  });

  const checkStatus = async () => {
    setIsChecking(true);
    try {
      const data = await verifySupabaseConnection();
      setReport(data);

      // Check OTP status from backend
      try {
        const otpRes = await fetch('/api/auth/otp-status');
        if (otpRes.ok) {
          const otpData = await otpRes.json();
          setOtpInfo(otpData);
        }
      } catch {
        // use default
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'যাচাই ব্যর্থ',
        message: err.message || 'Supabase সংযোগ যাচাইয়ে সমস্যা হয়েছে।',
      });
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkStatus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast({
      type: 'success',
      title: 'কপি হয়েছে',
      message: `${label} ক্লিপবোর্ডে কপি করা হয়েছে।`,
    });
  };

  const handleSyncToCloud = async () => {
    if (!currentShop) {
      showToast({ type: 'warning', title: 'দোকান নেই', message: 'সিঙ্ক করার জন্য একটি দোকান সক্রিয় থাকতে হবে।' });
      return;
    }

    const client = getSupabaseClient();
    if (!client) {
      showToast({
        type: 'error',
        title: 'সংযোগ নেই',
        message: 'Supabase প্রজেক্ট URL ও Publishable Key কনফিগার করা না থাকলে ক্লাউডে সিঙ্ক করা যাবে না।',
      });
      return;
    }

    setIsSyncing(true);
    try {
      // 1. Sync Shop info
      await client.from('shops').upsert({
        id: currentShop.id,
        shop_code: currentShop.shopCode,
        name: currentShop.name,
        slug: currentShop.slug,
        category: currentShop.category,
        mobile_number: currentShop.mobileNumber,
        receipt_format: currentShop.receiptFormat,
        brand_color: currentShop.brandColor,
        is_active: currentShop.isActive,
      });

      // 2. Sync Categories
      const categories = getCategoriesByShop(currentShop.id);
      if (categories.length > 0) {
        const catPayload = categories.map((c) => ({
          id: c.id,
          shop_id: c.shopId,
          parent_id: c.parentId || null,
          name_bn: c.nameBn,
          name_en: c.nameEn,
          slug: c.slug,
          description: c.description || null,
          icon_name: c.iconName || 'Folder',
          is_active: c.isActive,
        }));
        await client.from('categories').upsert(catPayload);
      }

      // 3. Sync Products
      const products = getProductsByShop(currentShop.id);
      if (products.length > 0) {
        const prodPayload = products.map((p) => ({
          id: p.id,
          shop_id: p.shopId,
          category_id: p.categoryId || null,
          supplier_id: p.supplierId || null,
          name_bn: p.nameBn,
          name_en: p.nameEn,
          sku: p.sku,
          barcode: p.barcode || null,
          purchase_price: p.purchasePrice,
          selling_price: p.sellingPrice,
          wholesale_price: p.wholesalePrice || null,
          unit: p.unit,
          min_stock_level: p.minStockLevel,
          current_stock: p.currentStock,
          avg_purchase_cost: p.avgPurchaseCost || p.purchasePrice,
          is_active: p.isActive,
        }));
        await client.from('products').upsert(prodPayload);
      }

      // 4. Sync Customers
      const customers = getCustomersByShop(currentShop.id);
      if (customers.length > 0) {
        const custPayload = customers.map((c) => ({
          id: c.id,
          shop_id: c.shopId,
          name: c.name,
          mobile_number: c.mobileNumber,
          address: c.address || null,
          opening_balance: c.openingBalance,
          current_due: c.currentDue,
          total_purchases: c.totalPurchases,
          is_active: c.isActive,
        }));
        await client.from('customers').upsert(custPayload);
      }

      // 5. Sync Suppliers
      const suppliers = getSuppliersByShop(currentShop.id);
      if (suppliers.length > 0) {
        const supPayload = suppliers.map((s) => ({
          id: s.id,
          shop_id: s.shopId,
          name: s.name,
          contact_person: s.contactPerson || null,
          phone: s.phone,
          address: s.address || null,
          opening_payable: s.openingPayable,
          current_payable: s.currentPayable,
          total_purchases: s.totalPurchases,
          is_active: s.isActive,
        }));
        await client.from('suppliers').upsert(supPayload);
      }

      showToast({
        type: 'success',
        title: 'ক্লাউড সিঙ্ক সম্পন্ন',
        message: 'বর্তমান দোকানের সকল তথ্য Supabase ক্লাউড ডাটাবেজে সফলভাবে সিঙ্ক হয়েছে।',
      });
      await checkStatus();
    } catch (err: any) {
      console.error('Cloud sync error:', err);
      showToast({
        type: 'error',
        title: 'সিঙ্ক ত্রুটি',
        message: err.message || 'ক্লাউড সিঙ্কে সমস্যা হয়েছে। টেবিল ও RLS রুলস নিশ্চিত করুন।',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const configured = report?.isConfigured || isSupabaseConfigured();
  const isHealthy = report?.connected && report?.missingTables.length === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-600/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 flex items-center justify-center">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Supabase ক্লাউড ইন্টিগ্রেশন স্ট্যাটাস
                </h2>
                {isHealthy ? (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    সক্রিয়
                  </span>
                ) : configured ? (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                    মাইগ্রেশন প্রয়োজন
                  </span>
                ) : (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300">
                    কনফিগারেশন বাকি
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                MoSaFa Shop POS — ক্লাউড ডাটাবেজ সংযোগ ও রিয়েলটাইম সিঙ্ক ডায়াগনস্টিক
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {/* Status Banner */}
          <div
            className={`p-4 rounded-2xl border flex items-start gap-3.5 ${
              isHealthy
                ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200'
                : configured
                ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200'
                : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {isHealthy ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              ) : configured ? (
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              ) : (
                <Database className="w-5 h-5 text-slate-500" />
              )}
            </div>
            <div className="space-y-1 text-xs">
              <span className="font-bold text-sm block">
                {report ? report.message : 'সংযোগ যাচাই করা হচ্ছে...'}
              </span>
              <p className="opacity-90">
                {isHealthy
                  ? 'আপনার Supabase প্রজেক্ট সঠিকভাবে সংযুক্ত হয়েছে। সকল প্রয়োজনীয় টেবিল ও পলিসি সক্রিয় আছে।'
                  : configured
                  ? 'প্রজেক্ট URL ও কী সনাক্ত হয়েছে। টেবিল তৈরি করতে SQL Editor-এ মাইগ্রেশন ফাইল রান করুন।'
                  : 'ডুয়াল-মোড আর্কিটেকচার সক্রিয়: ক্লাউড ক্রেডেনশিয়াল ছাড়াও অ্যাপটি নিরাপদ লোকাল স্টোরেজে সম্পূর্ণ কাজ করে।'}
              </p>
            </div>
          </div>

          {/* Credentials Overview */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              ক্রেডেনশিয়াল ও সিকিউরিটি আর্কিটেকচার
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 block mb-1">Supabase Project URL:</span>
                <span className="font-mono text-slate-900 dark:text-slate-100 break-all font-semibold">
                  {report?.url || 'VITE_SUPABASE_URL'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 block mb-1">Client Anon / Publishable Key:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {configured ? '✓ ক্লায়েন্টে সুরক্ষিতভাবে লোডেড' : 'অপেক্ষমান (Not Found)'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 block mb-1">Service Role Key:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  ঐচ্ছিক (Not Required) — RLS ও Publishable Key দ্বারা সুরক্ষিত
                </span>
              </div>
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 block mb-1">৬-সংখ্যার পিন নিরাপত্তা:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  PBKDF2 SHA-256 (সার্ভারে হ্যাশ ও ভেরিফাই)
                </span>
              </div>
            </div>
          </div>

          {/* Table Readiness Verification */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              ডাটাবেজ টেবিল প্রস্তুতি স্ট্যাটাস
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {[
                { name: 'shops', label: 'দোকান (shops)' },
                { name: 'profiles', label: 'প্রোফাইল (profiles)' },
                { name: 'categories', label: 'ক্যাটাগরি (categories)' },
                { name: 'products', label: 'পণ্য (products)' },
                { name: 'customers', label: 'গ্রাহক (customers)' },
                { name: 'suppliers', label: 'সাপ্লায়ার (suppliers)' },
                { name: 'purchases', label: 'ক্রয় চালান (purchases)' },
              ].map((table) => {
                const isReady = report?.tablesStatus?.[table.name as keyof typeof report.tablesStatus];
                return (
                  <div
                    key={table.name}
                    className={`p-2.5 rounded-xl border flex items-center justify-between ${
                      isReady
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300'
                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <span className="font-medium text-[11px] truncate">{table.label}</span>
                    {isReady ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* OTP Provider Notice (Explicitly Disabled per user instructions) */}
          <div className="p-3.5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 text-xs flex items-start gap-2.5 text-amber-900 dark:text-amber-200">
            <MessageSquareOff className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">ফোন ওটিপি পিন রিকভারি স্ট্যাটাস:</span>
              <p className="text-[11px] opacity-90 mt-0.5">
                {otpInfo.message}
              </p>
            </div>
          </div>

          {/* Remaining Setup Requirements */}
          {report?.missingTables && report.missingTables.length > 0 && (
            <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/50 space-y-2 text-xs">
              <span className="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-blue-600" />
                বাকি সেটআপ নির্দেশিকা (Remaining Setup Requirements):
              </span>
              <ol className="list-decimal list-inside space-y-1 text-slate-700 dark:text-slate-300 text-[11px]">
                <li>Supabase ড্যাশবোর্ডে লগইন করে <strong>SQL Editor</strong> খুলুন।</li>
                <li>
                  প্রজেক্টের <code>/supabase/migrations/20260301000000_shop_pos_init.sql</code> কোড কপি করে রান করুন।
                </li>
                <li>
                  এরপর <code>/supabase/migrations/20260302000000_shop_pos_step2.sql</code> কোড কপি করে রান করুন।
                </li>
                <li>
                  রান করা সম্পন্ন হলে নিচে <strong>"পুনরায় সংযোগ যাচাই করুন"</strong> বাটনে ক্লিক করুন।
                </li>
              </ol>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={checkStatus}
              disabled={isChecking}
              className="py-2 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 font-semibold text-xs text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
              <span>{isChecking ? 'যাচাই হচ্ছে...' : 'পুনরায় যাচাই করুন'}</span>
            </button>

            {configured && (
              <button
                onClick={handleSyncToCloud}
                disabled={isSyncing}
                className="py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
              >
                <CloudUpload className={`w-3.5 h-3.5 ${isSyncing ? 'animate-bounce' : ''}`} />
                <span>{isSyncing ? 'সিঙ্ক হচ্ছে...' : 'ক্লাউডে ডাটা সিঙ্ক করুন'}</span>
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="py-2 px-4 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
          >
            বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
};
