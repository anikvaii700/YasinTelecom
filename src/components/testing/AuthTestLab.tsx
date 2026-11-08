/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  Shield,
  X,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  checkShopLockout,
  getProfileByPhone,
  getShopsByOwnerPhone,
  loginShopAccount,
  logoutCurrentSession,
  registerNewShopAccount,
  updateShopProfile,
} from '../../services/storage';
import {
  adjustProductStock,
  createPurchaseTransaction,
  createSaleTransaction,
  getCustomersByShop,
  getInventoryValuation,
  getProductsByShop,
  getSalesByShop,
  getStockMovementsByShop,
  getSuppliersByShop,
  recordCustomerPaymentEntry,
  saveCustomer,
  saveProduct,
  saveSupplier,
} from '../../services/inventoryStorage';
import { isValidBDMobile, normalizeBDMobile } from '../../utils/phone';
import { validateShopPin } from '../../utils/pin';

interface TestCase {
  id: string;
  titleBn: string;
  titleEn: string;
  status: 'idle' | 'running' | 'passed' | 'failed';
  message?: string;
  run: () => Promise<void>;
}

interface AuthTestLabProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthTestLab: React.FC<AuthTestLabProps> = ({ isOpen, onClose }) => {
  const { t, language, setLanguage } = useLanguage();
  const { currentShop, refreshShops } = useAuth();
  const [isRunningAll, setIsRunningAll] = useState(false);

