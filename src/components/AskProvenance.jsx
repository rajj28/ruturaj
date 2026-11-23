import { useEffect, useRef, useState } from 'react'
import './AskProvenance.css'

/* "Ask my portfolio": a small chat panel backed by the Provenance agent.
 *
 * It answers only from the evidence-checked items Provenance has published, and
 * shows which items each answer came from. Configured entirely by build-time
 * env vars; when they are not set the component renders nothing, so the page is
 * unchanged until Provenance is deployed.
 *
 *   VITE_PROVENANCE_URL   e.g. https://provenance.example.com  (no trailing slash)
 *   VITE_PROVENANCE_SLUG  defaults to "ruturaj"
 */
const BASE = (import.meta.env.VITE_PROVENANCE_URL || '').replace(/\/+$/, '')
const SLUG = import.meta.env.VITE_PROVENANCE_SLUG || 'ruturaj'
const SUGGESTIONS = ['What have you built recently?', 'Which agent projects are you proudest of?', 'What is your strongest stack?']

export default function AskProvenance() {
  const [open, setOpen] = useState(false)
  const [turns, setTurns] = useState([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const logRef = useRef(null)
  const abortRef = useRef(null)

  useEffect(() => {
    const el = logRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [turns, busy])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => () => abortRef.current?.abort(), [])

  if (!BASE) return null

  async function send(text) {
    const question = text.trim()
    if (!question || busy) return
    const next = [...turns, { role: 'user', content: question }]
    setTurns(next)
    setInput('')
    setError('')
    setBusy(true)
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    try {
      const res = await fetch(`${BASE}/api/agent/${encodeURIComponent(SLUG)}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: next.map(({ role, content }) => ({ role, content })) }),
        signal: ctrl.signal,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(res.status === 429 ? 'Too many questions, try again in a few minutes.' : data.error || 'Something went wrong.')
      setTurns([...next, { role: 'assistant', content: data.answer, citations: data.citations || [] }])
    } catch (e) {
      if (e.name !== 'AbortError') setError(e.message || 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="ask" data-open={open}>
      {open && (
        <section className="ask__panel" role="dialog" aria-label="Ask about Ruturaj's work" data-lenis-prevent>
          <header className="ask__head">
            <span>Ask about my work</span>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close">×</button>
          </header>

          <div className="ask__log" ref={logRef} aria-live="polite">
            {turns.length === 0 && (
              <div className="ask__intro">
                <p>Answers come only from my published, source-checked projects.</p>
                {SUGGESTIONS.map((s) => (
                  <button key={s} type="button" className="ask__chip" onClick={() => send(s)}>{s}</button>
                ))}
              </div>
            )}
            {turns.map((t, i) => (
              <div key={i} className={`ask__msg ask__msg--${t.role}`}>
                <p>{t.content}</p>
                {t.citations?.length > 0 && (
                  <ul className="ask__cites">
                    {t.citations.map((c) => (
                      <li key={c.id}>
                        {c.url ? <a href={c.url} target="_blank" rel="noopener noreferrer">{c.title}</a> : c.title}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
            {busy && <p className="ask__msg ask__msg--assistant ask__typing">Looking through the projects…</p>}
            {error && <p className="ask__error" role="alert">{error}</p>}
          </div>

          <form
            className="ask__form"
            onSubmit={(e) => {
              e.preventDefault()
              send(input)
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question…"
              maxLength={1000}
              aria-label="Your question"
            />
            <button type="submit" disabled={busy || !input.trim()}>Ask</button>
          </form>
        </section>
      )}
      <button type="button" className="ask__fab" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {open ? 'Close' : 'Ask my portfolio'}
      </button>
    </div>
  )
}
