import React, { useState } from 'react';
import { CreditCard, FileText, Printer, Download, Sparkles, Building2, Phone, MapPin, Mail, Globe, Check } from 'lucide-react';
import type { Shop } from '../../types/auth';

interface DocumentStudioProps {
  shop: Shop;
}

export const DocumentStudio: React.FC<DocumentStudioProps> = ({ shop }) => {
  const [activeTab, setActiveTab] = useState<'card' | 'quotation' | 'chalan'>('card');
  const [cardTheme, setCardTheme] = useState<'navy' | 'emerald' | 'charcoal' | 'crimson'>('navy');

  // Business Card Customization State
  const [ownerName, setOwnerName] = useState(shop.ownerName || 'স্বত্বাধিকারী');
  const [designation, setDesignation] = useState('মালিক / ব্যবস্থাপনা পরিচালক');
  const [cardPhone, setCardPhone] = useState(shop.mobileNumber || '01700000000');
  const [altPhone, setAltPhone] = useState('01800000000');
  const [cardAddress, setCardAddress] = useState(shop.address || 'দোকান নং ১২, নিউ মার্কেট, ঢাকা');
  const [cardTagline, setCardTagline] = useState('পাইকারি ও খুচরা বিক্রেতা — সেরা মানে নির্ভরযোগ্য সেবা');

  // Quotation State
  const [quoteCustomer, setQuoteCustomer] = useState('মেসার্স হাসান এন্টারপ্রাইজ');
  const [quoteCustomerPhone, setQuoteCustomerPhone] = useState('01911223344');
  const [quoteDate, setQuoteDate] = useState(new Date().toISOString().slice(0, 10));
  const [quoteExpiry, setQuoteExpiry] = useState(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
  const [quoteItems, setQuoteItems] = useState([
    { id: '1', name: 'প্রিমিয়াম স্মার্টফোন এক্সেসরিজ সেট', qty: 10, price: 850 },
    { id: '2', name: 'ফাস্ট চার্জার অ্যাডাপ্টার 65W', qty: 20, price: 650 }
  ]);

  const quoteSubtotal = quoteItems.reduce((sum, item) => sum + item.qty * item.price, 0);

  const themeStyles = {
    navy: {
      bg: 'bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white',
      accent: 'text-amber-400',
      border: 'border-blue-800',
      tag: 'bg-blue-600/30 text-blue-200'
    },
    emerald: {
      bg: 'bg-gradient-to-br from-emerald-950 via-teal-900 to-slate-900 text-white',
      accent: 'text-emerald-300',
      border: 'border-emerald-800',
      tag: 'bg-emerald-600/30 text-emerald-200'
    },
    charcoal: {
      bg: 'bg-gradient-to-br from-neutral-900 via-stone-900 to-black text-white',
      accent: 'text-amber-300',
      border: 'border-stone-700',
      tag: 'bg-stone-800 text-amber-200'
    },
    crimson: {
      bg: 'bg-gradient-to-br from-rose-950 via-red-900 to-slate-900 text-white',
      accent: 'text-amber-300',
      border: 'border-rose-800',
      tag: 'bg-rose-600/30 text-rose-200'
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Studio Header */}
      <div className="p-6 bg-gradient-to-r from-blue-700 via-sky-700 to-indigo-800 rounded-2xl text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-xs font-medium tracking-wide">
              Document Studio & Branding
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">ডকুমেন্ট স্টুডিও ও ব্রান্ডিং মেকার</h2>
          <p className="text-sky-100 text-sm mt-1 max-w-xl">
            আপনার দোকানের জন্য পেশাদার ভিজিটিং কার্ড, কোটেশন লেটার এবং ডেলিভারি চালান এক ক্লিকেই তৈরি এবং প্রিন্ট করুন।
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('card')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'card' ? 'bg-white text-blue-700 shadow-md' : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            ভিজিটিং কার্ড
          </button>
          <button
            onClick={() => setActiveTab('quotation')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'quotation' ? 'bg-white text-blue-700 shadow-md' : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            কোটেশন মেকার
          </button>
          <button
            onClick={() => setActiveTab('chalan')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'chalan' ? 'bg-white text-blue-700 shadow-md' : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            ডেলিভারি চালান
          </button>
        </div>
      </div>

      {/* Tab 1: Visiting Card Generator */}
      {activeTab === 'card' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Card Customization Controls */}
          <div className="lg:col-span-5 p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              কার্ড তথ্য সম্পাদনা
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">কার্ড থিম</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'navy', label: 'রয়েল ব্লু', color: 'bg-blue-900' },
                  { id: 'emerald', label: 'এমারেল্ড', color: 'bg-emerald-800' },
                  { id: 'charcoal', label: 'চারকোল', color: 'bg-stone-900' },
                  { id: 'crimson', label: 'ক্রিমসন', color: 'bg-rose-900' },
                ].map((th) => (
                  <button
                    key={th.id}
                    onClick={() => setCardTheme(th.id as any)}
                    className={`p-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                      cardTheme === th.id
                        ? 'border-sky-500 ring-2 ring-sky-500/20 text-sky-700 dark:text-sky-400'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <span className={`w-3 h-3 rounded-full ${th.color}`} />
                    <span>{th.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">মালিকের নাম</label>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">পদবী</label>
              <input
                type="text"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">প্রাথমিক মোবাইল</label>
                <input
                  type="text"
                  value={cardPhone}
                  onChange={(e) => setCardPhone(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">বিকল্প মোবাইল</label>
                <input
                  type="text"
                  value={altPhone}
                  onChange={(e) => setAltPhone(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">দোকানের ঠিকানা</label>
              <input
                type="text"
                value={cardAddress}
                onChange={(e) => setCardAddress(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">ট্যাগলাইন / স্লোগান</label>
              <input
                type="text"
                value={cardTagline}
                onChange={(e) => setCardTagline(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <button
              onClick={handlePrint}
              className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl text-sm shadow-xs transition-colors flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span>কার্ড প্রিন্ট / PDF সংরক্ষণ করুন</span>
            </button>
          </div>

          {/* Live Card Preview */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center space-y-6 p-6 bg-slate-100 dark:bg-slate-950/40 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="text-center">
              <span className="text-xs font-bold text-slate-500 tracking-wider uppercase">Live Business Card Preview (3.5" x 2")</span>
            </div>

            {/* Front Side */}
            <div
              className={`w-full max-w-md aspect-[1.75/1] rounded-2xl p-6 shadow-2xl relative overflow-hidden flex flex-col justify-between border ${themeStyles[cardTheme].border} ${themeStyles[cardTheme].bg}`}
            >
              {/* Top Row: Brand & Tagline */}
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center font-bold text-lg text-white border border-white/20">
                      {shop.name ? shop.name.charAt(0) : 'M'}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-xl tracking-tight leading-tight">{shop.name}</h4>
                      <p className={`text-xs font-medium ${themeStyles[cardTheme].accent}`}>{cardTagline}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${themeStyles[cardTheme].tag}`}>
                    {shop.shopCode || 'MS-SHOP'}
                  </span>
                </div>
              </div>

              {/* Middle Row: Person Details */}
              <div className="pt-2">
                <p className="text-lg font-bold text-white tracking-wide">{ownerName}</p>
                <p className="text-xs text-slate-300 font-medium">{designation}</p>
              </div>

              {/* Bottom Row: Contact & Address */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/15 text-[11px] text-slate-200">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="font-mono">{cardPhone}</span>
                  </div>
                  {altPhone && (
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <Phone className="w-3.5 h-3.5 text-amber-400 shrink-0 opacity-70" />
                      <span className="font-mono">{altPhone}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-1 text-right">
                  <div className="flex items-start justify-end gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{cardAddress}</span>
                  </div>
                </div>
              </div>

              {/* Decorative Watermark */}
              <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-white/5 rounded-full blur-2xl pointer-events-none" />
            </div>

            <p className="text-xs text-slate-500">
              💡 এটি A4 সাইজের কার্ড পেপারে বা ডাইরেক্ট কার্ড প্রিন্টারে প্রিন্ট করতে প্রস্তুত।
            </p>
          </div>
        </div>
      )}

      {/* Tab 2: Quotation Maker */}
      {activeTab === 'quotation' && (
        <div className="p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm max-w-3xl mx-auto space-y-6">
          <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-800 pb-6">
            <div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{shop.name}</h3>
              <p className="text-xs text-slate-500 mt-1">{shop.address || 'দোকান নং ১২, ঢাকা'}</p>
              <p className="text-xs text-slate-500">মোবাইল: {shop.mobileNumber || '017XXXXXXXX'}</p>
            </div>
            <div className="text-right">
              <span className="px-3 py-1 bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-bold rounded-lg text-xs uppercase tracking-wider">
                আনুষ্ঠানিক কোটেশন (Quotation)
              </span>
              <p className="text-xs font-mono text-slate-500 mt-2">QT-{Date.now().toString().slice(-6)}</p>
              <p className="text-xs text-slate-500">তারিখ: {quoteDate}</p>
              <p className="text-xs text-slate-500">মেয়াদ: {quoteExpiry}</p>
            </div>
          </div>

          {/* Client Details Input */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs">
            <div>
              <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">গ্রাহক / প্রতিষ্ঠানের নাম</label>
              <input
                type="text"
                value={quoteCustomer}
                onChange={(e) => setQuoteCustomer(e.target.value)}
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">গ্রাহকের মোবাইল নম্বর</label>
              <input
                type="text"
                value={quoteCustomerPhone}
                onChange={(e) => setQuoteCustomerPhone(e.target.value)}
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border rounded-lg text-sm font-mono"
              />
            </div>
          </div>

          {/* Quotation Table */}
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 font-semibold uppercase">
                <th className="py-2">বিবরণ (Item)</th>
                <th className="py-2 text-center">পরিমাণ</th>
                <th className="py-2 text-right">দর (৳)</th>
                <th className="py-2 text-right">মোট (৳)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {quoteItems.map((item) => (
                <tr key={item.id}>
                  <td className="py-3 font-medium text-slate-800 dark:text-slate-200">{item.name}</td>
                  <td className="py-3 text-center font-mono">{item.qty}</td>
                  <td className="py-3 text-right font-mono">৳{item.price.toLocaleString('bn-BD')}</td>
                  <td className="py-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                    ৳{(item.qty * item.price).toLocaleString('bn-BD')}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-300 dark:border-slate-700 font-bold">
                <td colSpan={3} className="py-3 text-right text-slate-700 dark:text-slate-300">সর্বমোট প্রাক্কলন:</td>
                <td className="py-3 text-right text-lg text-sky-700 dark:text-sky-400 font-mono">
                  ৳{quoteSubtotal.toLocaleString('bn-BD')}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Signatures */}
          <div className="pt-8 flex justify-between items-end text-xs text-slate-500">
            <div className="text-center">
              <div className="w-36 border-t border-slate-400 mb-1" />
              <p>গ্রাহকের সম্মতি ও স্বাক্ষর</p>
            </div>
            <div className="text-center">
              <div className="w-36 border-t border-slate-400 mb-1" />
              <p>কর্তৃপক্ষের স্বাক্ষর ও সিল</p>
            </div>
          </div>

          <button
            onClick={handlePrint}
            className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl text-sm shadow-xs transition-colors flex items-center justify-center gap-2"
          >
            <Printer className="w-4 h-4" />
            <span>কোটেশন প্রিন্ট / ডাউনলোড করুন</span>
          </button>
        </div>
      )}

      {/* Tab 3: Delivery Chalan */}
      {activeTab === 'chalan' && (
        <div className="p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm max-w-3xl mx-auto space-y-6">
          <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-800 pb-6">
            <div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{shop.name}</h3>
              <p className="text-xs text-slate-500 mt-1">{shop.address || 'দোকান নং ১২, ঢাকা'}</p>
            </div>
            <div className="text-right">
              <span className="px-3 py-1 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold rounded-lg text-xs uppercase tracking-wider">
                পণ্য ডেলিভারি চালান (Chalan)
              </span>
              <p className="text-xs font-mono text-slate-500 mt-2">CH-{Date.now().toString().slice(-6)}</p>
              <p className="text-xs text-slate-500">তারিখ: {new Date().toLocaleDateString('bn-BD')}</p>
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs space-y-2">
            <p className="font-semibold text-slate-700 dark:text-slate-300">প্রাপকের বিবরণ:</p>
            <p className="text-slate-600 dark:text-slate-400">নাম: {quoteCustomer}</p>
            <p className="text-slate-600 dark:text-slate-400">ফোন: {quoteCustomerPhone}</p>
            <p className="text-slate-600 dark:text-slate-400">ডেলিভারি মাধ্যম: কুরিয়ার / নিজস্ব পরিবহন</p>
          </div>

          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 font-semibold uppercase">
                <th className="py-2">ক্রমিক</th>
                <th className="py-2">পণ্যের বিবরণ</th>
                <th className="py-2 text-center">পরিমাণ / পিস</th>
                <th className="py-2 text-right">প্যাকিং অবস্থা</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {quoteItems.map((item, idx) => (
                <tr key={item.id}>
                  <td className="py-3 font-mono text-xs">{idx + 1}</td>
                  <td className="py-3 font-medium text-slate-800 dark:text-slate-200">{item.name}</td>
                  <td className="py-3 text-center font-mono font-bold">{item.qty} টি</td>
                  <td className="py-3 text-right text-xs text-emerald-600 font-medium">সম্পূর্ণ ইনট্যাক্ট ও সিলগালা</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="pt-8 flex justify-between items-end text-xs text-slate-500">
            <div className="text-center">
              <div className="w-36 border-t border-slate-400 mb-1" />
              <p>পণ্য গ্রহীতার স্বাক্ষর</p>
            </div>
            <div className="text-center">
              <div className="w-36 border-t border-slate-400 mb-1" />
              <p>বিতরণকারীর স্বাক্ষর</p>
            </div>
          </div>

          <button
            onClick={handlePrint}
            className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl text-sm shadow-xs transition-colors flex items-center justify-center gap-2"
          >
            <Printer className="w-4 h-4" />
            <span>চালান প্রিন্ট করুন</span>
          </button>
        </div>
      )}
    </div>
  );
};
