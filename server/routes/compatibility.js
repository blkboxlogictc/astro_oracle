import { Router } from 'express';
import { ChatAnthropic } from '@langchain/anthropic';
import { requireAuth } from '../middleware/requireAuth.js';
import { requirePremium } from '../middleware/requirePremium.js';
import { supabase } from '../services/supabase.js';
import { calculateNatalChart, calculateSynastry } from '../services/ephemeris.js';

const router = Router();

const model = new ChatAnthropic({
  model: 'claude-sonnet-4-6',
  temperature: 0.8,
  maxTokens: 1200,
});

// POST /api/compatibility/analyze — premium only
router.post('/analyze', requirePremium, async (req, res) => {
  const {
    partnerName,
    partnerBirthDate,
    partnerBirthTime,
    partnerBirthLatitude,
    partnerBirthLongitude,
    partnerBirthTimezone,
    partnerBirthLocation,
  } = req.body;

  if (!partnerBirthDate || partnerBirthLatitude == null || partnerBirthLongitude == null) {
    return res.status(400).json({
      error: 'partnerBirthDate, partnerBirthLatitude, and partnerBirthLongitude are required',
    });
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('natal_chart, sun_sign, moon_sign, rising_sign')
    .eq('id', req.user.id)
    .single();

  if (!profile?.natal_chart) {
    return res.status(400).json({
      error: 'Complete onboarding with birth data before running compatibility analysis',
    });
  }

  try {
    const partnerNatalChart = await calculateNatalChart(
      partnerBirthDate,
      partnerBirthTime ?? '12:00',
      parseFloat(partnerBirthLatitude),
      parseFloat(partnerBirthLongitude),
      partnerBirthTimezone ?? 'UTC'
    );

    const synastryData = await calculateSynastry(profile.natal_chart, partnerNatalChart);
    const reading = await generateCompatibilityReading(profile, partnerNatalChart, synastryData, partnerName);

    const { data, error } = await supabase
      .from('compatibility_readings')
      .insert({
        user_id: req.user.id,
        partner_name: partnerName ?? null,
        partner_birth_date: partnerBirthDate,
        partner_birth_time: partnerBirthTime ?? null,
        partner_birth_location: partnerBirthLocation ?? null,
        partner_natal_chart: partnerNatalChart,
        synastry_data: synastryData,
        reading,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    res.json(data);
  } catch (err) {
    console.error('[Compatibility] Analysis failed:', err.message);
    res.status(500).json({ error: 'Compatibility analysis failed' });
  }
});

// GET /api/compatibility/readings — list user's past readings
router.get('/readings', requireAuth, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit ?? '10', 10), 50);
  const offset = parseInt(req.query.offset ?? '0', 10);

  const { data, error, count } = await supabase
    .from('compatibility_readings')
    .select('id, partner_name, partner_birth_date, reading, created_at', { count: 'exact' })
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ readings: data ?? [], total: count ?? 0 });
});

// GET /api/compatibility/readings/:id — get a specific reading (owner only)
router.get('/readings/:id', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('compatibility_readings')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .single();

  if (error || !data) return res.status(404).json({ error: 'Reading not found' });
  res.json(data);
});

// DELETE /api/compatibility/readings/:id — delete a reading (owner only)
router.delete('/readings/:id', requireAuth, async (req, res) => {
  const { error } = await supabase
    .from('compatibility_readings')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.user.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ deleted: true });
});

// ── Internal helpers ──────────────────────────────────────────────────────────
async function generateCompatibilityReading(userProfile, partnerChart, synastryData, partnerName) {
  const partnerLabel = partnerName ?? 'your partner';

  const keyAspects = (synastryData.aspects ?? [])
    .slice(0, 8)
    .map(a => `${a.planet1} ${a.aspect} ${a.planet2} (${a.orb?.toFixed(1) ?? '?'}° orb)`)
    .join('\n') || 'General chart comparison';

  const userDesc = `Sun ${userProfile.sun_sign}, Moon ${userProfile.moon_sign}, Rising ${userProfile.rising_sign}`;
  const partnerDesc = `Sun ${partnerChart.sun?.sign}, Moon ${partnerChart.moon?.sign}, Rising ${partnerChart.ascendant?.sign}`;

  const prompt = `You are a master astrologer specializing in relationship synastry. Analyze the compatibility between two people.

Person 1: ${userDesc}
${partnerLabel}: ${partnerDesc}

Key synastry aspects:
${keyAspects}

Write a deeply insightful, nuanced compatibility reading. Be honest about both strengths and challenges. Return ONLY valid JSON:
{
  "headline": "8-12 word compatibility headline",
  "overallScore": <integer 0-100>,
  "overallSummary": "3-4 sentences on the overall compatibility energy",
  "strengths": ["3-4 specific relationship strengths from the synastry"],
  "challenges": ["2-3 honest growth areas or tensions"],
  "loveAndRomance": "2-3 sentences on romantic and physical chemistry",
  "communication": "2-3 sentences on how they think and communicate together",
  "longTermPotential": "2-3 sentences on long-term relationship potential",
  "keyAspects": [
    { "aspect": "aspect name", "meaning": "what this means for the relationship" }
  ],
  "cosmicVerdict": "One memorable closing statement about this pairing"
}`;

  const response = await model.invoke([{ role: 'user', content: prompt }]);
  const match = response.content.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON in compatibility response');
  return JSON.parse(match[0]);
}

export default router;
