import mysql  from 'mysql2/promise';
import bcrypt  from 'bcryptjs';
import { v4 as uuid } from 'uuid';

export const pool = mysql.createPool({
  host:     process.env.DB_HOST || 'localhost',
  port:     parseInt(process.env.DB_PORT || '3306'),
  user:     process.env.DB_USER || 'admin',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'qa_tools',
  waitForConnections: true,
  connectionLimit:    10,
  timezone: '+00:00',
});

export async function initDb() {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id         VARCHAR(36)  PRIMARY KEY,
      name       VARCHAR(255) NOT NULL,
      email      VARCHAR(255) UNIQUE NOT NULL,
      password   VARCHAR(255) NOT NULL,
      role       ENUM('qa_lead','qa_engineer','developer','viewer') DEFAULT 'qa_engineer',
      avatar     VARCHAR(10)  DEFAULT '🧑',
      created_at DATETIME     DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS releases (
      id          VARCHAR(36)  PRIMARY KEY,
      version     VARCHAR(50)  NOT NULL,
      name        VARCHAR(255) NOT NULL,
      description TEXT,
      start_date  DATE,
      end_date    DATE,
      status      ENUM('draft','active','completed','archived') DEFAULT 'draft',
      created_by  VARCHAR(36),
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS test_suites (
      id          VARCHAR(36)  PRIMARY KEY,
      name        VARCHAR(255) NOT NULL,
      description TEXT,
      created_by  VARCHAR(36),
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS test_cases (
      id              VARCHAR(36)  PRIMARY KEY,
      title           VARCHAR(500) NOT NULL,
      description     TEXT,
      steps           JSON,
      expected_result TEXT,
      type            ENUM('functional','regression','smoke','sanity','integration','performance','security') DEFAULT 'functional',
      priority        ENUM('critical','high','medium','low') DEFAULT 'medium',
      suite_id        VARCHAR(36),
      tags            VARCHAR(500),
      created_by      VARCHAR(36),
      created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS test_runs (
      id           VARCHAR(36)  PRIMARY KEY,
      name         VARCHAR(255) NOT NULL,
      release_id   VARCHAR(36)  NOT NULL,
      status       ENUM('planned','in_progress','completed','aborted') DEFAULT 'planned',
      created_by   VARCHAR(36),
      created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS test_executions (
      id             VARCHAR(36) PRIMARY KEY,
      run_id         VARCHAR(36) NOT NULL,
      case_id        VARCHAR(36) NOT NULL,
      status         ENUM('pending','pass','fail','blocked','skip') DEFAULT 'pending',
      actual_result  TEXT,
      notes          TEXT,
      executed_by    VARCHAR(36),
      executed_at    DATETIME,
      UNIQUE KEY uq_run_case (run_id, case_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  // Seed default admin if not exists
  const [rows] = await pool.execute('SELECT id FROM users WHERE email = ?', ['admin@qa.local']);
  if (!rows[0]) {
    const hash = await bcrypt.hash('QA2026!', 10);
    await pool.execute(
      'INSERT INTO users (id, name, email, password, role, avatar) VALUES (?, ?, ?, ?, ?, ?)',
      [uuid(), 'QA Admin', 'admin@qa.local', hash, 'qa_lead', '👑']
    );
  }

  console.log('QA Tools DB ready');
}
