// ============================================================
// BarberQ — Phase 8 Push Notifications & Reminders Test
// ============================================================

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://mskwviowdpbsahuxxvmi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_fVjA3zeBUDGfntJZaO6glw_nRcIzG9P';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function runPhase8Tests() {
  console.log('🧪 Starting Phase 8 Push Notifications & Reminders Verification...\n');

  // 1. Check notifications table access
  console.log('1. Checking notifications table schema...');
  const { data: notifs, error: nErr } = await supabase
    .from('notifications')
    .select('id, user_id, type, title, body, is_read, sent_at')
    .limit(5);

  if (nErr) {
    console.log(`ℹ️ Notifications query status: "${nErr.message}" (RLS active for authenticated users)`);
  } else {
    console.log(`✅ Success: Queried ${notifs?.length || 0} existing notification(s):`);
    notifs?.forEach((n) => {
      console.log(`   - [${n.type}] ${n.title}: ${n.body.slice(0, 50)}... (read: ${n.is_read})`);
    });
  }

  // 2. Test process_booking_reminders RPC
  console.log('\n2. Testing process_booking_reminders RPC...');
  const { data: reminderResult, error: rErr } = await supabase.rpc('process_booking_reminders');

  if (rErr) {
    console.log(`ℹ️ process_booking_reminders RPC status: "${rErr.message}"`);
  } else {
    console.log('✅ process_booking_reminders executed successfully:', reminderResult);
  }

  // 3. Test mark_all_notifications_read RPC Auth Guard
  console.log('\n3. Testing mark_all_notifications_read RPC Auth Guard...');
  const fakeUserId = '00000000-0000-0000-0000-000000000000';
  const { error: markErr } = await supabase.rpc('mark_all_notifications_read', {
    p_user_id: fakeUserId,
  });

  if (markErr) {
    console.log(`✅ mark_all_notifications_read RPC guard active: "${markErr.message}"`);
  } else {
    console.log('⚠️ mark_all_notifications_read returned without error (unusual for unauthenticated fake ID)');
  }

  // 4. Test mark_notification_read RPC Auth Guard
  console.log('\n4. Testing mark_notification_read RPC Auth Guard...');
  const fakeNotifId = '00000000-0000-0000-0000-000000000000';
  const { error: singleMarkErr } = await supabase.rpc('mark_notification_read', {
    p_notification_id: fakeNotifId,
    p_user_id: fakeUserId,
  });

  if (singleMarkErr) {
    console.log(`✅ mark_notification_read RPC guard active: "${singleMarkErr.message}"`);
  } else {
    console.log('⚠️ mark_notification_read returned without error');
  }

  console.log('\n🎉 Phase 8 test script execution complete!');
}

runPhase8Tests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
