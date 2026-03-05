import { useState, useMemo } from 'react';
import { AlertCircle, Check, Braces } from 'lucide-react';
import { cn, parseJson, type JsonValue } from '../../lib/utils';

type DiffResult =
  | { kind: 'equal'; value: JsonValue }
  | { kind: 'added'; value: JsonValue }
  | { kind: 'removed'; value: JsonValue }
  | { kind: 'changed'; left: JsonValue; right: JsonValue }
  | { kind: 'object'; children: Record<string, DiffResult> }
  | { kind: 'array'; children: DiffResult[] };

function diffJson(a: JsonValue, b: JsonValue): DiffResult {
  if (JSON.stringify(a) === JSON.stringify(b)) return { kind: 'equal', value: a };

  if (Array.isArray(a) && Array.isArray(b)) {
    const len = Math.max(a.length, b.length);
    const children: DiffResult[] = [];
    for (let i = 0; i < len; i++) {
      if (i >= a.length) children.push({ kind: 'added',   value: b[i] });
      else if (i >= b.length) children.push({ kind: 'removed', value: a[i] });
      else children.push(diffJson(a[i], b[i]));
    }
    return { kind: 'array', children };
  }

  if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    const children: Record<string, DiffResult> = {};
    for (const k of keys) {
      if (!(k in a)) children[k] = { kind: 'added',   value: (b as Record<string, JsonValue>)[k] };
      else if (!(k in b)) children[k] = { kind: 'removed', value: (a as Record<string, JsonValue>)[k] };
      else children[k] = diffJson((a as Record<string, JsonValue>)[k], (b as Record<string, JsonValue>)[k]);
    }
    return { kind: 'object', children };
  }

  return { kind: 'changed', left: a, right: b };
}

const BG: Record<string, string> = {
  equal:   '',
  added:   'bg-emerald-50 text-emerald-800',
  removed: 'bg-rose-50 text-rose-800',
  changed: 'bg-amber-50 text-amber-800',
};

function DiffNode({ k, result, depth = 0 }: { k?: string; result: DiffResult; depth?: number }) {
  const pad = depth * 16;

  if (result.kind === 'object') {
    return (
      <div>
        {k !== undefined && (
          <div style={{ paddingLeft: pad }} className="flex gap-1 py-0.5 font-mono text-xs">
            <span className="text-violet-600 font-semibold">"{k}"</span><span className="text-slate-400">: {'{'}</span>
          </div>
        )}
        {Object.entries(result.children).map(([ck, cv]) => (
          <DiffNode key={ck} k={ck} result={cv} depth={depth + (k !== undefined ? 1 : 0)} />
        ))}
        {k !== undefined && <div style={{ paddingLeft: pad }} className="font-mono text-xs text-slate-400">{'}'}</div>}
      </div>
    );
  }

  if (result.kind === 'array') {
    return (
      <div>
        {k !== undefined && (
          <div style={{ paddingLeft: pad }} className="font-mono text-xs py-0.5">
            <span className="text-violet-600">"{k}"</span><span className="text-slate-400">: [</span>
          </div>
        )}
        {result.children.map((c, i) => <DiffNode key={i} k={String(i)} result={c} depth={depth + 1} />)}
        {k !== undefined && <div style={{ paddingLeft: pad }} className="font-mono text-xs text-slate-400">]</div>}
      </div>
    );
  }

  const bg = BG[result.kind];

  if (result.kind === 'changed') {
    return (
      <div style={{ paddingLeft: pad }} className="py-0.5 font-mono text-xs">
        {k && <span className="text-violet-600 mr-1">"{k}":</span>}
        <span className="rounded bg-rose-100 px-1 text-rose-700 line-through mr-1">{JSON.stringify(result.left)}</span>
        <span className="rounded bg-emerald-100 px-1 text-emerald-700">{JSON.stringify(result.right)}</span>
      </div>
    );
  }

  const val = result.kind === 'added' ? result.value : result.kind === 'removed' ? result.value : (result as { kind: 'equal'; value: JsonValue }).value;
  const prefix = result.kind === 'added' ? '+ ' : result.kind === 'removed' ? '− ' : '  ';

  return (
    <div style={{ paddingLeft: pad }} className={cn('rounded py-0.5 font-mono text-xs', bg)}>
      <span className="select-none opacity-60">{prefix}</span>
      {k && <span className="text-violet-600 mr-1">"{k}":</span>}
      <span>{JSON.stringify(val)}</span>
    </div>
  );
}

