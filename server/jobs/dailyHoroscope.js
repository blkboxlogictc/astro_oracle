import { ChatAnthropic } from '@langchain/anthropic';
import { supabase } from '../services/supabase.js';
import { getCurrentPlanetaryPositions, calculateTransits } from '../services/ephemeris.js';
import { sendDailyHoroscopeEmail } from '../services/resend.js';

const model = new ChatAnthropic({
  model: 'claude-haiku-4-5-20251001',
  temperature: 0.85,
  maxTokens: 600,
});

// ── Cron entry point ──────────────────────────────────────────────────────────
export async function runDailyHoroscope() {
  const today = todayUTC();
  console.log(`[DailyHoroscope] Starting generation for ${today}`);

  const planets = await getCurrentPlanetaryPositions();

  const { data: users, error } = await supabase
    .from('user_profiles')
    .select('id, email, display_name, sun_sign, moon_sign, rising_sign, natal_chart')
    .eq('onboarding_complete', true)
    .not('sun_sign', 'is', null);

  if (error) {
    console.error('[DailyHoroscope] Failed to fetch users:', error.message);
    return;
  }

  if (!users.length) {
    console.log('[DailyHoroscope] No users to generate for');
    return;
  }

  // Batch-fetch premium status, email opt-ins, and already-generated records
  const userIds = users.map(u => u.id);

  const [{ data: premiumSubs }, { data: existing }, { data: notifPrefs }] = await Promise.all([
    supabase
      .from('subscriptions')
      .select('user_id')
      .in('user_id', userIds)
      .eq('plan', 'premium')
      .in('status', ['active', 'trialing']),
    supabase
      .from('daily_horoscopes')
      .select('user_id')
      .in('user_id', userIds)
      .eq('date', today),
    supabase
      .from('notification_preferences')
      .select('user_id, email_notifications, daily_horoscope')
      .in('user_id', userIds)
      .eq('email_notifications', true),
  ]);

  const premiumSet = new Set((premiumSubs ?? []).map(s => s.user_id));
  const generatedSet = new Set((existing ?? []).map(h => h.user_id));
  // daily_horoscope defaults to true — only exclude if explicitly set false
  const emailOptInSet = new Set(
    (notifPrefs ?? []).filter(p => p.daily_horoscope !== false).map(p => p.user_id)
  );
  const toGenerate = users.filter(u => !generatedSet.has(u.id));

  console.log(`[DailyHoroscope] ${toGenerate.length} to generate, ${generatedSet.size} already done`);

  // Process in batches of 5 to stay within API rate limits
  const BATCH = 5;
  for (let i = 0; i < toGenerate.length; i += BATCH) {
    await Promise.allSettled(
      toGenerate.slice(i, i + BATCH).map(u =>
        generateAndSave(u.id, u, planets, today, premiumSet.has(u.id), emailOptInSet.has(u.id))
      )
    );
    if (i + BATCH < toGenerate.length) await sleep(2000);
  }

  console.log(`[DailyHoroscope] Complete for ${today}`);
}

// ── On-demand generation (called by route when cron hasn't run yet) ───────────
export async function generateHoroscopeOnDemand(userId, profile, date, isPremium) {
  const planets = await getCurrentPlanetaryPositions();
  return generateAndSave(userId, profile, planets, date, isPremium, false);
}

// ── Internal helpers ──────────────────────────────────────────────────────────
async function generateAndSave(userId, profile, planets, date, isPremium, sendEmailNotif) {
  let transits = null;
  if (isPremium && profile.natal_chart) {
    try { transits = await calculateTransits(profile.natal_chart); } catch {}
  }

  const content = await generateHoroscopeContent(profile, planets, transits, isPremium);

  const { data, error } = await supabase
    .from('daily_horoscopes')
    .upsert({
      user_id: userId,
      date,
      sun_sign: profile.sun_sign,
      content,
      is_personalized: isPremium && !!profile.natal_chart,
      generated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,date' })
    .select()
    .single();

  if (error) throw new Error(`DB upsert failed for ${userId}: ${error.message}`);

  if (sendEmailNotif && profile.email && profile.sun_sign) {
    const dateLabel = new Date(date + 'T12:00:00Z').toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric',
    });
    sendDailyHoroscopeEmail(profile.email, {
      displayName: profile.display_name ?? 'Cosmic Seeker',
      sunSign: capitalize(profile.sun_sign),
      dateLabel,
      content,
      moonPhase: null,
    }).catch(err => console.error(`[DailyHoroscope] Email failed for ${userId}:`, err.message));
  }

  return data;
}

async function generateHoroscopeContent(profile, planets, transits, isPremium) {
  const PLANETS = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'];
  const planetSummary = PLANETS
    .filter(k => planets[k])
    .map(k => `${capitalize(k)} in ${planets[k].sign}${planets[k].retrograde ? ' ℞' : ''}`)
    .join(', ');

  const transitSummary = transits?.length
    ? transits.slice(0, 5).map(t => `${t.planet} ${t.aspect} natal ${t.natalPlanet}`).join('; ')
    : null;

  const prompt = isPremium && profile.natal_chart
    ? `You are a professional astrologer. Write a personalized daily horoscope for someone with Sun in ${profile.sun_sign}, Moon in ${profile.moon_sign}, Rising in ${profile.rising_sign}.
Today's sky: ${planetSummary}.${transitSummary ? `\nActive transits: ${transitSummary}.` : ''}
Be warm, specific, and insightful. Return ONLY valid JSON:
{"overview":"2-3 sentences","love":"1-2 sentences","career":"1-2 sentences","wellness":"1-2 sentences","cosmicAdvice":"one memorable line"}`
    : `You are a professional astrologer. Write a daily horoscope for ${profile.sun_sign}.
Today's sky: ${planetSummary}.
Return ONLY valid JSON:
{"overview":"2-3 sentences","love":"1-2 sentences","career":"1-2 sentences","wellness":"1-2 sentences","cosmicAdvice":"one memorable line"}`;

  const response = await model.invoke([{ role: 'user', content: prompt }]);
  const match = response.content.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON in horoscope response');
  return JSON.parse(match[0]);
}

const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1);
const todayUTC = () => new Date().toISOString().split('T')[0];
const sleep = ms => new Promise(r => setTimeout(r, ms));
