import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const REVENUECAT_WEBHOOK_SECRET = Deno.env.get('REVENUECAT_WEBHOOK_SECRET') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

type RevenueCatEvent = {
  event: {
    type: string;
    app_user_id: string;
    expiration_at_ms?: number | null;
  };
};

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const authHeader = req.headers.get('Authorization');
  if (REVENUECAT_WEBHOOK_SECRET && authHeader !== `Bearer ${REVENUECAT_WEBHOOK_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const payload = (await req.json()) as RevenueCatEvent;
  const eventType = payload.event?.type ?? '';
  const userId = payload.event?.app_user_id;

  if (!userId) {
    return new Response('Missing app_user_id', { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const activeEvents = new Set([
    'INITIAL_PURCHASE',
    'RENEWAL',
    'UNCANCELLATION',
    'PRODUCT_CHANGE',
  ]);

  const inactiveEvents = new Set(['EXPIRATION', 'CANCELLATION']);

  let tier: 'free' | 'pro' = 'free';
  let expiresAt: string | null = null;

  if (activeEvents.has(eventType)) {
    tier = 'pro';
    if (payload.event.expiration_at_ms) {
      expiresAt = new Date(payload.event.expiration_at_ms).toISOString();
    }
  } else if (inactiveEvents.has(eventType)) {
    tier = 'free';
    expiresAt = null;
  } else {
    return new Response(JSON.stringify({ ignored: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { error } = await supabase
    .from('profiles')
    .update({ subscription_tier: tier, subscription_expires_at: expiresAt })
    .eq('id', userId);

  if (error) {
    return new Response(error.message, { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true, tier }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
