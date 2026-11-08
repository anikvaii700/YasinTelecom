/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { UserPlus, X, Phone, User, MapPin } from 'lucide-react';
import { saveCustomer } from '../../services/inventoryStorage';
import { Customer } from '../../types/inventory';
import { useToast } from '../../context/ToastContext';

interface QuickCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopId: string;
  onCustomerCreated: (customer: Customer) => void;
}

export const QuickCustomerModal: React.FC<QuickCustomerModalProps> = ({
  isOpen,
  onClose,
  shopId,
  onCustomerCreated,
}) => {
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('গ্রাহকের নাম আবশ্যক।');
      return;
    }

    if (!mobileNumber.trim()) {
      setError('মোবাইল নম্বর আবশ্যক।');
      return;
    }

    try {
      const created = saveCustomer({
        shopId,
        name: name.trim(),
        mobileNumber: mobileNumber.trim(),
        address: address.trim() || undefined,
        openingBalance: 0,
        currentDue: 0,
        totalPurchases: 0,
        isActive: true,
      });

      showToast({
        type: 'success',
        title: 'গ্রাহক যুক্ত হয়েছে',
        message: `${created.name} সফলভাবে সংরক্ষিত ও নির্বাচিত হয়েছে।`,
      });

      onCustomerCreated(created);
      onClose();
    } catch (err: any) {
      setError(err.message || 'গ্রাহক তৈরিতে সমস্যা হয়েছে।');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
              <UserPlus className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              দ্রুত নতুন গ্রাহক যুক্ত করুন
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              গ্রাহকের নাম *
            </label>
            <div className="relative">
              <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                placeholder="যেমন: মোঃ কামরুল হাসান"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              মোবাইল নম্বর *
            </label>
            <div className="relative">
              <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                required
                placeholder="01712345678"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              ঠিকানা (ঐচ্ছিক)
            </label>
            <div className="relative">
              <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <textarea
                rows={2}
                placeholder="এলাকা / বাজার / গ্রাম"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-xl text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              বাতিল
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors shadow-sm"
            >
              সংরক্ষণ ও নির্বাচন
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
