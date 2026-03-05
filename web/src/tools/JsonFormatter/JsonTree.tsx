import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { JsonValue } from '../../lib/utils';

interface Props { value: JsonValue; indent: number; depth?: number; }

export function JsonTree({ value, indent, depth = 0 }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const pad = ' '.repeat(depth * indent);

  if (value === null) return <span className="text-rose-500">null</span>;
  if (typeof value === 'boolean') return <span className="text-amber-600">{String(value)}</span>;
  if (typeof value === 'number') return <span className="text-sky-600">{value}</span>;
  if (typeof value === 'string') return <span className="text-emerald-600">"{value}"</span>;

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-slate-500">[]</span>;
    return (
      <span>
        <button onClick={() => setCollapsed(c => !c)} className="hover:opacity-70">
          <ChevronRight className={cn('inline h-3.5 w-3.5 text-slate-400 transition-transform', !collapsed && 'rotate-90')} />
        </button>
        <span className="text-slate-500">[</span>
        {collapsed ? (
          <span className="cursor-pointer text-slate-400 text-xs" onClick={() => setCollapsed(false)}> {value.length} items </span>
        ) : (
          <>
            {value.map((v, i) => (
              <div key={i} style={{ paddingLeft: indent * 8 }}>
                <span className="text-slate-400 select-none">{pad}{' '.repeat(indent)}</span>
                <JsonTree value={v} indent={indent} depth={depth + 1} />
                {i < value.length - 1 && <span className="text-slate-400">,</span>}
              </div>
            ))}
            <div><span className="text-slate-400 select-none">{pad}</span></div>
          </>
        )}
        <span className="text-slate-500">]</span>
      </span>
    );
  }

  const entries = Object.entries(value as Record<string, JsonValue>);
  if (entries.length === 0) return <span className="text-slate-500">{'{}'}</span>;

  return (
    <span>
      <button onClick={() => setCollapsed(c => !c)} className="hover:opacity-70">
        <ChevronRight className={cn('inline h-3.5 w-3.5 text-slate-400 transition-transform', !collapsed && 'rotate-90')} />
      </button>
      <span className="text-slate-500">{'{'}</span>
      {collapsed ? (
        <span className="cursor-pointer text-slate-400 text-xs" onClick={() => setCollapsed(false)}> {entries.length} keys </span>
      ) : (
        <>
          {entries.map(([k, v], i) => (
            <div key={k} style={{ paddingLeft: indent * 8 }}>
              <span className="text-violet-600">"{k}"</span>
              <span className="text-slate-400">: </span>
              <JsonTree value={v} indent={indent} depth={depth + 1} />
              {i < entries.length - 1 && <span className="text-slate-400">,</span>}
            </div>
          ))}
          <div><span className="text-slate-400 select-none">{pad}</span></div>
        </>
      )}
      <span className="text-slate-500">{'}'}</span>
    </span>
  );
}
