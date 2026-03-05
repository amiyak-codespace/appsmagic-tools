import express from 'express';
import { v4 as uuid } from 'uuid';
import { pool } from './db.js';

const router = express.Router();

// GET /api/releases
router.get('/', async (_req, res) => {
  const [releases] = await pool.execute('SELECT * FROM releases ORDER BY created_at DESC');

  // Enrich each release with test stats from its runs
  const enriched = await Promise.all(releases.map(async r => {
    const [runs]  = await pool.execute('SELECT id FROM test_runs WHERE release_id = ?', [r.id]);
    const runIds  = runs.map(x => x.id);
    let stats     = { total: 0, pass: 0, fail: 0, blocked: 0, skip: 0, pending: 0 };
    if (runIds.length) {
      const placeholders = runIds.map(() => '?').join(',');
      const [execs] = await pool.execute(
        `SELECT status, COUNT(*) AS cnt FROM test_executions WHERE run_id IN (${placeholders}) GROUP BY status`,
        runIds
      );
      execs.forEach(e => { stats[e.status] = Number(e.cnt); stats.total += Number(e.cnt); });
    }
    return { ...r, runs: runs.length, stats };
  }));
  res.json(enriched);
});

// POST /api/releases
router.post('/', async (req, res) => {
  const { version, name, description, start_date, end_date, status } = req.body;
  if (!version || !name) return res.status(400).json({ error: 'version and name required' });
  const id = uuid();
  await pool.execute(
    'INSERT INTO releases (id, version, name, description, start_date, end_date, status, created_by) VALUES (?,?,?,?,?,?,?,?)',
    [id, version, name, description || null, start_date || null, end_date || null, status || 'draft', req.user.id]
  );
  const [[release]] = await pool.execute('SELECT * FROM releases WHERE id = ?', [id]);
  res.status(201).json({ ...release, runs: 0, stats: { total:0,pass:0,fail:0,blocked:0,skip:0,pending:0 } });
});

// GET /api/releases/:id
router.get('/:id', async (req, res) => {
  const [[release]] = await pool.execute('SELECT * FROM releases WHERE id = ?', [req.params.id]);
  if (!release) return res.status(404).json({ error: 'Not found' });

  const [runs] = await pool.execute('SELECT * FROM test_runs WHERE release_id = ? ORDER BY created_at DESC', [req.params.id]);
  const runIds = runs.map(r => r.id);
  const stats  = { total:0, pass:0, fail:0, blocked:0, skip:0, pending:0 };

  if (runIds.length) {
    const ph = runIds.map(() => '?').join(',');
    const [execs] = await pool.execute(
      `SELECT status, COUNT(*) AS cnt FROM test_executions WHERE run_id IN (${ph}) GROUP BY status`, runIds
    );
    execs.forEach(e => { stats[e.status] = Number(e.cnt); stats.total += Number(e.cnt); });
  }

  // Add per-run stats
  const runsWithStats = await Promise.all(runs.map(async run => {
    const [[{ total }]]  = await pool.execute('SELECT COUNT(*) AS total FROM test_executions WHERE run_id=?', [run.id]);
    const [[{ done }]]   = await pool.execute("SELECT COUNT(*) AS done FROM test_executions WHERE run_id=? AND status!='pending'", [run.id]);
    const [[{ pass }]]   = await pool.execute("SELECT COUNT(*) AS pass FROM test_executions WHERE run_id=? AND status='pass'", [run.id]);
    const [[{ fail }]]   = await pool.execute("SELECT COUNT(*) AS fail FROM test_executions WHERE run_id=? AND status='fail'", [run.id]);
    return { ...run, total: Number(total), done: Number(done), pass: Number(pass), fail: Number(fail) };
  }));

  res.json({ ...release, runs: runsWithStats, stats });
});

// PATCH /api/releases/:id
router.patch('/:id', async (req, res) => {
  const { version, name, description, start_date, end_date, status } = req.body;
  await pool.execute(
    `UPDATE releases SET version=COALESCE(?,version), name=COALESCE(?,name),
     description=COALESCE(?,description), start_date=COALESCE(?,start_date),
     end_date=COALESCE(?,end_date), status=COALESCE(?,status) WHERE id=?`,
    [version||null, name||null, description||null, start_date||null, end_date||null, status||null, req.params.id]
  );
  res.json({ success: true });
});

// DELETE /api/releases/:id
router.delete('/:id', async (req, res) => {
  await pool.execute('DELETE FROM releases WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

export default router;
