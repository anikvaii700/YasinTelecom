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
  DollarSign,
  TrendingUp,
  History,
  X,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Wallet,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import {
  TelecomOperator,
  TelecomRecharge,
} from '../../types/specialized';
import {
  getTelecomRechargesByShop,
  getTelecomSummary,
  recordTelecomRecharge,
} from '../../services/specializedStorage';

const OPERATORS: TelecomOperator[] = [
  'Grameenphone',
  'Robi',
  'Airtel',
  'Banglalink',
  'Teletalk',
];

const DEFAULT_COMMISSION_RATES: Record<TelecomOperator, number> = {
  Grameenphone: 2.8,
  Robi: 2.7,
  Airtel: 2.7,
  Banglalink: 3.0,
  Teletalk: 3.2,
};

export const TelecomManager: React.FC = () => {
  const { currentShop } = useAuth();
  const { t } = useLanguage();
  const { showToast } = useToast();

  const [selectedOperator, setSelectedOperator] = useState<TelecomOperator | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState<{
    operator: TelecomOperator;
    customerPhone: string;
    rechargeAmount: string;
    commissionRate: number;
    paymentMethod: string;
    transactionRef: string;
    simBalanceAfter: string;
    notes: string;
  }>({
    operator: 'Grameenphone',
    customerPhone: '',
    rechargeAmount: '',
    commissionRate: DEFAULT_COMMISSION_RATES.Grameenphone,
    paymentMethod: 'Cash',
    transactionRef: '',
    simBalanceAfter: '',
    notes: '',
  });

  const [formError, setFormError] = useState<string | null>(null);

  if (!currentShop) return null;

  const recharges = getTelecomRechargesByShop(
    currentShop.id,
    undefined,
    undefined,
    selectedOperator
  );

  const summary = getTelecomSummary(currentShop.id);

  const filteredRecharges = recharges.filter((r) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase().trim();
    return (
      (r.customerPhone && r.customerPhone.includes(term)) ||
      r.operator.toLowerCase().includes(term) ||
      (r.transactionRef && r.transactionRef.toLowerCase().includes(term))
    );
  });

  const handleOperatorChange = (op: TelecomOperator) => {
    setFormData((prev) => ({
      ...prev,
      operator: op,
      commissionRate: DEFAULT_COMMISSION_RATES[op] || 2.8,
    }));
  };

  const calculatedCommission =
    formData.rechargeAmount && Number(formData.rechargeAmount) > 0
      ? Number(((Number(formData.rechargeAmount) * formData.commissionRate) / 100).toFixed(2))
      : 0;

  const handleRecordRecharge = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const amount = Number(formData.rechargeAmount);
    if (!amount || amount <= 0) {
      setFormError('রিচার্জের পরিমাণ সঠিক সংখ্যায় লিখুন।');
      return;
    }

    try {
      recordTelecomRecharge({
        shopId: currentShop.id,
        operator: formData.operator,
        customerPhone: formData.customerPhone.trim() || undefined,
        rechargeAmount: amount,
        commissionRate: formData.commissionRate,
        paymentMethod: formData.paymentMethod,
        transactionRef: formData.transactionRef.trim() || undefined,
        simBalanceAfter: formData.simBalanceAfter ? Number(formData.simBalanceAfter) : undefined,
        notes: formData.notes.trim() || undefined,
      });

      showToast({
        type: 'success',
        title: 'রিচার্জ বুকিং সংরক্ষিত',
        message: `${formData.operator} ৳${amount} (কমিশন লাভ: ৳${calculatedCommission})`,
      });

      setIsAddModalOpen(false);
      setFormData({
        operator: 'Grameenphone',
        customerPhone: '',
        rechargeAmount: '',
        commissionRate: DEFAULT_COMMISSION_RATES.Grameenphone,
        paymentMethod: 'Cash',
        transactionRef: '',
        simBalanceAfter: '',
        notes: '',
      });
    } catch (err: any) {
      setFormError(err.message || 'রিচার্জ এন্ট্রিতে সমস্যা হয়েছে।');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* ---------------- 1. PAGE HEADER ---------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Smartphone className="w-6 h-6 text-emerald-600" />
              <span>মোবাইল রিচার্জ ও টেলিকম লেজার</span>
            </h1>
            <span className="text-xs text-slate-500 font-mono">
              · ম্যানুয়াল বুককিপিং
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            GP, Robi, Airtel, Banglalink ও Teletalk রিচার্জ লেনদেন, কমিশন আয় এবং সিম ব্যালেন্স হিসাব।
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>নতুন রিচার্জ এন্ট্রি</span>
        </button>
      </div>

      {/* ---------------- 2. OPERATOR COMMISSION CARDS ---------------- */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {OPERATORS.map((op) => {
          const data = summary.operatorBreakdown[op] || { amount: 0, commission: 0, count: 0 };
          const isSelected = selectedOperator === op;
          return (
            <button
              key={op}
              onClick={() => setSelectedOperator(isSelected ? 'ALL' : op)}
              className={`p-4 rounded-2xl border text-left transition-all ${
                isSelected
                  ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 ring-2 ring-emerald-500/20 shadow-sm'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                  {op}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {DEFAULT_COMMISSION_RATES[op]}%
                </span>
              </div>
              <div className="text-lg font-extrabold font-mono text-slate-900 dark:text-slate-100">
                ৳{data.amount.toLocaleString()}
              </div>
              <div className="text-[11px] text-emerald-600 font-mono font-semibold mt-1">
                লাভ: ৳{data.commission}
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {data.count} টি লেনদেন
              </span>
            </button>
          );
        })}
      </div>

      {/* ---------------- 3. SUMMARY BANNER ---------------- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">মোট রিচার্জ বুকিং</span>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-2">
            ৳{summary.totalRechargeAmount.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {summary.rechargeCount} টি রেকর্ড
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            অর্জিত কমিশন লাভ
          </span>
          <div className="text-2xl font-bold font-mono text-emerald-600 mt-2">
            ৳{summary.totalCommissionEarned.toLocaleString()}
          </div>
          <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold mt-1 block">
            নিট লাভ হিসেবে যুক্ত
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 shadow-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <div className="text-xs text-amber-900 dark:text-amber-200 leading-snug">
            <span className="font-bold block mb-0.5">ম্যানুয়াল খাতা সচেতনতা</span>
            এটি দোকানের নিজস্ব ফ্লেক্সিলোড হিসাব রাখার লেজার। কোনো বাহ্যিক অটোমেটেড টেলিকম এপিআই অন্তর্ভুক্ত নয়।
          </div>
        </div>
      </div>

      {/* ---------------- 4. RECHARGE LOG TABLE ---------------- */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="গ্রাহকের মোবাইল বা রেফারেন্স..."
              className="w-full pl-9 pr-3.5 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600"
            />
          </div>

          <div className="text-xs text-slate-500 font-mono">
            {filteredRecharges.length} টি এন্ট্রি পাওয়া গেছে
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">তারিখ ও সময়</th>
                <th className="py-3 px-4">অপারেটর</th>
                <th className="py-3 px-4">গ্রাহক নম্বর</th>
                <th className="py-3 px-4 text-right">রিচার্জ পরিমাণ</th>
                <th className="py-3 px-4 text-center">কমিশন (%)</th>
                <th className="py-3 px-4 text-right">অর্জিত কমিশন</th>
                <th className="py-3 px-4">পেমেন্ট মেথড</th>
                <th className="py-3 px-4">নোট / রেফারেন্স</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredRecharges.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    কোনো রিচার্জ রেকর্ড পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                filteredRecharges.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-mono text-slate-500">
                      {r.date}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">
                      {r.operator}
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-800 dark:text-slate-200">
                      {r.customerPhone || 'সাধারণ গ্রাহক'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                      ৳{r.rechargeAmount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-slate-500">
                      {r.commissionRate}%
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                      +৳{r.commissionAmount.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                      {r.paymentMethod}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {r.notes || r.transactionRef || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------------- 5. ADD RECHARGE MODAL ---------------- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-600" />
                <span>রিচার্জ লেনদেন এন্ট্রি</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 font-semibold">
                {formError}
              </div>
            )}

            <form onSubmit={handleRecordRecharge} className="space-y-4">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  অপারেটর নির্বাচন *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {OPERATORS.map((op) => (
                    <button
                      key={op}
                      type="button"
                      onClick={() => handleOperatorChange(op)}
                      className={`py-2 px-2 rounded-xl border text-center font-bold text-[11px] transition-all ${
                        formData.operator === op
                          ? 'border-emerald-600 bg-emerald-600 text-white'
                          : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                      }`}
                    >
                      {op}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  গ্রাহকের মোবাইল নম্বর
                </label>
                <input
                  type="tel"
                  value={formData.customerPhone}
                  onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                  placeholder="017XXXXXXXX"
                  className="w-full px-3 py-2 font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    রিচার্জের টাকা (৳) *
                  </label>
                  <input
                    type="number"
                    required
                    min={10}
                    value={formData.rechargeAmount}
                    onChange={(e) => setFormData({ ...formData, rechargeAmount: e.target.value })}
                    placeholder="যেমন: 500"
                    className="w-full px-3 py-2 font-mono text-sm font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    কমিশন হার (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.commissionRate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        commissionRate: parseFloat(e.target.value) || 2.8,
                      })
                    }
                    className="w-full px-3 py-2 font-mono text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              {/* Live Commission Profit Box */}
              {calculatedCommission > 0 && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 flex justify-between items-center">
                  <span className="font-semibold text-emerald-900 dark:text-emerald-200">
                    অর্জিত কমিশন মুনাফা:
                  </span>
                  <span className="font-mono text-base font-bold text-emerald-600">
                    +৳{calculatedCommission}
                  </span>
                </div>
              )}

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  পেমেন্ট পদ্ধতি
                </label>
                <select
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600 font-semibold"
                >
                  <option value="Cash">ক্যাশ (Cash)</option>
                  <option value="bKash">বিকাশ (bKash)</option>
                  <option value="Nagad">নগদ (Nagad)</option>
                  <option value="Rocket">রকেট (Rocket)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  নোট বা ট্রানজ্যাকশন আইডি
                </label>
                <input
                  type="text"
                  value={formData.transactionRef}
                  onChange={(e) => setFormData({ ...formData, transactionRef: e.target.value })}
                  placeholder="যেমন: TXN-8801"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600"
                />
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
                  বুকিং সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
