/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useId } from 'react';
import {
  Users,
  Plus,
  Search,
  Phone,
  Edit2,
  DollarSign,
  History,
  X,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Mail,
  FileText,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import {
  getCustomerPaymentsByShop,
  getCustomersByShop,
  recordCustomerPaymentEntry,
  saveCustomer,
} from '../../services/inventoryStorage';
import { Customer } from '../../types/inventory';
import { formatBDPhoneDisplay } from '../../utils/phone';
import { CustomerLedgerModal } from './CustomerLedgerModal';

export const CustomerManager: React.FC = () => {
  const { currentShop } = useAuth();
  const { t } = useLanguage();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Payment Drawer State
  const [paymentCustomer, setPaymentCustomer] = useState<Customer | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [openingBalance, setOpeningBalance] = useState('0');
  const [formError, setFormError] = useState<string | null>(null);

  // Selected Profile
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const paymentMethodSelectId = useId();

  if (!currentShop) return null;

  const customers = getCustomersByShop(currentShop.id);
  const payments = getCustomerPaymentsByShop(currentShop.id, viewingCustomer?.id);

  const filteredCustomers = customers.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    return !q || c.name.toLowerCase().includes(q) || c.mobileNumber.includes(q);
  });

  const totalDueAcrossCustomers = customers.reduce((sum, c) => sum + (c.currentDue || 0), 0);

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setName('');
    setMobileNumber('');
    setAddress('');
    setEmail('');
    setNotes('');
    setOpeningBalance('0');
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (c: Customer) => {
    setEditingCustomer(c);
    setName(c.name);
    setMobileNumber(c.mobileNumber);
    setAddress(c.address || '');
    setEmail(c.email || '');
    setNotes(c.notes || '');
    setOpeningBalance(c.openingBalance?.toString() || '0');
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('গ্রাহকের নাম দেওয়া আবশ্যক');
      return;
    }
    if (!mobileNumber.trim()) {
      setFormError('মোবাইল নম্বর দেওয়া আবশ্যক');
      return;
    }

    try {
      saveCustomer({
        id: editingCustomer?.id,
        shopId: currentShop.id,
        name: name.trim(),
        mobileNumber: mobileNumber.trim(),
        address: address.trim(),
        email: email.trim(),
        notes: notes.trim(),
        openingBalance: parseFloat(openingBalance) || 0,
        currentDue: editingCustomer ? editingCustomer.currentDue : parseFloat(openingBalance) || 0,
        totalPurchases: editingCustomer?.totalPurchases || 0,
        isActive: true,
      });

      showToast({
        type: 'success',
        title: editingCustomer ? 'গ্রাহক তথ্য আপডেট হয়েছে' : 'নতুন গ্রাহক সংরক্ষিত হয়েছে',
      });
      setIsFormModalOpen(false);
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      setFormError(String(err));
    }
  };

  const handleReceivePayment = (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError(null);

    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      setPaymentError('আদায়ের সঠিক পরিমাণ লিখুন');
      return;
    }

    if (paymentCustomer) {
      recordCustomerPaymentEntry({
        shopId: currentShop.id,
        customerId: paymentCustomer.id,
        amount: amt,
        paymentMethod,
        referenceNumber: paymentRef.trim(),
        notes: paymentNotes.trim(),
      });

      showToast({
        type: 'success',
        title: 'বকেয়া সফলভাবে গ্রহণ করা হয়েছে',
        message: `${amt} ৳ আদায় হয়েছে (${paymentCustomer.name})`,
      });

      setPaymentCustomer(null);
      setPaymentAmount('');
      setPaymentRef('');
      setPaymentNotes('');
      setRefreshKey((k) => k + 1);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-600" />
            <span>{t('customersTitle')}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            মোট {customers.length} জন গ্রাহক · সর্বমোট বকেয়া:{' '}
            <strong className="text-rose-600 font-mono tabular-nums">{totalDueAcrossCustomers.toFixed(2)} ৳</strong>
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>{t('addCustomer')}</span>
        </button>
      </div>

      {/* Search */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="গ্রাহকের নাম বা মোবাইল নম্বর দিয়ে খুঁজুন..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:border-emerald-600"
          />
        </div>
      </div>

      {/* Customer List Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {filteredCustomers.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            কোনো গ্রাহক পাওয়া যায়নি।
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">গ্রাহক</th>
                  <th className="py-3 px-4">মোবাইল</th>
                  <th className="py-3 px-4">ঠিকানা</th>
                  <th className="py-3 px-4 text-right">বাকি (Due)</th>
                  <th className="py-3 px-4 text-right">পদক্ষেপ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredCustomers.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">
                      {c.name}
                      {c.notes && (
                        <span className="text-[11px] text-slate-400 font-normal block">
                          {c.notes}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                      {formatBDPhoneDisplay(c.mobileNumber)}
                    </td>
                    <td className="py-3 px-4 text-slate-500 max-w-[200px] truncate">
                      {c.address || '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold tabular-nums">
                      <span className={c.currentDue > 0 ? 'text-rose-600' : 'text-slate-400'}>
                        {c.currentDue.toFixed(2)} ৳
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {c.currentDue > 0 && (
                          <button
                            onClick={() => {
                              setPaymentCustomer(c);
                              setPaymentAmount(c.currentDue.toString());
                              setPaymentError(null);
                            }}
                            className="px-2.5 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 hover:bg-emerald-100 rounded-lg font-bold text-[11px] transition-colors"
                          >
                            বকেয়া আদায়
                          </button>
                        )}
                        <button
                          onClick={() => setViewingCustomer(c)}
                          className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                          title="Ledger Statement"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(c)}
                          className="p-1.5 text-slate-500 hover:text-emerald-600"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Customer Statement Drawer */}
      {viewingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                গ্রাহক লেজার স্টেটমেন্ট
              </h3>
              <button
                onClick={() => setViewingCustomer(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border space-y-1">
              <h4 className="font-bold text-base text-slate-900 dark:text-slate-100">
                {viewingCustomer.name}
              </h4>
              <p className="font-mono text-slate-500">{formatBDPhoneDisplay(viewingCustomer.mobileNumber)}</p>
              <div className="pt-2 flex justify-between font-bold border-t border-slate-200 dark:border-slate-700 text-sm">
                <span>বর্তমান বকেয়া:</span>
                <span className="font-mono text-rose-600">{viewingCustomer.currentDue.toFixed(2)} ৳</span>
              </div>
            </div>

            <div className="space-y-2">
              <h5 className="font-bold text-slate-800 dark:text-slate-200">
                বকেয়া পরিশোধের হিস্ট্রি ({payments.length})
              </h5>
              {payments.length === 0 ? (
                <p className="text-slate-400 text-center py-4">এখনও কোনো পেমেন্ট রেকর্ড নেই।</p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {payments.map((p) => (
                    <div
                      key={p.id}
                      className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 flex justify-between items-center"
                    >
                      <div>
                        <span className="font-bold text-emerald-600 font-mono">+{p.amount.toFixed(2)} ৳</span>
                        <span className="text-[10px] text-slate-400 block">{p.paymentMethod} {p.referenceNumber && `(${p.referenceNumber})`}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(p.createdAt).toLocaleDateString('bn-BD')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Receive Due Payment Modal */}
      {paymentCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                {t('receivePayment')} — {paymentCustomer.name}
              </h4>
              <button
                onClick={() => setPaymentCustomer(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {paymentError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 text-rose-700 font-medium">
                {paymentError}
              </div>
            )}

            <form onSubmit={handleReceivePayment} className="space-y-3">
              <div>
                <label className="font-semibold block mb-1">আদায়ের পরিমাণ (৳) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold text-sm"
                />
              </div>

              <div>
                <label htmlFor={paymentMethodSelectId} className="font-semibold block mb-1">পেমেন্টের মাধ্যম</label>
                <select
                  id={paymentMethodSelectId}
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                >
                  <option value="Cash">ক্যাশ (Cash)</option>
                  <option value="bKash">বিকাশ (bKash)</option>
                  <option value="Nagad">নগদ (Nagad)</option>
                  <option value="Bank">ব্যাংক ট্রান্সফার</option>
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1">ট্রানজেকশন / রেফারেন্স আইডি</label>
                <input
                  type="text"
                  placeholder="যেমন: TRX92810"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPaymentCustomer(null)}
                  className="px-4 py-2 border rounded-xl"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold"
                >
                  আদায় সম্পন্ন করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Customer Modal */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                {editingCustomer ? t('editCustomer') : t('addCustomer')}
              </h4>
              <button
                onClick={() => setIsFormModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveCustomer} className="space-y-3">
              <div>
                <label className="font-semibold block mb-1">{t('customerName')} *</label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: তানভীর আহমেদ"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">{t('mobileNumber')} *</label>
                <input
                  type="tel"
                  required
                  placeholder="01XXXXXXXXX"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">ঠিকানা</label>
                <input
                  type="text"
                  placeholder="বাড়ি, রাস্তা, এলাকা"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">প্রারম্ভিক বকেয়া (Opening Balance ৳)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">নোট (ঐচ্ছিক)</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 border rounded-xl"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold"
                >
                  {t('confirm')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Ledger Statement & Due Collection Modal */}
      <CustomerLedgerModal
        isOpen={Boolean(viewingCustomer)}
        onClose={() => setViewingCustomer(null)}
        customer={viewingCustomer}
        shop={currentShop}
        onPaymentSuccess={() => {
          setRefreshKey((k) => k + 1);
        }}
      />
    </div>
  );
};
