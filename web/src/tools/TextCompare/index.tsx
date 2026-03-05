import { useState, useMemo, useCallback } from 'react';
import { ArrowLeftRight, Copy, Trash2, Check, GitCompare } from 'lucide-react';
import { cn } from '../../lib/utils';
import { computeDiff, diffStats, type DiffLine } from '../../lib/diff';

const SAMPLE = {
  left:  `The quick brown fox\njumps over the lazy dog\nHello World\nLine four\nLine five`,
  right: `The quick brown fox\nleaps over the lazy cat\nHello AppsMagic\nLine four\nLine six`,
};

function DiffRow({ line }: { line: DiffLine }) {
  const bg = {
    equal:   '',
    insert:  'bg-emerald-50',
    delete:  'bg-rose-50',
    replace: 'bg-amber-50',
  }[line.type];

  const leftMark  = line.type === 'delete' || line.type === 'replace' ? 'bg-rose-200'    : line.type === 'equal' ? '' : 'bg-slate-100';
  const rightMark = line.type === 'insert' || line.type === 'replace' ? 'bg-emerald-200' : line.type === 'equal' ? '' : 'bg-slate-100';

  return (
    <div className={cn('grid grid-cols-2 border-b border-slate-100 font-mono text-xs', bg)}>
      <div className={cn('flex gap-2 border-r border-slate-200 px-3 py-1.5', leftMark)}>
        <span className="w-6 shrink-0 select-none text-right text-slate-400">{line.leftNum ?? ''}</span>
        <span className={line.type === 'delete' ? 'text-rose-700' : line.type === 'replace' ? 'text-amber-700' : 'text-slate-700'}>
          {line.left ?? ''}
        </span>
      </div>
      <div className={cn('flex gap-2 px-3 py-1.5', rightMark)}>
        <span className="w-6 shrink-0 select-none text-right text-slate-400">{line.rightNum ?? ''}</span>
        <span className={line.type === 'insert' ? 'text-emerald-700' : line.type === 'replace' ? 'text-amber-700' : 'text-slate-700'}>
          {line.right ?? ''}
        </span>
      </div>
    </div>
  );
}

export function TextCompare() {
  const [left, setLeft]   = useState('');
  const [right, setRight] = useState('');
  const [copiedL, setCopiedL] = useState(false);
  const [copiedR, setCopiedR] = useState(false);

  const diff  = useMemo(() => (left || right) ? computeDiff(left, right) : null, [left, right]);
  const stats = useMemo(() => diff ? diffStats(diff) : null, [diff]);

  const swap = useCallback(() => { setLeft(right); setRight(left); }, [left, right]);

  const copy = useCallback(async (text: string, side: 'l'|'r') => {
    await navigator.clipboard.writeText(text);
    if (side === 'l') { setCopiedL(true); setTimeout(() => setCopiedL(false), 2000); }
    else              { setCopiedR(true); setTimeout(() => setCopiedR(false), 2000); }
  }, []);

  const identical = diff !== null && stats?.added === 0 && stats?.removed === 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Inputs */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {(['l', 'r'] as const).map(side => {
          const val    = side === 'l' ? left : right;
          const setVal = side === 'l' ? setLeft : setRight;
          const copied = side === 'l' ? copiedL : copiedR;
          const label  = side === 'l' ? 'Original' : 'Modified';
          return (
            <div key={side} className="flex flex-col gap-2">
              <div className="flex items-center justify-between px-1">
                <span className="label">{label}</span>
                <div className="flex gap-1.5">
                  <button onClick={() => copy(val, side)} disabled={!val}
                    className={cn('btn-secondary', copied && 'text-emerald-600 border-emerald-200')}>
                    {copied ? <><Check className="h-3 w-3" />Copied</> : <><Copy className="h-3 w-3" />Copy</>}
                  </button>
                  <button onClick={() => setVal('')} disabled={!val} className="btn-secondary">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="tool-panel focus-within:border-brand-300 focus-within:ring-1 focus-within:ring-brand-100 transition-colors">
                <textarea value={val} onChange={e => setVal(e.target.value)}
                  placeholder={`Paste ${label.toLowerCase()} text…`}
                  spellCheck={false} className="code-area h-48" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={swap} disabled={!left && !right} className="btn-secondary">
          <ArrowLeftRight className="h-3.5 w-3.5" /> Swap
        </button>
        <button onClick={() => { setLeft(SAMPLE.left); setRight(SAMPLE.right); }} className="btn-secondary">
          Load sample
        </button>
        {stats && (
          <div className="ml-auto flex flex-wrap items-center gap-1.5 text-xs font-semibold">
            <span className="rounded-lg bg-emerald-50 px-2 py-1 text-emerald-700">+{stats.added} added</span>
            <span className="rounded-lg bg-rose-50 px-2 py-1 text-rose-700">-{stats.removed} removed</span>
            <span className="rounded-lg bg-slate-100 px-2 py-1 text-slate-600">{stats.unchanged} unchanged</span>
          </div>
        )}
      </div>

      {/* Diff output */}
      {diff ? (
        <div className="tool-panel overflow-hidden">
          <div className="grid grid-cols-2 border-b border-slate-200 bg-slate-50 text-xs font-semibold">
            <div className="flex items-center gap-2 border-r border-slate-200 px-4 py-2.5">
              <span className="h-2 w-2 rounded-full bg-rose-400" /> Original
            </div>
            <div className="flex items-center gap-2 px-4 py-2.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400" /> Modified
            </div>
          </div>
          {identical ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50">
                <Check className="h-7 w-7 text-emerald-400" />
              </div>
              <p className="text-sm text-slate-500">Texts are identical</p>
            </div>
          ) : (
            <div className="max-h-[500px] overflow-auto">
              {diff.map((line, i) => <DiffRow key={i} line={line} />)}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
            <GitCompare className="h-7 w-7 text-slate-300" />
          </div>
          <p className="text-sm text-slate-400">Paste text in both panels to see the diff</p>
        </div>
      )}
    </div>
  );
}
