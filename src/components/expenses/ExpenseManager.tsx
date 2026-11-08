/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Plus,
  Search,
  Filter,
  Calendar,
  CreditCard,
  FileText,
  Trash2,
  TrendingDown,
  PieChart,
  Tag,
  Receipt,
  X,
  Wallet,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import {
  getCashAccountsByShop,
  getExpensesByShop,
  recordExpense,
} from '../../services/financeStorage';
import { CashAccount, Expense, ExpenseCategory } from '../../types/finance';

const EXPENSE_CATEGORIES: { key: ExpenseCategory; labelBn: string; color: string }[] = [
  { key: 'Rent', labelBn: 'দোকান ভাড়া (Shop Rent)', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { key: 'Electricity', labelBn: 'বিদ্যুৎ বিল (Electricity)', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { key: 'Internet', labelBn: 'ইন্টারনেট বিল (Internet)', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  { key: 'Salary', labelBn: 'কর্মচারীর বেতন (Salary)', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { key: 'Transport', labelBn: 'যাতায়াত ও ভাড়া (Transport)', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { key: 'Maintenance', labelBn: 'মেরামত ও রক্ষণাবেক্ষণ (Maintenance)', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  { key: 'Packaging', labelBn: 'প্যাকেজিং ও ব্যাগ (Packaging)', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { key: 'Marketing', labelBn: 'বিজ্ঞাপন ও প্রচার (Marketing)', color: 'bg-pink-50 text-pink-700 border-pink-200' },
  { key: 'Other', labelBn: 'অন্যান্য দৈনন্দিন খরচ (Other)', color: 'bg-slate-50 text-slate-700 border-slate-200' },
];

export const ExpenseManager: React.FC = () => {
  const { currentShop, currentProfile } = useAuth();
  const { t } = useLanguage();
  const { showToast } = useToast();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [cashAccounts, setCashAccounts] = useState<CashAccount[]>([]);

  // Filtering
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // Add Expense Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [category, setCategory] = useState<ExpenseCategory>('Rent');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentAccountId, setPaymentAccountId] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadData = () => {
    if (!currentShop) return;
    const expList = getExpensesByShop(currentShop.id);
    setExpenses(expList);
    const accounts = getCashAccountsByShop(currentShop.id);
    setCashAccounts(accounts);
    if (accounts.length > 0 && !paymentAccountId) {
      const def = accounts.find((a) => a.isDefault) || accounts[0];
      setPaymentAccountId(def.id);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentShop]);

  if (!currentShop) return null;

  const totalExpenseAmount = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  // Filtered Expenses
  const filteredExpenses = expenses.filter((e) => {
    if (selectedCategory !== 'all' && e.category !== selectedCategory) return false;
    if (dateFilter && e.date !== dateFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchDesc = e.description.toLowerCase().includes(q);
      const matchRef = e.reference?.toLowerCase().includes(q);
      const matchNote = e.notes?.toLowerCase().includes(q);
      if (!matchDesc && !matchRef && !matchNote) return false;
    }
    return true;
  });

  const handleOpenAdd = () => {
    setDescription('');
    setAmount('');
    setDate(new Date().toISOString().split('T')[0]);
    setReference('');
    setNotes('');
    setError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numericAmount = Number(amount) || 0;
    if (numericAmount <= 0) {
      setError('খরচের পরিমাণ ০ টাকার বেশি হতে হবে।');
      return;
    }

    if (!description.trim()) {
      setError('খরচের বিবরণ আবশ্যক।');
      return;
    }

    if (!paymentAccountId) {
      setError('পেমেন্ট অ্যাকাউন্ট নির্বাচন করুন।');
      return;
    }

    try {
      recordExpense({
        shopId: currentShop.id,
        category,
        description: description.trim(),
        amount: numericAmount,
        date,
        paymentAccountId,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
        actorId: currentProfile?.id,
      });

      showToast({
        type: 'success',
        title: 'খরচ রেকর্ড সম্পন্ন',
        message: `৳${numericAmount.toFixed(2)} সফলভাবে ব্যালেন্স থেকে কর্তন ও সংরক্ষিত হয়েছে।`,
      });

      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      setError(err.message || 'খরচ সংরক্ষণে সমস্যা হয়েছে।');
    }
  };

  return (
    <div className="space-y-6">
      {/* ---------------- TOP ACTION BAR ---------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              খরচ ব্যবস্থাপনা (Expense Manager)
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold text-xs">
              স্টেপ ৩
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            দোকান ভাড়া, বিদ্যুৎ, কর্মচারী বেতন ও দৈনন্দিন অপারেটিং ব্যয়ের নিখুঁত হিসাব ও ভাউচার ট্র্যাকিং
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>নতুন খরচ যুক্ত করুন</span>
        </button>
      </div>

      {/* ---------------- METRIC OVERVIEW CARDS ---------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block">সর্বমোট দোকান খরচ:</span>
            <span className="font-mono font-extrabold text-xl text-rose-600">
              ৳{totalExpenseAmount.toFixed(2)}
            </span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block">মোট খরচ এন্ট্রি:</span>
            <span className="font-mono font-extrabold text-xl text-slate-900 dark:text-slate-100">
              {expenses.length} টি
            </span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 flex items-center justify-center">
            <Receipt className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block">সক্রিয় ক্যাটাগরি:</span>
            <span className="font-mono font-extrabold text-xl text-blue-600">
              {EXPENSE_CATEGORIES.length} টি ধরণ
            </span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
            <PieChart className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ---------------- EXPENSE TABLE WITH FILTER BAR ---------------- */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Filter bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-3 items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 md:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="বিবরণ বা রেফারেন্স দিয়ে খুঁজুন..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:border-emerald-600"
              />
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="py-1.5 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none"
            >
              <option value="all">সকল ক্যাটাগরি</option>
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat.key} value={cat.key}>
                  {cat.labelBn}
                </option>
              ))}
            </select>

            {/* Date Filter */}
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="py-1 px-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono focus:outline-none"
            />
            {dateFilter && (
              <button
                onClick={() => setDateFilter('')}
                className="text-[11px] text-slate-400 hover:text-slate-600 font-semibold"
              >
                রিসেট
              </button>
            )}
          </div>

          <span className="text-xs text-slate-500 font-mono">
            {filteredExpenses.length} টি রেকর্ড
          </span>
        </div>

        {/* Expenses Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 text-slate-500 text-[11px] font-semibold">
                <th className="py-3 px-4">তারিখ</th>
                <th className="py-3 px-4">ক্যাটাগরি</th>
                <th className="py-3 px-4">বিবরণ ও ভাউচার</th>
                <th className="py-3 px-4">পরিশোধ অ্যাকাউন্ট</th>
                <th className="py-3 px-4 text-right">টাকা (Amount)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-slate-400">
                    কোনো খরচের হিসাব পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => {
                  const catInfo = EXPENSE_CATEGORIES.find((c) => c.key === exp.category);
                  return (
                    <tr
                      key={exp.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                        {new Date(exp.date).toLocaleDateString('bn-BD')}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold border ${
                            catInfo?.color || 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {catInfo?.labelBn.split(' (')[0] || exp.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-200">
                        <div className="font-semibold">{exp.description}</div>
                        {exp.reference && (
                          <span className="text-[10px] font-mono text-slate-400 block">
                            ভাউচার/রেফ: {exp.reference}
                          </span>
                        )}
                        {exp.notes && (
                          <span className="text-[10px] text-slate-400 block">{exp.notes}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                        {exp.paymentAccountName} ({exp.paymentMethod})
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-rose-600 text-sm">
                        ৳{exp.amount.toFixed(2)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------------- RECORD EXPENSE MODAL ---------------- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  নতুন খরচ রেকর্ড করুন
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
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
                  খরচের খাত (Category) *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                  className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat.key} value={cat.key}>
                      {cat.labelBn}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  খরচের বিবরণ (Description) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: চলতি মাসের দোকান ভাড়া অগ্রিম"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    টাকার পরিমাণ (৳) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    তারিখ *
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  যে অ্যাকাউন্ট থেকে টাকা পরিশোধ হবে *
                </label>
                <select
                  value={paymentAccountId}
                  onChange={(e) => setPaymentAccountId(e.target.value)}
                  className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
                >
                  {cashAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} (বর্তমান স্থিতি: ৳{a.currentBalance})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ভাউচার বা রেফারেন্স নম্বর
                </label>
                <input
                  type="text"
                  placeholder="যেমন: VOUCHER-0021"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  মন্তব্য / নোট
                </label>
                <textarea
                  rows={2}
                  placeholder="খরচ সংক্রান্ত অতিরিক্ত কোনো তথ্য..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors shadow-sm"
                >
                  খরচ সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
