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
  FileText,
  FileCheck,
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
  const { language } = useLanguage();
  const [paperFormat, setPaperFormat] = useState<'80mm' | '58mm' | 'A4'>(
    shop.receiptFormat === '58mm' ? '58mm' : '80mm'
  );

  if (!isOpen || !sale) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    // Generate clean printable HTML content as downloadable HTML report or trigger print PDF dialog
    const receiptContent = document.getElementById('printable-receipt-container');
    if (!receiptContent) return;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>চালান #${sale.invoiceNumber} - ${shop.name}</title>
            <style>
              body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; color: #111; }
              table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 15px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f7f7f7; font-size: 12px; }
              td { font-size: 12px; }
              .text-right { text-align: right; }
              .text-center { text-align: center; }
              .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
              .meta { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 10px; }
              .footer { text-align: center; margin-top: 30px; font-size: 11px; color: #666; border-top: 1px dashed #ccc; padding-top: 10px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>${shop.name}</h2>
              <p>${shop.address || ''} | মোবাইল: ${shop.mobileNumber}</p>
            </div>
            <div class="meta">
              <div>
                <strong>চালান নং:</strong> ${sale.invoiceNumber}<br/>
                <strong>তারিখ:</strong> ${new Date(sale.createdAt).toLocaleDateString('bn-BD')} ${new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div>
                ${sale.customerName ? `<strong>ক্রেতা:</strong> ${sale.customerName} (${sale.customerPhone || ''})<br/>` : ''}
                <strong>ক্যাশিয়ার:</strong> ${sale.cashierName || 'অ্যাডমিন'}
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>নং</th>
                  <th>পণ্যের বিবরণ</th>
                  <th class="text-center">পরিমাণ</th>
                  <th class="text-right">দর (৳)</th>
                  <th class="text-right">মোট (৳)</th>
                </tr>
              </thead>
              <tbody>
                ${saleItems
                  .map(
                    (item, idx) => `
                  <tr>
                    <td>${idx + 1}</td>
                    <td>${item.productNameBn} ${item.variantName ? `(${item.variantName})` : ''}</td>
                    <td class="text-center">${item.quantity}</td>
                    <td class="text-right">${item.unitPrice.toFixed(2)}</td>
                    <td class="text-right">${item.total.toFixed(2)}</td>
                  </tr>`
                  )
                  .join('')}
              </tbody>
            </table>
            <div style="float: right; width: 250px; font-size: 12px; line-height: 1.8;">
              <div style="display: flex; justify-content: space-between;"><span>সাবটোটাল:</span><span>৳${sale.subtotal.toFixed(2)}</span></div>
              ${sale.cartDiscount > 0 ? `<div style="display: flex; justify-content: space-between; color: green;"><span>ছাড় (Discount):</span><span>- ৳${sale.cartDiscount.toFixed(2)}</span></div>` : ''}
              ${sale.vatAmount > 0 ? `<div style="display: flex; justify-content: space-between;"><span>ভ্যাট (${sale.vatRatePercent}%):</span><span>+ ৳${sale.vatAmount.toFixed(2)}</span></div>` : ''}
              ${sale.shippingCharge > 0 ? `<div style="display: flex; justify-content: space-between;"><span>ডেলিভারি চার্জ:</span><span>+ ৳${sale.shippingCharge.toFixed(2)}</span></div>` : ''}
              <div style="display: flex; justify-content: space-between; font-weight: bold; border-top: 1px solid #333; padding-top: 4px;"><span>সর্বমোট:</span><span>৳${sale.grandTotal.toFixed(2)}</span></div>
              <div style="display: flex; justify-content: space-between;"><span>পরিশোধ (${sale.paymentMethod}):</span><span>৳${sale.paidAmount.toFixed(2)}</span></div>
              ${sale.dueAmount > 0 ? `<div style="display: flex; justify-content: space-between; font-weight: bold; color: red;"><span>বকেয়া (Due):</span><span>৳${sale.dueAmount.toFixed(2)}</span></div>` : `<div style="display: flex; justify-content: space-between;"><span>ফেরত:</span><span>৳${sale.changeAmount.toFixed(2)}</span></div>`}
            </div>
            <div style="clear: both;"></div>
            <div class="footer">
              <p>${shop.receiptFooter || 'ধন্যবাদ, আবার আসবেন!'}</p>
              <p>MoSaFa Shop POS · আপনার দোকান, আপনার হিসাব</p>
            </div>
            <script>window.print();</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const is58 = paperFormat === '58mm';
  const isA4 = paperFormat === 'A4';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in print:p-0 print:bg-white">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] print:max-w-none print:w-full print:shadow-none print:border-none print:rounded-none">
        {/* Header - Hidden on Print */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                বিক্রয় ইনভয়েস ও রসিদ (Receipt Preview)
              </h3>
              <p className="text-xs text-slate-500 font-mono">চালান: {sale.invoiceNumber}</p>
            </div>
          </div>

          {/* Paper Format Selector: 80mm, 58mm, A4 */}
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
                ৮০ মিমি
              </button>
              <button
                onClick={() => setPaperFormat('58mm')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  paperFormat === '58mm'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                ৫৮ মিমি
              </button>
              <button
                onClick={() => setPaperFormat('A4')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  paperFormat === 'A4'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                A4 ইনভয়েস
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

        {/* Viewport for Receipt / Invoice */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/70 dark:bg-slate-950 flex justify-center print:p-0 print:bg-white">
          <div
            id="printable-receipt-container"
            className={`bg-white text-slate-900 shadow-sm border border-slate-200/80 print:shadow-none print:border-none print:p-0 transition-all ${
              isA4
                ? 'w-full max-w-[560px] p-6 rounded-2xl text-xs'
                : is58
                ? 'w-[240px] p-4 rounded-2xl text-[11px]'
                : 'w-[320px] p-5 rounded-2xl text-xs'
            }`}
            style={{
              fontFamily: isA4
                ? "'Plus Jakarta Sans', 'Hind Siliguri', sans-serif"
                : "'JetBrains Mono', 'Hind Siliguri', monospace",
            }}
          >
            {/* Shop Header & Logo */}
            <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-300">
              {shop.logoUrl && (
                <div className="flex justify-center mb-1">
                  <img
                    src={shop.logoUrl}
                    alt={shop.name}
                    className="h-10 w-auto object-contain max-w-[120px]"
                  />
                </div>
              )}
              {shop.receiptHeader && (
                <p className="text-[10px] text-slate-600 font-medium">
                  {shop.receiptHeader}
                </p>
              )}
              <h2 className={`font-extrabold tracking-tight ${isA4 ? 'text-lg text-emerald-800' : is58 ? 'text-sm' : 'text-base'}`}>
                {shop.name}
              </h2>
              {shop.address && (
                <p className="text-[10px] text-slate-600 leading-tight">
                  {shop.address}
                </p>
              )}
              <p className="text-[10px] text-slate-600 font-mono">
                মোবাইল: {shop.mobileNumber}
              </p>
            </div>

            {/* Meta Info */}
            <div className={`py-2.5 border-b border-dashed border-slate-300 text-[10px] space-y-1 ${isA4 ? 'grid grid-cols-2 gap-2 text-xs' : ''}`}>
              <div>
                <div className="flex justify-between">
                  <span>চালান নং:</span>
                  <span className="font-bold font-mono">{sale.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>তারিখ ও সময়:</span>
                  <span>
                    {new Date(sale.createdAt).toLocaleDateString('bn-BD')} {new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              <div>
                {sale.customerName ? (
                  <div className="flex justify-between">
                    <span>গ্রাহক:</span>
                    <span className="font-medium truncate max-w-[150px]">
                      {sale.customerName} {sale.customerPhone ? `(${sale.customerPhone})` : ''}
                    </span>
                  </div>
                ) : (
                  <div className="flex justify-between text-slate-500">
                    <span>গ্রাহক:</span>
                    <span>সাধারণ ক্রেতা</span>
                  </div>
                )}
                {sale.cashierName && (
                  <div className="flex justify-between">
                    <span>ক্যাশিয়ার:</span>
                    <span>{sale.cashierName}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Items Table */}
            <div className="py-2.5 border-b border-dashed border-slate-300">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-[9px] uppercase tracking-wider text-slate-500">
                    <th className="py-1">বিবরণ</th>
                    <th className="text-center py-1">পরিমাণ</th>
                    <th className="text-right py-1">দর (৳)</th>
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
                          <div className="text-[9px] text-slate-500 font-normal">({item.variantName})</div>
                        )}
                        {item.discount > 0 && (
                          <div className="text-[9px] text-emerald-600 font-normal">
                            ছাড়: -৳{item.discount}
                          </div>
                        )}
                      </td>
                      <td className="py-1.5 text-center font-mono font-medium">
                        {item.quantity}
                      </td>
                      <td className="py-1.5 text-right font-mono text-slate-600">
                        {item.unitPrice.toFixed(2)}
                      </td>
                      <td className="py-1.5 text-right font-mono font-semibold">
                        ৳{item.total.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Breakdown & Totals */}
            <div className="py-2.5 border-b border-dashed border-slate-300 text-[10px] space-y-1 font-mono">
              <div className="flex justify-between">
                <span>সাবটোটাল:</span>
                <span>৳{sale.subtotal.toFixed(2)}</span>
              </div>
              {sale.itemDiscountsTotal && sale.itemDiscountsTotal > 0 ? (
                <div className="flex justify-between text-emerald-700">
                  <span>আইটেম ছাড়:</span>
                  <span>- ৳{sale.itemDiscountsTotal.toFixed(2)}</span>
                </div>
              ) : null}
              {sale.cartDiscount > 0 && (
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>ইনভয়েস ছাড়:</span>
                  <span>- ৳{sale.cartDiscount.toFixed(2)}</span>
                </div>
              )}
              {sale.vatAmount > 0 && (
                <div className="flex justify-between">
                  <span>ভ্যাট ({sale.vatRatePercent}%):</span>
                  <span>+ ৳{sale.vatAmount.toFixed(2)}</span>
                </div>
              )}
              {sale.shippingCharge > 0 && (
                <div className="flex justify-between">
                  <span>ডেলিভারি / শিপিং:</span>
                  <span>+ ৳{sale.shippingCharge.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between font-bold text-xs pt-1.5 border-t border-slate-300 text-slate-900">
                <span>সর্বমোট প্রদেয়:</span>
                <span>৳{sale.grandTotal.toFixed(2)}</span>
              </div>

              {/* Payment Methods Breakdown */}
              <div className="pt-1 text-[10px]">
                <div className="flex justify-between font-semibold">
                  <span>পরিশোধ ({sale.paymentMethod}):</span>
                  <span>৳{sale.paidAmount.toFixed(2)}</span>
                </div>

                {sale.paymentMethod === 'Split' && sale.splitPayments && sale.splitPayments.length > 0 && (
                  <div className="pl-2 space-y-0.5 text-[9px] text-slate-600 pt-0.5">
                    {sale.splitPayments.map((sp, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>• {sp.method} {sp.referenceNumber ? `(${sp.referenceNumber})` : ''}:</span>
                        <span>৳{sp.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {sale.dueAmount > 0 ? (
                <div className="flex justify-between font-bold text-rose-600 pt-0.5">
                  <span>বকেয়া (Customer Due):</span>
                  <span>৳{sale.dueAmount.toFixed(2)}</span>
                </div>
              ) : (
                <div className="flex justify-between text-slate-700 pt-0.5">
                  <span>ফেরত (Change):</span>
                  <span>৳{sale.changeAmount.toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* A4 Signature Section */}
            {isA4 && (
              <div className="pt-12 pb-4 flex justify-between text-[11px] text-slate-500">
                <div className="border-t border-slate-300 pt-1 text-center w-32">
                  ক্রেতার স্বাক্ষর
                </div>
                <div className="border-t border-slate-300 pt-1 text-center w-32">
                  কর্তৃপক্ষের স্বাক্ষর
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="pt-3 text-center space-y-1.5 text-[9px] text-slate-500">
              <p className="font-semibold text-slate-700">
                {shop.receiptFooter || 'ধন্যবাদ, আবার আসবেন!'}
              </p>
              <p className="text-[8px] text-slate-400 font-mono">
                MoSaFa Shop POS · আপনার দোকান, আপনার হিসাব
              </p>
            </div>
          </div>
        </div>

        {/* Modal Action Footer - Hidden on Print */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <span className="text-xs text-slate-500">
            রশিদ প্রিন্ট বা পিডিএফ সংরক্ষণের জন্য বাটন চাপুন
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPDF}
              className="py-2.5 px-3.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
              title="ইনভয়েস পিডিএফ বা আলাদা উইন্ডোতে ডাউনলোড করুন"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span>পিডিএফ / এক্সপোর্ট</span>
            </button>
            <button
              onClick={handlePrint}
              className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-colors shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>প্রিন্ট রসিদ</span>
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
