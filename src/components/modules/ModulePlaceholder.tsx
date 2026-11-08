/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
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
  Clock,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface ModulePlaceholderProps {
  moduleKey: string;
  onGoBack: () => void;
}

interface ModuleInfo {
  step: number;
  titleKey: string;
  icon: React.ReactNode;
  descriptionBn: string;
  features: string[];
}

const MODULE_DEFINITIONS: Record<string, ModuleInfo> = {
  pos: {
    step: 2,
    titleKey: 'navPos',
    icon: <Receipt className="w-8 h-8 text-emerald-600" />,
    descriptionBn: 'সম্পূর্ণ টাচস্ক্রিন পিওএস ও দ্রুত ক্যাশ বিলিং টার্মিনাল',
    features: [
      'বারকোড স্ক্যানার ও কিবোর্ড শর্টকাট বিলিং',
      'আইটেম ভিত্তিক ডিসকাউন্ট ও ভ্যাট হিসাব',
      'ক্যাশ, কার্ড ও মোবাইল ওয়ালেট (bKash/Nagad) স্প্লিট পেমেন্ট',
      '৫৮মিমি ও ৮০মিমি থার্মাল ব্লুটুথ/ইউএসবি রশিদ প্রিন্টিং',
    ],
  },
  products: {
    step: 2,
    titleKey: 'navProducts',
    icon: <Boxes className="w-8 h-8 text-blue-600" />,
    descriptionBn: 'পণ্য ক্যাটালগ ও ভ্যারিয়েন্ট ম্যানেজমেন্ট',
    features: [
      'বারকোড অটো-জেনারেটর ও লেবেল প্রিন্টার',
      'সাইজ, রঙ ও ব্র্যান্ড ভিত্তিক ভ্যারিয়েন্ট',
      'ক্রয় ও বিক্রয় মূল্য নির্ধারণ ও হোলসেল রেট',
      'ক্যাটাগরি ও সাব-ক্যাটাগরি ফিল্টারিং',
    ],
  },
  inventory: {
    step: 3,
    titleKey: 'navInventory',
    icon: <Warehouse className="w-8 h-8 text-amber-600" />,
    descriptionBn: 'রিয়েলটাইম স্টক ট্র্যাকিং ও লো-স্টক ওয়ার্নিং',
    features: [
      'স্বয়ংক্রিয় স্টক কমে যাওয়া ও সমন্বয় (Stock Adjustment)',
      'লো-স্টক অ্যালার্ট ও রি-অর্ডার লেভেল নির্ধারণ',
      'মাল্টি-গোডাউন ও শপ স্টক ট্রান্সফার',
      'পণ্য অপচয় ও ড্যামেজ লগ',
    ],
  },
  purchases: {
    step: 3,
    titleKey: 'navPurchases',
    icon: <ShoppingBag className="w-8 h-8 text-indigo-600" />,
    descriptionBn: 'সাপ্লায়ার ক্রয় আদেশ ও চালান এন্ট্রি',
    features: [
      'পারচেজ অর্ডার (PO) ও ইনভয়েস স্ক্যানিং',
      'সরবরাহকারীর বকেয়া ও দেনা ট্র্যাকিং',
      'পণ্য রিসিভিং ও স্টক অটো-আপডেট',
      'লট নম্বর ও মেয়াদোত্তীর্ণ তারিখ (Expiry Date) ট্র্যাকিং',
    ],
  },
  customers: {
    step: 4,
    titleKey: 'navCustomers',
    icon: <Users className="w-8 h-8 text-teal-600" />,
    descriptionBn: 'গ্রাহক খাতা, বাকি-বকেয়া ও লয়ালটি পয়েন্ট',
    features: [
      'গ্রাহকের মোবাইল নম্বর ও বাকি খাতা',
      'এসএমএস বাকি তাগাদা ও পেমেন্ট রিসিট',
      'লয়ালটি রিওয়ার্ড ও ডিসকাউন্ট পয়েন্ট',
      'সর্বোচ্চ ক্রেতা ও পারচেজ হিস্ট্রি',
    ],
  },
  suppliers: {
    step: 4,
    titleKey: 'navSuppliers',
    icon: <Truck className="w-8 h-8 text-purple-600" />,
    descriptionBn: 'সরবরাহকারী লেজার ও পেমেন্ট হিস্ট্রি',
    features: [
      'ডিলার ও ভেন্ডর প্রোফাইল তৈরি',
      'চলতি দেনা ও বিল পরিশোধ শিডিউল',
      'ব্যাংক ও ক্যাশ পেমেন্ট রেকর্ড',
    ],
  },
  expenses: {
    step: 4,
    titleKey: 'navExpenses',
    icon: <DollarSign className="w-8 h-8 text-rose-600" />,
    descriptionBn: 'দোকানের যাবতীয় দৈনন্দিন খরচ হিসাব',
    features: [
      'দোকান ভাড়া, বিদ্যুৎ বিল, কর্মচারীর নাস্তা ইত্যাদি ক্যাটাগরি',
      'খরচের ভাউচার আপলোড',
      'মাসিক খরচ এনালাইসিস',
    ],
  },
  cashbook: {
    step: 4,
    titleKey: 'navCashbook',
    icon: <BookOpen className="w-8 h-8 text-orange-600" />,
    descriptionBn: 'দৈনিক ক্যাশ ইন ও ক্যাশ আউট ক্যাশবুক',
    features: [
      'সকালের ওপেনিং ক্যাশ ব্যালেন্স ও ড্রয়ার ক্লোজিং',
      'ক্যাশ, ব্যাংক ও বিকাশ ব্যালেন্স রিকনসিলিয়েশন',
      'দৈনিক লাভ-ক্ষতি সংক্ষিপ্ত বিবরণ',
    ],
  },
  returns: {
    step: 5,
    titleKey: 'navReturns',
    icon: <RotateCcw className="w-8 h-8 text-pink-600" />,
    descriptionBn: 'বিক্রয় ফেরত ও পারচেজ রিটার্ন প্রসেসিং',
    features: [
      'মূল ইনভয়েস বারকোড স্ক্যান করে দ্রুত ফেরত গ্রহণ',
      'ক্যাশ রিফান্ড অথবা স্টোর ক্রেডিট প্রদান',
      'ড্যামেজ প্রোডাক্ট সাপ্লায়ারকে ফেরত পাঠানো',
    ],
  },
  reports: {
    step: 5,
    titleKey: 'navReports',
    icon: <BarChart3 className="w-8 h-8 text-sky-600" />,
    descriptionBn: 'বাণিজ্যিক রিপোর্ট, ভ্যাট ও লাভ-ক্ষতির পূর্ণ হিসাব',
    features: [
      'দৈনিক, সাপ্তাহিক ও মাসিক বিক্রির গ্রাফ ও চার্ট',
      'নেট প্রফিট মার্জিন ও গ্রস মার্জিন রিপোর্ট',
      'সর্বাধিক বিক্রিত পণ্যের তালিকা',
      'এক্সেল ও পিডিএফ এক্সপোর্ট',
    ],
  },
  employees: {
    step: 5,
    titleKey: 'navEmployees',
    icon: <UserCheck className="w-8 h-8 text-emerald-600" />,
    descriptionBn: 'স্টাফ ও ক্যাশিয়ার রোল ও পারমিশন কন্ট্রোল',
    features: [
      'ক্যাশিয়ার, ম্যানেজার ও অ্যাকাউন্ট্যান্ট পদবি',
      'পৃথক ৬-সংখ্যার স্টাফ পিন ও লগইন একাউন্ট',
      'বিক্রির হিসাব ও ক্যাশ রেজিস্টার ট্র্যাকিং',
    ],
  },
};

