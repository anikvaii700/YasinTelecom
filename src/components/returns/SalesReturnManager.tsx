/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  RotateCcw,
  Search,
  Plus,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  PackageCheck,
  PackageX,
  FileText,
  DollarSign,
  User,
  X,
  Calendar,
  Layers,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import {
  getSalesByShop,
  getSaleItemsBySale,
} from '../../services/inventoryStorage';
import {
  getCashAccountsByShop,
  getSalesReturnsByShop,
  processSalesReturn,
} from '../../services/financeStorage';
import { Sale, SaleItem } from '../../types/pos';
import { CashAccount, SalesReturn } from '../../types/finance';

interface ReturnItemDraft {
  saleItemId: string;
  productId: string;
  productName: string;
  maxReturnable: number;
  returnQty: number;
  unitPrice: number;
  condition: 'RESTOCKABLE' | 'DAMAGED';
}

export const SalesReturnManager: React.FC = () => {
  const { currentShop, currentProfile } = useAuth();
  const { t, language } = useLanguage();
  const { showToast } = useToast();

  const [sales, setSales] = useState<Sale[]>([]);
  const [returns, setReturns] = useState<SalesReturn[]>([]);
  const [cashAccounts, setCashAccounts] = useState<CashAccount[]>([]);

  // Search invoice
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [selectedSaleItems, setSelectedSaleItems] = useState<SaleItem[]>([]);
  const [returnDrafts, setReturnDrafts] = useState<ReturnItemDraft[]>([]);

  // Return Configuration
  const [returnType, setReturnType] = useState<'REFUND' | 'STORE_CREDIT'>('REFUND');
  const [refundAccountId, setRefundAccountId] = useState('');
  const [returnReason, setReturnReason] = useState('কাস্টমার পণ্য পরিবর্তন করতে চান');
  const [returnNotes, setReturnNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // View return details modal
  const [viewingReturn, setViewingReturn] = useState<SalesReturn | null>(null);

  const loadData = () => {
    if (!currentShop) return;
    setSales(getSalesByShop(currentShop.id));
    setReturns(getSalesReturnsByShop(currentShop.id));
    const accs = getCashAccountsByShop(currentShop.id);
    setCashAccounts(accs);
    if (accs.length > 0 && !refundAccountId) {
      const def = accs.find((a) => a.type === 'CASH') || accs[0];
      setRefundAccountId(def.id);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentShop]);

  if (!currentShop) return null;

  // Search matching invoices
  const handleSearchInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const q = invoiceSearchQuery.trim().toUpperCase();
    if (!q) return;

    const matched = sales.find(
      (s) => s.invoiceNumber.toUpperCase() === q || (s.customerPhone && s.customerPhone.includes(q))
    );

    if (!matched) {
      setError(`চালান নম্বর বা ফোন নম্বর '${q}' এর কোনো বিক্রয় পাওয়া যায়নি।`);
      setSelectedSale(null);
      setSelectedSaleItems([]);
      setReturnDrafts([]);
      return;
    }

    setSelectedSale(matched);
    const items = getSaleItemsBySale(matched.id);
    setSelectedSaleItems(items);

    // Initialize return drafts
    const drafts: ReturnItemDraft[] = items.map((i) => {
      const maxReturnable = Math.max(0, i.quantity - (i.returnedQuantity || 0));
      return {
        saleItemId: i.id,
        productId: i.productId,
        productName: i.productNameBn,
        maxReturnable,
        returnQty: 0,
        unitPrice: i.unitPrice,
        condition: 'RESTOCKABLE',
      };
    });
    setReturnDrafts(drafts);
  };

  const handleUpdateDraftQty = (index: number, qtyStr: string) => {
    const val = Number(qtyStr) || 0;
    const updated = [...returnDrafts];
    const draft = updated[index];
    if (val < 0) return;
    if (val > draft.maxReturnable) {
      showToast({
        type: 'warning',
        title: 'সীমা অতিক্রম',
        message: `সর্বোচ্চ ফেরতযোগ্য পরিমাণ: ${draft.maxReturnable} টি`,
      });
      draft.returnQty = draft.maxReturnable;
    } else {
      draft.returnQty = val;
    }
    setReturnDrafts(updated);
  };

  const handleUpdateDraftCondition = (index: number, condition: 'RESTOCKABLE' | 'DAMAGED') => {
    const updated = [...returnDrafts];
    updated[index].condition = condition;
    setReturnDrafts(updated);
  };

  // Calculate return total
  const totalReturnAmount = Number(
    returnDrafts.reduce((sum, d) => sum + d.returnQty * d.unitPrice, 0).toFixed(2)
  );

  const activeReturnItemsCount = returnDrafts.reduce((sum, d) => sum + d.returnQty, 0);

  // Submit Return
  const handleSubmitReturn = () => {
    if (!selectedSale) return;
    setError(null);

    const itemsToReturn = returnDrafts
      .filter((d) => d.returnQty > 0)
      .map((d) => ({
        saleItemId: d.saleItemId,
        productId: d.productId,
        quantity: d.returnQty,
        unitPrice: d.unitPrice,
        condition: d.condition,
      }));

    if (itemsToReturn.length === 0) {
      setError('ফেরত দেওয়ার জন্য অন্তত একটি পণ্যের পরিমাণ নির্ধারণ করুন।');
      return;
    }

    if (!returnReason.trim()) {
      setError('পণ্য ফেরতের কারণ উল্লেখ করুন।');
      return;
    }

    setIsProcessing(true);

    try {
      const processed = processSalesReturn({
        shopId: currentShop.id,
        saleId: selectedSale.id,
        returnType,
        refundAccountId: returnType === 'REFUND' ? refundAccountId : undefined,
        items: itemsToReturn,
        reason: returnReason.trim(),
        notes: returnNotes.trim() || undefined,
        actorId: currentProfile?.id,
      });

      showToast({
        type: 'success',
        title: 'ফেরত প্রক্রিয়া সম্পন্ন',
        message: `রিটার্ন চালান #${processed.returnInvoiceNumber} তৈরি হয়েছে। সর্বমোট ৳${processed.totalRefundAmount.toFixed(2)} সমন্বয় হয়েছে।`,
      });

      // Clear search
      setSelectedSale(null);
      setSelectedSaleItems([]);
      setReturnDrafts([]);
      setInvoiceSearchQuery('');
      loadData();
    } catch (err: any) {
      setError(err.message || 'ফেরত প্রক্রিয়ায় ত্রুটি হয়েছে।');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ---------------- TOP HEADER ---------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              বিক্রয় ফেরত ও পরিবর্তন (Sales Returns)
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold text-xs">
              স্টেপ ৩
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            চালান অনুসন্ধান, স্টক রি-স্টোর অথবা ড্যামেজ লগ, ক্যাশ রিফান্ড ও গ্রাহক লেজার স্বয়ংক্রিয় সমন্বয়
          </p>
        </div>
      </div>

      {/* ---------------- INVOICE SEARCH BAR & RETURN WORKBENCH ---------------- */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        <div className="max-w-xl">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            মূল ইনভয়েস / চালান নম্বর দিয়ে খুঁজুন
          </label>
          <form onSubmit={handleSearchInvoice} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="যেমন: MS-2026-000101 বা কাস্টমার ফোন নম্বর"
                value={invoiceSearchQuery}
                onChange={(e) => setInvoiceSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-mono uppercase focus:outline-none focus:border-emerald-600"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl transition-colors shadow-sm shrink-0"
            >
              চালান খুঁজুন
            </button>
          </form>
        </div>

        {error && (
          <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Selected Sale & Return Items Workbench */}
        {selectedSale && (
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4 animate-fade-in">
            {/* Sale Meta Summary Strip */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block font-mono">চালান নম্বর</span>
                <span className="font-bold text-sm font-mono text-emerald-600">
                  #{selectedSale.invoiceNumber}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">বিক্রয়ের তারিখ</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {new Date(selectedSale.createdAt).toLocaleDateString('bn-BD')}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">ক্রেতার নাম</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {selectedSale.customerName || 'সাধারণ ক্রেতা'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">মোট বিল ও পরিশোধ</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                  ৳{selectedSale.grandTotal} (পরিশোধ: ৳{selectedSale.paidAmount})
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">পূর্ববর্তী ফেরত স্ট্যাটাস</span>
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                    selectedSale.returnStatus === 'FULL'
                      ? 'bg-rose-100 text-rose-800'
                      : selectedSale.returnStatus === 'PARTIAL'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {selectedSale.returnStatus === 'FULL'
                    ? 'সম্পূর্ণ ফেরত হয়েছে'
                    : selectedSale.returnStatus === 'PARTIAL'
                    ? 'আংশিক ফেরত হয়েছে'
                    : 'এখনো কোনো ফেরত হয়নি'}
                </span>
              </div>
            </div>

            {/* Returnable Items Selection Table */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100/70 dark:bg-slate-800/60 text-slate-500 text-[11px] font-semibold border-b border-slate-200 dark:border-slate-800">
                    <th className="py-2.5 px-3">পণ্য</th>
                    <th className="py-2.5 px-3 text-center">বিক্রিত পরিমাণ</th>
                    <th className="py-2.5 px-3 text-center">ফেরতযোগ্য পরিমাণ</th>
                    <th className="py-2.5 px-3 text-center">ফেরত পরিমাণ</th>
                    <th className="py-2.5 px-3 text-center">পণ্যের অবস্থা</th>
                    <th className="py-2.5 px-3 text-right">ফেরত সাবটোটাল</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {returnDrafts.map((draft, idx) => (
                    <tr key={draft.saleItemId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-3 px-3 font-semibold text-slate-900 dark:text-slate-100">
                        {draft.productName}
                      </td>
                      <td className="py-3 px-3 text-center font-mono">
                        {selectedSaleItems[idx]?.quantity || 1}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-600 dark:text-slate-400">
                        {draft.maxReturnable}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <input
                          type="number"
                          min="0"
                          max={draft.maxReturnable}
                          value={draft.returnQty}
                          disabled={draft.maxReturnable === 0}
                          onChange={(e) => handleUpdateDraftQty(idx, e.target.value)}
                          className="w-16 py-1 px-2 text-center font-mono font-bold text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-emerald-600 disabled:opacity-50"
                        />
                      </td>
                      <td className="py-3 px-3 text-center">
                        <select
                          value={draft.condition}
                          disabled={draft.returnQty === 0}
                          onChange={(e) => handleUpdateDraftCondition(idx, e.target.value as any)}
                          className="py-1 px-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] focus:outline-none disabled:opacity-50"
                        >
                          <option value="RESTOCKABLE">পুনরায় বিক্রয়যোগ্য (স্টকে যোগ হবে)</option>
                          <option value="DAMAGED">ত্রুটিপূর্ণ / ড্যামেজ (স্টকে যাবে না)</option>
                        </select>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-xs text-rose-600">
                        ৳{(draft.returnQty * draft.unitPrice).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Return Settings Drawer */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    রিফান্ড / ফেরত সমন্বয়ের ধরণ *
                  </label>
                  <select
                    value={returnType}
                    onChange={(e) => setReturnType(e.target.value as any)}
                    className="w-full py-2 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
                  >
                    <option value="REFUND">ক্যাশ / ওয়ালেট রিফান্ড (টাকা ফেরত)</option>
                    <option value="STORE_CREDIT">স্টোর ক্রেডিট / বকেয়া থেকে কর্তন</option>
                  </select>
                </div>

                {returnType === 'REFUND' && (
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      যে অ্যাকাউন্ট থেকে টাকা ফেরত দেওয়া হবে *
                    </label>
                    <select
                      value={refundAccountId}
                      onChange={(e) => setRefundAccountId(e.target.value)}
                      className="w-full py-2 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
                    >
                      {cashAccounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} (স্থিতি: ৳{a.currentBalance})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    ফেরতের কারণ (Return Reason) *
                  </label>
                  <input
                    type="text"
                    required
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    className="w-full py-2 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              {/* Total Summary & Confirm Button */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-700/60">
                <div className="flex items-center gap-4 text-xs font-mono">
                  <span>
                    মোট নির্বাচিত পণ্য: <strong className="text-slate-900 dark:text-slate-100">{activeReturnItemsCount} টি</strong>
                  </span>
                  <span>
                    মোট রিফান্ড অংক:{' '}
                    <strong className="text-rose-600 text-sm">৳{totalReturnAmount.toFixed(2)}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedSale(null);
                      setSelectedSaleItems([]);
                      setReturnDrafts([]);
                    }}
                    className="px-3 py-2 text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-semibold"
                  >
                    বাতিল
                  </button>
                  <button
                    onClick={handleSubmitReturn}
                    disabled={activeReturnItemsCount === 0 || isProcessing}
                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-colors shadow-sm disabled:opacity-50"
                  >
                    {isProcessing ? 'প্রসেসিং...' : 'ফেরত নিশ্চিত করুন'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ---------------- PAST SALES RETURNS LIST ---------------- */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-rose-600" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              সাম্প্রতিক বিক্রয় ফেরত হিস্ট্রি ({returns.length})
            </h3>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 text-slate-500 text-[11px] font-semibold">
                <th className="py-3 px-4">রিটার্ন চালান নং</th>
                <th className="py-3 px-4">মূল চালান নং</th>
                <th className="py-3 px-4">তারিখ</th>
                <th className="py-3 px-4">ধরণ ও কারণ</th>
                <th className="py-3 px-4 text-center">আইটেম সংখ্যা</th>
                <th className="py-3 px-4 text-right">রিফান্ড পরিমাণ</th>
                <th className="py-3 px-4 text-center">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {returns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    এখনো কোনো বিক্রয় ফেরত রেকর্ড নেই।
                  </td>
                </tr>
              ) : (
                returns.map((ret) => (
                  <tr key={ret.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-mono font-bold text-rose-600">
                      {ret.returnInvoiceNumber}
                    </td>
                    <td className="py-3 px-4 font-mono text-emerald-600">
                      {ret.invoiceNumber}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                      {new Date(ret.createdAt).toLocaleDateString('bn-BD')}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {ret.returnType === 'REFUND' ? 'ক্যাশ রিফান্ড' : 'স্টোর ক্রেডিট'}
                      </div>
                      <span className="text-[10px] text-slate-400 block">{ret.reason}</span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono">
                      {ret.items?.length || 1} টি
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-rose-600 text-xs">
                      - ৳{ret.totalRefundAmount.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setViewingReturn(ret)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold text-[11px] transition-colors"
                      >
                        বিস্তারিত
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------------- RETURN DETAILS MODAL ---------------- */}
      {viewingReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-rose-600" />
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    রিটার্ন ভাউচার: {viewingReturn.returnInvoiceNumber}
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">
                    মূল চালান: {viewingReturn.invoiceNumber}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setViewingReturn(null)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">ফেরতের ধরণ:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {viewingReturn.returnType === 'REFUND' ? 'ক্যাশ রিফান্ড' : 'স্টোর ক্রেডিট'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">কারণ:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{viewingReturn.reason}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">মোট রিফান্ড অংক:</span>
                <span className="font-mono font-bold text-rose-600 text-sm">
                  ৳{viewingReturn.totalRefundAmount.toFixed(2)}
                </span>
              </div>

              <div className="pt-2">
                <h4 className="font-bold text-[11px] text-slate-700 dark:text-slate-300 mb-1.5">
                  ফেরতকৃত পণ্যসমূহ:
                </h4>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {viewingReturn.items?.map((it, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-[11px]"
                    >
                      <div>
                        <span className="font-semibold block">{it.productNameBn}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {it.quantity} টি · {it.condition === 'RESTOCKABLE' ? 'স্টকে যুক্ত' : 'ড্যামেজ'}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-rose-600">
                        ৳{it.refundAmount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setViewingReturn(null)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs"
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
