/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ReportDatePreset =
  | 'TODAY'
  | 'YESTERDAY'
  | 'LAST_7_DAYS'
  | 'LAST_30_DAYS'
  | 'THIS_MONTH'
  | 'LAST_MONTH'
  | 'CUSTOM';

export type ReportTab =
  | 'sales'
  | 'profit_loss'
  | 'products_categories'
  | 'inventory_stock'
  | 'due_ledger'
  | 'cash_payments'
  | 'returns'
  | 'employees'
  | 'telecom';

export interface ReportFilterOptions {
  datePreset: ReportDatePreset;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  productId?: string;
  categoryId?: string;
  customerId?: string;
  supplierId?: string;
  employeeId?: string;
  paymentMethod?: string;
}

export interface SalesReportSummary {
  totalInvoices: number;
  grossSales: number;
  totalDiscounts: number;
  netSales: number;
  totalCashReceived: number;
  totalDueAmount: number;
  averageInvoiceValue: number;
  dailyData: Array<{
    date: string;
    invoicesCount: number;
    salesAmount: number;
    cashReceived: number;
    dueAmount: number;
  }>;
}

export interface ProfitLossReportSummary {
  grossSales: number;
  salesDiscounts: number;
  netSales: number;
  costOfGoodsSold: number;
  grossProfit: number;
  grossProfitMarginPercent: number;
  totalExpenses: number;
  expenseBreakdownByCategory: Record<string, number>;
  netProfit: number;
  netProfitMarginPercent: number;
  totalReturnsRefunded: number;
  telecomCommissionIncome: number;
}

export interface ProductSalesReportItem {
  productId: string;
  productName: string;
  sku: string;
  categoryName: string;
  quantitySold: number;
  totalRevenue: number;
  totalCost: number;
  profit: number;
  profitMarginPercent: number;
  currentStock: number;
}

export interface CategorySalesReportItem {
  categoryId: string;
  categoryName: string;
  itemsSoldCount: number;
  totalRevenue: number;
  totalCost: number;
  profit: number;
  revenuePercentage: number;
}
