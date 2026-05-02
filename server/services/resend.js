import { Resend } from 'resend';
import { renderWelcomeEmail, welcomeEmailSubject } from '../emails/WelcomeEmail.js';
import { renderPremiumWelcomeEmail, premiumWelcomeEmailSubject } from '../emails/PremiumWelcomeEmail.js';
import { renderSubscriptionCancelledEmail, subscriptionCancelledEmailSubject } from '../emails/SubscriptionCancelledEmail.js';
import { renderPaymentFailedEmail, paymentFailedEmailSubject } from '../emails/PaymentFailedEmail.js';
import { renderDailyHoroscopeEmail, dailyHoroscopeEmailSubject } from '../emails/DailyHoroscopeEmail.js';
import { renderCosmicEventEmail, cosmicEventEmailSubject } from '../emails/CosmicEventEmail.js';
import { renderWeeklyWeatherEmail, weeklyWeatherEmailSubject } from '../emails/WeeklyWeatherEmail.js';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = `AstroOracle <${process.env.RESEND_FROM_EMAIL ?? 'cosmic@astrooracle.space'}>`;

async function sendEmail({ to, subject, html }) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Resend] RESEND_API_KEY not set — skipping email');
    return;
  }
  const { error } = await resend.emails.send({ from: FROM, to, subject, html });
  if (error) throw new Error(`Resend error: ${error.message}`);
}

// ── Typed send helpers ────────────────────────────────────────────────────────

export async function sendWelcomeEmail(to, displayName) {
  const html = await renderWelcomeEmail({ displayName });
  return sendEmail({ to, subject: welcomeEmailSubject(displayName), html });
}

export async function sendPremiumWelcomeEmail(to, displayName, hasBirthChart = false) {
  const html = await renderPremiumWelcomeEmail({ displayName, hasBirthChart });
  return sendEmail({ to, subject: premiumWelcomeEmailSubject(), html });
}

export async function sendSubscriptionCancelledEmail(to, displayName, periodEnd) {
  const html = await renderSubscriptionCancelledEmail({ displayName, periodEnd });
  return sendEmail({ to, subject: subscriptionCancelledEmailSubject(), html });
}

export async function sendPaymentFailedEmail(to, displayName, last4, portalUrl) {
  const html = await renderPaymentFailedEmail({ displayName, last4, portalUrl });
  return sendEmail({ to, subject: paymentFailedEmailSubject(), html });
}

export async function sendDailyHoroscopeEmail(to, { displayName, sunSign, dateLabel, content, moonPhase }) {
  const html = await renderDailyHoroscopeEmail({ displayName, sunSign, dateLabel, content, moonPhase });
  return sendEmail({ to, subject: dailyHoroscopeEmailSubject(sunSign, dateLabel), html });
}

export async function sendCosmicEventEmail(to, displayName, event) {
  const eventName = event.description ?? event.event_name ?? event.type ?? 'Cosmic Event';
  const dateStr = event.event_date
    ? new Date(event.event_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
    : 'soon';
  const html = await renderCosmicEventEmail({ displayName, event });
  return sendEmail({ to, subject: cosmicEventEmailSubject(eventName, dateStr), html });
}

export async function sendWeeklyWeatherEmail(to, { displayName, weekLabel, content, isPremium }) {
  const html = await renderWeeklyWeatherEmail({ displayName, weekLabel, content, isPremium });
  return sendEmail({ to, subject: weeklyWeatherEmailSubject(weekLabel), html });
}
