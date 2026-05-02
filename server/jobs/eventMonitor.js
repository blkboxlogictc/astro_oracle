import { supabase } from '../services/supabase.js';
import { getUpcomingCosmicEvents } from '../services/ephemeris.js';
import { sendCosmicEventEmail } from '../services/resend.js';
import { sendPushNotification } from '../services/onesignal.js';

const PREF_COLUMN = {
  new_moon: 'notify_lunations',
  full_moon: 'notify_lunations',
  retrograde_start: 'notify_retrogrades',
  retrograde_end: 'notify_retrogrades',
  eclipse: 'notify_eclipses',
  meteor_shower: 'notify_meteor_showers',
};

export async function runEventMonitor() {
  console.log('[EventMonitor] Starting');

  const events = await getUpcomingCosmicEvents(3);
  if (!events.length) {
    console.log('[EventMonitor] No upcoming events in next 3 days');
    return;
  }

  for (const event of events) {
    await processEvent(event).catch(err =>
      console.error(`[EventMonitor] Error processing "${event.type}":`, err.message)
    );
  }

  console.log('[EventMonitor] Complete');
}

async function processEvent(event) {
  const eventDate = event.date ?? new Date().toISOString().split('T')[0];
  const eventType = event.type ?? 'general';

  // Query by date range since event_date is timestamptz
  const dateStart = `${eventDate}T00:00:00Z`;
  const dateEnd = `${eventDate}T23:59:59Z`;

  const { data: existing } = await supabase
    .from('cosmic_events')
    .select('id, notified_at')
    .eq('event_type', eventType)
    .gte('event_date', dateStart)
    .lte('event_date', dateEnd)
    .maybeSingle();

  if (existing?.notified_at) return; // Already notified

  // Insert if no record yet for this event
  let eventId = existing?.id;
  if (!eventId) {
    const { data: inserted } = await supabase
      .from('cosmic_events')
      .insert({
        event_type: eventType,
        event_name: event.description ?? eventType,
        description: event.description ?? eventType,
        event_date: new Date(eventDate).toISOString(),
      })
      .select('id')
      .single();
    eventId = inserted?.id;
  }

  // Find opted-in users
  const prefCol = PREF_COLUMN[eventType];
  let query = supabase
    .from('notification_preferences')
    .select('user_id, email_notifications, push_notifications, onesignal_player_id');
  if (prefCol) query = query.eq(prefCol, true);

  const { data: prefs } = await query;
  if (!prefs?.length) {
    await markNotified(eventId);
    return;
  }

  const emailUserIds = prefs.filter(p => p.email_notifications).map(p => p.user_id);
  const pushPrefs = prefs.filter(p => p.push_notifications && p.onesignal_player_id);

  let profileMap = {};
  if (emailUserIds.length) {
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, email, display_name')
      .in('id', emailUserIds);
    profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]));
  }

  const emailPromises = emailUserIds.map(userId => {
    const profile = profileMap[userId];
    if (!profile?.email) return Promise.resolve();
    return sendCosmicEventEmail(
      profile.email,
      profile.display_name ?? 'Cosmic Seeker',
      event,
    ).catch(err => console.error(`[EventMonitor] Email failed for ${userId}:`, err.message));
  });

  const playerIds = pushPrefs.map(p => p.onesignal_player_id);
  const pushPromise = sendPushNotification({
    playerIds,
    title: '✨ Cosmic Alert',
    body: event.description ?? eventType,
    data: { eventType, eventDate },
  }).catch(err => console.error('[EventMonitor] Push failed:', err.message));

  await Promise.allSettled([...emailPromises, pushPromise]);
  await markNotified(eventId);

  console.log(`[EventMonitor] Notified — ${emailUserIds.length} email, ${playerIds.length} push — "${event.description}"`);
}

async function markNotified(eventId) {
  if (!eventId) return;
  await supabase
    .from('cosmic_events')
    .update({ notified_at: new Date().toISOString() })
    .eq('id', eventId);
}
