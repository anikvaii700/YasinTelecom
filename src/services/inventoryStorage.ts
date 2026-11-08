/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Category,
  Customer,
  CustomerPayment,
  InventoryValuationSummary,
  Product,
  ProductVariant,
  Purchase,
  PurchaseItem,
  StockMovement,
  StockMovementType,
  Supplier,
  SupplierPayment,
} from '../types/inventory';
import {
  CartItem,
  HoldCart,
  POSPaymentMethod,
  Sale,
  SaleItem,
  SaleStatus,
  SplitPaymentDetail,
} from '../types/pos';
import { addAuditLog } from './storage';

const STORAGE_KEYS = {
  CATEGORIES: 'mosafa_pos_db_categories',
  PRODUCTS: 'mosafa_pos_db_products',
  STOCK_MOVEMENTS: 'mosafa_pos_db_stock_movements',
  CUSTOMERS: 'mosafa_pos_db_customers',
  CUSTOMER_PAYMENTS: 'mosafa_pos_db_customer_payments',
  SUPPLIERS: 'mosafa_pos_db_suppliers',
  SUPPLIER_PAYMENTS: 'mosafa_pos_db_supplier_payments',
  PURCHASES: 'mosafa_pos_db_purchases',
  PURCHASE_ITEMS: 'mosafa_pos_db_purchase_items',
  SALES: 'mosafa_pos_db_sales',
  SALE_ITEMS: 'mosafa_pos_db_sale_items',
  HOLD_CARTS: 'mosafa_pos_db_hold_carts',
};

