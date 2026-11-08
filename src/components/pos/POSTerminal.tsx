/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Barcode,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Tag,
  CreditCard,
  User,
  ArrowRight,
  RotateCcw,
  Clock,
  Printer,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Percent,
  Wallet,
  Coins,
  ChevronRight,
  X,
  Layers,
  Truck,
  PercentCircle,
  HelpCircle,
  Calculator,
  UserPlus,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import {
  createSaleTransaction,
  getCategoriesByShop,
  getCustomersByShop,
  getHoldCartsByShop,
  getProductsByShop,
  saveHoldCart,
  deleteHoldCart,
} from '../../services/inventoryStorage';
import { getCashAccountsByShop } from '../../services/financeStorage';
import { Product, Category, Customer } from '../../types/inventory';
import { CartItem, HoldCart, POSPaymentMethod, Sale, SaleItem, SplitPaymentDetail } from '../../types/pos';
import { CashAccount } from '../../types/finance';
import { ReceiptModal } from './ReceiptModal';
import { QuickCustomerModal } from './QuickCustomerModal';
import { SplitPaymentModal } from './SplitPaymentModal';
import { PriceEditModal } from './PriceEditModal';

export const POSTerminal: React.FC = () => {
  const { currentShop, currentProfile } = useAuth();
  const { t, language } = useLanguage();
  const { showToast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [holdCarts, setHoldCarts] = useState<HoldCart[]>([]);
  const [cashAccounts, setCashAccounts] = useState<CashAccount[]>([]);

  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [barcodeInput, setBarcodeInput] = useState('');

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [cartDiscountType, setCartDiscountType] = useState<'fixed' | 'percent'>('fixed');
  const [cartDiscountValue, setCartDiscountValue] = useState<string>('0');
  const [vatRate, setVatRate] = useState<number>(0); // 0% by default in Bangladesh retail
  const [shippingCharge, setShippingCharge] = useState<string>('0');
  const [paymentMethod, setPaymentMethod] = useState<POSPaymentMethod>('Cash');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [splitPayments, setSplitPayments] = useState<SplitPaymentDetail[]>([]);
  const [paidAmountInput, setPaidAmountInput] = useState<string>('');
  const [saleNotes, setSaleNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Per-session Idempotency Key (refreshed when cart is empty or after sale)
  const [currentIdempotencyKey, setCurrentIdempotencyKey] = useState<string>(() => crypto.randomUUID());

  // Modals & Drawers
  const [isHoldDrawerOpen, setIsHoldDrawerOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isQuickCustomerOpen, setIsQuickCustomerOpen] = useState(false);
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [editingPriceItem, setEditingPriceItem] = useState<CartItem | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [completedSaleItems, setCompletedSaleItems] = useState<SaleItem[]>([]);
  const [showTouchKeypad, setShowTouchKeypad] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const discountInputRef = useRef<HTMLInputElement>(null);

  const loadData = () => {
    if (!currentShop) return;
    setProducts(getProductsByShop(currentShop.id).filter((p) => p.isActive));
    setCategories(getCategoriesByShop(currentShop.id).filter((c) => c.isActive));
    setCustomers(getCustomersByShop(currentShop.id).filter((c) => c.isActive));
    setHoldCarts(getHoldCartsByShop(currentShop.id));
    const accounts = getCashAccountsByShop(currentShop.id);
    setCashAccounts(accounts);
    if (!selectedAccountId && accounts.length > 0) {
      const def = accounts.find((a) => a.isDefault) || accounts[0];
      setSelectedAccountId(def.id);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentShop]);

  // Desktop Keyboard Shortcuts (F2: Search, F3: Quick Customer, F4: Discount, F7: Split, F8: Hold, F9: Checkout, Esc: Clear)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'F3') {
        e.preventDefault();
        setIsQuickCustomerOpen(true);
      } else if (e.key === 'F4') {
        e.preventDefault();
        discountInputRef.current?.focus();
      } else if (e.key === 'F7' && cart.length > 0) {
        e.preventDefault();
        setIsSplitModalOpen(true);
      } else if (e.key === 'F8' && cart.length > 0) {
        e.preventDefault();
        handleHoldCart();
      } else if (e.key === 'F9' && cart.length > 0) {
        e.preventDefault();
        handleCheckout();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, isSubmitting]);

  // Filtered Products
  const filteredProducts = products.filter((p) => {
    const matchesCategory =
      selectedCategory === 'all' || p.categoryId === selectedCategory;
    const query = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !query ||
      p.nameBn.toLowerCase().includes(query) ||
      p.nameEn.toLowerCase().includes(query) ||
      p.sku.toLowerCase().includes(query) ||
      (p.barcode && p.barcode.toLowerCase().includes(query));
    return matchesCategory && matchesQuery;
  });

  // Add product to cart
  const addToCart = (product: Product) => {
    if (product.currentStock <= 0) {
      showToast({
        type: 'warning',
        title: 'স্টক নেই',
        message: `'${product.nameBn}' এর কোনো স্টক অবশিষ্ট নেই!`,
      });
      return;
    }

    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex((item) => item.product.id === product.id);

      if (existingIndex !== -1) {
        const item = prevCart[existingIndex];
        if (item.quantity >= product.currentStock) {
          showToast({
            type: 'warning',
            title: 'সর্বোচ্চ স্টক',
            message: `দোকানে মাত্র ${product.currentStock} ${product.unit} বিদ্যমান।`,
          });
          return prevCart;
        }

        const newQty = item.quantity + 1;
        const updated = [...prevCart];
        updated[existingIndex] = {
          ...item,
          quantity: newQty,
          total: Number((item.unitPrice * newQty - (item.discount || 0)).toFixed(2)),
        };
        return updated;
      }

      const costPrice = product.avgPurchaseCost || product.purchasePrice;
      const newItem: CartItem = {
        id: crypto.randomUUID(),
        product,
        quantity: 1,
        unitPrice: product.sellingPrice,
        originalPrice: product.sellingPrice,
        costPrice,
        discount: 0,
        total: product.sellingPrice,
      };
      return [...prevCart, newItem];
    });
  };

  // Barcode rapid scan handler
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = barcodeInput.trim();
    if (!code) return;

    const match = products.find(
      (p) => p.barcode === code || p.sku.toLowerCase() === code.toLowerCase()
    );

    if (match) {
      addToCart(match);
      setBarcodeInput('');
    } else {
      showToast({
        type: 'warning',
        title: 'পণ্য মেলেনি',
        message: `বারকোড '${code}' এর কোনো সক্রিয় পণ্য পাওয়া যায়নি।`,
      });
    }
  };

  // Update item quantity
  const updateQuantity = (cartItemId: string, delta: number) => {
    setCart((prevCart) => {
      return prevCart
        .map((item) => {
          if (item.id === cartItemId) {
            const nextQty = item.quantity + delta;
            if (nextQty <= 0) return null;
            if (nextQty > item.product.currentStock) {
              showToast({
                type: 'warning',
                title: 'স্টক সীমাবদ্ধ',
                message: `উপলব্ধ স্টক: ${item.product.currentStock}`,
              });
              return item;
            }
            return {
              ...item,
              quantity: nextQty,
              total: Number((item.unitPrice * nextQty - (item.discount || 0)).toFixed(2)),
            };
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  // Remove single item
  const removeFromCart = (cartItemId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== cartItemId));
  };

  // Clear Cart
  const handleClearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
    setCartDiscountValue('0');
    setShippingCharge('0');
    setPaidAmountInput('');
    setSplitPayments([]);
    setCurrentIdempotencyKey(crypto.randomUUID());
  };

  // Item Price & Item Discount update
  const handleConfirmPriceEdit = (
    itemId: string,
    newPrice: number,
    itemDiscount: number,
    notes?: string
  ) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const total = Number((newPrice * item.quantity - itemDiscount).toFixed(2));
          return {
            ...item,
            unitPrice: newPrice,
            discount: itemDiscount,
            notes,
            total,
          };
        }
        return item;
      })
    );
    showToast({
      type: 'info',
      title: 'মূল্য আপডেট হয়েছে',
      message: 'আইটেমের মূল্য ও ছাড় সমন্বয় করা হয়েছে।',
    });
  };

  // Financial Calculations
  const rawSubtotal = Number(
    cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0).toFixed(2)
  );

  const itemDiscountsTotal = Number(
    cart.reduce((sum, item) => sum + (item.discount || 0), 0).toFixed(2)
  );

  const cartSubtotalAfterItemDiscounts = Math.max(0, rawSubtotal - itemDiscountsTotal);

  const calculatedCartDiscount =
    cartDiscountType === 'percent'
      ? Number(((cartSubtotalAfterItemDiscounts * (Number(cartDiscountValue) || 0)) / 100).toFixed(2))
      : Math.min(cartSubtotalAfterItemDiscounts, Number(cartDiscountValue) || 0);

  const discountedSubtotal = Math.max(0, cartSubtotalAfterItemDiscounts - calculatedCartDiscount);

  const numericShipping = Number(shippingCharge) || 0;
  const vatAmount = Number(((discountedSubtotal * vatRate) / 100).toFixed(2));
  const grandTotal = Number((discountedSubtotal + vatAmount + numericShipping).toFixed(2));

  // Paid & Change Calculations
  const splitTotal =
    paymentMethod === 'Split' && splitPayments.length > 0
      ? splitPayments.reduce((s, p) => s + (p.amount || 0), 0)
      : null;

  const effectivePaidAmount =
    splitTotal !== null
      ? splitTotal
      : paidAmountInput === ''
      ? grandTotal
      : Number(paidAmountInput) || 0;

  const changeAmount = Math.max(0, effectivePaidAmount - grandTotal);
  const dueAmount = Math.max(0, grandTotal - effectivePaidAmount);

  // Quick Cash Numpad Helpers
  const handleAddPresetCash = (amount: number) => {
    const current = Number(paidAmountInput) || 0;
    setPaidAmountInput(String(current + amount));
  };

  const handleSetExactCash = () => {
    setPaidAmountInput(String(grandTotal));
  };

  // Hold Cart
  const handleHoldCart = () => {
    if (!currentShop || cart.length === 0) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const title = selectedCustomer
      ? `${selectedCustomer.name} (${timeStr})`
      : `কাস্টমার #${holdCarts.length + 1} (${timeStr})`;

    saveHoldCart({
      shopId: currentShop.id,
      title,
      customerId: selectedCustomer?.id,
      items: cart,
      subtotal: grandTotal,
    });

    showToast({
      type: 'info',
      title: 'কার্ট হোল্ড করা হয়েছে',
      message: `'${title}' সংরক্ষিত হয়েছে। পরবর্তী কাস্টমারের হিসাব শুরু করতে পারেন।`,
    });

    handleClearCart();
    setHoldCarts(getHoldCartsByShop(currentShop.id));
  };

  // Recall Held Cart
  const handleRestoreHoldCart = (held: HoldCart) => {
    setCart(held.items);
    if (held.customerId) {
      const cust = customers.find((c) => c.id === held.customerId);
      setSelectedCustomer(cust || null);
    }
    if (currentShop) {
      deleteHoldCart(held.id, currentShop.id);
      setHoldCarts(getHoldCartsByShop(currentShop.id));
    }
    setIsHoldDrawerOpen(false);
    showToast({
      type: 'success',
      title: 'কার্ট ফিরিয়ে আনা হয়েছে',
      message: `${held.title} পুনরায় লোড করা হয়েছে।`,
    });
  };

  // Checkout with atomic idempotency
  const handleCheckout = async () => {
    if (!currentShop || isSubmitting) return;

    if (cart.length === 0) {
      showToast({
        type: 'warning',
        title: 'কার্ট খালি',
        message: 'পণ্য যোগ করার পর বিক্রয় সম্পন্ন করুন।',
      });
      return;
    }

    if (dueAmount > 0 && !selectedCustomer) {
      showToast({
        type: 'error',
        title: 'বকেয়া বিক্রয়!',
        message: 'বাকি বা আংশিক পরিশোধে বিক্রয় করতে হলে গ্রাহক নির্বাচন অথবা দ্রুত যুক্ত করতে হবে।',
      });
      setIsCustomerModalOpen(true);
      return;
    }

    if (paymentMethod === 'Split' && splitPayments.length === 0) {
      setIsSplitModalOpen(true);
      return;
    }

    setIsSubmitting(true);

    try {
      // Step 1: Execute atomic local/server transaction with idempotency key
      const result = createSaleTransaction({
        shopId: currentShop.id,
        customerId: selectedCustomer?.id,
        customerName: selectedCustomer?.name,
        customerPhone: selectedCustomer?.mobileNumber,
        items: cart,
        subtotal: rawSubtotal,
        itemDiscountsTotal,
        cartDiscount: calculatedCartDiscount,
        shippingCharge: numericShipping,
        vatAmount,
        vatRatePercent: vatRate,
        grandTotal,
        paidAmount: Math.min(grandTotal, effectivePaidAmount),
        dueAmount,
        changeAmount,
        paymentMethod,
        paymentAccountId: selectedAccountId,
        splitPayments: paymentMethod === 'Split' ? splitPayments : undefined,
        notes: saleNotes,
        cashierName: currentProfile?.fullName || 'ক্যাশিয়ার',
        idempotencyKey: currentIdempotencyKey,
        actorId: currentProfile?.id,
      });

      // Step 2: Confetti Celebration
      try {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.8 },
        });
      } catch {
        // Confetti safe
      }

      showToast({
        type: 'success',
        title: 'বিক্রয় সফল!',
        message: `চালান #${result.sale.invoiceNumber} তৈরি হয়েছে। সর্বমোট ৳${grandTotal.toFixed(2)}`,
      });

      setCompletedSale(result.sale);
      setCompletedSaleItems(result.items);
      setIsReceiptOpen(true);

      // Step 3: Reset cart and refresh stock
      handleClearCart();
      loadData();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'বিক্রয় ত্রুটি',
        message: err.message || 'বিক্রয় চালানে সমস্যা হয়েছে।',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!currentShop) return null;

  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col lg:flex-row gap-4 overflow-hidden">
      {/* ---------------- LEFT PANEL: PRODUCT CATALOG & BARCODE SCANNER ---------------- */}
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Top Filter Bar: Search, Barcode Input, Category Tabs */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex flex-col sm:flex-row gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="পণ্য বা SKU দিয়ে খুঁজুন... (শর্টকাট: F2)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Barcode Scanner Form */}
            <form onSubmit={handleBarcodeSubmit} className="relative sm:w-64">
              <Barcode className="w-4 h-4 text-emerald-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                ref={barcodeInputRef}
                type="text"
                placeholder="বারকোড স্ক্যান বা লিখুন..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                className="w-full pl-9 pr-14 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-900 dark:text-slate-100 font-mono placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-emerald-600 text-white text-[11px] font-bold rounded-xl hover:bg-emerald-700 transition-colors"
              >
                স্ক্যান
              </button>
            </form>
          </div>

          {/* Category Horizontal Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all ${
                selectedCategory === 'all'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-emerald-500'
              }`}
            >
              সকল পণ্য ({products.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-emerald-500'
                }`}
              >
                {language === 'bn' ? cat.nameBn : cat.nameEn}
              </button>
            ))}
          </div>
        </div>

        {/* Product Cards Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
                <Search className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                কোনো পণ্য খুঁজে পাওয়া যায়নি
              </p>
              <p className="text-xs text-slate-400 mt-1">
                সার্চ কিওয়ার্ড পরিবর্তন করুন অথবা পণ্য ক্যাটালগে নতুন পণ্য যোগ করুন।
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredProducts.map((p) => {
                const inCart = cart.find((i) => i.product.id === p.id);
                const isOutOfStock = p.currentStock <= 0;
                return (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    disabled={isOutOfStock}
                    className={`p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between group active:scale-[0.98] ${
                      inCart
                        ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-sm ring-1 ring-emerald-500/30'
                        : isOutOfStock
                        ? 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 opacity-60 cursor-not-allowed'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-400 hover:shadow-md'
                    }`}
                  >
                    {/* Badge: In Cart Count */}
                    {inCart && (
                      <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-emerald-600 text-white font-mono font-bold text-xs flex items-center justify-center shadow-md animate-scale-in">
                        {inCart.quantity}
                      </span>
                    )}

                    <div>
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <span className="text-[10px] font-mono text-slate-400 truncate">
                          {p.sku}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            isOutOfStock
                              ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                              : p.currentStock <= p.minStockLevel
                              ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {p.currentStock} {p.unit}
                        </span>
                      </div>

                      <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 line-clamp-2 leading-snug group-hover:text-emerald-600 transition-colors">
                        {language === 'bn' ? p.nameBn : (p.nameEn || p.nameBn)}
                      </h4>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <span className="font-mono font-extrabold text-sm text-emerald-600 dark:text-emerald-400">
                        ৳{p.sellingPrice.toFixed(2)}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400 group-hover:text-emerald-600 transition-colors">
                        যোগ করুন +
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ---------------- RIGHT PANEL: CART & CHECKOUT TERMINAL ---------------- */}
      <div className="w-full lg:w-[440px] xl:w-[480px] flex flex-col bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Cart Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-600/10 text-emerald-600 flex items-center justify-center">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                বিক্রয় কার্ট
              </h3>
              <span className="text-[11px] text-slate-500 font-mono">
                {cart.reduce((s, i) => s + i.quantity, 0)} টি আইটেম
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Hold Carts List Button */}
            {holdCarts.length > 0 && (
              <button
                onClick={() => setIsHoldDrawerOpen(true)}
                className="px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-bold flex items-center gap-1 transition-colors"
                title="হোল্ড করা কার্ট দেখুন"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>হোল্ড ({holdCarts.length})</span>
              </button>
            )}

            {/* Clear Cart */}
            {cart.length > 0 && (
              <button
                onClick={handleClearCart}
                className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                title="কার্ট খালি করুন"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Customer Selector & Quick Create Bar */}
        <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30 flex items-center justify-between text-xs">
          <button
            onClick={() => setIsCustomerModalOpen(true)}
            className="flex items-center gap-2 text-left truncate flex-1 hover:opacity-80 transition-opacity"
          >
            <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 flex items-center justify-center shrink-0">
              <User className="w-3.5 h-3.5" />
            </div>
            <div className="truncate">
              {selectedCustomer ? (
                <>
                  <span className="font-bold text-slate-900 dark:text-slate-100 block truncate">
                    {selectedCustomer.name}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono block">
                    {selectedCustomer.mobileNumber} · বকেয়া: ৳{selectedCustomer.currentDue.toFixed(2)}
                  </span>
                </>
              ) : (
                <span className="text-slate-500 font-medium">
                  সাধারণ গ্রাহক (Walk-in Customer)
                </span>
              )}
            </div>
          </button>

          <div className="flex items-center gap-2 shrink-0 ml-2">
            {selectedCustomer ? (
              <button
                onClick={() => setSelectedCustomer(null)}
                className="text-[11px] font-semibold text-rose-500 hover:underline"
              >
                রিমুভ
              </button>
            ) : (
              <>
                <button
                  onClick={() => setIsCustomerModalOpen(true)}
                  className="text-[11px] font-semibold text-emerald-600 hover:underline"
                >
                  খুঁজুন
                </button>
                <button
                  onClick={() => setIsQuickCustomerOpen(true)}
                  className="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] flex items-center gap-1 hover:bg-emerald-100"
                  title="দ্রুত নতুন গ্রাহক যুক্ত করুন (F3)"
                >
                  <UserPlus className="w-3 h-3" />
                  <span>নতুন (F3)</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center text-slate-400 mb-2">
                <ShoppingCart className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300">কার্ট খালি রয়েছে</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                বাম পাশের তালিকা থেকে পণ্য নির্বাচন করুন অথবা বারকোড স্ক্যান করুন।
              </p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 flex items-center justify-between gap-2 shadow-xs"
              >
                <div className="flex-1 min-w-0">
                  <h5 className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                    {language === 'bn' ? item.product.nameBn : (item.product.nameEn || item.product.nameBn)}
                  </h5>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5 font-mono">
                    {/* Clickable price to open PriceEditModal */}
                    <button
                      onClick={() => setEditingPriceItem(item)}
                      className="hover:text-emerald-600 underline decoration-dotted font-semibold flex items-center gap-1"
                      title="মূল্য ও আইটেম ডিসকাউন্ট পরিবর্তন করতে ক্লিক করুন"
                    >
                      <span>৳{item.unitPrice.toFixed(2)}</span>
                      {item.unitPrice !== item.originalPrice && (
                        <span className="text-[9px] text-amber-600 font-bold">(এডিট)</span>
                      )}
                    </button>
                    <span>×</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{item.quantity}</span>
                    {item.discount > 0 && (
                      <span className="text-emerald-600 text-[10px]">
                        (-৳{item.discount})
                      </span>
                    )}
                  </div>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5">
                    <button
                      onClick={() => updateQuantity(item.id, -1)}
                      className="w-6 h-6 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-7 text-center font-mono font-bold text-xs text-slate-900 dark:text-slate-100">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      className="w-6 h-6 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <span className="font-mono font-bold text-xs text-slate-900 dark:text-slate-100 w-16 text-right">
                    ৳{item.total.toFixed(2)}
                  </span>

                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-500 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Calculation & Payment Terminal Drawer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 space-y-3">
          {/* Discount, Tax, Shipping & Totals */}
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>সাবটোটাল:</span>
              <span className="font-mono font-semibold">৳{rawSubtotal.toFixed(2)}</span>
            </div>

            {itemDiscountsTotal > 0 && (
              <div className="flex justify-between text-emerald-600 font-mono">
                <span>আইটেম ডিসকাউন্ট:</span>
                <span>- ৳{itemDiscountsTotal.toFixed(2)}</span>
              </div>
            )}

            {/* Invoice-Level Discount */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-600 dark:text-slate-400">ইনভয়েস ছাড় (F4):</span>
              <div className="flex items-center gap-1.5">
                <div className="flex bg-slate-200/80 dark:bg-slate-800 rounded-lg p-0.5 text-[10px] font-bold">
                  <button
                    onClick={() => setCartDiscountType('fixed')}
                    className={`px-1.5 py-0.5 rounded ${cartDiscountType === 'fixed' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs' : 'text-slate-500'}`}
                  >
                    ৳
                  </button>
                  <button
                    onClick={() => setCartDiscountType('percent')}
                    className={`px-1.5 py-0.5 rounded ${cartDiscountType === 'percent' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs' : 'text-slate-500'}`}
                  >
                    %
                  </button>
                </div>
                <input
                  ref={discountInputRef}
                  type="number"
                  min="0"
                  placeholder="0"
                  value={cartDiscountValue}
                  onChange={(e) => setCartDiscountValue(e.target.value)}
                  className="w-16 px-2 py-0.5 text-right font-mono text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-emerald-600"
                />
              </div>
            </div>

            {/* VAT & Shipping Row */}
            <div className="flex items-center justify-between gap-3 text-[11px] pt-1">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">ভ্যাট:</span>
                <select
                  value={vatRate}
                  onChange={(e) => setVatRate(Number(e.target.value))}
                  className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-[11px] font-mono focus:outline-none"
                >
                  <option value={0}>০%</option>
                  <option value={5}>৫%</option>
                  <option value={7.5}>৭.৫%</option>
                  <option value={15}>১৫%</option>
                </select>
                {vatAmount > 0 && <span className="font-mono text-slate-600">(৳{vatAmount})</span>}
              </div>

              <div className="flex items-center gap-1">
                <span className="text-slate-500">ডেলিভারি/শিপিং:</span>
                <input
                  type="number"
                  min="0"
                  placeholder="০"
                  value={shippingCharge}
                  onChange={(e) => setShippingCharge(e.target.value)}
                  className="w-14 px-1.5 py-0.5 text-right font-mono text-[11px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none"
                />
              </div>
            </div>

            {/* Grand Total */}
            <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-800">
              <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                সর্বমোট প্রদেয়:
              </span>
              <span className="font-mono font-extrabold text-lg text-emerald-600 dark:text-emerald-400">
                ৳{grandTotal.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Payment Method Selector (Cash, bKash, Nagad, Rocket, Bank, Card, Split) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
              <span>পেমেন্ট মাধ্যম:</span>
              {paymentMethod === 'Split' && (
                <button
                  onClick={() => setIsSplitModalOpen(true)}
                  className="text-emerald-600 hover:underline flex items-center gap-1"
                >
                  <span>স্প্লিট কনফিগার ({splitPayments.length} টি)</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1 text-[11px] font-semibold">
              {(['Cash', 'bKash', 'Nagad', 'Rocket', 'Bank', 'Card', 'Split'] as POSPaymentMethod[]).map(
                (method) => (
                  <button
                    key={method}
                    onClick={() => {
                      setPaymentMethod(method);
                      if (method === 'Split') {
                        setIsSplitModalOpen(true);
                      }
                    }}
                    className={`py-1.5 rounded-xl text-center transition-all ${
                      paymentMethod === method
                        ? 'bg-emerald-600 text-white shadow-sm font-bold'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-emerald-500'
                    }`}
                  >
                    {method === 'Cash' ? 'নগদ' : method}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Paid Cash Input, Quick Cash Buttons & Change/Due Return */}
          <div className="p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-slate-500">
                {paymentMethod === 'Split' ? 'স্প্লিট মোট পেমেন্ট:' : 'গৃহীত টাকা (Paid):'}
              </span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  disabled={paymentMethod === 'Split'}
                  placeholder={grandTotal.toFixed(2)}
                  value={paymentMethod === 'Split' ? effectivePaidAmount.toFixed(2) : paidAmountInput}
                  onChange={(e) => setPaidAmountInput(e.target.value)}
                  className="w-28 px-2 py-1 text-right font-mono font-bold text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-emerald-600 disabled:opacity-80"
                />
                <button
                  onClick={() => setShowTouchKeypad(!showTouchKeypad)}
                  className="p-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 hover:text-slate-800"
                  title="টাচ কিপ্যাড খুলুন"
                >
                  <Calculator className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Quick Preset Cash Buttons */}
            {paymentMethod !== 'Split' && (
              <div className="flex items-center gap-1 overflow-x-auto text-[10px] font-mono font-bold pt-1">
                <button
                  onClick={handleSetExactCash}
                  className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-emerald-50 hover:text-emerald-700 shrink-0"
                >
                  পুরো টাকা
                </button>
                <button
                  onClick={() => handleAddPresetCash(50)}
                  className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-emerald-50 hover:text-emerald-700 shrink-0"
                >
                  +৫০
                </button>
                <button
                  onClick={() => handleAddPresetCash(100)}
                  className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-emerald-50 hover:text-emerald-700 shrink-0"
                >
                  +১০০
                </button>
                <button
                  onClick={() => handleAddPresetCash(500)}
                  className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-emerald-50 hover:text-emerald-700 shrink-0"
                >
                  +৫০০
                </button>
                <button
                  onClick={() => handleAddPresetCash(1000)}
                  className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-emerald-50 hover:text-emerald-700 shrink-0"
                >
                  +১০০০
                </button>
              </div>
            )}

            {/* Due or Change Display */}
            <div className="flex justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-700/60 font-mono">
              {dueAmount > 0 ? (
                <>
                  <span className="font-bold text-rose-600">বকেয়া (Customer Due):</span>
                  <span className="font-bold text-rose-600">৳{dueAmount.toFixed(2)}</span>
                </>
              ) : (
                <>
                  <span className="text-slate-600 dark:text-slate-400">ফেরত টাকা (Change):</span>
                  <span className="font-bold text-emerald-600">৳{changeAmount.toFixed(2)}</span>
                </>
              )}
            </div>
          </div>

          {/* Action Buttons: Hold Cart (F8), Clear, & Complete Sale (F9) */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleHoldCart}
              disabled={cart.length === 0}
              className="py-3 px-3.5 rounded-2xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
              title="কার্ট হোল্ড করুন (F8)"
            >
              <Clock className="w-4 h-4 text-amber-600" />
              <span>হোল্ড (F8)</span>
            </button>

            <button
              onClick={handleCheckout}
              disabled={cart.length === 0 || isSubmitting}
              className="flex-1 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50 active:scale-[0.99]"
            >
              <span>{isSubmitting ? 'প্রসেসিং...' : 'বিক্রয় সম্পন্ন করুন (F9)'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ---------------- CUSTOMER SELECTION MODAL ---------------- */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                গ্রাহক নির্বাচন করুন
              </h3>
              <button
                onClick={() => setIsCustomerModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              <button
                onClick={() => {
                  setSelectedCustomer(null);
                  setIsCustomerModalOpen(false);
                }}
                className={`w-full p-3 rounded-2xl text-left border text-xs transition-colors flex items-center justify-between ${
                  selectedCustomer === null
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 font-bold'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <span>সাধারণ গ্রাহক (Walk-in Customer)</span>
                {selectedCustomer === null && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
              </button>

              {customers.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelectedCustomer(c);
                    setIsCustomerModalOpen(false);
                  }}
                  className={`w-full p-3 rounded-2xl text-left border text-xs transition-colors flex items-center justify-between ${
                    selectedCustomer?.id === c.id
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 font-bold'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div>
                    <span className="block font-bold text-slate-900 dark:text-slate-100">{c.name}</span>
                    <span className="text-[11px] text-slate-500 font-mono">{c.mobileNumber}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">বর্তমান বকেয়া</span>
                    <span className="font-mono font-bold text-rose-600">৳{c.currentDue.toFixed(2)}</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => {
                  setIsCustomerModalOpen(false);
                  setIsQuickCustomerOpen(true);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                <span>নতুন গ্রাহক তৈরি করুন</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- QUICK CUSTOMER CREATION MODAL ---------------- */}
      <QuickCustomerModal
        isOpen={isQuickCustomerOpen}
        onClose={() => setIsQuickCustomerOpen(false)}
        shopId={currentShop.id}
        onCustomerCreated={(newCust) => {
          setSelectedCustomer(newCust);
          loadData();
        }}
      />

      {/* ---------------- SPLIT PAYMENT MODAL ---------------- */}
      <SplitPaymentModal
        isOpen={isSplitModalOpen}
        onClose={() => setIsSplitModalOpen(false)}
        grandTotal={grandTotal}
        cashAccounts={cashAccounts}
        initialSplits={splitPayments}
        onConfirm={(splits) => {
          setSplitPayments(splits);
          setPaymentMethod('Split');
        }}
      />

      {/* ---------------- ITEM PRICE & DISCOUNT EDIT MODAL ---------------- */}
      <PriceEditModal
        isOpen={Boolean(editingPriceItem)}
        onClose={() => setEditingPriceItem(null)}
        item={editingPriceItem}
        onConfirm={handleConfirmPriceEdit}
      />

      {/* ---------------- HELD CARTS DRAWER ---------------- */}
      {isHoldDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  হোল্ড করা কার্টসমূহ ({holdCarts.length})
                </h3>
              </div>
              <button
                onClick={() => setIsHoldDrawerOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {holdCarts.length === 0 ? (
                <p className="text-center text-xs text-slate-500 py-6">কোনো হোল্ড কার্ট নেই</p>
              ) : (
                holdCarts.map((held) => (
                  <div
                    key={held.id}
                    className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between gap-2"
                  >
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">
                        {held.title}
                      </h4>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {held.items.length} টি আইটেম · ৳{held.subtotal.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleRestoreHoldCart(held)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors"
                      >
                        রিস্টোর
                      </button>
                      <button
                        onClick={() => {
                          deleteHoldCart(held.id, currentShop.id);
                          setHoldCarts(getHoldCartsByShop(currentShop.id));
                        }}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---------------- BRANDED THERMAL & A4 RECEIPT MODAL ---------------- */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        sale={completedSale}
        saleItems={completedSaleItems}
        shop={currentShop}
      />
    </div>
  );
};
