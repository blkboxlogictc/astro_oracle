import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { supabase } from '../services/supabase.js';

const router = Router();

// All columns the client can read/write
const PREF_FIELDS = [
  'email_notifications',
  'push_notifications',
  'daily_horoscope',
  'weekly_weather',
  'full_moon',
  'new_moon',
  'retrogrades',
  'meteor_showers',
  'personal_transits',
  'notify_eclipses',
  'notify_retrogrades',
  'notify_lunations',
  'notify_meteor_showers',
];

const DEFAULTS = {
  email_notifications: true,
  push_notifications: false,
  daily_horoscope: true,
  weekly_weather: true,
  full_moon: true,
  new_moon: true,
  retrogrades: true,
  meteor_showers: true,
  personal_transits: false,
  notify_eclipses: true,
  notify_retrogrades: true,
  notify_lunations: true,
  notify_meteor_showers: true,
};

// GET /api/notifications/preferences
router.get('/preferences', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('notification_preferences')
    .select(PREF_FIELDS.join(', '))
    .eq('user_id', req.user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    return res.status(500).json({ error: error.message });
  }

  res.json(data ?? DEFAULTS);
});

// PUT /api/notifications/preferences
router.put('/preferences', requireAuth, async (req, res) => {
  const updates = Object.fromEntries(
    PREF_FIELDS.filter(k => req.body[k] != null).map(k => [k, req.body[k]])
  );

  const { data, error } = await supabase
    .from('notification_preferences')
    .upsert({ user_id: req.user.id, ...updates }, { onConflict: 'user_id' })
    .select(PREF_FIELDS.join(', '))
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/notifications/register-device — save OneSignal player ID
router.post('/register-device', requireAuth, async (req, res) => {
  const { playerId } = req.body;
  if (!playerId) return res.status(400).json({ error: 'playerId is required' });

  const { data, error } = await supabase
    .from('notification_preferences')
    .upsert({
      user_id: req.user.id,
      onesignal_player_id: playerId,
      push_notifications: true,
    }, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ registered: true, preferences: data });
});

export default router;
