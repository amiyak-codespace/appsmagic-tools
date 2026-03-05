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

// ── Suites ────────────────────────────────────────────────────────────

router.get('/suites', async (_req, res) => {
  const [suites] = await pool.execute('SELECT * FROM test_suites ORDER BY name');
  const enriched = await Promise.all(suites.map(async s => {
    const [[{ cnt }]] = await pool.execute('SELECT COUNT(*) AS cnt FROM test_cases WHERE suite_id=?', [s.id]);
    return { ...s, case_count: Number(cnt) };
  }));
  res.json(enriched);
});

router.post('/suites', async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const id = uuid();
  await pool.execute('INSERT INTO test_suites (id, name, description, created_by) VALUES (?,?,?,?)',
    [id, name, description || null, req.user.id]);
  res.status(201).json({ id, name, description, created_by: req.user.id, case_count: 0 });
});

router.patch('/suites/:id', async (req, res) => {
  const { name, description } = req.body;
  await pool.execute('UPDATE test_suites SET name=COALESCE(?,name), description=COALESCE(?,description) WHERE id=?',
    [name||null, description||null, req.params.id]);
  res.json({ success: true });
});

router.delete('/suites/:id', async (req, res) => {
  await pool.execute('DELETE FROM test_suites WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

// ── Test Cases ────────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  const { suite_id, type, priority, search } = req.query;
  let sql    = 'SELECT tc.*, ts.name AS suite_name FROM test_cases tc LEFT JOIN test_suites ts ON ts.id=tc.suite_id WHERE 1=1';
  const vals = [];
  if (suite_id) { sql += ' AND tc.suite_id=?'; vals.push(suite_id); }
  if (type)     { sql += ' AND tc.type=?';     vals.push(type); }
  if (priority) { sql += ' AND tc.priority=?'; vals.push(priority); }
  if (search)   { sql += ' AND tc.title LIKE ?'; vals.push(`%${search}%`); }
  sql += ' ORDER BY tc.created_at DESC';
  const [rows] = await pool.execute(sql, vals);
  res.json(rows.map(r => ({ ...r, steps: parseSteps(r.steps) })));
});

router.post('/', async (req, res) => {
  const { title, description, steps, expected_result, type, priority, suite_id, tags } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  const id = uuid();
  await pool.execute(
    'INSERT INTO test_cases (id,title,description,steps,expected_result,type,priority,suite_id,tags,created_by) VALUES (?,?,?,?,?,?,?,?,?,?)',
    [id, title, description||null, JSON.stringify(steps||[]), expected_result||null, type||'functional', priority||'medium', suite_id||null, tags||null, req.user.id]
  );
  const [[row]] = await pool.execute('SELECT * FROM test_cases WHERE id=?', [id]);
  res.status(201).json({ ...row, steps: JSON.parse(row.steps || '[]') });
});

router.get('/:id', async (req, res) => {
  const [[row]] = await pool.execute('SELECT * FROM test_cases WHERE id=?', [req.params.id]);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json({ ...row, steps: parseSteps(row.steps) });
});

router.patch('/:id', async (req, res) => {
  const { title, description, steps, expected_result, type, priority, suite_id, tags } = req.body;
  await pool.execute(
    `UPDATE test_cases SET title=COALESCE(?,title), description=COALESCE(?,description),
     steps=COALESCE(?,steps), expected_result=COALESCE(?,expected_result),
     type=COALESCE(?,type), priority=COALESCE(?,priority),
     suite_id=COALESCE(?,suite_id), tags=COALESCE(?,tags) WHERE id=?`,
    [title||null, description||null, steps?JSON.stringify(steps):null, expected_result||null,
     type||null, priority||null, suite_id||null, tags||null, req.params.id]
  );
  res.json({ success: true });
});

router.delete('/:id', async (req, res) => {
  await pool.execute('DELETE FROM test_cases WHERE id=?', [req.params.id]);
  res.json({ success: true });
});

export default router;