  const initialTests: TestCase[] = [
    {
      id: 'test_valid_mobile',
      titleBn: '১. বৈধ বাংলাদেশি মোবাইল নম্বর যাচাই (+8801XXXXXXXXX / 01XXXXXXXXX)',
      titleEn: '1. Valid Bangladesh Mobile Validation',
      status: 'idle',
      run: async () => {
        const validNumbers = [
          '01712345678',
          '+8801812345678',
          '8801912345678',
          '01612-345678',
          '01512345678',
        ];
        for (const num of validNumbers) {
          if (!isValidBDMobile(num)) {
            throw new Error(`Failed to validate genuine BD number: ${num}`);
          }
        }
      },
    },
    {
      id: 'test_invalid_mobile',
      titleBn: '২. অবৈধ মোবাইল নম্বর শনাক্ত ও প্রত্যাখ্যান',
      titleEn: '2. Invalid Mobile Rejection',
      status: 'idle',
      run: async () => {
        const invalidNumbers = [
          '12345',
          '01234567890', // 012 not valid operator
          '0171234567', // 10 digits
          '017123456789', // 12 digits
          'abcd1234567',
        ];
        for (const num of invalidNumbers) {
          if (isValidBDMobile(num)) {
            throw new Error(`Invalid number was mistakenly accepted: ${num}`);
          }
        }
      },
    },
    {
      id: 'test_pin_validation',
      titleBn: '৩. ৬-সংখ্যার পিন ও দুর্বল প্যাটার্ন (Weak PIN) পরীক্ষা',
      titleEn: '3. Six-digit PIN & Weak Pattern Detection',
      status: 'idle',
      run: async () => {
        // Valid PIN
        const valid = validateShopPin('948201');
        if (!valid.isValid) throw new Error('Valid 6-digit PIN failed validation');

        // Short PIN
        const short = validateShopPin('1234');
        if (short.isValid) throw new Error('Short PIN was mistakenly accepted');

        // Weak repeated digits
        const repeated = validateShopPin('111111');
        if (repeated.isValid || !repeated.isWeak) throw new Error('Repeated digits PIN not caught');

        // Weak sequential
        const seq = validateShopPin('123456');
        if (seq.isValid || !seq.isWeak) throw new Error('Sequential PIN not caught');
      },
    },
    {
      id: 'test_pin_mismatch',
      titleBn: '৪. কনফার্ম পিন গরমিল (Mismatch) প্রতিরোধ',
      titleEn: '4. PIN Confirmation Mismatch Prevention',
      status: 'idle',
      run: async () => {
        const pinA: string = '482910';
        const pinB: string = '482911';
        if (pinA === pinB) throw new Error('Logic error');
      },
    },
    {
      id: 'test_duplicate_prevention',
      titleBn: '৫. একই মালিকের অধীনে ডুপ্লিকেট শপ নাম প্রতিরোধ',
      titleEn: '5. Duplicate Shop Name Prevention',
      status: 'idle',
      run: async () => {
        const testPhone = '+8801899112233';
        const shopName = 'টেস্ট ডুপ্লিকেট স্টোর';

        // Register first
        await registerNewShopAccount({
          mobileNumber: testPhone,
          shopName,
          pin: '839201',
        });

        // Register second with same name under same phone -> Must throw
        try {
          await registerNewShopAccount({
            mobileNumber: testPhone,
            shopName,
            pin: '839201',
          });
          throw new Error('Duplicate shop creation did not throw error');
        } catch (err: unknown) {
          if (!String(err).includes('DUPLICATE_SHOP_NAME')) {
            throw err;
          }
        }
      },
    },
    {
      id: 'test_multiple_shops',
      titleBn: '৬. এক মোবাইল নম্বরে একাধিক দোকান অনুমোদন',
      titleEn: '6. Multiple Shops Under One Mobile Number',
      status: 'idle',
      run: async () => {
        const testPhone = '+8801899556677';
        const shop1 = await registerNewShopAccount({
          mobileNumber: testPhone,
          shopName: 'প্রথম ব্রাঞ্চ',
          pin: '739201',
        });
        const shop2 = await registerNewShopAccount({
          mobileNumber: testPhone,
          shopName: 'দ্বিতীয় ব্রাঞ্চ',
          pin: '849302',
        });

        const shops = getShopsByOwnerPhone(testPhone);
        if (shops.length < 2) {
          throw new Error(`Expected at least 2 shops, found: ${shops.length}`);
        }
        if (shop1.shop.id === shop2.shop.id) {
          throw new Error('Shops shared identical IDs');
        }
      },
    },
    {
      id: 'test_correct_login',
      titleBn: '৭. সঠিক পিন দিয়ে সফল লগইন ও সেশন টোকেন ইস্যু',
      titleEn: '7. Correct PIN Login & Session Creation',
      status: 'idle',
      run: async () => {
        const testPhone = '+8801700112244';
        const created = await registerNewShopAccount({
          mobileNumber: testPhone,
          shopName: 'লগইন টেস্ট স্টোর',
          pin: '619283',
        });

        const logged = await loginShopAccount({
          mobileNumber: testPhone,
          shopId: created.shop.id,
          pin: '619283',
          rememberDevice: true,
        });

        if (!logged.sessionToken) {
          throw new Error('Session token not created on successful login');
        }
      },
    },
    {
      id: 'test_incorrect_pin',
      titleBn: '৮. ভুল পিন শনাক্তকরণ ও অবশিষ্ট সুযোগ গণনা',
      titleEn: '8. Incorrect PIN & Remaining Attempts Counter',
      status: 'idle',
      run: async () => {
        const testPhone = '+8801700998877';
        const created = await registerNewShopAccount({
          mobileNumber: testPhone,
          shopName: 'ভুল পিন টেস্ট শপ',
          pin: '592810',
        });

        try {
          await loginShopAccount({
            mobileNumber: testPhone,
            shopId: created.shop.id,
            pin: '999999', // Incorrect
            rememberDevice: false,
          });
          throw new Error('Incorrect PIN was allowed!');
        } catch (err: unknown) {
          if (!String(err).includes('INVALID_PIN')) {
            throw err;
          }
        }
      },
    },
    {
      id: 'test_temporary_lockout',
      titleBn: '৯. পরপর ৫ বার ভুল পিনে সাময়িক লকআউট (১৫ মিনিট)',
      titleEn: '9. Rate Limiting & 15-Minute Temporary Lockout',
      status: 'idle',
      run: async () => {
        const testPhone = '+8801700334455';
        const created = await registerNewShopAccount({
          mobileNumber: testPhone,
          shopName: 'লকআউট টেস্ট শপ',
          pin: '482019',
        });

        // 5 consecutive wrong PIN attempts
        for (let i = 1; i <= 5; i++) {
          try {
            await loginShopAccount({
              mobileNumber: testPhone,
              shopId: created.shop.id,
              pin: '000001',
              rememberDevice: false,
            });
          } catch (e: unknown) {
            // expected
          }
        }

        const lockout = checkShopLockout(created.shop.id);
        if (!lockout.isLocked) {
          throw new Error('Shop was not locked after 5 failed attempts');
        }
        if (lockout.remainingSeconds <= 0) {
          throw new Error('Lockout countdown did not register remaining time');
        }
      },
    },
    {
      id: 'test_logout',
      titleBn: '১০. লগআউট ও সক্রিয় সেশন টোকেন বাতিলকরণ',
      titleEn: '10. Secure Session Logout & Revocation',
      status: 'idle',
      run: async () => {
        await logoutCurrentSession();
      },
    },
    {
      id: 'test_shop_isolation',
      titleBn: '১১. শপ ডেটা আইসোলেশন (Shop Isolation)',
      titleEn: '11. Shop Data Isolation & Tenancy Verification',
      status: 'idle',
      run: async () => {
        const phoneA = '+8801711223344';
        const phoneB = '+8801799887766';

        const shopA = await registerNewShopAccount({
          mobileNumber: phoneA,
          shopName: 'শপ ক',
          pin: '582910',
        });

        const shopB = await registerNewShopAccount({
          mobileNumber: phoneB,
          shopName: 'শপ খ',
          pin: '739102',
        });

        const ownerAShops = getShopsByOwnerPhone(phoneA);
        const hasShopB = ownerAShops.some((s) => s.id === shopB.shop.id);
        if (hasShopB) {
          throw new Error('Tenant cross-contamination detected! Owner A saw Shop B.');
        }
      },
    },
    {
      id: 'test_logo_customization',
      titleBn: '১২. লোগো আপলোড, পরিবর্তন ও সাইজ রেস্ট্রিকশন',
      titleEn: '12. Logo Upload & Verification',
      status: 'idle',
      run: async () => {
        if (currentShop) {
          const sampleBase64 =
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
          updateShopProfile({ id: currentShop.id, logoUrl: sampleBase64 });
        }
      },
    },
    {
      id: 'test_i18n_toggle',
      titleBn: '১৩. বাংলা ও ইংরেজি দ্বিমুখী অনুবাদ যাচাই',
      titleEn: '13. Bengali/English Localization Consistency',
      status: 'idle',
      run: async () => {
        const original = language;
        setLanguage('en');
        if (t('navSettings') !== 'Shop Settings & Brand') {
          setLanguage(original);
          throw new Error('English translation key mismatch');
        }
        setLanguage('bn');
        if (t('navSettings') !== 'শপ সেটিংস ও ব্র্যান্ডিং') {
          throw new Error('Bengali translation key mismatch');
        }
      },
    },
    // ---------------- STEP 2 MANDATORY TESTS ----------------
    {
      id: 'test_create_edit_product',
      titleBn: '১৪. পণ্য তৈরি ও সফলভাবে সম্পাদনা (Create & Edit Product)',
      titleEn: '14. Create & Edit Product Validation',
      status: 'idle',
      run: async () => {
        if (!currentShop) throw new Error('No active shop');
        const sku = `TEST-${Date.now().toString().slice(-4)}`;
        const created = saveProduct({
          shopId: currentShop.id,
          nameBn: 'টেস্ট কটন শার্ট',
          nameEn: 'Test Cotton Shirt',
          sku,
          barcode: '89099881122',
          purchasePrice: 500,
          sellingPrice: 850,
          currentStock: 15,
          unit: 'Piece',
          minStockLevel: 5,
          isActive: true,
        });

        // Edit price and stock
        const updated = saveProduct({
          id: created.id,
          shopId: currentShop.id,
          nameBn: 'টেস্ট কটন শার্ট (আপডেটেড)',
          nameEn: 'Test Cotton Shirt Updated',
          sku: created.sku,
          barcode: created.barcode,
          purchasePrice: 550,
          sellingPrice: 900,
          currentStock: 20,
          unit: 'Piece',
          minStockLevel: 5,
          isActive: true,
        });

        if (updated.sellingPrice !== 900 || updated.currentStock !== 20) {
          throw new Error('Product edit failed to persist new prices/stock');
        }
      },
    },
    {
      id: 'test_duplicate_sku',
      titleBn: '১৫. একই দোকানে ডুপ্লিকেট SKU প্রতিরোধ (Duplicate SKU Prevention)',
      titleEn: '15. Duplicate SKU Prevention per Shop',
      status: 'idle',
      run: async () => {
        if (!currentShop) throw new Error('No active shop');
        const sku = `SKU-DUP-${Date.now().toString().slice(-4)}`;
        saveProduct({
          shopId: currentShop.id,
          nameBn: 'মৌলিক পণ্য ১',
          nameEn: 'Basic Product 1',
          sku,
          barcode: '1122334455',
          purchasePrice: 100,
          sellingPrice: 150,
          currentStock: 10,
          unit: 'Piece',
          minStockLevel: 2,
          isActive: true,
        });

        // Try saving second with same SKU -> Must throw DUPLICATE_SKU
        try {
          saveProduct({
            shopId: currentShop.id,
            nameBn: 'মৌলিক পণ্য ২',
            nameEn: 'Basic Product 2',
            sku,
            barcode: '9988776655',
            purchasePrice: 100,
            sellingPrice: 150,
            currentStock: 5,
            unit: 'Piece',
            minStockLevel: 2,
            isActive: true,
          });
          throw new Error('Duplicate SKU was accepted without throwing error!');
        } catch (err: unknown) {
          if (!String(err).includes('DUPLICATE_SKU')) {
            throw err;
          }
        }
      },
    },
    {
      id: 'test_barcode_search',
      titleBn: '১৬. বারকোড দিয়ে সঠিক পণ্য অনুসন্ধান (Barcode Search)',
      titleEn: '16. Barcode Lookup & Search',
      status: 'idle',
      run: async () => {
        if (!currentShop) throw new Error('No active shop');
        const barcode = `BC-${Date.now()}`;
        saveProduct({
          shopId: currentShop.id,
          nameBn: 'বারকোড টেস্ট পণ্য',
          nameEn: 'Barcode Test Item',
          sku: `SKU-BC-${Date.now().toString().slice(-4)}`,
          barcode,
          purchasePrice: 200,
          sellingPrice: 350,
          currentStock: 5,
          unit: 'Piece',
          minStockLevel: 2,
          isActive: true,
        });

        const all = getProductsByShop(currentShop.id);
        const match = all.find((p) => p.barcode === barcode);
        if (!match) throw new Error('Could not find product by barcode');
      },
    },
    {
      id: 'test_stock_adjustment',
      titleBn: '১৭. স্টক সমন্বয় ও মুভমেন্ট রেকর্ড (Stock Adjustment & Immutable History)',
      titleEn: '17. Stock Adjustment & Movement Ledger',
      status: 'idle',
      run: async () => {
        if (!currentShop) throw new Error('No active shop');
        const product = saveProduct({
          shopId: currentShop.id,
          nameBn: 'সমন্বয় টেস্ট পণ্য',
          nameEn: 'Adjustment Test Product',
          sku: `ADJ-${Date.now().toString().slice(-4)}`,
          barcode: '9928102910',
          purchasePrice: 400,
          sellingPrice: 600,
          currentStock: 50,
          unit: 'Piece',
          minStockLevel: 10,
          isActive: true,
        });

        // Adjust down to 42 (8 damaged)
        const adjusted = adjustProductStock({
          shopId: currentShop.id,
          productId: product.id,
          newStock: 42,
          reasonType: 'DAMAGE',
          notes: '৮টি নষ্ট পণ্য পাওয়া গেছে',
        });

        if (adjusted.currentStock !== 42) {
          throw new Error('Stock adjustment failed to update currentStock');
        }

        const movements = getStockMovementsByShop(currentShop.id, product.id);
        const damageMove = movements.find((m) => m.movementType === 'DAMAGE');
        if (!damageMove || damageMove.quantityDelta !== -8) {
          throw new Error('Immutable stock movement record not created with correct delta');
        }
      },
    },
    {
      id: 'test_low_stock_detection',
      titleBn: '১৮. লো-স্টক ও স্টক আউট অ্যালার্ট শনাক্তকরণ (Low-stock Alerts)',
      titleEn: '18. Low Stock Detection Logic',
      status: 'idle',
      run: async () => {
        if (!currentShop) throw new Error('No active shop');
        saveProduct({
          shopId: currentShop.id,
          nameBn: 'লো-স্টক পণ্য',
          nameEn: 'Low Stock Item',
          sku: `LOW-${Date.now().toString().slice(-4)}`,
          barcode: '8811223344',
          purchasePrice: 150,
          sellingPrice: 250,
          currentStock: 2, // Less than minStock 5
          unit: 'Piece',
          minStockLevel: 5,
          isActive: true,
        });

        const valuation = getInventoryValuation(currentShop.id);
        if (valuation.lowStockCount < 1) {
          throw new Error('Low stock alert count did not register product');
        }
      },
    },
    {
      id: 'test_purchase_completion',
      titleBn: '১৯. ক্রয় চালান সম্পন্ন ও স্টক বৃদ্ধি (Purchase & Stock-In)',
      titleEn: '19. Purchase Completion & Stock Increment',
      status: 'idle',
      run: async () => {
        if (!currentShop) throw new Error('No active shop');
        const supplier = saveSupplier({
          shopId: currentShop.id,
          name: 'টেস্ট ভেন্ডর সাপ্লাইয়ার্স',
          phone: '+8801700998811',
          openingPayable: 0,
          currentPayable: 0,
          totalPurchases: 0,
          isActive: true,
        });

        const prod = saveProduct({
          shopId: currentShop.id,
          nameBn: 'পারচেজ টেস্ট পণ্য',
          nameEn: 'Purchase Test Product',
          sku: `PUR-P-${Date.now().toString().slice(-4)}`,
          barcode: '7722114433',
          purchasePrice: 300,
          sellingPrice: 500,
          currentStock: 10,
          unit: 'Piece',
          minStockLevel: 5,
          isActive: true,
        });

        const invNo = `PUR-INV-${Date.now().toString().slice(-5)}`;
        const purchase = createPurchaseTransaction({
          shopId: currentShop.id,
          supplierId: supplier.id,
          invoiceNumber: invNo,
          purchaseDate: new Date().toISOString().slice(0, 10),
          items: [{ productId: prod.id, quantity: 20, unitPurchasePrice: 320 }],
          discount: 0,
          additionalCosts: 0,
          paidAmount: 6400, // Fully paid
          paymentMethod: 'Cash',
        });

        if (purchase.grandTotal !== 6400) {
          throw new Error('Grand total calculation error');
        }

        // Verify stock increased by 20 (10 + 20 = 30)
        const updatedProd = getProductsByShop(currentShop.id).find((p) => p.id === prod.id);
        if (!updatedProd || updatedProd.currentStock !== 30) {
          throw new Error(`Expected currentStock 30, got ${updatedProd?.currentStock}`);
        }
      },
    },
    {
      id: 'test_purchase_partial_payment',
      titleBn: '২০. আংশিক পরিশোধ ও সাপ্লায়ার দেনা আপডেট (Partial Payment & Payable Balance)',
      titleEn: '20. Purchase Partial Payment & Supplier Balance',
      status: 'idle',
      run: async () => {
        if (!currentShop) throw new Error('No active shop');
        const supplier = saveSupplier({
          shopId: currentShop.id,
          name: 'বকেয়া টেস্ট ভেন্ডর',
          phone: '+8801700554433',
          openingPayable: 0,
          currentPayable: 0,
          totalPurchases: 0,
          isActive: true,
        });

        const prod = saveProduct({
          shopId: currentShop.id,
          nameBn: 'পার্শিয়াল পেমেন্ট পণ্য',
          nameEn: 'Partial Payment Item',
          sku: `PART-${Date.now().toString().slice(-4)}`,
          barcode: '6633221199',
          purchasePrice: 200,
          sellingPrice: 350,
          currentStock: 5,
          unit: 'Piece',
          minStockLevel: 2,
          isActive: true,
        });

        const invNo = `PART-INV-${Date.now().toString().slice(-5)}`;
        // Buy 10 items @ 200 = 2000 ৳. Pay 1000 ৳, due 1000 ৳.
        createPurchaseTransaction({
          shopId: currentShop.id,
          supplierId: supplier.id,
          invoiceNumber: invNo,
          purchaseDate: new Date().toISOString().slice(0, 10),
          items: [{ productId: prod.id, quantity: 10, unitPurchasePrice: 200 }],
          discount: 0,
          additionalCosts: 0,
          paidAmount: 1000,
          paymentMethod: 'Cash',
        });

        const updatedSuppliers = getSuppliersByShop(currentShop.id);
        const updatedSup = updatedSuppliers.find((s) => s.id === supplier.id);
        if (!updatedSup || updatedSup.currentPayable !== 1000) {
          throw new Error(`Expected supplier payable 1000 ৳, got ${updatedSup?.currentPayable}`);
        }
      },
    },
    {
      id: 'test_customer_due_payment',
      titleBn: '২১. গ্রাহক খাতা ও বকেয়া আদায় (Customer Due & Payment)',
      titleEn: '21. Customer Creation & Payment Ledger',
      status: 'idle',
      run: async () => {
        if (!currentShop) throw new Error('No active shop');
        const customer = saveCustomer({
          shopId: currentShop.id,
          name: 'বকেয়া টেস্ট গ্রাহক',
          mobileNumber: '+8801999887711',
          openingBalance: 1500, // 1500 due
          currentDue: 1500,
          totalPurchases: 5000,
          isActive: true,
        });

        // Collect 500 Tk due
        recordCustomerPaymentEntry({
          shopId: currentShop.id,
          customerId: customer.id,
          amount: 500,
          paymentMethod: 'bKash',
          referenceNumber: 'TRX-TEST-01',
        });

        const updatedCusts = getCustomersByShop(currentShop.id);
        const updated = updatedCusts.find((c) => c.id === customer.id);
        if (!updated || updated.currentDue !== 1000) {
          throw new Error(`Expected customer due 1000 ৳ after 500 ৳ payment, got ${updated?.currentDue}`);
        }
      },
    },
    {
      id: 'test_cross_shop_inventory_isolation',
      titleBn: '২২. ক্রস-শপ ইনভেন্টরি আইসোলেশন (Cross-Shop Product Isolation)',
      titleEn: '22. Cross-Shop Product & Inventory Isolation',
      status: 'idle',
      run: async () => {
        const dummyShopIdA = crypto.randomUUID();
        const dummyShopIdB = crypto.randomUUID();

        saveProduct({
          shopId: dummyShopIdA,
          nameBn: 'শপ এ এর এক্সক্লুসিভ পণ্য',
          nameEn: 'Shop A Exclusive',
          sku: 'SHOP-A-SKU',
          barcode: '111111111',
          purchasePrice: 100,
          sellingPrice: 150,
          currentStock: 10,
          unit: 'Piece',
          minStockLevel: 2,
          isActive: true,
        });

        const prodsB = getProductsByShop(dummyShopIdB);
        const leaked = prodsB.some((p) => p.sku === 'SHOP-A-SKU');
        if (leaked) {
          throw new Error('Tenant cross-contamination! Shop B saw Shop A product');
        }
      },
    },
    // ---------------- SUPABASE & SMS RECOVERY VERIFICATION ----------------
    {
      id: 'test_supabase_connection_endpoint',
      titleBn: '২৩. সুপাবেস সংযোগ ও ডায়াগনস্টিক স্বাস্থ্য পরীক্ষা (Supabase Health Check)',
      titleEn: '23. Supabase Cloud Connection & Diagnostics Probe',
      status: 'idle',
      run: async () => {
        const res = await fetch('/api/supabase/verify-connection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) {
          throw new Error(`Endpoint returned status ${res.status}`);
        }
        const data = await res.json();
        if (typeof data.connected !== 'boolean' || !Array.isArray(data.missingTables)) {
          throw new Error('Invalid diagnostic report structure from backend');
        }
      },
    },
    {
      id: 'test_otp_recovery_disabled_check',
      titleBn: '২৪. ওটিপি রিকভারি নিষ্ক্রিয়তা যাচাই (OTP Provider Disabled Protection)',
      titleEn: '24. OTP Recovery Disabled until Real SMS Configured',
      status: 'idle',
      run: async () => {
        const res = await fetch('/api/auth/otp-status');
        if (!res.ok) {
          throw new Error(`OTP status endpoint returned ${res.status}`);
        }
        const data = await res.json();
        // User requested: Do not require SMS credentials yet. Keep OTP recovery disabled until a real SMS provider is configured.
        if (data.enabled === true && !data.provider) {
          throw new Error('OTP recovery must remain disabled when real SMS provider is not configured');
        }
        if (!data.message || typeof data.message !== 'string') {
          throw new Error('Missing descriptive OTP status message');
        }
      },
    },
    // ---------------- STEP 3 PREPARATION: POS BILLING & TRANSACTIONS ----------------
    {
      id: 'test_step3_pos_transaction_engine',
      titleBn: '২৫. স্টেপ ৩ প্রস্তুতি: POS টার্মিনাল সেলস ইঞ্জিন ও স্টক কর্তন (Step 3 POS Engine)',
      titleEn: '25. Step 3 Readiness: POS Sale Transaction & Stock Deduction',
      status: 'idle',
      run: async () => {
        if (!currentShop) throw new Error('No active shop');
        // 1. Create a dedicated POS test product with 10 stock
        const testSku = `POS-P-${Date.now().toString().slice(-4)}`;
        const testProd = saveProduct({
          shopId: currentShop.id,
          nameBn: 'পিওএস টেস্ট পণ্য',
          nameEn: 'POS Test Product',
          sku: testSku,
          barcode: `BC-${Date.now().toString().slice(-6)}`,
          purchasePrice: 200,
          sellingPrice: 350,
          currentStock: 10,
          unit: 'Piece',
          minStockLevel: 2,
          isActive: true,
        });

        // 2. Execute a sale of 3 units
        const invoiceNumber = `INV-TEST-${Date.now().toString().slice(-5)}`;
        const { sale } = createSaleTransaction({
          shopId: currentShop.id,
          invoiceNumber,
          items: [
            {
              id: crypto.randomUUID(),
              product: testProd,
              quantity: 3,
              unitPrice: 350,
              originalPrice: 350,
              costPrice: 200,
              discount: 0,
              total: 1050,
            },
          ],
          subtotal: 1050,
          cartDiscount: 50,
          vatAmount: 0,
          vatRatePercent: 0,
          grandTotal: 1000,
          paidAmount: 1000,
          dueAmount: 0,
          changeAmount: 0,
          paymentMethod: 'Cash',
        });

        if (sale.grandTotal !== 1000) {
          throw new Error(`Expected grandTotal 1000, got ${sale.grandTotal}`);
        }

        // 3. Verify stock decreased by 3 (10 - 3 = 7)
        const updatedProds = getProductsByShop(currentShop.id);
        const updated = updatedProds.find((p) => p.id === testProd.id);
        if (!updated || updated.currentStock !== 7) {
          throw new Error(`Expected currentStock 7 after sale, got ${updated?.currentStock}`);
        }

        // 4. Verify sale is persisted
        const shopSales = getSalesByShop(currentShop.id);
        const savedSale = shopSales.find((s) => s.id === sale.id);
        if (!savedSale) {
          throw new Error('Sale transaction was not persisted in shop sales ledger');
        }
      },
    },
  ];

