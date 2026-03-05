import { useEffect, useState } from 'react';
import { Plus, Calendar, ChevronRight, CheckCircle, XCircle, Clock, Pencil, Trash2, RefreshCw } from 'lucide-react';
import { releases as relApi, type Release } from './api';

interface Props { onNavigate: (page: string, params?: Record<string, string>) => void }

const STATUS_OPTIONS = ['draft', 'active', 'completed', 'archived'];
const STATUS_COLOR: Record<string, string> = {
  active: 'bg-teal-100 text-teal-700', draft: 'bg-slate-100 text-slate-500',
  completed: 'bg-emerald-100 text-emerald-700', archived: 'bg-slate-100 text-slate-400',
};

function ReleaseForm({ initial, onSave, onClose }: {
  initial?: Partial<Release>; onSave: (d: Partial<Release>) => Promise<void>; onClose: () => void;
}) {
  const [form, setForm] = useState({ version: '', name: '', description: '', start_date: '', end_date: '', status: 'draft', ...initial });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));
  const inp = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all';

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError('');
    try { await onSave(form); onClose(); }
    catch (ex) { setError((ex as Error).message); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl p-6">
        <h2 className="font-bold text-slate-900 mb-5">{initial?.id ? 'Edit Release' : 'New Release'}</h2>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Version *</label>
              <input required value={form.version} onChange={set('version')} placeholder="v1.2.0" className={inp} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Status</label>
              <select value={form.status} onChange={set('status')} className={inp}>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Release Name *</label>
            <input required value={form.name} onChange={set('name')} placeholder="Sprint 12 Release" className={inp} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Description</label>
            <textarea rows={3} value={form.description} onChange={set('description')} placeholder="What's included…" className={inp + ' resize-none'} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Start Date</label>
              <input type="date" value={form.start_date} onChange={set('start_date')} className={inp} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">End Date</label>
              <input type="date" value={form.end_date} onChange={set('end_date')} className={inp} />
            </div>
          </div>
          {error && <p className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-2.5 text-sm text-rose-600">{error}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 rounded-xl bg-teal-600 py-2.5 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-60 transition-colors">
              {loading ? <RefreshCw className="h-4 w-4 animate-spin mx-auto" /> : (initial?.id ? 'Save Changes' : 'Create Release')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function Releases({ onNavigate }: Props) {
  const [list,    setList]    = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState<'new' | Release | null>(null);

  const load = () => relApi.list().then(setList).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  async function save(data: Partial<Release>) {
    if (modal && typeof modal === 'object' && modal.id) {
      await relApi.update(modal.id, data); load();
    } else {
      await relApi.create(data); load();
    }
  }

  async function del(id: string) {
    if (!confirm('Delete this release?')) return;
    await relApi.delete(id); load();
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-slate-900">Releases & Sprints</h1>
        <button onClick={() => setModal('new')}
          className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-sm font-bold text-white hover:bg-teal-700 transition-colors">
          <Plus className="h-4 w-4" /> New Release
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400"><span className="h-6 w-6 border-2 border-teal-400 border-t-transparent rounded-full animate-spin mr-2" />Loading…</div>
      ) : list.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <p className="font-medium mb-2">No releases yet</p>
          <button onClick={() => setModal('new')} className="text-sm text-teal-600 hover:underline">Create your first release →</button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {list.map(r => {
            const pct = r.stats.total ? Math.round(r.stats.pass / r.stats.total * 100) : 0;
            return (
              <div key={r.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center gap-4 p-5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900">{r.name}</span>
                      <span className="text-sm text-slate-400">v{r.version}</span>
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${STATUS_COLOR[r.status]}`}>{r.status}</span>
                    </div>
                    {r.description && <p className="text-sm text-slate-500 mt-1 truncate">{r.description}</p>}
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                      {r.start_date && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{r.start_date} → {r.end_date || '…'}</span>}
                      <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-emerald-500" />{r.stats.pass} pass</span>
                      <span className="flex items-center gap-1"><XCircle className="h-3 w-3 text-rose-500" />{r.stats.fail} fail</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-slate-400" />{r.stats.pending} pending</span>
                    </div>
                    {r.stats.total > 0 && (
                      <div className="mt-2 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => setModal(r)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => del(r.id)} className="p-2 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"><Trash2 className="h-4 w-4" /></button>
                    <button onClick={() => onNavigate('release-detail', { id: r.id })}
                      className="p-2 rounded-lg text-slate-400 hover:bg-teal-50 hover:text-teal-600 transition-colors"><ChevronRight className="h-4 w-4" /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <ReleaseForm
          initial={typeof modal === 'object' ? modal : undefined}
          onSave={save}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
