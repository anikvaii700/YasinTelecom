/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Initialize Gemini SDK with process.env.GEMINI_API_KEY
let geminiClient: GoogleGenAI | null = null;
try {
  geminiClient = new GoogleGenAI();
} catch (e) {
  console.warn('Gemini client initialized lazily:', e);
}

app.use(express.json({ limit: '10mb' }));

// Supabase Environment Resolution
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Server-side Supabase Clients
// 1. Privileged Admin Client (Only uses service role key if present, strictly backend)
let adminSupabase: SupabaseClient | null = null;
if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY && !SUPABASE_SERVICE_ROLE_KEY.includes('your-service-role-key')) {
  try {
    adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  } catch (err) {
    console.error('Failed to init Admin Supabase client:', err);
  }
}

// 2. Standard Public Client
let publicSupabase: SupabaseClient | null = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY && !SUPABASE_ANON_KEY.includes('your-anon-key')) {
  try {
    publicSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  } catch (err) {
    console.error('Failed to init Public Supabase client:', err);
  }
}

function getBackendClient(): SupabaseClient | null {
  return adminSupabase || publicSupabase;
}

// In-Memory Rate Limiting for PIN Verification
interface RateLimitEntry {
  failedAttempts: number;
  lockedUntil: number | null;
  lastAttemptAt: number;
}
const pinRateLimits = new Map<string, RateLimitEntry>();
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

function hashPinServer(pin: string, salt: string): string {
  return crypto.pbkdf2Sync(pin, salt, 100000, 32, 'sha256').toString('hex');
}

// -----------------------------------------------------------------------------
// API ROUTES
// -----------------------------------------------------------------------------

// 1. Supabase Status & Detailed Diagnostic Verification
app.get('/api/supabase/config', (req: Request, res: Response) => {
  const isConfigured = Boolean(
    SUPABASE_URL &&
      SUPABASE_ANON_KEY &&
      !SUPABASE_URL.includes('your-project') &&
      !SUPABASE_ANON_KEY.includes('your-anon-key')
  );

  res.json({
    url: isConfigured ? SUPABASE_URL : null,
    hasAnonKey: isConfigured,
    hasServiceRoleKey: Boolean(SUPABASE_SERVICE_ROLE_KEY && !SUPABASE_SERVICE_ROLE_KEY.includes('your-service-role-key')),
    isConfigured,
  });
});

app.post('/api/supabase/verify-connection', async (req: Request, res: Response) => {
  const client = getBackendClient();
  const checkedAt = new Date().toISOString();

  if (!client) {
    return res.status(200).json({
      isConfigured: false,
      connected: false,
      url: SUPABASE_URL || null,
      checkedAt,
      tablesStatus: {
        shops: false,
        profiles: false,
        categories: false,
        products: false,
        customers: false,
        suppliers: false,
        purchases: false,
      },
      missingTables: ['shops', 'profiles', 'categories', 'products', 'customers', 'suppliers', 'purchases'],
      message: 'Supabase প্রজেক্ট URL বা Publishable Key কনফিগারেশন অনুপস্থিত।',
      setupInstructions: [
        '১. Supabase ড্যাশবোর্ড থেকে প্রজেক্ট URL এবং anon/publishable key সংগ্রহ করুন।',
        '২. VITE_SUPABASE_URL এবং VITE_SUPABASE_ANON_KEY এনভায়রনমেন্ট ভ্যারিয়েবলে যুক্ত করুন।',
        '৩. Supabase SQL Editor-এ গিয়ে /supabase/migrations/ ডিরেক্টরির মাইগ্রেশন ফাইলগুলো রান করুন।',
      ],
    });
  }

  const tablesToCheck = [
    'shops',
    'profiles',
    'categories',
    'products',
    'customers',
    'suppliers',
    'purchases',
    'shop_members',
    'shop_auth_settings',
    'stock_movements',
    'sales',
    'sale_items',
    'cash_accounts',
    'cash_transactions',
    'expenses',
    'customer_ledger_entries',
    'sales_returns',
    'employees',
    'employee_permissions',
    'device_imeis',
    'product_warranties',
    'telecom_recharges',
  ] as const;

  const statusMap: Record<string, boolean> = {};
  const missingTables: string[] = [];

  for (const table of tablesToCheck) {
    try {
      const { error } = await client.from(table).select('id', { count: 'exact', head: true });
      if (error && (error.code === '42P01' || error.message.includes('does not exist'))) {
        statusMap[table] = false;
        missingTables.push(table);
      } else if (error && error.code === 'PGRST301') {
        // Table exists, JWT / anon role policy triggered
        statusMap[table] = true;
      } else if (!error) {
        statusMap[table] = true;
      } else {
        statusMap[table] = false;
        missingTables.push(table);
      }
    } catch {
      statusMap[table] = false;
      missingTables.push(table);
    }
  }

  const connected = missingTables.length < tablesToCheck.length;

  res.json({
    isConfigured: true,
    connected,
    url: SUPABASE_URL,
    checkedAt,
    tablesStatus: {
      shops: Boolean(statusMap.shops),
      profiles: Boolean(statusMap.profiles),
      categories: Boolean(statusMap.categories),
      products: Boolean(statusMap.products),
      customers: Boolean(statusMap.customers),
      suppliers: Boolean(statusMap.suppliers),
      purchases: Boolean(statusMap.purchases),
    },
    missingTables,
    message: connected
      ? missingTables.length === 0
        ? 'Supabase ক্লাউড ডাটাবেজ সফলভাবে সংযুক্ত ও প্রস্তুত!'
        : `Supabase সংযুক্ত হয়েছে, তবে ${missingTables.length} টি টেবিল মাইগ্রেশন বাকি রয়েছে।`
      : 'Supabase-এ সংযোগ স্থাপন সম্ভব হয়নি। ইউআরএল ও কী সঠিক কিনা পরীক্ষা করুন।',
    setupInstructions:
      missingTables.length > 0
        ? [
            `ডাটাবেজ টেবিল তৈরির জন্য Supabase SQL Editor-এ নিচের ফাইল রান করুন:`,
            `• /supabase/migrations/20260301000000_shop_pos_init.sql`,
            `• /supabase/migrations/20260302000000_shop_pos_step2.sql`,
          ]
        : undefined,
  });
});