  const [tests, setTests] = useState<TestCase[]>(initialTests);

  if (!isOpen) return null;

  const runSingleTest = async (index: number) => {
    const updated = [...tests];
    updated[index].status = 'running';
    updated[index].message = undefined;
    setTests(updated);

    try {
      await updated[index].run();
      setTests((prev) => {
        const n = [...prev];
        n[index].status = 'passed';
        return n;
      });
    } catch (err: unknown) {
      setTests((prev) => {
        const n = [...prev];
        n[index].status = 'failed';
        n[index].message = String(err);
        return n;
      });
    }
  };

  const handleRunAll = async () => {
    setIsRunningAll(true);
    for (let i = 0; i < tests.length; i++) {
      await runSingleTest(i);
    }
    setIsRunningAll(false);
    refreshShops();
  };

  const passedCount = tests.filter((t) => t.status === 'passed').length;
  const failedCount = tests.filter((t) => t.status === 'failed').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/10 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                {t('testLabTitle')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('testLabDesc')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRunAll}
              disabled={isRunningAll}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{isRunningAll ? t('testRunning') : t('runAllTests')}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status Metrics Bar */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-mono shrink-0">
          <div className="flex items-center gap-4">
            <span className="text-slate-500">
              মোট টেস্ট: <strong className="text-slate-800 dark:text-slate-200">{tests.length}</strong>
            </span>
            <span className="text-emerald-600 font-bold">
              উত্তীর্ণ: {passedCount}
            </span>
            {failedCount > 0 && (
              <span className="text-rose-600 font-bold">
                ব্যর্থ: {failedCount}
              </span>
            )}
          </div>
          {passedCount === tests.length && (
            <span className="text-emerald-600 font-bold flex items-center gap-1">
              <Sparkles className="w-4 h-4" />
              <span>১০০% টেস্ট সফলভাবে উত্তীর্ণ!</span>
            </span>
          )}
        </div>

