/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  Wallet,
  Building,
  Smartphone,
  Coins,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileText,
  DollarSign,
  Clock,
  ShieldCheck,
  Search,
  Filter,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import {
  getCashAccountsByShop,
  getCashTransactionsByShop,
  saveCashAccount,
  transferBetweenAccounts,
  getDailyClosingsByShop,
  saveDailyClosing,
} from '../../services/financeStorage';
import { CashAccount, CashTransaction, DailyCashClosing } from '../../types/finance';

export const CashbookManager: React.FC = () => {
  const { currentShop, currentProfile } = useAuth();
  const { t } = useLanguage();
  const { showToast } = useToast();

  const [accounts, setAccounts] = useState<CashAccount[]>([]);
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [closings, setClosings] = useState<DailyCashClosing[]>([]);

  // Filter state
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // Modals
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
  const [isDailyClosingModalOpen, setIsDailyClosingModalOpen] = useState(false);

  // Transfer Form State
  const [transferFrom, setTransferFrom] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferRef, setTransferRef] = useState('');
  const [transferNotes, setTransferNotes] = useState('');
  const [transferError, setTransferError] = useState<string | null>(null);

  // New Account Form State
  const [newAccName, setNewAccName] = useState('');
  const [newAccType, setNewAccType] = useState<'CASH' | 'BANK' | 'BKASH' | 'NAGAD' | 'ROCKET' | 'OTHER'>('BANK');
  const [newAccNumber, setNewAccNumber] = useState('');
  const [newAccBalance, setNewAccBalance] = useState('0');

  // Daily Closing State
  const [actualCashInput, setActualCashInput] = useState('');
  const [closingNotes, setClosingNotes] = useState('');

  const loadData = () => {
    if (!currentShop) return;
    const accs = getCashAccountsByShop(currentShop.id);
    setAccounts(accs);
    setTransactions(getCashTransactionsByShop(currentShop.id));
    setClosings(getDailyClosingsByShop(currentShop.id));

    if (accs.length >= 2) {
      if (!transferFrom) setTransferFrom(accs[0].id);
      if (!transferTo) setTransferTo(accs[1].id);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentShop]);

  if (!currentShop) return null;

  // Aggregate Metrics
  const totalBalanceAcrossAccounts = accounts.reduce((sum, a) => sum + (Number(a.currentBalance) || 0), 0);

  const cashInTransactions = transactions.filter((t) =>
    ['OPENING_BALANCE', 'SALES_RECEIPT', 'CUSTOMER_PAYMENT', 'TRANSFER_IN'].includes(t.transactionType)
  );
  const totalCashIn = cashInTransactions.reduce((sum, t) => sum + t.amount, 0);

  const cashOutTransactions = transactions.filter((t) =>
    ['EXPENSE', 'PURCHASE_PAYMENT', 'SUPPLIER_PAYMENT', 'REFUND', 'TRANSFER_OUT'].includes(t.transactionType)
  );
  const totalCashOut = cashOutTransactions.reduce((sum, t) => sum + t.amount, 0);

  // Filtered Transactions
  const filteredTransactions = transactions.filter((tx) => {
    if (selectedAccountId !== 'all' && tx.accountId !== selectedAccountId) return false;
    if (filterType !== 'all') {
      if (filterType === 'in' && !['OPENING_BALANCE', 'SALES_RECEIPT', 'CUSTOMER_PAYMENT', 'TRANSFER_IN'].includes(tx.transactionType)) return false;
      if (filterType === 'out' && !['EXPENSE', 'PURCHASE_PAYMENT', 'SUPPLIER_PAYMENT', 'REFUND', 'TRANSFER_OUT'].includes(tx.transactionType)) return false;
      if (filterType === 'transfers' && !['TRANSFER_IN', 'TRANSFER_OUT'].includes(tx.transactionType)) return false;
    }
    if (dateFilter && !tx.createdAt.startsWith(dateFilter)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = tx.accountName.toLowerCase().includes(q);
      const matchNote = tx.notes?.toLowerCase().includes(q);
      const matchRef = tx.reference?.toLowerCase().includes(q);
      const matchInv = tx.invoiceNumber?.toLowerCase().includes(q);
      if (!matchName && !matchNote && !matchRef && !matchInv) return false;
    }
    return true;
  });

  // Handle Transfer Submit
  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTransferError(null);
    const amt = Number(transferAmount) || 0;

    if (amt <= 0) {
      setTransferError('স্থানান্তরের পরিমাণ ০ এর চেয়ে বেশি হতে হবে।');
      return;
    }

    try {
      transferBetweenAccounts({
        shopId: currentShop.id,
        fromAccountId: transferFrom,
        toAccountId: transferTo,
        amount: amt,
        reference: transferRef.trim() || undefined,
        notes: transferNotes.trim() || undefined,
        actorId: currentProfile?.id,
      });

      showToast({
        type: 'success',
        title: 'অ্যাকাউন্ট ট্রান্সফার সফল',
        message: `৳${amt.toFixed(2)} সফলভাবে স্থানান্তরিত হয়েছে (এটি লাভ বা ক্ষতিতে যুক্ত হবে না)।`,
      });

      setIsTransferModalOpen(false);
      setTransferAmount('');
      setTransferRef('');
      setTransferNotes('');
      loadData();
    } catch (err: any) {
      setTransferError(err.message || 'ট্রান্সফার ব্যর্থ হয়েছে।');
    }
  };

  // Handle Add Account Submit
  const handleAddAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccName.trim()) return;

    try {
      saveCashAccount({
        shopId: currentShop.id,
        name: newAccName.trim(),
        type: newAccType,
        accountNumber: newAccNumber.trim() || undefined,
        currentBalance: Number(newAccBalance) || 0,
        isDefault: false,
        isActive: true,
      });

      showToast({
        type: 'success',
        title: 'অ্যাকাউন্ট তৈরি হয়েছে',
        message: `${newAccName} সফলভাবে যুক্ত হয়েছে।`,
      });

      setIsAddAccountModalOpen(false);
      setNewAccName('');
      setNewAccNumber('');
      setNewAccBalance('0');
      loadData();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'ব্যর্থ হয়েছে',
        message: err.message,
      });
    }
  };

  // Cash in hand account for daily closing
  const cashInHandAccount = accounts.find((a) => a.type === 'CASH') || accounts[0];

  const handleDailyClosingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const actual = Number(actualCashInput) || 0;
    const expected = cashInHandAccount ? cashInHandAccount.currentBalance : 0;
    const diff = Number((actual - expected).toFixed(2));
    const today = new Date().toISOString().split('T')[0];

    saveDailyClosing({
      id: crypto.randomUUID(),
      shopId: currentShop.id,
      date: today,
      openedAt: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
      closedAt: new Date().toISOString(),
      openingCash: 5000,
      totalCashSales: 0,
      totalCustomerDueCollected: 0,
      totalCashExpenses: 0,
      totalCashSupplierPayments: 0,
      totalCashRefunds: 0,
      expectedCash: expected,
      actualCash: actual,
      difference: diff,
      status: 'CLOSED',
      closedBy: currentProfile?.fullName || 'অ্যাডমিন',
      notes: closingNotes,
    });

    showToast({
      type: diff === 0 ? 'success' : 'warning',
      title: 'ডেইলি ক্লোজিং সম্পন্ন',
      message:
        diff === 0
          ? 'ক্যাশ ড্রয়ার হিসাব শতভাগ নির্ভুল মিলেছে!'
          : `ক্যাশ ড্রয়ারে ৳${Math.abs(diff)} এর ${diff > 0 ? 'উদ্বৃত্ত' : 'ঘাটতি'} পরিলক্ষিত হয়েছে।`,
    });

    setIsDailyClosingModalOpen(false);
    setActualCashInput('');
    setClosingNotes('');
    loadData();
  };

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'CASH':
        return <Coins className="w-5 h-5 text-emerald-600" />;
      case 'BANK':
        return <Building className="w-5 h-5 text-blue-600" />;
      case 'BKASH':
      case 'NAGAD':
      case 'ROCKET':
        return <Smartphone className="w-5 h-5 text-pink-600" />;
      default:
        return <Wallet className="w-5 h-5 text-slate-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* ---------------- TOP ACTION BAR ---------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              ক্যাশ ও পেমেন্ট খাতা (Cashbook)
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold text-xs">
              স্টেপ ৩
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            নগদ ক্যাশ, বিকাশ, নগদ, রকেট ও ব্যাংক একাউন্টের রিয়েল-টাইম হিসাব এবং ক্যাশ ড্রয়ার ক্লোজিং
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsDailyClosingModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 font-bold text-xs flex items-center gap-1.5 transition-colors"
          >
            <Clock className="w-4 h-4 text-amber-600" />
            <span>ডেইলি ক্যাশ ক্লোজিং</span>
          </button>

          <button
            onClick={() => setIsTransferModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>অ্যাকাউন্ট ট্রান্সফার</span>
          </button>

          <button
            onClick={() => setIsAddAccountModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>নতুন অ্যাকাউন্ট</span>
          </button>
        </div>
      </div>

      {/* ---------------- ACCOUNT BALANCES CARDS GRID ---------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {accounts.map((acc) => (
          <div
            key={acc.id}
            onClick={() => setSelectedAccountId(selectedAccountId === acc.id ? 'all' : acc.id)}
            className={`p-4 rounded-3xl border transition-all cursor-pointer relative overflow-hidden group ${
              selectedAccountId === acc.id
                ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-md ring-2 ring-emerald-500/20'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-9 h-9 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center border border-slate-100 dark:border-slate-700">
                {getAccountIcon(acc.type)}
              </div>
              {acc.isDefault && (
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">
                  ডিফল্ট
                </span>
              )}
            </div>

            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate">
              {acc.name}
            </span>
            {acc.accountNumber && (
              <span className="text-[10px] text-slate-400 font-mono block truncate">
                {acc.accountNumber}
              </span>
            )}

            <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <span className="text-[10px] text-slate-400 block">বর্তমান ব্যালেন্স:</span>
              <span className="font-mono font-extrabold text-base text-slate-900 dark:text-slate-100">
                ৳{acc.currentBalance.toFixed(2)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ---------------- AGGREGATE SUMMARY STRIP ---------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block">সকল অ্যাকাউন্টের মোট স্থিতি:</span>
            <span className="font-mono font-extrabold text-xl text-emerald-600">
              ৳{totalBalanceAcrossAccounts.toFixed(2)}
            </span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
            <Wallet className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block">মোট জমা (Cash In):</span>
            <span className="font-mono font-extrabold text-xl text-blue-600">
              + ৳{totalCashIn.toFixed(2)}
            </span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block">মোট খরচ ও পেমেন্ট (Cash Out):</span>
            <span className="font-mono font-extrabold text-xl text-rose-600">
              - ৳{totalCashOut.toFixed(2)}
            </span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ---------------- TRANSACTIONS JOURNAL TABLE ---------------- */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Filter bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-3 items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Search */}
            <div className="relative flex-1 md:w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="বিবরণ / রেফারেন্স..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:border-emerald-600"
              />
            </div>

            {/* Account Filter */}
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="py-1.5 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none"
            >
              <option value="all">সকল অ্যাকাউন্ট ({accounts.length})</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>

            {/* Type Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="py-1.5 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none"
            >
              <option value="all">সকল লেনদেন</option>
              <option value="in">শুধু জমা (Cash In)</option>
              <option value="out">শুধু খরচ/পেমেন্ট (Cash Out)</option>
              <option value="transfers">শুধু ট্রান্সফার (Transfers)</option>
            </select>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <span className="text-xs text-slate-500 font-mono">
              মোট: {filteredTransactions.length} টি রেকর্ড
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 text-slate-500 text-[11px] font-semibold">
                <th className="py-3 px-4">তারিখ ও সময়</th>
                <th className="py-3 px-4">অ্যাকাউন্ট</th>
                <th className="py-3 px-4">ধরণ (Transaction Type)</th>
                <th className="py-3 px-4">বিবরণ ও রেফারেন্স</th>
                <th className="py-3 px-4 text-right">টাকা (Amount)</th>
                <th className="py-3 px-4 text-right">স্থগিত স্থিতি (Balance)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    কোনো ক্যাশ লেনদেন পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const isIn = ['OPENING_BALANCE', 'SALES_RECEIPT', 'CUSTOMER_PAYMENT', 'TRANSFER_IN'].includes(tx.transactionType);
                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                        {new Date(tx.createdAt).toLocaleDateString('bn-BD')} {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                        {tx.accountName}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            tx.transactionType === 'SALES_RECEIPT'
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                              : tx.transactionType === 'CUSTOMER_PAYMENT'
                              ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300'
                              : tx.transactionType === 'EXPENSE'
                              ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                              : tx.transactionType.startsWith('TRANSFER')
                              ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300'
                              : tx.transactionType === 'REFUND'
                              ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600'
                          }`}
                        >
                          {tx.transactionType === 'SALES_RECEIPT'
                            ? 'বিক্রয় রসিদ'
                            : tx.transactionType === 'CUSTOMER_PAYMENT'
                            ? 'বকেয়া আদায়'
                            : tx.transactionType === 'EXPENSE'
                            ? 'দোকান খরচ'
                            : tx.transactionType === 'TRANSFER_IN'
                            ? 'ট্রান্সফার জমা'
                            : tx.transactionType === 'TRANSFER_OUT'
                            ? 'ট্রান্সফার প্রেরণ'
                            : tx.transactionType === 'REFUND'
                            ? 'বিক্রয় ফেরত রিফান্ড'
                            : 'প্রারম্ভিক জমা'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        <div>{tx.notes || '—'}</div>
                        {tx.reference && (
                          <span className="text-[10px] font-mono text-slate-400">
                            রেফ: {tx.reference}
                          </span>
                        )}
                        {tx.invoiceNumber && (
                          <span className="text-[10px] font-mono text-emerald-600 block">
                            চালান: {tx.invoiceNumber}
                          </span>
                        )}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-mono font-bold text-xs ${
                          isIn ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {isIn ? '+' : '-'} ৳{tx.amount.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-700 dark:text-slate-300">
                        ৳{tx.balanceAfter.toFixed(2)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------------- INTERNAL ACCOUNT TRANSFER MODAL ---------------- */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center">
                  <ArrowLeftRight className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    অভ্যন্তরীণ অ্যাকাউন্ট ট্রান্সফার
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    এক অ্যাকাউন্ট থেকে অন্য অ্যাকাউন্টে টাকা স্থানান্তর (লাভ/ক্ষতিতে প্রভাব ফেলবে না)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsTransferModalOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600"
              >
                ×
              </button>
            </div>

            {transferError && (
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
                {transferError}
              </div>
            )}

            <form onSubmit={handleTransferSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  যে অ্যাকাউন্ট থেকে টাকা যাবে (Source Account) *
                </label>
                <select
                  value={transferFrom}
                  onChange={(e) => setTransferFrom(e.target.value)}
                  className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} (বর্তমান স্থিতি: ৳{a.currentBalance})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  যে অ্যাকাউন্টে জমা হবে (Destination Account) *
                </label>
                <select
                  value={transferTo}
                  onChange={(e) => setTransferTo(e.target.value)}
                  className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id} disabled={a.id === transferFrom}>
                      {a.name} (বর্তমান স্থিতি: ৳{a.currentBalance})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  টাকার পরিমাণ (Amount in BDT) *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="যেমন: ৫০০০"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  রেফারেন্স / ব্যাংক ডিপোজিট স্লিপ নং
                </label>
                <input
                  type="text"
                  placeholder="যেমন: DEPOSIT-SLIP-881"
                  value={transferRef}
                  onChange={(e) => setTransferRef(e.target.value)}
                  className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-emerald-600 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  মন্তব্য / নোট
                </label>
                <input
                  type="text"
                  placeholder="যেমন: ক্যাশ ড্রয়ার থেকে ব্যাংক ডিপোজিট"
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors shadow-sm"
                >
                  ট্রান্সফার সম্পন্ন করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- ADD NEW ACCOUNT MODAL ---------------- */}
      {isAddAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                নতুন ক্যাশ/পেমেন্ট অ্যাকাউন্ট
              </h3>
              <button
                onClick={() => setIsAddAccountModalOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddAccountSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  অ্যাকাউন্টের নাম *
                </label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: ডাচ-বাংলা ব্যাংক লিমিটেড"
                  value={newAccName}
                  onChange={(e) => setNewAccName(e.target.value)}
                  className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  অ্যাকাউন্টের ধরণ *
                </label>
                <select
                  value={newAccType}
                  onChange={(e) => setNewAccType(e.target.value as any)}
                  className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
                >
                  <option value="CASH">ক্যাশ (Cash)</option>
                  <option value="BANK">ব্যাংক একাউন্ট (Bank)</option>
                  <option value="BKASH">বিকাশ (bKash)</option>
                  <option value="NAGAD">নগদ (Nagad)</option>
                  <option value="ROCKET">রকেট (Rocket)</option>
                  <option value="OTHER">অন্যান্য (Other)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  অ্যাকাউন্ট / মোবাইল নম্বর (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  placeholder="যেমন: 123.120.987654"
                  value={newAccNumber}
                  onChange={(e) => setNewAccNumber(e.target.value)}
                  className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  প্রারম্ভিক স্থিতি (Opening Balance)
                </label>
                <input
                  type="number"
                  min="0"
                  value={newAccBalance}
                  onChange={(e) => setNewAccBalance(e.target.value)}
                  className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddAccountModalOpen(false)}
                  className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors shadow-sm"
                >
                  সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- DAILY CASH CLOSING MODAL ---------------- */}
      {isDailyClosingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    দৈনিক ক্যাশ ড্রয়ার ক্লোজিং (Shift Closing)
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    সফটওয়্যার প্রত্যাশিত ক্যাশ এবং ড্রয়ারের গণনাকৃত ক্যাশ মিলিয়ে নিন
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDailyClosingModalOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600"
              >
                ×
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>ক্যাশ ড্রয়ার অ্যাকাউন্ট:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {cashInHandAccount?.name}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm font-bold pt-1 border-t border-slate-200 dark:border-slate-700">
                <span>প্রত্যাশিত ক্যাশ (Expected):</span>
                <span className="font-mono text-emerald-600">
                  ৳{(cashInHandAccount?.currentBalance || 0).toFixed(2)}
                </span>
              </div>
            </div>

            <form onSubmit={handleDailyClosingSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ড্রয়ারে বাস্তবে গণনাকৃত ক্যাশ (Actual Cash Counted) *
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  placeholder={(cashInHandAccount?.currentBalance || 0).toFixed(2)}
                  value={actualCashInput}
                  onChange={(e) => setActualCashInput(e.target.value)}
                  className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold text-base text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600"
                />
              </div>

              {actualCashInput !== '' && (
                <div
                  className={`p-2.5 rounded-xl border text-xs font-mono font-bold flex items-center justify-between ${
                    Number(actualCashInput) === cashInHandAccount?.currentBalance
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}
                >
                  <span>অমিল / পার্থক্য (Difference):</span>
                  <span>
                    {Number(actualCashInput) - (cashInHandAccount?.currentBalance || 0) >= 0 ? '+' : ''}
                    ৳{(Number(actualCashInput) - (cashInHandAccount?.currentBalance || 0)).toFixed(2)}
                  </span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ক্লোজিং নোট / মন্তব্য (ঐচ্ছিক)
                </label>
                <textarea
                  rows={2}
                  placeholder="দিনের সমাপ্তি হিসাব বিবরণ..."
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsDailyClosingModalOpen(false)}
                  className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors shadow-sm"
                >
                  ক্লোজিং সম্পন্ন করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
