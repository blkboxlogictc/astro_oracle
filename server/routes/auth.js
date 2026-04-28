import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { supabase } from '../services/supabase.js';
import { calculateNatalChart } from '../services/ephemeris.js';

const router = Router();

// POST /api/auth/profile — create or update user profile fields
router.post('/profile', requireAuth, async (req, res) => {
  const {
    display_name,
    birth_date, birth_time, birth_location,
    birth_latitude, birth_longitude, birth_timezone,
  } = req.body;

  const { data, error } = await supabase
    .from('user_profiles')
    .upsert({
      id: req.user.id,
      email: req.user.email,
      display_name,
      birth_date,
      birth_time,
      birth_location,
      birth_latitude,
      birth_longitude,
      birth_timezone,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/auth/profile — get current user's full profile
router.get('/profile', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', req.user.id)
    .single();

  // PGRST116 = no rows — not an error, just a new user with no profile yet
  if (error && error.code !== 'PGRST116') {
    return res.status(500).json({ error: error.message });
  }

  res.json(data ?? null);
});

// POST /api/auth/onboarding — save birth data and trigger natal chart calculation
router.post('/onboarding', requireAuth, async (req, res) => {
  const {
    birth_date, birth_time,
    birth_location, birth_latitude, birth_longitude, birth_timezone,
  } = req.body;

  if (!birth_date || birth_latitude == null || birth_longitude == null) {
    return res.status(400).json({
      error: 'birth_date, birth_latitude, and birth_longitude are required',
    });
  }

  // Calculate natal chart — returns {} stub until Stage 3 is complete
  let natalChart = null;
  let sun_sign = null;
  let moon_sign = null;
  let rising_sign = null;

  try {
    natalChart = await calculateNatalChart(
      birth_date,
      birth_time ?? '12:00',
      parseFloat(birth_latitude),
      parseFloat(birth_longitude),
      birth_timezone ?? 'UTC'
    );
    sun_sign = natalChart.sun?.sign ?? null;
    moon_sign = natalChart.moon?.sign ?? null;
    rising_sign = natalChart.ascendant?.sign ?? null;
  } catch (err) {
    // Don't block onboarding if ephemeris fails — chart recalculated in Stage 3
    console.error('[Onboarding] Chart calculation failed:', err.message);
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .upsert({
      id: req.user.id,
      email: req.user.email,
      birth_date,
      birth_time: birth_time ?? '12:00:00',
      birth_location: birth_location ?? null,
      birth_latitude: parseFloat(birth_latitude),
      birth_longitude: parseFloat(birth_longitude),
      birth_timezone: birth_timezone ?? 'UTC',
      natal_chart: natalChart,
      sun_sign,
      moon_sign,
      rising_sign,
      onboarding_complete: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // Seed notification preferences for new users — ignore if already exists
  await supabase
    .from('notification_preferences')
    .upsert({ user_id: req.user.id }, { onConflict: 'user_id', ignoreDuplicates: true });

  res.json(data);
});

// GET /api/auth/subscription — get current subscription status
router.get('/subscription', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('plan, status, current_period_end, cancel_at_period_end, stripe_customer_id')
    .eq('user_id', req.user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    return res.status(500).json({ error: error.message });
  }

  // No subscription row = free plan
  res.json(data ?? { plan: 'free', status: 'active' });
});

export default router;
