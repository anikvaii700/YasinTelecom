/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type BusinessCategory =
  | 'general_store'
  | 'mobile_shop'
  | 'computer_shop'
  | 'grocery_store'
  | 'clothing_store'
  | 'cosmetics_shop'
  | 'electronics_shop'
  | 'stationery_shop'
  | 'pharmacy'
  | 'other';

export interface CategoryInfo {
  id: BusinessCategory;
  nameBn: string;
  nameEn: string;
  iconName: string;
  suggestedCategories: string[];
}

export interface Profile {
  id: string; // UUID
  mobileNumber: string; // Normalized (+8801XXXXXXXXX)
  isVerified: boolean;
  fullName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Shop {
  id: string; // UUID
  shopCode: string; // e.g. MSF-8102-01
  name: string;
  slug: string;
  category: BusinessCategory;
  mobileNumber: string; // Owner phone (+8801XXXXXXXXX)
  email?: string;
  address?: string;
  description?: string;
  logoUrl?: string; // base64 or storage url
  currency: string; // BDT default (৳)
  language: 'bn' | 'en';
  receiptHeader?: string;
  receiptFooter?: string;
  receiptFormat: '58mm' | '80mm' | 'a4';
  brandColor: string; // Hex color e.g. #059669
  welcomeText?: string;
  negativeStockPolicy?: 'allow' | 'block';
  defaultVatRate?: number;
  paymentMethodsConfig?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ShopMember {
  id: string;
  shopId: string;
  profileId: string;
  role: 'owner' | 'manager' | 'cashier';
  permissions: {
    all?: boolean;
    pos?: boolean;
    inventory?: boolean;
    reports?: boolean;
    settings?: boolean;
  };
  isActive: boolean;
  createdAt: string;
}

export interface ShopAuthSettings {
  id: string;
  shopId: string;
  pinHash: string; // PBKDF2 SHA-256 hash
  pinSalt: string; // Hex salt
  failedAttempts: number;
  lockedUntil: string | null; // ISO timestamp
  lastFailedAt: string | null;
  lastLoginAt: string | null;
  recoveryPhone?: string;
  updatedAt: string;
}

export interface ShopSession {
  id: string;
  sessionTokenHash: string;
  shopId: string;
  profileId: string;
  deviceInfo?: string;
  expiresAt: string;
  isRevoked: boolean;
  createdAt: string;
  lastActivityAt: string;
}

export interface AuditLog {
  id: string;
  shopId?: string;
  actorId?: string;
  action:
    | 'SIGNUP_SUCCESS'
    | 'LOGIN_SUCCESS'
    | 'LOGIN_FAILED'
    | 'LOCKOUT_TRIGGERED'
    | 'LOGOUT'
    | 'PIN_UPDATED'
    | 'SHOP_UPDATED'
    | 'LOGO_UPDATED'
    | 'LOGO_REMOVED'
    | 'SHOP_SWITCHED'
    | 'SALE_CREATED'
    | 'SALE_CANCELLED'
    | 'STOCK_ADJUSTED'
    | 'EXPENSE_RECORDED'
    | 'EMPLOYEE_PERMISSIONS_CHANGED'
    | 'RETURN_PROCESSED'
    | (string & {});
  details: Record<string, unknown>;
  createdAt: string;
}

export interface SignupFormData {
  mobileNumber: string;
  shopName: string;
  pin: string;
  confirmPin: string;
  category?: BusinessCategory;
}

export interface LoginFormData {
  mobileNumber: string;
  shopId: string;
  pin: string;
  rememberDevice: boolean;
}

export interface LockoutStatus {
  isLocked: boolean;
  remainingSeconds: number;
  lockedUntil: string | null;
  failedAttempts: number;
  maxAttempts: number;
}
