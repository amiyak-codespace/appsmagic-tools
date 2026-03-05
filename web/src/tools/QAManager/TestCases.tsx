import { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Trash2, Pencil, FlaskConical, Filter, Sparkles, RefreshCw, FolderOpen } from 'lucide-react';
import { cases as caseApi, ai, type TestCase, type Suite } from './api';

const PRIORITY_COLOR: Record<string, string> = { critical:'bg-rose-100 text-rose-700', high:'bg-orange-100 text-orange-700', medium:'bg-blue-100 text-blue-700', low:'bg-slate-100 text-slate-500' };
const TYPE_COLOR: Record<string, string>     = { functional:'bg-violet-100 text-violet-700', regression:'bg-amber-100 text-amber-700', smoke:'bg-teal-100 text-teal-700', sanity:'bg-sky-100 text-sky-700', integration:'bg-indigo-100 text-indigo-700', performance:'bg-pink-100 text-pink-700', security:'bg-red-100 text-red-700' };

interface Props { onEdit: (tc: TestCase | null, suiteId?: string) => void }

export function TestCases({ onEdit }: Props) {
  const [list,    setList]    = useState<TestCase[]>([]);
  const [suites,  setSuites]  = useState<Suite[]>([]);
  const [search,  setSearch]  = useState('');
  const [suite,   setSuite]   = useState('');
  const [type,    setType]    = useState('');
  const [priority,setPriority]= useState('');
  const [loading, setLoading] = useState(true);
  const [suiteModal, setSuiteModal] = useState(false);
  const [newSuiteName, setNewSuiteName] = useState('');
  const [aiModal, setAiModal] = useState(false);
  const [aiFeature, setAiFeature] = useState('');
  const [aiCount,   setAiCount]   = useState(5);
  const [aiType,    setAiType]    = useState('functional');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPreview, setAiPreview] = useState<Partial<TestCase>[]>([]);
  const [aiError,   setAiError]   = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (suite)    params.suite_id = suite;
    if (type)     params.type     = type;
    if (priority) params.priority = priority;
    if (search)   params.search   = search;
    const [cases, s] = await Promise.all([caseApi.list(params), caseApi.suites()]);
    setList(cases); setSuites(s); setLoading(false);
  }, [suite, type, priority, search]);

  useEffect(() => { load(); }, [load]);

  async function del(id: string) {
    if (!confirm('Delete this test case?')) return;
    await caseApi.delete(id); load();
  }

  async function createSuite() {
    if (!newSuiteName.trim()) return;
    await caseApi.createSuite({ name: newSuiteName.trim() });
    setNewSuiteName(''); setSuiteModal(false); load();
  }

  async function generateCases() {
    if (!aiFeature.trim()) return;
    setAiLoading(true); setAiError('');
    try { setAiPreview((await ai.generateCases(aiFeature, aiCount, aiType)).cases); }
    catch (e) { setAiError((e as Error).message); }
    finally { setAiLoading(false); }
  }

  async function importAiCases() {
    for (const c of aiPreview) {
      await caseApi.create({ ...c, suite_id: suite || undefined } as Partial<TestCase>);
    }
    setAiModal(false); setAiPreview([]); setAiFeature(''); load();
  }

  const inp = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all';

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h1 className="text-xl font-bold text-slate-900">Test Cases <span className="text-slate-400 font-normal text-base ml-2">({list.length})</span></h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setSuiteModal(true)} className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
            <FolderOpen className="h-3.5 w-3.5" /> New Suite
          </button>
          <button onClick={() => setAiModal(true)} className="flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-700 hover:bg-teal-100 transition-colors">
            <Sparkles className="h-3.5 w-3.5" /> AI Generate
          </button>
          <button onClick={() => onEdit(null)} className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-3 py-2 text-xs font-bold text-white hover:bg-teal-700 transition-colors">
            <Plus className="h-3.5 w-3.5" /> New Case
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search cases…"
            className="w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 py-2 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100" />
        </div>
        <select value={suite} onChange={e => setSuite(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-400">
          <option value="">All Suites</option>
          {suites.map(s => <option key={s.id} value={s.id}>{s.name} ({s.case_count})</option>)}
        </select>
        <select value={type} onChange={e => setType(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-400">
          <option value="">All Types</option>
          {['functional','regression','smoke','sanity','integration','performance','security'].map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={priority} onChange={e => setPriority(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-400">
          <option value="">All Priorities</option>
          {['critical','high','medium','low'].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <button onClick={load} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-500 hover:bg-slate-50 transition-colors">
          <Filter className="h-4 w-4" />
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400"><span className="h-5 w-5 border-2 border-teal-400 border-t-transparent rounded-full animate-spin mr-2" />Loading…</div>
      ) : list.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <FlaskConical className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No test cases found</p>
          <button onClick={() => onEdit(null)} className="mt-3 text-sm text-teal-600 hover:underline">Create your first test case →</button>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-500">
                <th className="px-4 py-3 text-left">Title</th>
                <th className="px-4 py-3 text-left hidden sm:table-cell">Suite</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Type</th>
                <th className="px-4 py-3 text-left">Priority</th>
                <th className="px-4 py-3 text-left hidden lg:table-cell">Steps</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map(tc => (
                <tr key={tc.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800 max-w-sm truncate">{tc.title}</div>
                    {tc.tags && <div className="text-xs text-slate-400 mt-0.5 truncate">{tc.tags}</div>}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-xs text-slate-500">{tc.suite_name || '—'}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${TYPE_COLOR[tc.type] || 'bg-slate-100 text-slate-500'}`}>{tc.type}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${PRIORITY_COLOR[tc.priority] || 'bg-slate-100 text-slate-500'}`}>{tc.priority}</span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-slate-400">{tc.steps?.length ?? 0} steps</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => onEdit(tc)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => del(tc.id)} className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New Suite Modal */}
      {suiteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-6">
            <h3 className="font-bold text-slate-900 mb-4">New Test Suite</h3>
            <input value={newSuiteName} onChange={e => setNewSuiteName(e.target.value)} placeholder="Suite name" className={inp} onKeyDown={e => e.key === 'Enter' && createSuite()} />
            <div className="flex gap-2 mt-4">
              <button onClick={() => setSuiteModal(false)} className="flex-1 rounded-xl border border-slate-200 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={createSuite} className="flex-1 rounded-xl bg-teal-600 py-2 text-sm font-bold text-white hover:bg-teal-700">Create</button>
            </div>
          </div>
        </div>
      )}

      {/* AI Generate Modal */}
      {aiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl p-6 my-4">
            <div className="flex items-center gap-2 mb-5">
              <Sparkles className="h-5 w-5 text-teal-600" />
              <h3 className="font-bold text-slate-900">AI Generate Test Cases</h3>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Describe the feature to test *</label>
                <textarea rows={4} value={aiFeature} onChange={e => setAiFeature(e.target.value)}
                  placeholder="e.g. User login flow with email/password, forgot password, and session management"
                  className={inp + ' resize-none'} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Number of cases</label>
                  <select value={aiCount} onChange={e => setAiCount(Number(e.target.value))} className={inp}>
                    {[3,5,8,10,15].map(n => <option key={n} value={n}>{n} cases</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Test type</label>
                  <select value={aiType} onChange={e => setAiType(e.target.value)} className={inp}>
                    {['functional','regression','smoke','sanity','integration'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              {aiError && <p className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-2.5 text-sm text-rose-600">{aiError}</p>}
              <button onClick={generateCases} disabled={aiLoading || !aiFeature.trim()}
                className="flex items-center justify-center gap-2 rounded-xl bg-teal-600 py-2.5 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-60">
                {aiLoading ? <><RefreshCw className="h-4 w-4 animate-spin" /> Generating…</> : <><Sparkles className="h-4 w-4" /> Generate with Gemini</>}
              </button>
            </div>

            {aiPreview.length > 0 && (
              <div className="mt-5">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">{aiPreview.length} Cases Generated — Review before importing</p>
                <div className="max-h-64 overflow-y-auto flex flex-col gap-2 pr-1">
                  {aiPreview.map((c, i) => (
                    <div key={i} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-slate-800 text-sm">{c.title}</p>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${PRIORITY_COLOR[c.priority || 'medium'] || ''}`}>{c.priority}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{c.steps?.length ?? 0} steps · {c.tags}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={() => setAiPreview([])} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Regenerate</button>
                  <button onClick={importAiCases} className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white hover:bg-emerald-700">Import All Cases</button>
                </div>
              </div>
            )}

            <button onClick={() => { setAiModal(false); setAiPreview([]); setAiFeature(''); }} className="mt-4 w-full rounded-xl border border-slate-200 py-2 text-sm text-slate-500 hover:bg-slate-50">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
