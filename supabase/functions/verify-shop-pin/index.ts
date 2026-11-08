/**
 * Supabase Edge Function: verify-shop-pin
 * 
 * Verifies a 6-digit Shop PIN securely using server-side PBKDF2 hash comparison
 * with constant-time equality check, enforces rate limiting (5 attempts -> 15 min lock),
 * and issues a cryptographically secure session token.
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.4.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

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
    const { mobileNumber, shopId, pin, rememberDevice } = await req.json();

    if (!mobileNumber || !shopId || !pin || pin.length !== 6) {
      return new Response(
        JSON.stringify({ error: 'INVALID_INPUT', message: 'Valid mobile number, shopId and 6-digit PIN are required.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Fetch Auth Setting for Shop
    const { data: authSetting, error: authError } = await supabase
      .from('shop_auth_settings')
      .select('*')
      .eq('shop_id', shopId)
      .single();

    if (authError || !authSetting) {
      return new Response(
        JSON.stringify({ error: 'AUTH_NOT_FOUND', message: 'Shop authentication setting not found.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Check Lockout Status
    const now = new Date();
    if (authSetting.locked_until) {
      const lockUntil = new Date(authSetting.locked_until);
      if (lockUntil > now) {
        const remainingSeconds = Math.ceil((lockUntil.getTime() - now.getTime()) / 1000);
        return new Response(
          JSON.stringify({
            error: 'ACCOUNT_LOCKED',
            remainingSeconds,
            lockedUntil: authSetting.locked_until,
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 3. PBKDF2 Server-side hash calculation
    const encoder = new TextEncoder();
    const pinData = encoder.encode(pin);
    const saltBytes = new Uint8Array(
      authSetting.pin_salt.match(/.{1,2}/g).map((byte: string) => parseInt(byte, 16))
    );

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      pinData,
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

    const calculatedHash = Array.from(new Uint8Array(derivedBits))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    // Constant-time comparison
    let match = calculatedHash.length === authSetting.pin_hash.length;
    let diff = 0;
    for (let i = 0; i < calculatedHash.length; i++) {
      diff |= calculatedHash.charCodeAt(i) ^ authSetting.pin_hash.charCodeAt(i);
    }
    match = match && diff === 0;

    if (!match) {
      const failedAttempts = (authSetting.failed_attempts || 0) + 1;
      let lockedUntil = null;

      if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
        lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000).toISOString();
      }

      await supabase
        .from('shop_auth_settings')
        .update({
          failed_attempts: failedAttempts,
          locked_until: lockedUntil,
          last_failed_at: now.toISOString(),
        })
        .eq('shop_id', shopId);

      // Audit log
      await supabase.from('audit_logs').insert({
        shop_id: shopId,
        action: failedAttempts >= MAX_FAILED_ATTEMPTS ? 'LOCKOUT_TRIGGERED' : 'LOGIN_FAILED',
        details: { failedAttempts, lockedUntil },
      });

      if (lockedUntil) {
        return new Response(
          JSON.stringify({
            error: 'ACCOUNT_LOCKED',
            remainingSeconds: LOCKOUT_MINUTES * 60,
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          error: 'INVALID_PIN',
          remainingAttempts: MAX_FAILED_ATTEMPTS - failedAttempts,
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Success: Reset failed attempts
    await supabase
      .from('shop_auth_settings')
      .update({
        failed_attempts: 0,
        locked_until: null,
        last_login_at: now.toISOString(),
      })
      .eq('shop_id', shopId);

    // 5. Generate secure session
    const sessionTokenBytes = new Uint8Array(32);
    crypto.getRandomValues(sessionTokenBytes);
    const sessionToken = Array.from(sessionTokenBytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const tokenHashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(sessionToken));
    const tokenHash = Array.from(new Uint8Array(tokenHashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const durationDays = rememberDevice ? 30 : 1;
    const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();

    const { data: member } = await supabase
      .from('shop_members')
      .select('profile_id')
      .eq('shop_id', shopId)
      .single();

    await supabase.from('shop_sessions').insert({
      session_token_hash: tokenHash,
      shop_id: shopId,
      profile_id: member?.profile_id,
      expires_at: expiresAt,
    });

    await supabase.from('audit_logs').insert({
      shop_id: shopId,
      actor_id: member?.profile_id,
      action: 'LOGIN_SUCCESS',
      details: { rememberDevice },
    });

    return new Response(
      JSON.stringify({
        success: true,
        sessionToken,
        expiresAt,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    return new Response(
      JSON.stringify({ error: 'SERVER_ERROR', message: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