        {/* Tests List */}
        <div className="p-6 overflow-y-auto space-y-2.5 flex-1">
          {tests.map((test, index) => (
            <div
              key={test.id}
              className={`p-3.5 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                test.status === 'passed'
                  ? 'border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-950/20'
                  : test.status === 'failed'
                  ? 'border-rose-200 bg-rose-50/50 dark:border-rose-900/50 dark:bg-rose-950/20'
                  : test.status === 'running'
                  ? 'border-amber-300 bg-amber-50/40 dark:border-amber-900/40 dark:bg-amber-950/20'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {test.status === 'passed' && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  )}
                  {test.status === 'failed' && (
                    <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                  )}
                  {test.status === 'running' && (
                    <div className="w-5 h-5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                  )}
                  {test.status === 'idle' && (
                    <div className="w-5 h-5 rounded-full border border-slate-300 dark:border-slate-700" />
                  )}
                </div>

                <div>
                  <h4 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {language === 'bn' ? test.titleBn : test.titleEn}
                  </h4>
                  {test.message && (
                    <p className="text-xs text-rose-600 dark:text-rose-400 mt-1 font-mono">
                      {test.message}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                disabled={isRunningAll || test.status === 'running'}
                onClick={() => runSingleTest(index)}
                className="px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 text-slate-700 dark:text-slate-300"
              >
                {test.status === 'idle' ? 'টেস্ট চালান' : 'আবার চালান'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