function getItem<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error saving ${key}:`, e);
  }
}

/**
 * Initializes realistic default catalog & CRM data for a given shop if blank
 */
export function initializeShopInventoryDefaults(shopId: string): void {
  const existingCats = getCategoriesByShop(shopId);
  if (existingCats.length > 0) return;

  // 1. Initial Categories
  const catMens: Category = {
    id: crypto.randomUUID(),
    shopId,
    nameBn: 'পুরুষদের পোশাক (Men)',
    nameEn: "Men's Apparel",
    slug: 'mens-apparel',
    description: 'পাঞ্জাবি, শার্ট, প্যান্ট ও পুরুষদের ফ্যাশন পোশাক',
    iconName: 'Shirt',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const catWomens: Category = {
    id: crypto.randomUUID(),
    shopId,
    nameBn: 'মহিলাদের পোশাক (Women)',
    nameEn: "Women's Fashion",
    slug: 'womens-fashion',
    description: 'থ্রি-পিস, শাড়ি, বোরকা ও পার্টি ওয়্যার',
    iconName: 'Sparkles',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const catAcc: Category = {
    id: crypto.randomUUID(),
    shopId,
    nameBn: 'এক্সেসরিজ ও লাইফস্টাইল',
    nameEn: 'Accessories',
    slug: 'accessories',
    description: 'বেল্ট, ওয়ালেট, ক্যাপ ও ঘড়ি',
    iconName: 'Watch',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const allCats = getItem<Category[]>(STORAGE_KEYS.CATEGORIES, []);
  allCats.push(catMens, catWomens, catAcc);
  setItem(STORAGE_KEYS.CATEGORIES, allCats);

  // 2. Initial Suppliers
  const sup1: Supplier = {
    id: crypto.randomUUID(),
    shopId,
    name: 'ঢাকা টেক্সটাইল ও ফ্যাশন মিলস',
    contactPerson: 'মোঃ রফিকুল ইসলাম',
    phone: '+8801711223399',
    address: 'প্লট ৪২, মিরপুর বেনারসি পল্লী, ঢাকা',
    email: 'dhakatextiles@example.com',
    notes: 'প্রিমিয়াম সুতি ও কাতান কাপড়ের নিয়মিত ডিলার',
    openingPayable: 0,
    currentPayable: 12500,
    totalPurchases: 45000,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const sup2: Supplier = {
    id: crypto.randomUUID(),
    shopId,
    name: 'আলিফ গার্মেন্টস সাপ্লাইয়ার্স',
    contactPerson: 'তৌফিক মাহমুদ',
    phone: '+8801822334455',
    address: 'ইসলামপুর হোলসেল মার্কেট, ঢাকা সদর',
    email: 'alifgarments@example.com',
    notes: 'রেডিমেড শার্ট ও পাঞ্জাবি সরবরাহকারী',
    openingPayable: 0,
    currentPayable: 0,
    totalPurchases: 28000,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const allSups = getItem<Supplier[]>(STORAGE_KEYS.SUPPLIERS, []);
  allSups.push(sup1, sup2);
  setItem(STORAGE_KEYS.SUPPLIERS, allSups);

  // 3. Initial Customers
  const cust1: Customer = {
    id: crypto.randomUUID(),
    shopId,
    name: 'তানভীর আহমেদ',
    mobileNumber: '+8801911445566',
    address: 'ধানমন্ডি ৪/এ, ঢাকা',
    email: 'tanvir@example.com',
    notes: 'নিয়মিত গ্রাহক (VIP Customer)',
    openingBalance: 0,
    currentDue: 1800,
    totalPurchases: 14500,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const cust2: Customer = {
    id: crypto.randomUUID(),
    shopId,
    name: 'ফারহানা চৌধুরী',
    mobileNumber: '+8801733667788',
    address: 'উত্তরা সেক্টর ৭, ঢাকা',
    email: 'farhana@example.com',
    notes: 'পেমেন্ট নিয়মিত ক্লিয়ার করেন',
    openingBalance: 0,
    currentDue: 0,
    totalPurchases: 8900,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const allCusts = getItem<Customer[]>(STORAGE_KEYS.CUSTOMERS, []);
  allCusts.push(cust1, cust2);
  setItem(STORAGE_KEYS.CUSTOMERS, allCusts);

  // 4. Initial Products
  const prod1: Product = {
    id: crypto.randomUUID(),
    shopId,
    categoryId: catMens.id,
    supplierId: sup1.id,
    nameBn: 'প্রিমিয়াম সুতি পাঞ্জাবি (রয়েল নেভি)',
    nameEn: 'Premium Cotton Panjabi (Royal Navy)',
    sku: 'PANJ-NAV-01',
    barcode: '89010020101',
    brand: 'MoSaFa Heritage',
    model: 'Eid Edition 2026',
    description: '১০০% ফাইন কটন সুতা, আরামদায়ক সেলাই ও মার্জিত বাটন ডিজাইন',
    purchasePrice: 950,
    sellingPrice: 1450,
    wholesalePrice: 1200,
    unit: 'Piece',
    minStockLevel: 5,
    currentStock: 24,
    avgPurchaseCost: 950,
    warrantyDuration: 'রং গ্যারান্টি (১ বছর)',
    isActive: true,
    variants: [
      { id: crypto.randomUUID(), productId: '', variantName: 'Size: 40', stockDelta: 8 },
      { id: crypto.randomUUID(), productId: '', variantName: 'Size: 42', stockDelta: 10 },
      { id: crypto.randomUUID(), productId: '', variantName: 'Size: 44', stockDelta: 6 },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const prod2: Product = {
    id: crypto.randomUUID(),
    shopId,
    categoryId: catMens.id,
    supplierId: sup2.id,
    nameBn: 'ফরমাল সেমি-ফিট শার্ট (স্নো হোয়াইট)',
    nameEn: 'Formal Semi-Fit Shirt (Snow White)',
    sku: 'SHIRT-WHT-02',
    barcode: '89010020102',
    brand: 'MoSaFa Classic',
    model: 'Office Wear',
    description: 'রিংকল-ফ্রি পিওর সুতি ফেব্রিক, অফিস ও ক্যাজুয়াল ব্যবহারের উপযোগী',
    purchasePrice: 650,
    sellingPrice: 1100,
    wholesalePrice: 900,
    unit: 'Piece',
    minStockLevel: 8,
    currentStock: 18,
    avgPurchaseCost: 650,
    warrantyDuration: 'কোনো ওয়ারেন্টি নেই',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const prod3: Product = {
    id: crypto.randomUUID(),
    shopId,
    categoryId: catWomens.id,
    supplierId: sup1.id,
    nameBn: 'এক্সক্লুসিভ কাতান শাড়ি (মেরুন ও গোল্ড)',
    nameEn: 'Exclusive Katan Silk Saree (Maroon & Gold)',
    sku: 'SAREE-KAT-03',
    barcode: '89010020103',
    brand: 'MoSaFa Silk',
    model: 'Bridal Series',
    description: 'ট্র্যাডিশনাল জড়ির কাজ ও সফট সিল্কি ফিনিশ',
    purchasePrice: 2200,
    sellingPrice: 3600,
    wholesalePrice: 3000,
    unit: 'Piece',
    minStockLevel: 3,
    currentStock: 4, // Near low stock
    avgPurchaseCost: 2200,
    warrantyDuration: 'জড়ির গ্যারান্টি',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const prod4: Product = {
    id: crypto.randomUUID(),
    shopId,
    categoryId: catAcc.id,
    supplierId: sup2.id,
    nameBn: 'জেনুইন লেদার ওয়ালেট ও কার্ডহোল্ডার',
    nameEn: 'Genuine Leather Wallet',
    sku: 'WAL-LTHR-04',
    barcode: '89010020104',
    brand: 'MoSaFa Leather',
    model: 'Bi-fold Slim',
    description: '১০০% অরিজিনাল কাউ লেদার ও আরএফআইডি ব্লকিং লেয়ার',
    purchasePrice: 420,
    sellingPrice: 750,
    wholesalePrice: 600,
    unit: 'Piece',
    minStockLevel: 5,
    currentStock: 2, // Low stock triggered!
    avgPurchaseCost: 420,
    warrantyDuration: 'লেদার লাইফটাইম',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const allProds = getItem<Product[]>(STORAGE_KEYS.PRODUCTS, []);
  allProds.push(prod1, prod2, prod3, prod4);
  setItem(STORAGE_KEYS.PRODUCTS, allProds);

  // 5. Initial Stock Movements
  const allMoves = getItem<StockMovement[]>(STORAGE_KEYS.STOCK_MOVEMENTS, []);
  [prod1, prod2, prod3, prod4].forEach((p) => {
    allMoves.push({
      id: crypto.randomUUID(),
      shopId,
      productId: p.id,
      productName: p.nameBn,
      movementType: 'INITIAL',
      quantityDelta: p.currentStock,
      previousStock: 0,
      newStock: p.currentStock,
      unitCost: p.purchasePrice,
      referenceId: 'OPENING-STOCK',
      notes: 'প্রারম্ভিক ইনভেন্টরি স্টক সেটআপ',
      createdAt: new Date().toISOString(),
    });
  });
  setItem(STORAGE_KEYS.STOCK_MOVEMENTS, allMoves);
}

// -----------------------------------------------------------------------------
// 1. CATEGORIES MANAGEMENT
// -----------------------------------------------------------------------------

export function getCategoriesByShop(shopId: string): Category[] {
  const all = getItem<Category[]>(STORAGE_KEYS.CATEGORIES, []);
  return all.filter((c) => c.shopId === shopId && c.isActive);
}

export function getAllCategoriesByShop(shopId: string): Category[] {
  const all = getItem<Category[]>(STORAGE_KEYS.CATEGORIES, []);
  return all.filter((c) => c.shopId === shopId);
}

export function saveCategory(category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Category {
  const all = getItem<Category[]>(STORAGE_KEYS.CATEGORIES, []);
  const now = new Date().toISOString();

  if (category.id) {
    const idx = all.findIndex((c) => c.id === category.id && c.shopId === category.shopId);
    if (idx === -1) throw new Error('Category not found');
    const updated: Category = {
      ...all[idx],
      ...category,
      updatedAt: now,
    };
    all[idx] = updated;
    setItem(STORAGE_KEYS.CATEGORIES, all);
    return updated;
  } else {
    // Check duplicate slug in same shop
    const slug = (category.slug || category.nameEn || category.nameBn).toLowerCase().trim().replace(/\s+/g, '-');
    const isDup = all.some((c) => c.shopId === category.shopId && c.slug === slug);
    if (isDup) throw new Error('DUPLICATE_CATEGORY_SLUG');

    const created: Category = {
      ...category,
      id: crypto.randomUUID(),
      slug,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    all.push(created);
    setItem(STORAGE_KEYS.CATEGORIES, all);
    return created;
  }
}

export function deleteCategory(id: string, shopId: string): { success: boolean; message?: string } {
  const allProds = getProductsByShop(shopId);
  const productsUsingCat = allProds.filter((p) => p.categoryId === id);

  if (productsUsingCat.length > 0) {
    return {
      success: false,
      message: `এই ক্যাটাগরিতে ${productsUsingCat.length}টি সক্রিয় পণ্য যুক্ত রয়েছে। ডিলিট করার পরিবর্তে আর্কাইভ করতে পারেন।`,
    };
  }

  const all = getItem<Category[]>(STORAGE_KEYS.CATEGORIES, []);
  const filtered = all.filter((c) => !(c.id === id && c.shopId === shopId));
  setItem(STORAGE_KEYS.CATEGORIES, filtered);
  return { success: true };
}

export function toggleArchiveCategory(id: string, shopId: string): Category {
  const all = getItem<Category[]>(STORAGE_KEYS.CATEGORIES, []);
  const idx = all.findIndex((c) => c.id === id && c.shopId === shopId);
  if (idx === -1) throw new Error('Category not found');

  all[idx].isActive = !all[idx].isActive;
  all[idx].updatedAt = new Date().toISOString();
  setItem(STORAGE_KEYS.CATEGORIES, all);
  return all[idx];
}

// -----------------------------------------------------------------------------
// 2. PRODUCT MANAGEMENT
// -----------------------------------------------------------------------------

export function getProductsByShop(shopId: string): Product[] {
  const all = getItem<Product[]>(STORAGE_KEYS.PRODUCTS, []);
  return all.filter((p) => p.shopId === shopId);
}

export function getProductById(id: string, shopId: string): Product | null {
  const all = getItem<Product[]>(STORAGE_KEYS.PRODUCTS, []);
  return all.find((p) => p.id === id && p.shopId === shopId) || null;
}

export function saveProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }, actorId?: string): Product {
  const all = getItem<Product[]>(STORAGE_KEYS.PRODUCTS, []);
  const now = new Date().toISOString();
  const trimmedSku = product.sku.trim().toUpperCase();

  // Check duplicate SKU in this shop
  const skuDuplicate = all.some(
    (p) => p.shopId === product.shopId && p.sku.toUpperCase() === trimmedSku && p.id !== product.id
  );
  if (skuDuplicate) {
    throw new Error('DUPLICATE_SKU');
  }

  if (product.id) {
    const idx = all.findIndex((p) => p.id === product.id && p.shopId === product.shopId);
    if (idx === -1) throw new Error('Product not found');

    const previousStock = all[idx].currentStock;
    const updated: Product = {
      ...all[idx],
      ...product,
      sku: trimmedSku,
      updatedAt: now,
    };

    all[idx] = updated;
    setItem(STORAGE_KEYS.PRODUCTS, all);

    // If current stock was modified directly in edit, create a stock adjustment movement
    if (previousStock !== updated.currentStock) {
      const delta = updated.currentStock - previousStock;
      recordStockMovement({
        shopId: updated.shopId,
        productId: updated.id,
        productName: updated.nameBn,
        movementType: delta > 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT',
        quantityDelta: delta,
        previousStock,
        newStock: updated.currentStock,
        unitCost: updated.purchasePrice,
        referenceId: 'MANUAL_EDIT',
        notes: 'পণ্য এডিটের মাধ্যমে স্টক সমন্বয়',
        actorId,
      });
    }

    addAuditLog({
      shopId: updated.shopId,
      actorId,
      action: 'SHOP_UPDATED',
      details: { productName: updated.nameBn, sku: updated.sku },
    });

    return updated;
  } else {
    const newId = crypto.randomUUID();
    const created: Product = {
      ...product,
      id: newId,
      sku: trimmedSku,
      avgPurchaseCost: product.purchasePrice,
      createdAt: now,
      updatedAt: now,
    };

    all.unshift(created);
    setItem(STORAGE_KEYS.PRODUCTS, all);

    // Initial stock movement record
    if (created.currentStock > 0) {
      recordStockMovement({
        shopId: created.shopId,
        productId: created.id,
        productName: created.nameBn,
        movementType: 'INITIAL',
        quantityDelta: created.currentStock,
        previousStock: 0,
        newStock: created.currentStock,
        unitCost: created.purchasePrice,
        referenceId: 'OPENING-STOCK',
        notes: 'নতুন পণ্য তৈরির প্রাথমিক স্টক',
        actorId,
      });
    }

    return created;
  }
}

// -----------------------------------------------------------------------------
// 3. INVENTORY & STOCK MOVEMENTS (IMMUTABLE AUDIT TRAIL)
// -----------------------------------------------------------------------------

export function recordStockMovement(movement: Omit<StockMovement, 'id' | 'createdAt'>): StockMovement {
  const allMoves = getItem<StockMovement[]>(STORAGE_KEYS.STOCK_MOVEMENTS, []);
  const entry: StockMovement = {
    ...movement,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };

  allMoves.unshift(entry);
  if (allMoves.length > 500) allMoves.length = 500;
  setItem(STORAGE_KEYS.STOCK_MOVEMENTS, allMoves);
  return entry;
}

export function getStockMovementsByShop(shopId: string, productId?: string): StockMovement[] {
  const all = getItem<StockMovement[]>(STORAGE_KEYS.STOCK_MOVEMENTS, []);
  return all.filter((m) => m.shopId === shopId && (!productId || m.productId === productId));
}

/**
 * Adjusts product stock with reason & creates immutable movement record
 */
export function adjustProductStock(params: {
  shopId: string;
  productId: string;
  newStock: number;
  reasonType: StockMovementType;
  notes?: string;
  actorId?: string;
}): Product {
  const all = getItem<Product[]>(STORAGE_KEYS.PRODUCTS, []);
  const idx = all.findIndex((p) => p.id === params.productId && p.shopId === params.shopId);
  if (idx === -1) throw new Error('Product not found');

  const product = all[idx];
  const previousStock = product.currentStock;
  const delta = params.newStock - previousStock;

  if (params.newStock < 0) {
    throw new Error('NEGATIVE_STOCK_NOT_ALLOWED');
  }

  product.currentStock = params.newStock;
  product.updatedAt = new Date().toISOString();
  all[idx] = product;
  setItem(STORAGE_KEYS.PRODUCTS, all);

  recordStockMovement({
    shopId: params.shopId,
    productId: product.id,
    productName: product.nameBn,
    movementType: params.reasonType,
    quantityDelta: delta,
    previousStock,
    newStock: params.newStock,
    unitCost: product.avgPurchaseCost || product.purchasePrice,
    referenceId: 'ADJUSTMENT',
    notes: params.notes || 'ইনভেন্টরি ব্যালেন্স রিকনসিলিয়েশন',
    actorId: params.actorId,
  });

  return product;
}

/**
 * Computes live valuation and inventory metrics
 */
export function getInventoryValuation(shopId: string): InventoryValuationSummary {
  const products = getProductsByShop(shopId).filter((p) => p.isActive);

  let totalItems = products.length;
  let totalStockUnits = 0;
  let totalValuation = 0;
  let totalRetailValue = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;

  for (const p of products) {
    const stock = Number(p.currentStock) || 0;
    const cost = Number(p.avgPurchaseCost || p.purchasePrice) || 0;
    const price = Number(p.sellingPrice) || 0;

    totalStockUnits += stock;
    totalValuation += stock * cost;
    totalRetailValue += stock * price;

    if (stock <= 0) {
      outOfStockCount++;
    } else if (stock <= p.minStockLevel) {
      lowStockCount++;
    }
  }

  return {
    totalItems,
    totalStockUnits,
    totalValuation,
    totalRetailValue,
    potentialProfit: totalRetailValue - totalValuation,
    lowStockCount,
    outOfStockCount,
  };
}

// -----------------------------------------------------------------------------
// 4. CUSTOMER MANAGEMENT
// -----------------------------------------------------------------------------

export function getCustomersByShop(shopId: string): Customer[] {
  const all = getItem<Customer[]>(STORAGE_KEYS.CUSTOMERS, []);
  return all.filter((c) => c.shopId === shopId);
}

export function saveCustomer(customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Customer {
  const all = getItem<Customer[]>(STORAGE_KEYS.CUSTOMERS, []);
  const now = new Date().toISOString();

  if (customer.id) {
    const idx = all.findIndex((c) => c.id === customer.id && c.shopId === customer.shopId);
    if (idx === -1) throw new Error('Customer not found');
    const updated: Customer = {
      ...all[idx],
      ...customer,
      updatedAt: now,
    };
    all[idx] = updated;
    setItem(STORAGE_KEYS.CUSTOMERS, all);
    return updated;
  } else {
    const created: Customer = {
      ...customer,
      id: crypto.randomUUID(),
      currentDue: customer.openingBalance || 0,
      totalPurchases: 0,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    all.unshift(created);
    setItem(STORAGE_KEYS.CUSTOMERS, all);
    return created;
  }
}

export function recordCustomerPaymentEntry(params: {
  shopId: string;
  customerId: string;
  amount: number;
  paymentMethod: string;
  referenceNumber?: string;
  notes?: string;
}): CustomerPayment {
  const allCusts = getItem<Customer[]>(STORAGE_KEYS.CUSTOMERS, []);
  const idx = allCusts.findIndex((c) => c.id === params.customerId && c.shopId === params.shopId);
  if (idx === -1) throw new Error('Customer not found');

  const cust = allCusts[idx];
  cust.currentDue = Math.max(0, cust.currentDue - params.amount);
  cust.updatedAt = new Date().toISOString();
  allCusts[idx] = cust;
  setItem(STORAGE_KEYS.CUSTOMERS, allCusts);

  const payments = getItem<CustomerPayment[]>(STORAGE_KEYS.CUSTOMER_PAYMENTS, []);
  const entry: CustomerPayment = {
    ...params,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  payments.unshift(entry);
  setItem(STORAGE_KEYS.CUSTOMER_PAYMENTS, payments);
  return entry;
}

export function getCustomerPaymentsByShop(shopId: string, customerId?: string): CustomerPayment[] {
  const all = getItem<CustomerPayment[]>(STORAGE_KEYS.CUSTOMER_PAYMENTS, []);
  return all.filter((p) => p.shopId === shopId && (!customerId || p.customerId === customerId));
}

// -----------------------------------------------------------------------------
// 5. SUPPLIER MANAGEMENT
// -----------------------------------------------------------------------------

export function getSuppliersByShop(shopId: string): Supplier[] {
  const all = getItem<Supplier[]>(STORAGE_KEYS.SUPPLIERS, []);
  return all.filter((s) => s.shopId === shopId);
}

export function saveSupplier(supplier: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Supplier {
  const all = getItem<Supplier[]>(STORAGE_KEYS.SUPPLIERS, []);
  const now = new Date().toISOString();

  if (supplier.id) {
    const idx = all.findIndex((s) => s.id === supplier.id && s.shopId === supplier.shopId);
    if (idx === -1) throw new Error('Supplier not found');
    const updated: Supplier = {
      ...all[idx],
      ...supplier,
      updatedAt: now,
    };
    all[idx] = updated;
    setItem(STORAGE_KEYS.SUPPLIERS, all);
    return updated;
  } else {
    const created: Supplier = {
      ...supplier,
      id: crypto.randomUUID(),
      currentPayable: supplier.openingPayable || 0,
      totalPurchases: 0,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    all.unshift(created);
    setItem(STORAGE_KEYS.SUPPLIERS, all);
    return created;
  }
}

export function recordSupplierPaymentEntry(params: {
  shopId: string;
  supplierId: string;
  purchaseId?: string;
  amount: number;
  paymentMethod: string;
  referenceNumber?: string;
  notes?: string;
}): SupplierPayment {
  const allSups = getItem<Supplier[]>(STORAGE_KEYS.SUPPLIERS, []);
  const idx = allSups.findIndex((s) => s.id === params.supplierId && s.shopId === params.shopId);
  if (idx === -1) throw new Error('Supplier not found');

  const sup = allSups[idx];
  sup.currentPayable = Math.max(0, sup.currentPayable - params.amount);
  sup.updatedAt = new Date().toISOString();
  allSups[idx] = sup;
  setItem(STORAGE_KEYS.SUPPLIERS, allSups);

  const payments = getItem<SupplierPayment[]>(STORAGE_KEYS.SUPPLIER_PAYMENTS, []);
  const entry: SupplierPayment = {
    ...params,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  payments.unshift(entry);
  setItem(STORAGE_KEYS.SUPPLIER_PAYMENTS, payments);
  return entry;
}

export function getSupplierPaymentsByShop(shopId: string, supplierId?: string): SupplierPayment[] {
  const all = getItem<SupplierPayment[]>(STORAGE_KEYS.SUPPLIER_PAYMENTS, []);
  return all.filter((p) => p.shopId === shopId && (!supplierId || p.supplierId === supplierId));
}

// -----------------------------------------------------------------------------
// 6. PURCHASE MANAGEMENT (TRANSACTIONAL STOCK-IN, VALUATION & PAYABLES)
// -----------------------------------------------------------------------------

export function getPurchasesByShop(shopId: string): Purchase[] {
  const all = getItem<Purchase[]>(STORAGE_KEYS.PURCHASES, []);
  return all.filter((p) => p.shopId === shopId);
}

export function createPurchaseTransaction(params: {
  shopId: string;
  supplierId: string;
  invoiceNumber: string;
  purchaseDate: string;
  items: {
    productId: string;
    quantity: number;
    unitPurchasePrice: number;
  }[];
  discount: number;
  additionalCosts: number;
  paidAmount: number;
  paymentMethod: string;
  notes?: string;
  idempotencyKey?: string;
  actorId?: string;
}): Purchase {
  const now = new Date().toISOString();
  const allPurchases = getItem<Purchase[]>(STORAGE_KEYS.PURCHASES, []);

  // Check idempotency key to prevent accidental duplicate submission
  if (params.idempotencyKey) {
    const existing = allPurchases.find((p) => p.idempotencyKey === params.idempotencyKey);
    if (existing) return existing;
  }

  // Check duplicate invoice number for same shop
  const invoiceExists = allPurchases.some(
    (p) => p.shopId === params.shopId && p.invoiceNumber.toUpperCase() === params.invoiceNumber.trim().toUpperCase()
  );
  if (invoiceExists) {
    throw new Error('DUPLICATE_INVOICE_NUMBER');
  }

  // Fetch supplier
  const allSups = getItem<Supplier[]>(STORAGE_KEYS.SUPPLIERS, []);
  const supIdx = allSups.findIndex((s) => s.id === params.supplierId && s.shopId === params.shopId);
  if (supIdx === -1) throw new Error('Supplier not found');
  const supplier = allSups[supIdx];

  // Calculate items subtotal and enrich
  const allProds = getItem<Product[]>(STORAGE_KEYS.PRODUCTS, []);
  let subtotal = 0;
  const purchaseId = crypto.randomUUID();

  const purchaseItems: PurchaseItem[] = params.items.map((item) => {
    const prod = allProds.find((p) => p.id === item.productId && p.shopId === params.shopId);
    if (!prod) throw new Error(`Product ${item.productId} not found`);

    const itemTotal = item.quantity * item.unitPurchasePrice;
    subtotal += itemTotal;

    return {
      id: crypto.randomUUID(),
      purchaseId,
      productId: item.productId,
      productName: prod.nameBn,
      quantity: item.quantity,
      unitPurchasePrice: item.unitPurchasePrice,
      subtotal: itemTotal,
    };
  });

  const grandTotal = Math.max(0, subtotal - (params.discount || 0) + (params.additionalCosts || 0));
  const paidAmount = Math.min(grandTotal, params.paidAmount || 0);
  const dueAmount = grandTotal - paidAmount;

  // 1. Update Products Stock and Weighted Average Cost
  for (const item of params.items) {
    const pIdx = allProds.findIndex((p) => p.id === item.productId && p.shopId === params.shopId);
    if (pIdx !== -1) {
      const prod = allProds[pIdx];
      const previousStock = Number(prod.currentStock) || 0;
      const oldAvgCost = Number(prod.avgPurchaseCost || prod.purchasePrice) || 0;
      const newQty = Number(item.quantity) || 0;
      const newUnitCost = Number(item.unitPurchasePrice) || 0;

      // Weighted Average Cost formula:
      // new_avg = ((old_stock * old_cost) + (new_qty * new_unit_cost)) / (old_stock + new_qty)
      const totalUnits = previousStock + newQty;
      const weightedAvgCost = totalUnits > 0
        ? ((previousStock * oldAvgCost) + (newQty * newUnitCost)) / totalUnits
        : newUnitCost;

      prod.currentStock = totalUnits;
      prod.avgPurchaseCost = Math.round(weightedAvgCost * 100) / 100;
      prod.purchasePrice = newUnitCost; // update latest purchase price
      prod.updatedAt = now;
      allProds[pIdx] = prod;

      // Record immutable stock movement
      recordStockMovement({
        shopId: params.shopId,
        productId: prod.id,
        productName: prod.nameBn,
        movementType: 'PURCHASE',
        quantityDelta: newQty,
        previousStock,
        newStock: totalUnits,
        unitCost: newUnitCost,
        referenceId: params.invoiceNumber,
        notes: `ক্রয় চালান: ${params.invoiceNumber} (${supplier.name})`,
        actorId: params.actorId,
      });
    }
  }
  setItem(STORAGE_KEYS.PRODUCTS, allProds);

  // 2. Update Supplier Outstanding Payable and Purchases
  supplier.totalPurchases += grandTotal;
  supplier.currentPayable += dueAmount;
  supplier.updatedAt = now;
  allSups[supIdx] = supplier;
  setItem(STORAGE_KEYS.SUPPLIERS, allSups);

  // 3. Record Supplier Payment if paidAmount > 0
  if (paidAmount > 0) {
    recordSupplierPaymentEntry({
      shopId: params.shopId,
      supplierId: supplier.id,
      purchaseId,
      amount: paidAmount,
      paymentMethod: params.paymentMethod,
      referenceNumber: params.invoiceNumber,
      notes: `ক্রয় চালান ${params.invoiceNumber}-এর বিপরীতে পরিশোধ`,
    });
  }

  // 4. Save Purchase Record
  const newPurchase: Purchase = {
    id: purchaseId,
    shopId: params.shopId,
    supplierId: supplier.id,
    supplierName: supplier.name,
    invoiceNumber: params.invoiceNumber.trim().toUpperCase(),
    purchaseDate: params.purchaseDate || now,
    subtotal,
    discount: params.discount || 0,
    additionalCosts: params.additionalCosts || 0,
    grandTotal,
    paidAmount,
    dueAmount,
    paymentMethod: params.paymentMethod,
    idempotencyKey: params.idempotencyKey,
    status: 'COMPLETED',
    notes: params.notes,
    items: purchaseItems,
    createdAt: now,
    updatedAt: now,
  };

  allPurchases.unshift(newPurchase);
  setItem(STORAGE_KEYS.PURCHASES, allPurchases);

  addAuditLog({
    shopId: params.shopId,
    actorId: params.actorId,
    action: 'SHOP_UPDATED',
    details: {
      action: 'PURCHASE_CREATED',
      invoiceNumber: newPurchase.invoiceNumber,
      grandTotal,
      paidAmount,
      dueAmount,
    },
  });

  return newPurchase;
}

// -----------------------------------------------------------------------------
// 7. CSV IMPORT / EXPORT UTILITIES
// -----------------------------------------------------------------------------

export function exportProductsToCSV(shopId: string): string {
  const products = getProductsByShop(shopId);
  const categories = getCategoriesByShop(shopId);

  const headers = [
    'Name (Bengali)',
    'Name (English)',
    'SKU',
    'Barcode',
    'Category',
    'Purchase Price',
    'Selling Price',
    'Current Stock',
    'Unit',
    'Min Stock Level',
  ];

  const rows = products.map((p) => {
    const cat = categories.find((c) => c.id === p.categoryId);
    return [
      `"${p.nameBn.replace(/"/g, '""')}"`,
      `"${p.nameEn.replace(/"/g, '""')}"`,
      `"${p.sku}"`,
      `"${p.barcode}"`,
      `"${cat?.nameBn || ''}"`,
      p.purchasePrice,
      p.sellingPrice,
      p.currentStock,
      `"${p.unit}"`,
      p.minStockLevel,
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

