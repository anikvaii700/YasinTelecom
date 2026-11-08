/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// -----------------------------------------------------------------------------
// 1. MOBILE SHOP IMEI & SERIAL MANAGEMENT
// -----------------------------------------------------------------------------
export type DeviceStatus = 'IN_STOCK' | 'SOLD' | 'RETURNED' | 'DEFECTIVE';

export interface DeviceImei {
  id: string;
  shopId: string;
  productId?: string;
  productName: string;
  imei1: string; // 15 digits
  imei2?: string; // Optional second IMEI
  serialNumber?: string;
  brand: string; // e.g. Samsung, Xiaomi, Realme, Apple
  model: string; // e.g. Redmi Note 13
  ram?: string; // e.g. 6GB, 8GB
  storage?: string; // e.g. 128GB, 256GB
  color?: string; // e.g. Midnight Black
  purchaseCost: number;
  sellingPrice?: number;
  warrantyMonths: number; // e.g. 12
  status: DeviceStatus;
  saleInvoiceId?: string;
  saleInvoiceNumber?: string;
  saleDate?: string;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// -----------------------------------------------------------------------------
// 2. WARRANTY MANAGEMENT
// -----------------------------------------------------------------------------
export type WarrantyType = 'SHOP_WARRANTY' | 'MANUFACTURER_WARRANTY';
export type WarrantyStatus = 'ACTIVE' | 'EXPIRED' | 'CLAIMED' | 'REPLACED';

export interface ProductWarranty {
  id: string;
  shopId: string;
  saleInvoiceId?: string;
  saleInvoiceNumber: string;
  productId: string;
  productName: string;
  serialOrImei: string;
  customerName: string;
  customerPhone: string;
  warrantyType: WarrantyType;
  warrantyDurationMonths: number;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  status: WarrantyStatus;
  termsNotes?: string;
  claimedAt?: string;
  claimResolutionNotes?: string;
  createdAt: string;
  updatedAt: string;
}

// -----------------------------------------------------------------------------
// 3. TELECOM RECHARGE BOOKKEEPING LEDGER
// -----------------------------------------------------------------------------
export type TelecomOperator =
  | 'Grameenphone'
  | 'Robi'
  | 'Airtel'
  | 'Banglalink'
  | 'Teletalk';

export interface TelecomRecharge {
  id: string;
  shopId: string;
  operator: TelecomOperator;
  customerPhone?: string;
  rechargeAmount: number; // ৳
  commissionRate: number; // % e.g. 2.8%
  commissionAmount: number; // ৳ = (rechargeAmount * commissionRate) / 100
  paymentMethod: string; // Cash, bKash, etc.
  transactionRef?: string;
  simBalanceAfter?: number;
  date: string; // YYYY-MM-DD
  notes?: string;
  createdAt: string;
}

export interface TelecomSummary {
  totalRechargeAmount: number;
  totalCommissionEarned: number;
  rechargeCount: number;
  operatorBreakdown: Record<TelecomOperator, { amount: number; commission: number; count: number }>;
}

// -----------------------------------------------------------------------------
// 4. BARCODE LABEL CONFIGURATION
// -----------------------------------------------------------------------------
export type BarcodeLabelFormat = 'THERMAL_50x30' | 'THERMAL_38x25' | 'A4_SHEET_24' | 'A4_SHEET_30';

export interface BarcodePrintConfig {
  format: BarcodeLabelFormat;
  includeShopName: boolean;
  includeProductName: boolean;
  includePrice: boolean;
  includeBarcodeNumber: boolean;
  customHeader?: string;
  copiesPerProduct: number;
}
