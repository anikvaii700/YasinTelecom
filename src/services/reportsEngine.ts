/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CategorySalesReportItem,
  ProductSalesReportItem,
  ProfitLossReportSummary,
  ReportFilterOptions,
  SalesReportSummary,
} from '../types/reports';
import { Sale, SaleItem } from '../types/pos';
import { Expense } from '../types/finance';
import { Category, Product, Purchase } from '../types/inventory';
import { SalesReturn } from '../types/finance';
import { getTelecomSummary } from './specializedStorage';

const STORAGE_KEYS = {
  SALES: 'mosafa_pos_db_sales',
  SALE_ITEMS: 'mosafa_pos_db_sale_items',
  EXPENSES: 'mosafa_pos_db_expenses',
  PRODUCTS: 'mosafa_pos_db_products',
  CATEGORIES: 'mosafa_pos_db_categories',
  PURCHASES: 'mosafa_pos_db_purchases',
  SALES_RETURNS: 'mosafa_pos_db_sales_returns',
};

function getItem<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch {
    return defaultValue;
  }
}

// -----------------------------------------------------------------------------
// 1. DATE PRESET RESOLVER
// -----------------------------------------------------------------------------
export function resolveDateRange(preset: ReportFilterOptions['datePreset']): {
  startDate: string;
  endDate: string;
} {
  const now = new Date();
  const format = (d: Date) => d.toISOString().slice(0, 10);

  const todayStr = format(now);

  if (preset === 'TODAY') {
    return { startDate: todayStr, endDate: todayStr };
  }

  if (preset === 'YESTERDAY') {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = format(yesterday);
    return { startDate: yStr, endDate: yStr };
  }

  if (preset === 'LAST_7_DAYS') {
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    return { startDate: format(d), endDate: todayStr };
  }

  if (preset === 'LAST_30_DAYS') {
    const d = new Date(now);
    d.setDate(d.getDate() - 29);
    return { startDate: format(d), endDate: todayStr };
  }

  if (preset === 'THIS_MONTH') {
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    return { startDate: format(firstDay), endDate: todayStr };
  }

  if (preset === 'LAST_MONTH') {
    const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
    return { startDate: format(firstDay), endDate: format(lastDay) };
  }

  return { startDate: todayStr, endDate: todayStr };
}

// -----------------------------------------------------------------------------
// 2. SALES REPORT GENERATOR
// -----------------------------------------------------------------------------
export function generateSalesReport(
  shopId: string,
  filters: ReportFilterOptions
): SalesReportSummary {
  const allSales = getItem<Sale[]>(STORAGE_KEYS.SALES, []);

  const filtered = allSales.filter((s) => {
    if (s.shopId !== shopId || s.status === 'CANCELLED') return false;
    const dateStr = s.createdAt.slice(0, 10);
    if (filters.startDate && dateStr < filters.startDate) return false;
    if (filters.endDate && dateStr > filters.endDate) return false;
    if (filters.customerId && s.customerId !== filters.customerId) return false;
    if (filters.paymentMethod && s.paymentMethod !== filters.paymentMethod) return false;
    if (filters.employeeId && s.cashierId !== filters.employeeId) return false;
    return true;
  });

  let grossSales = 0;
  let totalDiscounts = 0;
  let netSales = 0;
  let totalCashReceived = 0;
  let totalDueAmount = 0;

  const dailyMap: Record<
    string,
    { invoicesCount: number; salesAmount: number; cashReceived: number; dueAmount: number }
  > = {};

  for (const s of filtered) {
    const rawSubtotal = s.subtotal + (s.shippingCharge || 0) + (s.vatAmount || 0);
    const discounts = s.cartDiscount + (s.itemDiscountsTotal || 0);
    grossSales += rawSubtotal;
    totalDiscounts += discounts;
    netSales += s.grandTotal;
    totalCashReceived += s.paidAmount;
    totalDueAmount += s.dueAmount;

    const dateKey = s.createdAt.slice(0, 10);
    if (!dailyMap[dateKey]) {
      dailyMap[dateKey] = { invoicesCount: 0, salesAmount: 0, cashReceived: 0, dueAmount: 0 };
    }
    dailyMap[dateKey].invoicesCount += 1;
    dailyMap[dateKey].salesAmount += s.grandTotal;
    dailyMap[dateKey].cashReceived += s.paidAmount;
    dailyMap[dateKey].dueAmount += s.dueAmount;
  }

  const dailyData = Object.keys(dailyMap)
    .sort()
    .map((date) => ({
      date,
      invoicesCount: dailyMap[date].invoicesCount,
      salesAmount: Number(dailyMap[date].salesAmount.toFixed(2)),
      cashReceived: Number(dailyMap[date].cashReceived.toFixed(2)),
      dueAmount: Number(dailyMap[date].dueAmount.toFixed(2)),
    }));

  const totalInvoices = filtered.length;
  const averageInvoiceValue =
    totalInvoices > 0 ? Number((netSales / totalInvoices).toFixed(2)) : 0;

  return {
    totalInvoices,
    grossSales: Number(grossSales.toFixed(2)),
    totalDiscounts: Number(totalDiscounts.toFixed(2)),
    netSales: Number(netSales.toFixed(2)),
    totalCashReceived: Number(totalCashReceived.toFixed(2)),
    totalDueAmount: Number(totalDueAmount.toFixed(2)),
    averageInvoiceValue,
    dailyData,
  };
}