const SAMPLE_A = `{"name":"Amiya","role":"engineer","active":true,"score":42,"address":{"city":"Bangalore"}}`;
const SAMPLE_B = `{"name":"Amiya Kumar","role":"senior engineer","active":true,"score":50,"address":{"city":"Mumbai"},"joined":"2026"}`;

export function JsonCompare() {
  const [left, setLeft]   = useState('');
  const [right, setRight] = useState('');

  const parsedLeft  = useMemo(() => parseJson(left),  [left]);
  const parsedRight = useMemo(() => parseJson(right), [right]);

  const diff = useMemo(() => {
    if (parsedLeft.value !== null && parsedRight.value !== null)
      return diffJson(parsedLeft.value, parsedRight.value);
    return null;
  }, [parsedLeft.value, parsedRight.value]);

  const isEqual = diff?.kind === 'equal';

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {([['left', left, setLeft, parsedLeft], ['right', right, setRight, parsedRight]] as const).map(
          ([side, val, set, parsed]) => (
            <div key={side} className="flex flex-col gap-2">
              <div className="flex items-center justify-between px-1">
                <span className="label">{side === 'left' ? 'JSON A (original)' : 'JSON B (compare to)'}</span>
                {val && !parsed.error && <Check className="h-4 w-4 text-emerald-500" />}
                {parsed.error && val && <AlertCircle className="h-4 w-4 text-rose-500" />}
              </div>
              <div className={cn('tool-panel transition-colors',
                parsed.error && val ? 'border-rose-300 ring-1 ring-rose-200' : 'focus-within:border-brand-300 focus-within:ring-1 focus-within:ring-brand-100')}>
                <textarea value={val} onChange={e => set(e.target.value)}
                  placeholder={`Paste ${side === 'left' ? 'original' : 'comparison'} JSON…`}
                  spellCheck={false} className="code-area h-48" />
              </div>
              {parsed.error && val && (
                <p className="flex items-center gap-1 font-mono text-xs text-rose-600">
                  <AlertCircle className="h-3.5 w-3.5" />{parsed.error}
                </p>
              )}
            </div>
          )
        )}
      </div>

      <div className="flex items-center gap-2">
        <button onClick={() => { setLeft(SAMPLE_A); setRight(SAMPLE_B); }} className="btn-secondary">
          Load sample
        </button>
        <button onClick={() => { setLeft(''); setRight(''); }} className="btn-secondary">
          Clear
        </button>
        {diff && (
          <span className={cn('ml-auto text-xs font-semibold px-3 py-1 rounded-lg',
            isEqual ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')}>
            {isEqual ? 'JSONs are identical' : 'Differences found'}
          </span>
        )}
      </div>

      {/* Diff tree */}
      {diff ? (
        <div className="tool-panel overflow-auto p-5">
          <div className="mb-3 flex flex-wrap gap-3 text-xs font-medium">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-200" />Added</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-rose-200" />Removed</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-amber-200" />Changed</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-slate-200" />Unchanged</span>
          </div>
          <div className="max-h-[480px] overflow-auto">
            <DiffNode result={diff} />
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
            <Braces className="h-7 w-7 text-slate-300" />
          </div>
          <p className="text-sm text-slate-400">Paste valid JSON in both panels to compare</p>
        </div>
      )}
    </div>
  );
}
