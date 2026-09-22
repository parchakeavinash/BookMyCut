// ============================================================
// BarberQ — Production Readiness & Pilot Launch Health Check
// Usage: node verify_production_readiness.cjs
// ============================================================

const https = require('https');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://mskwviowdpbsahuxxvmi.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_fVjA3zeBUDGfntJZaO6glw_nRcIzG9P';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let passCount = 0;
let failCount = 0;

function report(status, title, details = '') {
  if (status) {
    passCount++;
    console.log(`  ✅ [PASS] ${title}${details ? ` (${details})` : ''}`);
  } else {
    failCount++;
    console.error(`  ❌ [FAIL] ${title}${details ? ` (${details})` : ''}`);
  }
}

async function runHealthCheck() {
  console.log('\n============================================================');
  console.log('🚀 BarberQ: Production Readiness & Pilot Health Check');
  console.log('============================================================\n');

  // --- 1. Network & Supabase Connectivity ---
  console.log('📌 Section 1: Supabase Connectivity & Latency');
  const startPing = Date.now();
  try {
    const { data, error } = await supabase.from('shops').select('id').limit(1);
    const latency = Date.now() - startPing;
    report(!error, 'Supabase REST API Reachability', `Latency: ${latency}ms`);
  } catch (err) {
    report(false, 'Supabase REST API Reachability', err.message);
  }

  // --- 2. Core Tables Schema Health ---
  console.log('\n📌 Section 2: Database Schema & Core Tables');
  const tables = [
    'users',
    'shops',
    'services',
    'staff',
    'staff_services',
    'business_hours',
    'business_breaks',
    'shop_closed_dates',
    'bookings',
    'notifications',
    'shop_images'
  ];

  for (const table of tables) {
    try {
      const { error } = await supabase.from(table).select('*', { count: 'exact', head: true });
      report(!error, `Table: ${table}`, error ? error.message : 'Accessible');
    } catch (err) {
      report(false, `Table: ${table}`, err.message);
    }
  }

  // --- 3. Security Definer RPCs ---
  console.log('\n📌 Section 3: RPC Functions & Business Logic Engines');

  let activeShopId = null;
  let activeServiceId = null;

  try {
    const { data: shops } = await supabase.from('shops').select('id').eq('is_active', true).limit(1);
    if (shops && shops.length > 0) {
      activeShopId = shops[0].id;
      const { data: services } = await supabase.from('services').select('id').eq('shop_id', activeShopId).limit(1);
      if (services && services.length > 0) {
        activeServiceId = services[0].id;
      }
    }
  } catch (err) {
    // Ignore here
  }

  // 3a. get_available_slots
  try {
    if (activeShopId && activeServiceId) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const y = tomorrow.getFullYear();
      const m = String(tomorrow.getMonth() + 1).padStart(2, '0');
      const d = String(tomorrow.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;

      const { data, error } = await supabase.rpc('get_available_slots', {
        p_shop_id: activeShopId,
        p_service_id: activeServiceId,
        p_date: dateStr,
        p_staff_id: null
      });
      report(!error && Array.isArray(data), 'RPC: get_available_slots', error ? error.message : `${data?.length || 0} slots available for ${dateStr}`);
    } else {
      report(false, 'RPC: get_available_slots', 'Active shop or service missing');
    }
  } catch (err) {
    report(false, 'RPC: get_available_slots', err.message);
  }

  // 3b. process_booking_reminders
  try {
    const { data, error } = await supabase.rpc('process_booking_reminders');
    report(!error, 'RPC: process_booking_reminders', error ? error.message : 'Reminders engine active');
  } catch (err) {
    report(false, 'RPC: process_booking_reminders', err.message);
  }

  // 3c. Auth-guarded RPC signatures
  const fakeId = '00000000-0000-0000-0000-000000000000';
  const guardedRPCs = [
    { name: 'complete_booking', args: { p_booking_id: fakeId, p_actor_id: fakeId } },
    { name: 'mark_no_show', args: { p_booking_id: fakeId, p_actor_id: fakeId, p_reason: 'Healthcheck test' } },
    { name: 'confirm_booking', args: { p_booking_id: fakeId, p_actor_id: fakeId } },
    { name: 'cancel_booking', args: { p_booking_id: fakeId, p_actor_id: fakeId, p_actor_role: 'shopkeeper', p_reason: 'Healthcheck test' } },
    { name: 'mark_all_notifications_read', args: { p_user_id: fakeId } }
  ];

  for (const rpc of guardedRPCs) {
    try {
      const { error } = await supabase.rpc(rpc.name, rpc.args);
      const isFunctionPresent = error && (error.message.includes('UNAUTHORIZED') || error.message.includes('authentication') || error.message.includes('not found') || error.message.includes('permission denied'));
      report(isFunctionPresent, `RPC Guard: ${rpc.name}`, error ? error.message : 'Guarded');
    } catch (err) {
      report(false, `RPC Guard: ${rpc.name}`, err.message);
    }
  }

  // --- 4. Storage Bucket Check ---
  console.log('\n📌 Section 4: Supabase Storage');
  try {
    const { data: files, error } = await supabase.storage.from('shop-images').list('', { limit: 1 });
    report(!error, 'Bucket: shop-images', error ? error.message : 'Accessible & verified');
  } catch (err) {
    report(false, 'Bucket: shop-images', err.message);
  }

  // --- 5. Pilot Salon Configuration Health ---
  console.log('\n📌 Section 5: Pilot Salon ("Urban Cuts") Data Integrity');
  try {
    const { data: pilotShops, error: shopErr } = await supabase
      .from('shops')
      .select('id, name, city, address, phone, is_active')
      .eq('is_active', true)
      .limit(1);

    if (shopErr || !pilotShops || pilotShops.length === 0) {
      report(false, 'Pilot Shop Configured', shopErr ? shopErr.message : 'No active shop found');
    } else {
      const pilot = pilotShops[0];
      report(true, `Pilot Shop Profile (${pilot.name})`, `${pilot.city} · ${pilot.phone || 'No phone'}`);

      // Check services
      const { data: services, error: sErr } = await supabase
        .from('services')
        .select('id, name, price, duration_mins')
        .eq('shop_id', pilot.id)
        .eq('is_active', true);
      report(!sErr && services?.length > 0, 'Pilot Services Roster', `${services?.length || 0} active services`);

      // Check staff
      const { data: staff, error: stErr } = await supabase
        .from('staff')
        .select('id, name, is_active')
        .eq('shop_id', pilot.id)
        .eq('is_active', true);
      report(!stErr && staff?.length > 0, 'Pilot Staff Roster', `${staff?.length || 0} active barbers`);

      // Check 7/7 business hours
      const { data: hours, error: hErr } = await supabase
        .from('business_hours')
        .select('day_of_week, open_time, close_time')
        .eq('shop_id', pilot.id);
      report(!hErr && hours?.length === 7, 'Pilot 7-Day Business Hours', `${hours?.length || 0}/7 days active`);

      // Check breaks
      const { data: breaks, error: bErr } = await supabase
        .from('business_breaks')
        .select('start_time, end_time')
        .eq('shop_id', pilot.id);
      report(!bErr && breaks?.length > 0, 'Pilot Break Schedule', `${breaks?.length || 0} break interval(s)`);
    }
  } catch (err) {
    report(false, 'Pilot Salon Configuration', err.message);
  }

  // --- 6. Mobile & App Configuration ---
  console.log('\n📌 Section 6: Mobile Application & Production Asset Config');
  try {
    const appJsonPath = path.join(__dirname, 'app.json');
    if (fs.existsSync(appJsonPath)) {
      const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
      const expo = appJson.expo || {};
      const hasBundleId = !!expo.ios?.bundleIdentifier;
      const hasAndroidPkg = !!expo.android?.package;
      const hasScheme = expo.scheme === 'barberq';

      report(hasBundleId, 'iOS Bundle Identifier', expo.ios?.bundleIdentifier);
      report(hasAndroidPkg, 'Android Package Name', expo.android?.package);
      report(hasScheme, 'Deep Linking Scheme', expo.scheme);
    } else {
      report(false, 'app.json Config', 'File not found');
    }
  } catch (err) {
    report(false, 'Mobile Asset Config', err.message);
  }

  // --- Summary ---
  console.log('\n============================================================');
  console.log(`📊 Production Readiness Summary: ${passCount}/${passCount + failCount} Checks Passed (${Math.round((passCount / (passCount + failCount)) * 100)}%)`);
  console.log('============================================================\n');

  if (failCount > 0) {
    console.error(`⚠️ ${failCount} check(s) require attention before pilot launch.`);
    process.exit(1);
  } else {
    console.log('🎉 Production Readiness Verified! The system is 100% ready for Pilot Launch.\n');
    process.exit(0);
  }
}

runHealthCheck();
