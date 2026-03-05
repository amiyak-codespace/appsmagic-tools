import { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle, XCircle, MinusCircle, SkipForward, Clock, ChevronDown, ChevronUp, Sparkles, RefreshCw, Flag } from 'lucide-react';
import { runs as runApi, ai, type TestRun, type Execution } from './api';

const STATUS_OPTIONS = ['pending','pass','fail','blocked','skip'] as const;
const STATUS_META: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  pending:  { color: 'bg-slate-100 text-slate-500',   icon: <Clock className="h-4 w-4" />,       label: 'Pending' },
  pass:     { color: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle className="h-4 w-4" />,  label: 'Pass' },
  fail:     { color: 'bg-rose-100 text-rose-700',      icon: <XCircle className="h-4 w-4" />,       label: 'Fail' },
  blocked:  { color: 'bg-amber-100 text-amber-700',    icon: <Flag className="h-4 w-4" />,          label: 'Blocked' },
  skip:     { color: 'bg-slate-100 text-slate-400',    icon: <SkipForward className="h-4 w-4" />,   label: 'Skip' },
};
const PRIORITY_COLOR: Record<string, string> = { critical:'bg-rose-100 text-rose-700', high:'bg-orange-100 text-orange-700', medium:'bg-blue-100 text-blue-700', low:'bg-slate-100 text-slate-500' };

interface Props { runId: string; onBack: () => void }

