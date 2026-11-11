import React, { useState } from 'react';
import { Store, ShieldCheck, Sparkles, Check, ArrowRight, Zap, Smartphone, Database, BarChart3, Users, Printer, Bot, Award, ChevronRight } from 'lucide-react';
import { BUSINESS_CATEGORIES } from '../../utils/categories';

interface SaaSVisitorLandingProps {
  onOpenLogin: () => void;
  onOpenSignup: () => void;
  onEnterDemo: () => void;
}

export const SaaSVisitorLanding: React.FC<SaaSVisitorLandingProps> = ({
  onOpenLogin,
  onOpenSignup,
  onEnterDemo
}) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-blue-700 flex items-center justify-center text-white shadow-md shadow-sky-600/20">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-sky-600 to-blue-700 bg-clip-text text-transparent">
                MoSaFa Shop Manager
              </span>
              <span className="block text-[10px] font-mono text-slate-400 -mt-1">Tools.MoSaFaBD.Com</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600 dark:text-slate-300">
            <a href="#features" className="hover:text-sky-600 transition-colors">ফিচারসমূহ</a>
            <a href="#categories" className="hover:text-sky-600 transition-colors">১৬টি ব্যবসা ক্যাটাগরি</a>
            <a href="#pricing" className="hover:text-sky-600 transition-colors">মূল্য তালিকা (Pricing)</a>
            <a href="#offline" className="hover:text-sky-600 transition-colors">অফলাইন PWA</a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={onOpenLogin}
              className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-sky-600 transition-colors"
            >
              লগইন
            </button>
            <button
              onClick={onOpenSignup}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold shadow-sm transition-all"
            >
              দোকান খুলুন
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 text-xs font-semibold mb-6">
            <Sparkles className="w-3.5 h-3.5 text-sky-600" />
            <span>বাংলাদেশী খুচরা ও পাইকারি ব্যবসার জন্য নং ১ ক্লাউড ও অফলাইন প্ল্যাটফর্ম</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-white max-w-4xl mx-auto leading-tight">
            আপনার দোকান, আপনার হিসাব <br />
            <span className="bg-gradient-to-r from-sky-600 to-blue-700 bg-clip-text text-transparent">
              স্মার্ট পিওএস ও এআই ম্যানেজমেন্ট
            </span>
          </h1>

          <p className="mt-6 text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            মোবাইল শপ, ফার্মেসি, মুদি দোকান, রেস্তোরাঁ ও কাপড়ের ব্যবসা সহ যেকোনো প্রতিষ্ঠানের জন্য সম্পূর্ণ স্বাধীন হিসাব খাতা। ইন্টারনেট ছাড়াও চলে সম্পূর্ণ অফলাইনে।
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onOpenSignup}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-base shadow-lg shadow-sky-600/25 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5"
            >
              <span>ফ্রি অ্যাকাউন্ট খুলুন</span>
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={onEnterDemo}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-bold text-base hover:bg-slate-50 dark:hover:bg-slate-800/80 flex items-center justify-center gap-2 transition-all"
            >
              <Zap className="w-5 h-5 text-amber-500" />
              <span>লাইভ ডেমো দেখুন (Instant)</span>
            </button>
          </div>

          <div className="mt-8 flex items-center justify-center gap-6 text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-600" /> ক্রেডিট কার্ড লাগবে না</span>
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-600" /> অফলাইন-ফার্স্ট PWA সাপোর্ট</span>
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-600" /> সম্পূর্ণ ডাটা এনক্রিপশন</span>
          </div>
        </div>
      </section>

      {/* 16 Business Categories Section */}
      <section id="categories" className="py-16 bg-white dark:bg-slate-900/60 border-y border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-extrabold tracking-tight">১৬টি ব্যবসার জন্য বিশেষভাবে উপযোগী</h2>
            <p className="text-slate-500 text-sm mt-2">আপনার ব্যবসার ধরণ অনুযায়ী সিস্টেম স্বয়ংক্রিয়ভাবে ফিচার ও মডিউল অ্যাডাপ্ট করে</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
            {BUSINESS_CATEGORIES.map((cat) => {
              const emojiMap: Record<string, string> = {
                general_store: '🏪',
                mobile_shop: '📱',
                computer_shop: '💻',
                grocery_store: '🛒',
                clothing_store: '👔',
                cosmetics_shop: '✨',
                electronics_shop: '⚡',
                stationery_shop: '📚',
                pharmacy: '💊',
                other: '🏬'
              };
              return (
                <div
                  key={cat.id}
                  className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/60 text-center hover:border-sky-500 hover:shadow-xs transition-all group"
                >
                  <div className="text-2xl mb-1.5 group-hover:scale-110 transition-transform">{emojiMap[cat.id] || '🏬'}</div>
                  <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 line-clamp-1">{cat.nameBn}</h4>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Core Features Grid */}
      <section id="features" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl font-black tracking-tight">একটি প্ল্যাটফর্মে আপনার পুরো ব্যবসার সমাধান</h2>
          <p className="text-slate-500 text-sm mt-2">আলাদা সফটওয়্যার বা রেজিস্টার খাতার ঝামেলা ছাড়াই সবকিছু এক ক্লিকে</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="w-12 h-12 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 flex items-center justify-center">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg">সুপারফাস্ট POS ও ইনভয়েস</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              বারকোড স্ক্যানার দিয়ে চোখের পলকে বিল। 58mm ও 80mm থার্মাল রিসিট প্রিন্ট। ক্যাশ, বিকাশ, নগদ, রকেটে স্প্লিট পেমেন্ট।
            </p>
          </div>

          <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
              <Database className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg">অফলাইন-ফার্স্ট টেকনোলজি</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              ইন্টারনেট চলে গেলেও বিল ও হিসাব বন্ধ হবে না। সংযোগ ফিরলে ব্যাকগ্রাউন্ডে স্বয়ংক্রিয়ভাবে ক্লাউড ডাটাবেজে সিঙ্ক হয়ে যাবে।
            </p>
          </div>

          <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
              <Bot className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg">MoSaFa AI বিজনেস এজেন্ট</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Gemini 2.5 চালিত ব্যক্তিগত এআই অ্যাসিস্ট্যান্ট। বাংলায় প্রশ্ন করে জানুন গত সপ্তাহের সবচেয়ে লাভজনক পণ্য বা বাকি আদায়ের উপায়।
            </p>
          </div>

          <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
              <Smartphone className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg">মোবাইল শপ IMEI ও ওয়ারেন্টি</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              ডুয়াল IMEI ও সিরিয়াল নম্বর ট্র্যাকিং। কাস্টমারকে ডিজিটাল ওয়ারেন্টি কার্ড প্রদান ও ক্লেইম রেজিস্টার।
            </p>
          </div>

          <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center">
              <Printer className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg">ডকুমেন্ট স্টুডিও ও ভিজিটিং কার্ড</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              লোগো ও QR কোডসহ ভিজিটিং কার্ড, কোটেশন লেটার এবং ডেলিভারি চালান নিমিষেই জেনারেট এবং ডাউনলোড করুন।
            </p>
          </div>

          <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="w-12 h-12 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center">
              <BarChart3 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg">ক্যাশ বুক ও দৈনিক ক্লোজিং</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              ক্যাশ ইন হ্যান্ড, ব্যাংক ও এমএফএস ব্যালেন্স আলাদা ট্র্যাক করুন। ৯টি ক্যাটাগরির খরচ হিসাব এবং এক্সেল এক্সপোর্ট।
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-slate-100 dark:bg-slate-900/40 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-black tracking-tight">সহজ ও সাশ্রয়ী প্যাকেজ</h2>
            <p className="text-slate-500 text-sm mt-2">কোনো গোপন চার্জ নেই। যেকোনো সময় আপগ্রেড বা বাতিল করার সুবিধা।</p>

            <div className="mt-6 inline-flex p-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  billingCycle === 'monthly' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                মাসিক
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  billingCycle === 'yearly' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                বাৎসরিক (২ মাস ফ্রি 🎉)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Starter Plan */}
            <div className="p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="text-xl font-bold">Starter (ফ্রি)</h3>
                <p className="text-xs text-slate-500 mt-1">ছোট ও নতুন দোকানের জন্য আজীবন ফ্রি</p>
                <div className="mt-4 mb-6">
                  <span className="text-4xl font-extrabold font-mono">৳০</span>
                  <span className="text-xs text-slate-400"> /আজীবন</span>
                </div>
                <ul className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> ১০০টি প্রোডাক্ট ও স্টক লিমিট</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> অফলাইন পিওএস ও ক্যাশ বুক</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> ইনভয়েস প্রিন্ট (58mm, 80mm)</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> কাস্টমার বাকি খাতা</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> ২ জন কর্মচারী অ্যাক্সেস</li>
                </ul>
              </div>
              <button
                onClick={onOpenSignup}
                className="mt-8 w-full py-3 rounded-xl border border-slate-300 dark:border-slate-700 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                ফ্রি শুরু করুন
              </button>
            </div>

            {/* Pro Plan (Highlighted) */}
            <div className="p-8 bg-gradient-to-b from-sky-50 to-white dark:from-slate-800 dark:to-slate-900 rounded-2xl border-2 border-sky-500 shadow-xl flex flex-col justify-between relative">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-sky-600 to-blue-700 text-white text-xs font-bold tracking-wide uppercase shadow-sm">
                সবচেয়ে জনপ্রিয়
              </div>
              <div>
                <h3 className="text-xl font-bold text-sky-900 dark:text-sky-300">Pro (বিজনেস)</h3>
                <p className="text-xs text-slate-500 mt-1">বিকাশমান ব্যবসার পূর্ণাঙ্গ স্বয়ংক্রিয় ম্যানেজমেন্ট</p>
                <div className="mt-4 mb-6">
                  <span className="text-4xl font-extrabold font-mono text-sky-700 dark:text-sky-400">
                    ৳{billingCycle === 'monthly' ? '৫৯৯' : '৫,৯৯০'}
                  </span>
                  <span className="text-xs text-slate-400"> /{billingCycle === 'monthly' ? 'মাস' : 'বছর'}</span>
                </div>
                <ul className="space-y-3 text-xs text-slate-700 dark:text-slate-200">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-sky-600 font-bold" /> ৫,০০০টি প্রোডাক্ট লিমিট</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-sky-600 font-bold" /> মোবাইল IMEI ও ওয়ারেন্টি ট্র্যাকার</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-sky-600 font-bold" /> টেলিকম রিচার্জ ও কমিশন খাতা</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-sky-600 font-bold" /> ডকুমেন্ট স্টুডিও ও ভিজিটিং কার্ড মেকার</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-sky-600 font-bold" /> MoSaFa AI বিজনেস এজেন্ট আনলিমিটেড</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-sky-600 font-bold" /> ক্লাউড ডাটা ব্যাকআপ ও রিস্টোর</li>
                </ul>
              </div>
              <button
                onClick={onOpenSignup}
                className="mt-8 w-full py-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm shadow-md transition-colors"
              >
                প্রো ট্রায়াল শুরু করুন
              </button>
            </div>

            {/* Enterprise Plan */}
            <div className="p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="text-xl font-bold">Enterprise (মাল্টি-ব্রাঞ্চ)</h3>
                <p className="text-xs text-slate-500 mt-1">একাধিক শাখা ও বড় পাইকারি ডিস্ট্রিবিউশন</p>
                <div className="mt-4 mb-6">
                  <span className="text-4xl font-extrabold font-mono">
                    ৳{billingCycle === 'monthly' ? '১,৪৯৯' : '১৪,৯৯০'}
                  </span>
                  <span className="text-xs text-slate-400"> /{billingCycle === 'monthly' ? 'মাস' : 'বছর'}</span>
                </div>
                <ul className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> আনলিমিটেড প্রোডাক্ট ও সেলস</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> মাল্টি-ব্রাঞ্চ সেন্ট্রাল সিঙ্ক</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> নিজস্ব কাস্টম ব্র্যান্ডিং ও ডোমেইন</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> অগ্রাধিকারভিত্তিক ২৪/৭ ভিআইপি সাপোর্ট</li>
                </ul>
              </div>
              <button
                onClick={onOpenSignup}
                className="mt-8 w-full py-3 rounded-xl border border-slate-300 dark:border-slate-700 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                যোগাযোগ করুন
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 text-sm border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <span className="font-extrabold text-white text-base">MoSaFa Shop Manager</span>
            <p className="text-xs text-slate-500 mt-1">MoSaFa Tools Ecosystem • Tools.MoSaFaBD.Com</p>
          </div>
          <div className="flex items-center gap-6 text-xs">
            <a href="#features" className="hover:text-white transition-colors">ফিচার</a>
            <a href="#pricing" className="hover:text-white transition-colors">প্রাইসিং</a>
            <button onClick={onOpenLogin} className="hover:text-white transition-colors">লগইন</button>
            <button onClick={onEnterDemo} className="hover:text-white transition-colors">ডেমো একাউন্ট</button>
          </div>
          <div className="text-xs text-slate-500">
            © {new Date().getFullYear()} MoSaFa. সর্বস্বত্ব সংরক্ষিত।
          </div>
        </div>
      </footer>
    </div>
  );
};
