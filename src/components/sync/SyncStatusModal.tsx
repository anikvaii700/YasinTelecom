import React, { useEffect, useState } from 'react';
import { RefreshCw, Wifi, WifiOff, AlertTriangle, CheckCircle2, Database, ShieldAlert, X } from 'lucide-react';
import { syncEngine, type SyncEngineState } from '../../services/syncEngine';
import { type SyncOperation } from '../../services/offlineDb';

interface SyncStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopId: string;
}

export const SyncStatusModal: React.FC<SyncStatusModalProps> = ({ isOpen, onClose, shopId }) => {
  const [syncState, setSyncState] = useState<SyncEngineState>({
    status: 'online',
    isOnline: true,
    pendingCount: 0,
    failedCount: 0,
    conflictCount: 0,
    lastSyncedAt: null,
    activeDeviceId: ''
  });
  const [conflictItems, setConflictItems] = useState<SyncOperation[]>([]);
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = syncEngine.subscribe((state) => {
      setSyncState(state);
    });

    if (isOpen) {
      loadConflicts();
    }

    return () => unsubscribe();
  }, [isOpen]);

  const loadConflicts = async () => {
    const conflicts = await syncEngine.getConflictItems();
    setConflictItems(conflicts);
  };

  const handleForceSync = async () => {
    setIsManualSyncing(true);
    try {
      await syncEngine.forceSync();
      await syncEngine.cacheShopDataLocally(shopId);
      setToastMessage('ডাটা সফলভাবে ক্লাউডের সাথে সিনক্রোনাইজ হয়েছে!');
      loadConflicts();
    } catch (err: any) {
      setToastMessage(err.message || 'সিঙ্ক ব্যর্থ হয়েছে');
    } finally {
      setIsManualSyncing(false);
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const handleResolveConflict = async (opId: string, resolution: 'keep_local' | 'keep_remote') => {
    await syncEngine.resolveConflict(opId, resolution);
    await loadConflicts();
    setToastMessage(resolution === 'keep_local' ? 'লোকাল পরিবর্তন বহাল রাখা হয়েছে' : 'সার্ভার ভার্সন গ্রহণ করা হয়েছে');
    setTimeout(() => setToastMessage(null), 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-sky-600 to-blue-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-xs">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-lg leading-tight">অফলাইন ও ক্লাউড সিঙ্ক সেন্টার</h3>
              <p className="text-xs text-sky-100 font-mono mt-0.5">Device: {syncState.activeDeviceId.slice(0, 16)}...</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {toastMessage && (
            <div className="p-3 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 rounded-xl text-sky-800 dark:text-sky-300 text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-sky-600" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Connection Status Card */}
          <div className="grid grid-cols-2 gap-3">
            <div className={`p-4 rounded-xl border flex items-center gap-3 ${
              syncState.isOnline
                ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50'
                : 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/50'
            }`}>
              <div className={`p-2.5 rounded-lg ${
                syncState.isOnline ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
              }`}>
                {syncState.isOnline ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">নেটওয়ার্ক অবস্থা</p>
                <p className={`font-semibold text-sm ${syncState.isOnline ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                  {syncState.isOnline ? 'অনলাইন (কানেক্টেড)' : 'অফলাইন মোড'}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-sky-600 text-white">
                <RefreshCw className={`w-5 h-5 ${syncState.status === 'syncing' ? 'animate-spin' : ''}`} />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">সিঙ্ক স্ট্যাটাস</p>
                <p className="font-semibold text-sm text-slate-800 dark:text-slate-200 capitalize">
                  {syncState.status === 'syncing' ? 'সিঙ্ক হচ্ছে...' :
                   syncState.status === 'offline' ? 'অফলাইন ক্যাশ' :
                   syncState.status === 'pending' ? `${syncState.pendingCount} টি অপেক্ষমান` :
                   syncState.status === 'conflict' ? 'কনফ্লিক্ট রয়েছে' : 'আপ-টু-ডেট'}
                </p>
              </div>
            </div>
          </div>

          {/* Sync Queue Summary */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-sm space-y-2">
            <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
              <span>অপেক্ষমান অপারেশন (Queue):</span>
              <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{syncState.pendingCount}</span>
            </div>
            <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
              <span>ব্যর্থ অপারেশন (Failed):</span>
              <span className="font-mono font-bold text-rose-600 dark:text-rose-400">{syncState.failedCount}</span>
            </div>
            <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
              <span>সর্বশেষ সফল সিঙ্ক:</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {syncState.lastSyncedAt ? new Date(syncState.lastSyncedAt).toLocaleTimeString('bn-BD') : 'এখনো হয়নি'}
              </span>
            </div>
          </div>

          {/* Conflict Resolution Section */}
          {conflictItems.length > 0 && (
            <div className="border border-amber-200 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400 font-medium text-sm">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>সিঙ্ক কনফ্লিক্ট শনাক্ত হয়েছে ({conflictItems.length} টি)</span>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {conflictItems.map((item) => (
                  <div key={item.id} className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-xs flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 capitalize">{item.entityType}: {item.action}</p>
                      <p className="text-slate-500 font-mono text-[11px]">{new Date(item.createdAt).toLocaleTimeString()}</p>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleResolveConflict(item.id, 'keep_local')}
                        className="px-2 py-1 bg-sky-600 text-white rounded font-medium hover:bg-sky-700 text-[11px]"
                      >
                        লোকাল রাখুন
                      </button>
                      <button
                        onClick={() => handleResolveConflict(item.id, 'keep_remote')}
                        className="px-2 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded font-medium hover:bg-slate-300 text-[11px]"
                      >
                        সার্ভার নিন
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Offline Capabilities Note */}
          <div className="p-3 bg-sky-50 dark:bg-sky-950/30 rounded-xl border border-sky-100 dark:border-sky-900/50 text-xs text-slate-600 dark:text-slate-400 space-y-1">
            <p className="font-medium text-sky-800 dark:text-sky-300 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" /> অফলাইন-ফার্স্ট সুবিধা:
            </p>
            <p>ইন্টারনেট চলে গেলেও আপনি বিক্রি (POS), কাস্টমার হিসাব ও ক্যাশ লেনদেন চালিয়ে যেতে পারবেন। ইন্টারনেট ফিরে আসার সাথে সাথে ডাটা ক্লাউডে সিঙ্ক হয়ে যাবে।</p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white"
          >
            বন্ধ করুন
          </button>
          <button
            onClick={handleForceSync}
            disabled={!syncState.isOnline || isManualSyncing}
            className="px-4 py-2 rounded-xl bg-sky-600 text-white font-medium text-sm hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-xs transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isManualSyncing ? 'animate-spin' : ''}`} />
            <span>{isManualSyncing ? 'সিঙ্ক করা হচ্ছে...' : 'এখনই সিঙ্ক করুন'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
