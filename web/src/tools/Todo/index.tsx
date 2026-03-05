import { useState, useMemo, useEffect } from 'react';
import { Plus, Trash2, Check, Circle, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';
import { loadJson, saveJson } from '../../lib/storage';

interface Todo { id: string; text: string; done: boolean; createdAt: number; }
type Filter = 'all' | 'active' | 'done';

const KEY = 'appsmagic-tools:todos';

export function Todo() {
  const [todos, setTodos] = useState<Todo[]>(() => loadJson<Todo[]>(KEY, []));
  const [input, setInput] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => { saveJson(KEY, todos); }, [todos]);

  const add = () => {
    const text = input.trim();
    if (!text) return;
    setTodos(t => [{ id: crypto.randomUUID(), text, done: false, createdAt: Date.now() }, ...t]);
    setInput('');
  };

  const toggle  = (id: string) => setTodos(t => t.map(x => x.id === id ? { ...x, done: !x.done } : x));
  const remove  = (id: string) => setTodos(t => t.filter(x => x.id !== id));
  const clearDone = () => setTodos(t => t.filter(x => !x.done));

  const filtered = useMemo(() => {
    if (filter === 'active') return todos.filter(t => !t.done);
    if (filter === 'done')   return todos.filter(t => t.done);
    return todos;
  }, [todos, filter]);

  const counts = useMemo(() => ({
    all: todos.length, active: todos.filter(t => !t.done).length, done: todos.filter(t => t.done).length,
  }), [todos]);

  const pct = todos.length > 0 ? Math.round((counts.done / todos.length) * 100) : 0;

  return (
    <div className="mx-auto max-w-xl flex flex-col gap-5">
      {/* Header */}
      <div className="text-center">
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
          <Sparkles className="h-3 w-3" /> Simple Todo
        </div>
        <p className="text-sm text-slate-500">
          {counts.active > 0 ? `${counts.active} task${counts.active !== 1 ? 's' : ''} remaining`
            : counts.all > 0 ? 'All done — great work! 🎉'
            : 'Add your first task below'}
        </p>
      </div>

      {/* Input */}
      <div className="tool-panel flex gap-2 p-3">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder="What needs to be done?"
          className="flex-1 rounded-xl bg-slate-50 px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-brand-200 transition"
        />
        <button onClick={add} disabled={!input.trim()} className="btn-primary">
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>

      {/* Progress */}
      {todos.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px] font-medium text-slate-400">
            <span>Progress</span><span>{pct}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-violet-500 transition-all duration-500"
              style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {/* Filters */}
      {todos.length > 0 && (
        <div className="flex items-center gap-1">
          {(['all', 'active', 'done'] as Filter[]).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn('rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-colors',
                filter === f ? 'bg-brand-600 text-white' : 'text-slate-500 hover:bg-slate-100')}>
              {f} {counts[f] > 0 && <span className="ml-0.5 opacity-70">({counts[f]})</span>}
            </button>
          ))}
          {counts.done > 0 && (
            <button onClick={clearDone}
              className="ml-auto text-xs font-medium text-slate-400 hover:text-rose-500 transition-colors">
              Clear done
            </button>
          )}
        </div>
      )}

      {/* List */}
      <div className="flex flex-col gap-2">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 py-12 text-center">
            <Check className="h-8 w-8 text-slate-200" />
            <p className="text-sm text-slate-400">{filter === 'done' ? 'No completed tasks' : filter === 'active' ? 'Nothing active — you\'re all done!' : 'No tasks yet'}</p>
          </div>
        )}
        {filtered.map(todo => (
          <div key={todo.id} className={cn('tool-panel flex items-center gap-3 px-4 py-3 transition-all',
            todo.done && 'opacity-60')}>
            <button onClick={() => toggle(todo.id)}
              className={cn('h-5 w-5 shrink-0 rounded-full border-2 transition-colors flex items-center justify-center',
                todo.done ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-300 hover:border-brand-400')}>
              {todo.done ? <Check className="h-3 w-3" /> : <Circle className="h-3 w-3 opacity-0" />}
            </button>
            <span className={cn('flex-1 text-sm text-slate-800', todo.done && 'line-through text-slate-400')}>
              {todo.text}
            </span>
            <button onClick={() => remove(todo.id)}
              className="rounded-lg p-1 text-slate-300 hover:bg-rose-50 hover:text-rose-500 transition-colors">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
