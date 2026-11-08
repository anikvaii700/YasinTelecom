/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Smartphone,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  History,
  X,
  Shield,
  Tag,
  DollarSign,
  Copy,
  Receipt,
  User,
  Phone,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { DeviceImei, DeviceStatus } from '../../types/specialized';
import {
  getImeisByShop,
  registerDeviceImei,
  updateDeviceImei,
} from '../../services/specializedStorage';

export const ImeiManager: React.FC = () => {
  const { currentShop } = useAuth();
  const { t } = useLanguage();
  const { showToast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<DeviceStatus | 'ALL'>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<DeviceImei | null>(null);

  // Register Form State
  const [formData, setFormData] = useState<{
    productName: string;
    brand: string;
    model: string;
    imei1: string;
    imei2: string;
    serialNumber: string;
    ram: string;
    storage: string;
    color: string;
    purchaseCost: string;
    sellingPrice: string;
    warrantyMonths: number;
    notes: string;
  }>({
    productName: '',
    brand: '',
    model: '',
    imei1: '',
    imei2: '',
    serialNumber: '',
    ram: '6GB',
    storage: '128GB',
    color: 'Black',
    purchaseCost: '',
    sellingPrice: '',
    warrantyMonths: 12,
    notes: '',
  });

  const [formError, setFormError] = useState<string | null>(null);

  if (!currentShop) return null;

  const devices = getImeisByShop(currentShop.id, statusFilter, searchTerm);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.imei1.trim() || formData.imei1.trim().length < 14) {
      setFormError('সঠিক ১৫-সংখ্যার IMEI ১ নম্বর লিখুন।');
      return;
    }
    if (!formData.brand.trim() || !formData.model.trim()) {
      setFormError('ব্র্যান্ড ও মডেল আবশ্যক।');
      return;
    }
    if (!formData.purchaseCost || Number(formData.purchaseCost) <= 0) {
      setFormError('ক্রয়মূল্য আবশ্যক।');
      return;
    }

    try {
      const fullTitle = `${formData.brand} ${formData.model}`.trim();
      registerDeviceImei({
        shopId: currentShop.id,
        productName: formData.productName.trim() || fullTitle,
        brand: formData.brand.trim(),
        model: formData.model.trim(),
        imei1: formData.imei1.trim(),
        imei2: formData.imei2.trim() || undefined,
        serialNumber: formData.serialNumber.trim() || undefined,
        ram: formData.ram.trim(),
        storage: formData.storage.trim(),
        color: formData.color.trim(),
        purchaseCost: Number(formData.purchaseCost),
        sellingPrice: formData.sellingPrice ? Number(formData.sellingPrice) : undefined,
        warrantyMonths: formData.warrantyMonths,
        notes: formData.notes.trim() || undefined,
      });

      showToast({
        type: 'success',
        title: 'হ্যান্ডসেট IMEI যুক্ত হয়েছে',
        message: `IMEI: ${formData.imei1} সফলভাবে রেজিস্টার হয়েছে।`,
      });

      setIsAddModalOpen(false);
      setFormData({
        productName: '',
        brand: '',
        model: '',
        imei1: '',
        imei2: '',
        serialNumber: '',
        ram: '6GB',
        storage: '128GB',
        color: 'Black',
        purchaseCost: '',
        sellingPrice: '',
        warrantyMonths: 12,
        notes: '',
      });
    } catch (err: any) {
      setFormError(err.message || 'IMEI রেজিস্টার করতে সমস্যা হয়েছে।');
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast({ type: 'info', title: `${label} কপি করা হয়েছে`, message: text });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* ---------------- 1. PAGE HEADER ---------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Smartphone className="w-6 h-6 text-emerald-600" />
              <span>মোবাইল শপ IMEI ও সিরিয়াল ট্র্যাকিং</span>
            </h1>
            <span className="text-xs text-slate-500 font-mono">
              · {devices.length} টি হ্যান্ডসেট
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            প্রতিটি ফোনের ১৫-সংখ্যার স্বতন্ত্র IMEI ১/২, ওয়ারেন্টি সময়সীমা ও বিক্রয় ইনভয়েস হিস্ট্রি ট্র্যাকিং।
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>নতুন ফোন IMEI এন্ট্রি</span>
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
            placeholder="IMEI, সিরিয়াল, মডেল বা ক্রেতা ফোন..."
            className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {(
            [
              { id: 'ALL', label: 'সব ডিভাইস' },
              { id: 'IN_STOCK', label: 'মজুদ (In Stock)' },
              { id: 'SOLD', label: 'বিক্রিত (Sold)' },
              { id: 'RETURNED', label: 'ফেরত (Returned)' },
              { id: 'DEFECTIVE', label: 'ত্রুটিপূর্ণ (Defective)' },
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

      {/* ---------------- 3. DEVICE CARDS & TABLE ---------------- */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">ডিভাইস ও মডেল</th>
                <th className="py-3 px-4">IMEI ১ ও ২</th>
                <th className="py-3 px-4">র‌্যাম / স্টোরেজ / রঙ</th>
                <th className="py-3 px-4 text-center">স্ট্যাটাস</th>
                <th className="py-3 px-4 text-right">ক্রয় / বিক্রয় মূল্য</th>
                <th className="py-3 px-4">ওয়ারেন্টি / ইনভয়েস</th>
                <th className="py-3 px-4 text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {devices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    কোনো হ্যান্ডসেট বা IMEI রেকর্ড পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                devices.map((device) => {
                  const isSold = device.status === 'SOLD';
                  return (
                    <tr key={device.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 dark:text-slate-100 block">
                          {device.brand} {device.model}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {device.serialNumber ? `SN: ${device.serialNumber}` : device.productName}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {device.imei1}
                          </span>
                          <button
                            onClick={() => copyToClipboard(device.imei1, 'IMEI ১')}
                            className="text-slate-400 hover:text-slate-600"
                            title="Copy IMEI 1"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                        {device.imei2 && (
                          <div className="text-[10px] text-slate-400 flex items-center gap-1">
                            <span>IMEI 2: {device.imei2}</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        <span>{device.ram || '—'} / {device.storage || '—'}</span>
                        {device.color && <span className="block text-[11px] text-slate-400">{device.color}</span>}
                      </td>

                      <td className="py-3 px-4 text-center font-bold">
                        <span
                          className={`inline-block font-mono text-[11px] px-2 py-0.5 rounded-full ${
                            device.status === 'IN_STOCK'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : device.status === 'SOLD'
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                          }`}
                        >
                          {device.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right font-mono">
                        <div className="text-slate-900 dark:text-slate-100 font-bold">
                          ৳{(device.sellingPrice || device.purchaseCost).toLocaleString()}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          ক্রয়: ৳{device.purchaseCost.toLocaleString()}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        {isSold ? (
                          <div>
                            <span className="font-mono text-emerald-600 font-bold text-[11px] block">
                              #{device.saleInvoiceNumber}
                            </span>
                            <span className="text-[10px] text-slate-500 block">
                              {device.customerName} ({device.customerPhone})
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                            <Shield className="w-3.5 h-3.5 text-blue-600" />
                            <span>{device.warrantyMonths} মাস ওয়ারেন্টি</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedDevice(device)}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                          বিস্তারিত
                        </button>
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
                  <Smartphone className="w-5 h-5 text-emerald-600" />
                  <span>নতুন ফোন IMEI নিবন্ধন</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  ডুপ্লিকেট সুরক্ষা সহ হ্যান্ডসেট তথ্য ও ওয়ারেন্টি সংরক্ষণ
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
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    ব্র্যান্ড *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="যেমন: Xiaomi, Samsung, Apple"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    মডেল *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    placeholder="যেমন: Redmi Note 13 4G"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>IMEI ১ (১৫ ডিজিট) *</span>
                    <span className="text-[10px] text-slate-400">ডুপ্লিকেট প্রতিরোধক সক্রিয়</span>
                  </label>
                  <input
                    type="text"
                    maxLength={16}
                    required
                    value={formData.imei1}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        imei1: e.target.value.replace(/[^0-9]/g, ''),
                      })
                    }
                    placeholder="862910041234567"
                    className="w-full px-3.5 py-2.5 font-mono text-sm tracking-wider rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    IMEI ২ (ঐচ্ছিক)
                  </label>
                  <input
                    type="text"
                    maxLength={16}
                    value={formData.imei2}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        imei2: e.target.value.replace(/[^0-9]/g, ''),
                      })
                    }
                    placeholder="862910041234568"
                    className="w-full px-3 py-2 font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    সিরিয়াল নম্বর (Serial)
                  </label>
                  <input
                    type="text"
                    value={formData.serialNumber}
                    onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                    placeholder="SN-XIA-9012"
                    className="w-full px-3 py-2 font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    র‌্যাম (RAM)
                  </label>
                  <input
                    type="text"
                    value={formData.ram}
                    onChange={(e) => setFormData({ ...formData, ram: e.target.value })}
                    placeholder="যেমন: 8GB"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    স্টোরেজ (Storage)
                  </label>
                  <input
                    type="text"
                    value={formData.storage}
                    onChange={(e) => setFormData({ ...formData, storage: e.target.value })}
                    placeholder="যেমন: 128GB"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    ক্রয়মূল্য (৳) *
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.purchaseCost}
                    onChange={(e) => setFormData({ ...formData, purchaseCost: e.target.value })}
                    placeholder="যেমন: 21000"
                    className="w-full px-3 py-2 font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    বিক্রয়মূল্য (৳)
                  </label>
                  <input
                    type="number"
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                    placeholder="যেমন: 24500"
                    className="w-full px-3 py-2 font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600"
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
                  নিবন্ধন সম্পন্ন করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- 5. DETAILS MODAL ---------------- */}
      {selectedDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                ডিভাইস বিস্তারিত তথ্য
              </h3>
              <button
                onClick={() => setSelectedDevice(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">মডেল:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {selectedDevice.brand} {selectedDevice.model}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">IMEI ১:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                  {selectedDevice.imei1}
                </span>
              </div>
              {selectedDevice.imei2 && (
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">IMEI ২:</span>
                  <span className="font-mono text-slate-900 dark:text-slate-100">
                    {selectedDevice.imei2}
                  </span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">স্ট্যাটাস:</span>
                <span className="font-mono font-bold text-emerald-600">
                  {selectedDevice.status}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">ওয়ারেন্টি সময়সীমা:</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {selectedDevice.warrantyMonths} মাস
                </span>
              </div>
              {selectedDevice.saleInvoiceNumber && (
                <>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">বিক্রয় ইনভয়েস:</span>
                    <span className="font-mono font-bold text-emerald-600">
                      #{selectedDevice.saleInvoiceNumber}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">ক্রেতার নাম:</span>
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                      {selectedDevice.customerName} ({selectedDevice.customerPhone})
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className="pt-2">
              <button
                onClick={() => setSelectedDevice(null)}
                className="w-full py-2 bg-slate-100 dark:bg-slate-800 rounded-xl font-semibold text-slate-700 dark:text-slate-300"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
