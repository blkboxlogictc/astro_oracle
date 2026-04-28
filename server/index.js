/**
 * AstroOracle V3 — Express App Configuration
 * All middleware and route registration lives here.
 * server.js imports this and calls app.listen().
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';

// Routes
import chatRouter from './routes/chat.js';
import authRouter from './routes/auth.js';
import stripeRouter from './routes/stripe.js';
import horoscopeRouter from './routes/horoscope.js';
import chartRouter from './routes/chart.js';
import compatibilityRouter from './routes/compatibility.js';
import notificationsRouter from './routes/notifications.js';

const app = express();

// ── Security headers ───────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));

// ── CORS ───────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  'https://astrooracle.space',
  'https://www.astrooracle.space',
  process.env.FRONTEND_URL ?? 'http://localhost:5173',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Logging ────────────────────────────────────────────────────────────────────
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── Compression ────────────────────────────────────────────────────────────────
app.use(compression());

// ── CRITICAL: Stripe webhook needs raw body — mount BEFORE express.json() ─────
// The stripe router applies express.raw() to /webhook internally.
// All other stripe routes apply express.json() internally.
app.use('/api/stripe', stripeRouter);

// ── Body parsing (all routes except Stripe, handled above) ────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Health check ───────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    version: '3.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV ?? 'development',
  });
});

// ── API routes ─────────────────────────────────────────────────────────────────
app.use('/api/chat', chatRouter);
app.use('/api/auth', authRouter);
app.use('/api/horoscope', horoscopeRouter);
app.use('/api/chart', chartRouter);
app.use('/api/compatibility', compatibilityRouter);
app.use('/api/notifications', notificationsRouter);

// ── 404 ────────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ── Global error handler ───────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  const status = err.status ?? err.statusCode ?? 500;
  const message = err.message ?? 'Internal server error';
  if (status >= 500) console.error('[Error]', err);
  res.status(status).json({ error: message });
});

export default app;
