// Stage 3 — Natal chart routes
import { Router } from 'express';
const router = Router();
router.get('/health', (_req, res) => res.json({ status: 'chart routes — Stage 3' }));
export default router;
