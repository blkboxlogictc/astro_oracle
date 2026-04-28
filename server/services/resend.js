import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = `AstroOracle <${process.env.RESEND_FROM_EMAIL ?? 'cosmic@astrooracle.space'}>`;

export async function sendEmail({ to, subject, html }) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Resend] RESEND_API_KEY not set — skipping email');
    return;
  }
  const { error } = await resend.emails.send({ from: FROM, to, subject, html });
  if (error) throw new Error(`Resend error: ${error.message}`);
}

export function cosmicEventEmailHtml(event, displayName) {
  const dateStr = event.event_date
    ? new Date(event.event_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    : 'soon';

  return `<!DOCTYPE html>
<html>
<body style="font-family:Georgia,serif;background:#0a0a1a;color:#e0d5f5;padding:32px;max-width:600px;margin:0 auto;">
  <h1 style="color:#c084fc;font-size:24px;margin-bottom:8px;">✨ Cosmic Alert</h1>
  <h2 style="color:#e0d5f5;font-size:20px;margin-top:0;">${event.description ?? event.type}</h2>
  <p style="color:#a78bca;font-size:16px;">Hello ${displayName}, a significant celestial event arrives <strong>${dateStr}</strong>.</p>
  <p style="color:#c4b5d4;font-size:14px;">Open AstroOracle to see how this affects your chart.</p>
  <a href="https://astrooracle.space" style="display:inline-block;background:#7c3aed;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:16px;">Open AstroOracle</a>
  <p style="color:#6b5a8a;font-size:12px;margin-top:32px;">
    You're receiving this because you opted into cosmic event alerts.
    <a href="https://astrooracle.space/settings" style="color:#9f7ae0;">Manage preferences</a>
  </p>
</body>
</html>`;
}
