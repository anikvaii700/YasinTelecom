/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  FileText,
  X,
  Printer,
  Download,
  DollarSign,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Phone,
  User,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';
import { Customer } from '../../types/inventory';
import { Shop } from '../../types/auth';
import { CashAccount, CustomerLedgerEntry } from '../../types/finance';
import {
  getCashAccountsByShop,
  getCustomerLedger,
  recordCustomerDuePayment,
} from '../../services/financeStorage';
import { useToast } from '../../context/ToastContext';

interface CustomerLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  shop: Shop;
  onPaymentSuccess?: () => void;
}

export const CustomerLedgerModal: React.FC<CustomerLedgerModalProps> = ({
  isOpen,
  onClose,
  customer,
  shop,
  onPaymentSuccess,
}) => {
  const { showToast } = useToast();
  const [entries, setEntries] = useState<CustomerLedgerEntry[]>([]);
  const [cashAccounts, setCashAccounts] = useState<CashAccount[]>([]);

  // Collect Payment Form Drawer
  const [isCollectDueOpen, setIsCollectDueOpen] = useState(false);
  const [collectAmount, setCollectAmount] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [refNumber, setRefNumber] = useState('');
  const [collectNotes, setCollectNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadLedger = () => {
    if (!customer) return;
    const list = getCustomerLedger(shop.id, customer.id);
    setEntries(list);
    const accs = getCashAccountsByShop(shop.id);
    setCashAccounts(accs);
    if (accs.length > 0 && !selectedAccountId) {
      const def = accs.find((a) => a.isDefault) || accs[0];
      setSelectedAccountId(def.id);
    }
  };

  useEffect(() => {
    if (isOpen && customer) {
      loadLedger();
      setIsCollectDueOpen(false);
      setCollectAmount(customer.currentDue > 0 ? String(customer.currentDue) : '');
      setError(null);
    }
  }, [isOpen, customer]);

  if (!isOpen || !customer) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCollectDueSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const amt = Number(collectAmount) || 0;
    if (amt <= 0) {
      setError('টাকার পরিমাণ ০ এর চেয়ে বেশি হতে হবে।');
      return;
    }

    if (!selectedAccountId) {
      setError('পেমেন্ট অ্যাকাউন্ট নির্বাচন করুন।');
      return;
    }

    try {
      recordCustomerDuePayment({
        shopId: shop.id,
        customerId: customer.id,
        amount: amt,
        paymentAccountId: selectedAccountId,
        paymentMethod,
        referenceNumber: refNumber.trim() || undefined,
        notes: collectNotes.trim() || undefined,
      });

      showToast({
        type: 'success',
        title: 'বকেয়া আদায় সম্পন্ন',
        message: `৳${amt.toFixed(2)} সফলভাবে আদায় ও অ্যাকাউন্টে জমা হয়েছে।`,
      });

      setIsCollectDueOpen(false);
      loadLedger();
      if (onPaymentSuccess) onPaymentSuccess();
    } catch (err: any) {
      setError(err.message || 'বকেয়া আদায়ে সমস্যা হয়েছে।');
    }
  };

  const totalDebits = entries.reduce((s, e) => s + (e.debit || 0), 0);
  const totalCredits = entries.reduce((s, e) => s + (e.credit || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in print:p-0 print:bg-white">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] print:max-w-none print:w-full print:shadow-none print:border-none print:rounded-none">
        {/* Header - Hidden on Print */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                গ্রাহক লেজার ও হিসাব বিবরণী (Customer Statement)
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                {customer.name} · {customer.mobileNumber}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {customer.currentDue > 0 && (
              <button
                onClick={() => setIsCollectDueOpen(!isCollectDueOpen)}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <DollarSign className="w-4 h-4" />
                <span>বকেয়া জমা নিন</span>
              </button>
            )}

            <button
              onClick={handlePrint}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              title="স্টেটমেন্ট প্রিন্ট করুন"
            >
              <Printer className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Collect Due Drawer */}
        {isCollectDueOpen && (
          <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border-b border-emerald-200 dark:border-emerald-800/60 print:hidden animate-fade-in space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs text-emerald-900 dark:text-emerald-100">
                বকেয়া টাকা গ্রহণ ফরম
              </h4>
              <button
                onClick={() => setIsCollectDueOpen(false)}
                className="text-[11px] font-semibold text-slate-500 hover:underline"
              >
                বন্ধ
              </button>
            </div>

            {error && (
              <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {error}
              </div>
            )}

            <form onSubmit={handleCollectDueSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">টাকার পরিমাণ *</label>
                <input
                  type="number"
                  step="any"
                  min="1"
                  required
                  placeholder={String(customer.currentDue)}
                  value={collectAmount}
                  onChange={(e) => setCollectAmount(e.target.value)}
                  className="w-full py-1.5 px-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">জমা অ্যাকাউন্ট *</label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full py-1.5 px-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                >
                  {cashAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">মেথড</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full py-1.5 px-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                >
                  <option value="Cash">নগদ (Cash)</option>
                  <option value="bKash">বিকাশ (bKash)</option>
                  <option value="Nagad">নগদ (Nagad)</option>
                  <option value="Bank">ব্যাংক (Bank)</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors shadow-sm"
                >
                  জমা নিশ্চিত করুন
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Printable Customer Statement Viewport */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50 dark:bg-slate-950 flex justify-center print:p-0 print:bg-white">
          <div
            className="w-full bg-white text-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 print:shadow-none print:border-none print:p-0"
            style={{ fontFamily: "'Plus Jakarta Sans', 'Hind Siliguri', sans-serif" }}
          >
            {/* Shop Header */}
            <div className="text-center pb-4 border-b border-slate-200 space-y-1">
              <h2 className="text-base font-extrabold text-emerald-800">{shop.name}</h2>
              <p className="text-xs text-slate-600">{shop.address || ''} · মোবাইল: {shop.mobileNumber}</p>
              <div className="pt-1">
                <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-bold text-xs uppercase tracking-wider">
                  গ্রাহক হিসাব বিবরণী (Customer Statement)
                </span>
              </div>
            </div>

            {/* Customer & Statement Meta */}
            <div className="py-3 border-b border-slate-200 flex flex-wrap justify-between gap-3 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block">গ্রাহকের তথ্য:</span>
                <span className="font-bold text-sm block">{customer.name}</span>
                <span className="text-slate-600 font-mono">{customer.mobileNumber}</span>
                {customer.address && <p className="text-[11px] text-slate-500">{customer.address}</p>}
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">বর্তমান মোট বকেয়া:</span>
                <span className="font-mono font-extrabold text-lg text-rose-600 block">
                  ৳{customer.currentDue.toFixed(2)}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  প্রিন্ট তারিখ: {new Date().toLocaleDateString('bn-BD')}
                </span>
              </div>
            </div>

            {/* Ledger Transactions Table */}
            <div className="py-3">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                    <th className="py-2 px-2">তারিখ</th>
                    <th className="py-2 px-2">বিবরণ / চালান নং</th>
                    <th className="py-2 px-2 text-right">বাকি সৃষ্টি (Debit ৳)</th>
                    <th className="py-2 px-2 text-right">জমা পরিশোধ (Credit ৳)</th>
                    <th className="py-2 px-2 text-right">জের / স্থিতি (Balance ৳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {entries.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-6 text-slate-400 text-xs">
                        এখনো কোনো লেনদেন রেকর্ড নেই।
                      </td>
                    </tr>
                  ) : (
                    entries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-50/50">
                        <td className="py-2 px-2 font-mono text-[11px] text-slate-500">
                          {new Date(entry.createdAt).toLocaleDateString('bn-BD')}
                        </td>
                        <td className="py-2 px-2">
                          <span className="font-semibold block">{entry.notes || '—'}</span>
                          {entry.invoiceNumber && (
                            <span className="font-mono text-[10px] text-emerald-600">
                              #{entry.invoiceNumber}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-right font-mono font-semibold text-rose-600">
                          {entry.debit > 0 ? `৳${entry.debit.toFixed(2)}` : '—'}
                        </td>
                        <td className="py-2 px-2 text-right font-mono font-semibold text-emerald-600">
                          {entry.credit > 0 ? `৳${entry.credit.toFixed(2)}` : '—'}
                        </td>
                        <td className="py-2 px-2 text-right font-mono font-bold text-slate-900">
                          ৳{entry.balanceAfter.toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-300 font-bold bg-slate-50 font-mono text-xs">
                    <td colSpan={2} className="py-2 px-2">মোট সর্বমোট</td>
                    <td className="py-2 px-2 text-right text-rose-600">৳{totalDebits.toFixed(2)}</td>
                    <td className="py-2 px-2 text-right text-emerald-600">৳{totalCredits.toFixed(2)}</td>
                    <td className="py-2 px-2 text-right text-slate-900">৳{customer.currentDue.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Footer Disclaimer */}
            <div className="pt-4 text-center text-[10px] text-slate-400 border-t border-dashed border-slate-200">
              <p>অনাদায়কৃত বকেয়া কখনো নগদ প্রাপ্তি হিসেবে গণ্য নয়। এটি একটি কম্পিউটার জেনারেটেড স্টেটমেন্ট।</p>
              <p className="font-mono">MoSaFa Shop POS · আপনার দোকান, আপনার হিসাব</p>
            </div>
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between print:hidden">
          <span className="text-xs text-slate-500">
            বকেয়া স্টেটমেন্ট প্রিন্ট করতে বাটন চাপুন
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>প্রিন্ট স্টেটমেন্ট</span>
            </button>
            <button
              onClick={onClose}
              className="py-2 px-4 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl"
            >
              বন্ধ করুন
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
