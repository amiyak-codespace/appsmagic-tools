import { useState, useEffect, useCallback } from 'react';
import { LayoutDashboard, Rocket, FlaskConical, LogOut, Menu, X, AlertTriangle } from 'lucide-react';
import { getToken, clearToken, auth, type User } from './api';
import { useSession } from './useSession';
import { Login }         from './Login';
import { Dashboard }     from './Dashboard';
import { Releases }      from './Releases';
import { ReleaseDetail } from './ReleaseDetail';
import { TestCases }     from './TestCases';
import { CaseEditor }    from './CaseEditor';
import { RunExecution }  from './RunExecution';
import { AiPanel }       from './AiPanel';

type Page = 'dashboard' | 'releases' | 'release-detail' | 'cases' | 'case-editor' | 'run-execution';

const NAV = [
  { id: 'dashboard',  label: 'Dashboard',   icon: LayoutDashboard },
  { id: 'releases',   label: 'Releases',    icon: Rocket },
  { id: 'cases',      label: 'Test Cases',  icon: FlaskConical },
];

export function QAManager() {
  const [user,       setUser]       = useState<User | null>(null);
  const [checking,   setChecking]   = useState(true);
  const [page,       setPage]       = useState<Page>('dashboard');
  const [params,     setParams]     = useState<Record<string, string>>({});
  const [editCase,   setEditCase]   = useState<any>(null);
  const [mobileNav,  setMobileNav]  = useState(false);
  const [idleWarn,   setIdleWarn]   = useState<number | null>(null); // seconds left

  useEffect(() => {
    if (getToken()) {
      auth.me().then(setUser).catch(() => clearToken()).finally(() => setChecking(false));
    } else {
      setChecking(false);
    }
  }, []);

  function navigate(p: string, navParams?: Record<string, string>) {
    setPage(p as Page);
    setParams(navParams || {});
    setMobileNav(false);
    window.scrollTo(0, 0);
  }

  function logout() { clearToken(); setUser(null); setIdleWarn(null); }

  const handleWarn   = useCallback((s: number) => setIdleWarn(s), []);
  const handleActive = useCallback(() => setIdleWarn(null), []);

  // Session management — only active when logged in
  useSession(user ? { onLogout: logout, onWarn: handleWarn, onActive: handleActive } : { onLogout: () => {}, onWarn: () => {}, onActive: () => {} });

  if (checking) return (
    <div className="flex items-center justify-center h-full min-h-[400px] bg-slate-50">
      <span className="h-8 w-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!user) return <Login onLogin={u => { setUser(u); setPage('dashboard'); }} />;

  return (
    <div className="flex h-full min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 flex flex-col bg-white border-r border-slate-200 shadow-sm
        transition-transform duration-200 ease-in-out w-56
        ${mobileNav ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0 lg:flex lg:shrink-0
      `}>
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-slate-100">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 shadow">
            <FlaskConical className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-slate-900 text-sm">QA Manager</span>
        </div>

        <nav className="flex-1 py-4 px-3 overflow-y-auto">
          {NAV.map(n => (
            <button key={n.id} onClick={() => navigate(n.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold mb-1 transition-all
              ${page === n.id || (page === 'release-detail' && n.id === 'releases')
                ? 'bg-teal-50 text-teal-700'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
              <n.icon className="h-4 w-4 shrink-0" />
              {n.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-2 mb-3 px-1">
            <span className="text-xl">{user.avatar}</span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{user.name}</p>
              <p className="text-xs text-slate-400 truncate">{user.role.replace('_',' ')}</p>
            </div>
          </div>
          <button onClick={logout}
            className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors">
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileNav && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setMobileNav(false)} />}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200">
          <button onClick={() => setMobileNav(s => !s)} className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg">
            {mobileNav ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <span className="font-bold text-slate-900">QA Manager</span>
        </header>

        <main className="flex-1 overflow-y-auto">
          {page === 'dashboard' && <Dashboard onNavigate={navigate} />}
          {page === 'releases'  && <Releases onNavigate={navigate} />}
          {page === 'release-detail' && params.id && (
            <ReleaseDetail releaseId={params.id} onBack={() => navigate('releases')} onNavigate={navigate} />
          )}
          {page === 'cases' && (
            <TestCases onEdit={(tc, suiteId) => { setEditCase(tc); navigate('case-editor', suiteId ? { suiteId } : {}); }} />
          )}
          {page === 'case-editor' && (
            <CaseEditor initial={editCase} onSave={() => navigate('cases')} onBack={() => navigate('cases')} />
          )}
          {page === 'run-execution' && params.id && (
            <RunExecution runId={params.id} onBack={() => navigate('releases')} />
          )}
        </main>
      </div>

      {/* Floating AI panel */}
      <AiPanel />

      {/* Idle warning toast */}
      {idleWarn !== null && (
        <div className="fixed bottom-24 right-5 z-50 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 shadow-xl shadow-amber-100/50 max-w-sm animate-in slide-in-from-bottom-4">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800">Session expiring</p>
            <p className="text-xs text-amber-600">
              You'll be logged out in <span className="font-bold">{idleWarn}s</span> due to inactivity
            </p>
          </div>
          <button onClick={() => setIdleWarn(null)}
            className="shrink-0 rounded-lg bg-amber-100 px-2.5 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-200 transition-colors">
            Stay
          </button>
        </div>
      )}
    </div>
  );
}
