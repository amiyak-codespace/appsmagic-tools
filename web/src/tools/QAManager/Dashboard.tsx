import { useEffect, useState } from 'react';
import { FlaskConical, Rocket, CheckCircle, XCircle, Clock, TrendingUp, Plus } from 'lucide-react';
import { releases as relApi, runs as runApi, cases as caseApi, type Release, type TestRun, type Suite } from './api';

interface Props {
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

export function Dashboard({ onNavigate }: Props) {
  const [releaseList, setReleaseList] = useState<Release[]>([]);
  const [recentRuns,  setRecentRuns]  = useState<TestRun[]>([]);
  const [suiteCount,  setSuiteCount]  = useState(0);
  const [caseCount,   setCaseCount]   = useState(0);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    Promise.all([relApi.list(), runApi.list(), caseApi.suites(), caseApi.list()])
      .then(([rels, rns, suites, csList]) => {
        setReleaseList(rels);
        setRecentRuns(rns.slice(0, 5));
        setSuiteCount(suites.length);
        setCaseCount(csList.length);
      })
      .finally(() => setLoading(false));
  }, []);

  const activeReleases = releaseList.filter(r => r.status === 'active');
  const totalTests     = releaseList.reduce((s, r) => s + (r.stats?.total ?? 0), 0);
  const totalPass      = releaseList.reduce((s, r) => s + (r.stats?.pass ?? 0), 0);
  const passRate       = totalTests ? Math.round(totalPass / totalTests * 100) : 0;

  const STATS = [
    { icon: Rocket,       label: 'Active Releases', value: activeReleases.length, color: 'bg-teal-50 text-teal-600' },
    { icon: FlaskConical, label: 'Test Cases',       value: caseCount,            color: 'bg-violet-50 text-violet-600' },
    { icon: TrendingUp,   label: 'Pass Rate',        value: `${passRate}%`,       color: 'bg-emerald-50 text-emerald-600' },
    { icon: Clock,        label: 'Test Suites',      value: suiteCount,            color: 'bg-amber-50 text-amber-600' },
  ];

  const STATUS_COLOR: Record<string, string> = {
    active: 'bg-teal-100 text-teal-700', draft: 'bg-slate-100 text-slate-600',
    completed: 'bg-emerald-100 text-emerald-700', archived: 'bg-slate-100 text-slate-400',
  };
  const RUN_COLOR: Record<string, string> = {
    planned: 'bg-slate-100 text-slate-600', in_progress: 'bg-blue-100 text-blue-700',
    completed: 'bg-emerald-100 text-emerald-700', aborted: 'bg-rose-100 text-rose-700',
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400"><span className="h-6 w-6 border-2 border-teal-400 border-t-transparent rounded-full animate-spin mr-2" />Loading…</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-8">
        {STATS.map(s => (
          <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl ${s.color}`}>
              <s.icon className="h-5 w-5" />
            </div>
            <div className="text-2xl font-black text-slate-900">{s.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Active Releases */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-900">Releases</h2>
            <button onClick={() => onNavigate('releases')}
              className="flex items-center gap-1.5 text-xs font-semibold text-teal-600 hover:text-teal-700 transition-colors">
              <Plus className="h-3.5 w-3.5" /> New Release
            </button>
          </div>
          {releaseList.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">No releases yet</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {releaseList.slice(0, 5).map(r => {
                const pct = r.stats.total ? Math.round(r.stats.pass / r.stats.total * 100) : 0;
                return (
                  <button key={r.id} onClick={() => onNavigate('release-detail', { id: r.id })}
                    className="w-full flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors text-left">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800 text-sm truncate">{r.name}</span>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_COLOR[r.status]}`}>{r.status}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">v{r.version} · {typeof r.runs === 'number' ? r.runs : (r.runs as []).length} runs</p>
                      {r.stats.total > 0 && (
                        <div className="mt-1.5 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      )}
                    </div>
                    <span className="shrink-0 text-sm font-bold text-slate-500">{pct}%</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Runs */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-900">Recent Test Runs</h2>
          </div>
          {recentRuns.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">No test runs yet</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentRuns.map(run => (
                <button key={run.id} onClick={() => onNavigate('run-execution', { id: run.id })}
                  className="w-full flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors text-left">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800 text-sm truncate">{run.name}</span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${RUN_COLOR[run.status]}`}>{run.status.replace('_',' ')}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                      <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-emerald-500" />{run.pass}</span>
                      <span className="flex items-center gap-1"><XCircle className="h-3 w-3 text-rose-500" />{run.fail}</span>
                      <span>{run.done}/{run.total}</span>
                    </div>
                  </div>
                  <div className="shrink-0 text-xs text-slate-400">
                    {run.total ? `${Math.round(run.done/run.total*100)}%` : '—'}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
