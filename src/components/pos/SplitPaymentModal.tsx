/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { CreditCard, X, Plus, Trash2, CheckCircle2, AlertCircle, Wallet } from 'lucide-react';
import { CashAccount } from '../../types/finance';
import { POSPaymentMethod, SplitPaymentDetail } from '../../types/pos';

interface SplitPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  grandTotal: number;
  cashAccounts: CashAccount[];
  initialSplits?: SplitPaymentDetail[];
  onConfirm: (splits: SplitPaymentDetail[]) => void;
}

export const SplitPaymentModal: React.FC<SplitPaymentModalProps> = ({
  isOpen,
  onClose,
  grandTotal,
  cashAccounts,
  initialSplits,
  onConfirm,
}) => {
  const [splits, setSplits] = useState<SplitPaymentDetail[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialSplits && initialSplits.length > 0) {
        setSplits(initialSplits);
      } else {
        // Default: 2 split rows (Cash 50%, bKash 50%)
        const half = Math.floor(grandTotal / 2);
        const remainder = grandTotal - half;
        const cashAcc = cashAccounts.find((a) => a.type === 'CASH');
        const bkashAcc = cashAccounts.find((a) => a.type === 'BKASH');

        setSplits([
          {
            method: 'Cash',
            accountId: cashAcc?.id,
            accountName: cashAcc?.name || 'ক্যাশ ইন হ্যান্ড',
            amount: half,
          },
          {
            method: 'bKash',
            accountId: bkashAcc?.id,
            accountName: bkashAcc?.name || 'বিকাশ',
            amount: remainder,
          },
        ]);
      }
      setError(null);
    }
  }, [isOpen, grandTotal, initialSplits, cashAccounts]);

  if (!isOpen) return null;

  const totalAllocated = Number(
    splits.reduce((sum, s) => sum + (Number(s.amount) || 0), 0).toFixed(2)
  );
  const remaining = Number((grandTotal - totalAllocated).toFixed(2));

  const handleAddRow = () => {
    const methods: POSPaymentMethod[] = ['Cash', 'bKash', 'Nagad', 'Rocket', 'Bank', 'Card', 'Other'];
    const usedMethods = splits.map((s) => s.method);
    const nextMethod = methods.find((m) => !usedMethods.includes(m)) || 'Cash';
    const acc = cashAccounts.find((a) => a.type.toLowerCase() === nextMethod.toLowerCase()) || cashAccounts[0];

    setSplits([
      ...splits,
      {
        method: nextMethod,
        accountId: acc?.id,
        accountName: acc?.name,
        amount: Math.max(0, remaining),
      },
    ]);
  };

  const handleRemoveRow = (index: number) => {
    if (splits.length <= 1) return;
    setSplits(splits.filter((_, i) => i !== index));
  };

  const handleUpdateMethod = (index: number, method: POSPaymentMethod) => {
    const acc = cashAccounts.find((a) => a.type.toLowerCase() === method.toLowerCase()) || cashAccounts[0];
    const updated = [...splits];
    updated[index] = {
      ...updated[index],
      method,
      accountId: acc?.id,
      accountName: acc?.name,
    };
    setSplits(updated);
  };

  const handleUpdateAmount = (index: number, amount: string) => {
    const val = Number(amount) || 0;
    const updated = [...splits];
    updated[index] = {
      ...updated[index],
      amount: val,
    };
    setSplits(updated);
  };

  const handleUpdateRef = (index: number, referenceNumber: string) => {
    const updated = [...splits];
    updated[index] = {
      ...updated[index],
      referenceNumber,
    };
    setSplits(updated);
  };

  const handleSave = () => {
    if (splits.length === 0) {
      setError('অন্তত একটি পেমেন্ট মেথড নির্ধারণ করুন।');
      return;
    }

    const invalid = splits.some((s) => s.amount <= 0);
    if (invalid) {
      setError('প্রতিটি মেথডে টাকার পরিমাণ ০ এর বেশি হতে হবে।');
      return;
    }

    onConfirm(splits);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                স্প্লিট পেমেন্ট (Split Payment)
              </h3>
              <p className="text-[11px] text-slate-500">
                একই চালানে একাধিক মাধ্যমে পেমেন্ট গ্রহণ করুন (যেমন: নগদ ৳৫০০ + বিকাশ ৳৩০০)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Invoice Target Breakdown */}
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-500 block">ইনভয়েস সর্বমোট:</span>
            <span className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100">
              ৳{grandTotal.toFixed(2)}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">মোট বরাদ্দকৃত:</span>
            <span className="font-mono font-bold text-sm text-emerald-600">
              ৳{totalAllocated.toFixed(2)}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">বাকি / অমিল:</span>
            <span
              className={`font-mono font-bold text-sm ${
                remaining === 0 ? 'text-emerald-600' : 'text-amber-600'
              }`}
            >
              ৳{remaining.toFixed(2)}
            </span>
          </div>
        </div>

        {error && (
          <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}

        {/* Split Rows List */}
        <div className="space-y-2.5 max-h-64 overflow-y-auto">
          {splits.map((split, index) => (
            <div
              key={index}
              className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 space-y-2"
            >
              <div className="flex items-center gap-2">
                <select
                  value={split.method}
                  onChange={(e) => handleUpdateMethod(index, e.target.value as POSPaymentMethod)}
                  className="flex-1 py-1.5 px-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-600"
                >
                  <option value="Cash">নগদ (Cash)</option>
                  <option value="bKash">বিকাশ (bKash)</option>
                  <option value="Nagad">নগদ (Nagad)</option>
                  <option value="Rocket">রকেট (Rocket)</option>
                  <option value="Bank">ব্যাংক (Bank)</option>
                  <option value="Card">কার্ড (Card)</option>
                  <option value="Other">অন্যান্য (Other)</option>
                </select>

                <div className="relative w-36">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">
                    ৳
                  </span>
                  <input
                    type="number"
                    min="0"
                    placeholder="টাকা"
                    value={split.amount || ''}
                    onChange={(e) => handleUpdateAmount(index, e.target.value)}
                    className="w-full pl-6 pr-2 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-right focus:outline-none focus:border-emerald-600"
                  />
                </div>

                {splits.length > 1 && (
                  <button
                    onClick={() => handleRemoveRow(index)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Reference / TrxID (for digital payments) */}
              {split.method !== 'Cash' && (
                <input
                  type="text"
                  placeholder="ট্রানজেকশন আইডি / কার্ড বা রেফারেন্স নং (ঐচ্ছিক)"
                  value={split.referenceNumber || ''}
                  onChange={(e) => handleUpdateRef(index, e.target.value)}
                  className="w-full px-2.5 py-1 text-[11px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-emerald-600 font-mono"
                />
              )}
            </div>
          ))}
        </div>

        {/* Add Row Button */}
        <button
          onClick={handleAddRow}
          className="w-full py-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 transition-colors flex items-center justify-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>আরেকটি পেমেন্ট মেথড যোগ করুন</span>
        </button>

        {/* Legal Disclaimer */}
        <p className="text-[10px] text-slate-400 leading-tight">
          * এটি ম্যানুয়াল পেমেন্ট ট্র্যাকিং রেকর্ড। বিকাশ/নগদ অটোমেটিক এপিআই গেটওয়ে ব্যতীত কোনো স্বয়ংক্রিয় অর্থ স্থানান্তর ঘটে না।
        </p>

        {/* Footer Actions */}
        <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            বাতিল
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors shadow-sm"
          >
            স্প্লিট পেমেন্ট নিশ্চিত করুন
          </button>
        </div>
      </div>
    </div>
  );
};
