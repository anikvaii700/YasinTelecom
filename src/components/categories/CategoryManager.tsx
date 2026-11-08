/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useId } from 'react';
import {
  Folder,
  Plus,
  Edit2,
  Trash2,
  Archive,
  CheckCircle2,
  Search,
  X,
  AlertTriangle,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import {
  deleteCategory,
  getAllCategoriesByShop,
  getProductsByShop,
  saveCategory,
  toggleArchiveCategory,
} from '../../services/inventoryStorage';
import { Category } from '../../types/inventory';

interface CategoryManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoriesChanged?: () => void;
}

export const CategoryManager: React.FC<CategoryManagerProps> = ({
  isOpen,
  onClose,
  onCategoriesChanged,
}) => {
  const { currentShop } = useAuth();
  const { t, language } = useLanguage();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const parentCatSelectId = useId();

  if (!isOpen || !currentShop) return null;

  const categories = getAllCategoriesByShop(currentShop.id);
  const products = getProductsByShop(currentShop.id);

  const filteredCategories = categories.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.nameBn.toLowerCase().includes(q) ||
      c.nameEn.toLowerCase().includes(q) ||
      (c.description && c.description.toLowerCase().includes(q))
    );
  });

  const handleOpenAdd = () => {
    setEditingCategory({
      shopId: currentShop.id,
      nameBn: '',
      nameEn: '',
      slug: '',
      parentId: null,
      description: '',
      iconName: 'Folder',
      isActive: true,
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (cat: Category) => {
    setEditingCategory(cat);
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!editingCategory?.nameBn?.trim() || !editingCategory?.nameEn?.trim()) {
      setFormError('বাংলা এবং ইংরেজি উভয় নাম পূরণ করা আবশ্যক');
      return;
    }

    try {
      saveCategory({
        shopId: currentShop.id,
        id: editingCategory.id,
        nameBn: editingCategory.nameBn.trim(),
        nameEn: editingCategory.nameEn.trim(),
        slug: editingCategory.slug || editingCategory.nameEn.toLowerCase().replace(/\s+/g, '-'),
        parentId: editingCategory.parentId || null,
        description: editingCategory.description?.trim(),
        iconName: editingCategory.iconName || 'Folder',
        isActive: editingCategory.isActive ?? true,
      });

      showToast({
        type: 'success',
        title: editingCategory.id ? 'ক্যাটাগরি আপডেট হয়েছে' : 'নতুন ক্যাটাগরি তৈরি হয়েছে',
      });
      setIsFormOpen(false);
      setEditingCategory(null);
      onCategoriesChanged?.();
    } catch (err: unknown) {
      if (String(err).includes('DUPLICATE_CATEGORY_SLUG')) {
        setFormError('এই নামে ইতোমধ্যে একটি ক্যাটাগরি রয়েছে');
      } else {
        setFormError(String(err));
      }
    }
  };

  const handleDelete = (cat: Category) => {
    const res = deleteCategory(cat.id, currentShop.id);
    if (!res.success) {
      showToast({
        type: 'warning',
        title: 'ডিলিট সম্ভব নয়',
        message: res.message,
      });
    } else {
      showToast({
        type: 'info',
        title: 'ক্যাটাগরি মুছে ফেলা হয়েছে',
      });
      onCategoriesChanged?.();
    }
  };

  const handleToggleArchive = (cat: Category) => {
    toggleArchiveCategory(cat.id, currentShop.id);
    showToast({
      type: 'info',
      title: cat.isActive ? 'ক্যাটাগরি আর্কাইভ করা হয়েছে' : 'ক্যাটাগরি সক্রিয় করা হয়েছে',
    });
    onCategoriesChanged?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
              <Folder className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                {t('categoriesTitle')}
              </h3>
              <p className="text-xs text-slate-500">
                পণ্য সাজানোর জন্য প্রধান ও সাব-ক্যাটাগরি পরিচালনা
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('addCategory')}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="ক্যাটাগরি খুঁজুন (বাংলা বা ইংরেজি)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600"
            />
          </div>
        </div>

        {/* Categories List */}
        <div className="p-4 overflow-y-auto space-y-2 flex-1">
          {filteredCategories.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              কোনো ক্যাটাগরি পাওয়া যায়নি।
            </div>
          ) : (
            filteredCategories.map((cat) => {
              const productCount = products.filter((p) => p.categoryId === cat.id).length;
              const parentCat = categories.find((c) => c.id === cat.parentId);

              return (
                <div
                  key={cat.id}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                    cat.isActive
                      ? 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 opacity-70'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center shrink-0">
                      <Layers className="w-4 h-4" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                          {language === 'bn' ? cat.nameBn : cat.nameEn}
                        </h4>
                        {parentCat && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-medium flex items-center gap-0.5 shrink-0">
                            <span>{parentCat.nameBn}</span>
                            <ChevronRight className="w-2.5 h-2.5" />
                          </span>
                        )}
                        {!cat.isActive && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0">
                            আর্কাইভড
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                        <span>{language === 'bn' ? cat.nameEn : cat.nameBn}</span>
                        <span>·</span>
                        <span className="font-mono text-emerald-600 font-semibold">{productCount} টি পণ্য</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleOpenEdit(cat)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleToggleArchive(cat)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                      title={cat.isActive ? 'Archive' : 'Unarchive'}
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(cat)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Add/Edit Sub-Modal */}
        {isFormOpen && editingCategory && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  {editingCategory.id ? t('editCategory') : t('addCategory')}
                </h4>
                <button
                  onClick={() => setIsFormOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs">
                  {formError}
                </div>
              )}

              <form onSubmit={handleSave} className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {t('categoryNameBn')} *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="যেমন: পুরুষদের পোশাক"
                    value={editingCategory.nameBn || ''}
                    onChange={(e) =>
                      setEditingCategory({ ...editingCategory, nameBn: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {t('categoryNameEn')} *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Men's Fashion"
                    value={editingCategory.nameEn || ''}
                    onChange={(e) =>
                      setEditingCategory({ ...editingCategory, nameEn: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label htmlFor={parentCatSelectId} className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {t('parentCategory')}
                  </label>
                  <select
                    id={parentCatSelectId}
                    value={editingCategory.parentId || ''}
                    onChange={(e) =>
                      setEditingCategory({
                        ...editingCategory,
                        parentId: e.target.value || null,
                      })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  >
                    <option value="">{t('noParent')}</option>
                    {categories
                      .filter((c) => c.id !== editingCategory.id)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nameBn} ({c.nameEn})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    বিবরণ (ঐচ্ছিক)
                  </label>
                  <textarea
                    rows={2}
                    value={editingCategory.description || ''}
                    onChange={(e) =>
                      setEditingCategory({ ...editingCategory, description: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-600"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-sm"
                  >
                    {t('confirm')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
