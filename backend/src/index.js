import express from 'express';
import cors    from 'cors';
import { initDb }          from './db.js';
import { requireAuth, mountAuthProxy } from './requireAuth.js';
import releasesRouter from './releases.js';
import casesRouter    from './cases.js';
import runsRouter     from './runs.js';
import aiRouter       from './ai.js';

const app  = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// ── Auth: proxied to central auth-service ─────────────────────────────
mountAuthProxy(app);

// ── QA Manager routes ─────────────────────────────────────────────────
app.use('/api/releases', requireAuth, releasesRouter);
app.use('/api/cases',    requireAuth, casesRouter);
app.use('/api/runs',     requireAuth, runsRouter);
app.use('/api/ai',       requireAuth, aiRouter);
app.get('/api/health',   (_req, res) => res.json({ ok: true, service: 'qa-tools' }));

initDb()
  .then(() => app.listen(PORT, () => console.log(`QA Tools API on :${PORT}`)))
  .catch(err => { console.error('DB init failed:', err.message); process.exit(1); });
