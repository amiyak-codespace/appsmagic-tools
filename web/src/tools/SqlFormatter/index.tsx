import { useState, useMemo, useCallback } from 'react';
import { format } from 'sql-formatter';
import {
  Copy, Trash2, Check, AlertCircle, Minimize2,
  Database, ChevronDown, WrapText,
} from 'lucide-react';
import { cn } from '../../lib/utils';

// ── Supported dialects ────────────────────────────────────────────────
const DIALECTS = [
  { value: 'mysql',          label: 'MySQL' },
  { value: 'postgresql',     label: 'PostgreSQL' },
  { value: 'sqlite',         label: 'SQLite' },
  { value: 'tsql',           label: 'T-SQL (MSSQL)' },
  { value: 'bigquery',       label: 'BigQuery' },
  { value: 'spark',          label: 'Spark SQL' },
  { value: 'sql',            label: 'Standard SQL' },
] as const;

type Dialect = typeof DIALECTS[number]['value'];

const INDENT_SIZES = [2, 4];

const KEYWORD_CASES = [
  { value: 'upper', label: 'UPPER' },
  { value: 'lower', label: 'lower' },
  { value: 'preserve', label: 'Preserve' },
] as const;
type KeywordCase = typeof KEYWORD_CASES[number]['value'];

// ── Sample queries ─────────────────────────────────────────────────────
const SAMPLES: Record<string, string> = {
  'SELECT': `SELECT u.id,u.name,u.email,o.total,o.created_at FROM users u INNER JOIN orders o ON o.user_id=u.id WHERE u.active=1 AND o.total>100 ORDER BY o.created_at DESC LIMIT 20`,
  'INSERT': `INSERT INTO products(id,name,category,price,stock,created_at) VALUES(uuid(),'MacBook Pro 16','Electronics',2499.99,50,NOW()),(uuid(),'Magic Mouse','Accessories',99.99,200,NOW())`,
  'UPDATE': `UPDATE orders SET status='shipped',shipped_at=NOW(),tracking_number='TRK123456' WHERE id IN(SELECT order_id FROM shipments WHERE carrier='FedEx' AND dispatched_at<NOW()-INTERVAL 2 DAY) AND status='processing'`,
  'CTE': `WITH monthly_revenue AS(SELECT DATE_FORMAT(created_at,'%Y-%m') AS month,SUM(total) AS revenue FROM orders WHERE status='completed' GROUP BY month),avg_revenue AS(SELECT AVG(revenue) AS avg FROM monthly_revenue) SELECT m.month,m.revenue,ROUND(m.revenue-a.avg,2) AS diff_from_avg FROM monthly_revenue m CROSS JOIN avg_revenue a ORDER BY m.month`,
  'CREATE': `CREATE TABLE IF NOT EXISTS audit_logs(id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,table_name VARCHAR(64) NOT NULL,record_id VARCHAR(36) NOT NULL,action ENUM('INSERT','UPDATE','DELETE') NOT NULL,old_data JSON,new_data JSON,changed_by INT UNSIGNED,changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,INDEX idx_table_record(table_name,record_id),INDEX idx_changed_at(changed_at)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
};

// ── Format SQL using sql-formatter ────────────────────────────────────
function formatSql(
  sql: string,
  dialect: Dialect,
  tabWidth: number,
  keywordCase: KeywordCase,
): { result: string; error: string | null } {
  if (!sql.trim()) return { result: '', error: null };
  try {
    const result = format(sql, {
      language:    dialect,
      tabWidth,
      keywordCase: keywordCase as 'upper' | 'lower' | 'preserve',
      linesBetweenQueries: 2,
    });
    return { result, error: null };
  } catch (e) {
    return { result: '', error: (e as Error).message };
  }
}

// ── Minify: collapse all whitespace ───────────────────────────────────
function minifySql(sql: string): string {
  return sql.replace(/\s+/g, ' ').trim();
}

// ── Syntax highlight tokens ───────────────────────────────────────────
const KEYWORDS = /\b(SELECT|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|OUTER|CROSS|FULL|ON|AND|OR|NOT|IN|IS|NULL|AS|DISTINCT|GROUP BY|ORDER BY|HAVING|LIMIT|OFFSET|UNION|ALL|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|INDEX|IF|EXISTS|PRIMARY|KEY|FOREIGN|REFERENCES|DEFAULT|NOT NULL|UNIQUE|AUTO_INCREMENT|ENGINE|CHARSET|WITH|CASE|WHEN|THEN|ELSE|END|CAST|COALESCE|COUNT|SUM|AVG|MIN|MAX|NOW|DATE_FORMAT|INTERVAL|ROUND)\b/gi;
const STRINGS  = /(["'`])(?:(?!\1)[^\\]|\\.)*\1/g;
const NUMBERS  = /\b(\d+(?:\.\d+)?)\b/g;
const COMMENTS = /(--[^\n]*|\/\*[\s\S]*?\*\/)/g;
const FUNCS    = /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*(?=\()/g;

function highlight(sql: string): string {
  // Order matters — replace in reverse risk order using placeholders
  const placeholders: string[] = [];
  let idx = 0;

  const hold = (s: string) => { const k = `\x00${idx++}\x00`; placeholders.push(s); return k; };

  let out = sql
    .replace(COMMENTS, m => hold(`<span class="text-slate-400 italic">${esc(m)}</span>`))
    .replace(STRINGS,  m => hold(`<span class="text-emerald-600">${esc(m)}</span>`))
    .replace(NUMBERS,  m => hold(`<span class="text-amber-600">${esc(m)}</span>`))
    .replace(FUNCS,    (_, fn) => hold(`<span class="text-sky-600">${esc(fn)}</span>`) + '(')
    .replace(KEYWORDS, m => hold(`<span class="text-indigo-600 font-semibold">${esc(m.toUpperCase())}</span>`));

  // Restore placeholders
  placeholders.forEach((p, i) => { out = out.replace(`\x00${i}\x00`, p); });
  return out;
}

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── Dropdown helper ────────────────────────────────────────────────────
function Dropdown<T extends string>({
  value, onChange, options, width = 'w-44',
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  width?: string;
}) {
  const [open, setOpen] = useState(false);
  const label = options.find(o => o.value === value)?.label ?? value;
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors">
        {label} <ChevronDown className="h-3 w-3 text-slate-400" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className={cn('absolute left-0 top-full z-20 mt-1.5 rounded-xl border border-slate-200 bg-white py-1 shadow-lg', width)}>
            {options.map(o => (
              <button key={o.value} onClick={() => { onChange(o.value); setOpen(false); }}
                className={cn('flex w-full items-center px-3 py-2 text-left text-xs transition-colors',
                  value === o.value ? 'bg-slate-50 font-semibold text-slate-900' : 'text-slate-600 hover:bg-slate-50')}>
                {value === o.value && <Check className="mr-1.5 h-3 w-3 text-brand-600" />}
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────
export function SqlFormatter() {
  const [input,       setInput]       = useState('');
  const [dialect,     setDialect]     = useState<Dialect>('mysql');
  const [tabWidth,    setTabWidth]    = useState(2);
  const [kwCase,      setKwCase]      = useState<KeywordCase>('upper');
  const [copied,      setCopied]      = useState(false);
  const [showSamples, setShowSamples] = useState(false);
  const [highlight_,  setHighlight]   = useState(true);

  const { result, error } = useMemo(
    () => formatSql(input, dialect, tabWidth, kwCase),
    [input, dialect, tabWidth, kwCase],
  );

  const handleCopy = useCallback(async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }, [result]);

  const handleMinify = () => {
    if (!input.trim()) return;
    setInput(minifySql(input));
  };

  const isEmpty = input.trim() === '';

  return (
    <div className="flex flex-col gap-4">
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-2">

        {/* Dialect */}
        <Dropdown value={dialect} onChange={setDialect} options={DIALECTS as unknown as { value: Dialect; label: string }[]} width="w-44" />

        {/* Indent */}
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          {INDENT_SIZES.map(n => (
            <button key={n} onClick={() => setTabWidth(n)}
              className={cn('rounded-lg px-2.5 py-1 text-xs font-semibold transition-all',
                tabWidth === n ? 'bg-brand-600 text-white' : 'text-slate-500 hover:text-slate-700')}>
              {n}
            </button>
          ))}
          <span className="px-1 text-[10px] text-slate-300">spaces</span>
        </div>

        {/* Keyword case */}
        <Dropdown value={kwCase} onChange={setKwCase} options={KEYWORD_CASES as unknown as { value: KeywordCase; label: string }[]} width="w-36" />

        {/* Samples */}
        <div className="relative">
          <button onClick={() => setShowSamples(s => !s)} className="btn-secondary">
            Samples <ChevronDown className="h-3.5 w-3.5" />
          </button>
          {showSamples && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowSamples(false)} />
              <div className="absolute left-0 top-full z-20 mt-1.5 w-40 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                {Object.keys(SAMPLES).map(k => (
                  <button key={k} onClick={() => { setInput(SAMPLES[k]); setShowSamples(false); }}
                    className="flex w-full items-center px-3 py-2 text-left text-xs text-slate-600 hover:bg-slate-50">
                    {k}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-2">
          {!isEmpty && !error && (
            <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
              <Check className="h-3.5 w-3.5" /> Valid SQL
            </span>
          )}
          {!isEmpty && error && (
            <span className="flex items-center gap-1 text-xs font-medium text-rose-500">
              <AlertCircle className="h-3.5 w-3.5" /> Parse error
            </span>
          )}

          {/* Highlight toggle */}
          <button onClick={() => setHighlight(h => !h)}
            className={cn('btn-secondary', highlight_ && 'border-brand-300 bg-brand-50 text-brand-700')}>
            <WrapText className="h-3.5 w-3.5" /> Highlight
          </button>

          <button onClick={handleMinify} disabled={isEmpty} className="btn-secondary">
            <Minimize2 className="h-3.5 w-3.5" /> Minify
          </button>

          <button onClick={handleCopy} disabled={!result} className={cn('btn-primary text-xs',
            copied && 'bg-emerald-600 hover:bg-emerald-700')}>
            {copied ? <><Check className="h-3.5 w-3.5" />Copied</> : <><Copy className="h-3.5 w-3.5" />Copy</>}
          </button>

          <button onClick={() => setInput('')} disabled={isEmpty} className="btn-secondary">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ── Panels ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Input */}
        <div className="flex flex-col gap-2">
          <span className="label px-1">Input SQL</span>
          <div className={cn('tool-panel transition-colors',
            error && !isEmpty
              ? 'border-rose-300 ring-1 ring-rose-200'
              : 'focus-within:border-brand-300 focus-within:ring-1 focus-within:ring-brand-100')}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={'Paste SQL here…\n\nSELECT u.id, u.name FROM users u\nWHERE u.active = 1\nORDER BY u.name'}
              spellCheck={false}
              className="code-area h-[480px]"
            />
          </div>
          {error && !isEmpty && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
              <p className="font-mono text-xs text-rose-700 whitespace-pre-wrap">{error}</p>
            </div>
          )}
        </div>

        {/* Output */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-1">
            <span className="label">Formatted output</span>
            {result && (
              <span className="text-[10px] text-slate-400">
                {result.split('\n').length} lines
              </span>
            )}
          </div>
          <div className="tool-panel h-[480px] overflow-auto p-5">
            {isEmpty && (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                  <Database className="h-7 w-7 text-slate-300" />
                </div>
                <p className="text-sm text-slate-400">Formatted SQL appears here</p>
                <p className="text-xs text-slate-300">Supports MySQL · PostgreSQL · SQLite · T-SQL · BigQuery</p>
              </div>
            )}
            {result && (
              highlight_
                ? (
                  <pre
                    className="font-mono text-xs leading-relaxed text-slate-800 whitespace-pre-wrap break-words"
                    dangerouslySetInnerHTML={{ __html: highlight(result) }}
                  />
                )
                : (
                  <pre className="font-mono text-xs leading-relaxed text-slate-800 whitespace-pre-wrap break-words">
                    {result}
                  </pre>
                )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
