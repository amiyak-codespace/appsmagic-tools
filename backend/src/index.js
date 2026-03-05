import express from 'express';
import cors    from 'cors';
import { initDb } from './db.js';
import authRouter     from './auth.js';
import releasesRouter from './releases.js';
import casesRouter    from './cases.js';
import runsRouter     from './runs.js';
import aiRouter       from './ai.js';
import { authMiddleware } from './auth.js';

const app  = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.use('/api/auth',     authRouter);
app.use('/api/releases', authMiddleware, releasesRouter);
app.use('/api/cases',    authMiddleware, casesRouter);
app.use('/api/runs',     authMiddleware, runsRouter);
app.use('/api/ai',       authMiddleware, aiRouter);
app.get('/api/health',   (_req, res) => res.json({ ok: true }));

initDb()
  .then(() => app.listen(PORT, () => console.log(`QA Tools API on :${PORT}`)))
  .catch(err => { console.error('DB init failed:', err.message); process.exit(1); });
