// Internal endpoints called by Supabase triggers via pg_net.
// Protected by INTERNAL_SECRET — never expose this secret publicly.
import { Router } from 'express';
import { sendWelcomeEmail } from '../services/resend.js';

const router = Router();

function verifyInternalSecret(req, res, next) {
  const secret = process.env.INTERNAL_SECRET;
  if (!secret) {
    console.warn('[Internal] INTERNAL_SECRET not set — rejecting request');
    return res.status(503).json({ error: 'Internal endpoint not configured' });
  }
  const provided = req.headers['x-internal-secret'];
  if (provided !== secret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// POST /api/internal/welcome-email
// Called by the handle_new_user Supabase trigger via pg_net.
// Body: { user_id, email, display_name }
router.post('/welcome-email', verifyInternalSecret, async (req, res) => {
  const { email, display_name } = req.body;

  if (!email) return res.status(400).json({ error: 'email is required' });

  try {
    await sendWelcomeEmail(email, display_name ?? 'Cosmic Seeker');
    console.log(`[Internal] Welcome email sent to ${email}`);
    res.json({ ok: true });
  } catch (err) {
    console.error('[Internal] Welcome email failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
