// ============================================================
// BarberQ — Phase 3 Verification Script
// Tests:
// 1. Shopkeeper tables & schema queryability
// 2. Relations: services, staff, staff_services, business_hours, breaks
// 3. Customer read access on active shops (public discovery)
// ============================================================

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://mskwviowdpbsahuxxvmi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_fVjA3zeBUDGfntJZaO6glw_nRcIzG9P';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function runTests() {
  console.log('🧪 Starting Phase 3 Shopkeeper Verification...\n');

  // Test 1: Read active shops (Public customer query)
  console.log('1. Testing public customer discovery of active shops...');
  const { data: shops, error: shopsErr } = await supabase
    .from('shops')
    .select('id, name, city, slot_step_mins, is_active, rating_avg')
    .eq('is_active', true);

  if (shopsErr) {
    console.error('❌ Failed to query shops:', shopsErr.message);
  } else {
    console.log(`✅ Success: Found ${shops.length} active shop(s):`);
    shops.forEach((s) => console.log(`   - ${s.name} (${s.city}) | Slot Step: ${s.slot_step_mins}m`));
  }

  if (!shops || shops.length === 0) {
    console.log('⚠️ No shops found in database. Seed or create one to test relations.');
    return;
  }

  const shopId = shops[0].id;
  console.log(`\nTesting relations for shop: ${shops[0].name} (${shopId})`);

  // Test 2: Services
  console.log('\n2. Testing Services query...');
  const { data: services, error: srvErr } = await supabase
    .from('services')
    .select('id, name, price, duration_mins, category, is_active')
    .eq('shop_id', shopId);

  if (srvErr) console.error('❌ Services query error:', srvErr.message);
  else {
    console.log(`✅ Services found: ${services.length}`);
    services.slice(0, 3).forEach((srv) => {
      console.log(`   - ${srv.name}: ₹${srv.price} (${srv.duration_mins} mins)`);
    });
  }

  // Test 3: Staff & Service Mappings
  console.log('\n3. Testing Staff & staff_services junction...');
  const { data: staff, error: staffErr } = await supabase
    .from('staff')
    .select('id, name, phone, bio, staff_services(service_id)')
    .eq('shop_id', shopId);

  if (staffErr) console.error('❌ Staff query error:', staffErr.message);
  else {
    console.log(`✅ Staff found: ${staff.length}`);
    staff.forEach((st) => {
      const srvCount = st.staff_services ? st.staff_services.length : 0;
      console.log(`   - ${st.name} (Services mapped: ${srvCount})`);
    });
  }

  // Test 4: Business Hours (7 days)
  console.log('\n4. Testing Business Hours...');
  const { data: hours, error: hoursErr } = await supabase
    .from('business_hours')
    .select('day_of_week, open_time, close_time, is_open')
    .eq('shop_id', shopId)
    .order('day_of_week', { ascending: true });

  if (hoursErr) console.error('❌ Business hours query error:', hoursErr.message);
  else {
    console.log(`✅ Business hours configured for ${hours.length} day(s)`);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    hours.slice(0, 3).forEach((h) => {
      console.log(`   - ${dayNames[h.day_of_week]}: ${h.is_open ? `${h.open_time} - ${h.close_time}` : 'Closed'}`);
    });
  }

  // Test 5: Business Breaks
  console.log('\n5. Testing Business Breaks...');
  const { data: breaks, error: breaksErr } = await supabase
    .from('business_breaks')
    .select('start_time, end_time, label')
    .eq('shop_id', shopId);

  if (breaksErr) console.error('❌ Breaks query error:', breaksErr.message);
  else {
    console.log(`✅ Breaks found: ${breaks.length}`);
    breaks.forEach((b) => console.log(`   - ${b.label}: ${b.start_time} - ${b.end_time}`));
  }

  // Test 6: Shop Images
  console.log('\n6. Testing Shop Images...');
  const { data: images, error: imgErr } = await supabase
    .from('shop_images')
    .select('id, url, is_cover')
    .eq('shop_id', shopId);

  if (imgErr) console.error('❌ Shop images query error:', imgErr.message);
  else {
    console.log(`✅ Images found: ${images.length}`);
  }

  console.log('\n🎉 Phase 3 Verification Completed Successfully!');
}

runTests();