export function importProductsFromCSV(csvText: string, shopId: string): { imported: number; errors: string[] } {
  const lines = csvText.trim().split('\n');
  if (lines.length <= 1) return { imported: 0, errors: ['CSV file is empty or only has headers'] };

  let imported = 0;
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(',').map((val) => val.trim().replace(/^"|"$/g, ''));
    if (parts.length < 5) {
      errors.push(`Line ${i + 1}: Invalid format`);
      continue;
    }

    const [nameBn, nameEn, sku, barcode, , purchasePrice, sellingPrice, stock, unit, minStock] = parts;

    if (!nameBn || !sku) {
      errors.push(`Line ${i + 1}: Missing product name or SKU`);
      continue;
    }

    try {
      saveProduct({
        shopId,
        nameBn,
        nameEn: nameEn || nameBn,
        sku,
        barcode: barcode || String(Math.floor(10000000000 + Math.random() * 90000000000)),
        purchasePrice: Number(purchasePrice) || 0,
        sellingPrice: Number(sellingPrice) || 0,
        currentStock: Number(stock) || 0,
        avgPurchaseCost: Number(purchasePrice) || 0,
        unit: unit || 'Piece',
        minStockLevel: Number(minStock) || 5,
        isActive: true,
      });
      imported++;
    } catch (err: unknown) {
      errors.push(`Line ${i + 1} (${sku}): ${String(err)}`);
    }
  }

  return { imported, errors };
}

