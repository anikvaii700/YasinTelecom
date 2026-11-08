/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ProductUnit =
  | 'Piece'
  | 'Box'
  | 'Packet'
  | 'Kg'
  | 'Gram'
  | 'Liter'
  | 'Meter'
  | 'Dozen'
  | 'Custom';

export interface Category {
  id: string;
  shopId: string;
  parentId?: string | null;
  nameBn: string;
  nameEn: string;
  slug: string;
  description?: string;
  iconName?: string;
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductVariant {
  id: string;
  productId: string;
  variantName: string; // e.g. "Size: L, Color: Navy"
  sku?: string;
  barcode?: string;
  purchasePrice?: number;
  sellingPrice?: number;
  stockDelta: number;
}

export interface Product {
  id: string;
  shopId: string;
  categoryId?: string | null;
  supplierId?: string | null;
  nameBn: string;
  nameEn: string;
  sku: string;
  barcode: string;
  brand?: string;
  model?: string;
  description?: string;
  imageUrl?: string;
  purchasePrice: number;
  sellingPrice: number;
  wholesalePrice?: number;
  unit: ProductUnit | string;
  minStockLevel: number;
  currentStock: number;
  avgPurchaseCost?: number;
  warrantyDuration?: string;
  isActive: boolean;
  variants?: ProductVariant[];
  createdAt: string;
  updatedAt: string;
}

export type StockMovementType =
  | 'PURCHASE'
  | 'SALE'
  | 'RETURN'
  | 'ADJUSTMENT_IN'
  | 'ADJUSTMENT_OUT'
  | 'DAMAGE'
  | 'LOSS'
  | 'INITIAL';

export interface StockMovement {
  id: string;
  shopId: string;
  productId: string;
  productName: string;
  movementType: StockMovementType;
  quantityDelta: number;
  previousStock: number;
  newStock: number;
  unitCost: number;
  referenceId?: string; // Purchase invoice, adjustment code, etc.
  notes?: string;
  actorId?: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  shopId: string;
  name: string;
  mobileNumber: string;
  address?: string;
  email?: string;
  notes?: string;
  openingBalance: number;
  currentDue: number;
  totalPurchases: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerPayment {
  id: string;
  shopId: string;
  customerId: string;
  amount: number;
  paymentMethod: string;
  referenceNumber?: string;
  notes?: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  shopId: string;
  name: string;
  contactPerson?: string;
  phone: string;
  address?: string;
  email?: string;
  notes?: string;
  openingPayable: number;
  currentPayable: number;
  totalPurchases: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierPayment {
  id: string;
  shopId: string;
  supplierId: string;
  purchaseId?: string;
  amount: number;
  paymentMethod: string;
  referenceNumber?: string;
  notes?: string;
  createdAt: string;
}

export interface PurchaseItem {
  id: string;
  purchaseId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPurchasePrice: number;
  subtotal: number;
}

export interface Purchase {
  id: string;
  shopId: string;
  supplierId: string;
  supplierName: string;
  invoiceNumber: string;
  purchaseDate: string;
  subtotal: number;
  discount: number;
  additionalCosts: number;
  grandTotal: number;
  paidAmount: number;
  dueAmount: number;
  paymentMethod: string;
  idempotencyKey?: string;
  status: 'COMPLETED' | 'CANCELLED';
  notes?: string;
  items: PurchaseItem[];
  createdAt: string;
  updatedAt: string;
}

export interface InventoryValuationSummary {
  totalItems: number;
  totalStockUnits: number;
  totalValuation: number; // based on avgPurchaseCost * currentStock
  totalRetailValue: number; // based on sellingPrice * currentStock
  potentialProfit: number;
  lowStockCount: number;
  outOfStockCount: number;
}
