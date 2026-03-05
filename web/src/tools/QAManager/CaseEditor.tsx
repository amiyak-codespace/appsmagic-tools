import { useState, useEffect } from 'react';
import { Plus, Trash2, Sparkles, RefreshCw, ArrowLeft } from 'lucide-react';
import { cases as caseApi, ai, type TestCase, type Suite, type Step } from './api';

const TYPES     = ['functional','regression','smoke','sanity','integration','performance','security'];
const PRIORITIES = ['critical','high','medium','low'];

interface Props { initial?: TestCase | null; onSave: () => void; onBack: () => void }

export function CaseEditor({ initial, onSave, onBack }: Props) {
  const [suites,  setSuites]  = useState<Suite[]>([]);
  const [form,    setForm]    = useState({
    title: '', description: '', expected_result: '', type: 'functional', priority: 'medium',
    suite_id: '', tags: '', steps: [] as Step[], ...initial,
  });
  const [loading,    setLoading]    = useState(false);
  const [aiLoading,  setAiLoading]  = useState(false);
  const [error,      setError]      = useState('');

  useEffect(() => { caseApi.suites().then(setSuites); }, []);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  function addStep()          { setForm(f => ({ ...f, steps: [...f.steps, { step: '', expected: '' }] })); }
  function removeStep(i: number){ setForm(f => ({ ...f, steps: f.steps.filter((_, j) => j !== i) })); }
  function setStep(i: number, k: 'step' | 'expected', v: string) {
    setForm(f => { const s = [...f.steps]; s[i] = { ...s[i], [k]: v }; return { ...f, steps: s }; });
  }

  async function aiGenerateSteps() {
    if (!form.title) return;
    setAiLoading(true);
    try {
      const r = await ai.generateSteps(form.title, form.description);
      setForm(f => ({ ...f, steps: r.steps, expected_result: r.expected_result, priority: r.priority || f.priority }));
    } catch (e) { setError('AI error: ' + (e as Error).message); }
    finally { setAiLoading(false); }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError('');
    try {
      if (initial?.id) await caseApi.update(initial.id, form);
      else             await caseApi.create(form);
      onSave();
    } catch (ex) { setError((ex as Error).message); }
    finally { setLoading(false); }
  }

  const inp = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all';

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-5 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Test Cases
      </button>
      <h1 className="text-xl font-bold text-slate-900 mb-6">{initial?.id ? 'Edit Test Case' : 'New Test Case'}</h1>

      <form onSubmit={submit} className="flex flex-col gap-6">
        {/* Basic info */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Details</h3>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Title *</label>
              <input required value={form.title} onChange={set('title')} placeholder="Verify user can log in with valid credentials" className={inp} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
              <textarea rows={2} value={form.description} onChange={set('description')} placeholder="Brief explanation of what this test verifies…" className={inp + ' resize-none'} />
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Type</label>
                <select value={form.type} onChange={set('type')} className={inp}>
                  {TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Priority</label>
                <select value={form.priority} onChange={set('priority')} className={inp}>
                  {PRIORITIES.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Suite</label>
                <select value={form.suite_id} onChange={set('suite_id')} className={inp}>
                  <option value="">None</option>
                  {suites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Tags</label>
                <input value={form.tags} onChange={set('tags')} placeholder="login, auth" className={inp} />
              </div>
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Test Steps</h3>
            <div className="flex items-center gap-2">
              <button type="button" onClick={aiGenerateSteps} disabled={aiLoading || !form.title}
                className="flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-100 disabled:opacity-60 transition-colors">
                {aiLoading ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                AI Fill Steps
              </button>
              <button type="button" onClick={addStep}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                <Plus className="h-3 w-3" /> Add Step
              </button>
            </div>
          </div>

          {form.steps.length === 0 ? (
            <div className="text-center py-8 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
              <p className="text-sm">No steps yet</p>
              <button type="button" onClick={aiGenerateSteps} disabled={aiLoading || !form.title}
                className="mt-2 text-xs text-teal-600 hover:underline disabled:opacity-50">
                {form.title ? 'AI Generate Steps →' : 'Add a title first to use AI'}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {form.steps.map((s, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="mt-2.5 shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-teal-100 text-teal-700 text-[10px] font-bold">{i+1}</span>
                  <div className="flex-1 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <input value={s.step} onChange={e => setStep(i, 'step', e.target.value)} placeholder="Action: Go to login page" className={inp} />
                    <input value={s.expected} onChange={e => setStep(i, 'expected', e.target.value)} placeholder="Expected: Login page loads" className={inp} />
                  </div>
                  <button type="button" onClick={() => removeStep(i)} className="mt-2 p-1.5 text-slate-300 hover:text-rose-500 transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Expected result */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Overall Expected Result</h3>
          <textarea rows={3} value={form.expected_result} onChange={set('expected_result')}
            placeholder="What should happen at the end of all steps…"
            className={inp + ' resize-none'} />
        </div>

        {error && <p className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-600">{error}</p>}

        <div className="flex gap-3">
          <button type="button" onClick={onBack} className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
          <button type="submit" disabled={loading} className="flex-1 rounded-xl bg-teal-600 py-3 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-60 transition-colors">
            {loading ? <RefreshCw className="h-4 w-4 animate-spin mx-auto" /> : (initial?.id ? 'Save Changes' : 'Create Test Case')}
          </button>
        </div>
      </form>
    </div>
  );
}
