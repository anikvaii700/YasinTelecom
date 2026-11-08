/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { POSPaymentMethod } from './pos';

export type CashAccountType = 'CASH' | 'BANK' | 'BKASH' | 'NAGAD' | 'ROCKET' | 'OTHER';

export interface CashAccount {
  id: string;
  shopId: string;
  name: string;
  type: CashAccountType;
  accountNumber?: string;
  currentBalance: number;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CashTransactionType =
  | 'OPENING_BALANCE'
  | 'SALES_RECEIPT'
  | 'CUSTOMER_PAYMENT'
  | 'PURCHASE_PAYMENT'
  | 'SUPPLIER_PAYMENT'
  | 'EXPENSE'
  | 'REFUND'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT';

export interface CashTransaction {
  id: string;
  shopId: string;
  accountId: string;
  accountName: string;
  transactionType: CashTransactionType;
  amount: number; // Positive number
  balanceAfter: number;
  relatedId?: string; // saleId, purchaseId, customerPaymentId, expenseId, returnId, etc.
  invoiceNumber?: string;
  transferAccountId?: string; // For transfers
  reference?: string;
  notes?: string;
  actorId?: string;
  createdAt: string;
}

export type ExpenseCategory =
  | 'Rent'
  | 'Electricity'
  | 'Internet'
  | 'Salary'
  | 'Transport'
  | 'Maintenance'
  | 'Packaging'
  | 'Marketing'
  | 'Other';

export interface Expense {
  id: string;
  shopId: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  date: string; // YYYY-MM-DD
  paymentAccountId: string;
  paymentAccountName: string;
  paymentMethod: string;
  reference?: string;
  notes?: string;
  attachmentUrl?: string;
  actorId?: string;
  createdAt: string;
}

export type CustomerLedgerEntryType =
  | 'SALE_INVOICE'
  | 'DUE_COLLECTION'
  | 'SALES_RETURN'
  | 'OPENING_BALANCE'
  | 'ADJUSTMENT';

export interface CustomerLedgerEntry {
  id: string;
  shopId: string;
  customerId: string;
  entryType: CustomerLedgerEntryType;
  debit: number; // Increases receivable (e.g. Due sale)
  credit: number; // Decreases receivable (e.g. Payment collected or Return credit)
  balanceAfter: number;
  referenceId?: string;
  invoiceNumber?: string;
  notes?: string;
  createdAt: string;
}

export interface SalesReturnItem {
  id: string;
  returnId: string;
  saleItemId: string;
  productId: string;
  productNameBn: string;
  quantity: number;
  unitPrice: number;
  refundAmount: number;
  condition: 'RESTOCKABLE' | 'DAMAGED';
}

export interface SalesReturn {
  id: string;
  shopId: string;
  saleId: string;
  invoiceNumber: string;
  returnInvoiceNumber: string;
  customerId?: string | null;
  customerName?: string;
  returnType: 'REFUND' | 'EXCHANGE' | 'STORE_CREDIT';
  refundMethod?: POSPaymentMethod;
  refundAccountId?: string;
  totalRefundAmount: number;
  reason: string;
  notes?: string;
  actorId?: string;
  items: SalesReturnItem[];
  createdAt: string;
}

export interface DailyCashClosing {
  id: string;
  shopId: string;
  date: string; // YYYY-MM-DD
  openedAt: string;
  closedAt?: string;
  openingCash: number;
  totalCashSales: number;
  totalCustomerDueCollected: number;
  totalCashExpenses: number;
  totalCashSupplierPayments: number;
  totalCashRefunds: number;
  expectedCash: number;
  actualCash: number;
  difference: number; // actualCash - expectedCash
  status: 'OPEN' | 'CLOSED';
  closedBy?: string;
  notes?: string;
}

export interface InvoiceConfig {
  prefix: string; // e.g., 'MS' or 'INV'
  format: 'PREFIX-YEAR-SEQ' | 'PREFIX-SEQ'; // 'MS-2026-000001' or 'MS-000001'
  currentSequence: number;
  padding: number; // e.g. 6 digits
}

export interface FinancialSummary {
  grossSales: number;
  salesDiscounts: number;
  netSales: number;
  costOfGoodsSold: number;
  grossProfit: number;
  grossProfitMarginPercent: number;
  totalExpenses: number;
  netProfit: number;
  netProfitMarginPercent: number;
  totalCashReceived: number;
  totalDueReceivable: number;
  totalReturnsRefunded: number;
}