export const ModulePlaceholder: React.FC<ModulePlaceholderProps> = ({
  moduleKey,
  onGoBack,
}) => {
  const { t } = useLanguage();
  const info = MODULE_DEFINITIONS[moduleKey] || {
    step: 2,
    titleKey: 'navDashboard',
    icon: <Clock className="w-8 h-8 text-slate-400" />,
    descriptionBn: 'এই মডিউলটি পরবর্তী ধাপে উন্মোচিত হবে।',
    features: [],
  };

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <div className="p-8 sm:p-10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center space-y-6">
        {/* Step Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-bold">
          <Clock className="w-3.5 h-3.5" />
          <span>পরিকল্পিত ফেজ: স্টেপ {info.step} অব ৫</span>
        </div>

        {/* Icon & Title */}
        <div className="space-y-3">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-inner">
            {info.icon}
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {t(info.titleKey as any)}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto">
            {info.descriptionBn}
          </p>
        </div>

        {/* Feature Preview List */}
        {info.features.length > 0 && (
          <div className="max-w-md mx-auto text-left p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2.5">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              স্টেপ {info.step}-এর অন্তর্ভুক্ত বৈশিষ্ট্যসমূহ:
            </h4>
            {info.features.map((feat, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                <span>{feat}</span>
              </div>
            ))}
          </div>
        )}

        {/* Notice on Foundation Integrity */}
        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 max-w-md mx-auto text-xs text-slate-500 flex items-center justify-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>স্টেপ ১ এর অথেনটিকেশন ও শপ আইসোলেশন দিয়ে এটি সুরক্ষিত থাকবে</span>
        </div>

        {/* Back Button */}
        <div>
          <button
            onClick={onGoBack}
            className="px-6 py-2.5 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-semibold text-xs rounded-xl transition-colors inline-flex items-center gap-2"
          >
            <span>ড্যাশবোর্ডে ফিরে যান</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
