/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useId } from 'react';
import {
  Warehouse,
  Boxes,
  TrendingUp,
  AlertTriangle,
  RotateCcw,
  SlidersHorizontal,
  History,
  CheckCircle2,
  X,
  Plus,
  ArrowRight,
  ShieldCheck,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import {
  adjustProductStock,
  getInventoryValuation,
  getProductsByShop,
  getStockMovementsByShop,
} from '../../services/inventoryStorage';
import { StockMovementType } from '../../types/inventory';

interface InventoryDashboardProps {
  onNavigateToPurchases?: () => void;
}

export const InventoryDashboard: React.FC<InventoryDashboardProps> = ({
  onNavigateToPurchases,
}) => {
  const { currentShop, currentProfile } = useAuth();
  const { t } = useLanguage();
  const { showToast } = useToast();

  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedMovementFilter, setSelectedMovementFilter] = useState<string>('all');
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);

  // Adjustment Modal State
  const [adjustProductId, setAdjustProductId] = useState('');
  const [adjustNewStock, setAdjustNewStock] = useState('');
  const [adjustReason, setAdjustReason] = useState<StockMovementType>('ADJUSTMENT_IN');
  const [adjustNotes, setAdjustNotes] = useState('');
  const [adjustError, setAdjustError] = useState<string | null>(null);
  const adjustProductSelectId = useId();
  const adjustReasonSelectId = useId();

  if (!currentShop) return null;

  const valuation = getInventoryValuation(currentShop.id);
  const products = getProductsByShop(currentShop.id);
  const stockMovements = getStockMovementsByShop(currentShop.id);

  const lowStockProducts = products.filter(
    (p) => p.currentStock > 0 && p.currentStock <= p.minStockLevel
  );
  const outOfStockProducts = products.filter((p) => p.currentStock <= 0);

  const filteredMovements = stockMovements.filter((m) => {
    if (selectedMovementFilter === 'all') return true;
    return m.movementType === selectedMovementFilter;
  });

  const handleOpenAdjust = (defaultProductId?: string) => {
    setAdjustProductId(defaultProductId || (products[0]?.id ?? ''));
    const prod = products.find((p) => p.id === (defaultProductId || products[0]?.id));
    setAdjustNewStock(prod ? prod.currentStock.toString() : '0');
    setAdjustReason('ADJUSTMENT_IN');
    setAdjustNotes('');
    setAdjustError(null);
    setIsAdjustModalOpen(true);
  };

  const handleSaveAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    setAdjustError(null);

    const newStock = parseFloat(adjustNewStock);
    if (isNaN(newStock) || newStock < 0) {
      setAdjustError('স্টক সংখ্যা সঠিক এবং ধনাত্মক হতে হবে');
      return;
    }

    try {
      adjustProductStock({
        shopId: currentShop.id,
        productId: adjustProductId,
        newStock,
        reasonType: adjustReason,
        notes: adjustNotes.trim(),
        actorId: currentProfile?.id,
      });

      showToast({
        type: 'success',
        title: 'স্টক সফলভাবে সমন্বয় করা হয়েছে',
      });
      setIsAdjustModalOpen(false);
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      setAdjustError(String(err));
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Warehouse className="w-6 h-6 text-emerald-600" />
            <span>{t('inventoryOverview')}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            রিয়েলটাইম ইনভেন্টরি মূল্যায়ন, স্টক সমন্বয় ও মুভমেন্ট অডিট লগ
          </p>
        </div>

        <button
          onClick={() => handleOpenAdjust()}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>{t('stockAdjustment')}</span>
        </button>
      </div>

      {/* 1. Valuation & Stock Health Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Stock Units */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-500">মোট পণ্য ও স্টক</span>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 tabular-nums">
              {valuation.totalStockUnits}{' '}
              <span className="text-xs font-normal text-slate-400">ইউনিট</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              {valuation.totalItems} টি বিভিন্ন পণ্য আইটেম
            </span>
          </div>
        </div>

        {/* Valuation at Cost */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-500">ইনভেন্টরি ভ্যালুয়েশন (ক্রয় মূল্য)</span>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-emerald-600 tabular-nums">
              {valuation.totalValuation.toLocaleString('bn-BD', { minimumFractionDigits: 2 })}{' '}
              <span className="text-sm font-sans font-normal text-slate-400">৳</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              ওয়েটেড এভারেজ কস্ট (WAC) ভিত্তি
            </span>
          </div>
        </div>

        {/* Projected Retail Value */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-500">সম্ভাব্য বিক্রয় মূল্য</span>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 tabular-nums">
              {valuation.totalRetailValue.toLocaleString('bn-BD', { minimumFractionDigits: 2 })}{' '}
              <span className="text-sm font-sans font-normal text-slate-400">৳</span>
            </div>
            <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">
              সম্ভাব্য লাভ: +{valuation.potentialProfit.toFixed(0)} ৳
            </span>
          </div>
        </div>

        {/* Low / Out of stock Alerts */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-500">স্টক সতর্কতা</span>
          <div className="mt-3 flex items-center justify-between">
            <div>
              <span className="text-xs text-amber-600 font-bold block">
                {valuation.lowStockCount} টি স্বল্প স্টক
              </span>
              <span className="text-xs text-rose-600 font-bold block mt-0.5">
                {valuation.outOfStockCount} টি স্টক শেষ
              </span>
            </div>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Low-Stock Alerts Section */}
      {(lowStockProducts.length > 0 || outOfStockProducts.length > 0) && (
        <div className="p-5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>রি-অর্ডার প্রয়োজন এমন পণ্যসমূহ ({lowStockProducts.length + outOfStockProducts.length})</span>
            </div>
            {onNavigateToPurchases && (
              <button
                onClick={onNavigateToPurchases}
                className="text-xs font-bold text-amber-800 dark:text-amber-300 hover:underline flex items-center gap-1"
              >
                <span>ক্রয় চালান এন্ট্রি করুন</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {[...outOfStockProducts, ...lowStockProducts].slice(0, 6).map((p) => (
              <div
                key={p.id}
                className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/40 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-slate-900 dark:text-slate-100 block">
                    {p.nameBn}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    SKU: {p.sku} · নূন্যতম: {p.minStockLevel}
                  </span>
                </div>
                <div className="text-right">
                  <span
                    className={`font-mono font-bold text-xs ${
                      p.currentStock <= 0 ? 'text-rose-600' : 'text-amber-600'
                    }`}
                  >
                    {p.currentStock} {p.unit}
                  </span>
                  <button
                    onClick={() => handleOpenAdjust(p.id)}
                    className="block text-[11px] text-emerald-600 hover:underline font-semibold mt-0.5"
                  >
                    সমন্বয় করুন
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Immutable Stock Movements History Table */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {t('stockMovementHistory')}
            </h3>
          </div>

          {/* Filter by Movement Type */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">ফিল্টার:</span>
            <select
              value={selectedMovementFilter}
              onChange={(e) => setSelectedMovementFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
            >
              <option value="all">সকল মুভমেন্ট</option>
              <option value="PURCHASE">{t('reasonPurchase')}</option>
              <option value="SALE">{t('reasonSale')}</option>
              <option value="ADJUSTMENT_IN">{t('reasonAdjustmentIn')}</option>
              <option value="ADJUSTMENT_OUT">{t('reasonAdjustmentOut')}</option>
              <option value="DAMAGE">{t('reasonDamage')}</option>
              <option value="LOSS">{t('reasonLoss')}</option>
              <option value="INITIAL">প্রারম্ভিক স্টক (Initial)</option>
            </select>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {filteredMovements.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              কোনো স্টক মুভমেন্ট রেকর্ড পাওয়া যায়নি।
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">তারিখ ও সময়</th>
                    <th className="py-3 px-4">পণ্য</th>
                    <th className="py-3 px-4">মুভমেন্টের ধরন</th>
                    <th className="py-3 px-4 text-center">পরিবর্তন (Delta)</th>
                    <th className="py-3 px-4 text-right">পূর্বের স্টক</th>
                    <th className="py-3 px-4 text-right">নতুন স্টক</th>
                    <th className="py-3 px-4">রেফারেন্স / নোট</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredMovements.map((m) => {
                    const isPositive = m.quantityDelta > 0;
                    return (
                      <tr
                        key={m.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        {/* Timestamp */}
                        <td className="py-3 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                          {new Date(m.createdAt).toLocaleString('bn-BD', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </td>

                        {/* Product */}
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">
                          {m.productName}
                        </td>

                        {/* Movement Type */}
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              m.movementType === 'PURCHASE'
                                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                                : m.movementType === 'SALE'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                                : m.movementType === 'DAMAGE' || m.movementType === 'LOSS'
                                ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            {m.movementType}
                          </span>
                        </td>

                        {/* Quantity Delta */}
                        <td className="py-3 px-4 text-center font-mono font-bold tabular-nums">
                          <span
                            className={isPositive ? 'text-emerald-600' : 'text-rose-600'}
                          >
                            {isPositive ? `+${m.quantityDelta}` : m.quantityDelta}
                          </span>
                        </td>

                        {/* Previous Stock */}
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-500">
                          {m.previousStock}
                        </td>

                        {/* New Stock */}
                        <td className="py-3 px-4 text-right font-mono font-bold tabular-nums text-slate-900 dark:text-slate-100">
                          {m.newStock}
                        </td>

                        {/* Notes */}
                        <td className="py-3 px-4 text-slate-500 text-[11px]">
                          <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold mr-1">
                            {m.referenceId || ''}
                          </span>
                          <span>{m.notes || ''}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 4. Stock Adjustment Modal */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                {t('adjustStockTitle')}
              </h4>
              <button
                onClick={() => setIsAdjustModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {adjustError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 font-medium">
                {adjustError}
              </div>
            )}

            <form onSubmit={handleSaveAdjustment} className="space-y-3">
              <div>
                <label htmlFor={adjustProductSelectId} className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  পণ্য নির্বাচন করুন
                </label>
                <select
                  id={adjustProductSelectId}
                  value={adjustProductId}
                  onChange={(e) => {
                    setAdjustProductId(e.target.value);
                    const prod = products.find((p) => p.id === e.target.value);
                    if (prod) setAdjustNewStock(prod.currentStock.toString());
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nameBn} (বর্তমান স্টক: {p.currentStock})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  {t('newStockQty')} *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={adjustNewStock}
                  onChange={(e) => setAdjustNewStock(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>

              <div>
                <label htmlFor={adjustReasonSelectId} className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  {t('adjustmentReason')}
                </label>
                <select
                  id={adjustReasonSelectId}
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value as StockMovementType)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                >
                  <option value="ADJUSTMENT_IN">{t('reasonAdjustmentIn')}</option>
                  <option value="ADJUSTMENT_OUT">{t('reasonAdjustmentOut')}</option>
                  <option value="DAMAGE">{t('reasonDamage')}</option>
                  <option value="LOSS">{t('reasonLoss')}</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  নোট বা কারণের বিবরণ (ঐচ্ছিক)
                </label>
                <textarea
                  rows={2}
                  placeholder="যেমন: ফিজিক্যাল স্টক গণনায় ২টি ঘাটতি পাওয়া গেছে"
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2 border rounded-xl"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold"
                >
                  স্টক আপডেট করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
