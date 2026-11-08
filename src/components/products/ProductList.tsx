/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Boxes,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  Folder,
  Edit2,
  Eye,
  AlertTriangle,
  ArrowUpDown,
  Barcode,
  Sparkles,
  CheckCircle2,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import {
  exportProductsToCSV,
  getCategoriesByShop,
  getProductsByShop,
  getSuppliersByShop,
  importProductsFromCSV,
} from '../../services/inventoryStorage';
import { Product } from '../../types/inventory';
import { CategoryManager } from '../categories/CategoryManager';
import { ProductFormModal } from './ProductFormModal';

export const ProductList: React.FC = () => {
  const { currentShop } = useAuth();
  const { t, language } = useLanguage();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStockFilter, setSelectedStockFilter] = useState<'all' | 'low' | 'out' | 'in'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'priceAsc' | 'priceDesc' | 'stockAsc' | 'stockDesc'>('name');

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);

  // CSV Import State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [csvContent, setCsvContent] = useState('');
  const [importSummary, setImportSummary] = useState<{ imported: number; errors: string[] } | null>(null);

  // Force re-render key
  const [refreshKey, setRefreshKey] = useState(0);

  if (!currentShop) return null;

  const products = getProductsByShop(currentShop.id);
  const categories = getCategoriesByShop(currentShop.id);
  const suppliers = getSuppliersByShop(currentShop.id);

  // Filtered & sorted product list
  const filteredProducts = useMemo(() => {
    let result = products.filter((p) => {
      // Search
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.nameBn.toLowerCase().includes(q) ||
        p.nameEn.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcode.includes(q) ||
        (p.brand && p.brand.toLowerCase().includes(q));

      // Category filter
      const matchCat = selectedCategory === 'all' || p.categoryId === selectedCategory;

      // Stock filter
      let matchStock = true;
      if (selectedStockFilter === 'low') {
        matchStock = p.currentStock > 0 && p.currentStock <= p.minStockLevel;
      } else if (selectedStockFilter === 'out') {
        matchStock = p.currentStock <= 0;
      } else if (selectedStockFilter === 'in') {
        matchStock = p.currentStock > p.minStockLevel;
      }

      return matchSearch && matchCat && matchStock;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'priceAsc') return a.sellingPrice - b.sellingPrice;
      if (sortBy === 'priceDesc') return b.sellingPrice - a.sellingPrice;
      if (sortBy === 'stockAsc') return a.currentStock - b.currentStock;
      if (sortBy === 'stockDesc') return b.currentStock - a.currentStock;
      return a.nameBn.localeCompare(b.nameBn);
    });

    return result;
  }, [products, searchQuery, selectedCategory, selectedStockFilter, sortBy, refreshKey]);

  // Export CSV
  const handleExportCSV = () => {
    const csv = exportProductsToCSV(currentShop.id);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mosafa_products_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    showToast({ type: 'success', title: 'CSV ফাইল এক্সপোর্ট সম্পন্ন' });
  };

  // Import CSV
  const handleImportCSV = () => {
    if (!csvContent.trim()) return;
    const res = importProductsFromCSV(csvContent, currentShop.id);
    setImportSummary(res);
    if (res.imported > 0) {
      showToast({
        type: 'success',
        title: `${res.imported}টি পণ্য সফলভাবে ইমপোর্ট হয়েছে!`,
      });
      setRefreshKey((k) => k + 1);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Boxes className="w-6 h-6 text-emerald-600" />
            <span>{t('productsTitle')}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            মোট {products.length}টি পণ্য ক্যাটালগে সংরক্ষিত রয়েছে
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsCategoryManagerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm transition-colors"
          >
            <Folder className="w-4 h-4 text-emerald-600" />
            <span>{t('categoriesTitle')}</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>{t('exportCsv')}</span>
          </button>

          <button
            onClick={() => {
              setCsvContent('');
              setImportSummary(null);
              setIsImportModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span>{t('importCsv')}</span>
          </button>

          <button
            onClick={() => {
              setEditingProduct(null);
              setIsFormModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{t('addProduct')}</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="পণ্য, SKU বা বারকোড খুঁজুন..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600"
            />
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600"
            >
              <option value="all">{t('allCategories')}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nameBn}
                </option>
              ))}
            </select>
          </div>

          {/* Stock Status Filter */}
          <div>
            <select
              value={selectedStockFilter}
              onChange={(e) => setSelectedStockFilter(e.target.value as any)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600"
            >
              <option value="all">সকল স্টক অবস্থা</option>
              <option value="in">{t('inStock')}</option>
              <option value="low">{t('lowStock')}</option>
              <option value="out">{t('outOfStock')}</option>
            </select>
          </div>

          {/* Sorting */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600"
            >
              <option value="name">নাম অনুযায়ী</option>
              <option value="priceAsc">মূল্য: কম থেকে বেশি</option>
              <option value="priceDesc">মূল্য: বেশি থেকে কম</option>
              <option value="stockAsc">স্টক: কম থেকে বেশি</option>
              <option value="stockDesc">স্টক: বেশি থেকে কম</option>
            </select>
          </div>
        </div>
      </div>

      {/* Products Table (Desktop & Mobile View) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Boxes className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              কোনো পণ্য খুঁজে পাওয়া যায়নি
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              অনুসন্ধানের শর্ত পরিবর্তন করুন অথবা নতুন পণ্য যোগ করে স্টক পরিচালনা শুরু করুন।
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">পণ্য</th>
                  <th className="py-3 px-4">SKU / বারকোড</th>
                  <th className="py-3 px-4">ক্যাটাগরি</th>
                  <th className="py-3 px-4 text-right">ক্রয় মূল্য</th>
                  <th className="py-3 px-4 text-right">বিক্রয় মূল্য</th>
                  <th className="py-3 px-4 text-center">স্টক</th>
                  <th className="py-3 px-4 text-right">পদক্ষেপ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredProducts.map((p) => {
                  const cat = categories.find((c) => c.id === p.categoryId);
                  const isLow = p.currentStock > 0 && p.currentStock <= p.minStockLevel;
                  const isOut = p.currentStock <= 0;

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Name & Photo */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
                            {p.imageUrl ? (
                              <img
                                src={p.imageUrl}
                                alt={p.nameBn}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Boxes className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 dark:text-slate-100 block">
                              {p.nameBn}
                            </span>
                            <span className="text-[11px] text-slate-400 block">
                              {p.nameEn}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* SKU / Barcode */}
                      <td className="py-3 px-4 font-mono">
                        <span className="font-bold text-slate-700 dark:text-slate-300 block">
                          {p.sku}
                        </span>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Barcode className="w-3 h-3" />
                          <span>{p.barcode}</span>
                        </span>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-medium">
                          {cat?.nameBn || 'সাধারণ'}
                        </span>
                      </td>

                      {/* Purchase Price */}
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400">
                        {p.purchasePrice.toFixed(2)} ৳
                      </td>

                      {/* Selling Price */}
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-slate-900 dark:text-slate-100">
                        {p.sellingPrice.toFixed(2)} ৳
                      </td>

                      {/* Current Stock */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-mono text-xs font-bold tabular-nums ${
                            isOut
                              ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 border border-rose-200 dark:border-rose-900'
                              : isLow
                              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 border border-amber-200 dark:border-amber-900'
                              : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 border border-emerald-200 dark:border-emerald-900'
                          }`}
                        >
                          {isLow && <AlertTriangle className="w-3 h-3 shrink-0" />}
                          <span>{p.currentStock} {p.unit}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setViewingProduct(p)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingProduct(p);
                              setIsFormModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Product Details Drawer / Modal */}
      {viewingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                পণ্যের বিস্তারিত বিবরণ
              </h3>
              <button
                onClick={() => setViewingProduct(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden shrink-0 border">
                  {viewingProduct.imageUrl ? (
                    <img
                      src={viewingProduct.imageUrl}
                      alt={viewingProduct.nameBn}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Boxes className="w-6 h-6 text-slate-400" />
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-base text-slate-900 dark:text-slate-100">
                    {viewingProduct.nameBn}
                  </h4>
                  <p className="text-slate-500">{viewingProduct.nameEn}</p>
                  <p className="font-mono text-emerald-600 font-bold mt-0.5">
                    SKU: {viewingProduct.sku} · বারকোড: {viewingProduct.barcode}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border text-slate-700 dark:text-slate-300">
                <div>
                  <span className="text-[11px] text-slate-400 block">ক্রয় মূল্য:</span>
                  <span className="font-mono font-bold text-sm">{viewingProduct.purchasePrice} ৳</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">বিক্রয় মূল্য:</span>
                  <span className="font-mono font-bold text-sm text-emerald-600">{viewingProduct.sellingPrice} ৳</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">বর্তমান স্টক:</span>
                  <span className="font-mono font-bold">{viewingProduct.currentStock} {viewingProduct.unit}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">মুনাফা মার্জিন:</span>
                  <span className="font-mono font-bold text-emerald-600">
                    {viewingProduct.purchasePrice > 0
                      ? `${(((viewingProduct.sellingPrice - viewingProduct.purchasePrice) / viewingProduct.purchasePrice) * 100).toFixed(1)}%`
                      : 'N/A'}
                  </span>
                </div>
              </div>

              {viewingProduct.description && (
                <div>
                  <span className="font-semibold block mb-0.5">বিবরণ:</span>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    {viewingProduct.description}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  {t('importCsv')}
                </h3>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-slate-600 dark:text-slate-400">
              CSV ফরম্যাটে পণ্যের তালিকা পেস্ট করুন (কলামসমূহ: NameBn, NameEn, SKU, Barcode, Category, PurchasePrice, SellingPrice, Stock, Unit, MinStock):
            </p>

            <textarea
              rows={6}
              placeholder={`"সুতি পাঞ্জাবি","Cotton Panjabi","PJ-01","8901001","Men",950,1450,20,"Piece",5`}
              value={csvContent}
              onChange={(e) => setCsvContent(e.target.value)}
              className="w-full p-3 font-mono text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
            />

            {importSummary && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border space-y-1">
                <p className="font-bold text-emerald-600">
                  সফলভাবে যুক্ত হয়েছে: {importSummary.imported} টি
                </p>
                {importSummary.errors.length > 0 && (
                  <div className="text-rose-600 text-[11px] max-h-24 overflow-y-auto">
                    {importSummary.errors.map((e, idx) => (
                      <div key={idx}>⚠️ {e}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 border rounded-xl"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handleImportCSV}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold"
              >
                ইমপোর্ট শুরু করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {isFormModalOpen && (
        <ProductFormModal
          isOpen={isFormModalOpen}
          product={editingProduct}
          onClose={() => setIsFormModalOpen(false)}
          onProductSaved={() => setRefreshKey((k) => k + 1)}
        />
      )}

      {/* Category Manager Modal */}
      {isCategoryManagerOpen && (
        <CategoryManager
          isOpen={isCategoryManagerOpen}
          onClose={() => setIsCategoryManagerOpen(false)}
          onCategoriesChanged={() => setRefreshKey((k) => k + 1)}
        />
      )}
    </div>
  );
};
