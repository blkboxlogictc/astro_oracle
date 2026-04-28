import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { supabase } from '../services/supabase.js';

const router = Router();

// GET /api/notifications/preferences
router.get('/preferences', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', req.user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    return res.status(500).json({ error: error.message });
  }

  res.json(data ?? {
    email_notifications: true,
    push_notifications: false,
    notify_retrogrades: true,
    notify_lunations: true,
    notify_eclipses: true,
    notify_meteor_showers: true,
  });
});

// PUT /api/notifications/preferences
router.put('/preferences', requireAuth, async (req, res) => {
  const allowed = [
    'email_notifications', 'push_notifications',
    'notify_retrogrades', 'notify_lunations',
    'notify_eclipses', 'notify_meteor_showers',
  ];

  const updates = Object.fromEntries(
    allowed.filter(k => req.body[k] != null).map(k => [k, req.body[k]])
  );

  const { data, error } = await supabase
    .from('notification_preferences')
    .upsert({ user_id: req.user.id, ...updates }, { onConflict: 'user_id' })
    .select()
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