export function RunExecution({ runId, onBack }: Props) {
  const [run,      setRun]      = useState<TestRun | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [saving,   setSaving]   = useState<string | null>(null);
  const [aiAnalyzing, setAiAnalyzing] = useState<string | null>(null);
  const [aiResults,   setAiResults]   = useState<Record<string, string>>({});
  const [localNotes,  setLocalNotes]  = useState<Record<string, string>>({});
  const [localActual, setLocalActual] = useState<Record<string, string>>({});

  async function load() {
    const r = await runApi.get(runId);
    setRun(r);
  }

  useEffect(() => { load(); }, [runId]);

  async function setStatus(exec: Execution, status: string) {
    setSaving(exec.case_id);
    await runApi.exec(runId, exec.case_id, {
      status,
      actual_result: localActual[exec.case_id] || exec.actual_result || '',
      notes: localNotes[exec.case_id] || exec.notes || '',
    });
    await load();
    setSaving(null);
  }

  async function saveNotes(exec: Execution) {
    setSaving(exec.case_id);
    await runApi.exec(runId, exec.case_id, {
      status: exec.status,
      actual_result: localActual[exec.case_id] ?? exec.actual_result ?? '',
      notes: localNotes[exec.case_id] ?? exec.notes ?? '',
    });
    await load();
    setSaving(null);
  }

  async function analyzeFailure(exec: Execution) {
    setAiAnalyzing(exec.case_id);
    try {
      const r = await ai.analyzeFailure({
        title: exec.title,
        expected_result: exec.expected_result || '',
        actual_result: localActual[exec.case_id] || exec.actual_result || 'Not specified',
        steps: exec.steps || [],
      });
      setAiResults(p => ({ ...p, [exec.case_id]: r.analysis }));
    } catch (e) { setAiResults(p => ({ ...p, [exec.case_id]: 'AI analysis failed: ' + (e as Error).message })); }
    finally { setAiAnalyzing(null); }
  }

  if (!run) return <div className="flex items-center justify-center h-64 text-slate-400"><span className="h-6 w-6 border-2 border-teal-400 border-t-transparent rounded-full animate-spin mr-2" />Loading…</div>;

  const cases   = (run.cases || []) as Execution[];
  const stats   = run.stats || { total: 0, pass: 0, fail: 0, blocked: 0, skip: 0, pending: 0 };
  const pct     = stats.total ? Math.round(stats.pass / stats.total * 100) : 0;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-5 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Releases
      </button>

      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{run.name}</h1>
            <p className="text-sm text-slate-500 mt-1 capitalize">{run.status.replace('_', ' ')}</p>
          </div>
          <div className="flex items-center gap-6 text-sm">
            {(['pass','fail','blocked','skip','pending'] as const).map(s => (
              <div key={s} className="text-center">
                <div className={`text-lg font-black ${s === 'pass' ? 'text-emerald-600' : s === 'fail' ? 'text-rose-600' : 'text-slate-600'}`}>{stats[s]}</div>
                <div className="text-xs text-slate-400 capitalize">{s}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-4 h-2 w-full bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-1.5 text-xs text-slate-400">{stats.total - stats.pending} of {stats.total} executed · {pct}% pass rate</p>
      </div>

      {/* Cases */}
      <div className="flex flex-col gap-3">
        {cases.map(exec => {
          const meta   = STATUS_META[exec.status];
          const isOpen = expanded === exec.case_id;
          const isAiFail = exec.status === 'fail';
          return (
            <div key={exec.case_id} className={`rounded-2xl border bg-white shadow-sm overflow-hidden transition-all ${exec.status === 'pass' ? 'border-emerald-200' : exec.status === 'fail' ? 'border-rose-200' : 'border-slate-200'}`}>
              {/* Row */}
              <div className="flex items-center gap-3 p-4">
                <div className="flex items-center gap-1 shrink-0">
                  {STATUS_OPTIONS.map(s => (
                    <button key={s} disabled={saving === exec.case_id} onClick={() => setStatus(exec, s)}
                      title={STATUS_META[s].label}
                      className={`p-1.5 rounded-lg transition-all ${exec.status === s ? STATUS_META[s].color + ' ring-2 ring-offset-1' : 'text-slate-300 hover:text-slate-500'}`}>
                      {STATUS_META[s].icon}
                    </button>
                  ))}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-800 text-sm truncate">{exec.title}</span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${PRIORITY_COLOR[exec.priority]}`}>{exec.priority}</span>
                  </div>
                  {exec.suite_name && <p className="text-xs text-slate-400 mt-0.5">{exec.suite_name}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {saving === exec.case_id && <RefreshCw className="h-3.5 w-3.5 text-teal-400 animate-spin" />}
                  {isAiFail && (
                    <button onClick={() => analyzeFailure(exec)} disabled={aiAnalyzing === exec.case_id}
                      className="flex items-center gap-1 rounded-lg border border-teal-200 bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-100 disabled:opacity-60">
                      {aiAnalyzing === exec.case_id ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                      Analyze
                    </button>
                  )}
                  <button onClick={() => setExpanded(isOpen ? null : exec.case_id)} className="p-1.5 text-slate-400 hover:text-slate-600">
                    {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Expanded */}
              {isOpen && (
                <div className="border-t border-slate-100 p-4 bg-slate-50/50">
                  {exec.steps?.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Steps</p>
                      <ol className="flex flex-col gap-1.5">
                        {exec.steps.map((s, i) => (
                          <li key={i} className="text-xs text-slate-600">
                            <span className="font-semibold">{i+1}.</span> {s.step} <span className="text-slate-400">→ {s.expected}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                  {exec.expected_result && (
                    <div className="mb-4">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Expected Result</p>
                      <p className="text-sm text-slate-600">{exec.expected_result}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Actual Result</label>
                      <textarea rows={2} value={localActual[exec.case_id] ?? exec.actual_result ?? ''}
                        onChange={e => setLocalActual(p => ({ ...p, [exec.case_id]: e.target.value }))}
                        placeholder="What actually happened…"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm resize-none outline-none focus:border-teal-400" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Notes</label>
                      <textarea rows={2} value={localNotes[exec.case_id] ?? exec.notes ?? ''}
                        onChange={e => setLocalNotes(p => ({ ...p, [exec.case_id]: e.target.value }))}
                        placeholder="Any observations…"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm resize-none outline-none focus:border-teal-400" />
                    </div>
                  </div>
                  <button onClick={() => saveNotes(exec)} disabled={saving === exec.case_id}
                    className="mt-3 rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white hover:bg-teal-700 disabled:opacity-60 transition-colors">
                    {saving === exec.case_id ? 'Saving…' : 'Save Notes'}
                  </button>

                  {aiResults[exec.case_id] && (
                    <div className="mt-4 rounded-xl border border-teal-200 bg-teal-50 p-4">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Sparkles className="h-3.5 w-3.5 text-teal-600" />
                        <span className="text-xs font-bold text-teal-700">Gemini Analysis</span>
                      </div>
                      <p className="text-xs text-slate-700 whitespace-pre-wrap">{aiResults[exec.case_id]}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
