/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  LayoutDashboard,
  Receipt,
  Boxes,
  Warehouse,
  ShoppingBag,
  Users,
  Truck,
  DollarSign,
  BookOpen,
  RotateCcw,
  BarChart3,
  UserCheck,
  Settings,
  ChevronDown,
  PlusCircle,
  LogOut,
  Moon,
  Sun,
  Languages,
  Menu,
  X,
  Store,
  ShieldAlert,
  Bell,
  Check,
  Database,
  Smartphone,
  Shield,
  Scan,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { getCategoryInfo } from '../../utils/categories';
import { SignupWizard } from '../auth/SignupWizard';
import { AuthTestLab } from '../testing/AuthTestLab';
import { SupabaseStatusModal } from '../supabase/SupabaseStatusModal';

interface AppLayoutProps {
  currentModule: string;
  onNavigate: (module: string) => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  currentModule,
  onNavigate,
  children,
}) => {
  const { currentShop, currentProfile, ownedShops, switchShop, logout } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isShopSwitcherOpen, setIsShopSwitcherOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNewShopModalOpen, setIsNewShopModalOpen] = useState(false);
  const [isTestLabOpen, setIsTestLabOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);

  if (!currentShop) return null;

  const categoryInfo = getCategoryInfo(currentShop.category);

  const navItems = [
    { id: 'dashboard', label: t('navDashboard'), icon: LayoutDashboard, step: 1, active: true },
    { id: 'pos', label: t('navPos'), icon: Receipt, step: 3, active: true },
    { id: 'products', label: t('navProducts'), icon: Boxes, step: 2, active: true },
    { id: 'inventory', label: t('navInventory'), icon: Warehouse, step: 2, active: true },
    { id: 'purchases', label: t('navPurchases'), icon: ShoppingBag, step: 2, active: true },
    { id: 'customers', label: t('navCustomers'), icon: Users, step: 2, active: true },
    { id: 'suppliers', label: t('navSuppliers'), icon: Truck, step: 2, active: true },
    { id: 'expenses', label: t('navExpenses'), icon: DollarSign, step: 3, active: true },
    { id: 'cashbook', label: t('navCashbook'), icon: BookOpen, step: 3, active: true },
    { id: 'returns', label: t('navReturns'), icon: RotateCcw, step: 3, active: true },
    { id: 'reports', label: t('navReports'), icon: BarChart3, step: 4, active: true },
    { id: 'employees', label: t('navEmployees'), icon: UserCheck, step: 4, active: true },
    { id: 'imei', label: 'IMEI ট্র্যাকিং', icon: Smartphone, step: 4, active: true },
    { id: 'warranty', label: 'ওয়ারেন্টি', icon: Shield, step: 4, active: true },
    { id: 'telecom', label: 'ফ্লেক্সিলোড লেজার', icon: Smartphone, step: 4, active: true },
    { id: 'barcodes', label: 'বারকোড টুলস', icon: Scan, step: 4, active: true },
    { id: 'audit', label: 'অডিট লগ', icon: ShieldAlert, step: 4, active: true },
    { id: 'settings', label: t('navSettings'), icon: Settings, step: 1, active: true },
  ];

  const handleSwitchShop = async (targetId: string) => {
    setIsShopSwitcherOpen(false);
    if (targetId === currentShop.id) return;

    try {
      const switched = await switchShop(targetId);
      showToast({
        type: 'success',
        title: `${t('switchShop')}: ${switched.name}`,
      });
    } catch {
      showToast({
        type: 'error',
        title: 'Error switching shop',
      });
    }
  };

  const handleLogout = async () => {
    await logout();
    showToast({
      type: 'info',
      title: t('logout'),
      message: 'সফলভাবে লগআউট হয়েছে।',
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col antialiased">
      {/* ---------------- TOP BAR ---------------- */}
      <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6">
        {/* Zone 1: Mobile Hamburger + Brand Wordmark / Active Shop Lockup */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-2.5">
            {/* Shop Logo / Initial Badge */}
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden shrink-0 shadow-sm border border-black/5 dark:border-white/10"
              style={{ backgroundColor: currentShop.brandColor || '#059669' }}
            >
              {currentShop.logoUrl ? (
                <img
                  src={currentShop.logoUrl}
                  alt={currentShop.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain bg-white dark:bg-slate-900 p-1"
                />
              ) : (
                <Store className="w-4 h-4 text-white" />
              )}
            </div>

            <div className="hidden sm:block">
              <span className="font-extrabold text-base tracking-tight block leading-tight text-slate-900 dark:text-slate-100">
                {currentShop.name}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono block">
                {currentShop.shopCode} · {categoryInfo.nameBn}
              </span>
            </div>
          </div>
        </div>

        {/* Zone 2: Shop Switcher Dropdown (If multiple shops exist) */}
        <div className="relative">
          <button
            onClick={() => setIsShopSwitcherOpen(!isShopSwitcherOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-xs font-semibold text-slate-700 dark:text-slate-200"
          >
            <Store className="w-3.5 h-3.5 text-emerald-600" />
            <span className="max-w-[120px] truncate sm:max-w-[160px]">{currentShop.name}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* Switcher Dropdown Menu */}
          {isShopSwitcherOpen && (
            <div className="absolute right-0 sm:left-0 mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-2 z-50 animate-fade-in">
              <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                আপনার নিবন্ধিত দোকানসমূহ ({ownedShops.length})
              </div>

              <div className="space-y-1 max-h-56 overflow-y-auto">
                {ownedShops.map((shop) => (
                  <button
                    key={shop.id}
                    onClick={() => handleSwitchShop(shop.id)}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition-colors ${
                      shop.id === currentShop.id
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 font-bold'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <div
                        className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-white text-[10px]"
                        style={{ backgroundColor: shop.brandColor || '#059669' }}
                      >
                        <Store className="w-3 h-3" />
                      </div>
                      <div className="truncate">
                        <span className="block truncate">{shop.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono block">{shop.shopCode}</span>
                      </div>
                    </div>
                    {shop.id === currentShop.id && (
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 ml-2" />
                    )}
                  </button>
                ))}
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 mt-2 pt-2">
                <button
                  onClick={() => {
                    setIsShopSwitcherOpen(false);
                    setIsNewShopModalOpen(true);
                  }}
                  className="w-full flex items-center gap-2 p-2 rounded-xl text-xs font-semibold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>{t('addNewShop')}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Zone 3: Controls (Test Lab, Language, Theme, Notifications, Profile) */}
        <div className="flex items-center gap-2">
          {/* Security & Test Lab Button */}
          <button
            onClick={() => setIsTestLabOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-emerald-300/60 dark:border-emerald-800/80 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 text-xs font-semibold transition-colors"
            title="Open Auth & Security Test Lab"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span className="hidden md:inline">টেস্ট ল্যাব</span>
          </button>

          {/* Supabase Cloud Status Button */}
          <button
            onClick={() => setIsSupabaseModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors"
            title="Supabase ক্লাউড স্ট্যাটাস ও সিঙ্ক"
          >
            <Database className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">ক্লাউড সিঙ্ক</span>
          </button>

          {/* Notification Button */}
          <div className="relative">
            <button
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors relative"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-600" />
            </button>

            {/* Notification Drawer */}
            {isNotificationsOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-3 z-50 text-xs animate-fade-in">
                <div className="font-bold text-slate-800 dark:text-slate-200 mb-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                  বিজ্ঞপ্তি ও সিস্টেম স্ট্যাটাস
                </div>
                <div className="space-y-2">
                  <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 text-[11px]">
                    ✓ স্টেপ ১ এর স্বাধীন শপ অথেনটিকেশন ও কাস্টম ব্র্যান্ডিং সক্রিয় রয়েছে।
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 text-[11px]">
                    ℹ️ পরবর্তী স্টেপ ২-এ পিওএস টার্মিনাল ও পণ্য ক্যাটালগ উন্মুক্ত হবে।
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Language Switcher */}
          <button
            onClick={() => setLanguage(language === 'bn' ? 'en' : 'bn')}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Languages className="w-3.5 h-3.5 text-emerald-600" />
            <span>{language === 'bn' ? 'EN' : 'বাং'}</span>
          </button>

          {/* Theme Switcher */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-300"
            title="Toggle Theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          {/* User Profile / Logout Menu */}
          <div className="relative">
            <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="flex items-center gap-1.5 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="w-7 h-7 rounded-lg bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 flex items-center justify-center font-bold text-xs">
                ম
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isProfileMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-2 z-50 text-xs animate-fade-in">
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                  <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">
                    {currentShop.name}
                  </span>
                  <span className="text-[10px] text-slate-400 block font-mono">
                    {currentProfile?.mobileNumber}
                  </span>
                </div>

                <button
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    onNavigate('settings');
                  }}
                  className="w-full flex items-center gap-2 p-2 rounded-xl text-left hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  <span>{t('navSettings')}</span>
                </button>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 p-2 rounded-xl text-left text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{t('logout')}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ---------------- MAIN LAYOUT: SIDEBAR + CONTENT ---------------- */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar (250px) */}
        <aside className="hidden lg:flex w-64 flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
          <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isSelected = currentModule === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>

                  {!item.active && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                      }`}
                    >
                      ধাপ {item.step}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Sidebar Footer info */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>{t('appName')}</span>
            <span className="font-mono text-emerald-600 font-bold">ফেজ ১</span>
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm">
            <div className="w-72 bg-white dark:bg-slate-900 h-full flex flex-col p-4 shadow-2xl">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-3">
                <span className="font-bold text-sm">{currentShop.name}</span>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1 rounded-lg text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-1 flex-1 overflow-y-auto">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isSelected = currentModule === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onNavigate(item.id);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold ${
                        isSelected
                          ? 'bg-emerald-600 text-white font-bold'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </div>
                      {!item.active && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-400">
                          ধাপ {item.step}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 p-2 rounded-xl text-xs font-semibold text-rose-600"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{t('logout')}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Viewport Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>

      {/* Add New Shop Modal */}
      {isNewShopModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="w-full max-w-xl my-8 relative">
            <button
              onClick={() => setIsNewShopModalOpen(false)}
              className="absolute -top-10 right-0 text-white hover:text-slate-300"
            >
              <X className="w-6 h-6" />
            </button>
            <SignupWizard
              onSuccess={() => setIsNewShopModalOpen(false)}
              onSwitchToLogin={() => setIsNewShopModalOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Mandatory Test Lab Modal */}
      <AuthTestLab
        isOpen={isTestLabOpen}
        onClose={() => setIsTestLabOpen(false)}
      />

      {/* Supabase Status & Cloud Sync Modal */}
      <SupabaseStatusModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
      />
    </div>
  );
};
