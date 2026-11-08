/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useId } from 'react';
import {
  Truck,
  Plus,
  Search,
  Phone,
  Edit2,
  DollarSign,
  History,
  X,
  CheckCircle2,
  AlertCircle,
  FileText,
  Building,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import {
  getPurchasesByShop,
  getSupplierPaymentsByShop,
  getSuppliersByShop,
  recordSupplierPaymentEntry,
  saveSupplier,
} from '../../services/inventoryStorage';
import { Supplier } from '../../types/inventory';
import { formatBDPhoneDisplay } from '../../utils/phone';

export const SupplierManager: React.FC = () => {
  const { currentShop } = useAuth();
  const { t } = useLanguage();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Pay Supplier Modal State
  const [paySupplierTarget, setPaySupplierTarget] = useState<Supplier | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('Cash');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [payError, setPayError] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [openingPayable, setOpeningPayable] = useState('0');
  const [formError, setFormError] = useState<string | null>(null);

  // Selected Profile
  const [viewingSupplier, setViewingSupplier] = useState<Supplier | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const supplierPayMethodSelectId = useId();

  if (!currentShop) return null;

  const suppliers = getSuppliersByShop(currentShop.id);
  const payments = getSupplierPaymentsByShop(currentShop.id, viewingSupplier?.id);
  const purchases = getPurchasesByShop(currentShop.id).filter(
    (p) => p.supplierId === viewingSupplier?.id
  );

  const filteredSuppliers = suppliers.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    return (
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.phone.includes(q) ||
      (s.contactPerson && s.contactPerson.toLowerCase().includes(q))
    );
  });

  const totalPayableAcrossSuppliers = suppliers.reduce(
    (sum, s) => sum + (s.currentPayable || 0),
    0
  );

  const handleOpenAdd = () => {
    setEditingSupplier(null);
    setName('');
    setContactPerson('');
    setPhone('');
    setAddress('');
    setEmail('');
    setNotes('');
    setOpeningPayable('0');
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (s: Supplier) => {
    setEditingSupplier(s);
    setName(s.name);
    setContactPerson(s.contactPerson || '');
    setPhone(s.phone);
    setAddress(s.address || '');
    setEmail(s.email || '');
    setNotes(s.notes || '');
    setOpeningPayable(s.openingPayable?.toString() || '0');
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('সাপ্লায়ার বা প্রতিষ্ঠানের নাম দেওয়া আবশ্যক');
      return;
    }
    if (!phone.trim()) {
      setFormError('ফোন নম্বর দেওয়া আবশ্যক');
      return;
    }

    try {
      saveSupplier({
        id: editingSupplier?.id,
        shopId: currentShop.id,
        name: name.trim(),
        contactPerson: contactPerson.trim(),
        phone: phone.trim(),
        address: address.trim(),
        email: email.trim(),
        notes: notes.trim(),
        openingPayable: parseFloat(openingPayable) || 0,
        currentPayable: editingSupplier
          ? editingSupplier.currentPayable
          : parseFloat(openingPayable) || 0,
        totalPurchases: editingSupplier?.totalPurchases || 0,
        isActive: true,
      });

      showToast({
        type: 'success',
        title: editingSupplier ? 'সাপ্লায়ার তথ্য আপডেট হয়েছে' : 'নতুন সাপ্লায়ার সংরক্ষিত হয়েছে',
      });
      setIsFormModalOpen(false);
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      setFormError(String(err));
    }
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setPayError(null);

    const amt = parseFloat(payAmount);
    if (isNaN(amt) || amt <= 0) {
      setPayError('পরিশোধের সঠিক পরিমাণ লিখুন');
      return;
    }

    if (paySupplierTarget) {
      recordSupplierPaymentEntry({
        shopId: currentShop.id,
        supplierId: paySupplierTarget.id,
        amount: amt,
        paymentMethod: payMethod,
        referenceNumber: payRef.trim(),
        notes: payNotes.trim(),
      });

      showToast({
        type: 'success',
        title: 'সাপ্লায়ার পেমেন্ট সফলভাবে রেকর্ড হয়েছে',
        message: `${amt} ৳ পরিশোধ করা হয়েছে (${paySupplierTarget.name})`,
      });

      setPaySupplierTarget(null);
      setPayAmount('');
      setPayRef('');
      setPayNotes('');
      setRefreshKey((k) => k + 1);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Truck className="w-6 h-6 text-emerald-600" />
            <span>{t('suppliersTitle')}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            মোট {suppliers.length} জন সরবরাহকারী · সর্বমোট দেনা (Payable):{' '}
            <strong className="text-rose-600 font-mono tabular-nums">
              {totalPayableAcrossSuppliers.toFixed(2)} ৳
            </strong>
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>{t('addSupplier')}</span>
        </button>
      </div>

      {/* Search */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="সাপ্লায়ারের নাম, দায়িত্বপ্রাপ্ত ব্যক্তি বা ফোন নম্বর দিয়ে খুঁজুন..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:border-emerald-600"
          />
        </div>
      </div>

      {/* Supplier List Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {filteredSuppliers.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            কোনো সাপ্লায়ার পাওয়া যায়নি।
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">প্রতিষ্ঠান / সাপ্লায়ার</th>
                  <th className="py-3 px-4">দায়িত্বপ্রাপ্ত ব্যক্তি</th>
                  <th className="py-3 px-4">ফোন</th>
                  <th className="py-3 px-4">ঠিকানা</th>
                  <th className="py-3 px-4 text-right">পাওনা ব্যালেন্স</th>
                  <th className="py-3 px-4 text-right">পদক্ষেপ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredSuppliers.map((s) => (
                  <tr
                    key={s.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">
                      {s.name}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                      {s.contactPerson || '—'}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                      {formatBDPhoneDisplay(s.phone)}
                    </td>
                    <td className="py-3 px-4 text-slate-500 max-w-[200px] truncate">
                      {s.address || '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold tabular-nums">
                      <span className={s.currentPayable > 0 ? 'text-rose-600' : 'text-slate-400'}>
                        {s.currentPayable.toFixed(2)} ৳
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {s.currentPayable > 0 && (
                          <button
                            onClick={() => {
                              setPaySupplierTarget(s);
                              setPayAmount(s.currentPayable.toString());
                              setPayError(null);
                            }}
                            className="px-2.5 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 hover:bg-emerald-100 rounded-lg font-bold text-[11px] transition-colors"
                          >
                            পরিশোধ
                          </button>
                        )}
                        <button
                          onClick={() => setViewingSupplier(s)}
                          className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                          title="Ledger Statement"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(s)}
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

      {/* Supplier Statement Drawer */}
      {viewingSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                সাপ্লায়ার লেজার স্টেটমেন্ট
              </h3>
              <button
                onClick={() => setViewingSupplier(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border space-y-1">
              <h4 className="font-bold text-base text-slate-900 dark:text-slate-100">
                {viewingSupplier.name}
              </h4>
              <p className="font-mono text-slate-500">{formatBDPhoneDisplay(viewingSupplier.phone)}</p>
              <div className="pt-2 flex justify-between font-bold border-t border-slate-200 dark:border-slate-700 text-sm">
                <span>বর্তমান পাওনা (Payable):</span>
                <span className="font-mono text-rose-600">
                  {viewingSupplier.currentPayable.toFixed(2)} ৳
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <h5 className="font-bold text-slate-800 dark:text-slate-200">
                পেমেন্ট পরিশোধের হিস্ট্রি ({payments.length})
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
                        <span className="font-bold text-emerald-600 font-mono">
                          -{p.amount.toFixed(2)} ৳
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          {p.paymentMethod} {p.referenceNumber && `(${p.referenceNumber})`}
                        </span>
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

      {/* Pay Supplier Modal */}
      {paySupplierTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                {t('paySupplier')} — {paySupplierTarget.name}
              </h4>
              <button
                onClick={() => setPaySupplierTarget(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {payError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-medium">
                {payError}
              </div>
            )}

            <form onSubmit={handleRecordPayment} className="space-y-3">
              <div>
                <label className="font-semibold block mb-1">পরিশোধের পরিমাণ (৳) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold text-sm"
                />
              </div>

              <div>
                <label htmlFor={supplierPayMethodSelectId} className="font-semibold block mb-1">পেমেন্টের মাধ্যম</label>
                <select
                  id={supplierPayMethodSelectId}
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                >
                  <option value="Cash">ক্যাশ (Cash)</option>
                  <option value="Bank">ব্যাংক চেক / ট্রান্সফার</option>
                  <option value="bKash">বিকাশ (bKash)</option>
                  <option value="Nagad">নগদ (Nagad)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1">চেক / ভাউচার / রেফারেন্স নম্বর</label>
                <input
                  type="text"
                  placeholder="যেমন: CHQ-82910"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPaySupplierTarget(null)}
                  className="px-4 py-2 border rounded-xl"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold"
                >
                  পরিশোধ সম্পন্ন করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Supplier Modal */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                {editingSupplier ? t('editSupplier') : t('addSupplier')}
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

            <form onSubmit={handleSaveSupplier} className="space-y-3">
              <div>
                <label className="font-semibold block mb-1">{t('supplierName')} *</label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: ঢাকা টেক্সটাইল মিলস"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">{t('contactPerson')}</label>
                <input
                  type="text"
                  placeholder="যেমন: মোঃ রফিকুল ইসলাম"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">ফোন নম্বর *</label>
                <input
                  type="tel"
                  required
                  placeholder="01XXXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">ঠিকানা</label>
                <input
                  type="text"
                  placeholder="দোকান/ফ্যাক্টরি, মার্কেট, এলাকা"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">প্রারম্ভিক দেনা (Opening Payable ৳)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={openingPayable}
                  onChange={(e) => setOpeningPayable(e.target.value)}
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
    </div>
  );
};
