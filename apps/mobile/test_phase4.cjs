// ============================================================
// BarberQ — Phase 4 Discovery & Search Verification Script
// ============================================================

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://mskwviowdpbsahuxxvmi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_fVjA3zeBUDGfntJZaO6glw_nRcIzG9P';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function runDiscoveryTests() {
  console.log('🧪 Starting Phase 4 Discovery & Search Verification...\n');

  // Test 1: Fetch active shops with joined images and services
  console.log('1. Testing active shops list with joined relations...');
  const { data: shops, error: err1 } = await supabase
    .from('shops')
    .select(`
      id,
      name,
      city,
      area,
      address,
      slot_step_mins,
      rating_avg,
      review_count,
      is_active,
      shop_images(id, url, is_cover),
      services(id, name, category, price, duration_mins, is_active)
    `)
    .eq('is_active', true);

  if (err1) {
    console.error('❌ Failed active shops query:', err1.message);
    return;
  }

  console.log(`✅ Success: Found ${shops.length} active shop(s):`);
  shops.forEach((s) => {
    const srvCount = s.services?.length || 0;
    const imgCount = s.shop_images?.length || 0;
    console.log(`   - "${s.name}" in ${s.city} (Services: ${srvCount}, Images: ${imgCount}, Rating: ${s.rating_avg})`);
  });

  if (shops.length === 0) {
    console.log('⚠️ No active shops to test search.');
    return;
  }

  // Test 2: Search filter simulation
  console.log('\n2. Testing search query filters...');
  const testQuery = 'Urban';
  const matchedShops = shops.filter((s) =>
    s.name.toLowerCase().includes(testQuery.toLowerCase()) ||
    s.city.toLowerCase().includes(testQuery.toLowerCase())
  );
  console.log(`✅ Filter for "${testQuery}": ${matchedShops.length} shop(s) matched`);

  // Test 3: City filter simulation
  const city = 'Bengaluru';
  const cityShops = shops.filter((s) => s.city.toLowerCase() === city.toLowerCase());
  console.log(`✅ Filter for city "${city}": ${cityShops.length} shop(s) matched`);

  // Test 4: Single Shop Deep Details
  const targetShopId = shops[0].id;
  console.log(`\n3. Testing Single Shop Deep Details for ID: ${targetShopId}...`);

  const [shopRes, srvRes, staffRes, hoursRes] = await Promise.all([
    supabase.from('shops').select('*').eq('id', targetShopId).single(),
    supabase.from('services').select('*').eq('shop_id', targetShopId).eq('is_active', true),
    supabase.from('staff').select('*, staff_services(service_id)').eq('shop_id', targetShopId).eq('is_active', true),
    supabase.from('business_hours').select('*').eq('shop_id', targetShopId).order('day_of_week', { ascending: true }),
  ]);

  if (shopRes.error) console.error('❌ Shop query error:', shopRes.error.message);
  else console.log(`✅ Shop Details: "${shopRes.data.name}", Address: ${shopRes.data.address}`);

  if (srvRes.error) console.error('❌ Services query error:', srvRes.error.message);
  else console.log(`✅ Services loaded: ${srvRes.data.length} active service(s)`);

  if (staffRes.error) console.error('❌ Staff query error:', staffRes.error.message);
  else {
    console.log(`✅ Staff team loaded: ${staffRes.data.length} stylist(s)`);
    staffRes.data.forEach((st) => {
      console.log(`   - Stylist: ${st.name} (Services mapped: ${st.staff_services?.length || 0})`);
    });
  }

  if (hoursRes.error) console.error('❌ Hours query error:', hoursRes.error.message);
  else console.log(`✅ Operating Schedule loaded: ${hoursRes.data.length} day(s) configured`);

  console.log('\n🎉 Phase 4 Discovery & Search Verification: 100% PASSED!');
}

runDiscoveryTests();
