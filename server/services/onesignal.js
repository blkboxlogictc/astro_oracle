const ONESIGNAL_API = 'https://onesignal.com/api/v1/notifications';

function getCredentials() {
  const appId  = process.env.ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_API_KEY;
  if (!appId || !apiKey) {
    console.warn('[OneSignal] Credentials not set — skipping push');
    return null;
  }
  return { appId, apiKey };
}

async function postNotification(payload) {
  const creds = getCredentials();
  if (!creds) return null;

  const body = {
    app_id:            creds.appId,
    chrome_web_icon:   'https://astrooracle.space/icons/icon-192.png',
    url:               'https://astrooracle.space',
    ...payload,
  };

  const res = await fetch(ONESIGNAL_API, {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization:  `Basic ${creds.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OneSignal error: ${err}`);
  }

  return res.json();
}

// ── sendToUser ────────────────────────────────────────────────────────────────
// Sends a notification to a specific user identified by their Supabase user ID
// (set as the OneSignal external user ID via OneSignal.login(userId)).

export async function sendToUser(userId, notification) {
  if (!userId) return null;
  return postNotification({
    include_external_user_ids: [userId],
    channel_for_external_user_ids: 'push',
    headings: { en: notification.title },
    contents: { en: notification.message },
    url:      notification.url ?? 'https://astrooracle.space',
    data:     { eventType: notification.eventType ?? 'general' },
  });
}

// ── sendToSegment ─────────────────────────────────────────────────────────────
// Sends to a named OneSignal segment (e.g. "All", "Premium Users").

export async function sendToSegment(segment, notification) {
  return postNotification({
    included_segments: [segment],
    headings: { en: notification.title },
    contents: { en: notification.message },
    url:      notification.url ?? 'https://astrooracle.space',
    data:     { eventType: notification.eventType ?? 'general' },
  });
}

// ── sendToUsers ───────────────────────────────────────────────────────────────
// Sends to a batch of user IDs (up to 2,000 per OneSignal limit).

export async function sendToUsers(userIds, notification) {
  if (!userIds?.length) return null;
  return postNotification({
    include_external_user_ids: userIds,
    channel_for_external_user_ids: 'push',
    headings: { en: notification.title },
    contents: { en: notification.message },
    url:      notification.url ?? 'https://astrooracle.space',
    data:     { eventType: notification.eventType ?? 'general' },
  });
}

// ── sendFullMoonAlert ─────────────────────────────────────────────────────────

export async function sendFullMoonAlert(event, affectedUserIds) {
  if (!affectedUserIds?.length) return null;
  const sign = event.event_name?.replace('Full Moon in ', '') ?? 'the sky';
  return sendToUsers(affectedUserIds, {
    title:     `🌕 Full Moon in ${sign}`,
    message:   event.description ?? `The Full Moon in ${sign} is here — a powerful moment for release and clarity.`,
    url:       'https://astrooracle.space/events',
    eventType: 'full_moon',
  });
}

// ── sendNewMoonAlert ──────────────────────────────────────────────────────────

export async function sendNewMoonAlert(event, affectedUserIds) {
  if (!affectedUserIds?.length) return null;
  const sign = event.event_name?.replace('New Moon in ', '') ?? 'the sky';
  return sendToUsers(affectedUserIds, {
    title:     `🌑 New Moon in ${sign}`,
    message:   event.description ?? `The New Moon in ${sign} opens a fresh cycle — time to set intentions.`,
    url:       'https://astrooracle.space/events',
    eventType: 'new_moon',
  });
}

// ── sendRetrogradeAlert ───────────────────────────────────────────────────────

export async function sendRetrogradeAlert(planet, event, affectedUserIds) {
  if (!affectedUserIds?.length) return null;
  const isRetro = event.event_type === 'retrograde_start';
  return sendToUsers(affectedUserIds, {
    title:     `℞ ${capitalize(planet)} ${isRetro ? 'Retrograde' : 'Direct'}`,
    message:   event.description ?? (isRetro
      ? `${capitalize(planet)} has stationed retrograde. Time for review and reflection.`
      : `${capitalize(planet)} is direct again. Forward momentum returns.`),
    url:       'https://astrooracle.space/events',
    eventType: event.event_type,
  });
}

// ── sendMeteorShowerAlert ─────────────────────────────────────────────────────

export async function sendMeteorShowerAlert(event) {
  return sendToSegment('All', {
    title:     `☄️ ${event.event_name ?? 'Meteor Shower Tonight'}`,
    message:   event.visibility_info ?? 'Step outside tonight and look up — a meteor shower peaks this evening.',
    url:       'https://astrooracle.space/events',
    eventType: 'meteor_shower',
  });
}

// ── sendDailyHoroscopeNudge ───────────────────────────────────────────────────

export async function sendDailyHoroscopeNudge(userId, sunSign) {
  return sendToUser(userId, {
    title:     '✦ Your Daily Horoscope is Ready',
    message:   sunSign
      ? `Today's ${capitalize(sunSign)} reading has arrived — see what the stars say.`
      : 'Your daily cosmic forecast is ready — tap to read.',
    url:       'https://astrooracle.space/',
    eventType: 'daily_horoscope',
  });
}

// ── Legacy: sendPushNotification ──────────────────────────────────────────────
// Kept for backward compatibility with eventMonitor until fully migrated.

export async function sendPushNotification({ playerIds, title, body, data = {} }) {
  if (!playerIds?.length) return null;
  return postNotification({
    include_player_ids: playerIds,
    headings: { en: title },
    contents: { en: body },
    data,
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
