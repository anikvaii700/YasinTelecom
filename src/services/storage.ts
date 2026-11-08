/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AuditLog,
  BusinessCategory,
  LockoutStatus,
  Profile,
  Shop,
  ShopAuthSettings,
  ShopMember,
  ShopSession,
} from '../types/auth';
import {
  generateSalt,
  generateSessionToken,
  hashPin,
  hashSessionToken,
  verifyPin,
} from '../utils/crypto';
import { normalizeBDMobile } from '../utils/phone';
import {
  generateShopCode,
  LOCKOUT_DURATION_MS,
  MAX_PIN_FAILED_ATTEMPTS,
  slugifyShopName,
} from '../utils/pin';

const STORAGE_KEYS = {
  PROFILES: 'mosafa_pos_db_profiles',
  SHOPS: 'mosafa_pos_db_shops',
  MEMBERS: 'mosafa_pos_db_members',
  AUTH_SETTINGS: 'mosafa_pos_db_auth_settings',
  SESSIONS: 'mosafa_pos_db_sessions',
  AUDIT_LOGS: 'mosafa_pos_db_audit_logs',
  CURRENT_SESSION_TOKEN: 'mosafa_pos_active_token',
  CURRENT_SHOP_ID: 'mosafa_pos_active_shop_id',
};

// Safe JSON Helpers
function getItem<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch (e) {
    console.error(`Error reading ${key} from storage:`, e);
    return defaultValue;
  }
}

