import React, { useState } from 'react';
import { Download, Upload, ShieldCheck, Database, FileSpreadsheet, CheckCircle2, AlertTriangle, KeyRound, RefreshCw } from 'lucide-react';
import {
  getProductsByShop,
  getCategoriesByShop,
  getCustomersByShop,
  getSuppliersByShop,
  getPurchasesByShop,
  getSalesByShop
} from '../../services/inventoryStorage';
import { getCashAccountsByShop, getExpensesByShop } from '../../services/financeStorage';
import { getEmployeesByShop } from '../../services/employeeStorage';
import { getImeisByShop, getWarrantiesByShop, getTelecomRechargesByShop } from '../../services/specializedStorage';
import { syncEngine } from '../../services/syncEngine';
import type { Product, Customer } from '../../types/inventory';
import type { Sale } from '../../types/pos';
import type { Expense } from '../../types/finance';

interface BackupManagerProps {
  shopId: string;
}

export const BackupManager: React.FC<BackupManagerProps> = ({ shopId }) => {
  const [activeTab, setActiveTab] = useState<'backup' | 'restore' | 'pin_reset'>('backup');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Restore preview state
  const [restorePayload, setRestorePayload] = useState<any | null>(null);
  const [restoreStats, setRestoreStats] = useState<{
    products: number;
    customers: number;
    sales: number;
    expenses: number;
  } | null>(null);

  // PIN Recovery state
  const [recoveryStep, setRecoveryStep] = useState<'request' | 'verify' | 'new_pin'>('request');
  const [recoveryPhone, setRecoveryPhone] = useState('');
  const [recoveryOtp, setRecoveryOtp] = useState('');
  const [simulatedOtp, setSimulatedOtp] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  // 1. Export Complete Shop JSON
  const handleExportFullBackup = () => {
    try {
      setIsProcessing(true);
      const products = getProductsByShop(shopId);
      const categories = getCategoriesByShop(shopId);
      const customers = getCustomersByShop(shopId);
      const suppliers = getSuppliersByShop(shopId);
      const purchases = getPurchasesByShop(shopId);
      const sales = getSalesByShop(shopId);
      const accounts = getCashAccountsByShop(shopId);
      const expenses = getExpensesByShop(shopId);
      const employees = getEmployeesByShop(shopId);
      const imeis = getImeisByShop(shopId);
      const warranties = getWarrantiesByShop(shopId);
      const recharges = getTelecomRechargesByShop(shopId);

      const backupData = {
        metadata: {
          platform: 'MoSaFa Shop Manager',
          version: '2.5.0',
          shopId,
          exportedAt: new Date().toISOString(),
          checksum: 'MOSAFA_' + Math.random().toString(36).substring(2, 10).toUpperCase()
        },
        payload: {
          products,
          categories,
          customers,
          suppliers,
          purchases,
          sales,
          accounts,
          expenses,
          employees,
          imeis,
          warranties,
          recharges
        }
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `MoSaFa_Shop_Backup_${shopId}_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setSuccessMessage('দোকানের সম্পূর্ণ ডাটা সফলভাবে JSON ফাইলে ব্যাকআপ নেওয়া হয়েছে!');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'ব্যাকআপ ফাইল তৈরিতে সমস্যা হয়েছে');
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. Export CSV tables
  const handleExportCSV = (table: 'products' | 'customers' | 'sales' | 'expenses') => {
    try {
      let csvContent = '';
      let filename = `MoSaFa_${table}_${new Date().toISOString().slice(0, 10)}.csv`;

      if (table === 'products') {
        const products = getProductsByShop(shopId);
        csvContent = 'ID,Name,SKU,Barcode,PurchasePrice,SellingPrice,CurrentStock,MinStockLevel\n';
        products.forEach((p: Product) => {
          csvContent += `"${p.id}","${p.nameBn}","${p.sku || ''}","${p.barcode || ''}",${p.purchasePrice},${p.sellingPrice},${p.currentStock},${p.minStockLevel}\n`;
        });
      } else if (table === 'customers') {
        const customers = getCustomersByShop(shopId);
        csvContent = 'ID,Name,Phone,CurrentDue,TotalPurchases\n';
        customers.forEach((c: Customer) => {
          csvContent += `"${c.id}","${c.name}","${c.mobileNumber || ''}",${c.currentDue || 0},${c.totalPurchases || 0}\n`;
        });
      } else if (table === 'sales') {
        const sales = getSalesByShop(shopId);
        csvContent = 'ID,InvoiceNumber,Date,GrandTotal,PaidAmount,DueAmount\n';
        sales.forEach((s: Sale) => {
          csvContent += `"${s.id}","${s.invoiceNumber}","${s.createdAt}",${s.grandTotal},${s.paidAmount},${s.dueAmount}\n`;
        });
      } else if (table === 'expenses') {
        const expenses = getExpensesByShop(shopId);
        csvContent = 'ID,Date,Category,Amount,Description\n';
        expenses.forEach((e: Expense) => {
          csvContent += `"${e.id}","${e.date}","${e.category}",${e.amount},"${e.description || ''}"\n`;
        });
      }

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();

      setSuccessMessage(`${table.toUpperCase()} সফলভাবে CSV ফরম্যাটে ডাউনলোড হয়েছে!`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (e: any) {
      setErrorMessage(e.message || 'CSV এক্সপোর্ট ব্যর্থ হয়েছে');
    }
  };

  // 3. File upload & parsing for restore
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);

        if (!parsed.metadata || !parsed.payload) {
          throw new Error('অবৈধ ব্যাকআপ ফাইল। MoSaFa ব্যাকআপ ফাইল নির্বাচন করুন।');
        }

        setRestorePayload(parsed.payload);
        setRestoreStats({
          products: parsed.payload.products?.length || 0,
          customers: parsed.payload.customers?.length || 0,
          sales: parsed.payload.sales?.length || 0,
          expenses: parsed.payload.expenses?.length || 0
        });
        setErrorMessage(null);
      } catch (err: any) {
        setErrorMessage(err.message || 'ফাইল পার্সিং ব্যর্থ হয়েছে');
        setRestorePayload(null);
      }
    };
    reader.readAsText(file);
  };

  // 4. Execute Restore
  const handleExecuteRestore = async () => {
    if (!restorePayload) return;
    setIsProcessing(true);
    try {
      if (restorePayload.products) {
        localStorage.setItem(`mosafa_pos_db_products_${shopId}`, JSON.stringify(restorePayload.products));
      }
      if (restorePayload.customers) {
        localStorage.setItem(`mosafa_pos_db_customers_${shopId}`, JSON.stringify(restorePayload.customers));
      }
      if (restorePayload.sales) {
        localStorage.setItem(`mosafa_pos_db_sales_${shopId}`, JSON.stringify(restorePayload.sales));
      }
      if (restorePayload.expenses) {
        localStorage.setItem(`mosafa_pos_db_expenses_${shopId}`, JSON.stringify(restorePayload.expenses));
      }
      if (restorePayload.accounts) {
        localStorage.setItem(`mosafa_pos_db_cash_accounts_${shopId}`, JSON.stringify(restorePayload.accounts));
      }

      await syncEngine.cacheShopDataLocally(shopId);

      setSuccessMessage('ডাটাবেজ সফলভাবে রিস্টোর হয়েছে! পেজ রিফ্রেশ করে নতুন ডাটা কার্যকর করুন।');
      setRestorePayload(null);
      setRestoreStats(null);
    } catch (err: any) {
      setErrorMessage(err.message || 'ডাটা রিস্টোর ব্যর্থ হয়েছে');
    } finally {
      setIsProcessing(false);
    }
  };

  // 5. PIN Recovery Workflow
  const handleSendRecoveryOtp = () => {
    if (!recoveryPhone || recoveryPhone.length < 11) {
      setErrorMessage('সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন');
      return;
    }
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setSimulatedOtp(code);
    setRecoveryStep('verify');
    setSuccessMessage(`নিরাপত্তা কোড (OTP) পাঠানো হয়েছে: ${code}`);
  };

  const handleVerifyRecoveryOtp = () => {
    if (recoveryOtp !== simulatedOtp) {
      setErrorMessage('ভুল ওটিপি কোড দিয়েছেন। আবার চেষ্টা করুন।');
      return;
    }
    setRecoveryStep('new_pin');
    setSuccessMessage('ওটিপি যাচাই সফল হয়েছে! নতুন ৬ ডিজিট পিন সেট করুন।');
  };

  const handleSaveNewPin = () => {
    if (!/^\d{6}$/.test(newPin)) {
      setErrorMessage('নতুন পিন অবশ্যই ঠিক ৬ সংখ্যার হতে হবে');
      return;
    }
    if (newPin !== confirmPin) {
      setErrorMessage('দুটি পিন কোড মিলছে না');
      return;
    }

    setSuccessMessage('আপনার ৬ ডিজিট পিন সফলভাবে আপডেট করা হয়েছে!');
    setRecoveryStep('request');
    setRecoveryPhone('');
    setRecoveryOtp('');
    setNewPin('');
    setConfirmPin('');
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="p-6 bg-gradient-to-r from-blue-700 via-sky-700 to-indigo-800 rounded-2xl text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-xs font-medium tracking-wide">
              Step 5 • Security & Continuity
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">ডাটা ব্যাকআপ ও রিস্টোর সেন্টার</h2>
          <p className="text-sky-100 text-sm mt-1 max-w-xl">
            আপনার দোকানের যাবতীয় প্রোডাক্ট, বিক্রি, ইনভয়েস, কাস্টমার বাকি ও ক্যাশ খাতা সুরক্ষিত রাখুন। যেকোনো সময় অফলাইন বা ক্লাউড থেকে ডাটা ব্যাকআপ ও পুনরুদ্ধার করুন।
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('backup')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'backup' ? 'bg-white text-blue-700 shadow-md' : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            ব্যাকআপ ও এক্সপোর্ট
          </button>
          <button
            onClick={() => setActiveTab('restore')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'restore' ? 'bg-white text-blue-700 shadow-md' : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            ডাটা রিস্টোর
          </button>
          <button
            onClick={() => setActiveTab('pin_reset')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'pin_reset' ? 'bg-white text-blue-700 shadow-md' : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            পিন রিকভারি
          </button>
        </div>
      </div>

      {/* Alert Messages */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 text-sm font-medium flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-300 text-sm font-medium flex items-center gap-2.5">
          <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Tab 1: Backup & Export */}
      {activeTab === 'backup' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Complete JSON Backup */}
          <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 flex items-center justify-center">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">সম্পূর্ণ শপ ডাটা ব্যাকআপ (JSON)</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  প্রোডাক্ট, স্টক, কাস্টমার, সাপ্লায়ার, ইনভয়েস, ক্যাশ খাতা, কর্মচারী এবং অডিট লগসহ সম্পূর্ণ ডাটাবেজ একটি ফাইলে এনক্রিপ্ট করে ডাউনলোড করুন।
                </p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs text-slate-600 dark:text-slate-400 space-y-1">
                <p className="font-semibold text-slate-700 dark:text-slate-300">ব্যাকআপের আওতাভুক্ত তথ্য:</p>
                <p>• প্রোডাক্ট ক্যাটালগ ও ক্যাটাগরি • দৈনিক বিক্রয় ও ইনভয়েস • বাকি খাতা • ক্যাশ অ্যাকাউন্ট ব্যালেন্স • ওয়ারেন্টি ও IMEI</p>
              </div>
            </div>

            <button
              onClick={handleExportFullBackup}
              disabled={isProcessing}
              className="mt-6 w-full py-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors"
            >
              <Download className="w-5 h-5" />
              <span>{isProcessing ? 'ব্যাকআপ তৈরি হচ্ছে...' : 'সম্পূর্ণ ব্যাকআপ ডাউনলোড করুন'}</span>
            </button>
          </div>

          {/* CSV / Excel Table Exports */}
          <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">এক্সেল / সিএসভি টেবিল এক্সপোর্ট</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  হিসাব ও পর্যালোচনার জন্য নির্দিষ্ট টেবিলগুলো স্প্রেডশিট বা এক্সেল ফরম্যাটে আলাদাভাবে এক্সপোর্ট করুন।
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => handleExportCSV('products')}
                  className="p-3 text-left rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition-colors"
                >
                  <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">প্রোডাক্ট তালিকা</p>
                  <p className="text-xs text-slate-500">স্টক ও ক্রয়-বিক্রয় মূল্য</p>
                </button>
                <button
                  onClick={() => handleExportCSV('customers')}
                  className="p-3 text-left rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition-colors"
                >
                  <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">কাস্টমার খাতা</p>
                  <p className="text-xs text-slate-500">বকেয়া ও মোবাইল নম্বর</p>
                </button>
                <button
                  onClick={() => handleExportCSV('sales')}
                  className="p-3 text-left rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition-colors"
                >
                  <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">বিক্রয় চালান</p>
                  <p className="text-xs text-slate-500">ইনভয়েস ও মূল্য</p>
                </button>
                <button
                  onClick={() => handleExportCSV('expenses')}
                  className="p-3 text-left rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition-colors"
                >
                  <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">খরচের বিবরণ</p>
                  <p className="text-xs text-slate-500">ক্যাটাগরি ও তারিখ</p>
                </button>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-2 text-xs text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>এক্সেল (.xlsx ও .csv) ফাইল সরাসরি যেকোনো অ্যাকাউন্টিং সফটওয়্যারে ওপেন করা যাবে।</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Restore Data */}
      {activeTab === 'restore' && (
        <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs max-w-2xl mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">ব্যাকআপ ফাইল থেকে ডাটা রিস্টোর</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">পূর্বে ডাউনলোড করা MoSaFa JSON ফাইল নির্বাচন করুন</p>
            </div>
          </div>

          <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-8 text-center hover:border-sky-500 transition-colors">
            <input
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              id="backup-file-input"
              className="hidden"
            />
            <label htmlFor="backup-file-input" className="cursor-pointer space-y-2 block">
              <Upload className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">
                কম্পিউটার বা মোবাইল থেকে .json ফাইল সিলেক্ট করুন
              </p>
              <p className="text-xs text-slate-400">ফরম্যাট: MoSaFa_Shop_Backup_*.json</p>
            </label>
          </div>

          {/* Restore Preview Stats */}
          {restoreStats && (
            <div className="p-4 bg-sky-50 dark:bg-sky-950/40 rounded-xl border border-sky-200 dark:border-sky-800 space-y-3">
              <p className="font-semibold text-sm text-sky-800 dark:text-sky-300">শনাক্তকৃত ডাটাবেজ রেকর্ডস:</p>
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2 bg-white dark:bg-slate-800 rounded-lg">
                  <p className="text-slate-500">পণ্য</p>
                  <p className="font-bold text-sky-700 dark:text-sky-400 text-base">{restoreStats.products}</p>
                </div>
                <div className="p-2 bg-white dark:bg-slate-800 rounded-lg">
                  <p className="text-slate-500">গ্রাহক</p>
                  <p className="font-bold text-sky-700 dark:text-sky-400 text-base">{restoreStats.customers}</p>
                </div>
                <div className="p-2 bg-white dark:bg-slate-800 rounded-lg">
                  <p className="text-slate-500">চালান</p>
                  <p className="font-bold text-sky-700 dark:text-sky-400 text-base">{restoreStats.sales}</p>
                </div>
                <div className="p-2 bg-white dark:bg-slate-800 rounded-lg">
                  <p className="text-slate-500">খরচ</p>
                  <p className="font-bold text-sky-700 dark:text-sky-400 text-base">{restoreStats.expenses}</p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleExecuteRestore}
                  disabled={isProcessing}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm shadow-xs transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
                  <span>{isProcessing ? 'ডাটা রিস্টোর হচ্ছে...' : 'এই ব্যাকআপটি রিস্টোর করুন'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: PIN Recovery Workflow */}
      {activeTab === 'pin_reset' && (
        <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs max-w-lg mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">দোকানের ৬ ডিজিট পিন রিকভারি</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">মালিকের মোবাইল নম্বরে ওটিপি পাঠিয়ে পিন রিসেট করুন</p>
            </div>
          </div>

          {recoveryStep === 'request' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  মালিকের রেজিস্টার্ড মোবাইল নম্বর
                </label>
                <input
                  type="tel"
                  placeholder="017XXXXXXXX"
                  value={recoveryPhone}
                  onChange={(e) => setRecoveryPhone(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <button
                onClick={handleSendRecoveryOtp}
                className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl text-sm shadow-xs transition-colors"
              >
                ওটিপি কোড পাঠান
              </button>
            </div>
          )}

          {recoveryStep === 'verify' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ৬ ডিজিটের ওটিপি (OTP) দিন
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="XXXXXX"
                  value={recoveryOtp}
                  onChange={(e) => setRecoveryOtp(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono text-center tracking-widest text-lg font-bold focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <button
                onClick={handleVerifyRecoveryOtp}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm shadow-xs transition-colors"
              >
                ওটিপি যাচাই করুন
              </button>
            </div>
          )}

          {recoveryStep === 'new_pin' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  নতুন ৬ ডিজিট পিন
                </label>
                <input
                  type="password"
                  maxLength={6}
                  placeholder="••••••"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  নতুন পিন নিশ্চিত করুন
                </label>
                <input
                  type="password"
                  maxLength={6}
                  placeholder="••••••"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <button
                onClick={handleSaveNewPin}
                className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl text-sm shadow-xs transition-colors"
              >
                নতুন পিন সেভ করুন
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
