/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BusinessCategory, CategoryInfo } from '../types/auth';

export const BUSINESS_CATEGORIES: CategoryInfo[] = [
  {
    id: 'general_store',
    nameBn: 'সাধারণ দোকান (General Store)',
    nameEn: 'General Store',
    iconName: 'Store',
    suggestedCategories: ['দৈনন্দিন পণ্য', 'স্ন্যাক্স ও বেভারেজ', 'টয়লেট্রিজ', 'অন্যান্য'],
  },
  {
    id: 'mobile_shop',
    nameBn: 'মোবাইল শপ ও এক্সেসরিজ (Mobile & Gadgets)',
    nameEn: 'Mobile & Accessories',
    iconName: 'Smartphone',
    suggestedCategories: ['স্মার্টফোন', 'চার্জার ও ক্যাবল', 'হেডফোন ও বাডস', 'পাওয়ার ব্যাংক', 'ব্যাক কভার'],
  },
  {
    id: 'computer_shop',
    nameBn: 'কম্পিউটার ও আইটি শপ (Computer & IT)',
    nameEn: 'Computer & IT Store',
    iconName: 'Monitor',
    suggestedCategories: ['ল্যাপটপ ও পিসি', 'কিবোর্ড ও মাউস', 'মনিটর', 'এসএসডি ও র‍্যাম', 'প্রিন্টার ও টোনার'],
  },
  {
    id: 'grocery_store',
    nameBn: 'সুপারশপ ও মুদি দোকান (Grocery & Mart)',
    nameEn: 'Grocery & Supermarket',
    iconName: 'ShoppingBag',
    suggestedCategories: ['চাল-ডাল-তেল', 'মসলা', 'দুগ্ধজাত পণ্য', 'প্যাকেটজাত খাদ্য', 'পরিষ্কারক সামগ্রী'],
  },
  {
    id: 'clothing_store',
    nameBn: 'গার্মেন্টস ও পোশাকের দোকান (Clothing & Fashion)',
    nameEn: 'Clothing & Garments',
    iconName: 'Shirt',
    suggestedCategories: ['পাঞ্জাবি ও কুর্তা', 'শার্ট ও টি-শার্ট', 'প্যান্ট ও ট্রাউজার', 'শাড়ি ও থ্রি-পিস', 'বাচ্চাদের পোশাক'],
  },
  {
    id: 'cosmetics_shop',
    nameBn: 'কসমেটিকস ও বিউটি শপ (Cosmetics & Beauty)',
    nameEn: 'Cosmetics & Beauty',
    iconName: 'Sparkles',
    suggestedCategories: ['স্কিন কেয়ার', 'হেয়ার কেয়ার', 'মেকআপ ও লিপস্টিক', 'সুগন্ধি ও পারফিউম', 'পারসোনাল কেয়ার'],
  },
  {
    id: 'electronics_shop',
    nameBn: 'ইলেকট্রনিক্স শপ (Electronics & Appliances)',
    nameEn: 'Electronics Store',
    iconName: 'Zap',
    suggestedCategories: ['টেলিভিশন', 'ফ্রিজ ও এসি', 'ফ্যান ও লাইট', 'ব্লেন্ডার ও ওভেন', 'ওয়্যারিং ক্যাবল'],
  },
  {
    id: 'stationery_shop',
    nameBn: 'স্টেশনারি ও বইয়ের দোকান (Stationery & Books)',
    nameEn: 'Stationery & Bookstore',
    iconName: 'BookOpen',
    suggestedCategories: ['খাতা ও ডায়েরি', 'কলম ও পেন্সিল', 'পাঠ্যবই ও উপন্যাস', 'আর্ট সাপ্লাই', 'অফিস স্টেশনারি'],
  },
  {
    id: 'pharmacy',
    nameBn: 'ফার্মেসি ও ঔষধের দোকান (Pharmacy & Medicine)',
    nameEn: 'Pharmacy & Drugstore',
    iconName: 'HeartPulse',
    suggestedCategories: ['ট্যাবলেট ও ক্যাপসুল', 'সিরাপ', 'ইনজেকশন ও স্যালাইন', 'সার্জিক্যাল সামগ্রী', 'বেবি ফুড'],
  },
  {
    id: 'other',
    nameBn: 'অন্যান্য খুচরা বা পাইকারি ব্যবসা (Other Retail)',
    nameEn: 'Other Retail Business',
    iconName: 'Grid',
    suggestedCategories: ['সাধারণ স্টক', 'বিশেষ পণ্য', 'সার্ভিস ও সেবা'],
  },
];

export function getCategoryInfo(category: BusinessCategory): CategoryInfo {
  return (
    BUSINESS_CATEGORIES.find((c) => c.id === category) || BUSINESS_CATEGORIES[0]
  );
}