// -----------------------------------------------------------------------------
// 3. PROFIT & LOSS REPORT GENERATOR
// -----------------------------------------------------------------------------
export function generateProfitLossReport(
  shopId: string,
  filters: ReportFilterOptions
): ProfitLossReportSummary {
  const allSales = getItem<Sale[]>(STORAGE_KEYS.SALES, []);
  const allExpenses = getItem<Expense[]>(STORAGE_KEYS.EXPENSES, []);
  const allReturns = getItem<SalesReturn[]>(STORAGE_KEYS.SALES_RETURNS, []);

  const filteredSales = allSales.filter((s) => {
    if (s.shopId !== shopId || s.status === 'CANCELLED') return false;
    const dateStr = s.createdAt.slice(0, 10);
    if (filters.startDate && dateStr < filters.startDate) return false;
    if (filters.endDate && dateStr > filters.endDate) return false;
    return true;
  });

  const filteredExpenses = allExpenses.filter((e) => {
    if (e.shopId !== shopId) return false;
    if (filters.startDate && e.date < filters.startDate) return false;
    if (filters.endDate && e.date > filters.endDate) return false;
    return true;
  });

  const filteredReturns = allReturns.filter((r) => {
    if (r.shopId !== shopId) return false;
    const dateStr = r.createdAt.slice(0, 10);
    if (filters.startDate && dateStr < filters.startDate) return false;
    if (filters.endDate && dateStr > filters.endDate) return false;
    return true;
  });

  let grossSales = 0;
  let salesDiscounts = 0;
  let costOfGoodsSold = 0;

  for (const s of filteredSales) {
    grossSales += s.subtotal + (s.shippingCharge || 0) + (s.vatAmount || 0);
    salesDiscounts += s.cartDiscount + (s.itemDiscountsTotal || 0);
    costOfGoodsSold += s.totalCost || 0;
  }

  const totalReturnsRefunded = filteredReturns.reduce(
    (sum, r) => sum + (r.totalRefundAmount || 0),
    0
  );

  const expenseBreakdownByCategory: Record<string, number> = {};
  let totalExpenses = 0;

  for (const e of filteredExpenses) {
    totalExpenses += e.amount;
    expenseBreakdownByCategory[e.category] =
      (expenseBreakdownByCategory[e.category] || 0) + e.amount;
  }

  // Telecom commission income
  const telecomSummary = getTelecomSummary(shopId, filters.startDate, filters.endDate);
  const telecomCommissionIncome = telecomSummary.totalCommissionEarned;

  const netSales = Math.max(0, grossSales - salesDiscounts - totalReturnsRefunded);
  const grossProfit = Number((netSales - costOfGoodsSold).toFixed(2));
  const grossProfitMarginPercent =
    netSales > 0 ? Number(((grossProfit / netSales) * 100).toFixed(2)) : 0;

  const netProfit = Number((grossProfit + telecomCommissionIncome - totalExpenses).toFixed(2));
  const netProfitMarginPercent =
    netSales > 0 ? Number(((netProfit / netSales) * 100).toFixed(2)) : 0;

  return {
    grossSales: Number(grossSales.toFixed(2)),
    salesDiscounts: Number(salesDiscounts.toFixed(2)),
    netSales: Number(netSales.toFixed(2)),
    costOfGoodsSold: Number(costOfGoodsSold.toFixed(2)),
    grossProfit,
    grossProfitMarginPercent,
    totalExpenses: Number(totalExpenses.toFixed(2)),
    expenseBreakdownByCategory,
    netProfit,
    netProfitMarginPercent,
    totalReturnsRefunded: Number(totalReturnsRefunded.toFixed(2)),
    telecomCommissionIncome: Number(telecomCommissionIncome.toFixed(2)),
  };
}

