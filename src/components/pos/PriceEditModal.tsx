/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Tag, X, Check, Shield } from 'lucide-react';
import { CartItem } from '../../types/pos';

interface PriceEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: CartItem | null;
  onConfirm: (itemId: string, newUnitPrice: number, itemDiscount: number, notes?: string) => void;
}

export const PriceEditModal: React.FC<PriceEditModalProps> = ({
  isOpen,
  onClose,
  item,
  onConfirm,
}) => {
  const [unitPrice, setUnitPrice] = useState<string>('');
  const [itemDiscount, setItemDiscount] = useState<string>('');
  const [reason, setReason] = useState<string>('');

  React.useEffect(() => {
    if (item) {
      setUnitPrice(String(item.unitPrice));
      setItemDiscount(String(item.discount || 0));
      setReason(item.notes || '');
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const newPrice = Math.max(0, Number(unitPrice) || 0);
    const newDiscount = Math.max(0, Number(itemDiscount) || 0);

    onConfirm(item.id, newPrice, newDiscount, reason.trim() || undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                মূল্য ও ছাড় পরিবর্তন
              </h3>
              <p className="text-[10px] text-slate-500 font-mono">
                আসল রেট: ৳{item.product.sellingPrice}
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

        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-xs">
          <span className="font-bold block text-slate-800 dark:text-slate-200 truncate">
            {item.product.nameBn}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">SKU: {item.product.sku}</span>
        </div>

        <form onSubmit={handleSave} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              একক বিক্রয় মূল্য (Unit Price) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-slate-400">
                ৳
              </span>
              <input
                type="number"
                step="any"
                min="0"
                required
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                className="w-full pl-7 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              আইটেম-লেভেল ছাড় (Item Discount)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-slate-400">
                ৳
              </span>
              <input
                type="number"
                step="any"
                min="0"
                placeholder="0"
                value={itemDiscount}
                onChange={(e) => setItemDiscount(e.target.value)}
                className="w-full pl-7 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              মূল্য পরিবর্তনের কারণ / অনুমোদন নোট
            </label>
            <input
              type="text"
              placeholder="যেমন: বিশেষ অফার / পাইকারি দর"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-emerald-600"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-xl text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              বাতিল
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors shadow-sm"
            >
              মূল্য আপডেট করুন
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
