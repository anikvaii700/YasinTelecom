/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  DeviceImei,
  DeviceStatus,
  ProductWarranty,
  TelecomOperator,
  TelecomRecharge,
  TelecomSummary,
  WarrantyStatus,
  WarrantyType,
} from '../types/specialized';
import { addAuditLog } from './storage';

const STORAGE_KEYS = {
  DEVICE_IMEIS: 'mosafa_pos_db_device_imeis',
  WARRANTIES: 'mosafa_pos_db_warranties',
  TELECOM_RECHARGES: 'mosafa_pos_db_telecom_recharges',
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

// -----------------------------------------------------------------------------
// 1. INITIALIZE DEMO DATA FOR SPECIALIZED MODULES
// -----------------------------------------------------------------------------
export function initializeSpecializedDefaults(shopId: string): void {
  const existingImeis = getImeisByShop(shopId);
  const existingTelecom = getTelecomRechargesByShop(shopId);

  const now = new Date().toISOString();
  const today = now.slice(0, 10);

  if (existingImeis.length === 0) {
    const sampleImeis: DeviceImei[] = [
      {
        id: crypto.randomUUID(),
        shopId,
        productName: 'Xiaomi Redmi Note 13',
        imei1: '862910041234567',
        imei2: '862910041234568',
        serialNumber: 'SN-XIA-2026-901',
        brand: 'Xiaomi',
        model: 'Redmi Note 13',
        ram: '8GB',
        storage: '256GB',
        color: 'Midnight Black',
        purchaseCost: 20500,
        sellingPrice: 23500,
        warrantyMonths: 12,
        status: 'IN_STOCK',
        notes: 'অফিসিয়াল ইনটেক হ্যান্ডসেট',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: crypto.randomUUID(),
        shopId,
        productName: 'Samsung Galaxy A15',
        imei1: '358249089876543',
        imei2: '358249089876544',
        serialNumber: 'SN-SAM-A15-442',
        brand: 'Samsung',
        model: 'Galaxy A15',
        ram: '6GB',
        storage: '128GB',
        color: 'Blue Black',
        purchaseCost: 17800,
        sellingPrice: 19999,
        warrantyMonths: 12,
        status: 'IN_STOCK',
        notes: 'অফিসিয়াল বাংলাদেশ ওয়ারেন্টি',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: crypto.randomUUID(),
        shopId,
        productName: 'Realme C55',
        imei1: '869123067711223',
        serialNumber: 'SN-RLM-C55-102',
        brand: 'Realme',
        model: 'C55',
        ram: '6GB',
        storage: '128GB',
        color: 'Sunshower',
        purchaseCost: 14200,
        sellingPrice: 16500,
        warrantyMonths: 12,
        status: 'SOLD',
        saleInvoiceNumber: 'MS-2026-000001',
        saleDate: today,
        customerName: 'মেহেদী হাসান',
        customerPhone: '01712-445566',
        createdAt: now,
        updatedAt: now,
      },
    ];

    setItem(STORAGE_KEYS.DEVICE_IMEIS, sampleImeis);

    // Corresponding Warranty Card for the sold device
    const sampleWarranty: ProductWarranty = {
      id: crypto.randomUUID(),
      shopId,
      saleInvoiceNumber: 'MS-2026-000001',
      productId: 'realme-c55-sample',
      productName: 'Realme C55 (6GB/128GB)',
      serialOrImei: '869123067711223',
      customerName: 'মেহেদী হাসান',
      customerPhone: '01712-445566',
      warrantyType: 'MANUFACTURER_WARRANTY',
      warrantyDurationMonths: 12,
      startDate: today,
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      status: 'ACTIVE',
      termsNotes: 'অফিসিয়াল ১ বছর সেবা ওয়ারেন্টি। ডিসপ্লে বা পানি ঢুকলে ওয়ারেন্টির আওতাভুক্ত নয়।',
      createdAt: now,
      updatedAt: now,
    };
    setItem(STORAGE_KEYS.WARRANTIES, [sampleWarranty]);
  }

  if (existingTelecom.length === 0) {
    const sampleTelecom: TelecomRecharge[] = [
      {
        id: crypto.randomUUID(),
        shopId,
        operator: 'Grameenphone',
        customerPhone: '01711-223344',
        rechargeAmount: 500,
        commissionRate: 2.8,
        commissionAmount: 14,
        paymentMethod: 'Cash',
        transactionRef: 'GP-TX-9901',
        date: today,
        notes: '৫০০ টাকার ফ্লেক্সিলোড',
        createdAt: now,
      },
      {
        id: crypto.randomUUID(),
        shopId,
        operator: 'Banglalink',
        customerPhone: '01922-334455',
        rechargeAmount: 300,
        commissionRate: 3.0,
        commissionAmount: 9,
        paymentMethod: 'Cash',
        transactionRef: 'BL-TX-8812',
        date: today,
        notes: '৩০০ টাকা রিচার্জ',
        createdAt: now,
      },
      {
        id: crypto.randomUUID(),
        shopId,
        operator: 'Robi',
        customerPhone: '01833-445566',
        rechargeAmount: 1000,
        commissionRate: 2.7,
        commissionAmount: 27,
        paymentMethod: 'bKash',
        transactionRef: 'ROBI-TX-1049',
        date: today,
        notes: '১০০০ টাকার প্যাকেজ লোড',
        createdAt: now,
      },
    ];
    setItem(STORAGE_KEYS.TELECOM_RECHARGES, sampleTelecom);
  }
}

// -----------------------------------------------------------------------------
// 2. IMEI & SERIAL PHONE MANAGEMENT
// -----------------------------------------------------------------------------
export function getImeisByShop(
  shopId: string,
  filterStatus?: DeviceStatus | 'ALL',
  searchTerm?: string
): DeviceImei[] {
  const all = getItem<DeviceImei[]>(STORAGE_KEYS.DEVICE_IMEIS, []);
  let filtered = all.filter((d) => d.shopId === shopId);

  if (filterStatus && filterStatus !== 'ALL') {
    filtered = filtered.filter((d) => d.status === filterStatus);
  }

  if (searchTerm && searchTerm.trim()) {
    const term = searchTerm.toLowerCase().trim();
    filtered = filtered.filter(
      (d) =>
        d.imei1.toLowerCase().includes(term) ||
        (d.imei2 && d.imei2.toLowerCase().includes(term)) ||
        (d.serialNumber && d.serialNumber.toLowerCase().includes(term)) ||
        d.productName.toLowerCase().includes(term) ||
        d.brand.toLowerCase().includes(term) ||
        d.model.toLowerCase().includes(term) ||
        (d.saleInvoiceNumber && d.saleInvoiceNumber.toLowerCase().includes(term)) ||
        (d.customerPhone && d.customerPhone.includes(term))
    );
  }

  return filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function registerDeviceImei(params: {
  shopId: string;
  productId?: string;
  productName: string;
  imei1: string;
  imei2?: string;
  serialNumber?: string;
  brand: string;
  model: string;
  ram?: string;
  storage?: string;
  color?: string;
  purchaseCost: number;
  sellingPrice?: number;
  warrantyMonths?: number;
  notes?: string;
  actorId?: string;
}): DeviceImei {
  const all = getItem<DeviceImei[]>(STORAGE_KEYS.DEVICE_IMEIS, []);
  const now = new Date().toISOString();

  // Validate duplicate IMEI in the same shop
  const cleanImei1 = params.imei1.trim();
  const duplicate = all.find(
    (d) =>
      d.shopId === params.shopId &&
      (d.imei1 === cleanImei1 || (params.imei2 && d.imei1 === params.imei2.trim()))
  );

  if (duplicate) {
    throw new Error(
      `IMEI নম্বর '${cleanImei1}' এই দোকানে ইতিমধ্যে নিবন্ধিত রয়েছে (${duplicate.productName} - স্ট্যাটাস: ${duplicate.status})।`
    );
  }

  const newDevice: DeviceImei = {
    id: crypto.randomUUID(),
    shopId: params.shopId,
    productId: params.productId,
    productName: params.productName.trim(),
    imei1: cleanImei1,
    imei2: params.imei2 ? params.imei2.trim() : undefined,
    serialNumber: params.serialNumber ? params.serialNumber.trim() : undefined,
    brand: params.brand.trim(),
    model: params.model.trim(),
    ram: params.ram?.trim(),
    storage: params.storage?.trim(),
    color: params.color?.trim(),
    purchaseCost: Number(params.purchaseCost) || 0,
    sellingPrice: params.sellingPrice ? Number(params.sellingPrice) : undefined,
    warrantyMonths: params.warrantyMonths ?? 12,
    status: 'IN_STOCK',
    notes: params.notes?.trim(),
    createdAt: now,
    updatedAt: now,
  };

  all.unshift(newDevice);
  setItem(STORAGE_KEYS.DEVICE_IMEIS, all);

  addAuditLog({
    shopId: params.shopId,
    action: 'SHOP_UPDATED',
    details: {
      action: 'REGISTER_DEVICE_IMEI',
      imei1: newDevice.imei1,
      model: newDevice.model,
      actorId: params.actorId,
    },
  });

  return newDevice;
}

export function updateDeviceImei(
  id: string,
  updates: Partial<Omit<DeviceImei, 'id' | 'shopId' | 'createdAt'>>
): DeviceImei {
  const all = getItem<DeviceImei[]>(STORAGE_KEYS.DEVICE_IMEIS, []);
  const idx = all.findIndex((d) => d.id === id);
  if (idx === -1) throw new Error('ডিভাইস খুঁজে পাওয়া যায়নি।');

  const updated: DeviceImei = {
    ...all[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  all[idx] = updated;
  setItem(STORAGE_KEYS.DEVICE_IMEIS, all);
  return updated;
}

export function markImeiSold(params: {
  shopId: string;
  imeiIdOrNumber: string;
  saleInvoiceId?: string;
  saleInvoiceNumber: string;
  customerName?: string;
  customerPhone?: string;
  salePrice?: number;
}): DeviceImei | undefined {
  const all = getItem<DeviceImei[]>(STORAGE_KEYS.DEVICE_IMEIS, []);
  const device = all.find(
    (d) =>
      d.shopId === params.shopId &&
      (d.id === params.imeiIdOrNumber || d.imei1 === params.imeiIdOrNumber || d.imei2 === params.imeiIdOrNumber)
  );

  if (!device) return undefined;

  const now = new Date().toISOString();
  device.status = 'SOLD';
  device.saleInvoiceId = params.saleInvoiceId;
  device.saleInvoiceNumber = params.saleInvoiceNumber;
  device.customerName = params.customerName;
  device.customerPhone = params.customerPhone;
  device.saleDate = now.slice(0, 10);
  if (params.salePrice) device.sellingPrice = params.salePrice;
  device.updatedAt = now;

  setItem(STORAGE_KEYS.DEVICE_IMEIS, all);

  // Automatically create a warranty card if phone has warranty
  if (device.warrantyMonths > 0) {
    const startDate = device.saleDate;
    const startObj = new Date(startDate);
    startObj.setMonth(startObj.getMonth() + device.warrantyMonths);
    const endDate = startObj.toISOString().slice(0, 10);

    registerProductWarranty({
      shopId: params.shopId,
      saleInvoiceId: params.saleInvoiceId,
      saleInvoiceNumber: params.saleInvoiceNumber,
      productId: device.productId || device.id,
      productName: `${device.brand} ${device.model} (${device.ram || ''}/${device.storage || ''})`.trim(),
      serialOrImei: device.imei1,
      customerName: params.customerName || 'সম্মানিত ক্রেতা',
      customerPhone: params.customerPhone || 'N/A',
      warrantyType: 'MANUFACTURER_WARRANTY',
      warrantyDurationMonths: device.warrantyMonths,
      startDate,
      endDate,
      termsNotes: `${device.warrantyMonths} মাসের অফিসিয়াল ব্র্যান্ড ওয়ারেন্টি। ফিজিক্যাল ড্যামেজ বা তরল পদার্থের ক্ষতি ব্যতীত।`,
    });
  }

  return device;
}

// -----------------------------------------------------------------------------
// 3. WARRANTY MANAGEMENT
// -----------------------------------------------------------------------------
export function getWarrantiesByShop(
  shopId: string,
  statusFilter?: WarrantyStatus | 'ALL',
  searchTerm?: string
): ProductWarranty[] {
  const all = getItem<ProductWarranty[]>(STORAGE_KEYS.WARRANTIES, []);
  let filtered = all.filter((w) => w.shopId === shopId);

  const today = new Date().toISOString().slice(0, 10);

  // Auto evaluate expiry
  filtered.forEach((w) => {
    if (w.status === 'ACTIVE' && w.endDate < today) {
      w.status = 'EXPIRED';
    }
  });

  if (statusFilter && statusFilter !== 'ALL') {
    filtered = filtered.filter((w) => w.status === statusFilter);
  }

  if (searchTerm && searchTerm.trim()) {
    const term = searchTerm.toLowerCase().trim();
    filtered = filtered.filter(
      (w) =>
        w.serialOrImei.toLowerCase().includes(term) ||
        w.productName.toLowerCase().includes(term) ||
        w.customerName.toLowerCase().includes(term) ||
        w.customerPhone.includes(term) ||
        w.saleInvoiceNumber.toLowerCase().includes(term)
    );
  }

  return filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function registerProductWarranty(params: {
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
  startDate?: string;
  endDate?: string;
  termsNotes?: string;
  actorId?: string;
}): ProductWarranty {
  const all = getItem<ProductWarranty[]>(STORAGE_KEYS.WARRANTIES, []);
  const now = new Date().toISOString();
  const startDate = params.startDate || now.slice(0, 10);

  let endDate = params.endDate;
  if (!endDate) {
    const dateObj = new Date(startDate);
    dateObj.setMonth(dateObj.getMonth() + params.warrantyDurationMonths);
    endDate = dateObj.toISOString().slice(0, 10);
  }

  const warranty: ProductWarranty = {
    id: crypto.randomUUID(),
    shopId: params.shopId,
    saleInvoiceId: params.saleInvoiceId,
    saleInvoiceNumber: params.saleInvoiceNumber,
    productId: params.productId,
    productName: params.productName.trim(),
    serialOrImei: params.serialOrImei.trim(),
    customerName: params.customerName.trim(),
    customerPhone: params.customerPhone.trim(),
    warrantyType: params.warrantyType,
    warrantyDurationMonths: params.warrantyDurationMonths,
    startDate,
    endDate,
    status: 'ACTIVE',
    termsNotes: params.termsNotes?.trim(),
    createdAt: now,
    updatedAt: now,
  };

  all.unshift(warranty);
  setItem(STORAGE_KEYS.WARRANTIES, all);

  addAuditLog({
    shopId: params.shopId,
    action: 'SHOP_UPDATED',
    details: {
      action: 'REGISTER_WARRANTY',
      serialOrImei: warranty.serialOrImei,
      warrantyType: warranty.warrantyType,
      actorId: params.actorId,
    },
  });

  return warranty;
}

export function updateWarrantyStatus(
  id: string,
  status: WarrantyStatus,
  claimResolutionNotes?: string,
  actorId?: string
): ProductWarranty {
  const all = getItem<ProductWarranty[]>(STORAGE_KEYS.WARRANTIES, []);
  const idx = all.findIndex((w) => w.id === id);
  if (idx === -1) throw new Error('ওয়ারেন্টি রেকর্ড পাওয়া যায়নি।');

  const now = new Date().toISOString();
  all[idx].status = status;
  if (status === 'CLAIMED' || status === 'REPLACED') {
    all[idx].claimedAt = now;
  }
  if (claimResolutionNotes) {
    all[idx].claimResolutionNotes = claimResolutionNotes;
  }
  all[idx].updatedAt = now;

  setItem(STORAGE_KEYS.WARRANTIES, all);

  addAuditLog({
    shopId: all[idx].shopId,
    action: 'SHOP_UPDATED',
    details: {
      action: 'UPDATE_WARRANTY_STATUS',
      warrantyId: id,
      status,
      actorId,
    },
  });

  return all[idx];
}

// -----------------------------------------------------------------------------
// 4. TELECOM RECHARGE BOOKKEEPING LEDGER
// -----------------------------------------------------------------------------
export function getTelecomRechargesByShop(
  shopId: string,
  startDate?: string,
  endDate?: string,
  operator?: TelecomOperator | 'ALL'
): TelecomRecharge[] {
  const all = getItem<TelecomRecharge[]>(STORAGE_KEYS.TELECOM_RECHARGES, []);
  let filtered = all.filter((r) => r.shopId === shopId);

  if (operator && operator !== 'ALL') {
    filtered = filtered.filter((r) => r.operator === operator);
  }

  if (startDate) {
    filtered = filtered.filter((r) => r.date >= startDate);
  }
  if (endDate) {
    filtered = filtered.filter((r) => r.date <= endDate);
  }

  return filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function recordTelecomRecharge(params: {
  shopId: string;
  operator: TelecomOperator;
  customerPhone?: string;
  rechargeAmount: number;
  commissionRate: number; // e.g. 2.8%
  paymentMethod?: string;
  transactionRef?: string;
  simBalanceAfter?: number;
  date?: string;
  notes?: string;
}): TelecomRecharge {
  if (params.rechargeAmount <= 0) {
    throw new Error('রিচার্জের পরিমাণ ০ এর বেশি হতে হবে।');
  }

  const commissionAmount = Number(
    ((params.rechargeAmount * params.commissionRate) / 100).toFixed(2)
  );

  const now = new Date().toISOString();
  const recharge: TelecomRecharge = {
    id: crypto.randomUUID(),
    shopId: params.shopId,
    operator: params.operator,
    customerPhone: params.customerPhone?.trim(),
    rechargeAmount: Number(params.rechargeAmount.toFixed(2)),
    commissionRate: params.commissionRate,
    commissionAmount,
    paymentMethod: params.paymentMethod || 'Cash',
    transactionRef: params.transactionRef?.trim(),
    simBalanceAfter: params.simBalanceAfter,
    date: params.date || now.slice(0, 10),
    notes: params.notes?.trim(),
    createdAt: now,
  };

  const all = getItem<TelecomRecharge[]>(STORAGE_KEYS.TELECOM_RECHARGES, []);
  all.unshift(recharge);
  setItem(STORAGE_KEYS.TELECOM_RECHARGES, all);

  return recharge;
}

export function getTelecomSummary(
  shopId: string,
  startDate?: string,
  endDate?: string
): TelecomSummary {
  const list = getTelecomRechargesByShop(shopId, startDate, endDate);

  const initialOps: Record<TelecomOperator, { amount: number; commission: number; count: number }> = {
    Grameenphone: { amount: 0, commission: 0, count: 0 },
    Robi: { amount: 0, commission: 0, count: 0 },
    Airtel: { amount: 0, commission: 0, count: 0 },
    Banglalink: { amount: 0, commission: 0, count: 0 },
    Teletalk: { amount: 0, commission: 0, count: 0 },
  };

  let totalRechargeAmount = 0;
  let totalCommissionEarned = 0;

  for (const item of list) {
    totalRechargeAmount += item.rechargeAmount;
    totalCommissionEarned += item.commissionAmount;

    if (initialOps[item.operator]) {
      initialOps[item.operator].amount += item.rechargeAmount;
      initialOps[item.operator].commission += item.commissionAmount;
      initialOps[item.operator].count += 1;
    }
  }

  return {
    totalRechargeAmount: Number(totalRechargeAmount.toFixed(2)),
    totalCommissionEarned: Number(totalCommissionEarned.toFixed(2)),
    rechargeCount: list.length,
    operatorBreakdown: initialOps,
  };
}
