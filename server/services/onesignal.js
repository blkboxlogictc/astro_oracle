const ONESIGNAL_API = 'https://onesignal.com/api/v1/notifications';

export async function sendPushNotification({ playerIds, title, body, data = {} }) {
  if (!process.env.ONESIGNAL_APP_ID || !process.env.ONESIGNAL_API_KEY) {
    console.warn('[OneSignal] Credentials not set — skipping push');
    return;
  }
  if (!playerIds?.length) return;

  const response = await fetch(ONESIGNAL_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${process.env.ONESIGNAL_API_KEY}`,
    },
    body: JSON.stringify({
      app_id: process.env.ONESIGNAL_APP_ID,
      include_player_ids: playerIds,
      headings: { en: title },
      contents: { en: body },
      data,
      url: 'https://astrooracle.space',
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OneSignal error: ${err}`);
  }
}
