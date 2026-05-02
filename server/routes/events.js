import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { supabase } from '../services/supabase.js';

const router = Router();

// GET /api/events — upcoming + recent cosmic events
// Returns events from 7 days ago through 60 days ahead, ordered by date.
router.get('/', requireAuth, async (req, res) => {
  const now = new Date();
  const pastCutoff = new Date(now);
  pastCutoff.setDate(pastCutoff.getDate() - 7);
  const futureCutoff = new Date(now);
  futureCutoff.setDate(futureCutoff.getDate() + 60);

  const { data, error } = await supabase
    .from('cosmic_events')
    .select('id, event_type, event_name, event_date, description, scientific_description, affected_signs, visibility_info')
    .gte('event_date', pastCutoff.toISOString())
    .lte('event_date', futureCutoff.toISOString())
    .order('event_date', { ascending: true })
    .limit(30);

  if (error) return res.status(500).json({ error: error.message });

  // Tag each event as upcoming or past relative to now
  const tagged = (data ?? []).map(e => ({
    ...e,
    is_past: new Date(e.event_date) < now,
  }));

  res.json(tagged);
});

export default router;
