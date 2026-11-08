/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  Shield,
  Search,
  Plus,
  Printer,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  X,
  Smartphone,
  User,
  Calendar,
  Check,
  Building2,
  Store,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import {
  ProductWarranty,
  WarrantyStatus,
  WarrantyType,
} from '../../types/specialized';
import {
  getWarrantiesByShop,
  registerProductWarranty,
  updateWarrantyStatus,
} from '../../services/specializedStorage';

export const WarrantyManager: React.FC = () => {
  const { currentShop } = useAuth();
  const { t } = useLanguage();
  const { showToast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<WarrantyStatus | 'ALL'>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedWarranty, setSelectedWarranty] = useState<ProductWarranty | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Registration Form
  const [formData, setFormData] = useState<{
    saleInvoiceNumber: string;
    productName: string;
    serialOrImei: string;
    customerName: string;
    customerPhone: string;
    warrantyType: WarrantyType;
    warrantyDurationMonths: number;
    startDate: string;
    termsNotes: string;
  }>({
    saleInvoiceNumber: '',
    productName: '',
    serialOrImei: '',
    customerName: '',
    customerPhone: '',
    warrantyType: 'SHOP_WARRANTY',
    warrantyDurationMonths: 12,
    startDate: new Date().toISOString().slice(0, 10),
    termsNotes: 'ফিজিক্যাল বা তরল ড্যামেজ ব্যতীত সকল পার্টস ও সার্ভিস ফ্রি।',
  });

  const [formError, setFormError] = useState<string | null>(null);

  if (!currentShop) return null;

  const warranties = getWarrantiesByShop(currentShop.id, statusFilter, searchTerm);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.productName.trim()) {
      setFormError('পণ্যের নাম আবশ্যক।');
      return;
    }
    if (!formData.serialOrImei.trim()) {
      setFormError('সিরিয়াল নম্বর বা IMEI আবশ্যক।');
      return;
    }
    if (!formData.customerName.trim() || !formData.customerPhone.trim()) {
      setFormError('ক্রেতার নাম ও মোবাইল নম্বর আবশ্যক।');
      return;
    }

    try {
      const created = registerProductWarranty({
        shopId: currentShop.id,
        saleInvoiceNumber: formData.saleInvoiceNumber.trim() || `INV-${Date.now().toString().slice(-6)}`,
        productId: crypto.randomUUID(),
        productName: formData.productName.trim(),
        serialOrImei: formData.serialOrImei.trim(),
        customerName: formData.customerName.trim(),
        customerPhone: formData.customerPhone.trim(),
        warrantyType: formData.warrantyType,
        warrantyDurationMonths: formData.warrantyDurationMonths,
        startDate: formData.startDate,
        termsNotes: formData.termsNotes.trim(),
      });

      showToast({
        type: 'success',
        title: 'ওয়ারেন্টি কার্ড নিবন্ধিত হয়েছে',
        message: `${created.productName} এর ওয়ারেন্টি সফলভাবে সংরক্ষিত।`,
      });

      setIsAddModalOpen(false);
      setFormData({
        saleInvoiceNumber: '',
        productName: '',
        serialOrImei: '',
        customerName: '',
        customerPhone: '',
        warrantyType: 'SHOP_WARRANTY',
        warrantyDurationMonths: 12,
        startDate: new Date().toISOString().slice(0, 10),
        termsNotes: 'ফিজিক্যাল বা তরল ড্যামেজ ব্যতীত সকল পার্টস ও সার্ভিস ফ্রি।',
      });
    } catch (err: any) {
      setFormError(err.message || 'ওয়ারেন্টি কার্ড তৈরিতে সমস্যা হয়েছে।');
    }
  };

  const handleStatusChange = (warrantyId: string, newStatus: WarrantyStatus) => {
    try {
      updateWarrantyStatus(warrantyId, newStatus);
      showToast({
        type: 'info',
        title: 'ওয়ারেন্টি স্ট্যাটাস হালনাগাদ',
        message: `স্ট্যাটাস: ${newStatus}`,
      });
    } catch {
      showToast({ type: 'error', title: 'আপডেট করতে সমস্যা হয়েছে' });
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* ---------------- 1. PAGE HEADER ---------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Shield className="w-6 h-6 text-emerald-600" />
              <span>ওয়ারেন্টি ও গ্যারান্টি ব্যবস্থাপনা</span>
            </h1>
            <span className="text-xs text-slate-500 font-mono">
              · {warranties.length} টি কার্ড
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            দোকানের নিজস্ব সেবা ওয়ারেন্টি এবং অফিসিয়াল প্রস্তুতকারক ব্র্যান্ড ওয়ারেন্টির সুস্পষ্ট ট্র্যাকিং ও প্রিন্ট।
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>নতুন ওয়ারেন্টি কার্ড ইস্যু</span>
        </button>
      </div>

      {/* ---------------- 2. SEARCH & FILTER CONTROLS ---------------- */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="IMEI, সিরিয়াল, ফোন বা ক্রেতার নাম..."
            className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {(
            [
              { id: 'ALL', label: 'সকল ওয়ারেন্টি' },
              { id: 'ACTIVE', label: 'সক্রিয় (Active)' },
              { id: 'EXPIRED', label: 'মেয়াদোত্তীর্ণ (Expired)' },
              { id: 'CLAIMED', label: 'দাবি করা (Claimed)' },
              { id: 'REPLACED', label: 'প্রতিস্থাপন (Replaced)' },
            ] as const
          ).map((filter) => (
            <button
              key={filter.id}
              onClick={() => setStatusFilter(filter.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === filter.id
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* ---------------- 3. WARRANTY CARDS TABLE ---------------- */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">পণ্য ও সিরিয়াল/IMEI</th>
                <th className="py-3 px-4">ওয়ারেন্টির ধরন</th>
                <th className="py-3 px-4">ক্রেতার তথ্য</th>
                <th className="py-3 px-4 text-center">শুরু ও শেষ তারিখ</th>
                <th className="py-3 px-4 text-center">স্ট্যাটাস</th>
                <th className="py-3 px-4 text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {warranties.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    কোনো ওয়ারেন্টি রেকর্ড পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                warranties.map((w) => {
                  const isManufacturer = w.warrantyType === 'MANUFACTURER_WARRANTY';
                  return (
                    <tr key={w.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 dark:text-slate-100 block">
                          {w.productName}
                        </span>
                        <span className="text-[11px] font-mono text-emerald-600 font-bold">
                          {w.serialOrImei}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-semibold text-[11px] ${
                            isManufacturer
                              ? 'bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300'
                              : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                          }`}
                        >
                          {isManufacturer ? (
                            <>
                              <Building2 className="w-3 h-3" />
                              <span>অফিসিয়াল ব্র্যান্ড ওয়ারেন্টি</span>
                            </>
                          ) : (
                            <>
                              <Store className="w-3 h-3" />
                              <span>দোকানের সেবা ওয়ারেন্টি</span>
                            </>
                          )}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {w.warrantyDurationMonths} মাস কভারেজ
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                          {w.customerName}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500">
                          {w.customerPhone}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center font-mono">
                        <span className="text-slate-700 dark:text-slate-300 block">
                          {w.startDate}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          হতে {w.endDate}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            w.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : w.status === 'EXPIRED'
                              ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                          }`}
                        >
                          {w.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedWarranty(w);
                              setIsPrintModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                            title="প্রিন্ট ওয়ারেন্টি কার্ড"
                          >
                            <Printer className="w-3.5 h-3.5 text-blue-600" />
                          </button>

                          <select
                            value={w.status}
                            onChange={(e) =>
                              handleStatusChange(w.id, e.target.value as WarrantyStatus)
                            }
                            className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px] font-semibold text-slate-700 dark:text-slate-300"
                          >
                            <option value="ACTIVE">ACTIVE</option>
                            <option value="CLAIMED">CLAIMED</option>
                            <option value="REPLACED">REPLACED</option>
                            <option value="EXPIRED">EXPIRED</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------------- 4. REGISTER MODAL ---------------- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-emerald-600" />
                  <span>নতুন ওয়ারেন্টি কার্ড তৈরি করুন</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  বিক্রয়কৃত পণ্যের জন্য আনুষ্ঠানিক ওয়ারেন্টি কার্ড সংরক্ষণ
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold">
                {formError}
              </div>
            )}

            <form onSubmit={handleRegister} className="mt-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1 sm:col-span-2">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    পণ্যের নাম ও বিবরণ *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.productName}
                    onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                    placeholder="যেমন: Samsung 32 Inch Smart TV"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    সিরিয়াল নম্বর বা IMEI *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.serialOrImei}
                    onChange={(e) => setFormData({ ...formData, serialOrImei: e.target.value })}
                    placeholder="SN-99881122 বা IMEI"
                    className="w-full px-3 py-2 font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    ইনভয়েস বা মেমো নম্বর
                  </label>
                  <input
                    type="text"
                    value={formData.saleInvoiceNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, saleInvoiceNumber: e.target.value })
                    }
                    placeholder="যেমন: MS-2026-000001"
                    className="w-full px-3 py-2 font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    ওয়ারেন্টির ধরন *
                  </label>
                  <select
                    value={formData.warrantyType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        warrantyType: e.target.value as WarrantyType,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600 font-semibold"
                  >
                    <option value="SHOP_WARRANTY">দোকানের নিজস্ব সেবা ওয়ারেন্টি (Shop)</option>
                    <option value="MANUFACTURER_WARRANTY">অফিসিয়াল প্রস্তুতকারক ব্র্যান্ড ওয়ারেন্টি</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    কভারেজ সময়কাল (মাস) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    required
                    value={formData.warrantyDurationMonths}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        warrantyDurationMonths: parseInt(e.target.value) || 12,
                      })
                    }
                    className="w-full px-3 py-2 font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    ক্রেতার নাম *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    placeholder="ক্রেতার নাম"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    মোবাইল নম্বর *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.customerPhone}
                    onChange={(e) =>
                      setFormData({ ...formData, customerPhone: e.target.value })
                    }
                    placeholder="017XXXXXXXX"
                    className="w-full px-3 py-2 font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    শর্তাবলী ও সার্ভিস নোট
                  </label>
                  <textarea
                    rows={2}
                    value={formData.termsNotes}
                    onChange={(e) => setFormData({ ...formData, termsNotes: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-semibold"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-sm"
                >
                  ওয়ারেন্টি ইস্যু করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- 5. PRINTABLE WARRANTY CARD MODAL ---------------- */}
      {isPrintModalOpen && selectedWarranty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white text-slate-900 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200">
            {/* Card Content for Printing */}
            <div
              className="p-6 rounded-2xl border-2 border-dashed border-slate-300 space-y-5 relative"
              style={{ borderTop: `6px solid ${currentShop.brandColor || '#059669'}` }}
            >
              <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <h2 className="text-xl font-extrabold tracking-tight">
                    {currentShop.name}
                  </h2>
                  <p className="text-[11px] text-slate-600">
                    {currentShop.address || 'দোকান ঠিকানা'} · মোবাইল: {currentShop.mobileNumber}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    অফিসিয়াল ওয়ারেন্টি কার্ড
                  </span>
                  <div className="text-xs font-mono font-bold mt-1 text-slate-700">
                    #{selectedWarranty.saleInvoiceNumber}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 text-[10px] block">পণ্য:</span>
                  <span className="font-bold text-slate-900">{selectedWarranty.productName}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">সিরিয়াল / IMEI:</span>
                  <span className="font-mono font-bold text-slate-900">{selectedWarranty.serialOrImei}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">ক্রেতার নাম:</span>
                  <span className="font-medium text-slate-900">{selectedWarranty.customerName}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">ক্রেতার ফোন:</span>
                  <span className="font-mono text-slate-900">{selectedWarranty.customerPhone}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">ওয়ারেন্টির মেয়াদ:</span>
                  <span className="font-bold text-emerald-700">{selectedWarranty.warrantyDurationMonths} মাস</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">মেয়াদ শেষ:</span>
                  <span className="font-mono font-bold text-slate-900">{selectedWarranty.endDate}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[10px] text-slate-600 leading-relaxed">
                <span className="font-bold text-slate-800 block mb-0.5">ওয়ারেন্টির নিয়ম ও শর্তাবলী:</span>
                {selectedWarranty.termsNotes || 'ফিজিক্যাল বা তরল ড্যামেজ ব্যতীত সকল সার্ভিস কভারড। দাবি করার সময় মূল ওয়ারেন্টি কার্ড বা চালান প্রদর্শন করতে হবে।'}
              </div>

              <div className="flex justify-between items-end pt-6 border-t border-slate-200 text-[10px] text-slate-500">
                <div className="text-center">
                  <div className="w-28 border-b border-slate-300 pb-1 mb-1" />
                  <span>গ্রাহকের স্বাক্ষর</span>
                </div>
                <div className="text-center">
                  <div className="w-32 border-b border-slate-300 pb-1 mb-1 font-bold text-slate-800">
                    {currentShop.name}
                  </div>
                  <span>কর্তৃপক্ষের স্বাক্ষর ও সিল</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700"
              >
                বন্ধ করুন
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-6 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>প্রিন্ট কার্ড</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
