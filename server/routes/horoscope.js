import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { supabase } from '../services/supabase.js';
import { generateHoroscopeOnDemand } from '../jobs/dailyHoroscope.js';
import { getOrGenerateWeeklyWeather } from '../jobs/weeklyWeather.js';

const router = Router();

// GET /api/horoscope/today — serve cached or generate on demand
router.get('/today', requireAuth, async (req, res) => {
  const today = new Date().toISOString().split('T')[0];

  const { data: cached } = await supabase
    .from('daily_horoscopes')
    .select('*')
    .eq('user_id', req.user.id)
    .eq('date', today)
    .single();

  if (cached) return res.json(cached);

  const [{ data: profile }, { data: sub }] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('sun_sign, moon_sign, rising_sign, natal_chart')
      .eq('id', req.user.id)
      .single(),
    supabase
      .from('subscriptions')
      .select('plan, status')
      .eq('user_id', req.user.id)
      .single(),
  ]);

  if (!profile?.sun_sign) {
    return res.status(404).json({
      error: 'Complete onboarding to receive your daily horoscope',
    });
  }

  const isPremium = sub?.plan === 'premium' && ['active', 'trialing'].includes(sub.status);

  try {
    const horoscope = await generateHoroscopeOnDemand(req.user.id, profile, today, isPremium);
    res.json(horoscope);
  } catch (err) {
    console.error('[Horoscope] On-demand generation failed:', err.message);
    res.status(500).json({ error: 'Horoscope generation temporarily unavailable' });
  }
});

// GET /api/horoscope/weekly — current week's cosmic weather (all authenticated users)
router.get('/weekly', requireAuth, async (req, res) => {
  try {
    const weather = await getOrGenerateWeeklyWeather();
    res.json(weather);
  } catch (err) {
    console.error('[WeeklyWeather] Failed:', err.message);
    res.status(500).json({ error: 'Weekly weather temporarily unavailable' });
  }
});

// GET /api/horoscope/history?limit=7 — last N days
router.get('/history', requireAuth, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit ?? '7', 10), 30);

  const { data, error } = await supabase
    .from('daily_horoscopes')
    .select('date, sun_sign, content, is_personalized, generated_at')
    .eq('user_id', req.user.id)
    .order('date', { ascending: false })
    .limit(limit);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data ?? []);
});

export default router;
