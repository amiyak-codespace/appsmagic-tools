import { useState } from 'react';
import { FileJson, GitCompare, CheckSquare, StickyNote, Braces, Sparkles, Menu, X, ExternalLink } from 'lucide-react';
import { cn } from './lib/utils';
import { JsonFormatter } from './tools/JsonFormatter';
import { TextCompare }   from './tools/TextCompare';
import { JsonCompare }   from './tools/JsonCompare';
import { Todo }          from './tools/Todo';
import { Notes }         from './tools/Notes';

const TOOLS = [
  {
    id: 'json-formatter',
    label: 'JSON Formatter',
    short: 'JSON',
    icon: FileJson,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    activeBg: 'bg-indigo-600',
    description: 'Format, validate & minify JSON',
    component: JsonFormatter,
  },
  {
    id: 'json-compare',
    label: 'JSON Compare',
    short: 'Compare',
    icon: Braces,
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    activeBg: 'bg-violet-600',
    description: 'Deep-diff two JSON objects',
    component: JsonCompare,
  },
  {
    id: 'text-compare',
    label: 'Text Compare',
    short: 'Diff',
    icon: GitCompare,
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    activeBg: 'bg-rose-600',
    description: 'Side-by-side text diff viewer',
    component: TextCompare,
  },
  {
    id: 'todo',
    label: 'Todo',
    short: 'Todo',
    icon: CheckSquare,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    activeBg: 'bg-emerald-600',
    description: 'Simple task manager',
    component: Todo,
  },
  {
    id: 'notes',
    label: 'Notes',
    short: 'Notes',
    icon: StickyNote,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    activeBg: 'bg-amber-600',
    description: 'Quick notes with auto-save',
    component: Notes,
  },
] as const;

type ToolId = typeof TOOLS[number]['id'];

export default function App() {
  const [active, setActive] = useState<ToolId>('json-formatter');
  const [mobileOpen, setMobileOpen] = useState(false);

  const tool = TOOLS.find(t => t.id === active)!;
  const ActiveComponent = tool.component;

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* ── Desktop sidebar ── */}
      <aside className="hidden lg:flex w-56 shrink-0 flex-col border-r border-slate-200 bg-white">
        {/* Logo */}
        <div className="flex items-center gap-2.5 border-b border-slate-100 px-4 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 shadow-sm">
            <Sparkles className="h-4 w-4 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 leading-tight">AppsMagic</p>
            <p className="text-[10px] text-slate-400">Tools</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-1 px-3 py-3 flex-1">
          {TOOLS.map(t => (
            <button key={t.id} onClick={() => setActive(t.id)}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all',
                active === t.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              )}>
              <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
                active === t.id ? 'bg-white/15' : t.bg)}>
                <t.icon className={cn('h-3.5 w-3.5', active === t.id ? 'text-white' : t.color)} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{t.label}</p>
                <p className={cn('truncate text-[10px]', active === t.id ? 'text-white/60' : 'text-slate-400')}>
                  {t.description}
                </p>
              </div>
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-slate-100 px-4 py-3">
          <a href="https://appsmagic.in" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-brand-600 transition-colors">
            <ExternalLink className="h-3 w-3" /> appsmagic.in
          </a>
        </div>
      </aside>

      {/* ── Mobile header ── */}
      <div className="lg:hidden fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-violet-600">
            <Sparkles className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-sm font-bold text-slate-900">{tool.label}</span>
        </div>
        <button onClick={() => setMobileOpen(o => !o)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-30 pt-14">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <nav className="relative bg-white w-64 h-full flex flex-col gap-1 p-3 shadow-xl overflow-y-auto">
            {TOOLS.map(t => (
              <button key={t.id} onClick={() => { setActive(t.id); setMobileOpen(false); }}
                className={cn('flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all',
                  active === t.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50')}>
                <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
                  active === t.id ? 'bg-white/15' : t.bg)}>
                  <t.icon className={cn('h-3.5 w-3.5', active === t.id ? 'text-white' : t.color)} />
                </div>
                <span className="text-sm font-semibold">{t.label}</span>
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* ── Main content ── */}
      <main className="flex flex-1 flex-col min-w-0">
        {/* Tool header */}
        <header className="hidden lg:flex items-center gap-3 border-b border-slate-200 bg-white px-6 py-4">
          <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl', tool.bg)}>
            <tool.icon className={cn('h-4.5 w-4.5', tool.color)} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">{tool.label}</h1>
            <p className="text-xs text-slate-500">{tool.description}</p>
          </div>

          {/* Mobile-bottom-style tab strip for desktop quick switch */}
          <div className="ml-auto flex items-center gap-1">
            {TOOLS.map(t => (
              <button key={t.id} onClick={() => setActive(t.id)}
                className={cn('rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all',
                  active === t.id ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100')}>
                {t.short}
              </button>
            ))}
          </div>
        </header>

        {/* Tool content */}
        <div className="flex-1 overflow-auto px-4 py-6 lg:px-6 pt-20 lg:pt-6">
          <ActiveComponent />
        </div>
      </main>
    </div>
  );
}
