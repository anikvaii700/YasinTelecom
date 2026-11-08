/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Store,
  Shield,
  Languages,
  Moon,
  Sun,
  Lock,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { LoginView } from './LoginView';
import { SignupWizard } from './SignupWizard';

export const AuthPage: React.FC = () => {
  const { t, language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top Navbar */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm shadow-emerald-600/30">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight block leading-tight text-slate-900 dark:text-slate-100">
                {t('appName')}
              </span>
              <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium block">
                {t('tagline')}
              </span>
            </div>
          </div>

          {/* Quick Controls: Language & Theme */}
          <div className="flex items-center gap-2">
            {/* Language Switcher */}
            <button
              onClick={() => setLanguage(language === 'bn' ? 'en' : 'bn')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Change Language"
            >
              <Languages className="w-3.5 h-3.5 text-emerald-600" />
              <span>{language === 'bn' ? 'English' : 'বাংলা'}</span>
            </button>

            {/* Dark Mode Switcher */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-300"
              title={theme === 'dark' ? t('themeLight') : t('themeDark')}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 flex flex-col justify-center py-10 px-4 sm:px-6">
        <div className="max-w-xl mx-auto w-full mb-6">
          {/* Tab Switcher */}
          <div className="flex p-1 bg-slate-200/70 dark:bg-slate-800/80 rounded-xl mb-6">
            <button
              onClick={() => setActiveTab('login')}
              className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all ${
                activeTab === 'login'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {t('login')}
            </button>
            <button
              onClick={() => setActiveTab('signup')}
              className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all ${
                activeTab === 'signup'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {t('signup')}
            </button>
          </div>

          {/* Active Auth Component */}
          {activeTab === 'login' ? (
            <LoginView
              onSuccess={() => {}}
              onSwitchToSignup={() => setActiveTab('signup')}
            />
          ) : (
            <SignupWizard
              onSuccess={() => {}}
              onSwitchToLogin={() => setActiveTab('login')}
            />
          )}

          {/* Independent System Assurance Notice */}
          <div className="mt-8 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 text-center text-xs text-slate-500 dark:text-slate-400 space-y-1">
            <div className="flex items-center justify-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
              <Shield className="w-3.5 h-3.5 text-emerald-600" />
              <span>স্বাধীন শপ অথেনটিকেশন সিকিউরিটি আর্কিটেকচার</span>
            </div>
            <p className="max-w-md mx-auto text-[11px] leading-relaxed">
              {t('independentAppNotice')} ৬-সংখ্যার পিন কোনো ব্রাউজার স্টোরেজ বা লগ ফাইলে প্লেইনটেক্সট হিসেবে রাখা হয় না।
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-4 text-center text-xs text-slate-400">
        <p>© {new Date().getFullYear()} {t('appName')} · {t('tagline')}</p>
      </footer>
    </div>
  );
};
