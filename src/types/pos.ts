/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Product, ProductVariant } from './inventory';

export type POSPaymentMethod = 'Cash' | 'bKash' | 'Nagad' | 'Card' | 'Due' | 'Split';

export type SaleStatus = 'COMPLETED' | 'HOLD' | 'CANCELLED' | 'REFUNDED';

export interface CartItem {
  id: string; // unique cart line id
  product: Product;
  selectedVariant?: ProductVariant;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  discount: number; // item discount in BDT
  total: number; // (unitPrice * quantity) - discount
  notes?: string;
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  productNameBn: string;
  productNameEn: string;
  sku: string;
  barcode?: string;
  variantId?: string;
  variantName?: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  discount: number;
  total: number;
  createdAt: string;
}

export interface SplitPaymentDetail {
  method: POSPaymentMethod;
  amount: number;
  referenceNumber?: string;
}

export interface Sale {
  id: string;
  shopId: string;
  customerId?: string | null;
  customerName?: string;
  customerPhone?: string;
  invoiceNumber: string;
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
  status: SaleStatus;
  itemsCount: number;
  totalProfit: number; // grandTotal - total cost
  notes?: string;
  cashierName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HoldCart {
  id: string;
  shopId: string;
  title: string; // e.g. "কাস্টমার ১ - ৫:২০ PM"
  customerId?: string;
  items: CartItem[];
  subtotal: number;
  notes?: string;
  createdAt: string;
}

export interface CashRegisterSession {
  id: string;
  shopId: string;
  openedAt: string;
  closedAt?: string;
  openingCash: number;
  closingCash?: number;
  expectedCash?: number;
  totalCashSales: number;
  totalDigitalSales: number;
  totalDueSales: number;
  status: 'OPEN' | 'CLOSED';
  notes?: string;
}
