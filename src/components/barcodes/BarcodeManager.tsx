/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useId } from 'react';
import {
  Printer,
  Search,
  Scan,
  Boxes,
  CheckCircle2,
  Sliders,
  Settings,
  X,
  Plus,
  Minus,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { Product } from '../../types/inventory';
import { BarcodeLabelFormat, BarcodePrintConfig } from '../../types/specialized';
import { getProductsByShop } from '../../services/inventoryStorage';
import { generateBarcodeBars } from '../../utils/barcode';

// Barcode SVG Renderer Component
export const BarcodeSvg: React.FC<{ code: string; height?: number }> = ({ code, height = 40 }) => {
  const bars = generateBarcodeBars(code);
  const totalUnits = bars.reduce((sum, b) => sum + b.width, 0);

  let currentX = 0;

  return (
    <svg
      viewBox={`0 0 ${totalUnits} ${height}`}
      className="w-full max-w-[200px] h-10 mx-auto"
      preserveAspectRatio="none"
    >
      {bars.map((bar, idx) => {
        const x = currentX;
        currentX += bar.width;
        if (!bar.isBlack) return null;
        return (
          <rect
            key={idx}
            x={x}
            y={0}
            width={bar.width}
            height={height}
            fill="#0f172a"
          />
        );
      })}
    </svg>
  );
};

export const BarcodeManager: React.FC = () => {
  const { currentShop } = useAuth();
  const { t } = useLanguage();
  const { showToast } = useToast();

  const allProducts = currentShop ? getProductsByShop(currentShop.id) : [];

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState<Record<string, number>>({});
  const [format, setFormat] = useState<BarcodeLabelFormat>('THERMAL_50x30');
  const [includeShopName, setIncludeShopName] = useState(true);
  const [includePrice, setIncludePrice] = useState(true);
  const [includeBarcodeNumber, setIncludeBarcodeNumber] = useState(true);

  // Scanner Test State
  const [scannedCode, setScannedCode] = useState('');
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);

  if (!currentShop) return null;

  const filteredProducts = allProducts.filter(
    (p) =>
      p.nameBn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.barcode.includes(searchTerm)
  );

  const toggleSelectProduct = (prodId: string) => {
    setSelectedProductIds((prev) => {
      const copy = { ...prev };
      if (copy[prodId]) {
        delete copy[prodId];
      } else {
        copy[prodId] = 1;
      }
      return copy;
    });
  };

  const updateQuantity = (prodId: string, delta: number) => {
    setSelectedProductIds((prev) => {
      const current = prev[prodId] || 1;
      const next = Math.max(1, current + delta);
      return { ...prev, [prodId]: next };
    });
  };

  const handleSelectAll = () => {
    const map: Record<string, number> = {};
    filteredProducts.forEach((p) => {
      map[p.id] = 1;
    });
    setSelectedProductIds(map);
  };

  const handleClearSelection = () => {
    setSelectedProductIds({});
  };

  // Scanner Simulator
  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannedCode.trim()) return;

    const clean = scannedCode.trim();
    const match = allProducts.find(
      (p) => p.barcode === clean || p.sku.toLowerCase() === clean.toLowerCase()
    );

    if (match) {
      setScannedProduct(match);
      showToast({
        type: 'success',
        title: 'পণ্য শনাক্ত হয়েছে',
        message: `${match.nameBn} (স্টক: ${match.currentStock} টি)`,
      });
    } else {
      setScannedProduct(null);
      showToast({
        type: 'warning',
        title: 'বারকোড মিলেনি',
        message: `'${clean}' বারকোডের কোনো পণ্য ক্যাটালগে নেই।`,
      });
    }
  };

  // Compile labels to print
  const labelsToPrint: { product: Product; index: number }[] = [];
  Object.entries(selectedProductIds).forEach(([prodId, qty]) => {
    const prod = allProducts.find((p) => p.id === prodId);
    if (prod) {
      for (let i = 0; i < qty; i++) {
        labelsToPrint.push({ product: prod, index: i });
      }
    }
  });

  const handlePrintLabels = () => {
    if (labelsToPrint.length === 0) {
      showToast({ type: 'warning', title: 'প্রিন্ট করার জন্য কোনো পণ্য নির্বাচন করা হয়নি।' });
      return;
    }
    window.print();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* ---------------- 1. PAGE HEADER ---------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Scan className="w-6 h-6 text-emerald-600" />
              <span>বারকোড জেনারেটর ও লেবেল প্রিন্টার</span>
            </h1>
            <span className="text-xs text-slate-500 font-mono">
              · Code 128 ভেক্টর ফরম্যাট
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            দোকানের যেকোনো পণ্যের জন্য থার্মাল স্টিকার (50x30mm) বা A4 শীটে বাল্ক বারকোড লেবেল তৈরি ও প্রিন্ট।
          </p>
        </div>

        <button
          onClick={handlePrintLabels}
          disabled={labelsToPrint.length === 0}
          className="flex items-center gap-1.5 px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl text-xs transition-opacity shadow-sm disabled:opacity-40 self-start sm:self-auto"
        >
          <Printer className="w-4 h-4" />
          <span>লেবেল প্রিন্ট করুন ({labelsToPrint.length})</span>
        </button>
      </div>

      {/* ---------------- 2. SCANNER SIMULATOR / TESTER ---------------- */}
      <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-4 rounded-2xl border border-emerald-200/60 dark:border-emerald-900/40 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
            <Scan className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
              বারকোড স্ক্যানার পরীক্ষক (Live Scanner Tester)
            </h3>
            <p className="text-[11px] text-slate-500">
              বারকোড স্ক্যানার দিয়ে স্ক্যান করুন বা বারকোড টাইপ করে সরাসরি এন্টার চাপুন।
            </p>
          </div>
        </div>

        <form onSubmit={handleScanSubmit} className="flex items-center gap-2 w-full md:w-auto">
          <input
            type="text"
            value={scannedCode}
            onChange={(e) => setScannedCode(e.target.value)}
            placeholder="বারকোড স্ক্যান করুন..."
            className="px-3.5 py-1.5 text-xs font-mono rounded-xl border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600 w-full md:w-56"
          />
          <button
            type="submit"
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs whitespace-nowrap"
          >
            পরীক্ষা করুন
          </button>
        </form>

        {scannedProduct && (
          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800 text-xs flex items-center gap-3">
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {scannedProduct.nameBn}
            </span>
            <span className="font-mono text-emerald-600 font-bold">
              ৳{scannedProduct.sellingPrice}
            </span>
            <span className="text-slate-500 font-mono">
              স্টক: {scannedProduct.currentStock}
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ---------------- 3. LEFT COLUMN: PRODUCT SELECTION & CONTROLS ---------------- */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Boxes className="w-4 h-4 text-emerald-600" />
                <span>পণ্য নির্বাচন করুন</span>
              </h3>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-xs font-semibold text-emerald-600 hover:underline"
                >
                  সব নির্বাচন
                </button>
                <span className="text-slate-300">·</span>
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="text-xs font-semibold text-slate-500 hover:underline"
                >
                  ক্লিয়ার
                </button>
              </div>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="পণ্যের নাম, SKU বা বারকোড খুঁজুন..."
                className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600"
              />
            </div>

            {/* Products List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {filteredProducts.map((prod) => {
                const isSelected = !!selectedProductIds[prod.id];
                const count = selectedProductIds[prod.id] || 0;

                return (
                  <div
                    key={prod.id}
                    className={`py-2.5 px-3 rounded-xl flex items-center justify-between gap-3 transition-colors ${
                      isSelected
                        ? 'bg-emerald-50/60 dark:bg-emerald-950/20'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectProduct(prod.id)}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <div className="truncate">
                        <span className="font-semibold text-slate-900 dark:text-slate-100 block truncate">
                          {prod.nameBn}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          {prod.barcode} · ৳{prod.sellingPrice}
                        </span>
                      </div>
                    </label>

                    {isSelected && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => updateQuantity(prod.id, -1)}
                          className="w-6 h-6 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 hover:bg-slate-100"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-mono font-bold w-6 text-center text-slate-900 dark:text-slate-100">
                          {count}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(prod.id, 1)}
                          className="w-6 h-6 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 hover:bg-slate-100"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ---------------- 4. RIGHT COLUMN: LABEL CONFIG & PREVIEW ---------------- */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 text-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-600" />
              <span>স্টিকার লেবেল কনফিগারেশন</span>
            </h3>

            {/* Label Format */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                লেবেল পেপার সাইজ
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'THERMAL_50x30', label: 'থার্মাল ৫০×৩০ মিমি (প্রস্তাবিত)' },
                  { id: 'THERMAL_38x25', label: 'থার্মাল ৩৮×২৫ মিমি (কমপ্যাক্ট)' },
                  { id: 'A4_SHEET_24', label: 'A4 স্টিকার শীট (২৪ টি)' },
                  { id: 'A4_SHEET_30', label: 'A4 স্টিকার শীট (৩০ টি)' },
                ].map((fmt) => (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => setFormat(fmt.id as BarcodeLabelFormat)}
                    className={`py-2 px-2.5 rounded-xl border text-left font-medium transition-all ${
                      format === fmt.id
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 font-bold'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {fmt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Display Toggles */}
            <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeShopName}
                  onChange={(e) => setIncludeShopName(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  দোকানের নাম প্রদর্শন ({currentShop.name})
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includePrice}
                  onChange={(e) => setIncludePrice(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  খুচরা মূল্য প্রদর্শন (MRP ৳)
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeBarcodeNumber}
                  onChange={(e) => setIncludeBarcodeNumber(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  বারকোড নম্বর টেক্সট প্রদর্শন
                </span>
              </label>
            </div>
          </div>

          {/* Live Sticker Preview Card */}
          <div className="bg-slate-100 dark:bg-slate-800/40 p-6 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center">
            <span className="text-[11px] font-bold text-slate-500 mb-3">
              লাইভ স্টিকার প্রিভিউ ({format})
            </span>

            {labelsToPrint.length === 0 ? (
              <p className="text-xs text-slate-400 py-6">
                বাম পাশের তালিকা থেকে এক বা একাধিক পণ্য নির্বাচন করুন।
              </p>
            ) : (
              <div className="w-56 bg-white text-slate-900 p-3 rounded-lg border border-slate-300 shadow-md text-center space-y-1 font-mono">
                {includeShopName && (
                  <div className="font-bold text-[11px] tracking-tight uppercase truncate">
                    {currentShop.name}
                  </div>
                )}
                <div className="text-[10px] font-bold line-clamp-1">
                  {labelsToPrint[0].product.nameBn}
                </div>
                {includePrice && (
                  <div className="font-extrabold text-xs text-slate-900">
                    MRP: ৳{labelsToPrint[0].product.sellingPrice}
                  </div>
                )}
                <div className="py-0.5">
                  <BarcodeSvg code={labelsToPrint[0].product.barcode} />
                </div>
                {includeBarcodeNumber && (
                  <div className="text-[10px] text-slate-600 tracking-wider">
                    {labelsToPrint[0].product.barcode}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
