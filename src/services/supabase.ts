/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Retrieve public/anon variables only (Service role key is strictly backend-only)
const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ||
  (import.meta.env.SUPABASE_URL as string | undefined) ||
  '';

const SUPABASE_ANON_KEY =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
  (import.meta.env.SUPABASE_ANON_KEY as string | undefined) ||
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
  (import.meta.env.SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
  '';

let clientInstance: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return (
    Boolean(SUPABASE_URL) &&
    Boolean(SUPABASE_ANON_KEY) &&
    !SUPABASE_URL.includes('your-project') &&
    !SUPABASE_ANON_KEY.includes('your-anon-key')
  );
}

export function getSupabaseConfig(): {
  url: string | null;
  hasAnonKey: boolean;
  isConfigured: boolean;
} {
  const configured = isSupabaseConfigured();
  return {
    url: configured ? SUPABASE_URL : null,
    hasAnonKey: Boolean(SUPABASE_ANON_KEY),
    isConfigured: configured,
  };
}

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!clientInstance) {
    try {
      clientInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
    } catch (err) {
      console.error('Failed to initialize Supabase client:', err);
      return null;
    }
  }

  return clientInstance;
}

export interface SupabaseHealthReport {
  isConfigured: boolean;
  connected: boolean;
  url: string | null;
  checkedAt: string;
  tablesStatus: {
    shops: boolean;
    profiles: boolean;
    categories: boolean;
    products: boolean;
    customers: boolean;
    suppliers: boolean;
    purchases: boolean;
  };
  missingTables: string[];
  message: string;
  setupInstructions?: string[];
}

/**
 * Checks connection health against Supabase and verifies table readiness
 */
export async function verifySupabaseConnection(): Promise<SupabaseHealthReport> {
  const now = new Date().toISOString();

  // First try the backend verification endpoint if available
  try {
    const res = await fetch('/api/supabase/verify-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch {
    // Backend API not reachable or running client-only, fallback to client test
  }

  const client = getSupabaseClient();
  if (!client) {
    return {
      isConfigured: false,
      connected: false,
      url: SUPABASE_URL || null,
      checkedAt: now,
      tablesStatus: {
        shops: false,
        profiles: false,
        categories: false,
        products: false,
        customers: false,
        suppliers: false,
        purchases: false,
      },
      missingTables: ['all'],
      message: 'Supabase URL বা Publishable Anon Key কনফিগার করা হয়নি।',
      setupInstructions: [
        'VITE_SUPABASE_URL এবং VITE_SUPABASE_ANON_KEY এনভায়রনমেন্ট ভ্যারিয়েবলে যোগ করুন।',
        'Supabase ড্যাশবোর্ডে গিয়ে SQL Editor-এ 20260301000000_shop_pos_init.sql ও 20260302000000_shop_pos_step2.sql মাইগ্রেশন রান করুন।',
      ],
    };
  }

  const tablesToCheck = ['shops', 'profiles', 'categories', 'products', 'customers', 'suppliers', 'purchases'] as const;
  const statusMap: Record<string, boolean> = {};
  const missing: string[] = [];

  for (const table of tablesToCheck) {
    try {
      const { error } = await client.from(table).select('id', { count: 'exact', head: true });
      if (error) {
        statusMap[table] = false;
        missing.push(table);
      } else {
        statusMap[table] = true;
      }
    } catch {
      statusMap[table] = false;
      missing.push(table);
    }
  }

  const connected = missing.length < tablesToCheck.length;

  return {
    isConfigured: true,
    connected,
    url: SUPABASE_URL,
    checkedAt: now,
    tablesStatus: {
      shops: Boolean(statusMap.shops),
      profiles: Boolean(statusMap.profiles),
      categories: Boolean(statusMap.categories),
      products: Boolean(statusMap.products),
      customers: Boolean(statusMap.customers),
      suppliers: Boolean(statusMap.suppliers),
      purchases: Boolean(statusMap.purchases),
    },
    missingTables: missing,
    message: connected
      ? missing.length === 0
        ? 'Supabase ক্লাউড ডাটাবেজ সম্পূর্ণ সক্রিয় ও সংযুক্ত।'
        : `Supabase সংযুক্ত কিন্তু কিছু টেবিল পাওয়া যায়নি (${missing.join(', ')})।`
      : 'Supabase-এ সংযোগ স্থাপন সম্ভব হয়নি। প্রজেক্ট স্ট্যাটাস ও RLS রুলস পরীক্ষা করুন।',
    setupInstructions:
      missing.length > 0
        ? [
            `অনুগ্রহ করে Supabase SQL Editor-এ গিয়ে মাইগ্রেশন ফাইল রান করুন:`,
            `1. /supabase/migrations/20260301000000_shop_pos_init.sql`,
            `2. /supabase/migrations/20260302000000_shop_pos_step2.sql`,
          ]
        : undefined,
  };
}
