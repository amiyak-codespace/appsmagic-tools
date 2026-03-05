import express from 'express';
import bcrypt  from 'bcryptjs';
import jwt     from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import { pool } from './db.js';

const router = express.Router();
const SECRET = process.env.JWT_SECRET || 'qa-tools-jwt-2026';

export function authMiddleware(req, res, next) {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try { req.user = jwt.verify(h.slice(7), SECRET); next(); }
  catch { res.status(401).json({ error: 'Invalid token' }); }
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password)))
    return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role, avatar: user.avatar }, SECRET, { expiresIn: '14d' });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar } });
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, email, password, role = 'qa_engineer', avatar = '🧑' } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'name, email, password required' });
  const [existing] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
  if (existing[0]) return res.status(409).json({ error: 'Email already registered' });
  const id   = uuid();
  const hash = await bcrypt.hash(password, 10);
  await pool.execute('INSERT INTO users (id, name, email, password, role, avatar) VALUES (?, ?, ?, ?, ?, ?)',
    [id, name, email, hash, role, avatar]);
  res.status(201).json({ id, name, email, role, avatar });
});

// POST /api/auth/refresh — extend session with a fresh token
router.post('/refresh', authMiddleware, async (req, res) => {
  const [rows] = await pool.execute('SELECT id, name, email, role, avatar FROM users WHERE id = ?', [req.user.id]);
  if (!rows[0]) return res.status(404).json({ error: 'User not found' });
  const u     = rows[0];
  const token = jwt.sign({ id: u.id, email: u.email, name: u.name, role: u.role, avatar: u.avatar }, SECRET, { expiresIn: '14d' });
  res.json({ token });
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  const [rows] = await pool.execute('SELECT id, name, email, role, avatar, created_at FROM users WHERE id = ?', [req.user.id]);
  if (!rows[0]) return res.status(404).json({ error: 'User not found' });
  res.json(rows[0]);
});

// GET /api/auth/users (qa_lead only)
router.get('/users', authMiddleware, async (req, res) => {
  const [rows] = await pool.execute('SELECT id, name, email, role, avatar, created_at FROM users ORDER BY name');
  res.json(rows);
});

export default router;
