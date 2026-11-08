/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Store, Loader2 } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { AuthPage } from './components/auth/AuthPage';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardOverview } from './components/dashboard/DashboardOverview';
import { ShopSettings } from './components/settings/ShopSettings';
import { ModulePlaceholder } from './components/modules/ModulePlaceholder';
import { SignupWizard } from './components/auth/SignupWizard';
import { ProductList } from './components/products/ProductList';
import { InventoryDashboard } from './components/inventory/InventoryDashboard';
import { CustomerManager } from './components/customers/CustomerManager';
import { SupplierManager } from './components/suppliers/SupplierManager';
import { PurchaseManager } from './components/purchases/PurchaseManager';
import { POSTerminal } from './components/pos/POSTerminal';
import { CashbookManager } from './components/cashbook/CashbookManager';
import { ExpenseManager } from './components/expenses/ExpenseManager';
import { SalesReturnManager } from './components/returns/SalesReturnManager';
import { ReportsDashboard } from './components/reports/ReportsDashboard';
import { EmployeeManager } from './components/employees/EmployeeManager';
import { ImeiManager } from './components/imei/ImeiManager';
import { WarrantyManager } from './components/warranty/WarrantyManager';
import { TelecomManager } from './components/telecom/TelecomManager';
import { BarcodeManager } from './components/barcodes/BarcodeManager';
import { AuditLogViewer } from './components/audit/AuditLogViewer';

function MainApp() {
  const { currentShop, isLoading } = useAuth();
  const [currentModule, setCurrentModule] = useState<string>('dashboard');
  const [isAddShopModalOpen, setIsAddShopModalOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-600/30 animate-pulse mb-4">
          <Store className="w-6 h-6" />
        </div>
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
          <span>MoSaFa Shop POS লোড হচ্ছে...</span>
        </div>
      </div>
    );
  }

  // Not logged in: Show dedicated Shop POS Authentication (Login / Multi-step Signup)
  if (!currentShop) {
    return <AuthPage />;
  }

  // Logged in: Render Shop POS App Layout
  return (
    <AppLayout
      currentModule={currentModule}
      onNavigate={(module) => setCurrentModule(module)}
    >
      {currentModule === 'dashboard' && (
        <DashboardOverview
          onNavigate={(module) => setCurrentModule(module)}
          onOpenNewShopModal={() => setIsAddShopModalOpen(true)}
        />
      )}

      {currentModule === 'pos' && <POSTerminal />}

      {currentModule === 'products' && <ProductList />}

      {currentModule === 'inventory' && (
        <InventoryDashboard
          onNavigateToPurchases={() => setCurrentModule('purchases')}
        />
      )}

      {currentModule === 'purchases' && <PurchaseManager />}

      {currentModule === 'customers' && <CustomerManager />}

      {currentModule === 'suppliers' && <SupplierManager />}

      {currentModule === 'cashbook' && <CashbookManager />}

      {currentModule === 'expenses' && <ExpenseManager />}

      {currentModule === 'returns' && <SalesReturnManager />}

      {currentModule === 'reports' && <ReportsDashboard />}

      {currentModule === 'employees' && <EmployeeManager />}

      {currentModule === 'imei' && <ImeiManager />}

      {currentModule === 'warranty' && <WarrantyManager />}

      {currentModule === 'telecom' && <TelecomManager />}

      {currentModule === 'barcodes' && <BarcodeManager />}

      {currentModule === 'audit' && <AuditLogViewer />}

      {currentModule === 'settings' && <ShopSettings />}

      {currentModule !== 'dashboard' &&
        currentModule !== 'pos' &&
        currentModule !== 'products' &&
        currentModule !== 'inventory' &&
        currentModule !== 'purchases' &&
        currentModule !== 'customers' &&
        currentModule !== 'suppliers' &&
        currentModule !== 'cashbook' &&
        currentModule !== 'expenses' &&
        currentModule !== 'returns' &&
        currentModule !== 'reports' &&
        currentModule !== 'employees' &&
        currentModule !== 'imei' &&
        currentModule !== 'warranty' &&
        currentModule !== 'telecom' &&
        currentModule !== 'barcodes' &&
        currentModule !== 'audit' &&
        currentModule !== 'settings' && (
          <ModulePlaceholder
            moduleKey={currentModule}
            onGoBack={() => setCurrentModule('dashboard')}
          />
        )}

      {isAddShopModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-xl my-8">
            <SignupWizard
              onSuccess={() => setIsAddShopModalOpen(false)}
              onSwitchToLogin={() => setIsAddShopModalOpen(false)}
            />
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <ToastProvider>
          <AuthProvider>
            <MainApp />
          </AuthProvider>
        </ToastProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
