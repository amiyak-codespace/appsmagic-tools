import { useState } from 'react';
import { FlaskConical, Eye, EyeOff, UserPlus, LogIn } from 'lucide-react';
import { auth, setToken, type User } from './api';

interface Props { onLogin: (user: User) => void }

export function Login({ onLogin }: Props) {
  const [mode,     setMode]     = useState<'login' | 'register'>('login');
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [acceptCookies, setAcceptCookies] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const AVATARS = ['🧑','👩','🧑‍💻','👨‍💻','🦊','🐱','🤖','🧪'];
  const [avatar, setAvatar] = useState('🧑');

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError('');
    try {
      if (mode === 'login') {
        const { token, user } = await auth.login(email, password);
        setToken(token); onLogin(user);
      } else {
        if (!acceptTerms || !acceptPrivacy || !acceptCookies) throw new Error('Accept Terms, Privacy Policy, and Cookie Policy');
        await auth.register({
          name, email, password, avatar,
          terms_accepted: true,
          privacy_accepted: true,
          consent_version: '2026-03',
        });
        const { token, user } = await auth.login(email, password);
        setToken(token); onLogin(user);
      }
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }

  const inp = 'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 transition-all';

  return (
    <div className="min-h-full flex items-center justify-center bg-gradient-to-br from-slate-950 via-teal-950 to-slate-900 p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 shadow-2xl shadow-teal-500/25">
            <FlaskConical className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">QA Manager</h1>
          <p className="mt-1 text-sm text-white/50">Sprint & Release Test Management</p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-8">
          <div className="flex rounded-xl border border-white/10 bg-white/5 p-1 mb-6">
            {(['login', 'register'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${mode === m ? 'bg-teal-600 text-white shadow' : 'text-white/50 hover:text-white'}`}>
                {m === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="flex flex-col gap-4">
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-white/60 mb-1.5">Your Name</label>
                  <input required value={name} onChange={e => setName(e.target.value)} placeholder="Jane Smith" className={inp} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/60 mb-1.5">Pick an Avatar</label>
                  <div className="flex gap-2 flex-wrap">
                    {AVATARS.map(a => (
                      <button key={a} type="button" onClick={() => setAvatar(a)}
                        className={`text-xl h-9 w-9 rounded-lg transition-all ${avatar === a ? 'bg-teal-500/30 ring-2 ring-teal-400' : 'bg-white/5 hover:bg-white/10'}`}>
                        {a}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
            <div>
              <label className="block text-xs font-semibold text-white/60 mb-1.5">Email</label>
              <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className={inp} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/60 mb-1.5">Password</label>
              <div className="relative">
                <input required type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className={inp + ' pr-10'} />
                <button type="button" onClick={() => setShowPw(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {mode === 'register' && (
              <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70">
                <label className="flex items-start gap-2">
                  <input type="checkbox" checked={acceptTerms} onChange={e => setAcceptTerms(e.target.checked)} className="mt-0.5" />
                  <span>I agree to <a href="https://appsmagic.in/terms-and-conditions" target="_blank" rel="noreferrer" className="text-teal-300 underline">Terms and Conditions</a></span>
                </label>
                <label className="mt-1 flex items-start gap-2">
                  <input type="checkbox" checked={acceptPrivacy} onChange={e => setAcceptPrivacy(e.target.checked)} className="mt-0.5" />
                  <span>I agree to <a href="https://appsmagic.in/privacy-policy" target="_blank" rel="noreferrer" className="text-teal-300 underline">Privacy Policy</a></span>
                </label>
                <label className="mt-1 flex items-start gap-2">
                  <input type="checkbox" checked={acceptCookies} onChange={e => setAcceptCookies(e.target.checked)} className="mt-0.5" />
                  <span>I agree to <a href="https://appsmagic.in/cookie-policy" target="_blank" rel="noreferrer" className="text-teal-300 underline">Cookie Policy</a></span>
                </label>
              </div>
            )}
            {error && <p className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-4 py-2.5 text-sm text-rose-400">{error}</p>}
            <button type="submit" disabled={loading}
              className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-teal-500/25 hover:opacity-90 disabled:opacity-60 transition-all mt-1">
              {loading ? <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (mode === 'login' ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />)}
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {mode === 'login' && (
            <p className="mt-4 text-center text-xs text-white/30">
              Default: admin@qa.local / QA2026!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
