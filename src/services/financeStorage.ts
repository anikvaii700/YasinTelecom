/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CashAccount,
  CashTransaction,
  CustomerLedgerEntry,
  DailyCashClosing,
  Expense,
  ExpenseCategory,
  FinancialSummary,
  InvoiceConfig,
  SalesReturn,
  SalesReturnItem,
} from '../types/finance';
import { Customer } from '../types/inventory';
import { POSPaymentMethod, Sale, SaleItem, SplitPaymentDetail } from '../types/pos';
import { recordStockMovement } from './inventoryStorage';
import { addAuditLog } from './storage';

const STORAGE_KEYS = {
  CASH_ACCOUNTS: 'mosafa_pos_db_cash_accounts',
  CASH_TRANSACTIONS: 'mosafa_pos_db_cash_transactions',
  EXPENSES: 'mosafa_pos_db_expenses',
  CUSTOMER_LEDGER: 'mosafa_pos_db_customer_ledger',
  SALES_RETURNS: 'mosafa_pos_db_sales_returns',
  SALES_RETURN_ITEMS: 'mosafa_pos_db_sales_return_items',
  DAILY_CLOSINGS: 'mosafa_pos_db_daily_closings',
  INVOICE_CONFIGS: 'mosafa_pos_db_invoice_configs',
  SALES: 'mosafa_pos_db_sales',
  SALE_ITEMS: 'mosafa_pos_db_sale_items',
  CUSTOMERS: 'mosafa_pos_db_customers',
  PRODUCTS: 'mosafa_pos_db_products',
  PROCESSED_IDEMPOTENCY_KEYS: 'mosafa_pos_db_processed_idempotency_keys',
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
// 1. INITIAL DEMO FINANCE DATA
// -----------------------------------------------------------------------------
export function initializeShopFinanceDefaults(shopId: string, shopCode = 'MSF'): void {
  const existingAccounts = getCashAccountsByShop(shopId);
  if (existingAccounts.length > 0) return;

  const now = new Date().toISOString();

  // 1. Initial Standard Bangladesh Payment & Cash Accounts
  const accCash: CashAccount = {
    id: crypto.randomUUID(),
    shopId,
    name: 'ক্যাশ ইন হ্যান্ড (Cash in Hand)',
    type: 'CASH',
    accountNumber: 'CASH-DRAWER',
    currentBalance: 8500, // Initial cash float
    isDefault: true,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  const accBkash: CashAccount = {
    id: crypto.randomUUID(),
    shopId,
    name: 'বিকাশ মার্চেন্ট (bKash Merchant)',
    type: 'BKASH',
    accountNumber: '01712-345678',
    currentBalance: 14200,
    isDefault: false,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  const accNagad: CashAccount = {
    id: crypto.randomUUID(),
    shopId,
    name: 'নগদ ওয়ালেট (Nagad)',
    type: 'NAGAD',
    accountNumber: '01812-987654',
    currentBalance: 6400,
    isDefault: false,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  const accBank: CashAccount = {
    id: crypto.randomUUID(),
    shopId,
    name: 'ইসলামী ব্যাংক বাংলাদেশ (IBBL)',
    type: 'BANK',
    accountNumber: '2050114020089',
    currentBalance: 45000,
    isDefault: false,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  const accRocket: CashAccount = {
    id: crypto.randomUUID(),
    shopId,
    name: 'রকেট ওয়ালেট (Rocket)',
    type: 'ROCKET',
    accountNumber: '01912-334455-9',
    currentBalance: 3200,
    isDefault: false,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  const allAccounts = getItem<CashAccount[]>(STORAGE_KEYS.CASH_ACCOUNTS, []);
  allAccounts.push(accCash, accBkash, accNagad, accBank, accRocket);
  setItem(STORAGE_KEYS.CASH_ACCOUNTS, allAccounts);

  // Initial Opening Balance Transactions
  const allTx = getItem<CashTransaction[]>(STORAGE_KEYS.CASH_TRANSACTIONS, []);
  [accCash, accBkash, accNagad, accBank, accRocket].forEach((acc) => {
    allTx.push({
      id: crypto.randomUUID(),
      shopId,
      accountId: acc.id,
      accountName: acc.name,
      transactionType: 'OPENING_BALANCE',
      amount: acc.currentBalance,
      balanceAfter: acc.currentBalance,
      notes: 'প্রারম্ভিক ব্যালেন্স সেটআপ',
      createdAt: now,
    });
  });
  setItem(STORAGE_KEYS.CASH_TRANSACTIONS, allTx);

  // 2. Initial Sample Expenses
  const today = new Date().toISOString().split('T')[0];
  const sampleExpenses: Expense[] = [
    {
      id: crypto.randomUUID(),
      shopId,
      category: 'Electricity',
      description: 'দোকানের মাসিক বিদ্যুৎ বিল পরিশোধ',
      amount: 1450,
      date: today,
      paymentAccountId: accCash.id,
      paymentAccountName: accCash.name,
      paymentMethod: 'Cash',
      reference: 'DESCO-FEB-26',
      notes: 'মিটার নং: ৫৪২১০৯',
      createdAt: now,
    },
    {
      id: crypto.randomUUID(),
      shopId,
      category: 'Internet',
      description: 'হাইস্পিড অপটিক্যাল ফাইবার ব্রডব্যান্ড বিল',
      amount: 800,
      date: today,
      paymentAccountId: accBkash.id,
      paymentAccountName: accBkash.name,
      paymentMethod: 'bKash',
      reference: 'BKASH-TRX-9981',
      notes: 'মার্চ মাসের ইন্টারনেট বিল',
      createdAt: now,
    },
  ];

  const allExpenses = getItem<Expense[]>(STORAGE_KEYS.EXPENSES, []);
  allExpenses.push(...sampleExpenses);
  setItem(STORAGE_KEYS.EXPENSES, allExpenses);

  // Deduct from accounts
  accCash.currentBalance -= 1450;
  accBkash.currentBalance -= 800;
  setItem(STORAGE_KEYS.CASH_ACCOUNTS, allAccounts);

  // Record Expense Transactions
  allTx.push(
    {
      id: crypto.randomUUID(),
      shopId,
      accountId: accCash.id,
      accountName: accCash.name,
      transactionType: 'EXPENSE',
      amount: 1450,
      balanceAfter: accCash.currentBalance,
      reference: 'DESCO-FEB-26',
      notes: 'দোকানের মাসিক বিদ্যুৎ বিল পরিশোধ',
      createdAt: now,
    },
    {
      id: crypto.randomUUID(),
      shopId,
      accountId: accBkash.id,
      accountName: accBkash.name,
      transactionType: 'EXPENSE',
      amount: 800,
      balanceAfter: accBkash.currentBalance,
      reference: 'BKASH-TRX-9981',
      notes: 'হাইস্পিড অপটিক্যাল ফাইবার ব্রডব্যান্ড বিল',
      createdAt: now,
    }
  );
  setItem(STORAGE_KEYS.CASH_TRANSACTIONS, allTx);

  // 3. Initial Invoice Config
  const prefix = shopCode ? shopCode.replace(/[^A-Za-z0-9]/g, '').slice(0, 4).toUpperCase() : 'MS';
  const config: InvoiceConfig = {
    prefix: prefix || 'MS',
    format: 'PREFIX-YEAR-SEQ',
    currentSequence: 101,
    padding: 6,
  };
  saveInvoiceConfig(shopId, config);
}

// -----------------------------------------------------------------------------
// 2. INVOICE CONFIGURATION & ATOMIC GENERATOR
// -----------------------------------------------------------------------------
export function getInvoiceConfig(shopId: string): InvoiceConfig {
  const allConfigs = getItem<Record<string, InvoiceConfig>>(STORAGE_KEYS.INVOICE_CONFIGS, {});
  return (
    allConfigs[shopId] || {
      prefix: 'MS',
      format: 'PREFIX-YEAR-SEQ',
      currentSequence: 101,
      padding: 6,
    }
  );
}

export function saveInvoiceConfig(shopId: string, config: InvoiceConfig): InvoiceConfig {
  const allConfigs = getItem<Record<string, InvoiceConfig>>(STORAGE_KEYS.INVOICE_CONFIGS, {});
  allConfigs[shopId] = config;
  setItem(STORAGE_KEYS.INVOICE_CONFIGS, allConfigs);
  return config;
}

/**
 * Generates the next sequential unique invoice number for a shop
 * e.g., MS-2026-000101
 */
export function generateNextInvoiceNumber(shopId: string): string {
  const config = getInvoiceConfig(shopId);
  const currentYear = new Date().getFullYear();
  const allSales = getItem<Sale[]>(STORAGE_KEYS.SALES, []).filter((s) => s.shopId === shopId);

  let seq = config.currentSequence;
  let candidate = '';
  let isUnique = false;

  // Collision prevention loop
  while (!isUnique) {
    const padded = String(seq).padStart(config.padding || 6, '0');
    if (config.format === 'PREFIX-YEAR-SEQ') {
      candidate = `${config.prefix}-${currentYear}-${padded}`;
    } else {
      candidate = `${config.prefix}-${padded}`;
    }

    const collision = allSales.some((s) => s.invoiceNumber === candidate);
    if (!collision) {
      isUnique = true;
    } else {
      seq++;
    }
  }

  // Update sequence for next transaction
  config.currentSequence = seq + 1;
  saveInvoiceConfig(shopId, config);

  return candidate;
}

// -----------------------------------------------------------------------------
// 3. CASH & PAYMENT ACCOUNTS
// -----------------------------------------------------------------------------
export function getCashAccountsByShop(shopId: string): CashAccount[] {
  const all = getItem<CashAccount[]>(STORAGE_KEYS.CASH_ACCOUNTS, []);
  return all.filter((a) => a.shopId === shopId && a.isActive);
}

export function getCashAccountById(id: string, shopId: string): CashAccount | null {
  const all = getItem<CashAccount[]>(STORAGE_KEYS.CASH_ACCOUNTS, []);
  return all.find((a) => a.id === id && a.shopId === shopId) || null;
}

export function saveCashAccount(
  account: Omit<CashAccount, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): CashAccount {
  const all = getItem<CashAccount[]>(STORAGE_KEYS.CASH_ACCOUNTS, []);
  const now = new Date().toISOString();

  if (account.id) {
    const idx = all.findIndex((a) => a.id === account.id && a.shopId === account.shopId);
    if (idx === -1) throw new Error('Account not found');
    const updated: CashAccount = {
      ...all[idx],
      ...account,
      updatedAt: now,
    };
    all[idx] = updated;
    setItem(STORAGE_KEYS.CASH_ACCOUNTS, all);
    return updated;
  } else {
    const created: CashAccount = {
      ...account,
      id: crypto.randomUUID(),
      currentBalance: Number(account.currentBalance) || 0,
      createdAt: now,
      updatedAt: now,
    };
    all.push(created);
    setItem(STORAGE_KEYS.CASH_ACCOUNTS, all);

    // Initial opening transaction
    if (created.currentBalance > 0) {
      recordCashTransaction({
        shopId: created.shopId,
        accountId: created.id,
        accountName: created.name,
        transactionType: 'OPENING_BALANCE',
        amount: created.currentBalance,
        balanceAfter: created.currentBalance,
        notes: 'নতুন অ্যাকাউন্ট খোলার প্রারম্ভিক জমা',
      });
    }

    return created;
  }
}

// -----------------------------------------------------------------------------
// 4. CASH TRANSACTIONS (CASHBOOK ENGINE)
// -----------------------------------------------------------------------------
export function recordCashTransaction(
  tx: Omit<CashTransaction, 'id' | 'createdAt'>
): CashTransaction {
  const allTx = getItem<CashTransaction[]>(STORAGE_KEYS.CASH_TRANSACTIONS, []);
  const entry: CashTransaction = {
    ...tx,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };

  allTx.unshift(entry);
  if (allTx.length > 2000) allTx.length = 2000;
  setItem(STORAGE_KEYS.CASH_TRANSACTIONS, allTx);
  return entry;
}

export function getCashTransactionsByShop(
  shopId: string,
  accountId?: string,
  date?: string
): CashTransaction[] {
  const all = getItem<CashTransaction[]>(STORAGE_KEYS.CASH_TRANSACTIONS, []);
  return all.filter((t) => {
    if (t.shopId !== shopId) return false;
    if (accountId && t.accountId !== accountId) return false;
    if (date && !t.createdAt.startsWith(date)) return false;
    return true;
  });
}

/**
 * Transfers funds between two accounts (Internal Transfer)
 * Does NOT count as sales, income or expense!
 */
export function transferBetweenAccounts(params: {
  shopId: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  reference?: string;
  notes?: string;
  actorId?: string;
}): { fromAccount: CashAccount; toAccount: CashAccount } {
  if (params.fromAccountId === params.toAccountId) {
    throw new Error('একই অ্যাকাউন্টে ট্রান্সফার সম্ভব নয়।');
  }
  if (params.amount <= 0) {
    throw new Error('ট্রান্সফার পরিমাণ ০ টাকার বেশি হতে হবে।');
  }

  const allAccounts = getItem<CashAccount[]>(STORAGE_KEYS.CASH_ACCOUNTS, []);
  const fromIdx = allAccounts.findIndex(
    (a) => a.id === params.fromAccountId && a.shopId === params.shopId
  );
  const toIdx = allAccounts.findIndex(
    (a) => a.id === params.toAccountId && a.shopId === params.shopId
  );

  if (fromIdx === -1 || toIdx === -1) {
    throw new Error('অ্যাকাউন্ট খুঁজে পাওয়া যায়নি।');
  }

  const fromAcc = allAccounts[fromIdx];
  const toAcc = allAccounts[toIdx];

  fromAcc.currentBalance -= params.amount;
  toAcc.currentBalance += params.amount;
  const now = new Date().toISOString();
  fromAcc.updatedAt = now;
  toAcc.updatedAt = now;

  allAccounts[fromIdx] = fromAcc;
  allAccounts[toIdx] = toAcc;
  setItem(STORAGE_KEYS.CASH_ACCOUNTS, allAccounts);

  // Record TRANSFER_OUT
  recordCashTransaction({
    shopId: params.shopId,
    accountId: fromAcc.id,
    accountName: fromAcc.name,
    transactionType: 'TRANSFER_OUT',
    amount: params.amount,
    balanceAfter: fromAcc.currentBalance,
    transferAccountId: toAcc.id,
    reference: params.reference,
    notes: `ট্রান্সফার প্রেরণ: ${toAcc.name} (${params.notes || 'অভ্যন্তরীণ স্থানান্তর'})`,
    actorId: params.actorId,
  });

  // Record TRANSFER_IN
  recordCashTransaction({
    shopId: params.shopId,
    accountId: toAcc.id,
    accountName: toAcc.name,
    transactionType: 'TRANSFER_IN',
    amount: params.amount,
    balanceAfter: toAcc.currentBalance,
    transferAccountId: fromAcc.id,
    reference: params.reference,
    notes: `ট্রান্সফার গ্রহণ: ${fromAcc.name} থেকে (${params.notes || 'অভ্যন্তরীণ স্থানান্তর'})`,
    actorId: params.actorId,
  });

  addAuditLog({
    shopId: params.shopId,
    actorId: params.actorId,
    action: 'SHOP_UPDATED',
    details: {
      action: 'ACCOUNT_TRANSFER',
      from: fromAcc.name,
      to: toAcc.name,
      amount: params.amount,
    },
  });

  return { fromAccount: fromAcc, toAccount: toAcc };
}

// -----------------------------------------------------------------------------
// 5. EXPENSE MANAGEMENT
// -----------------------------------------------------------------------------
export function getExpensesByShop(shopId: string, category?: string): Expense[] {
  const all = getItem<Expense[]>(STORAGE_KEYS.EXPENSES, []);
  return all.filter((e) => e.shopId === shopId && (!category || e.category === category));
}

export function recordExpense(params: {
  shopId: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  date: string;
  paymentAccountId: string;
  reference?: string;
  notes?: string;
  attachmentUrl?: string;
  actorId?: string;
}): Expense {
  if (params.amount <= 0) {
    throw new Error('খরচের পরিমাণ সঠিক নয়।');
  }

  const allAccounts = getItem<CashAccount[]>(STORAGE_KEYS.CASH_ACCOUNTS, []);
  const accIdx = allAccounts.findIndex(
    (a) => a.id === params.paymentAccountId && a.shopId === params.shopId
  );
  if (accIdx === -1) throw new Error('পেমেন্ট অ্যাকাউন্ট পাওয়া যায়নি।');

  const acc = allAccounts[accIdx];
  acc.currentBalance -= params.amount;
  acc.updatedAt = new Date().toISOString();
  allAccounts[accIdx] = acc;
  setItem(STORAGE_KEYS.CASH_ACCOUNTS, allAccounts);

  const expenseId = crypto.randomUUID();
  const newExpense: Expense = {
    ...params,
    id: expenseId,
    paymentAccountName: acc.name,
    paymentMethod: acc.type,
    createdAt: new Date().toISOString(),
  };

  const allExpenses = getItem<Expense[]>(STORAGE_KEYS.EXPENSES, []);
  allExpenses.unshift(newExpense);
  setItem(STORAGE_KEYS.EXPENSES, allExpenses);

  // Record cash transaction for expense
  recordCashTransaction({
    shopId: params.shopId,
    accountId: acc.id,
    accountName: acc.name,
    transactionType: 'EXPENSE',
    amount: params.amount,
    balanceAfter: acc.currentBalance,
    relatedId: expenseId,
    reference: params.reference,
    notes: `${params.category}: ${params.description}`,
    actorId: params.actorId,
  });

  addAuditLog({
    shopId: params.shopId,
    actorId: params.actorId,
    action: 'SHOP_UPDATED',
    details: {
      action: 'EXPENSE_RECORDED',
      category: params.category,
      amount: params.amount,
      description: params.description,
    },
  });

  return newExpense;
}

// -----------------------------------------------------------------------------
// 6. CUSTOMER LEDGER & DUE COLLECTION
// -----------------------------------------------------------------------------
export function getCustomerLedger(shopId: string, customerId: string): CustomerLedgerEntry[] {
  const all = getItem<CustomerLedgerEntry[]>(STORAGE_KEYS.CUSTOMER_LEDGER, []);
  return all
    .filter((l) => l.shopId === shopId && l.customerId === customerId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export function recordCustomerLedgerEntry(
  entry: Omit<CustomerLedgerEntry, 'id' | 'createdAt'>
): CustomerLedgerEntry {
  const all = getItem<CustomerLedgerEntry[]>(STORAGE_KEYS.CUSTOMER_LEDGER, []);
  const newEntry: CustomerLedgerEntry = {
    ...entry,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  all.push(newEntry);
  setItem(STORAGE_KEYS.CUSTOMER_LEDGER, all);
  return newEntry;
}

/**
 * Collects Customer Due and deposits directly into a chosen Cash/MFS account
 * Unpaid due is NEVER counted as cash received!
 */
export function recordCustomerDuePayment(params: {
  shopId: string;
  customerId: string;
  amount: number;
  paymentAccountId: string;
  paymentMethod: string;
  referenceNumber?: string;
  notes?: string;
  actorId?: string;
}): { customer: Customer; transaction: CashTransaction } {
  if (params.amount <= 0) {
    throw new Error('পরিশোধের পরিমাণ সঠিক নয়।');
  }

  // 1. Update customer current due
  const allCustomers = getItem<Customer[]>(STORAGE_KEYS.CUSTOMERS, []);
  const cIdx = allCustomers.findIndex(
    (c) => c.id === params.customerId && c.shopId === params.shopId
  );
  if (cIdx === -1) throw new Error('গ্রাহক পাওয়া যায়নি।');

  const customer = allCustomers[cIdx];
  const previousDue = customer.currentDue;
  const newDue = Math.max(0, previousDue - params.amount);
  customer.currentDue = Number(newDue.toFixed(2));
  customer.updatedAt = new Date().toISOString();
  allCustomers[cIdx] = customer;
  setItem(STORAGE_KEYS.CUSTOMERS, allCustomers);

  // 2. Deposit into selected Cash/MFS account
  const allAccounts = getItem<CashAccount[]>(STORAGE_KEYS.CASH_ACCOUNTS, []);
  const accIdx = allAccounts.findIndex(
    (a) => a.id === params.paymentAccountId && a.shopId === params.shopId
  );
  if (accIdx === -1) throw new Error('পেমেন্ট অ্যাকাউন্ট পাওয়া যায়নি।');

  const acc = allAccounts[accIdx];
  acc.currentBalance += params.amount;
  acc.updatedAt = new Date().toISOString();
  allAccounts[accIdx] = acc;
  setItem(STORAGE_KEYS.CASH_ACCOUNTS, allAccounts);

  // 3. Record in Customer Ledger (Credit decreases due)
  recordCustomerLedgerEntry({
    shopId: params.shopId,
    customerId: customer.id,
    entryType: 'DUE_COLLECTION',
    debit: 0,
    credit: params.amount,
    balanceAfter: customer.currentDue,
    referenceId: params.referenceNumber,
    notes: `বকেয়া আদায় (${params.paymentMethod}): ${acc.name}`,
  });

  // 4. Record Cash Transaction
  const tx = recordCashTransaction({
    shopId: params.shopId,
    accountId: acc.id,
    accountName: acc.name,
    transactionType: 'CUSTOMER_PAYMENT',
    amount: params.amount,
    balanceAfter: acc.currentBalance,
    relatedId: customer.id,
    reference: params.referenceNumber,
    notes: `বকেয়া আদায়: ${customer.name} (${customer.mobileNumber})`,
    actorId: params.actorId,
  });

  addAuditLog({
    shopId: params.shopId,
    actorId: params.actorId,
    action: 'SHOP_UPDATED',
    details: {
      action: 'DUE_COLLECTED',
      customerName: customer.name,
      amount: params.amount,
      remainingDue: customer.currentDue,
      account: acc.name,
    },
  });

  return { customer, transaction: tx };
}

// -----------------------------------------------------------------------------
// 7. SALES RETURNS & EXCHANGES ENGINE
// -----------------------------------------------------------------------------
export function getSalesReturnsByShop(shopId: string): SalesReturn[] {
  const all = getItem<SalesReturn[]>(STORAGE_KEYS.SALES_RETURNS, []);
  return all.filter((r) => r.shopId === shopId);
}

export function processSalesReturn(params: {
  shopId: string;
  saleId: string;
  returnType: 'REFUND' | 'EXCHANGE' | 'STORE_CREDIT';
  refundMethod?: POSPaymentMethod;
  refundAccountId?: string;
  items: {
    saleItemId: string;
    productId: string;
    quantity: number;
    unitPrice: number;
    condition: 'RESTOCKABLE' | 'DAMAGED';
  }[];
  reason: string;
  notes?: string;
  actorId?: string;
}): SalesReturn {
  if (!params.items || params.items.length === 0) {
    throw new Error('ফেরত দেওয়ার জন্য অন্তত একটি আইটেম নির্বাচন করুন।');
  }

  // 1. Fetch sale and items
  const allSales = getItem<Sale[]>(STORAGE_KEYS.SALES, []);
  const saleIdx = allSales.findIndex((s) => s.id === params.saleId && s.shopId === params.shopId);
  if (saleIdx === -1) throw new Error('মূল বিক্রয় চালান পাওয়া যায়নি।');
  const sale = allSales[saleIdx];

  const allSaleItems = getItem<SaleItem[]>(STORAGE_KEYS.SALE_ITEMS, []);
  const currentSaleItems = allSaleItems.filter((i) => i.saleId === sale.id);

  // 2. Validate return quantities (cannot return more than sold minus previously returned)
  let totalRefundAmount = 0;
  const returnId = crypto.randomUUID();
  const returnInvoiceNumber = `RET-${Date.now().toString().slice(-6)}`;
  const returnItems: SalesReturnItem[] = [];

  for (const item of params.items) {
    const saleItem = currentSaleItems.find((si) => si.id === item.saleItemId);
    if (!saleItem) throw new Error('বিক্রিত আইটেম পাওয়া যায়নি।');

    const alreadyReturned = saleItem.returnedQuantity || 0;
    const remainingReturnable = saleItem.quantity - alreadyReturned;

    if (item.quantity > remainingReturnable) {
      throw new Error(
        `'${saleItem.productNameBn}' এর সর্বোচ্চ ${remainingReturnable} টি ফেরত নেওয়া সম্ভব (পূর্বে ${alreadyReturned} টি ফেরত হয়েছে)।`
      );
    }

    const refundItemTotal = Number((item.quantity * item.unitPrice).toFixed(2));
    totalRefundAmount += refundItemTotal;

    // Update returned quantity on sale item
    saleItem.returnedQuantity = alreadyReturned + item.quantity;
    const siGlobalIdx = allSaleItems.findIndex((x) => x.id === saleItem.id);
    if (siGlobalIdx !== -1) allSaleItems[siGlobalIdx] = saleItem;

    returnItems.push({
      id: crypto.randomUUID(),
      returnId,
      saleItemId: item.saleItemId,
      productId: item.productId,
      productNameBn: saleItem.productNameBn,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      refundAmount: refundItemTotal,
      condition: item.condition,
    });

    // 3. Restock inventory if RESTOCKABLE, or log damaged return
    if (item.condition === 'RESTOCKABLE') {
      const allProducts = getItem<any[]>(STORAGE_KEYS.PRODUCTS, []);
      const pIdx = allProducts.findIndex((p) => p.id === item.productId && p.shopId === params.shopId);
      if (pIdx !== -1) {
        const prod = allProducts[pIdx];
        const previousStock = prod.currentStock;
        prod.currentStock = previousStock + item.quantity;
        prod.updatedAt = new Date().toISOString();
        allProducts[pIdx] = prod;
        setItem(STORAGE_KEYS.PRODUCTS, allProducts);

        recordStockMovement({
          shopId: params.shopId,
          productId: prod.id,
          productName: prod.nameBn,
          movementType: 'RETURN',
          quantityDelta: item.quantity,
          previousStock,
          newStock: prod.currentStock,
          unitCost: prod.avgPurchaseCost || prod.purchasePrice,
          referenceId: returnInvoiceNumber,
          notes: `বিক্রয় ফেরত: চালান #${sale.invoiceNumber} (${params.reason})`,
          actorId: params.actorId,
        });
      }
    } else {
      // DAMAGED return: log audit record without restoring saleable stock
      recordStockMovement({
        shopId: params.shopId,
        productId: item.productId,
        productName: saleItem.productNameBn,
        movementType: 'DAMAGE',
        quantityDelta: 0,
        previousStock: 0,
        newStock: 0,
        unitCost: saleItem.costPrice,
        referenceId: returnInvoiceNumber,
        notes: `ক্ষতিগ্রস্ত/ত্রুটিপূর্ণ ফেরত: চালান #${sale.invoiceNumber} (${params.reason})`,
        actorId: params.actorId,
      });
    }
  }

  setItem(STORAGE_KEYS.SALE_ITEMS, allSaleItems);

  // 4. Update Sale return status
  const totalOriginalQty = currentSaleItems.reduce((s, i) => s + i.quantity, 0);
  const totalReturnedQty = currentSaleItems.reduce((s, i) => s + (i.returnedQuantity || 0), 0);
  sale.returnStatus = totalReturnedQty >= totalOriginalQty ? 'FULL' : 'PARTIAL';
  sale.updatedAt = new Date().toISOString();
  allSales[saleIdx] = sale;
  setItem(STORAGE_KEYS.SALES, allSales);

  // 5. Handle Refund Payout or Customer Store Credit
  if (params.returnType === 'REFUND' && params.refundAccountId && totalRefundAmount > 0) {
    const allAccounts = getItem<CashAccount[]>(STORAGE_KEYS.CASH_ACCOUNTS, []);
    const accIdx = allAccounts.findIndex(
      (a) => a.id === params.refundAccountId && a.shopId === params.shopId
    );
    if (accIdx !== -1) {
      const acc = allAccounts[accIdx];
      acc.currentBalance -= totalRefundAmount;
      acc.updatedAt = new Date().toISOString();
      allAccounts[accIdx] = acc;
      setItem(STORAGE_KEYS.CASH_ACCOUNTS, allAccounts);

      recordCashTransaction({
        shopId: params.shopId,
        accountId: acc.id,
        accountName: acc.name,
        transactionType: 'REFUND',
        amount: totalRefundAmount,
        balanceAfter: acc.currentBalance,
        relatedId: returnId,
        invoiceNumber: sale.invoiceNumber,
        reference: returnInvoiceNumber,
        notes: `বিক্রয় ফেরত রিফান্ড: চালান #${sale.invoiceNumber} (${acc.name})`,
        actorId: params.actorId,
      });
    }
  } else if (params.returnType === 'STORE_CREDIT' && sale.customerId) {
    // If store credit / due deduction, adjust customer ledger
    const allCustomers = getItem<Customer[]>(STORAGE_KEYS.CUSTOMERS, []);
    const cIdx = allCustomers.findIndex(
      (c) => c.id === sale.customerId && c.shopId === params.shopId
    );
    if (cIdx !== -1) {
      const cust = allCustomers[cIdx];
      cust.currentDue = Math.max(0, cust.currentDue - totalRefundAmount);
      cust.updatedAt = new Date().toISOString();
      allCustomers[cIdx] = cust;
      setItem(STORAGE_KEYS.CUSTOMERS, allCustomers);

      recordCustomerLedgerEntry({
        shopId: params.shopId,
        customerId: cust.id,
        entryType: 'SALES_RETURN',
        debit: 0,
        credit: totalRefundAmount,
        balanceAfter: cust.currentDue,
        referenceId: returnInvoiceNumber,
        invoiceNumber: sale.invoiceNumber,
        notes: `ফেরত সমন্বয় / স্টোর ক্রেডিট: #${returnInvoiceNumber}`,
      });
    }
  }

  // 6. Save Sales Return Record
  const newReturn: SalesReturn = {
    id: returnId,
    shopId: params.shopId,
    saleId: sale.id,
    invoiceNumber: sale.invoiceNumber,
    returnInvoiceNumber,
    customerId: sale.customerId,
    customerName: sale.customerName,
    returnType: params.returnType,
    refundMethod: params.refundMethod,
    refundAccountId: params.refundAccountId,
    totalRefundAmount,
    reason: params.reason,
    notes: params.notes,
    actorId: params.actorId,
    items: returnItems,
    createdAt: new Date().toISOString(),
  };

  const allReturns = getItem<SalesReturn[]>(STORAGE_KEYS.SALES_RETURNS, []);
  allReturns.unshift(newReturn);
  setItem(STORAGE_KEYS.SALES_RETURNS, allReturns);

  addAuditLog({
    shopId: params.shopId,
    actorId: params.actorId,
    action: 'SHOP_UPDATED',
    details: {
      action: 'SALES_RETURN_PROCESSED',
      originalInvoice: sale.invoiceNumber,
      returnInvoice: returnInvoiceNumber,
      refundAmount: totalRefundAmount,
      reason: params.reason,
    },
  });

  return newReturn;
}

// -----------------------------------------------------------------------------
// 8. DAILY CASH REGISTER CLOSING & FLOAT RECONCILIATION
// -----------------------------------------------------------------------------
export function getDailyClosingsByShop(shopId: string): DailyCashClosing[] {
  const all = getItem<DailyCashClosing[]>(STORAGE_KEYS.DAILY_CLOSINGS, []);
  return all.filter((c) => c.shopId === shopId);
}

export function saveDailyClosing(closing: DailyCashClosing): DailyCashClosing {
  const all = getItem<DailyCashClosing[]>(STORAGE_KEYS.DAILY_CLOSINGS, []);
  const idx = all.findIndex((c) => c.id === closing.id && c.shopId === closing.shopId);
  if (idx !== -1) {
    all[idx] = closing;
  } else {
    all.unshift(closing);
  }
  setItem(STORAGE_KEYS.DAILY_CLOSINGS, all);
  return closing;
}

// -----------------------------------------------------------------------------
// 9. ACCURATE FINANCIAL METRICS & PROFIT CALCULATION
// -----------------------------------------------------------------------------
export function getFinancialSummary(
  shopId: string,
  startDate?: string,
  endDate?: string
): FinancialSummary {
  const sales = getItem<Sale[]>(STORAGE_KEYS.SALES, []).filter((s) => {
    if (s.shopId !== shopId || s.status === 'CANCELLED') return false;
    if (startDate && s.createdAt < startDate) return false;
    if (endDate && s.createdAt > endDate) return false;
    return true;
  });

  const expenses = getItem<Expense[]>(STORAGE_KEYS.EXPENSES, []).filter((e) => {
    if (e.shopId !== shopId) return false;
    if (startDate && e.date < startDate) return false;
    if (endDate && e.date > endDate) return false;
    return true;
  });

  const returns = getItem<SalesReturn[]>(STORAGE_KEYS.SALES_RETURNS, []).filter((r) => {
    if (r.shopId !== shopId) return false;
    if (startDate && r.createdAt < startDate) return false;
    if (endDate && r.createdAt > endDate) return false;
    return true;
  });

  let grossSales = 0;
  let salesDiscounts = 0;
  let costOfGoodsSold = 0;
  let totalCashReceived = 0;
  let totalDueReceivable = 0;

  for (const s of sales) {
    grossSales += s.subtotal + (s.shippingCharge || 0) + (s.vatAmount || 0);
    salesDiscounts += s.cartDiscount + (s.itemDiscountsTotal || 0);
    costOfGoodsSold += s.totalCost || 0;
    totalCashReceived += s.paidAmount || 0;
    totalDueReceivable += s.dueAmount || 0;
  }

  const totalReturnsRefunded = returns.reduce((sum, r) => sum + (r.totalRefundAmount || 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  const netSales = Math.max(0, grossSales - salesDiscounts - totalReturnsRefunded);
  const grossProfit = Number((netSales - costOfGoodsSold).toFixed(2));
  const grossProfitMarginPercent =
    netSales > 0 ? Number(((grossProfit / netSales) * 100).toFixed(2)) : 0;

  const netProfit = Number((grossProfit - totalExpenses).toFixed(2));
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
    netProfit,
    netProfitMarginPercent,
    totalCashReceived: Number(totalCashReceived.toFixed(2)),
    totalDueReceivable: Number(totalDueReceivable.toFixed(2)),
    totalReturnsRefunded: Number(totalReturnsRefunded.toFixed(2)),
  };
}
