/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  History,
  Calendar,
  Lock,
  UserCheck,
  Receipt,
  RotateCcw,
  Boxes,
  Settings,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { AuditLog } from '../../types/auth';
import { getAuditLogs } from '../../services/storage';

export const AuditLogViewer: React.FC = () => {
  const { currentShop } = useAuth();
  const { t } = useLanguage();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('ALL');

  if (!currentShop) return null;

  const logs = getAuditLogs(currentShop.id);

  const filteredLogs = logs.filter((log) => {
    if (selectedAction !== 'ALL' && log.action !== selectedAction) return false;
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase().trim();
    return (
      log.action.toLowerCase().includes(term) ||
      JSON.stringify(log.details).toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* ---------------- 1. PAGE HEADER ---------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-emerald-600" />
              <span>নিরাপত্তা ও সংবেদনশীল লেনদেন অডিট লগ</span>
            </h1>
            <span className="text-xs text-slate-500 font-mono">
              · {logs.length} টি রেকর্ড
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            বিক্রয় বাতিল, স্টক সমন্বয়, পিন পরিবর্তন, অনুমতি সম্পাদন ও আর্থিক সেটিংস পরিবর্তনের অপরিবর্তনীয় রেকর্ড।
          </p>
        </div>
      </div>

      {/* ---------------- 2. CONTROLS ---------------- */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="অ্যাকশন বা বিবরণ খুঁজুন..."
            className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {[
            { id: 'ALL', label: 'সকল অডিট' },
            { id: 'SALE_CREATED', label: 'বিক্রয় তৈরি' },
            { id: 'SALE_CANCELLED', label: 'বিক্রয় বাতিল' },
            { id: 'STOCK_ADJUSTED', label: 'স্টক সমন্বয়' },
            { id: 'PIN_UPDATED', label: 'পিন পরিবর্তন' },
            { id: 'SHOP_UPDATED', label: 'দোকান আপডেট' },
          ].map((action) => (
            <button
              key={action.id}
              onClick={() => setSelectedAction(action.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedAction === action.id
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* ---------------- 3. AUDIT TABLE ---------------- */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">সময় ও তারিখ</th>
                <th className="py-3 px-4">অ্যাকশন টাইপ</th>
                <th className="py-3 px-4">ব্যবহারকারী / অ্যাক্টর</th>
                <th className="py-3 px-4">বিস্তারিত তথ্য ও প্যারামিটার</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400 font-sans">
                    কোনো অডিট লগ রেকর্ড পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap text-[11px]">
                      {new Date(log.createdAt).toLocaleString('bn-BD')}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400 text-xs">
                      {log.actorId || 'স্বত্বাধিকারী (Owner)'}
                    </td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300 text-[11px]">
                      <div className="max-w-xl truncate">
                        {JSON.stringify(log.details)}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
