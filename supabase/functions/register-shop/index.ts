/**
 * Supabase Edge Function: register-shop
 * 
 * Registers a new shop account with owner profile, role, salted PBKDF2 PIN hash,
 * and sets up initial shop auth settings and audit log.
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.4.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase environment variables not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { mobileNumber, shopName, pin, category } = await req.json();

    if (!mobileNumber || !shopName || !pin || pin.length !== 6) {
      return new Response(
        JSON.stringify({ error: 'INVALID_INPUT', message: 'Mobile, shopName, and 6-digit PIN are required.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Normalize Bangladesh mobile number
    let cleanPhone = mobileNumber.replace(/[\s\-\(\)\.]/g, '');
    if (cleanPhone.startsWith('01') && cleanPhone.length === 11) {
      cleanPhone = '+88' + cleanPhone;
    } else if (cleanPhone.startsWith('8801')) {
      cleanPhone = '+' + cleanPhone;
    }

    // 2. Prevent duplicate shop name under same mobile number
    const { data: existingShops } = await supabase
      .from('shops')
      .select('id, name')
      .eq('mobile_number', cleanPhone);

    if (existingShops && existingShops.some((s: { name: string }) => s.name.toLowerCase() === shopName.trim().toLowerCase())) {
      return new Response(
        JSON.stringify({ error: 'DUPLICATE_SHOP_NAME', message: 'A shop with this name already exists for this number.' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Find or create profile
    let profileId: string;
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('mobile_number', cleanPhone)
      .maybeSingle();

    if (existingProfile) {
      profileId = existingProfile.id;
    } else {
      const { data: newProfile, error: profileErr } = await supabase
        .from('profiles')
        .insert({ mobile_number: cleanPhone, is_verified: true })
        .select('id')
        .single();
      if (profileErr) throw profileErr;
      profileId = newProfile.id;
    }

    // 4. Generate unique Shop Code
    const random4 = Math.floor(1000 + Math.random() * 9000);
    const shopCode = `MSF-${random4}-${String((existingShops?.length || 0) + 1).padStart(2, '0')}`;
    const slug = shopName.trim().toLowerCase().replace(/\s+/g, '-');

    // 5. Insert shop record
    const { data: newShop, error: shopErr } = await supabase
      .from('shops')
      .insert({
        shop_code: shopCode,
        name: shopName.trim(),
        slug,
        category: category || 'general_store',
        mobile_number: cleanPhone,
        currency: 'BDT',
        language: 'bn',
        receipt_header: 'বিসমিল্লাহির রাহমানির রাহিম',
        receipt_footer: 'ধন্যবাদ, আবার আসবেন!',
        receipt_format: '80mm',
        brand_color: '#059669',
      })
      .select('*')
      .single();

    if (shopErr) throw shopErr;

    // 6. Create shop membership as owner
    await supabase.from('shop_members').insert({
      shop_id: newShop.id,
      profile_id: profileId,
      role: 'owner',
      permissions: { all: true },
    });

    // 7. Hash 6-digit PIN with PBKDF2 SHA-256 and salt
    const saltBytes = new Uint8Array(16);
    crypto.getRandomValues(saltBytes);
    const saltHex = Array.from(saltBytes).map((b) => b.toString(16).padStart(2, '0')).join('');

    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(pin),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: saltBytes,
        iterations: 10000,
        hash: 'SHA-256',
      },
      keyMaterial,
      256
    );

    const pinHash = Array.from(new Uint8Array(derivedBits))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    // Insert auth settings
    await supabase.from('shop_auth_settings').insert({
      shop_id: newShop.id,
      pin_hash: pinHash,
      pin_salt: saltHex,
      failed_attempts: 0,
    });

    // Audit log
    await supabase.from('audit_logs').insert({
      shop_id: newShop.id,
      actor_id: profileId,
      action: 'SIGNUP_SUCCESS',
      details: { shopCode, shopName: newShop.name },
    });

    return new Response(
      JSON.stringify({
        success: true,
        shop: newShop,
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    return new Response(
      JSON.stringify({ error: 'SERVER_ERROR', message: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
