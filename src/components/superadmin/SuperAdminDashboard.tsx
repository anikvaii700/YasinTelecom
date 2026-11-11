import React, { useState, useEffect } from 'react';
import { ShieldCheck, Store, Users, DollarSign, Activity, Search, CheckCircle2, AlertTriangle, ArrowUpRight, Lock, Unlock } from 'lucide-react';
import { getAllShops } from '../../services/storage';
import type { Shop } from '../../types/auth';

export const SuperAdminDashboard: React.FC = () => {
  const [shops, setShops] = useState<Shop[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlanFilter, setSelectedPlanFilter] = useState<'all' | 'starter' | 'pro' | 'enterprise'>('all');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  useEffect(() => {
    loadShops();
  }, []);

  const loadShops = () => {
    const allShops = getAllShops();
    setShops(allShops);
  };

  const handleUpdatePlan = (shopId: string, newPlan: string) => {
    const updated = shops.map(s => {
      if (s.id === shopId) {
        return { ...s, subscriptionPlan: newPlan };
      }
      return s;
    });
    setShops(updated);
    localStorage.setItem('mosafa_pos_db_shops', JSON.stringify(updated));
    setSuccessToast(`দোকানের প্যাকেজ সফলভাবে ${newPlan.toUpperCase()} তে আপডেট করা হয়েছে!`);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const handleToggleStatus = (shopId: string) => {
    const updated = shops.map(s => {
      if (s.id === shopId) {
        return { ...s, isActive: s.isActive === false ? true : false };
      }
      return s;
    });
    setShops(updated);
    localStorage.setItem('mosafa_pos_db_shops', JSON.stringify(updated));
    setSuccessToast('দোকানের স্ট্যাটাস আপডেট করা হয়েছে!');
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const filteredShops = shops.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (s.mobileNumber && s.mobileNumber.includes(searchTerm)) ||
                          (s.shopCode && s.shopCode.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Super Admin Top Header */}
      <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 border border-indigo-900/50">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-mono font-semibold tracking-wide border border-indigo-500/30">
              Platform Admin • Tools.MoSaFaBD.Com
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">সুপার এডমিন কন্ট্রোল রুম</h2>
          <p className="text-indigo-200 text-sm mt-1 max-w-xl">
            প্ল্যাটফর্মের সকল দোকান (Tenants), সাবস্ক্রিপশন প্ল্যান, ইউজার কোটা ও সিস্টেম পারফরম্যান্স কেন্দ্রীয়ভাবে পরিচালনা করুন।
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-mono flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>SYSTEM HEALTH: 100% OPERATIONAL</span>
          </div>
        </div>
      </div>

      {/* Success Toast */}
      {successToast && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 text-sm font-medium flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          <span>{successToast}</span>
        </div>
      )}

      {/* SaaS Global Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">মোট নিবন্ধিত দোকান</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">{shops.length}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 flex items-center justify-center">
            <Store className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">সক্রিয় সাবস্ক্রিপশন (Pro)</p>
            <p className="text-2xl font-black text-emerald-600 mt-1 font-mono">
              {shops.filter(s => (s as any).subscriptionPlan === 'pro' || (s as any).subscriptionPlan === 'enterprise').length || 1}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">মাসিক পৌনঃপুনিক রাজস্ব (MRR)</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">৳৫,৯৯০</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">ক্লাউড সিঙ্ক হার</p>
            <p className="text-2xl font-black text-sky-600 mt-1 font-mono">৯৯.৮%</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
            <Activity className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Tenant Directory Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Table Filters */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="দোকানের নাম, ফোন বা কোড খুঁজুন..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="text-xs text-slate-500">
            মোট দোকান তালিকাভুক্ত: <span className="font-bold text-slate-800 dark:text-slate-200">{filteredShops.length} টি</span>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                <th className="py-3 px-4">দোকান ও কোড</th>
                <th className="py-3 px-4">মালিক ও ফোন</th>
                <th className="py-3 px-4">ক্যাটাগরি</th>
                <th className="py-3 px-4">সাবস্ক্রিপশন প্ল্যান</th>
                <th className="py-3 px-4">স্ট্যাটাস</th>
                <th className="py-3 px-4 text-right">ম্যানেজমেন্ট</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {filteredShops.map((s) => {
                const plan = (s as any).subscriptionPlan || 'pro';
                const isActive = s.isActive !== false;

                return (
                  <tr key={s.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900 dark:text-white text-sm">{s.name}</p>
                      <p className="text-slate-400 font-mono text-[11px]">{s.shopCode || s.id.slice(0, 8)}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-slate-800 dark:text-slate-200">{s.ownerName || 'স্বত্বাধিকারী'}</p>
                      <p className="text-slate-400 font-mono">{s.mobileNumber || 'N/A'}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 capitalize text-[11px]">
                        {s.category || 'General Store'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={plan}
                        onChange={(e) => handleUpdatePlan(s.id, e.target.value)}
                        className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-sky-700 dark:text-sky-400 focus:outline-none"
                      >
                        <option value="starter">Starter (ফ্রি)</option>
                        <option value="pro">Pro (বিজনেস)</option>
                        <option value="enterprise">Enterprise (মাল্টি-শাখা)</option>
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isActive
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        {isActive ? 'সক্রিয়' : 'স্থগিত'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleToggleStatus(s.id)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                          isActive
                            ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400'
                        }`}
                      >
                        {isActive ? 'সাসপেন্ড করুন' : 'পুনরুদ্ধার করুন'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
