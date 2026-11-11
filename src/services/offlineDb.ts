import Dexie, { type Table } from 'dexie';
import type { Product, Customer } from '../types/inventory';
import type { Sale } from '../types/pos';
import type { Expense } from '../types/finance';

export interface SyncOperation {
  id: string; // unique operation UUID
  shopId: string;
  deviceId: string;
  entityType: 'sale' | 'product' | 'customer' | 'expense' | 'payment';
  action: 'create' | 'update' | 'delete';
  payload: any;
  idempotencyKey: string;
  status: 'pending' | 'syncing' | 'failed' | 'conflict' | 'synced';
  createdAt: string;
  updatedAt: string;
  retryCount: number;
  lastError?: string;
  serverAckAt?: string;
}

export interface CachedShopMeta {
  shopId: string;
  shopName: string;
  ownerName: string;
  phone: string;
  lastSyncedAt: string;
  deviceFingerprint: string;
}

class MoSaFaOfflineDatabase extends Dexie {
  products!: Table<Product, string>;
  customers!: Table<Customer, string>;
  sales!: Table<Sale, string>;
  expenses!: Table<Expense, string>;
  sync_queue!: Table<SyncOperation, string>;
  shop_meta!: Table<CachedShopMeta, string>;

  constructor() {
    super('MoSaFaShopManagerDB');
    this.version(1).stores({
      products: 'id, shopId, barcode, sku, categoryId, name',
      customers: 'id, shopId, phone, name',
      sales: 'id, shopId, invoiceNumber, customerId, createdAt',
      expenses: 'id, shopId, categoryId, date',
      sync_queue: 'id, shopId, status, entityType, createdAt, retryCount',
      shop_meta: 'shopId'
    });
  }
}

export const offlineDb = new MoSaFaOfflineDatabase();

/**
 * Generates or retrieves stable unique device ID for sync origin tracking
 */
export function getOrCreateDeviceId(): string {
  const KEY = 'mosafa_device_uuid';
  let devId = localStorage.getItem(KEY);
  if (!devId) {
    devId = 'dev_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
    localStorage.setItem(KEY, devId);
  }
  return devId;
}
