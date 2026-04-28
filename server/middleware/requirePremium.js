import { verifyToken } from './requireAuth.js';
import { supabase } from '../services/supabase.js';

export async function requirePremium(req, res, next) {
  const user = await verifyToken(req, res);
  if (!user) return; // verifyToken already sent 401

  req.user = user;

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .in('status', ['active', 'trialing'])
    .single();

  if (!subscription || subscription.plan !== 'premium') {
    return res.status(403).json({
      error: 'premium_required',
      message: 'This feature requires AstroOracle Premium',
      upgradeUrl: '/premium',
    });
  }

  req.subscription = subscription;
  next();
}
