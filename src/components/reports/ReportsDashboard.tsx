/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Calendar,
  Download,
  Printer,
  FileSpreadsheet,
  TrendingUp,
  Receipt,
  Boxes,
  Users,
  Wallet,
  RotateCcw,
  Smartphone,
  UserCheck,
  ChevronRight,
  Filter,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import {
  ReportDatePreset,
  ReportFilterOptions,
  ReportTab,
} from '../../types/reports';
import {
  exportToCsv,
  exportToExcel,
  generateCategorySalesReport,
  generateProductSalesReport,
  generateProfitLossReport,
  generateSalesReport,
  resolveDateRange,
} from '../../services/reportsEngine';
import { getInventoryValuation } from '../../services/inventoryStorage';
import { getCustomersByShop, getSuppliersByShop } from '../../services/inventoryStorage';
import { getEmployeeSalesPerformance } from '../../services/employeeStorage';
import { getTelecomSummary } from '../../services/specializedStorage';

export const ReportsDashboard: React.FC = () => {
  const { currentShop } = useAuth();
  const { t } = useLanguage();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<ReportTab>('sales');
  const [datePreset, setDatePreset] = useState<ReportDatePreset>('THIS_MONTH');

  const resolvedRange = useMemo(() => resolveDateRange(datePreset), [datePreset]);
  const [customStartDate, setCustomStartDate] = useState(resolvedRange.startDate);
  const [customEndDate, setCustomEndDate] = useState(resolvedRange.endDate);

  if (!currentShop) return null;

  const filters: ReportFilterOptions = {
    datePreset,
    startDate: datePreset === 'CUSTOM' ? customStartDate : resolvedRange.startDate,
    endDate: datePreset === 'CUSTOM' ? customEndDate : resolvedRange.endDate,
  };

  // Generate Reports Data
  const salesReport = generateSalesReport(currentShop.id, filters);
  const profitReport = generateProfitLossReport(currentShop.id, filters);
  const productReport = generateProductSalesReport(currentShop.id, filters);
  const categoryReport = generateCategorySalesReport(currentShop.id, filters);
  const valuation = getInventoryValuation(currentShop.id);
  const customers = getCustomersByShop(currentShop.id);
  const suppliers = getSuppliersByShop(currentShop.id);
  const employeePerformance = getEmployeeSalesPerformance(currentShop.id, filters.startDate, filters.endDate);
  const telecomSummary = getTelecomSummary(currentShop.id, filters.startDate, filters.endDate);

  const totalCustomerDue = customers.reduce((sum, c) => sum + (c.currentDue || 0), 0);
  const totalSupplierPayable = suppliers.reduce((sum, s) => sum + (s.currentPayable || 0), 0);

  // CSV Export Handler
  const handleExportCsv = () => {
    try {
      if (activeTab === 'sales') {
        const headers = ['তারিখ', 'ইনভয়েস সংখ্যা', 'বিক্রয় পরিমাণ (৳)', 'আদায়কৃত নগদ (৳)', 'বকেয়া বাকি (৳)'];
        const rows = salesReport.dailyData.map((d) => [d.date, d.invoicesCount, d.salesAmount, d.cashReceived, d.dueAmount]);
        exportToCsv(`${currentShop.slug}-sales-report-${filters.startDate}`, headers, rows);
      } else if (activeTab === 'profit_loss') {
        const headers = ['হিসাব বিবরণী', 'টাকার পরিমাণ (৳)'];
        const rows = [
          ['গ্রস সেলস (Gross Sales)', profitReport.grossSales],
          ['মোট ডিসকাউন্ট', profitReport.salesDiscounts],
          ['পণ্য ফেরত ও রিফান্ড', profitReport.totalReturnsRefunded],
          ['নিট বিক্রয় (Net Sales)', profitReport.netSales],
          ['বিক্রিত পণ্যের ক্রয়মূল্য (COGS)', profitReport.costOfGoodsSold],
          ['মোট লাভ (Gross Profit)', profitReport.grossProfit],
          ['টেলিকম কমিশন আয়', profitReport.telecomCommissionIncome],
          ['দোকানের পরিচালন ব্যয় (Expenses)', profitReport.totalExpenses],
          ['নিট মুনাফা (Net Profit)', profitReport.netProfit],
        ];
        exportToCsv(`${currentShop.slug}-profit-loss-${filters.startDate}`, headers, rows);
      } else if (activeTab === 'products_categories') {
        const headers = ['পণ্যের নাম', 'SKU', 'ক্যাটাগরি', 'বিক্রিত ইউনিট', 'মোট বিক্রয় (৳)', 'মোট লাভ (৳)', 'লাভের হার (%)', 'বর্তমান স্টক'];
        const rows = productReport.map((p) => [
          p.productName,
          p.sku,
          p.categoryName,
          p.quantitySold,
          p.totalRevenue,
          p.profit,
          `${p.profitMarginPercent}%`,
          p.currentStock,
        ]);
        exportToCsv(`${currentShop.slug}-product-sales-${filters.startDate}`, headers, rows);
      } else if (activeTab === 'employees') {
        const headers = ['কর্মচারীর নাম', 'পদবী', 'বিক্রয়ের সংখ্যা', 'মোট রাজস্ব (৳)', 'গড় বিক্রয় (৳)', 'প্রদত্ত ডিসকাউন্ট (৳)'];
        const rows = employeePerformance.map((e) => [
          e.employeeName,
          e.role,
          e.totalSalesCount,
          e.totalRevenue,
          e.averageSaleValue,
          e.totalDiscountGiven,
        ]);
        exportToCsv(`${currentShop.slug}-employee-performance-${filters.startDate}`, headers, rows);
      } else {
        const headers = ['মেট্রিক', 'মূল্য'];
        const rows = [
          ['মোট আইটেম', valuation.totalItems],
          ['মোট ইউনিট', valuation.totalStockUnits],
          ['মজুদ পণ্যের মূল্য (৳)', valuation.totalValuation],
          ['গ্রাহকদের বাকি (৳)', totalCustomerDue],
          ['সরবরাহকারীদের দেনা (৳)', totalSupplierPayable],
        ];
        exportToCsv(`${currentShop.slug}-business-summary`, headers, rows);
      }

      showToast({
        type: 'success',
        title: 'CSV রিপোর্ট প্রস্তুত',
        message: 'ফাইলটি সফলভাবে ডাউনলোড হয়েছে।',
      });
    } catch {
      showToast({ type: 'error', title: 'রিপোর্ট এক্সপোর্টে সমস্যা হয়েছে' });
    }
  };

  // Excel Export Handler
  const handleExportExcel = () => {
    try {
      const headers = ['পণ্যের নাম', 'SKU', 'ক্যাটাগরি', 'বিক্রিত ইউনিট', 'মোট বিক্রয় (৳)', 'মোট লাভ (৳)', 'বর্তমান স্টক'];
      const rows = productReport.map((p) => [
        p.productName,
        p.sku,
        p.categoryName,
        p.quantitySold,
        p.totalRevenue,
        p.profit,
        p.currentStock,
      ]);
      exportToExcel(`${currentShop.slug}-sales-analysis-${filters.startDate}`, headers, rows);
      showToast({
        type: 'success',
        title: 'এক্সেল স্প্রেডশীট প্রস্তুত',
        message: 'ফাইলটি ডাউনলোড ফোল্ডারে সংরক্ষিত হয়েছে।',
      });
    } catch {
      showToast({ type: 'error', title: 'এক্সেল এক্সপোর্টে সমস্যা হয়েছে' });
    }
  };

  // Browser Print View
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* ---------------- 1. PAGE HEADER & EXPORT ACTIONS ---------------- */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              ব্যবসায়িক রিপোর্ট ও অ্যানালিটিক্স
            </h1>
            <span className="text-xs text-slate-500 font-mono">
              · {currentShop.name}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            সম্পূর্ণ ডাটাবেজ নির্ভর নির্ভুল বিক্রয়, লাভ-ক্ষতি, ইনভেন্টরি ও স্টাফ পারফরম্যান্স অডিট।
          </p>
        </div>

        {/* Global Export Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>CSV ডাউনলোড</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
            <span>Excel স্প্রেডশীট</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold hover:opacity-90 transition-opacity shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>প্রিন্ট রিপোর্ট</span>
          </button>
        </div>
      </div>

      {/* ---------------- 2. DATE RANGE FILTER BAR ---------------- */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold text-slate-500 mr-2 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            <span>সময়কাল:</span>
          </span>

          {(
            [
              { id: 'TODAY', label: 'আজ' },
              { id: 'YESTERDAY', label: 'গতকাল' },
              { id: 'LAST_7_DAYS', label: 'গত ৭ দিন' },
              { id: 'LAST_30_DAYS', label: 'গত ৩০ দিন' },
              { id: 'THIS_MONTH', label: 'চলতি মাস' },
              { id: 'LAST_MONTH', label: 'গত মাস' },
              { id: 'CUSTOM', label: 'নির্দিষ্ট তারিখ' },
            ] as const
          ).map((preset) => (
            <button
              key={preset.id}
              onClick={() => setDatePreset(preset.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                datePreset === preset.id
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {datePreset === 'CUSTOM' && (
          <div className="flex items-center gap-2 text-xs">
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600"
            />
            <span className="text-slate-400">থেকে</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600"
            />
          </div>
        )}

        <div className="text-xs text-slate-500 font-mono">
          সীমা: {filters.startDate} হতে {filters.endDate}
        </div>
      </div>

      {/* ---------------- 3. REPORT MODULE TABS ---------------- */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-px">
        {[
          { id: 'sales', label: 'বিক্রয় বিবরণী', icon: Receipt },
          { id: 'profit_loss', label: 'লাভ-ক্ষতি ও ব্যয়', icon: TrendingUp },
          { id: 'products_categories', label: 'পণ্য ও ক্যাটাগরি', icon: Boxes },
          { id: 'inventory_stock', label: 'মজুদ ও দেনা-পাওনা', icon: Wallet },
          { id: 'employees', label: 'স্টাফ সেলস রিপোর্ট', icon: UserCheck },
          { id: 'telecom', label: 'টেলিকম কমিশন', icon: Smartphone },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ReportTab)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
                isActive
                  ? 'border-emerald-600 text-emerald-600 dark:border-emerald-500 dark:text-emerald-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ---------------- 4. TAB CONTENT ---------------- */}

      {/* TAB A: SALES REPORT */}
      {activeTab === 'sales' && (
        <div className="space-y-6">
          {/* Key Metric Counters */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 block">মোট বিক্রয় (Net Sales)</span>
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-2">
                ৳{salesReport.netSales.toLocaleString('en-US', { minimumFractionDigits: 0 })}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                {salesReport.totalInvoices} টি সফল ইনভয়েস
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 block">আদায়কৃত নগদ (Cash Received)</span>
              <div className="text-2xl font-bold font-mono text-emerald-600 mt-2">
                ৳{salesReport.totalCashReceived.toLocaleString('en-US', { minimumFractionDigits: 0 })}
              </div>
              <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold mt-1 block">
                ক্যাশ ও ওয়ালেটে প্রাপ্ত
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 block">বকেয়া বিক্রয় (Customer Due)</span>
              <div className="text-2xl font-bold font-mono text-rose-600 mt-2">
                ৳{salesReport.totalDueAmount.toLocaleString('en-US', { minimumFractionDigits: 0 })}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                গ্রাহক খাতা বকেয়া
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 block">গড় মেমো মূল্য (Avg Ticket)</span>
              <div className="text-2xl font-bold font-mono text-blue-600 mt-2">
                ৳{salesReport.averageInvoiceValue.toLocaleString('en-US', { minimumFractionDigits: 0 })}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                মোট ডিসকাউন্ট: ৳{salesReport.totalDiscounts}
              </span>
            </div>
          </div>

          {/* Daily Sales Breakdown Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                তারিখওয়ারি দৈনিক বিক্রয় বিবরণী
              </h3>
              <span className="text-xs text-slate-500">
                {salesReport.dailyData.length} দিনের রেকর্ড
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">তারিখ</th>
                    <th className="py-3 px-4 text-center">মেমো সংখ্যা</th>
                    <th className="py-3 px-4 text-right">মোট বিক্রয়</th>
                    <th className="py-3 px-4 text-right">নগদ আদায়</th>
                    <th className="py-3 px-4 text-right">বাকি</th>
                    <th className="py-3 px-4 text-right">আদায় হার</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {salesReport.dailyData.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        নির্বাচিত সময়সীমার মধ্যে কোনো বিক্রির রেকর্ড পাওয়া যায়নি।
                      </td>
                    </tr>
                  ) : (
                    salesReport.dailyData.map((row) => {
                      const recoveryRate =
                        row.salesAmount > 0
                          ? Math.round((row.cashReceived / row.salesAmount) * 100)
                          : 100;
                      return (
                        <tr key={row.date} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="py-3 px-4 font-mono font-medium text-slate-900 dark:text-slate-100">
                            {row.date}
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                            {row.invoicesCount} টি
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                            ৳{row.salesAmount.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-emerald-600 font-semibold">
                            ৳{row.cashReceived.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-rose-600 font-semibold">
                            ৳{row.dueAmount.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-600 dark:text-slate-400">
                            {recoveryRate}%
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB B: PROFIT & LOSS REPORT */}
      {activeTab === 'profit_loss' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-semibold text-slate-500">গ্রস সেলস ও নিট বিক্রয়</span>
              <div className="text-3xl font-extrabold font-mono text-slate-900 dark:text-slate-100 mt-2">
                ৳{profitReport.netSales.toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-400 mt-2 space-y-0.5">
                <div className="flex justify-between">
                  <span>গ্রস বিক্রয়:</span>
                  <span className="font-mono">৳{profitReport.grossSales}</span>
                </div>
                <div className="flex justify-between">
                  <span>ডিসকাউন্ট:</span>
                  <span className="font-mono text-rose-500">-৳{profitReport.salesDiscounts}</span>
                </div>
                <div className="flex justify-between">
                  <span>পণ্য ফেরত:</span>
                  <span className="font-mono text-rose-500">-৳{profitReport.totalReturnsRefunded}</span>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                মোট লাভ (Gross Profit)
              </span>
              <div className="text-3xl font-extrabold font-mono text-emerald-600 mt-2">
                ৳{profitReport.grossProfit.toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-400 mt-2 space-y-0.5">
                <div className="flex justify-between">
                  <span>বিক্রিত পণ্যের ক্রয়মূল্য (COGS):</span>
                  <span className="font-mono">৳{profitReport.costOfGoodsSold}</span>
                </div>
                <div className="flex justify-between font-bold text-emerald-600">
                  <span>গ্রস প্রফিট মার্জিন:</span>
                  <span className="font-mono">{profitReport.grossProfitMarginPercent}%</span>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                নিট মুনাফা (Net Profit)
              </span>
              <div className="text-3xl font-extrabold font-mono text-blue-600 mt-2">
                ৳{profitReport.netProfit.toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-400 mt-2 space-y-0.5">
                <div className="flex justify-between">
                  <span>দোকান খরচ (Expenses):</span>
                  <span className="font-mono text-rose-500">-৳{profitReport.totalExpenses}</span>
                </div>
                <div className="flex justify-between">
                  <span>টেলিকম কমিশন আয়:</span>
                  <span className="font-mono text-emerald-600">+৳{profitReport.telecomCommissionIncome}</span>
                </div>
                <div className="flex justify-between font-bold text-blue-600">
                  <span>নিট মার্জিন:</span>
                  <span className="font-mono">{profitReport.netProfitMarginPercent}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Expense Category Breakdown */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              পরিচালন ব্যয় বিশ্লেষণ (Expense Breakdown by Category)
            </h3>

            {Object.keys(profitReport.expenseBreakdownByCategory).length === 0 ? (
              <p className="text-xs text-slate-400">এই সময়কালে কোনো খরচের এন্ট্রি নেই।</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(profitReport.expenseBreakdownByCategory).map(([cat, amount]) => {
                  const share =
                    profitReport.totalExpenses > 0
                      ? Math.round((amount / profitReport.totalExpenses) * 100)
                      : 0;
                  return (
                    <div
                      key={cat}
                      className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between"
                    >
                      <div>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                          {cat}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          মোট ব্যয়ের {share}%
                        </span>
                      </div>
                      <span className="text-sm font-mono font-bold text-rose-600">
                        ৳{amount.toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB C: PRODUCTS & CATEGORIES */}
      {activeTab === 'products_categories' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  সর্বাধিক বিক্রিত পণ্য ও মুনাফা রেটিং
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  বিক্রয় ইউনিট ও রাজস্বের ভিত্তিতে ক্রমানুযায়ী সাজানো।
                </p>
              </div>
              <span className="text-xs font-mono font-semibold text-slate-500">
                {productReport.length} টি পণ্য
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">পণ্যের নাম</th>
                    <th className="py-3 px-4">SKU</th>
                    <th className="py-3 px-4">ক্যাটাগরি</th>
                    <th className="py-3 px-4 text-center">বিক্রি (ইউনিট)</th>
                    <th className="py-3 px-4 text-right">মোট বিক্রয় (৳)</th>
                    <th className="py-3 px-4 text-right">মুনাফা (৳)</th>
                    <th className="py-3 px-4 text-right">মার্জিন</th>
                    <th className="py-3 px-4 text-center">বর্তমান স্টক</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {productReport.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        কোনো পণ্য বিক্রয়ের রেকর্ড পাওয়া যায়নি।
                      </td>
                    </tr>
                  ) : (
                    productReport.map((item, idx) => (
                      <tr key={item.productId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] flex items-center justify-center font-mono text-slate-500">
                              {idx + 1}
                            </span>
                            <span>{item.productName}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-500">{item.sku}</td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{item.categoryName}</td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-slate-900 dark:text-slate-100">
                          {item.quantitySold}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                          ৳{item.totalRevenue.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                          ৳{item.profit.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-600 dark:text-slate-400">
                          {item.profitMarginPercent}%
                        </td>
                        <td className="py-3 px-4 text-center font-mono">
                          <span
                            className={
                              item.currentStock <= 5
                                ? 'text-rose-600 font-bold'
                                : 'text-slate-700 dark:text-slate-300'
                            }
                          >
                            {item.currentStock}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB D: INVENTORY & STOCK VALUATION */}
      {activeTab === 'inventory_stock' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 block">ইনভেন্টরি বাজার মূল্য</span>
              <div className="text-2xl font-bold font-mono text-emerald-600 mt-2">
                ৳{valuation.totalValuation.toLocaleString()}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                ক্রয়মূল্যে সংরক্ষিত মজুদ
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 block">মোট মজুদ পণ্য ইউনিট</span>
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-2">
                {valuation.totalStockUnits} টি
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                {valuation.totalItems} টি সক্রিয় SKU
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 block">গ্রাহক বাকি (Receivable)</span>
              <div className="text-2xl font-bold font-mono text-rose-600 mt-2">
                ৳{totalCustomerDue.toLocaleString()}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                {customers.length} জন গ্রাহকের কাছে পাওনা
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 block">সাপ্লায়ার দেনা (Payable)</span>
              <div className="text-2xl font-bold font-mono text-amber-600 mt-2">
                ৳{totalSupplierPayable.toLocaleString()}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                {suppliers.length} জন সরবরাহকারীর দেনা
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB E: EMPLOYEE PERFORMANCE REPORT */}
      {activeTab === 'employees' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  কর্মচারী বিক্রয় ও অবদান পারফরম্যান্স
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  প্রতিটি ক্যাশিয়ার ও ম্যানেজারের মেমো সংখ্যা, মোট ক্যাশ সংগ্রহ ও ডিসকাউন্ট হিসাব।
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">কর্মচারীর নাম</th>
                    <th className="py-3 px-4">পদবী (Role)</th>
                    <th className="py-3 px-4 text-center">বিক্রয় ইনভয়েস</th>
                    <th className="py-3 px-4 text-right">মোট রাজস্ব আদায় (৳)</th>
                    <th className="py-3 px-4 text-right">গড় মেমো ভ্যালু (৳)</th>
                    <th className="py-3 px-4 text-right">প্রদত্ত ডিসকাউন্ট (৳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {employeePerformance.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        কর্মচারীদের কোনো রেকর্ড পাওয়া যায়নি।
                      </td>
                    </tr>
                  ) : (
                    employeePerformance.map((emp) => (
                      <tr key={emp.employeeId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                          {emp.employeeName}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-slate-600 dark:text-slate-400">
                            {emp.role}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-slate-900 dark:text-slate-100">
                          {emp.totalSalesCount}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                          ৳{emp.totalRevenue.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-700 dark:text-slate-300">
                          ৳{emp.averageSaleValue.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-rose-600">
                          ৳{emp.totalDiscountGiven.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB F: TELECOM COMMISSION REPORT */}
      {activeTab === 'telecom' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-semibold text-slate-500">মোট রিচার্জ বুকিং</span>
              <div className="text-3xl font-extrabold font-mono text-slate-900 dark:text-slate-100 mt-2">
                ৳{telecomSummary.totalRechargeAmount.toLocaleString()}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                {telecomSummary.rechargeCount} টি লেনদেন সম্পন্ন
              </span>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                অর্জিত মোট কমিশন লাভ
              </span>
              <div className="text-3xl font-extrabold font-mono text-emerald-600 mt-2">
                ৳{telecomSummary.totalCommissionEarned.toLocaleString()}
              </div>
              <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold mt-1 block">
                দোকানের অতিরিক্ত নিট আয়
              </span>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                গড় কমিশন হার
              </span>
              <div className="text-3xl font-extrabold font-mono text-blue-600 mt-2">
                {telecomSummary.totalRechargeAmount > 0
                  ? Number(((telecomSummary.totalCommissionEarned / telecomSummary.totalRechargeAmount) * 100).toFixed(2))
                  : '2.8'}%
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                অপারেটর ভিত্তিক স্ট্যান্ডার্ড রেট
              </span>
            </div>
          </div>

          {/* Operator-wise Breakdown */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              অপারেটর ভিত্তিক রিচার্জ ও কমিশন বিশ্লেষণ
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {Object.entries(telecomSummary.operatorBreakdown).map(([op, data]) => (
                <div
                  key={op}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2"
                >
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    {op}
                  </span>
                  <div className="text-base font-bold font-mono text-slate-900 dark:text-slate-100">
                    ৳{data.amount.toLocaleString()}
                  </div>
                  <div className="text-[11px] flex justify-between text-slate-500 font-mono">
                    <span>কমিশন:</span>
                    <span className="text-emerald-600 font-bold">৳{data.commission}</span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {data.count} টি রিচার্জ
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
