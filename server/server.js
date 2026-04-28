/**
 * AstroOracle V3 — Main Entry Point
 * Starts Express and registers all cron jobs.
 */

import 'dotenv/config';
import app from './index.js';
import cron from 'node-cron';
import { runDailyHoroscope } from './jobs/dailyHoroscope.js';
import { runWeeklyWeather } from './jobs/weeklyWeather.js';
import { runEventMonitor } from './jobs/eventMonitor.js';

const PORT = parseInt(process.env.PORT ?? '3001', 10);

const server = app.listen(PORT, () => {
  console.log(`\n🔭 AstroOracle API v3.0.0`);
  console.log(`   Port:        ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV ?? 'development'}`);
  console.log(`   Health:      http://localhost:${PORT}/api/health\n`);

  // Stage 5 — Daily horoscopes at 5:00 AM UTC
  cron.schedule('0 5 * * *', () => {
    console.log('[Cron] Running daily horoscope job');
    runDailyHoroscope().catch(err => console.error('[Cron] dailyHoroscope failed:', err));
  }, { timezone: 'UTC' });

  // Stage 6 — Weekly cosmic weather every Monday at 6:00 AM UTC
  cron.schedule('0 6 * * 1', () => {
    console.log('[Cron] Running weekly weather job');
    runWeeklyWeather().catch(err => console.error('[Cron] weeklyWeather failed:', err));
  }, { timezone: 'UTC' });

  // Stage 8 — Event monitor daily at 4:00 AM UTC
  cron.schedule('0 4 * * *', () => {
    console.log('[Cron] Running event monitor job');
    runEventMonitor().catch(err => console.error('[Cron] eventMonitor failed:', err));
  }, { timezone: 'UTC' });

  console.log('[Cron] Daily horoscope active (5:00 AM UTC)');
  console.log('[Cron] Weekly weather active (Mondays 6:00 AM UTC)');
  console.log('[Cron] Event monitor active (4:00 AM UTC)\n');
});

server.on('error', (err) => {
  console.error('[AstroOracle] Server error:', err);
  process.exit(1);
});

// Graceful shutdown for Render
process.on('SIGTERM', () => {
  console.log('[AstroOracle] SIGTERM — shutting down gracefully');
  server.close(() => {
    console.log('[AstroOracle] Closed. Exiting.');
    process.exit(0);
  });
});

process.on('unhandledRejection', (reason) => {
  console.error('[AstroOracle] Unhandled rejection:', reason);
});