function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error writing ${key} to storage:`, e);
  }
}

/**
 * Initializes default demo data if completely blank
 */
export async function initializeStorageDefaults(): Promise<void> {
  const existingShops = getItem<Shop[]>(STORAGE_KEYS.SHOPS, []);
  if (existingShops.length > 0) return;

  const defaultPhone = '+8801712345678';
  const profileId = crypto.randomUUID();
  const shopId = crypto.randomUUID();

  const profile: Profile = {
    id: profileId,
    mobileNumber: defaultPhone,
    isVerified: true,
    fullName: 'মোসাফা শপ অ্যাডমিন',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const shop: Shop = {
    id: shopId,
    shopCode: 'MSF-1001-01',
    name: 'মোসাফা ফ্যাশন ও ভ্যারাইটিজ',
    slug: 'mosafa-fashion',
    category: 'clothing_store',
    mobileNumber: defaultPhone,
    email: 'admin@mosafapos.com',
    address: 'দোকান ১২, নিউ মার্কেট সুপার কমপ্লেক্স, ঢাকা-১২০৫',
    description: 'প্রিমিয়াম কোয়ালিটি পোশাক, এক্সেসরিজ ও লাইফস্টাইল সমাধান',
    currency: 'BDT',
    language: 'bn',
    receiptHeader: 'বিসমিল্লাহির রাহমানির রাহিম',
    receiptFooter: 'ধন্যবাদ, আবার আসবেন! আপনার সেবায় মোসাফা শপ।',
    receiptFormat: '80mm',
    brandColor: '#059669', // Emerald
    welcomeText: 'মোসাফা শপ পিওএস ড্যাশবোর্ডে স্বাগতম!',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const member: ShopMember = {
    id: crypto.randomUUID(),
    shopId,
    profileId,
    role: 'owner',
    permissions: { all: true },
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  // Demo PIN: "123098" (a valid 6-digit non-weak PIN)
  const salt = generateSalt();
  const pinHash = await hashPin('123098', salt);

  const authSetting: ShopAuthSettings = {
    id: crypto.randomUUID(),
    shopId,
    pinHash,
    pinSalt: salt,
    failedAttempts: 0,
    lockedUntil: null,
    lastFailedAt: null,
    lastLoginAt: null,
    updatedAt: new Date().toISOString(),
  };

  setItem(STORAGE_KEYS.PROFILES, [profile]);
  setItem(STORAGE_KEYS.SHOPS, [shop]);
  setItem(STORAGE_KEYS.MEMBERS, [member]);
  setItem(STORAGE_KEYS.AUTH_SETTINGS, [authSetting]);
  setItem(STORAGE_KEYS.AUDIT_LOGS, [
    {
      id: crypto.randomUUID(),
      shopId,
      actorId: profileId,
      action: 'SIGNUP_SUCCESS',
      details: { note: 'Initial demonstration store initialized' },
      createdAt: new Date().toISOString(),
    },
  ]);
}

// -----------------------------------------------------------------------------
// PROFILE & SHOP QUERIES
// -----------------------------------------------------------------------------

export function getProfileByPhone(phone: string): Profile | null {
  const normalized = normalizeBDMobile(phone);
  const profiles = getItem<Profile[]>(STORAGE_KEYS.PROFILES, []);
  return profiles.find((p) => p.mobileNumber === normalized) || null;
}

export function getProfileById(id: string): Profile | null {
  const profiles = getItem<Profile[]>(STORAGE_KEYS.PROFILES, []);
  return profiles.find((p) => p.id === id) || null;
}

export function getShopsByOwnerPhone(phone: string): Shop[] {
  const normalized = normalizeBDMobile(phone);
  const shops = getItem<Shop[]>(STORAGE_KEYS.SHOPS, []);
  return shops.filter((s) => s.mobileNumber === normalized && s.isActive);
}

export function getShopById(id: string): Shop | null {
  const shops = getItem<Shop[]>(STORAGE_KEYS.SHOPS, []);
  return shops.find((s) => s.id === id) || null;
}

export function getAllShops(): Shop[] {
  return getItem<Shop[]>(STORAGE_KEYS.SHOPS, []);
}

export function getShopAuthSetting(shopId: string): ShopAuthSettings | null {
  const settings = getItem<ShopAuthSettings[]>(STORAGE_KEYS.AUTH_SETTINGS, []);
  return settings.find((s) => s.shopId === shopId) || null;
}

export function updateShopAuthSetting(setting: ShopAuthSettings): void {
  const settings = getItem<ShopAuthSettings[]>(STORAGE_KEYS.AUTH_SETTINGS, []);
  const index = settings.findIndex((s) => s.shopId === setting.shopId);
  if (index >= 0) {
    settings[index] = setting;
  } else {
    settings.push(setting);
  }
  setItem(STORAGE_KEYS.AUTH_SETTINGS, settings);
}

export function addAuditLog(log: Omit<AuditLog, 'id' | 'createdAt'>): void {
  const logs = getItem<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, []);
  const entry: AuditLog = {
    ...log,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  logs.unshift(entry);
  // Keep last 200 logs
  if (logs.length > 200) logs.length = 200;
  setItem(STORAGE_KEYS.AUDIT_LOGS, logs);
}

export function getAuditLogs(shopId?: string): AuditLog[] {
  const logs = getItem<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, []);
  if (shopId) {
    return logs.filter((l) => l.shopId === shopId);
  }
  return logs;
}

// -----------------------------------------------------------------------------
// RATE LIMITING & LOCKOUT
// -----------------------------------------------------------------------------

export function checkShopLockout(shopId: string): LockoutStatus {
  const auth = getShopAuthSetting(shopId);
  if (!auth) {
    return {
      isLocked: false,
      remainingSeconds: 0,
      lockedUntil: null,
      failedAttempts: 0,
      maxAttempts: MAX_PIN_FAILED_ATTEMPTS,
    };
  }

  if (auth.lockedUntil) {
    const lockTime = new Date(auth.lockedUntil).getTime();
    const now = Date.now();
    if (lockTime > now) {
      const remainingSeconds = Math.ceil((lockTime - now) / 1000);
      return {
        isLocked: true,
        remainingSeconds,
        lockedUntil: auth.lockedUntil,
        failedAttempts: auth.failedAttempts,
        maxAttempts: MAX_PIN_FAILED_ATTEMPTS,
      };
    } else {
      // Lock expired, reset failed attempts
      auth.lockedUntil = null;
      auth.failedAttempts = 0;
      updateShopAuthSetting(auth);
    }
  }

  return {
    isLocked: false,
    remainingSeconds: 0,
    lockedUntil: null,
    failedAttempts: auth.failedAttempts || 0,
    maxAttempts: MAX_PIN_FAILED_ATTEMPTS,
  };
}

// -----------------------------------------------------------------------------
// REGISTRATION (CREATE SHOP ACCOUNT)
// -----------------------------------------------------------------------------

export async function registerNewShopAccount(data: {
  mobileNumber: string;
  shopName: string;
  pin: string;
  category?: BusinessCategory;
}): Promise<{ shop: Shop; profile: Profile; sessionToken: string }> {
  const normalizedPhone = normalizeBDMobile(data.mobileNumber);
  const trimmedName = data.shopName.trim();

  // Check duplicate shop under same mobile
  const owned = getShopsByOwnerPhone(normalizedPhone);
  const isDuplicate = owned.some(
    (s) => s.name.toLowerCase() === trimmedName.toLowerCase()
  );
  if (isDuplicate) {
    throw new Error('DUPLICATE_SHOP_NAME');
  }

  // Find or create profile
  let profile = getProfileByPhone(normalizedPhone);
  const profiles = getItem<Profile[]>(STORAGE_KEYS.PROFILES, []);

  if (!profile) {
    profile = {
      id: crypto.randomUUID(),
      mobileNumber: normalizedPhone,
      isVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    profiles.push(profile);
    setItem(STORAGE_KEYS.PROFILES, profiles);
  }

  // Create shop
  const shopId = crypto.randomUUID();
  const shopCode = generateShopCode(owned.length);
  const slug = slugifyShopName(trimmedName);

  const newShop: Shop = {
    id: shopId,
    shopCode,
    name: trimmedName,
    slug,
    category: data.category || 'general_store',
    mobileNumber: normalizedPhone,
    currency: 'BDT',
    language: 'bn',
    receiptHeader: 'বিসমিল্লাহির রাহমানির রাহিম',
    receiptFooter: 'ধন্যবাদ, আবার আসবেন!',
    receiptFormat: '80mm',
    brandColor: '#059669',
    welcomeText: `${trimmedName}-এ স্বাগতম!`,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const shops = getItem<Shop[]>(STORAGE_KEYS.SHOPS, []);
  shops.push(newShop);
  setItem(STORAGE_KEYS.SHOPS, shops);

  // Create membership
  const member: ShopMember = {
    id: crypto.randomUUID(),
    shopId,
    profileId: profile.id,
    role: 'owner',
    permissions: { all: true },
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  const members = getItem<ShopMember[]>(STORAGE_KEYS.MEMBERS, []);
  members.push(member);
  setItem(STORAGE_KEYS.MEMBERS, members);

  // Securely hash 6-digit PIN with salt
  const salt = generateSalt();
  const pinHash = await hashPin(data.pin, salt);

  const authSetting: ShopAuthSettings = {
    id: crypto.randomUUID(),
    shopId,
    pinHash,
    pinSalt: salt,
    failedAttempts: 0,
    lockedUntil: null,
    lastFailedAt: null,
    lastLoginAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  updateShopAuthSetting(authSetting);

  // Create active session
  const sessionToken = generateSessionToken();
  const tokenHash = await hashSessionToken(sessionToken);

  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days
  const session: ShopSession = {
    id: crypto.randomUUID(),
    sessionTokenHash: tokenHash,
    shopId,
    profileId: profile.id,
    deviceInfo: navigator.userAgent,
    expiresAt,
    isRevoked: false,
    createdAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
  };

  const sessions = getItem<ShopSession[]>(STORAGE_KEYS.SESSIONS, []);
  sessions.push(session);
  setItem(STORAGE_KEYS.SESSIONS, sessions);

  // Save active session token and shop
  localStorage.setItem(STORAGE_KEYS.CURRENT_SESSION_TOKEN, sessionToken);
  localStorage.setItem(STORAGE_KEYS.CURRENT_SHOP_ID, shopId);

  addAuditLog({
    shopId,
    actorId: profile.id,
    action: 'SIGNUP_SUCCESS',
    details: { shopCode, shopName: trimmedName },
  });

  return { shop: newShop, profile, sessionToken };
}

// -----------------------------------------------------------------------------
// LOGIN WITH PIN & RATE LIMITING
// -----------------------------------------------------------------------------

export async function loginShopAccount(params: {
  mobileNumber: string;
  shopId: string;
  pin: string;
  rememberDevice: boolean;
}): Promise<{ shop: Shop; profile: Profile; sessionToken: string }> {
  const normalizedPhone = normalizeBDMobile(params.mobileNumber);
  const profile = getProfileByPhone(normalizedPhone);
  if (!profile) {
    throw new Error('INVALID_CREDENTIALS');
  }

  const shop = getShopById(params.shopId);
  if (!shop || shop.mobileNumber !== normalizedPhone) {
    throw new Error('INVALID_CREDENTIALS');
  }

  // Check lockout
  const lockout = checkShopLockout(shop.id);
  if (lockout.isLocked) {
    throw new Error(`ACCOUNT_LOCKED:${lockout.remainingSeconds}`);
  }

  const auth = getShopAuthSetting(shop.id);
  if (!auth) {
    throw new Error('AUTH_CONFIGURATION_MISSING');
  }

  // Verify PIN securely using PBKDF2 and constant-time check
  const isMatch = await verifyPin(params.pin, auth.pinSalt, auth.pinHash);

  if (!isMatch) {
    auth.failedAttempts = (auth.failedAttempts || 0) + 1;
    auth.lastFailedAt = new Date().toISOString();

    if (auth.failedAttempts >= MAX_PIN_FAILED_ATTEMPTS) {
      // Trigger 15 min lockout
      const lockUntilDate = new Date(Date.now() + LOCKOUT_DURATION_MS).toISOString();
      auth.lockedUntil = lockUntilDate;
      updateShopAuthSetting(auth);

      addAuditLog({
        shopId: shop.id,
        actorId: profile.id,
        action: 'LOCKOUT_TRIGGERED',
        details: { attempts: auth.failedAttempts, lockedUntil: lockUntilDate },
      });

      throw new Error(`ACCOUNT_LOCKED:${Math.ceil(LOCKOUT_DURATION_MS / 1000)}`);
    } else {
      updateShopAuthSetting(auth);
      const remaining = MAX_PIN_FAILED_ATTEMPTS - auth.failedAttempts;

      addAuditLog({
        shopId: shop.id,
        actorId: profile.id,
        action: 'LOGIN_FAILED',
        details: { attempts: auth.failedAttempts, remaining },
      });

      throw new Error(`INVALID_PIN:${remaining}`);
    }
  }

  // Success: Reset failed attempts & clear lockout
  auth.failedAttempts = 0;
  auth.lockedUntil = null;
  auth.lastLoginAt = new Date().toISOString();
  updateShopAuthSetting(auth);

  // Generate session token
  const sessionToken = generateSessionToken();
  const tokenHash = await hashSessionToken(sessionToken);

  const durationDays = params.rememberDevice ? 30 : 1;
  const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();

  const session: ShopSession = {
    id: crypto.randomUUID(),
    sessionTokenHash: tokenHash,
    shopId: shop.id,
    profileId: profile.id,
    deviceInfo: navigator.userAgent,
    expiresAt,
    isRevoked: false,
    createdAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
  };

  const sessions = getItem<ShopSession[]>(STORAGE_KEYS.SESSIONS, []);
  sessions.push(session);
  setItem(STORAGE_KEYS.SESSIONS, sessions);

  localStorage.setItem(STORAGE_KEYS.CURRENT_SESSION_TOKEN, sessionToken);
  localStorage.setItem(STORAGE_KEYS.CURRENT_SHOP_ID, shop.id);

  addAuditLog({
    shopId: shop.id,
    actorId: profile.id,
    action: 'LOGIN_SUCCESS',
    details: { rememberDevice: params.rememberDevice },
  });

  return { shop, profile, sessionToken };
}

// -----------------------------------------------------------------------------
// VERIFY ACTIVE SESSION
// -----------------------------------------------------------------------------

export async function verifyCurrentSession(): Promise<{
  shop: Shop;
  profile: Profile;
  member: ShopMember;
} | null> {
  const token = localStorage.getItem(STORAGE_KEYS.CURRENT_SESSION_TOKEN);
  const shopId = localStorage.getItem(STORAGE_KEYS.CURRENT_SHOP_ID);
  if (!token || !shopId) return null;

  const tokenHash = await hashSessionToken(token);
  const sessions = getItem<ShopSession[]>(STORAGE_KEYS.SESSIONS, []);
  const session = sessions.find(
    (s) => s.sessionTokenHash === tokenHash && s.shopId === shopId && !s.isRevoked
  );

  if (!session) return null;

  // Check expiry
  if (new Date(session.expiresAt).getTime() < Date.now()) {
    session.isRevoked = true;
    setItem(STORAGE_KEYS.SESSIONS, sessions);
    return null;
  }

  // Update last activity
  session.lastActivityAt = new Date().toISOString();
  setItem(STORAGE_KEYS.SESSIONS, sessions);

  const shop = getShopById(shopId);
  const profile = getProfileById(session.profileId);
  const members = getItem<ShopMember[]>(STORAGE_KEYS.MEMBERS, []);
  const member = members.find(
    (m) => m.shopId === shopId && m.profileId === session.profileId && m.isActive
  );

  if (!shop || !profile || !member) return null;

  return { shop, profile, member };
}

// -----------------------------------------------------------------------------
// SWITCH ACTIVE SHOP
// -----------------------------------------------------------------------------

export async function switchActiveShop(
  targetShopId: string,
  profileId: string
): Promise<Shop> {
  const shop = getShopById(targetShopId);
  if (!shop) throw new Error('SHOP_NOT_FOUND');

  const members = getItem<ShopMember[]>(STORAGE_KEYS.MEMBERS, []);
  const isMember = members.some(
    (m) => m.shopId === targetShopId && m.profileId === profileId && m.isActive
  );
  if (!isMember) throw new Error('UNAUTHORIZED_SHOP_ACCESS');

  localStorage.setItem(STORAGE_KEYS.CURRENT_SHOP_ID, targetShopId);

  addAuditLog({
    shopId: targetShopId,
    actorId: profileId,
    action: 'SHOP_SWITCHED',
    details: { targetShopName: shop.name },
  });

  return shop;
}

// -----------------------------------------------------------------------------
// LOGOUT
// -----------------------------------------------------------------------------

export async function logoutCurrentSession(): Promise<void> {
  const token = localStorage.getItem(STORAGE_KEYS.CURRENT_SESSION_TOKEN);
  const shopId = localStorage.getItem(STORAGE_KEYS.CURRENT_SHOP_ID);

  if (token) {
    const tokenHash = await hashSessionToken(token);
    const sessions = getItem<ShopSession[]>(STORAGE_KEYS.SESSIONS, []);
    const session = sessions.find((s) => s.sessionTokenHash === tokenHash);
    if (session) {
      session.isRevoked = true;
      setItem(STORAGE_KEYS.SESSIONS, sessions);
      addAuditLog({
        shopId: session.shopId,
        actorId: session.profileId,
        action: 'LOGOUT',
        details: {},
      });
    }
  }

  localStorage.removeItem(STORAGE_KEYS.CURRENT_SESSION_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.CURRENT_SHOP_ID);
}

// -----------------------------------------------------------------------------
// UPDATE SHOP DETAILS & LOGO
// -----------------------------------------------------------------------------

export function updateShopProfile(updated: Partial<Shop> & { id: string }): Shop {
  const shops = getItem<Shop[]>(STORAGE_KEYS.SHOPS, []);
  const index = shops.findIndex((s) => s.id === updated.id);
  if (index === -1) throw new Error('SHOP_NOT_FOUND');

  const merged: Shop = {
    ...shops[index],
    ...updated,
    updatedAt: new Date().toISOString(),
  };

  shops[index] = merged;
  setItem(STORAGE_KEYS.SHOPS, shops);

  addAuditLog({
    shopId: merged.id,
    action: updated.logoUrl !== undefined ? 'LOGO_UPDATED' : 'SHOP_UPDATED',
    details: { name: merged.name, updatedKeys: Object.keys(updated) },
  });

  return merged;
}

// -----------------------------------------------------------------------------
// RESET PIN (FORGOT PIN WORKFLOW)
// -----------------------------------------------------------------------------

export async function resetShopPin(
  shopId: string,
  newPin: string
): Promise<void> {
  const auth = getShopAuthSetting(shopId);
  if (!auth) throw new Error('SHOP_NOT_FOUND');

  const salt = generateSalt();
  const pinHash = await hashPin(newPin, salt);

  auth.pinHash = pinHash;
  auth.pinSalt = salt;
  auth.failedAttempts = 0;
  auth.lockedUntil = null;
  auth.updatedAt = new Date().toISOString();

  updateShopAuthSetting(auth);

  addAuditLog({
    shopId,
    action: 'PIN_UPDATED',
    details: { reason: 'PIN_RESET_COMPLETED' },
  });
}
