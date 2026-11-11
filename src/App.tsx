/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Store, Loader2 } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider, useToast } from './context/ToastContext';
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
import { DocumentStudio } from './components/studio/DocumentStudio';
import { AiBusinessAgent } from './components/ai/AiBusinessAgent';
import { BackupManager } from './components/backup/BackupManager';
import { SuperAdminDashboard } from './components/superadmin/SuperAdminDashboard';
import { SaaSVisitorLanding } from './components/saas/SaaSVisitorLanding';

function MainApp() {
  const { currentShop, isLoading, loginShop, ownedShops } = useAuth();
  const { showToast } = useToast();
  const [currentModule, setCurrentModule] = useState<string>('dashboard');
  const [isAddShopModalOpen, setIsAddShopModalOpen] = useState(false);
  const [visitorMode, setVisitorMode] = useState<'landing' | 'auth'>('landing');

  const handleEnterDemo = async () => {
    try {
      const demoShops = ownedShops.length > 0 ? ownedShops : JSON.parse(localStorage.getItem('mosafa_pos_db_shops') || '[]');
      const targetShop = demoShops[0];
      if (targetShop) {
        await loginShop('01700000000', targetShop.id, '123098', true);
        showToast({
          type: 'success',
          title: 'ডেমো শপে লগইন সফল হয়েছে!',
          message: `${targetShop.name} এর পূর্ণাঙ্গ অ্যাক্সেস উন্মুক্ত হয়েছে।`
        });
      } else {
        setVisitorMode('auth');
      }
    } catch {
      setVisitorMode('auth');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        <div className="w-12 h-12 rounded-2xl bg-sky-600 flex items-center justify-center text-white shadow-lg shadow-sky-600/30 animate-pulse mb-4">
          <Store className="w-6 h-6" />
        </div>
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin text-sky-600" />
          <span>MoSaFa Shop Manager লোড হচ্ছে...</span>
        </div>
      </div>
    );
  }

  // Not logged in: Show public SaaS landing page or Auth Page
  if (!currentShop) {
    if (visitorMode === 'landing') {
      return (
        <SaaSVisitorLanding
          onOpenLogin={() => setVisitorMode('auth')}
          onOpenSignup={() => setVisitorMode('auth')}
          onEnterDemo={handleEnterDemo}
        />
      );
    }
    return (
      <div className="relative">
        <button
          onClick={() => setVisitorMode('landing')}
          className="fixed top-4 left-4 z-50 px-3.5 py-1.5 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-xs border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-sky-600 transition-colors shadow-xs"
        >
          ← হোমপেজে ফিরে যান
        </button>
        <AuthPage />
      </div>
    );
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

      {currentModule === 'ai_agent' && <AiBusinessAgent shop={currentShop} />}

      {currentModule === 'studio' && <DocumentStudio shop={currentShop} />}

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

      {currentModule === 'backup' && <BackupManager shopId={currentShop.id} />}

      {currentModule === 'super_admin' && <SuperAdminDashboard />}

      {currentModule === 'audit' && <AuditLogViewer />}

      {currentModule === 'settings' && <ShopSettings />}

      {currentModule !== 'dashboard' &&
        currentModule !== 'pos' &&
        currentModule !== 'ai_agent' &&
        currentModule !== 'studio' &&
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
        currentModule !== 'backup' &&
        currentModule !== 'super_admin' &&
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