// -----------------------------------------------------------------------------
// 4. PRODUCT & CATEGORY SALES REPORT
// -----------------------------------------------------------------------------
export function generateProductSalesReport(
  shopId: string,
  filters: ReportFilterOptions
): ProductSalesReportItem[] {
  const allSales = getItem<Sale[]>(STORAGE_KEYS.SALES, []);
  const allSaleItems = getItem<SaleItem[]>(STORAGE_KEYS.SALE_ITEMS, []);
  const allProducts = getItem<Product[]>(STORAGE_KEYS.PRODUCTS, []).filter((p) => p.shopId === shopId);
  const allCategories = getItem<Category[]>(STORAGE_KEYS.CATEGORIES, []).filter((c) => c.shopId === shopId);

  const catMap = new Map(allCategories.map((c) => [c.id, c.nameBn]));
  const prodMap = new Map(allProducts.map((p) => [p.id, p]));

  // Eligible sale IDs
  const validSaleIds = new Set(
    allSales
      .filter((s) => {
        if (s.shopId !== shopId || s.status === 'CANCELLED') return false;
        const dateStr = s.createdAt.slice(0, 10);
        if (filters.startDate && dateStr < filters.startDate) return false;
        if (filters.endDate && dateStr > filters.endDate) return false;
        return true;
      })
      .map((s) => s.id)
  );

  const productAgg: Record<
    string,
    { quantitySold: number; totalRevenue: number; totalCost: number }
  > = {};

  for (const item of allSaleItems) {
    if (!validSaleIds.has(item.saleId)) continue;
    if (filters.productId && item.productId !== filters.productId) continue;

    if (!productAgg[item.productId]) {
      productAgg[item.productId] = { quantitySold: 0, totalRevenue: 0, totalCost: 0 };
    }
    productAgg[item.productId].quantitySold += item.quantity;
    productAgg[item.productId].totalRevenue += item.total;
    productAgg[item.productId].totalCost += (item.costPrice || 0) * item.quantity;
  }

  const results: ProductSalesReportItem[] = [];

  for (const [prodId, data] of Object.entries(productAgg)) {
    const prod = prodMap.get(prodId);
    const catName = (prod?.categoryId && catMap.get(prod.categoryId)) || 'অন্যান্য';
    const profit = Number((data.totalRevenue - data.totalCost).toFixed(2));
    const profitMarginPercent =
      data.totalRevenue > 0 ? Number(((profit / data.totalRevenue) * 100).toFixed(2)) : 0;

    results.push({
      productId: prodId,
      productName: prod?.nameBn || itemTitleFallback(prodId, allSaleItems),
      sku: prod?.sku || 'N/A',
      categoryName: catName,
      quantitySold: data.quantitySold,
      totalRevenue: Number(data.totalRevenue.toFixed(2)),
      totalCost: Number(data.totalCost.toFixed(2)),
      profit,
      profitMarginPercent,
      currentStock: prod?.currentStock || 0,
    });
  }

  return results.sort((a, b) => b.totalRevenue - a.totalRevenue);
}

function itemTitleFallback(productId: string, items: SaleItem[]): string {
  const match = items.find((i) => i.productId === productId);
  return match?.productNameBn || 'অজ্ঞাত পণ্য';
}

export function generateCategorySalesReport(
  shopId: string,
  filters: ReportFilterOptions
): CategorySalesReportItem[] {
  const productReport = generateProductSalesReport(shopId, filters);
  const allCategories = getItem<Category[]>(STORAGE_KEYS.CATEGORIES, []).filter((c) => c.shopId === shopId);
  const catNameMap = new Map(allCategories.map((c) => [c.id, c.nameBn]));

  const totalStoreRevenue = productReport.reduce((sum, p) => sum + p.totalRevenue, 0);

  const catAgg: Record<
    string,
    { categoryName: string; itemsSoldCount: number; totalRevenue: number; totalCost: number }
  > = {};

  for (const p of productReport) {
    const catName = p.categoryName || 'সাধারণ';
    if (!catAgg[catName]) {
      catAgg[catName] = { categoryName: catName, itemsSoldCount: 0, totalRevenue: 0, totalCost: 0 };
    }
    catAgg[catName].itemsSoldCount += p.quantitySold;
    catAgg[catName].totalRevenue += p.totalRevenue;
    catAgg[catName].totalCost += p.totalCost;
  }

  return Object.values(catAgg)
    .map((data) => {
      const profit = Number((data.totalRevenue - data.totalCost).toFixed(2));
      const revenuePercentage =
        totalStoreRevenue > 0
          ? Number(((data.totalRevenue / totalStoreRevenue) * 100).toFixed(1))
          : 0;

      return {
        categoryId: data.categoryName,
        categoryName: data.categoryName,
        itemsSoldCount: data.itemsSoldCount,
        totalRevenue: Number(data.totalRevenue.toFixed(2)),
        totalCost: Number(data.totalCost.toFixed(2)),
        profit,
        revenuePercentage,
      };
    })
    .sort((a, b) => b.totalRevenue - a.totalRevenue);
}

// -----------------------------------------------------------------------------
// 5. EXPORT UTILITIES (CSV, EXCEL, PRINT)
// -----------------------------------------------------------------------------
export function exportToCsv(filename: string, headers: string[], rows: (string | number)[][]): void {
  const escapeCsv = (val: string | number) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvContent =
    '\uFEFF' + // UTF-8 BOM for Excel Bengali character rendering
    [headers.map(escapeCsv).join(','), ...rows.map((row) => row.map(escapeCsv).join(','))].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportToExcel(filename: string, headers: string[], rows: (string | number)[][]): void {
  // Generates XML-based / TSV format easily readable by Microsoft Excel and Google Sheets
  const escapeTsv = (val: string | number) => String(val ?? '').replace(/\t/g, ' ');

  const content =
    '\uFEFF' +
    [headers.map(escapeTsv).join('\t'), ...rows.map((row) => row.map(escapeTsv).join('\t'))].join('\n');

  const blob = new Blob([content], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
