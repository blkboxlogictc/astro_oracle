import { ChatAnthropic } from '@langchain/anthropic';
import { supabase } from '../services/supabase.js';
import { getCurrentPlanetaryPositions, getUpcomingCosmicEvents } from '../services/ephemeris.js';
import { sendWeeklyWeatherEmail } from '../services/resend.js';

const model = new ChatAnthropic({
  model: 'claude-haiku-4-5-20251001',
  temperature: 0.8,
  maxTokens: 1000,
});

// ── Cron entry point ──────────────────────────────────────────────────────────
export async function runWeeklyWeather() {
  const weekStart = getWeekStart();
  console.log(`[WeeklyWeather] Generating for week of ${weekStart}`);

  const { data: existing } = await supabase
    .from('weekly_weather')
    .select('id')
    .eq('week_start', weekStart)
    .single();

  if (existing) {
    console.log(`[WeeklyWeather] Already generated for ${weekStart} — skipping`);
    return;
  }

  const [planets, events] = await Promise.all([
    getCurrentPlanetaryPositions(),
    getUpcomingCosmicEvents(7),
  ]);

  const content = await generateWeeklyReport(planets, events, weekStart);

  await supabase
    .from('weekly_weather')
    .upsert({ week_start: weekStart, content, generated_at: new Date().toISOString() },
      { onConflict: 'week_start' });

  await sendWeeklyWeatherEmails(weekStart, content);
  console.log(`[WeeklyWeather] Complete for ${weekStart}`);
}

// ── On-demand fetch/generate (called by route) ────────────────────────────────
export async function getOrGenerateWeeklyWeather() {
  const weekStart = getWeekStart();

  const { data: cached } = await supabase
    .from('weekly_weather')
    .select('*')
    .eq('week_start', weekStart)
    .single();

  if (cached) return cached;

  const [planets, events] = await Promise.all([
    getCurrentPlanetaryPositions(),
    getUpcomingCosmicEvents(7),
  ]);

  const content = await generateWeeklyReport(planets, events, weekStart);

  const { data, error } = await supabase
    .from('weekly_weather')
    .upsert({ week_start: weekStart, content, generated_at: new Date().toISOString() },
      { onConflict: 'week_start' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ── Internal helpers ──────────────────────────────────────────────────────────
async function generateWeeklyReport(planets, events, weekStart) {
  const PLANETS = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
  const planetSummary = PLANETS
    .filter(k => planets[k])
    .map(k => `${capitalize(k)} in ${planets[k].sign}${planets[k].retrograde ? ' ℞' : ''}`)
    .join(', ');

  const eventList = events.slice(0, 8)
    .map(e => `${e.date ?? 'this week'}: ${e.description ?? e.type}`)
    .join('\n') || 'No major exact aspects this week — a quieter cosmic period.';

  const [year, month, day] = weekStart.split('-').map(Number);
  const label = new Date(year, month - 1, day)
    .toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const prompt = `You are a professional astrologer writing the weekly cosmic weather report for the week of ${label}.

Current planetary positions: ${planetSummary}

Notable cosmic events this week:
${eventList}

Write an engaging, insightful weekly forecast. Return ONLY valid JSON:
{
  "headline": "A compelling 8-12 word headline for the week",
  "overview": "3-4 sentences summarizing the week's cosmic energy and themes",
  "themes": ["theme1", "theme2", "theme3"],
  "keyEvents": [
    { "day": "day name or date", "event": "what's happening", "meaning": "1 sentence interpretation" }
  ],
  "advice": "One powerful piece of cosmic advice for the week",
  "bestDays": ["Day1", "Day2"],
  "challengingDays": ["Day3"]
}`;

  const response = await model.invoke([{ role: 'user', content: prompt }]);
  const match = response.content.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON in weekly weather response');
  return JSON.parse(match[0]);
}

async function sendWeeklyWeatherEmails(weekStart, content) {
  const [year, month, day] = weekStart.split('-').map(Number);
  const weekLabel = new Date(year, month - 1, day)
    .toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const { data: prefs } = await supabase
    .from('notification_preferences')
    .select('user_id, email_notifications')
    .eq('email_notifications', true);

  if (!prefs?.length) return;

  const userIds = prefs.map(p => p.user_id);
  const [{ data: profiles }, { data: premiumSubs }] = await Promise.all([
    supabase.from('user_profiles').select('id, email, display_name').in('id', userIds),
    supabase.from('subscriptions').select('user_id').in('user_id', userIds).eq('plan', 'premium').in('status', ['active', 'trialing']),
  ]);

  if (!profiles?.length) return;

  const premiumSet = new Set((premiumSubs ?? []).map(s => s.user_id));

  await Promise.allSettled(
    profiles.map(profile => {
      if (!profile.email) return Promise.resolve();
      return sendWeeklyWeatherEmail(profile.email, {
        displayName: profile.display_name ?? 'Cosmic Seeker',
        weekLabel,
        content,
        isPremium: premiumSet.has(profile.id),
      }).catch(err => console.error(`[WeeklyWeather] Email failed for ${profile.id}:`, err.message));
    })
  );

  console.log(`[WeeklyWeather] Sent emails to ${profiles.length} users`);
}

function getWeekStart() {
  const now = new Date();
  const day = now.getUTCDay(); // 0 = Sunday, 1 = Monday
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() + diff);
  return monday.toISOString().split('T')[0];
}

const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1);
