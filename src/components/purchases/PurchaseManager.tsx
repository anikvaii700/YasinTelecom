/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useId } from 'react';
import {
  ShoppingBag,
  Plus,
  Search,
  Calendar,
  Truck,
  Trash2,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  FileText,
  X,
  ArrowRight,
  Printer,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import {
  createPurchaseTransaction,
  getProductsByShop,
  getPurchasesByShop,
  getSuppliersByShop,
} from '../../services/inventoryStorage';
import { Purchase, PurchaseItem } from '../../types/inventory';
import { formatBDPhoneDisplay } from '../../utils/phone';

interface PurchaseLineItemDraft {
  productId: string;
  quantity: number;
  unitPurchasePrice: number;
}

export const PurchaseManager: React.FC = () => {
  const { currentShop, currentProfile } = useAuth();
  const { t } = useLanguage();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [isNewPurchaseOpen, setIsNewPurchaseOpen] = useState(false);
  const [viewingPurchase, setViewingPurchase] = useState<Purchase | null>(null);

  // New Purchase Form State
  const [supplierId, setSupplierId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [lineItems, setLineItems] = useState<PurchaseLineItemDraft[]>([]);
  const [discount, setDiscount] = useState('0');
  const [additionalCosts, setAdditionalCosts] = useState('0');
  const [paidAmount, setPaidAmount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [refreshKey, setRefreshKey] = useState(0);
  const purchaseSupplierSelectId = useId();
  const purchasePaymentMethodSelectId = useId();

  if (!currentShop) return null;

  const purchases = getPurchasesByShop(currentShop.id);
  const suppliers = getSuppliersByShop(currentShop.id);
  const products = getProductsByShop(currentShop.id);

  const filteredPurchases = purchases.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    return (
      !q ||
      p.invoiceNumber.toLowerCase().includes(q) ||
      p.supplierName.toLowerCase().includes(q)
    );
  });

  const handleOpenNewPurchase = () => {
    setSupplierId(suppliers[0]?.id || '');
    setInvoiceNumber(`PUR-${Math.floor(1000 + Math.random() * 9000)}`);
    setPurchaseDate(new Date().toISOString().slice(0, 10));
    setLineItems(
      products.length > 0
        ? [{ productId: products[0].id, quantity: 10, unitPurchasePrice: products[0].purchasePrice }]
        : []
    );
    setDiscount('0');
    setAdditionalCosts('0');
    setPaidAmount('0');
    setPaymentMethod('Cash');
    setNotes('');
    setFormError(null);
    setIsNewPurchaseOpen(true);
  };

  const handleAddLineItem = () => {
    if (products.length === 0) return;
    setLineItems([
      ...lineItems,
      {
        productId: products[0].id,
        quantity: 1,
        unitPurchasePrice: products[0].purchasePrice,
      },
    ]);
  };

  const handleRemoveLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof PurchaseLineItemDraft, value: any) => {
    const updated = [...lineItems];
    if (field === 'productId') {
      const prod = products.find((p) => p.id === value);
      updated[index].productId = value;
      if (prod) {
        updated[index].unitPurchasePrice = prod.purchasePrice;
      }
    } else {
      updated[index][field] = value;
    }
    setLineItems(updated);
  };

  // Calculations
  const subtotal = lineItems.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPurchasePrice) || 0),
    0
  );
  const numDiscount = parseFloat(discount) || 0;
  const numExtra = parseFloat(additionalCosts) || 0;
  const grandTotal = Math.max(0, subtotal - numDiscount + numExtra);
  const numPaid = Math.min(grandTotal, parseFloat(paidAmount) || 0);
  const dueAmount = grandTotal - numPaid;

  const handleSubmitPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!supplierId) {
      setFormError('অনুগ্রহ করে একজন সরবরাহকারী নির্বাচন করুন');
      return;
    }
    if (!invoiceNumber.trim()) {
      setFormError('চালান নম্বর দেওয়া আবশ্যক');
      return;
    }
    if (lineItems.length === 0) {
      setFormError('কমপক্ষে একটি পণ্য যোগ করুন');
      return;
    }

    setIsSubmitting(true);
    try {
      const idempotencyKey = `PURCHASE-${currentShop.id}-${invoiceNumber.trim().toUpperCase()}`;
      const created = createPurchaseTransaction({
        shopId: currentShop.id,
        supplierId,
        invoiceNumber: invoiceNumber.trim().toUpperCase(),
        purchaseDate,
        items: lineItems.map((item) => ({
          productId: item.productId,
          quantity: Number(item.quantity) || 1,
          unitPurchasePrice: Number(item.unitPurchasePrice) || 0,
        })),
        discount: numDiscount,
        additionalCosts: numExtra,
        paidAmount: numPaid,
        paymentMethod,
        notes: notes.trim(),
        idempotencyKey,
        actorId: currentProfile?.id,
      });

      showToast({
        type: 'success',
        title: 'ক্রয় চালান সম্পন্ন হয়েছে ও স্টক বৃদ্ধি পেয়েছে!',
        message: `চালান #${created.invoiceNumber} — মোট: ${created.grandTotal} ৳`,
      });

      setIsNewPurchaseOpen(false);
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      if (String(err).includes('DUPLICATE_INVOICE_NUMBER')) {
        setFormError('এই চালান নম্বর দিয়ে ইতোমধ্যে একটি ক্রয় রেকর্ড রয়েছে।');
      } else {
        setFormError(String(err));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-emerald-600" />
            <span>{t('purchasesTitle')}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            মোট {purchases.length}টি ক্রয় চালান সংরক্ষিত রয়েছে
          </p>
        </div>

        <button
          onClick={handleOpenNewPurchase}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>{t('newPurchase')}</span>
        </button>
      </div>

      {/* Search */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="চালান নম্বর বা সরবরাহকারীর নাম দিয়ে খুঁজুন..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:border-emerald-600"
          />
        </div>
      </div>

      {/* Purchases Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {filteredPurchases.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            কোনো ক্রয় চালান পাওয়া যায়নি।
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">চালান নং</th>
                  <th className="py-3 px-4">তারিখ</th>
                  <th className="py-3 px-4">সাপ্লায়ার</th>
                  <th className="py-3 px-4 text-center">আইটেম সংখ্যা</th>
                  <th className="py-3 px-4 text-right">সর্বমোট (৳)</th>
                  <th className="py-3 px-4 text-right">পরিশোধিত</th>
                  <th className="py-3 px-4 text-right">বকেয়া</th>
                  <th className="py-3 px-4 text-center">পদক্ষেপ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredPurchases.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                      {p.invoiceNumber}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {new Date(p.purchaseDate).toLocaleDateString('bn-BD')}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">
                      {p.supplierName}
                    </td>
                    <td className="py-3 px-4 text-center font-mono">
                      {p.items?.length || 0}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold tabular-nums text-slate-900 dark:text-slate-100">
                      {p.grandTotal.toFixed(2)} ৳
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-600 font-semibold tabular-nums">
                      {p.paidAmount.toFixed(2)} ৳
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold tabular-nums">
                      <span className={p.dueAmount > 0 ? 'text-rose-600' : 'text-slate-400'}>
                        {p.dueAmount.toFixed(2)} ৳
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setViewingPurchase(p)}
                        className="px-2 py-1 rounded-lg border text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-[11px]"
                      >
                        বিস্তারিত মেমো
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invoice Details Modal */}
      {viewingPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                ক্রয় চালান মেমো #{viewingPurchase.invoiceNumber}
              </h3>
              <button
                onClick={() => setViewingPurchase(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border">
              <div>
                <span className="text-[11px] text-slate-400 block">সাপ্লায়ার:</span>
                <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{viewingPurchase.supplierName}</span>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-slate-400 block">তারিখ:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {new Date(viewingPurchase.purchaseDate).toLocaleDateString('bn-BD')}
                </span>
              </div>
            </div>

            {/* Line items table */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                  <tr>
                    <th className="p-2.5">পণ্য</th>
                    <th className="p-2.5 text-center">পরিমাণ</th>
                    <th className="p-2.5 text-right">দর</th>
                    <th className="p-2.5 text-right">মোট</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {viewingPurchase.items?.map((it) => (
                    <tr key={it.id}>
                      <td className="p-2.5 font-bold text-slate-900 dark:text-slate-100">{it.productName}</td>
                      <td className="p-2.5 text-center font-mono">{it.quantity}</td>
                      <td className="p-2.5 text-right font-mono">{it.unitPurchasePrice.toFixed(2)}</td>
                      <td className="p-2.5 text-right font-mono font-bold">{it.subtotal.toFixed(2)} ৳</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border font-mono">
              <div className="flex justify-between text-slate-500">
                <span>উপ-মোট:</span>
                <span>{viewingPurchase.subtotal.toFixed(2)} ৳</span>
              </div>
              {viewingPurchase.discount > 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>ছাড়:</span>
                  <span>-{viewingPurchase.discount.toFixed(2)} ৳</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm text-slate-900 dark:text-slate-100 border-t pt-1">
                <span>সর্বমোট:</span>
                <span>{viewingPurchase.grandTotal.toFixed(2)} ৳</span>
              </div>
              <div className="flex justify-between text-emerald-600 font-semibold">
                <span>পরিশোধিত:</span>
                <span>{viewingPurchase.paidAmount.toFixed(2)} ৳ ({viewingPurchase.paymentMethod})</span>
              </div>
              <div className="flex justify-between text-rose-600 font-bold">
                <span>বকেয়া:</span>
                <span>{viewingPurchase.dueAmount.toFixed(2)} ৳</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Purchase Entry Drawer / Modal */}
      {isNewPurchaseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6 text-xs max-h-[92vh] flex flex-col my-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  {t('newPurchase')}
                </h3>
              </div>
              <button
                onClick={() => setIsNewPurchaseOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-medium shrink-0">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmitPurchase} className="space-y-5 overflow-y-auto flex-1 pr-1">
              {/* Supplier & Invoice No */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor={purchaseSupplierSelectId} className="font-semibold block mb-1">সরবরাহকারী (সাপ্লায়ার) *</label>
                  <select
                    id={purchaseSupplierSelectId}
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.phone})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold block mb-1">চালান / ইনভয়েস নং *</label>
                  <input
                    type="text"
                    required
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs uppercase"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">ক্রয়ের তারিখ *</label>
                  <input
                    type="date"
                    required
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  />
                </div>
              </div>

              {/* Line Items Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200">
                    ক্রয়কৃত পণ্যের তালিকা ({lineItems.length})
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddLineItem}
                    className="text-emerald-600 font-bold hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t('addItem')}</span>
                  </button>
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 font-semibold border-b">
                      <tr>
                        <th className="p-3">পণ্য</th>
                        <th className="p-3 w-28 text-center">পরিমাণ</th>
                        <th className="p-3 w-36 text-right">ইউনিট ক্রয় মূল্য (৳)</th>
                        <th className="p-3 w-32 text-right">মোট (৳)</th>
                        <th className="p-3 w-12 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {lineItems.map((item, idx) => {
                        const itemSub = (Number(item.quantity) || 0) * (Number(item.unitPurchasePrice) || 0);
                        return (
                          <tr key={idx}>
                            <td className="p-2.5">
                              <select
                                value={item.productId}
                                onChange={(e) => handleItemChange(idx, 'productId', e.target.value)}
                                className="w-full p-1.5 rounded-lg border bg-white dark:bg-slate-900 text-xs"
                              >
                                {products.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.nameBn} (বর্তমান স্টক: {p.currentStock})
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="p-2.5 text-center">
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) =>
                                  handleItemChange(idx, 'quantity', parseFloat(e.target.value) || 1)
                                }
                                className="w-20 p-1.5 text-center font-mono rounded-lg border bg-white dark:bg-slate-900"
                              />
                            </td>
                            <td className="p-2.5 text-right">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.unitPurchasePrice}
                                onChange={(e) =>
                                  handleItemChange(
                                    idx,
                                    'unitPurchasePrice',
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className="w-28 p-1.5 text-right font-mono rounded-lg border bg-white dark:bg-slate-900"
                              />
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold">
                              {itemSub.toFixed(2)} ৳
                            </td>
                            <td className="p-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveLineItem(idx)}
                                className="p-1 text-slate-400 hover:text-rose-600"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals & Payments */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border">
                <div className="space-y-3">
                  <div>
                    <label htmlFor={purchasePaymentMethodSelectId} className="font-semibold block mb-1">পেমেন্ট মাধ্যম</label>
                    <select
                      id={purchasePaymentMethodSelectId}
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-900"
                    >
                      <option value="Cash">ক্যাশ (Cash)</option>
                      <option value="Bank">ব্যাংক চেক / ট্রান্সফার</option>
                      <option value="bKash">বিকাশ (bKash)</option>
                      <option value="Nagad">নগদ (Nagad)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold block mb-1">নোট / বিশেষ শর্ত (ঐচ্ছিক)</label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-900"
                    />
                  </div>
                </div>

                <div className="space-y-2 font-mono text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">উপ-মোট:</span>
                    <span className="font-bold">{subtotal.toFixed(2)} ৳</span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500">ডিসকাউন্ট (৳):</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      className="w-28 p-1 text-right rounded-lg border bg-white dark:bg-slate-900"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500">অতিরিক্ত খরচ (ভ্যাট/ভাড়া):</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={additionalCosts}
                      onChange={(e) => setAdditionalCosts(e.target.value)}
                      className="w-28 p-1 text-right rounded-lg border bg-white dark:bg-slate-900"
                    />
                  </div>

                  <div className="flex justify-between font-bold text-sm text-slate-900 dark:text-slate-100 border-t pt-1">
                    <span>সর্বমোট প্রদেয়:</span>
                    <span>{grandTotal.toFixed(2)} ৳</span>
                  </div>

                  <div className="flex items-center justify-between gap-2 border-t pt-1 text-emerald-600 font-bold">
                    <span>পরিশোধিত টাকা (Paid):</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max={grandTotal}
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(e.target.value)}
                      className="w-28 p-1 text-right rounded-lg border border-emerald-300 bg-white dark:bg-slate-900"
                    />
                  </div>

                  <div className="flex justify-between font-bold text-rose-600">
                    <span>বকেয়া (Due):</span>
                    <span>{dueAmount.toFixed(2)} ৳</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsNewPurchaseOpen(false)}
                  className="px-5 py-2.5 border rounded-xl font-semibold"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-2 shadow-sm"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isSubmitting ? t('loading') : t('completePurchase')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