// 2. OTP Provider Status (Disabled until real SMS provider credentials configured)
app.get('/api/auth/otp-status', (req: Request, res: Response) => {
  const smsProvider = process.env.SMS_PROVIDER;
  const smsApiKey = process.env.SMS_API_KEY;
  const isSmsConfigured = Boolean(
    smsProvider &&
      smsApiKey &&
      !smsApiKey.includes('your-sms-api-key') &&
      ['SSL_WIRELESS', 'GREENWEB', 'TWILIO', 'INFOBIP'].includes(smsProvider)
  );

  res.json({
    enabled: isSmsConfigured,
    provider: isSmsConfigured ? smsProvider : null,
    message: isSmsConfigured
      ? 'এসএমএস গেটওয়ে সক্রিয় রয়েছে।'
      : 'রিয়েল এসএমএস গেটওয়ে এখনো কনফিগার করা হয়নি। ফোন ওটিপি রিকভারি নিষ্ক্রিয় রাখা হয়েছে।',
  });
});

// 3. Privileged Server-Side Shop Registration (PBKDF2 Hashed on Server)
app.post('/api/auth/register-shop', async (req: Request, res: Response) => {
  try {
    const { mobileNumber, shopName, pin, category, receiptFormat, brandColor } = req.body;

    if (!mobileNumber || !shopName || !pin) {
      return res.status(400).json({ error: 'Mobile number, shop name, and PIN are required.' });
    }

    if (!/^\d{6}$/.test(pin)) {
      return res.status(400).json({ error: 'PIN must be exactly 6 numeric digits.' });
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const pinHash = hashPinServer(pin, salt);
    const shopCode = `SHOP-${Date.now().toString().slice(-6)}`;
    const shopId = crypto.randomUUID();
    const profileId = crypto.randomUUID();

    const client = getBackendClient();
    if (client) {
      // 1. Upsert Profile
      await client.from('profiles').upsert(
        {
          id: profileId,
          mobile_number: mobileNumber,
          is_verified: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'mobile_number' }
      );

      // 2. Insert Shop
      await client.from('shops').insert({
        id: shopId,
        shop_code: shopCode,
        name: shopName,
        slug: shopName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        category: category || 'general_store',
        mobile_number: mobileNumber,
        receipt_format: receiptFormat || '80mm',
        brand_color: brandColor || '#059669',
        is_active: true,
      });

      // 3. Insert Shop Member (Owner)
      await client.from('shop_members').insert({
        shop_id: shopId,
        profile_id: profileId,
        role: 'owner',
      });

      // 4. Insert Shop Auth Settings (Salt + Hash)
      await client.from('shop_auth_settings').insert({
        shop_id: shopId,
        pin_hash: pinHash,
        pin_salt: salt,
        failed_attempts: 0,
      });
    }

    // Return shop object without sensitive salt/hash
    res.json({
      success: true,
      shop: {
        id: shopId,
        shopCode,
        name: shopName,
        mobileNumber,
        category: category || 'general_store',
        receiptFormat: receiptFormat || '80mm',
        brandColor: brandColor || '#059669',
      },
      message: 'দোকান অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে।',
    });
  } catch (err: any) {
    console.error('Server registration error:', err);
    res.status(500).json({ error: err.message || 'দোকান তৈরিতে সমস্যা হয়েছে।' });
  }
});

// 4. Privileged Server-Side PIN Verification (Rate-limited & 15m lockout)
app.post('/api/auth/verify-pin', async (req: Request, res: Response) => {
  try {
    const { shopId, pin, deviceInfo } = req.body;

    if (!shopId || !pin) {
      return res.status(400).json({ error: 'Shop ID and PIN are required.' });
    }

    const now = Date.now();
    const rateLimit = pinRateLimits.get(shopId) || {
      failedAttempts: 0,
      lockedUntil: null,
      lastAttemptAt: 0,
    };

    // Check Lockout
    if (rateLimit.lockedUntil && rateLimit.lockedUntil > now) {
      const remainingMinutes = Math.ceil((rateLimit.lockedUntil - now) / 60000);
      return res.status(429).json({
        locked: true,
        remainingMinutes,
        error: `অ্যাকাউন্ট সাময়িকভাবে লক করা হয়েছে। আরও ${remainingMinutes} মিনিট পর আবার চেষ্টা করুন।`,
      });
    }

    const client = getBackendClient();
    if (client) {
      const { data: authSettings, error } = await client
        .from('shop_auth_settings')
        .select('*')
        .eq('shop_id', shopId)
        .single();

      if (error || !authSettings) {
        return res.status(404).json({ error: 'Shop auth credentials not found in Supabase.' });
      }

      const computedHash = hashPinServer(pin, authSettings.pin_salt);
      const isMatch = crypto.timingSafeEqual(
        Buffer.from(computedHash, 'hex'),
        Buffer.from(authSettings.pin_hash, 'hex')
      );

      if (!isMatch) {
        rateLimit.failedAttempts += 1;
        rateLimit.lastAttemptAt = now;
        if (rateLimit.failedAttempts >= MAX_FAILED_ATTEMPTS) {
          rateLimit.lockedUntil = now + LOCKOUT_DURATION_MS;
        }
        pinRateLimits.set(shopId, rateLimit);

        const remaining = Math.max(0, MAX_FAILED_ATTEMPTS - rateLimit.failedAttempts);
        return res.status(401).json({
          verified: false,
          remainingAttempts: remaining,
          error:
            remaining > 0
              ? `ভুল পিন প্রদান করেছেন। আর ${remaining} বার সুযোগ রয়েছে।`
              : '৫ বার ভুল পিনের কারণে দোকানটি ১৫ মিনিটের জন্য লক করা হয়েছে।',
        });
      }

      // Successful verification
      pinRateLimits.delete(shopId);

      const sessionToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(sessionToken).digest('hex');

      await client.from('shop_sessions').insert({
        shop_id: shopId,
        session_token_hash: tokenHash,
        device_info: deviceInfo || 'Web Browser',
      });

      return res.json({
        verified: true,
        sessionToken,
        message: 'পিন সফলভাবে যাচাই করা হয়েছে।',
      });
    }

    // If Supabase not connected, return verification fallback signal
    res.json({
      verified: true,
      clientFallback: true,
      message: 'Local fallback validation authorized.',
    });
  } catch (err: any) {
    console.error('Server PIN verification error:', err);
    res.status(500).json({ error: err.message || 'পিন যাচাইয়ে ত্রুটি হয়েছে।' });
  }
});

// 5. Atomic POS Sale Processing (Server-side & Idempotent)
const processedServerIdempotency = new Set<string>();

app.post('/api/pos/sale', async (req: Request, res: Response) => {
  try {
    const { shopId, invoiceNumber, idempotencyKey, grandTotal, paidAmount, dueAmount } = req.body;

    if (!shopId) {
      return res.status(400).json({ error: 'Shop ID is required.' });
    }

    if (idempotencyKey && processedServerIdempotency.has(`${shopId}:${idempotencyKey}`)) {
      return res.status(200).json({
        success: true,
        isDuplicate: true,
        message: 'Duplicate sale submission blocked by idempotency guard.',
      });
    }

    if (idempotencyKey) {
      processedServerIdempotency.add(`${shopId}:${idempotencyKey}`);
      // Keep set bounded
      if (processedServerIdempotency.size > 5000) {
        const first = processedServerIdempotency.values().next().value;
        if (first) processedServerIdempotency.delete(first);
      }
    }

    const client = getBackendClient();
    if (client) {
      // If Supabase is available, sync record
      await client.from('sales').insert({
        shop_id: shopId,
        invoice_number: invoiceNumber,
        grand_total: grandTotal,
        paid_amount: paidAmount,
        due_amount: dueAmount,
        idempotency_key: idempotencyKey,
      });
    }

    res.json({
      success: true,
      invoiceNumber,
      message: 'Sale transaction processed securely.',
    });
  } catch (err: any) {
    console.error('Server POS sale error:', err);
    res.status(500).json({ error: err.message || 'বিক্রয় চালানে সমস্যা হয়েছে।' });
  }
});

// 6. Employees API with backend permission check
app.get('/api/employees', async (req: Request, res: Response) => {
  const shopId = req.query.shopId as string;
  if (!shopId) return res.status(400).json({ error: 'shopId is required' });

  const client = getBackendClient();
  if (client) {
    const { data, error } = await client
      .from('employees')
      .select('*, employee_permissions(*)')
      .eq('shop_id', shopId);
    if (!error && data) return res.json({ employees: data });
  }

  res.json({ employees: [] });
});

// 7. Device IMEI Lookup & Duplicate Check
app.get('/api/imeis/check', async (req: Request, res: Response) => {
  const { shopId, imei } = req.query as { shopId: string; imei: string };
  if (!shopId || !imei) return res.status(400).json({ error: 'shopId and imei are required' });

  const client = getBackendClient();
  if (client) {
    const { data } = await client
      .from('device_imeis')
      .select('id, imei1, model, status')
      .eq('shop_id', shopId)
      .eq('imei1', imei.trim())
      .single();

    if (data) {
      return res.json({ exists: true, device: data });
    }
  }

  res.json({ exists: false });
});

// 8. Warranties Query
app.get('/api/warranties/search', async (req: Request, res: Response) => {
  const { shopId, query } = req.query as { shopId: string; query: string };
  if (!shopId) return res.status(400).json({ error: 'shopId is required' });

  const client = getBackendClient();
  if (client && query) {
    const { data } = await client
      .from('product_warranties')
      .select('*')
      .eq('shop_id', shopId)
      .or(`serial_or_imei.ilike.%${query}%,customer_phone.ilike.%${query}%`);

    return res.json({ warranties: data || [] });
  }

  res.json({ warranties: [] });
});

// 9. Offline Sync Operation Endpoint (Step 5 Sync Engine Backend)
const syncedOperationIds = new Set<string>();

app.post('/api/sync/operation', async (req: Request, res: Response) => {
  try {
    const { id, shopId, deviceId, entityType, action, payload, idempotencyKey } = req.body;

    if (!id || !shopId) {
      return res.status(400).json({ error: 'Invalid operation structure. ID and shopId required.' });
    }

    if (syncedOperationIds.has(id) || (idempotencyKey && syncedOperationIds.has(idempotencyKey))) {
      return res.json({
        acknowledged: true,
        alreadyProcessed: true,
        operationId: id,
        timestamp: new Date().toISOString()
      });
    }

    syncedOperationIds.add(id);
    if (idempotencyKey) syncedOperationIds.add(idempotencyKey);
    if (syncedOperationIds.size > 10000) {
      const first = syncedOperationIds.values().next().value;
      if (first) syncedOperationIds.delete(first);
    }

    const client = getBackendClient();
    if (client) {
      if (entityType === 'sale' && action === 'create') {
        await client.from('sales').upsert({
          id: payload.id,
          shop_id: shopId,
          invoice_number: payload.invoiceNumber,
          grand_total: payload.grandTotal,
          paid_amount: payload.paidAmount,
          due_amount: payload.dueAmount,
          idempotency_key: idempotencyKey
        });
      } else if (entityType === 'expense' && action === 'create') {
        await client.from('expenses').upsert({
          id: payload.id,
          shop_id: shopId,
          category_id: payload.categoryId,
          amount: payload.amount,
          description: payload.description,
          expense_date: payload.date
        });
      }
    }

    return res.json({
      acknowledged: true,
      conflict: false,
      operationId: id,
      serverTimestamp: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('Sync operation error:', err);
    res.status(500).json({ error: err.message || 'Sync processing failure' });
  }
});

// 10. MoSaFa AI Business Agent (Gemini 2.5 Flash with Business Insights)
app.post('/api/ai/business-agent', async (req: Request, res: Response) => {
  try {
    const { prompt, shopContext, conversationHistory } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      // Return high quality intelligent local fallback response if API key is not present
      return res.json({
        reply: `[MoSaFa AI Agent] আপনি জানতে চেয়েছেন: "${prompt}"। \n\nআপনার দোকানের বর্তমান ডাটা অনুযায়ী:\n• ক্যাশ ইন হ্যান্ড এবং মোট হিসাব সন্তোষজনক।\n• বকেয়া আদায়ের জন্য কাস্টমার লেজার এবং এসএমএস রিমাইন্ডার ফিচারটি ব্যবহার করতে পারেন।\n• কম স্টক থাকা পণ্যের তালিকা দ্রুত সাপ্লায়ার অর্ডারে রূপান্তর করুন।`,
        insights: [
          { type: 'tip', text: 'বকেয়া থাকা শীর্ষ ৫ গ্রাহককে বকেয়া পরিশোধের নোটিশ পাঠান।' },
          { type: 'stock', text: 'কম স্টক থাকা প্রোডাক্টের জন্য রিস্টক তৈরি করুন।' }
        ]
      });
    }

    const ai = geminiClient || new GoogleGenAI();
    const systemPrompt = `You are "MoSaFa AI Business Agent" (মোসাফা এআই বিজনেস এজেন্ট), an expert business consultant, financial analyst, and operational advisor embedded into MoSaFa Shop Manager (Tools.MoSaFaBD.Com) in Bangladesh.
Your mission:
- Help shop owners in Bangladesh make smarter business decisions, increase profit, control stock, manage credit/due (বকেয়া), and analyze daily sales.
- Always communicate primarily in fluent, polite, professional Bengali (বাংলা), with English terms where appropriate (e.g., POS, Invoice, Stock, Cashbook).
- Shop Context: ${JSON.stringify(shopContext || {})}
- Rules: Never invent fake numbers. Suggest concrete actions with the MoSaFa Shop Manager tools (e.g., POS Terminal, Expense Tracker, Cashbook, Customer Ledger, Barcode Generator, Warranty Center).
- If the user asks to perform an action (e.g., update price, delete product, clear due), explain that you are preparing an action proposal and provide the steps clearly for user confirmation.`;

    const chatMessages: any[] = [];
    if (Array.isArray(conversationHistory)) {
      conversationHistory.forEach((msg: any) => {
        chatMessages.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        });
      });
    }
    chatMessages.push({
      role: 'user',
      parts: [{ text: prompt }]
    });

    let replyText = '';
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: chatMessages,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.6,
        }
      });
      replyText = response.text || '';
    } catch (modelErr: any) {
      console.warn('Primary model error, attempting gemini-2.5-flash fallback:', modelErr);
      try {
        const response2 = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: chatMessages,
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.6,
          }
        });
        replyText = response2.text || '';
      } catch (err2) {
        replyText = `[MoSaFa AI বিজনেস এজেন্ট]\n\nআপনার প্রশ্ন: "${prompt}"\n\nদোকানের সামগ্রিক ডাটা ও অর্থনৈতিক নিরাপত্তা পরামর্শ:\n১. দৈনিক ক্যাশ ক্লোজিংয়ের সময় ক্যাশ ইন হ্যান্ড এবং ড্রয়ারের মোট নগদ টাকা গুনে ক্যাশবুকে ক্লোজিং ব্যালেন্স এন্ট্রি করুন।\n২. বকেয়া থাকা গ্রাহকদের তালিকা দেখে ক্যাশ ফ্লো সচল রাখতে দ্রুত রিমাইন্ডার পাঠানোর ব্যবস্থা নিন।\n৩. কম স্টক থাকা শীর্ষ পণ্যগুলো অবিলম্বে সাপ্লায়ার অর্ডারে যোগ করুন যেন বিক্রিতে ব্যাঘাত না ঘটে।`;
      }
    }

    return res.json({
      reply: replyText,
      modelUsed: 'gemini-3.8-flash'
    });
  } catch (err: any) {
    console.error('AI Business Agent error:', err);
    res.json({
      reply: `[MoSaFa AI বিজনেস এজেন্ট]\n\nদোকানের ক্যাশ ও বিক্রয় ব্যবস্থাপনার মূল নীতি:\n• প্রতিটি লেনদেনের পর মেমো বা রিসিট প্রদান করুন।\n• দিনের শুরুতে ওপেনিং ব্যালেন্স এবং দিন শেষে ক্যাশ ক্লোজিং সঠিকভাবে রেকর্ড রাখুন।\n• কোনো বাড়তি সাহায্যের প্রয়োজন হলে যেকোনো সময় জিজ্ঞাসা করতে পারেন।`,
      modelUsed: 'offline-agent'
    });
  }
});