// -----------------------------------------------------------------------------
// STEP 3: POS BILLING & SALES TRANSACTIONS
// -----------------------------------------------------------------------------

export interface CreateSaleParams {
  shopId: string;
  customerId?: string | null;
  customerName?: string;
  customerPhone?: string;
  invoiceNumber?: string;
  items: CartItem[];
  subtotal: number;
  cartDiscount: number;
  vatAmount: number;
  vatRatePercent: number;
  grandTotal: number;
  paidAmount: number;
  dueAmount: number;
  changeAmount: number;
  paymentMethod: POSPaymentMethod;
  splitPayments?: SplitPaymentDetail[];
  notes?: string;
  cashierName?: string;
  actorId?: string;
}

export function getSalesByShop(shopId: string): Sale[] {
  const all = getItem<Sale[]>(STORAGE_KEYS.SALES, []);
  return all.filter((s) => s.shopId === shopId);
}

export function getSaleItemsBySale(saleId: string): SaleItem[] {
  const all = getItem<SaleItem[]>(STORAGE_KEYS.SALE_ITEMS, []);
  return all.filter((item) => item.saleId === saleId);
}

export function createSaleTransaction(params: CreateSaleParams): { sale: Sale; items: SaleItem[] } {
  if (!params.items || params.items.length === 0) {
    throw new Error('কার্ট খালি! বিক্রয় সম্পন্ন করার জন্য অন্তত একটি পণ্য যোগ করুন।');
  }

  const now = new Date().toISOString();
  const allProducts = getItem<Product[]>(STORAGE_KEYS.PRODUCTS, []);
  const invoiceNumber = params.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`;
  const saleId = crypto.randomUUID();

  // 1. Stock check & deduction
  let totalCost = 0;
  for (const cartItem of params.items) {
    const prodIndex = allProducts.findIndex(
      (p) => p.id === cartItem.product.id && p.shopId === params.shopId
    );
    if (prodIndex === -1) {
      throw new Error(`পণ্য পাওয়া যায়নি: ${cartItem.product.nameBn}`);
    }

    const currentProd = allProducts[prodIndex];
    if (currentProd.currentStock < cartItem.quantity) {
      throw new Error(
        `পর্যাপ্ত স্টক নেই! '${currentProd.nameBn}' এর বর্তমান স্টক: ${currentProd.currentStock} ${currentProd.unit}, যা ${cartItem.quantity} এর চেয়ে কম।`
      );
    }

    const previousStock = currentProd.currentStock;
    const newStock = previousStock - cartItem.quantity;
    allProducts[prodIndex] = {
      ...currentProd,
      currentStock: newStock,
      updatedAt: now,
    };

    const costPrice = currentProd.avgPurchaseCost || currentProd.purchasePrice;
    totalCost += costPrice * cartItem.quantity;

    // Create immutable stock movement record
    recordStockMovement({
      shopId: params.shopId,
      productId: currentProd.id,
      productName: currentProd.nameBn,
      movementType: 'SALE',
      quantityDelta: -cartItem.quantity,
      previousStock,
      newStock,
      unitCost: costPrice,
      referenceId: invoiceNumber,
      notes: `POS বিক্রয় চালান: ${invoiceNumber}`,
      actorId: params.actorId,
    });
  }

  // Commit updated products stock
  setItem(STORAGE_KEYS.PRODUCTS, allProducts);

  // 2. Customer Update (if customer attached)
  if (params.customerId) {
    const allCustomers = getItem<Customer[]>(STORAGE_KEYS.CUSTOMERS, []);
    const custIndex = allCustomers.findIndex(
      (c) => c.id === params.customerId && c.shopId === params.shopId
    );
    if (custIndex !== -1) {
      const c = allCustomers[custIndex];
      allCustomers[custIndex] = {
        ...c,
        totalPurchases: Number((c.totalPurchases + params.grandTotal).toFixed(2)),
        currentDue: Number((c.currentDue + params.dueAmount).toFixed(2)),
        updatedAt: now,
      };
      setItem(STORAGE_KEYS.CUSTOMERS, allCustomers);
    }
  }

  // 3. Save Sale Items
  const saleItems: SaleItem[] = params.items.map((item) => ({
    id: crypto.randomUUID(),
    saleId,
    productId: item.product.id,
    productNameBn: item.product.nameBn,
    productNameEn: item.product.nameEn,
    sku: item.product.sku,
    barcode: item.product.barcode,
    variantId: item.selectedVariant?.id,
    variantName: item.selectedVariant?.variantName,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    costPrice: item.costPrice,
    discount: item.discount,
    total: item.total,
    createdAt: now,
  }));

  const allSaleItems = getItem<SaleItem[]>(STORAGE_KEYS.SALE_ITEMS, []);
  allSaleItems.push(...saleItems);
  setItem(STORAGE_KEYS.SALE_ITEMS, allSaleItems);

  // 4. Save Sale Record
  const totalProfit = Number((params.grandTotal - totalCost).toFixed(2));
  const newSale: Sale = {
    id: saleId,
    shopId: params.shopId,
    customerId: params.customerId || null,
    customerName: params.customerName,
    customerPhone: params.customerPhone,
    invoiceNumber,
    subtotal: params.subtotal,
    cartDiscount: params.cartDiscount,
    vatAmount: params.vatAmount,
    vatRatePercent: params.vatRatePercent,
    grandTotal: params.grandTotal,
    paidAmount: params.paidAmount,
    dueAmount: params.dueAmount,
    changeAmount: params.changeAmount,
    paymentMethod: params.paymentMethod,
    splitPayments: params.splitPayments,
    status: 'COMPLETED',
    itemsCount: params.items.reduce((sum, item) => sum + item.quantity, 0),
    totalProfit,
    notes: params.notes,
    cashierName: params.cashierName,
    createdAt: now,
    updatedAt: now,
  };

  const allSales = getItem<Sale[]>(STORAGE_KEYS.SALES, []);
  allSales.unshift(newSale);
  setItem(STORAGE_KEYS.SALES, allSales);

  addAuditLog({
    shopId: params.shopId,
    actorId: params.actorId,
    action: 'SHOP_UPDATED',
    details: {
      action: 'POS_SALE_COMPLETED',
      invoiceNumber,
      grandTotal: params.grandTotal,
      paidAmount: params.paidAmount,
      dueAmount: params.dueAmount,
    },
  });

  return { sale: newSale, items: saleItems };
}

// 5. Hold Cart Management (Queue Support)
export function getHoldCartsByShop(shopId: string): HoldCart[] {
  const all = getItem<HoldCart[]>(STORAGE_KEYS.HOLD_CARTS, []);
  return all.filter((c) => c.shopId === shopId);
}

export function saveHoldCart(cart: Omit<HoldCart, 'id' | 'createdAt'> & { id?: string }): HoldCart {
  const all = getItem<HoldCart[]>(STORAGE_KEYS.HOLD_CARTS, []);
  const now = new Date().toISOString();

  if (cart.id) {
    const idx = all.findIndex((c) => c.id === cart.id && c.shopId === cart.shopId);
    if (idx !== -1) {
      all[idx] = { ...all[idx], ...cart };
      setItem(STORAGE_KEYS.HOLD_CARTS, all);
      return all[idx];
    }
  }

  const newHold: HoldCart = {
    ...cart,
    id: crypto.randomUUID(),
    createdAt: now,
  };
  all.unshift(newHold);
  setItem(STORAGE_KEYS.HOLD_CARTS, all);
  return newHold;
}

export function deleteHoldCart(id: string, shopId: string): void {
  const all = getItem<HoldCart[]>(STORAGE_KEYS.HOLD_CARTS, []);
  const filtered = all.filter((c) => !(c.id === id && c.shopId === shopId));
  setItem(STORAGE_KEYS.HOLD_CARTS, filtered);
}

