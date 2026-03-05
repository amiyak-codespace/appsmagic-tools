import { useEffect, useState } from 'react';
import { ArrowLeft, Plus, PlayCircle, CheckCircle, XCircle, Trash2, RefreshCw, Sparkles } from 'lucide-react';
import { releases as relApi, runs as runApi, cases as caseApi, ai, type Release, type Suite } from './api';

const RUN_STATUS_COLOR: Record<string, string> = {
  planned:'bg-slate-100 text-slate-600', in_progress:'bg-blue-100 text-blue-700',
  completed:'bg-emerald-100 text-emerald-700', aborted:'bg-rose-100 text-rose-700',
};

interface Props { releaseId: string; onBack: () => void; onNavigate: (page: string, params?: Record<string,string>) => void }

export function ReleaseDetail({ releaseId, onBack, onNavigate }: Props) {
  const [release, setRelease] = useState<Release | null>(null);
  const [suites,  setSuites]  = useState<Suite[]>([]);
  const [loading, setLoading] = useState(true);
  const [newRun,  setNewRun]  = useState(false);
  const [runName, setRunName] = useState('');
  const [selectedSuites, setSelectedSuites] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [aiReport, setAiReport] = useState('');
  const [genReport, setGenReport] = useState(false);

  async function load() {
    const [rel, s] = await Promise.all([relApi.get(releaseId), caseApi.suites()]);
    setRelease(rel); setSuites(s); setLoading(false);
  }
  useEffect(() => { load(); }, [releaseId]);

  async function createRun() {
    if (!runName.trim()) return;
    setCreating(true);
    try {
      await runApi.create({ name: runName, release_id: releaseId, suite_ids: selectedSuites });
      setNewRun(false); setRunName(''); setSelectedSuites([]); load();
    } finally { setCreating(false); }
  }

  async function deleteRun(id: string) {
    if (!confirm('Delete this test run?')) return;
    await runApi.delete(id); load();
  }

  async function generateReport() {
    if (!release) return;
    setGenReport(true);
    try {
      const runs  = Array.isArray(release.runs) ? release.runs : [];
      const fails = runs.flatMap(r => ('fail' in r ? [{ title: r.name }] : []));
      const r = await ai.generateReport({
        release_name:    release.name,
        release_version: release.version,
        stats:           release.stats,
        failed_cases:    fails,
      });
      setAiReport(r.report);
    } finally { setGenReport(false); }
  }

  if (loading || !release) return <div className="flex items-center justify-center h-64 text-slate-400"><span className="h-6 w-6 border-2 border-teal-400 border-t-transparent rounded-full animate-spin mr-2" />Loading…</div>;

  const runs = Array.isArray(release.runs) ? release.runs : [];
  const pct  = release.stats.total ? Math.round(release.stats.pass / release.stats.total * 100) : 0;

  const inp = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all';

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-5 transition-colors">
        <ArrowLeft className="h-4 w-4" /> All Releases
      </button>

      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{release.name} <span className="text-slate-400 font-normal">v{release.version}</span></h1>
            {release.description && <p className="text-sm text-slate-500 mt-1">{release.description}</p>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={generateReport} disabled={genReport}
              className="flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-700 hover:bg-teal-100 disabled:opacity-60">
              {genReport ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              AI Report
            </button>
            <button onClick={() => setNewRun(true)}
              className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-3 py-2 text-xs font-bold text-white hover:bg-teal-700">
              <Plus className="h-3.5 w-3.5" /> New Run
            </button>
          </div>
        </div>
        <div className="grid grid-cols-5 gap-3 mt-4">
          {(['total','pass','fail','blocked','pending'] as const).map(k => (
            <div key={k} className="text-center">
              <div className={`text-xl font-black ${k==='pass'?'text-emerald-600':k==='fail'?'text-rose-600':'text-slate-700'}`}>{release.stats[k]}</div>
              <div className="text-xs text-slate-400 capitalize">{k}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 h-2 w-full bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>

        {aiReport && (
          <div className="mt-5 rounded-xl border border-teal-200 bg-teal-50 p-4">
            <div className="flex items-center gap-1.5 mb-2"><Sparkles className="h-3.5 w-3.5 text-teal-600" /><span className="text-xs font-bold text-teal-700">AI Release Report</span></div>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{aiReport}</p>
          </div>
        )}
      </div>

      {/* Runs */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-900">Test Runs ({runs.length})</h2>
        </div>
        {runs.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <p>No test runs yet</p>
            <button onClick={() => setNewRun(true)} className="mt-2 text-sm text-teal-600 hover:underline">Create your first run →</button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {(runs as any[]).map((run: any) => (
              <div key={run.id} className="flex items-center gap-3 px-5 py-4 hover:bg-slate-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800">{run.name}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${RUN_STATUS_COLOR[run.status]}`}>{run.status.replace('_', ' ')}</span>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                    <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-emerald-500" />{run.pass}</span>
                    <span className="flex items-center gap-1"><XCircle className="h-3 w-3 text-rose-500" />{run.fail}</span>
                    <span>{run.done}/{run.total} done</span>
                  </div>
                  {run.total > 0 && (
                    <div className="mt-1.5 h-1 w-full max-w-xs bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${run.total ? Math.round(run.pass/run.total*100) : 0}%` }} />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => onNavigate('run-execution', { id: run.id })}
                    className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-teal-700">
                    <PlayCircle className="h-3.5 w-3.5" /> Execute
                  </button>
                  <button onClick={() => deleteRun(run.id)} className="p-2 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Run Modal */}
      {newRun && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl p-6">
            <h3 className="font-bold text-slate-900 mb-5">New Test Run</h3>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Run Name *</label>
                <input value={runName} onChange={e => setRunName(e.target.value)} placeholder="Smoke Test – Sprint 12" className={inp} />
              </div>
              {suites.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-2">Include Suites (optional)</label>
                  <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                    {suites.map(s => (
                      <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={selectedSuites.includes(s.id)}
                          onChange={e => setSelectedSuites(p => e.target.checked ? [...p, s.id] : p.filter(x => x !== s.id))}
                          className="rounded border-slate-300 text-teal-600" />
                        <span className="text-sm text-slate-700">{s.name}</span>
                        <span className="text-xs text-slate-400">({s.case_count})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-3 mt-2">
                <button onClick={() => setNewRun(false)} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
                <button onClick={createRun} disabled={creating || !runName.trim()}
                  className="flex-1 rounded-xl bg-teal-600 py-2.5 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-60">
                  {creating ? <RefreshCw className="h-4 w-4 animate-spin mx-auto" /> : 'Create Run'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
