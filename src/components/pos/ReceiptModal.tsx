/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Printer,
  X,
  CheckCircle2,
  Store,
  Calendar,
  User,
  CreditCard,
  QrCode,
  Download,
} from 'lucide-react';
import { Sale, SaleItem } from '../../types/pos';
import { Shop } from '../../types/auth';
import { useLanguage } from '../../context/LanguageContext';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  saleItems: SaleItem[];
  shop: Shop;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  sale,
  saleItems,
  shop,
}) => {
  const { t, language } = useLanguage();
  const [paperFormat, setPaperFormat] = useState<'80mm' | '58mm'>(
    shop.receiptFormat === '58mm' ? '58mm' : '80mm'
  );

  if (!isOpen || !sale) return null;

  const handlePrint = () => {
    window.print();
  };

  const is58 = paperFormat === '58mm';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in print:p-0 print:bg-white">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] print:max-w-none print:w-full print:shadow-none print:border-none print:rounded-none">
        {/* Header - Hidden on Print */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                বিক্রয় রশিদ (Receipt Preview)
              </h3>
              <p className="text-xs text-slate-500 font-mono">চালান: {sale.invoiceNumber}</p>
            </div>
          </div>

          {/* Paper Format Selector */}
          <div className="flex items-center gap-2">
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setPaperFormat('80mm')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  paperFormat === '80mm'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                80mm
              </button>
              <button
                onClick={() => setPaperFormat('58mm')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  paperFormat === '58mm'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                58mm
              </button>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Thermal Receipt Paper Viewport */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/70 dark:bg-slate-950 flex justify-center print:p-0 print:bg-white">
          <div
            className={`bg-white text-slate-900 p-5 rounded-2xl shadow-sm border border-slate-200/80 print:shadow-none print:border-none print:p-0 ${
              is58 ? 'w-[240px] text-[11px]' : 'w-[320px] text-xs'
            }`}
            style={{ fontFamily: "'JetBrains Mono', 'Hind Siliguri', monospace" }}
          >
            {/* Shop Header */}
            <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-300">
              {shop.receiptHeader && (
                <p className="text-[10px] text-slate-600 font-medium">
                  {shop.receiptHeader}
                </p>
              )}
              <h2 className={`font-extrabold tracking-tight ${is58 ? 'text-sm' : 'text-base'}`}>
                {shop.name}
              </h2>
              {shop.address && (
                <p className="text-[10px] text-slate-600 leading-tight">
                  {shop.address}
                </p>
              )}
              <p className="text-[10px] text-slate-600">
                মোবাইল: {shop.mobileNumber}
              </p>
            </div>

            {/* Meta Info */}
            <div className="py-2.5 border-b border-dashed border-slate-300 text-[10px] space-y-1">
              <div className="flex justify-between">
                <span>চালান নং:</span>
                <span className="font-bold">{sale.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>তারিখ:</span>
                <span>{new Date(sale.createdAt).toLocaleDateString('bn-BD')} {new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              {sale.customerName && (
                <div className="flex justify-between">
                  <span>গ্রাহক:</span>
                  <span className="font-medium truncate max-w-[140px]">{sale.customerName}</span>
                </div>
              )}
              {sale.cashierName && (
                <div className="flex justify-between">
                  <span>ক্যাশিয়ার:</span>
                  <span>{sale.cashierName}</span>
                </div>
              )}
            </div>

            {/* Items Table */}
            <div className="py-2 border-b border-dashed border-slate-300">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-[9px] uppercase tracking-wider text-slate-500">
                    <th className="py-1">বিবরণ</th>
                    <th className="text-center py-1">পরিমাণ</th>
                    <th className="text-right py-1">মোট (৳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {saleItems.map((item) => (
                    <tr key={item.id} className="text-[10px]">
                      <td className="py-1.5 pr-1">
                        <div className="font-semibold text-slate-800 leading-tight">
                          {language === 'bn' ? item.productNameBn : (item.productNameEn || item.productNameBn)}
                        </div>
                        {item.variantName && (
                          <div className="text-[9px] text-slate-500">({item.variantName})</div>
                        )}
                        <div className="text-[9px] text-slate-500">
                          @ ৳{item.unitPrice.toFixed(2)}
                        </div>
                      </td>
                      <td className="py-1.5 text-center font-mono font-medium">
                        {item.quantity}
                      </td>
                      <td className="py-1.5 text-right font-mono font-semibold">
                        ৳{item.total.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals Calculation */}
            <div className="py-2.5 border-b border-dashed border-slate-300 text-[10px] space-y-1 font-mono">
              <div className="flex justify-between">
                <span>সাবটোটাল:</span>
                <span>৳{sale.subtotal.toFixed(2)}</span>
              </div>
              {sale.cartDiscount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>ছাড় (Discount):</span>
                  <span>- ৳{sale.cartDiscount.toFixed(2)}</span>
                </div>
              )}
              {sale.vatAmount > 0 && (
                <div className="flex justify-between">
                  <span>ভ্যাট ({sale.vatRatePercent}%):</span>
                  <span>+ ৳{sale.vatAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-xs pt-1 border-t border-slate-200 text-slate-900">
                <span>সর্বমোট:</span>
                <span>৳{sale.grandTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span>পরিশোধ ({sale.paymentMethod}):</span>
                <span>৳{sale.paidAmount.toFixed(2)}</span>
              </div>
              {sale.dueAmount > 0 ? (
                <div className="flex justify-between font-bold text-rose-600">
                  <span>বকেয়া (Due):</span>
                  <span>৳{sale.dueAmount.toFixed(2)}</span>
                </div>
              ) : (
                <div className="flex justify-between text-slate-700">
                  <span>ফেরত (Change):</span>
                  <span>৳{sale.changeAmount.toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-3 text-center space-y-1.5 text-[9px] text-slate-500">
              <p className="font-semibold text-slate-700">
                {shop.receiptFooter || 'ধন্যবাদ, আবার আসবেন!'}
              </p>
              <p className="text-[8px] text-slate-400">
                সফটওয়্যার: MoSaFa Shop POS · আপনার দোকান, আপনার হিসাব
              </p>
            </div>
          </div>
        </div>

        {/* Modal Action Footer - Hidden on Print */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between gap-3 print:hidden">
          <span className="text-xs text-slate-500">
            রশিদ প্রিন্ট করতে 'প্রিন্ট রশিদ' চাপুন
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-colors shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>প্রিন্ট রশিদ</span>
            </button>
            <button
              onClick={onClose}
              className="py-2.5 px-4 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl transition-colors"
            >
              বন্ধ করুন
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
