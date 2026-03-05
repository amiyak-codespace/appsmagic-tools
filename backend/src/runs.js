import express from 'express';
import { v4 as uuid } from 'uuid';
import { pool } from './db.js';

function parseSteps(steps) {
  if (!steps) return [];
  if (Array.isArray(steps)) return steps;
  if (typeof steps === 'string') {
    try { return JSON.parse(steps); } catch { return []; }
  }
  return [];
}

const router = express.Router();

// GET /api/runs?release_id=
router.get('/', async (req, res) => {
  const { release_id } = req.query;
  const [runs] = release_id
    ? await pool.execute('SELECT * FROM test_runs WHERE release_id=? ORDER BY created_at DESC', [release_id])
    : await pool.execute('SELECT * FROM test_runs ORDER BY created_at DESC');

  const enriched = await Promise.all(runs.map(async run => {
    const [[{ total }]] = await pool.execute('SELECT COUNT(*) AS total FROM test_executions WHERE run_id=?', [run.id]);
    const [[{ done }]]  = await pool.execute("SELECT COUNT(*) AS done  FROM test_executions WHERE run_id=? AND status!='pending'", [run.id]);
    const [[{ pass }]]  = await pool.execute("SELECT COUNT(*) AS pass  FROM test_executions WHERE run_id=? AND status='pass'", [run.id]);
    const [[{ fail }]]  = await pool.execute("SELECT COUNT(*) AS fail  FROM test_executions WHERE run_id=? AND status='fail'", [run.id]);
    return { ...run, total: Number(total), done: Number(done), pass: Number(pass), fail: Number(fail) };
  }));
  res.json(enriched);
});

// POST /api/runs  — create a run and populate from suites/cases
router.post('/', async (req, res) => {
  const { name, release_id, suite_ids = [], case_ids = [] } = req.body;
  if (!name || !release_id) return res.status(400).json({ error: 'name and release_id required' });

  const runId = uuid();
  await pool.execute('INSERT INTO test_runs (id,name,release_id,created_by) VALUES (?,?,?,?)',
    [runId, name, release_id, req.user.id]);

  // Collect case IDs from provided suites + explicit case_ids
  const allCaseIds = [...case_ids];
  for (const sid of suite_ids) {
    const [cases] = await pool.execute('SELECT id FROM test_cases WHERE suite_id=?', [sid]);
    cases.forEach(c => { if (!allCaseIds.includes(c.id)) allCaseIds.push(c.id); });
  }

  // Insert executions
  for (const cid of allCaseIds) {
    await pool.execute(
      'INSERT IGNORE INTO test_executions (id, run_id, case_id) VALUES (?,?,?)',
      [uuid(), runId, cid]
    );
  }

  const [[run]] = await pool.execute('SELECT * FROM test_runs WHERE id=?', [runId]);
  res.status(201).json({ ...run, total: allCaseIds.length, done: 0, pass: 0, fail: 0 });
});

// GET /api/runs/:id  — full run with execution details
router.get('/:id', async (req, res) => {
  const [[run]] = await pool.execute('SELECT * FROM test_runs WHERE id=?', [req.params.id]);
  if (!run) return res.status(404).json({ error: 'Not found' });

  const [execs] = await pool.execute(`
    SELECT te.*, tc.title, tc.description, tc.steps, tc.expected_result, tc.type, tc.priority, tc.tags,
           ts.name AS suite_name
    FROM test_executions te
    JOIN test_cases tc  ON tc.id  = te.case_id
    LEFT JOIN test_suites ts ON ts.id = tc.suite_id
    WHERE te.run_id = ?
    ORDER BY tc.priority DESC, tc.title`, [req.params.id]);

  const cases = execs.map(e => ({
    ...e,
    steps: parseSteps(e.steps),
  }));

  const stats = { total: cases.length, pass: 0, fail: 0, blocked: 0, skip: 0, pending: 0 };
  cases.forEach(c => stats[c.status]++);

  res.json({ ...run, cases, stats });
});

// PATCH /api/runs/:id  — update run status
router.patch('/:id', async (req, res) => {
  const { status } = req.body;
  const extra = status === 'completed' ? ', completed_at=NOW()' : '';
  await pool.execute(`UPDATE test_runs SET status=COALESCE(?,status)${extra} WHERE id=?`, [status||null, req.params.id]);
  res.json({ success: true });
});

// PATCH /api/runs/:runId/exec/:caseId  — record test result
router.patch('/:runId/exec/:caseId', async (req, res) => {
  const { status, actual_result, notes } = req.body;
  await pool.execute(`
    UPDATE test_executions
    SET status=COALESCE(?,status), actual_result=COALESCE(?,actual_result),
        notes=COALESCE(?,notes), executed_by=?, executed_at=NOW()
    WHERE run_id=? AND case_id=?`,
    [status||null, actual_result||null, notes||null, req.user.id, req.params.runId, req.params.caseId]
  );

  // Auto-mark run as in_progress on first execution
  await pool.execute("UPDATE test_runs SET status='in_progress' WHERE id=? AND status='planned'", [req.params.runId]);
  res.json({ success: true });
});

// DELETE /api/runs/:id
router.delete('/:id', async (req, res) => {
  await pool.execute('DELETE FROM test_executions WHERE run_id=?', [req.params.id]);
  await pool.execute('DELETE FROM test_runs WHERE id=?', [req.params.id]);
  res.json({ success: true });
});

export default router;
