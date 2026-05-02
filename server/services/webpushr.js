const WEBPUSHR_BASE = 'https://api.webpushr.com/v1';

function getHeaders() {
  const key   = process.env.WEBPUSHR_API_KEY;
  const token = process.env.WEBPUSHR_AUTH_TOKEN;
  if (!key || !token) {
    console.warn('[Webpushr] Credentials not set — skipping push');
    return null;
  }
  return {
    'webpushrKey':       key,
    'webpushrAuthToken': token,
    'Content-Type':      'application/json',
  };
}

async function post(path, body) {
  const headers = getHeaders();
  if (!headers) return null;

  const res = await fetch(`${WEBPUSHR_BASE}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      icon:      'https://astrooracle.space/icon-192.png',
      auto_hide: 1,
      target_url: 'https://astrooracle.space',
      ...body,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Webpushr error (${res.status}): ${err}`);
  }
  return res.json();
}

// ── sendToSegment ─────────────────────────────────────────────────────────────

export async function sendToSegment(segmentName, notification) {
  return post('/notification/send/segment', {
    title:      notification.title,
    message:    notification.message,
    target_url: notification.url ?? 'https://astrooracle.space',
    segment:    segmentName,
  });
}

// ── sendToUser ────────────────────────────────────────────────────────────────

export async function sendToUser(userId, notification) {
  if (!userId) return null;
  return post('/notification/send/uid', {
    title:      notification.title,
    message:    notification.message,
    target_url: notification.url ?? 'https://astrooracle.space',
    uid:        userId,
  });
}

// ── Event-specific helpers ────────────────────────────────────────────────────

export async function sendFullMoonAlert(event) {
  return sendToSegment('Full Moon Opt-In', {
    title:   `🌕 ${event.event_name}`,
    message: event.description,
    url:     'https://astrooracle.space/events',
  });
}

export async function sendNewMoonAlert(event) {
  return sendToSegment('Full Moon Opt-In', {
    title:   `🌑 ${event.event_name}`,
    message: event.description,
    url:     'https://astrooracle.space/events',
  });
}

export async function sendRetrogradeAlert(planet, event) {
  return sendToSegment('Retrograde Opt-In', {
    title:   `℞ ${event.event_name}`,
    message: event.description,
    url:     'https://astrooracle.space/events',
  });
}

export async function sendMeteorShowerAlert(event) {
  return sendToSegment('Meteor Shower Opt-In', {
    title:   `☄️ ${event.event_name}`,
    message: event.visibility_info ?? event.description,
    url:     'https://astrooracle.space/events',
  });
}

export async function sendDailyHoroscopeNudge(userId, sunSign) {
  return sendToUser(userId, {
    title:   '✦ Your Daily Horoscope is Ready',
    message: sunSign
      ? `Your ${capitalize(sunSign)} reading for today has arrived.`
      : 'Your daily cosmic forecast is ready — tap to read.',
    url:     'https://astrooracle.space/',
  });
}

function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