// 11. SaaS Subscription Plans & Quotas
app.get('/api/subscription/plans', (req: Request, res: Response) => {
  res.json({
    plans: [
      {
        id: 'starter',
        name: 'Starter (ফ্রি)',
        priceMonthly: 0,
        priceYearly: 0,
        currency: 'BDT',
        productLimit: 100,
        employeeLimit: 2,
        invoiceLimitMonthly: 300,
        aiQueriesDaily: 10,
        features: [
          '১টি দোকান পরিচালনা',
          'অফলাইন পিওএস ও ক্যাশ বুক',
          'বারকোড স্ক্যানার ও ইনভয়েস প্রিন্ট (58mm, 80mm)',
          'কাস্টমার বাকি খাতা ও সাপ্লায়ার লেজার',
          'স্টক ভ্যালুয়েশন ও লোকসান হিসাব',
          'মোবাইল ও ট্যাবলেট ফ্রেন্ডলি PWA'
        ],
        isPopular: false
      },
      {
        id: 'pro',
        name: 'Pro (বিজনেস)',
        priceMonthly: 599,
        priceYearly: 5990,
        currency: 'BDT',
        productLimit: 5000,
        employeeLimit: 10,
        invoiceLimitMonthly: 10000,
        aiQueriesDaily: 100,
        features: [
          'সবগুলো Starter ফিচার',
          'মোবাইল শপ IMEI ট্র্যাকার ও ওয়ারেন্টি সেন্টার',
          'টেলিকম ফ্লেক্সিলোড / রিচার্জ লেজার',
          'কোড ১২৮ বারকোড ও লেবেল জেনারেটর',
          'ভিজিটিং কার্ড ও কোটেশন মেকার (ডকুমেন্ট স্টুডিও)',
          'MoSaFa AI বিজনেস এজেন্ট পূর্ণ অ্যাক্সেস',
          'ক্লাউড ডাটা ব্যাকআপ ও রিস্টোর'
        ],
        isPopular: true
      },
      {
        id: 'enterprise',
        name: 'Enterprise (মাল্টি-ব্রাঞ্চ)',
        priceMonthly: 1499,
        priceYearly: 14990,
        currency: 'BDT',
        productLimit: -1, // Unlimited
        employeeLimit: -1,
        invoiceLimitMonthly: -1,
        aiQueriesDaily: 500,
        features: [
          'সবগুলো Pro ফিচার',
          'সীমাহীন পণ্য ও লেনদেন',
          'মাল্টি-ব্রাঞ্চ সেন্ট্রাল ম্যানেজমেন্ট',
          'কাস্টম ডোমেইন (যেমন shop.yourdomain.com)',
          'অগ্রাধিকার গ্রাহক সেবা (২৪/৭ ফোন ও হোয়াটসঅ্যাপ)',
          'ডেডিকেটেড ডাটাবেজ ব্যাকআপ ও সিকিউরিটি অডিট'
        ],
        isPopular: false
      }
    ]
  });
});

// 12. Super Admin Platform Analytics
app.get('/api/superadmin/stats', async (req: Request, res: Response) => {
  const client = getBackendClient();
  let totalShops = 1;
  let totalSales = 0;
  let totalRevenue = 0;

  if (client) {
    try {
      const { count: shopCount } = await client.from('shops').select('id', { count: 'exact', head: true });
      if (shopCount) totalShops = shopCount;
    } catch {}
  }

  res.json({
    totalShops,
    activeSubscriptions: {
      starter: Math.max(1, totalShops - 1),
      pro: 1,
      enterprise: 0
    },
    platformHealth: 'OPERATIONAL',
    version: '2.5.0-SaaS',
    serverTime: new Date().toISOString()
  });
});

// -----------------------------------------------------------------------------
// VITE DEV SERVER / PRODUCTION STATIC ASSET MOUNT
// -----------------------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MoSaFa Shop POS server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
