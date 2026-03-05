import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, StickyNote, Search, Clock } from 'lucide-react';
import { cn } from '../../lib/utils';
import { loadJson, saveJson } from '../../lib/storage';

interface Note { id: string; title: string; body: string; updatedAt: number; }

const KEY = 'appsmagic-tools:notes';

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000)  return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

export function Notes() {
  const [notes, setNotes]     = useState<Note[]>(() => loadJson<Note[]>(KEY, []));
  const [activeId, setActive] = useState<string | null>(null);
  const [search, setSearch]   = useState('');

  useEffect(() => { saveJson(KEY, notes); }, [notes]);

  const active = notes.find(n => n.id === activeId) ?? null;

  const newNote = useCallback(() => {
    const n: Note = { id: crypto.randomUUID(), title: 'Untitled', body: '', updatedAt: Date.now() };
    setNotes(ns => [n, ...ns]);
    setActive(n.id);
  }, []);

  const updateNote = useCallback((field: 'title' | 'body', val: string) => {
    if (!activeId) return;
    setNotes(ns => ns.map(n => n.id === activeId ? { ...n, [field]: val, updatedAt: Date.now() } : n));
  }, [activeId]);

  const deleteNote = useCallback((id: string) => {
    setNotes(ns => ns.filter(n => n.id !== id));
    if (activeId === id) setActive(null);
  }, [activeId]);

  const filtered = notes.filter(n =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    n.body.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-200px)] min-h-[500px] gap-4">
      {/* Sidebar */}
      <div className="flex w-64 shrink-0 flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search notes…"
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-8 pr-3 text-xs text-slate-700 outline-none focus:border-brand-300 focus:ring-1 focus:ring-brand-100 transition" />
          </div>
          <button onClick={newNote} className="btn-primary !px-3 !py-2">
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-1.5 overflow-y-auto">
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
              <StickyNote className="h-7 w-7 text-slate-200" />
              <p className="text-xs text-slate-400">{search ? 'No matches' : 'No notes yet'}</p>
            </div>
          )}
          {filtered.map(n => (
            <div key={n.id} onClick={() => setActive(n.id)}
              className={cn('group relative cursor-pointer rounded-xl border px-3 py-2.5 transition-all',
                activeId === n.id ? 'border-brand-200 bg-brand-50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50')}>
              <p className={cn('truncate text-sm font-semibold', activeId === n.id ? 'text-brand-700' : 'text-slate-800')}>
                {n.title || 'Untitled'}
              </p>
              <p className="mt-0.5 truncate text-xs text-slate-400">{n.body || 'No content'}</p>
              <div className="mt-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1 text-[10px] text-slate-400">
                  <Clock className="h-2.5 w-2.5" />{timeAgo(n.updatedAt)}
                </span>
                <button onClick={e => { e.stopPropagation(); deleteNote(n.id); }}
                  className="rounded p-0.5 text-slate-300 opacity-0 group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-500 transition-all">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div className="tool-panel flex flex-1 flex-col overflow-hidden">
        {active ? (
          <>
            <div className="border-b border-slate-100 px-5 py-3">
              <input value={active.title} onChange={e => updateNote('title', e.target.value)}
                placeholder="Note title…"
                className="w-full bg-transparent text-lg font-bold text-slate-900 outline-none placeholder-slate-300" />
              <p className="mt-0.5 text-[11px] text-slate-400 flex items-center gap-1">
                <Clock className="h-3 w-3" /> {timeAgo(active.updatedAt)}
              </p>
            </div>
            <textarea value={active.body} onChange={e => updateNote('body', e.target.value)}
              placeholder="Start writing your note…"
              className="flex-1 resize-none bg-transparent p-5 text-sm text-slate-700 outline-none placeholder-slate-300 leading-relaxed" />
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
              <StickyNote className="h-8 w-8 text-slate-300" />
            </div>
            <div>
              <p className="font-semibold text-slate-600">No note selected</p>
              <p className="mt-1 text-sm text-slate-400">Pick a note from the list or create a new one</p>
            </div>
            <button onClick={newNote} className="btn-primary">
              <Plus className="h-4 w-4" /> New Note
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
