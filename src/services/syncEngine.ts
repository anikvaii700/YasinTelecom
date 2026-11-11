import { offlineDb, getOrCreateDeviceId, type SyncOperation } from './offlineDb';
import { getProductsByShop, getCustomersByShop, getSalesByShop } from './inventoryStorage';

export type SyncStatus = 'online' | 'offline' | 'syncing' | 'pending' | 'failed' | 'conflict';

export interface SyncEngineState {
  status: SyncStatus;
  isOnline: boolean;
  pendingCount: number;
  failedCount: number;
  conflictCount: number;
  lastSyncedAt: string | null;
  activeDeviceId: string;
}

class SyncEngine {
  private state: SyncEngineState = {
    status: navigator.onLine ? 'online' : 'offline',
    isOnline: navigator.onLine,
    pendingCount: 0,
    failedCount: 0,
    conflictCount: 0,
    lastSyncedAt: localStorage.getItem('mosafa_last_synced_at') || null,
    activeDeviceId: getOrCreateDeviceId()
  };

  private listeners: Array<(state: SyncEngineState) => void> = [];
  private syncTimer: any = null;
  private isProcessing = false;

  constructor() {
    this.initNetworkListeners();
    this.refreshCounts();
    // Periodic sync attempt if online every 30s
    this.syncTimer = setInterval(() => {
      if (this.state.isOnline && !this.isProcessing) {
        this.processQueue();
      }
    }, 30000);
  }

  private initNetworkListeners() {
    window.addEventListener('online', () => {
      this.state.isOnline = true;
      this.state.status = 'online';
      this.notifyListeners();
      this.processQueue();
    });

    window.addEventListener('offline', () => {
      this.state.isOnline = false;
      this.state.status = 'offline';
      this.notifyListeners();
    });
  }

  public subscribe(callback: (state: SyncEngineState) => void): () => void {
    this.listeners.push(callback);
    callback(this.state);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(l => l({ ...this.state }));
  }

  public async refreshCounts() {
    try {
      const pending = await offlineDb.sync_queue.where('status').equals('pending').count();
      const failed = await offlineDb.sync_queue.where('status').equals('failed').count();
      const conflict = await offlineDb.sync_queue.where('status').equals('conflict').count();

      this.state.pendingCount = pending;
      this.state.failedCount = failed;
      this.state.conflictCount = conflict;

      if (!this.state.isOnline) {
        this.state.status = 'offline';
      } else if (this.isProcessing) {
        this.state.status = 'syncing';
      } else if (conflict > 0) {
        this.state.status = 'conflict';
      } else if (failed > 0) {
        this.state.status = 'failed';
      } else if (pending > 0) {
        this.state.status = 'pending';
      } else {
        this.state.status = 'online';
      }

      this.notifyListeners();
    } catch (e) {
      console.warn('[SyncEngine] refreshCounts error:', e);
    }
  }

  /**
   * Enqueue an operation to be synced
   */
  public async queueOperation(params: {
    shopId: string;
    entityType: SyncOperation['entityType'];
    action: SyncOperation['action'];
    payload: any;
    idempotencyKey?: string;
  }): Promise<string> {
    const opId = 'op_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
    const op: SyncOperation = {
      id: opId,
      shopId: params.shopId,
      deviceId: this.state.activeDeviceId,
      entityType: params.entityType,
      action: params.action,
      payload: params.payload,
      idempotencyKey: params.idempotencyKey || ('idem_' + opId),
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      retryCount: 0
    };

    await offlineDb.sync_queue.put(op);
    await this.refreshCounts();

    // Trigger immediate background sync if online
    if (this.state.isOnline && !this.isProcessing) {
      setTimeout(() => this.processQueue(), 500);
    }

    return opId;
  }

  /**
   * Process pending queue
   */
  public async processQueue(): Promise<void> {
    if (this.isProcessing || !this.state.isOnline) return;

    this.isProcessing = true;
    this.state.status = 'syncing';
    this.notifyListeners();

    try {
      const pendingOps = await offlineDb.sync_queue
        .where('status')
        .equals('pending')
        .limit(20)
        .toArray();

      for (const op of pendingOps) {
        try {
          // Send to backend sync endpoint
          const res = await fetch('/api/sync/operation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(op)
          });

          if (res.ok) {
            const result = await res.json();
            if (result.conflict) {
              op.status = 'conflict';
              op.lastError = 'Conflict detected: Remote version is newer';
              await offlineDb.sync_queue.put(op);
            } else {
              op.status = 'synced';
              op.serverAckAt = new Date().toISOString();
              // Clean up synced operations after ack
              await offlineDb.sync_queue.delete(op.id);
            }
          } else {
            op.retryCount += 1;
            if (op.retryCount >= 5) {
              op.status = 'failed';
              op.lastError = `Server returned ${res.status}`;
            }
            await offlineDb.sync_queue.put(op);
          }
        } catch (netErr: any) {
          op.retryCount += 1;
          if (op.retryCount >= 5) {
            op.status = 'failed';
            op.lastError = netErr.message || 'Network dispatch failure';
          }
          await offlineDb.sync_queue.put(op);
          break; // Stop loop on true connection drop
        }
      }

      const now = new Date().toISOString();
      this.state.lastSyncedAt = now;
      localStorage.setItem('mosafa_last_synced_at', now);
    } catch (e) {
      console.warn('[SyncEngine] processQueue error:', e);
    } finally {
      this.isProcessing = false;
      await this.refreshCounts();
    }
  }

  /**
   * Manual force sync trigger
   */
  public async forceSync(): Promise<void> {
    if (!this.state.isOnline) {
      throw new Error('ইন্টারনেট সংযোগ নেই। ইন্টারনেট সংযোগ চালু হলে স্বয়ংক্রিয়ভাবে সিঙ্ক হবে।');
    }
    // Reset failed items to pending for retry
    await offlineDb.sync_queue.where('status').equals('failed').modify({ status: 'pending', retryCount: 0 });
    await this.processQueue();
  }

  /**
   * Cache current shop state into IndexedDB for offline access
   */
  public async cacheShopDataLocally(shopId: string): Promise<void> {
    try {
      const products = getProductsByShop(shopId);
      const customers = getCustomersByShop(shopId);
      const sales = getSalesByShop(shopId);

      await offlineDb.products.bulkPut(products);
      await offlineDb.customers.bulkPut(customers);
      await offlineDb.sales.bulkPut(sales);

      await offlineDb.shop_meta.put({
        shopId,
        shopName: 'Cached Shop',
        ownerName: 'Owner',
        phone: '',
        lastSyncedAt: new Date().toISOString(),
        deviceFingerprint: this.state.activeDeviceId
      });
    } catch (e) {
      console.warn('[SyncEngine] cacheShopDataLocally error:', e);
    }
  }

  /**
   * Get all conflict items for UI resolution
   */
  public async getConflictItems(): Promise<SyncOperation[]> {
    return await offlineDb.sync_queue.where('status').equals('conflict').toArray();
  }

  /**
   * Resolve a conflict
   */
  public async resolveConflict(opId: string, resolution: 'keep_local' | 'keep_remote'): Promise<void> {
    const op = await offlineDb.sync_queue.get(opId);
    if (!op) return;

    if (resolution === 'keep_local') {
      op.status = 'pending';
      op.retryCount = 0;
      await offlineDb.sync_queue.put(op);
      await this.processQueue();
    } else {
      // Discard local operation
      await offlineDb.sync_queue.delete(opId);
      await this.refreshCounts();
    }
  }
}

export const syncEngine = new SyncEngine();
