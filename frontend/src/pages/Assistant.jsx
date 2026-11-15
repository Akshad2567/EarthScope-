import { useEffect, useRef, useState } from 'react'
import { Send } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import Panel from '../components/Panel.jsx'
import Notice from '../components/Notice.jsx'
import { api } from '../services/api.js'
import { useAnalysis } from '../context/AnalysisContext.jsx'

const SUGGESTIONS = [
  'What is land surface temperature?',
  'How is land surface temperature different from air temperature?',
  'What does the Mann-Kendall p-value tell me?',
  'Which other variables could help explain a warming trend?',
]

export default function Assistant() {
  const { result } = useAnalysis()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const endRef = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = async (text) => {
    const message = text.trim()
    if (!message || busy) return
    setInput('')
    setMessages((m) => [...m, { role: 'user', text: message }])
    setBusy(true)
    try {
      // The backend grounds its answer in this retrieved result (if any).
      const res = await api.assistantChat({ message, analysis: result })
      setMessages((m) => [...m, { role: 'assistant', text: res.answer, evidence: res.evidence, explanations: res.possible_explanations }])
    } catch (err) {
      setMessages((m) => [...m, { role: 'error', text: err.message }])
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="AI Science Assistant" subtitle="Ask about variables, trends and statistics. Answers are grounded in your analysis results." />

      <Notice>
        {result
          ? 'Your latest analysis result will be shared with the assistant so it can interpret your actual numbers.'
          : 'No analysis has been run yet, so the assistant can only give general explanations.'}
      </Notice>

      <Panel>
        <div className="min-h-[300px] space-y-4" aria-live="polite">
          {messages.length === 0 && (
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} className="btn-ghost text-left" onClick={() => send(s)}>{s}</button>
              ))}
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
              <div
                className={`inline-block max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-left text-sm ${
                  m.role === 'user' ? 'bg-accent text-navy-950' : m.role === 'error' ? 'border border-red-500/40 bg-red-500/10 text-red-200' : 'bg-navy-700 text-ink'
                }`}
              >
                {m.text}
              </div>
              {m.evidence?.length > 0 && (
                <div className="mt-2 text-left text-xs text-ink-muted">
                  <p className="font-semibold text-teal">Measured evidence</p>
                  <ul className="list-disc pl-5">{m.evidence.map((e) => <li key={e}>{e}</li>)}</ul>
                </div>
              )}
              {m.explanations?.length > 0 && (
                <div className="mt-2 text-left text-xs text-ink-muted">
                  <p className="font-semibold text-amber-300">Possible explanations (not established by this data)</p>
                  <ul className="list-disc pl-5">{m.explanations.map((e) => <li key={e}>{e}</li>)}</ul>
                </div>
              )}
            </div>
          ))}
          {busy && <p className="text-sm text-ink-muted">Thinking…</p>}
          <div ref={endRef} />
        </div>

        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            send(input)
          }}
        >
          <label htmlFor="chat" className="sr-only">Your question</label>
          <input id="chat" className="field" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask a question about Earth science data…" />
          <button className="btn-primary" disabled={busy || !input.trim()} type="submit" aria-label="Send">
            <Send size={16} aria-hidden />
          </button>
        </form>
      </Panel>
    </div>
  )
}
