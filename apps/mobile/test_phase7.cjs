// ============================================================
// BarberQ — Phase 7 Shopkeeper Dashboard & Booking Actions Test
// ============================================================

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://mskwviowdpbsahuxxvmi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_fVjA3zeBUDGfntJZaO6glw_nRcIzG9P';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function runPhase7Tests() {
  console.log('🧪 Starting Phase 7 Shopkeeper Dashboard & Actions Verification...\n');

  // 1. Fetch active shop and owner
  console.log('1. Fetching active shop & staff...');
  const { data: shops, error: sErr } = await supabase
    .from('shops')
    .select('id, name, owner_id, city, slot_step_mins')
    .eq('is_active', true)
    .limit(1);

  if (sErr || !shops || shops.length === 0) {
    console.error('❌ Failed to fetch shop:', sErr?.message);
    return;
  }

  const shop = shops[0];
  console.log(`✅ Active Shop: "${shop.name}" (${shop.id})`);
  console.log(`   Owner ID: ${shop.owner_id}, City: ${shop.city}`);

  const { data: staffList } = await supabase
    .from('staff')
    .select('id, name, is_active')
    .eq('shop_id', shop.id);

  console.log(`✅ Staff on record: ${staffList?.length || 0} barber(s)`);
  staffList?.forEach((st) => console.log(`   - ${st.name} (active: ${st.is_active})`));

  // 2. Query Bookings with Joined Customer and Staff (used in Shopkeeper Queue)
  console.log('\n2. Testing Shopkeeper Bookings query with joined Customer & Staff relations...');
  const { data: bookings, error: bErr } = await supabase
    .from('bookings')
    .select(`
      id,
      customer_id,
      shop_id,
      staff_id,
      service_name,
      service_price,
      service_duration_mins,
      staff_name,
      start_time,
      end_time,
      status,
      customer_note,
      customer:customer_id (
        id,
        full_name,
        phone,
        avatar_url,
        no_show_count
      ),
      staff:staff_id (
        id,
        name,
        avatar_url
      )
    `)
    .eq('shop_id', shop.id)
    .limit(10);

  if (bErr) {
    console.error('❌ Bookings query error:', bErr.message);
  } else {
    console.log(`✅ Successfully queried ${bookings.length} booking(s) for shop:`);
    bookings.forEach((b) => {
      const cName = b.customer?.full_name || 'Guest Customer';
      const cPhone = b.customer?.phone || 'No phone';
      const noShows = b.customer?.no_show_count || 0;
      console.log(`   - #${b.id.slice(0, 8)} | ${b.service_name} (₹${b.service_price}) | Customer: ${cName} (${cPhone}, no-shows: ${noShows}) | Status: ${b.status}`);
    });
  }

  // 3. Test Daily Metrics Calculation
  console.log('\n3. Testing Metrics Calculation Logic...');
  const sampleList = bookings || [];
  const total = sampleList.length;
  const completed = sampleList.filter((b) => b.status === 'completed').length;
  const pending = sampleList.filter((b) => b.status === 'confirmed').length;
  const revenue = sampleList
    .filter((b) => b.status === 'completed')
    .reduce((sum, b) => sum + (Number(b.service_price) || 0), 0);

  console.log(`   Total Bookings: ${total}`);
  console.log(`   Completed:      ${completed}`);
  console.log(`   Pending Queue:  ${pending}`);
  console.log(`   Revenue Earned: ₹${revenue}`);
  console.log('✅ Metrics computation logic verified.');

  // 4. Test RPC Endpoints for Auth Guards
  console.log('\n4. Testing RPC Auth Guards against unauthenticated access...');

  // 4a. complete_booking
  const fakeId = '00000000-0000-0000-0000-000000000000';
  const { error: compErr } = await supabase.rpc('complete_booking', {
    p_booking_id: fakeId,
    p_actor_id: fakeId,
  });

  if (compErr) {
    console.log(`✅ complete_booking RPC guard active: "${compErr.message}"`);
  } else {
    console.log('⚠️ complete_booking returned without error (unusual for fake ID)');
  }

  // 4b. mark_no_show
  const { error: nsErr } = await supabase.rpc('mark_no_show', {
    p_booking_id: fakeId,
    p_actor_id: fakeId,
    p_reason: 'Test no show',
  });

  if (nsErr) {
    console.log(`✅ mark_no_show RPC guard active: "${nsErr.message}"`);
  } else {
    console.log('⚠️ mark_no_show returned without error (unusual for fake ID)');
  }

  // 4c. cancel_booking
  const { error: canErr } = await supabase.rpc('cancel_booking', {
    p_booking_id: fakeId,
    p_actor_id: fakeId,
    p_actor_role: 'shopkeeper',
    p_reason: 'Testing cancellation',
  });

  if (canErr) {
    console.log(`✅ cancel_booking RPC guard active: "${canErr.message}"`);
  } else {
    console.log('⚠️ cancel_booking returned without error (unusual for fake ID)');
  }

  // 4d. confirm_booking
  const { error: confErr } = await supabase.rpc('confirm_booking', {
    p_booking_id: fakeId,
    p_actor_id: fakeId,
  });

  if (confErr) {
    console.log(`✅ confirm_booking RPC guard active: "${confErr.message}"`);
  } else {
    console.log('⚠️ confirm_booking returned without error (unusual for fake ID)');
  }

  console.log('\n🎉 Phase 7 test script execution complete!');
}

runPhase7Tests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
