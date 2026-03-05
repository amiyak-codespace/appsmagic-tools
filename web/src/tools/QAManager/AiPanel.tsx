import { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send, RefreshCw, Bot, User, Lightbulb } from 'lucide-react';
import { ai } from './api';

interface Message { role: 'user' | 'ai'; text: string }

const QUICK_PROMPTS = [
  'What makes a good test case?',
  'How do I structure a sprint test plan?',
  'What should I test for a login feature?',
  'What are the differences between smoke and regression tests?',
  'How do I calculate test coverage?',
  'Best practices for writing test steps?',
];

export function AiPanel() {
  const [open,    setOpen]    = useState(false);
  const [input,   setInput]   = useState('');
  const [messages,setMessages]= useState<Message[]>([
    { role: 'ai', text: '👋 Hi! I\'m your QA assistant powered by Gemini. Ask me anything about test planning, writing test cases, analyzing failures, or QA best practices!' }
  ]);
  const [loading, setLoading] = useState(false);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, open]);
  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

  async function send(text?: string) {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput('');
    setMessages(p => [...p, { role: 'user', text: msg }]);
    setLoading(true);
    try {
      const { reply } = await ai.chat(msg);
      setMessages(p => [...p, { role: 'ai', text: reply }]);
    } catch (e) {
      setMessages(p => [...p, { role: 'ai', text: '❌ ' + (e as Error).message }]);
    } finally { setLoading(false); }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 shadow-xl shadow-teal-500/30 hover:scale-105 transition-transform">
          <Sparkles className="h-6 w-6 text-white" />
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed bottom-5 right-5 z-50 flex flex-col w-[380px] max-h-[600px] rounded-2xl bg-white border border-slate-200 shadow-2xl shadow-slate-900/20 overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-teal-600 to-cyan-600">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-white text-sm">QA Assistant</p>
              <p className="text-xs text-teal-100">Powered by Gemini AI</p>
            </div>
            <button onClick={() => setOpen(false)} className="p-1 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 min-h-0">
            {messages.map((m, i) => (
              <div key={i} className={`flex items-start gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`shrink-0 flex h-7 w-7 items-center justify-center rounded-full ${m.role === 'ai' ? 'bg-gradient-to-br from-teal-500 to-cyan-600' : 'bg-slate-200'}`}>
                  {m.role === 'ai' ? <Bot className="h-3.5 w-3.5 text-white" /> : <User className="h-3.5 w-3.5 text-slate-600" />}
                </div>
                <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm ${m.role === 'ai' ? 'bg-slate-100 text-slate-800 rounded-tl-sm' : 'bg-teal-600 text-white rounded-tr-sm'}`}>
                  <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-start gap-2">
                <div className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-600">
                  <Bot className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="rounded-2xl rounded-tl-sm bg-slate-100 px-3.5 py-3">
                  <RefreshCw className="h-3.5 w-3.5 text-slate-400 animate-spin" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick prompts (show when only 1 message) */}
          {messages.length === 1 && !loading && (
            <div className="px-4 pb-2">
              <p className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1"><Lightbulb className="h-3 w-3" /> Quick questions</p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_PROMPTS.map(q => (
                  <button key={q} onClick={() => send(q)}
                    className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-600 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700 transition-colors">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="border-t border-slate-100 p-3 flex items-end gap-2">
            <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey} rows={1}
              placeholder="Ask anything about QA… (Enter to send)"
              className="flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all max-h-24"
              style={{ minHeight: '38px' }} />
            <button onClick={() => send()} disabled={loading || !input.trim()}
              className="shrink-0 flex h-9 w-9 items-center justify-center rounded-xl bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-40 transition-colors">
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
