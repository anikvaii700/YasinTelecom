/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useId } from 'react';
import {
  X,
  Upload,
  Trash2,
  Barcode,
  Sparkles,
  Layers,
  Plus,
  Shield,
  Save,
  Boxes,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import {
  getCategoriesByShop,
  getSuppliersByShop,
  saveProduct,
} from '../../services/inventoryStorage';
import { Product, ProductUnit, ProductVariant } from '../../types/inventory';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: Product | null;
  onProductSaved: () => void;
}

const DEFAULT_UNITS: ProductUnit[] = [
  'Piece',
  'Box',
  'Packet',
  'Kg',
  'Gram',
  'Liter',
  'Meter',
  'Dozen',
];

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  product,
  onProductSaved,
}) => {
  const { currentShop, currentProfile } = useAuth();
  const { t } = useLanguage();
  const { showToast } = useToast();

  const [nameBn, setNameBn] = useState(product?.nameBn || '');
  const [nameEn, setNameEn] = useState(product?.nameEn || '');
  const [sku, setSku] = useState(product?.sku || '');
  const [barcode, setBarcode] = useState(product?.barcode || '');
  const [categoryId, setCategoryId] = useState(product?.categoryId || '');
  const [supplierId, setSupplierId] = useState(product?.supplierId || '');
  const [brand, setBrand] = useState(product?.brand || '');
  const [model, setModel] = useState(product?.model || '');
  const [description, setDescription] = useState(product?.description || '');
  const [imageUrl, setImageUrl] = useState(product?.imageUrl || '');
  const [purchasePrice, setPurchasePrice] = useState(product?.purchasePrice?.toString() || '0');
  const [sellingPrice, setSellingPrice] = useState(product?.sellingPrice?.toString() || '0');
  const [wholesalePrice, setWholesalePrice] = useState(product?.wholesalePrice?.toString() || '0');
  const [unit, setUnit] = useState<string>(product?.unit || 'Piece');
  const [minStockLevel, setMinStockLevel] = useState(product?.minStockLevel?.toString() || '5');
  const [currentStock, setCurrentStock] = useState(product?.currentStock?.toString() || '0');
  const [warrantyDuration, setWarrantyDuration] = useState(product?.warrantyDuration || '');
  const [isActive, setIsActive] = useState(product?.isActive ?? true);
  const [variants, setVariants] = useState<ProductVariant[]>(product?.variants || []);
  const [newVariantName, setNewVariantName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const categorySelectId = useId();
  const supplierSelectId = useId();
  const unitSelectId = useId();

  if (!isOpen || !currentShop) return null;

  const categories = getCategoriesByShop(currentShop.id);
  const suppliers = getSuppliersByShop(currentShop.id);

  // Auto-generate unique Barcode (11-digit EAN-like)
  const generateBarcode = () => {
    const randomCode = '890' + Math.floor(10000000 + Math.random() * 90000000).toString();
    setBarcode(randomCode);
  };

  // Auto-generate SKU
  const generateSku = () => {
    const prefix = (nameEn || nameBn || 'PROD').trim().slice(0, 4).toUpperCase();
    const rand = Math.floor(100 + Math.random() * 900);
    setSku(`${prefix}-${rand}`);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast({ type: 'error', title: t('fileTooLarge') });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImageUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAddVariant = () => {
    if (!newVariantName.trim()) return;
    const v: ProductVariant = {
      id: crypto.randomUUID(),
      productId: product?.id || '',
      variantName: newVariantName.trim(),
      stockDelta: 0,
    };
    setVariants([...variants, v]);
    setNewVariantName('');
  };

  const handleRemoveVariant = (id: string) => {
    setVariants(variants.filter((v) => v.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!nameBn.trim()) {
      setFormError('পণ্যের বাংলা নাম দেওয়া আবশ্যক');
      return;
    }
    if (!sku.trim()) {
      setFormError('এসকেইউ (SKU) দেওয়া আবশ্যক');
      return;
    }

    const pPrice = parseFloat(purchasePrice) || 0;
    const sPrice = parseFloat(sellingPrice) || 0;
    const wPrice = parseFloat(wholesalePrice) || 0;
    const stock = parseFloat(currentStock) || 0;
    const minStock = parseInt(minStockLevel, 10) || 5;

    if (pPrice < 0 || sPrice < 0 || stock < 0) {
      setFormError('মূল্য বা স্টক ঋণাত্মক হতে পারে না');
      return;
    }

    try {
      saveProduct(
        {
          id: product?.id,
          shopId: currentShop.id,
          nameBn: nameBn.trim(),
          nameEn: (nameEn || nameBn).trim(),
          sku: sku.trim().toUpperCase(),
          barcode: barcode.trim() || sku.trim().toUpperCase(),
          categoryId: categoryId || null,
          supplierId: supplierId || null,
          brand: brand.trim(),
          model: model.trim(),
          description: description.trim(),
          imageUrl,
          purchasePrice: pPrice,
          sellingPrice: sPrice,
          wholesalePrice: wPrice,
          unit,
          minStockLevel: minStock,
          currentStock: stock,
          avgPurchaseCost: product?.avgPurchaseCost || pPrice,
          warrantyDuration: warrantyDuration.trim(),
          isActive,
          variants,
        },
        currentProfile?.id
      );

      showToast({
        type: 'success',
        title: product?.id ? 'পণ্য সফলভাবে আপডেট হয়েছে' : 'নতুন পণ্য সংরক্ষিত হয়েছে',
      });
      onProductSaved();
      onClose();
    } catch (err: unknown) {
      if (String(err).includes('DUPLICATE_SKU')) {
        setFormError('এই এসকেইউ (SKU) দিয়ে ইতোমধ্যে একটি পণ্য রয়েছে। অনুগ্রহ করে অনন্য SKU দিন।');
      } else {
        setFormError(String(err));
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-6 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">
                {product ? t('editProduct') : t('addProduct')}
              </h3>
              <p className="text-xs text-slate-500">
                পণ্যের তথ্য, দাম, বারকোড ও স্টক ইনভেন্টরি কনফিগার করুন
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {formError && (
            <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/30 text-rose-800 dark:text-rose-200 font-medium">
              {formError}
            </div>
          )}

          {/* Section 1: Basic Identifiers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                {t('productNameBn')} *
              </label>
              <input
                type="text"
                required
                placeholder="যেমন: প্রিমিয়াম সুতি পাঞ্জাবি"
                value={nameBn}
                onChange={(e) => setNameBn(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                {t('productNameEn')}
              </label>
              <input
                type="text"
                placeholder="e.g. Premium Cotton Panjabi"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600 text-sm"
              />
            </div>
          </div>

          {/* SKU & Barcode Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  {t('sku')} *
                </label>
                <button
                  type="button"
                  onClick={generateSku}
                  className="text-[11px] text-emerald-600 font-bold hover:underline"
                >
                  অটো তৈরি করুন
                </button>
              </div>
              <input
                type="text"
                required
                placeholder="যেমন: PANJ-001"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono text-sm uppercase"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  {t('barcode')}
                </label>
                <button
                  type="button"
                  onClick={generateBarcode}
                  className="text-[11px] text-emerald-600 font-bold hover:underline flex items-center gap-1"
                >
                  <Barcode className="w-3.5 h-3.5" />
                  <span>বারকোড তৈরি</span>
                </button>
              </div>
              <input
                type="text"
                placeholder="যেমন: 89012345678"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono text-sm"
              />
            </div>
          </div>

          {/* Category & Supplier */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor={categorySelectId} className="font-semibold text-slate-700 dark:text-slate-300">
                ক্যাটাগরি
              </label>
              <select
                id={categorySelectId}
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs"
              >
                <option value="">ক্যাটাগরি নির্বাচন করুন...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nameBn} ({c.nameEn})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor={supplierSelectId} className="font-semibold text-slate-700 dark:text-slate-300">
                সরবরাহকারী (সাপ্লায়ার)
              </label>
              <select
                id={supplierSelectId}
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs"
              >
                <option value="">সাপ্লায়ার নির্বাচন করুন...</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.phone})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Pricing & Stock Grid */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
            <h4 className="font-bold text-slate-900 dark:text-slate-100">
              মূল্য ও ইনভেন্টরি প্যারামিটার
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  {t('purchasePrice')} *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-sm tabular-nums"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  {t('sellingPrice')} *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-sm tabular-nums font-bold text-emerald-600"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  {t('wholesalePrice')}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={wholesalePrice}
                  onChange={(e) => setWholesalePrice(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-sm tabular-nums"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  {t('currentStock')} *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={currentStock}
                  onChange={(e) => setCurrentStock(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-sm tabular-nums"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  {t('minStock')}
                </label>
                <input
                  type="number"
                  min="0"
                  value={minStockLevel}
                  onChange={(e) => setMinStockLevel(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-sm tabular-nums"
                />
              </div>

              <div>
                <label htmlFor={unitSelectId} className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  {t('unit')}
                </label>
                <select
                  id={unitSelectId}
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                >
                  {DEFAULT_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Photo Upload & Variants */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Image Upload */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
              <label className="font-semibold text-slate-700 dark:text-slate-300 block">
                {t('productImage')} (Max 2MB)
              </label>
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Boxes className="w-6 h-6 text-slate-400" />
                  )}
                </div>

                <div className="space-y-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>ছবি আপলোড</span>
                  </button>
                  {imageUrl && (
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      className="text-[11px] text-rose-600 block hover:underline"
                    >
                      মুছে ফেলুন
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Variants */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
              <label className="font-semibold text-slate-700 dark:text-slate-300 block">
                {t('productVariants')} (সাইজ, রঙ, মডেল ইত্যাদি)
              </label>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="যেমন: সাইজ XL, ব্লু"
                  value={newVariantName}
                  onChange={(e) => setNewVariantName(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
                <button
                  type="button"
                  onClick={handleAddVariant}
                  className="px-3 py-1.5 bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 rounded-xl font-bold text-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {variants.map((v) => (
                  <span
                    key={v.id}
                    className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs flex items-center gap-1 border border-slate-200 dark:border-slate-700"
                  >
                    <span>{v.variantName}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveVariant(v.id)}
                      className="text-slate-400 hover:text-rose-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Description & Warranty */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                পণ্যের বিবরণ
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                {t('warranty')}
              </label>
              <input
                type="text"
                placeholder="যেমন: ১ বছর অফিসিয়াল সার্ভিস ওয়ারেন্টি"
                value={warrantyDuration}
                onChange={(e) => setWarrantyDuration(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-slate-600 dark:text-slate-300"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{product ? 'পরিবর্তন সংরক্ষণ করুন' : 'পণ্য যোগ করুন'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
