import { useState, useMemo, useCallback } from 'react';
import { Copy, Trash2, Check, AlertCircle, Minimize2, Braces, ChevronDown, FileJson } from 'lucide-react';
import { cn, parseJson, type JsonValue } from '../../lib/utils';
import { JsonTree } from './JsonTree';

const INDENT = [2, 4, 8];
const SAMPLES = {
  simple:  `{"name":"Amiya","role":"engineer","active":true,"score":42}`,
  nested:  `{"user":{"id":1,"name":"Amiya Kumar","address":{"city":"Bangalore","zip":"560001"}},"tags":["typescript","react","node"],"meta":{"created":"2026-03-05","version":3}}`,
  array:   `[{"id":1,"title":"Buy groceries","done":false},{"id":2,"title":"Ship the app","done":true},{"id":3,"title":"Review PRs","done":false}]`,
};

export function JsonFormatter() {
  const [input, setInput]   = useState('');
  const [indent, setIndent] = useState(2);
  const [copied, setCopied] = useState(false);
  const [samples, setSamples] = useState(false);

  const { value, error } = useMemo(() => parseJson(input), [input]);
  const formatted = useMemo(() => value !== null ? JSON.stringify(value, null, indent) : '', [value, indent]);

  const handleCopy = useCallback(async () => {
    if (!formatted) return;
    await navigator.clipboard.writeText(formatted);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }, [formatted]);

  const isEmpty = input.trim() === '';

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          {INDENT.map(n => (
            <button key={n} onClick={() => setIndent(n)}
              className={cn('rounded-lg px-2.5 py-1 text-xs font-semibold transition-all',
                indent === n ? 'bg-brand-600 text-white' : 'text-slate-500 hover:text-slate-700')}>
              {n}
            </button>
          ))}
          <span className="px-1 text-[10px] text-slate-300">spaces</span>
        </div>

        <div className="relative">
          <button onClick={() => setSamples(s => !s)} className="btn-secondary">
            Samples <ChevronDown className="h-3.5 w-3.5" />
          </button>
          {samples && (
            <div className="absolute left-0 top-full z-20 mt-1.5 w-36 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
              {(Object.keys(SAMPLES) as (keyof typeof SAMPLES)[]).map(k => (
                <button key={k} onClick={() => { setInput(SAMPLES[k]); setSamples(false); }}
                  className="flex w-full items-center px-3 py-2 text-left text-xs capitalize text-slate-600 hover:bg-slate-50">
                  {k}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {!isEmpty && (
            <span className={cn('flex items-center gap-1 text-xs font-medium',
              error ? 'text-rose-500' : 'text-emerald-600')}>
              {error ? <><AlertCircle className="h-3.5 w-3.5" />Invalid</> : <><Check className="h-3.5 w-3.5" />Valid</>}
            </span>
          )}
          {value !== null && (
            <button onClick={() => setInput(JSON.stringify(value))} className="btn-secondary">
              <Minimize2 className="h-3.5 w-3.5" /> Minify
            </button>
          )}
          <button onClick={handleCopy} disabled={!value} className={cn('btn-primary text-xs',
            copied && 'bg-emerald-600 hover:bg-emerald-700')}>
            {copied ? <><Check className="h-3.5 w-3.5" />Copied</> : <><Copy className="h-3.5 w-3.5" />Copy</>}
          </button>
          <button onClick={() => setInput('')} disabled={isEmpty} className="btn-secondary">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Panels */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Input */}
        <div className="flex flex-col gap-2">
          <span className="label px-1">Input</span>
          <div className={cn('tool-panel transition-colors',
            error && !isEmpty ? 'border-rose-300 ring-1 ring-rose-200' : 'focus-within:border-brand-300 focus-within:ring-1 focus-within:ring-brand-100')}>
            <textarea value={input} onChange={e => setInput(e.target.value)}
              placeholder={'Paste JSON here…\n\n{\n  "key": "value"\n}'}
              spellCheck={false} className="code-area h-[480px]" />
          </div>
          {error && !isEmpty && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
              <p className="font-mono text-xs text-rose-700">{error}</p>
            </div>
          )}
        </div>

        {/* Output */}
        <div className="flex flex-col gap-2">
          <span className="label px-1">Formatted output</span>
          <div className="tool-panel h-[480px] overflow-auto p-5">
            {isEmpty && (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                  <Braces className="h-7 w-7 text-slate-300" />
                </div>
                <p className="text-sm text-slate-400">Output appears here</p>
              </div>
            )}
            {error && !isEmpty && (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50">
                  <FileJson className="h-7 w-7 text-rose-300" />
                </div>
                <p className="text-sm text-slate-400">Fix errors to see output</p>
              </div>
            )}
            {value !== null && <JsonTree value={value as JsonValue} indent={indent} />}
          </div>
        </div>
      </div>
    </div>
  );
}
