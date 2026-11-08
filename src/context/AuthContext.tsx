/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  LockoutStatus,
  Profile,
  Shop,
  ShopMember,
  SignupFormData,
} from '../types/auth';
import {
  checkShopLockout,
  getShopsByOwnerPhone,
  initializeStorageDefaults,
  loginShopAccount,
  logoutCurrentSession,
  registerNewShopAccount,
  resetShopPin,
  switchActiveShop,
  updateShopProfile,
  verifyCurrentSession,
} from '../services/storage';
import { initializeShopInventoryDefaults } from '../services/inventoryStorage';
import { initializeShopFinanceDefaults } from '../services/financeStorage';
import { initializeShopEmployees } from '../services/employeeStorage';
import { initializeSpecializedDefaults } from '../services/specializedStorage';

interface AuthContextType {
  currentShop: Shop | null;
  currentProfile: Profile | null;
  currentMember: ShopMember | null;
  ownedShops: Shop[];
  isLoading: boolean;
  signupShop: (data: SignupFormData) => Promise<Shop>;
  loginShop: (
    mobile: string,
    shopId: string,
    pin: string,
    rememberDevice: boolean
  ) => Promise<Shop>;
  switchShop: (shopId: string) => Promise<Shop>;
  updateShop: (data: Partial<Shop>) => Promise<Shop>;
  logout: () => Promise<void>;
  checkLockout: (shopId: string) => LockoutStatus;
  refreshShops: () => void;
  resetPin: (shopId: string, newPin: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentShop, setCurrentShop] = useState<Shop | null>(null);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [currentMember, setCurrentMember] = useState<ShopMember | null>(null);
  const [ownedShops, setOwnedShops] = useState<Shop[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshShops = useCallback(() => {
    if (currentProfile) {
      const list = getShopsByOwnerPhone(currentProfile.mobileNumber);
      setOwnedShops(list);
    }
  }, [currentProfile]);

  // Initial session restoration
  useEffect(() => {
    async function init() {
      try {
        await initializeStorageDefaults();
        const sessionData = await verifyCurrentSession();
        if (sessionData) {
          initializeShopInventoryDefaults(sessionData.shop.id);
          initializeShopFinanceDefaults(sessionData.shop.id, sessionData.shop.shopCode);
          initializeShopEmployees(sessionData.shop.id, sessionData.profile.fullName || sessionData.shop.name, sessionData.profile.mobileNumber);
          initializeSpecializedDefaults(sessionData.shop.id);
          setCurrentShop(sessionData.shop);
          setCurrentProfile(sessionData.profile);
          setCurrentMember(sessionData.member);
          const list = getShopsByOwnerPhone(sessionData.profile.mobileNumber);
          setOwnedShops(list);
        }
      } catch (err) {
        console.error('Session initialization error:', err);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  // Update owned shops list whenever profile changes
  useEffect(() => {
    if (currentProfile) {
      refreshShops();
    }
  }, [currentProfile, refreshShops]);

  const signupShop = async (data: SignupFormData): Promise<Shop> => {
    const res = await registerNewShopAccount({
      mobileNumber: data.mobileNumber,
      shopName: data.shopName,
      pin: data.pin,
      category: data.category,
    });
    initializeShopInventoryDefaults(res.shop.id);
    initializeShopFinanceDefaults(res.shop.id, res.shop.shopCode);
    initializeShopEmployees(res.shop.id, res.shop.name, res.profile.mobileNumber);
    initializeSpecializedDefaults(res.shop.id);
    setCurrentShop(res.shop);
    setCurrentProfile(res.profile);
    const list = getShopsByOwnerPhone(res.profile.mobileNumber);
    setOwnedShops(list);
    return res.shop;
  };

  const loginShop = async (
    mobile: string,
    shopId: string,
    pin: string,
    rememberDevice: boolean
  ): Promise<Shop> => {
    const res = await loginShopAccount({
      mobileNumber: mobile,
      shopId,
      pin,
      rememberDevice,
    });
    initializeShopInventoryDefaults(res.shop.id);
    initializeShopFinanceDefaults(res.shop.id, res.shop.shopCode);
    initializeShopEmployees(res.shop.id, res.shop.name, res.profile.mobileNumber);
    initializeSpecializedDefaults(res.shop.id);
    setCurrentShop(res.shop);
    setCurrentProfile(res.profile);
    const list = getShopsByOwnerPhone(res.profile.mobileNumber);
    setOwnedShops(list);
    return res.shop;
  };

  const switchShop = async (shopId: string): Promise<Shop> => {
    if (!currentProfile) throw new Error('NO_ACTIVE_PROFILE');
    const updated = await switchActiveShop(shopId, currentProfile.id);
    setCurrentShop(updated);
    return updated;
  };

  const updateShop = async (data: Partial<Shop>): Promise<Shop> => {
    if (!currentShop) throw new Error('NO_ACTIVE_SHOP');
    const updated = updateShopProfile({ ...data, id: currentShop.id });
    setCurrentShop(updated);
    refreshShops();
    return updated;
  };

  const logout = async () => {
    await logoutCurrentSession();
    setCurrentShop(null);
    setCurrentProfile(null);
    setCurrentMember(null);
    setOwnedShops([]);
  };

  const checkLockout = (shopId: string): LockoutStatus => {
    return checkShopLockout(shopId);
  };

  const resetPinHandler = async (shopId: string, newPin: string) => {
    await resetShopPin(shopId, newPin);
  };

  return (
    <AuthContext.Provider
      value={{
        currentShop,
        currentProfile,
        currentMember,
        ownedShops,
        isLoading,
        signupShop,
        loginShop,
        switchShop,
        updateShop,
        logout,
        checkLockout,
        refreshShops,
        resetPin: resetPinHandler,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
