import { useEffect, useRef, useState } from 'react'
import Lenis from 'lenis'
import DitherSky from './components/DitherSky'
import treeSrc from './assets/tree.svg'
import { drawPlant } from './components/plant.js'
/* Imported rather than referenced out of public/ so the bundler fingerprints
   it. The file is still being iterated on, and a fixed /god.mp4 URL meant a
   browser that had already seen one version kept serving it back out of cache
   after the file on disk had changed underneath it. */
import godSrc from './assets/god.mp4'
import eatSrc from './assets/eat.mp4'
import appleSrc from './assets/apple.mp4'
import applePoster from './assets/apple-poster.jpg'
import './App.css'

/* Split a line into per-word spans so they can stagger up into place. */
function Line({ children, from = 0 }) {
  const words = children.split(' ')
  return (
    <span className="line">
      {words.map((w, i) => (
        <span
          key={i}
          className="w"
          style={{ animationDelay: `${(from + i) * 0.075 + 0.15}s` }}
        >
          {w}{i < words.length - 1 ? ' ' : ''}
        </span>
      ))}
    </span>
  )
}

/* Four-point sparkle. Concave sides are what make it read as a glint
   rather than a diamond. */
function Spark() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 0c.55 4.35 3.1 6.9 8 8-4.9 1.1-7.45 3.65-8 8-.55-4.35-3.1-6.9-8-8 4.9-1.1 7.45-3.65 8-8Z" />
    </svg>
  )
}

/* The pointer, redrawn — for a fine pointer only. A dot sits exactly under
   it and a ring trails a beat behind, opening over anything clickable and
   saying what a click will do when the element tells it (data-cursor). It is
   drawn in difference, so one white cursor reads on the blue, on the bone and
   over the photographs alike. Touch screens and reduced motion keep the
   system cursor. */
function Cursor() {
  const root = useRef(null)
  const dot = useRef(null)
  const ring = useRef(null)
  const label = useRef(null)

  useEffect(() => {
    const el = root.current
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!el || !fine || reduced) return
    const html = document.documentElement
    html.classList.add('has-cursor')

    let x = -100
    let y = -100
    let rx = -100
    let ry = -100
    let raf = 0
    const tick = () => {
      rx += (x - rx) * 0.2
      ry += (y - ry) * 0.2
      ring.current.style.transform = 'translate3d(' + rx + 'px,' + ry + 'px,0)'
      raf = Math.abs(x - rx) + Math.abs(y - ry) > 0.2 ? requestAnimationFrame(tick) : 0
    }
    const move = (e) => {
      x = e.clientX
      y = e.clientY
      dot.current.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)'
      if (!el.classList.contains('is-on')) {
        rx = x
        ry = y
        el.classList.add('is-on')
      }
      if (!raf) raf = requestAnimationFrame(tick)
    }
    const over = (e) => {
      const t = e.target instanceof Element ? e.target.closest('a, button, [data-cursor]') : null
      const text = t ? t.getAttribute('data-cursor') || '' : ''
      el.classList.toggle('is-link', !!t)
      el.classList.toggle('has-label', !!text)
      if (text) label.current.textContent = text
    }
    const out = (e) => { if (!e.relatedTarget) el.classList.remove('is-on') }
    const down = () => el.classList.add('is-down')
    const up = () => el.classList.remove('is-down')

    window.addEventListener('pointermove', move, { passive: true })
    document.addEventListener('pointerover', over)
    document.addEventListener('pointerout', out)
    window.addEventListener('pointerdown', down)
    window.addEventListener('pointerup', up)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', move)
      document.removeEventListener('pointerover', over)
      document.removeEventListener('pointerout', out)
      window.removeEventListener('pointerdown', down)
      window.removeEventListener('pointerup', up)
      html.classList.remove('has-cursor')
    }
  }, [])

  return (
    <div className="cursor" ref={root} aria-hidden="true">
      <i className="cursor__dot" ref={dot} />
      <span className="cursor__ring" ref={ring}><i><b ref={label} /></i></span>
    </div>
  )
}

/* The apple reel — scrubbed by scroll, not played.

   The section is a TALL track; a pinned viewport-height stage sits inside it.
   As the track passes, video.currentTime is driven directly from scroll
   progress, so the apple ripens and falls exactly as fast as you scroll,
   forward or backward.

   The pin is done by hand rather than with position:sticky, because sticky
   resolves against a scrolling ancestor and ours is a fixed, transformed
   container — sticky would simply never release. */
function Reel() {
  return (
    <section className="reel" data-tone="dark">
      <div className="reel__pin">
        <video
          className="reel__video"
          src={appleSrc}
          poster={applePoster}
          muted
          playsInline
          preload="auto"
          aria-label="An apple ripening on the branch, then falling"
        />

        <div className="reel__scrim" aria-hidden="true" />

        <div className="grid" aria-hidden="true">
          <i className="gv gv--l" />
          <i className="gv gv--r" />
          <i className="gh gh--t" />
          <i className="gh gh--b" />
          <span className="gx gx--bl"><Spark /></span>
          <span className="gx gx--br"><Spark /></span>
        </div>

        {/* The about copy assembles itself as the apple ripens: the driver
            sets --enter on the pin and each piece staggers off it by its own
            --d — the same mechanism the footer uses. */}
        <div className="reel__copy about">
          <p className="about__eyebrow rv" style={{ '--d': 0 }}>About — {ABOUT.role}</p>
          <h2>
            <span className="rv-line"><span className="rvm" style={{ '--d': 0.05 }}>{ABOUT.name}.</span></span>
            <span className="rv-line">
              <span className="about__de-em rvm" style={{ '--d': 0.11 }}>{ABOUT.role}, building for the web.</span>
            </span>
          </h2>
          <p className="reel__lede rv" style={{ '--d': 0.2 }}>{ABOUT.summary}</p>
          <ul className="about__chips rv" style={{ '--d': 0.3 }} aria-label="Focus and tags">
            {ABOUT.facts.map((f) => <li key={f}>{f}</li>)}
          </ul>
        </div>

        {/* The proof, set in the band under the lower rule. The numbers count
            up as each one arrives. */}
        <dl className="reel__stats">
          {ABOUT.stats.map((s, i) => {
            const d = 0.36 + i * 0.07
            return (
              <div className="reel__stat rv" key={s.label} style={{ '--d': d }}>
                <dt>{s.label}</dt>
                <dd>
                  {s.value != null
                    ? <><span data-count={s.value} data-d={d}>{s.value}</span>{s.suffix}</>
                    : s.text}
                </dd>
              </div>
            )
          })}
        </dl>
      </div>
    </section>
  )
}

/* The god. One clip, two beats with no cut between them: the apple drops in
   from above and he catches it without ever looking up, and then the camera
   finally gets off its side-on seat, travels around behind his shoulder and
   comes to rest looking down at the laptop.

   It used to open on him sitting and slowly raising his hand — ninety frames,
   nearly four seconds, three hundred and thirty viewport-heights of scroll to
   watch an arm go up. The reel above ends with the apple leaving the branch,
   so the only thing the next section owes it is somewhere for the apple to
   land. The clip now starts six frames before the apple enters the picture,
   with his hand already open and waiting.

   The three renders were joined offline. Each was generated from the last
   frame of the one before, so every join is a single frame and the scrub runs
   straight through them. All three drifted in exposure — a generative model
   cannot hold a flat backdrop still — so every frame was re-levelled to
   exactly --bone against a mask of the pixels that stay background for the
   whole fifteen seconds. That is what lets the video simply letterbox into
   the page instead of needing a scrim, a mask or a blend mode.

   The last beat exists to hand the laptop over to real HTML: it ends framed
   square on a screen that is switched off for the whole approach. Nothing is
   lit until the camera comes to rest, and then the machine wakes. */

/* Where the laptop's glass sits in the video's own 1280x720 frame, taken from
   the same track that drove the corner-pin, so the coded screen and the one
   baked into the footage land on exactly the same rectangle. The panel is 5px
   off true across its height — about one degree of perspective — so it can be
   treated as flat and axis-aligned and the overlay needs no 3D transform.
   It also happens to be centred on x = 0.5 almost exactly.

   Held 5px inside the tracked edge on every side. The render gives this lid no
   bezel worth the name — scanning down through its top edge goes 219, 222, 211
   for the aluminium rim catching the light and then straight to 5 — so a
   rectangle flush with the tracked edge paints over that rim and the machine
   loses its outline entirely.

   Five rather than the two it takes to spare the rim, because the glass behind
   the inset is the video's own, and the video's own glass is off. The margin
   therefore costs nothing and reads as the bezel the render never drew.

   Eight at the bottom rather than five. A panel's chin is always deeper than
   its sides, and a bezel of exactly equal width on all four edges is one of
   the things that makes a mocked-up screen look mocked up. */
const GLASS = { x0: 464.5 / 1280, x1: 814.4 / 1280, y0: 187 / 720, y1: 405 / 720 }

/* The glass's corners. The lid, measured off the same frame, turns on about
   eight pixels of radius at the video's own scale (the dark region pulls in
   from x=467 to x=458 over seven rows); the glass inside its bezel turns a
   little tighter than that. A square corner on a rounded lid is half of why
   an overlay reads as something stuck on top of the picture. */
const GLASS_INNER_R = 5.5 / 1280

/* Real content, pulled from GitHub (@rajj28) and LinkedIn. */
const ABOUT = {
  name: 'Ruturaj Sonkamble',
  role: 'AI Engineer',
  summary:
    'I build real-world AI systems — multimodal document understanding, GAN-based fraud detection scaled to over a billion transactions a day, autonomous multi-agent systems and RAG pipelines. Two years in, 40+ open-source projects and 200+ pull requests deep, and a GSoC\u201925 contributor. I care about the point where models stop being demos and become product.',
  facts: ['AI / ML', 'LLMs · RAG · Agents', 'PyTorch · GANs', 'Pune, India'],
  /* the same claims the summary makes, set as figures */
  stats: [
    { text: '1B+', label: 'Transactions a day, screened for fraud' },
    { value: 40, suffix: '+', label: 'Open-source projects' },
    { value: 200, suffix: '+', label: 'Pull requests' },
    { text: 'GSoC ’25', label: 'Google Summer of Code contributor' },
  ],
}

/* The Finder folders on the laptop desktop — the best of GitHub (@rajj28),
   chosen for product reality: deployed, documented, and doing a real job. */
/* Each folder opens a case study. The copy is written from the projects' own
   READMEs, and every figure under `results` is quoted from them — nothing is
   estimated. A `diagram` is a small grid spec the Diagram component draws:
   nodes are [id, label, sub, kind, column, row] with kind one of
   io / model / store / step, and edges are [from, to, label]. */
const PROJECTS = [
  {
    n: '01', name: 'SafePay AI', year: '2025', role: 'PyTorch · GANs',
    note: 'GAN-based fraud detection at NPCI scale — 1B+ transactions a day',
    url: 'https://github.com/rajj28/FraudDetectionUsingGANs',
    tagline: 'GAN-augmented fraud detection for UPI-scale payments.',
    summary: 'SafePay AI pairs a generative adversarial network with a Random Forest classifier. The GAN synthesises realistic fraudulent transactions to balance a heavily skewed dataset — without exposing a single real payment record — and the classifier trained on that balanced set scores every new payment. A React app lets a payer sign in, enter a transaction and see a fraud verdict before the money moves.',
    why: 'Fraud is a sliver of real payment traffic, so a model trained on raw data learns to ignore it — and the real records that would fix that are exactly the ones that cannot be shared. Synthetic data closes both gaps at once: balance for the model, privacy for the people behind the transactions.',
    where: [
      'UPI and other real-time payment rails, scoring each transaction before it executes',
      'Banks and payment providers that need training data without sharing customer records',
      'Consumer payment apps that warn a payer before they send money',
    ],
    how: [
      'Skewed real transactions train a GAN on what fraud looks like.',
      'The GAN generates synthetic fraud cases until the classes balance.',
      'A Random Forest trains on the balanced set.',
      'At payment time the Flask API scores the transaction, the app shows the verdict, and the history lands in Firestore.',
    ],
    results: [
      { v: '97.09%', l: 'Test accuracy' },
      { v: '1st', l: 'DigiPay Pro (NPCI) · IIT Bombay Techfest 2024' },
    ],
    stack: ['PyTorch', 'GAN', 'Random Forest', 'Flask', 'React', 'Firebase', 'Fly.io'],
    diagram: {
      alt: 'Skewed UPI data trains a GAN, which produces a balanced set that trains a Random Forest. A payer signs in to the React app, which sends the transaction through a Flask API to the Random Forest; its verdict is shown and logged to Firestore.',
      nodes: [
        ['a', 'Skewed UPI data', 'real, imbalanced', 'io', 0, 0],
        ['b', 'GAN', 'synthesises fraud', 'model', 1, 0],
        ['c', 'Balanced set', 'no real records', 'store', 2, 0],
        ['d', 'Random Forest', 'fraud classifier', 'model', 3, 0],
        ['h', 'Verdict', 'flag or pay', 'io', 4, 0],
        ['e', 'Payer', 'Google sign-in', 'io', 0, 1],
        ['f', 'React app', 'transaction entry', 'step', 1, 1],
        ['g', 'Flask API', 'Fly.io · Docker', 'step', 2, 1],
        ['i', 'Firestore', 'history', 'store', 4, 1],
      ],
      edges: [['a', 'b'], ['b', 'c', 'augment'], ['c', 'd', 'train'], ['d', 'h'], ['e', 'f'], ['f', 'g'], ['g', 'd', 'score'], ['h', 'i', 'log']],
    },
  },
  {
    n: '02', name: 'AcreSense', year: '2026', role: 'SatVision · Drones',
    note: 'Satellite-mapped farm plots into dock-aware drone spray missions',
    url: 'https://github.com/rajj28/acresense',
    live: 'https://acresense.fly.dev/',
    tagline: 'Satellite-mapped farm plots → variable-rate spray plans → dock-aware drone missions.',
    summary: 'AcreSense turns a farm boundary traced on satellite imagery into a complete, executable spray mission. It measures the real plot, zones it by crop health, doses chemical by need instead of uniformly, and splits the work into sorties that account for auto-docking, battery swaps and tank capacity.',
    why: 'Small agricultural drones cannot carry enough payload for a large plot in one flight, and the ground turnaround — not the flying — becomes the bottleneck: a 3-acre plot on a 3-litre tank takes 19 dock cycles. The plan has to treat docking as part of the mission, not an afterthought.',
    where: [
      'Agricultural spray operators running field-scale precision application',
      'Drone service providers planning multi-sortie missions per plot',
      'Demonstrated on two 3-acre plots in Maharashtra — Kolhapur (via ISRO Bhuvan) and riverside sugarcane',
    ],
    how: [
      'Trace the plot on a satellite image; the shoelace formula gives its geometry.',
      'Calibrate the scale against the land-record area.',
      'Zone crop health from RGB pixels with the Excess Green index.',
      'Build a variable-rate dosing plan and a serpentine coverage path.',
      'Split the path into sorties within tank and battery limits, dock cycles included.',
    ],
    results: [
      { v: '57.4%', l: 'Chemical saved · Kolhapur plot' },
      { v: '57.8%', l: 'Chemical saved · riverside plot' },
      { v: '19', l: 'Sorties · 80.6 min total' },
    ],
    stack: ['Python', 'Flask', 'Computer vision', 'pytest', 'Docker', 'Fly.io'],
    diagram: {
      alt: 'A satellite trace becomes field geometry, is scale-calibrated and zoned for crop health, then turned into a dosing plan, a serpentine coverage path, sortie splits, and finally a drone mission with dock cycles.',
      nodes: [
        ['a', 'Satellite trace', 'plot boundary', 'io', 0, 0],
        ['b', 'Field geometry', 'shoelace area', 'step', 1, 0],
        ['c', 'Scale check', 'vs land record', 'step', 2, 0],
        ['d', 'Health zones', 'Excess Green · RGB', 'model', 3, 0],
        ['e', 'Dosing plan', 'variable-rate', 'step', 3, 1],
        ['f', 'Coverage path', 'serpentine', 'step', 2, 1],
        ['g', 'Sortie split', 'tank · battery', 'step', 1, 1],
        ['h', 'Drone mission', 'with dock cycles', 'io', 0, 1],
      ],
      edges: [['a', 'b'], ['b', 'c'], ['c', 'd'], ['d', 'e'], ['e', 'f'], ['f', 'g'], ['g', 'h']],
    },
  },
  {
    n: '03', name: 'Policy RAG', year: '2024', role: 'Pinecone · LangChain',
    note: 'Production RAG across Insurance, Legal, HR and Compliance corpora',
    url: 'https://github.com/rajj28/query-retrieval-using-RAG-pinecone-gpt-40-min',
    tagline: 'Multi-domain document processing and query retrieval, built for production.',
    summary: 'A retrieval-augmented generation system that ingests long, dense documents — insurance policies, contracts, HR handbooks, compliance and medical policies — and answers questions about them with domain-aware context. It combines semantic and keyword search, re-ranks what it finds, generates the answer with GPT-4, and caches hot answers to stay fast.',
    why: 'The answer to “am I covered for this?” sits deep inside documents nobody reads end to end. Keyword search misses paraphrases and pure vector search misses exact clauses, so the system runs both, then lets the model compose an answer grounded in the passages it retrieved.',
    where: [
      'Insurance policy Q&A — tested on ICICI Lombard, HDFC Ergo and National Parivar Mediclaim documents',
      'Legal contracts and agreements',
      'HR handbooks, compliance and financial documentation',
    ],
    how: [
      'An intelligent processor parses and chunks each document.',
      'Chunks are dual-indexed: vectors in Pinecone, metadata in SQLite.',
      'Questions are expanded, then run through hybrid semantic + keyword search.',
      'Results are re-ranked and GPT-4 writes the answer; repeat questions come from the Redis cache.',
    ],
    results: [
      { v: '80%+', l: 'Accuracy across insurance domains' },
      { v: '<5s', l: 'Response time with caching' },
    ],
    stack: ['FastAPI', 'GPT-4', 'Pinecone', 'Redis', 'SQLite', 'Python 3.11'],
    diagram: {
      alt: 'Documents are processed and dual-indexed. A question is expanded, run through hybrid search against the index, re-ranked, and answered by GPT-4, with answers cached.',
      nodes: [
        ['a', 'Documents', 'policies · contracts', 'io', 0, 0],
        ['b', 'Doc processor', 'parse · chunk', 'step', 1, 0],
        ['c', 'Dual index', 'Pinecone + SQLite', 'store', 2, 0],
        ['j', 'Answer', 'Redis-cached', 'io', 4, 0],
        ['e', 'Question', 'plain language', 'io', 0, 1],
        ['f', 'Query expansion', 'domain terms', 'step', 1, 1],
        ['g', 'Hybrid search', 'semantic + keyword', 'step', 2, 1],
        ['h', 'Re-rank', 'best passages', 'step', 3, 1],
        ['i', 'GPT-4', 'grounded answer', 'model', 4, 1],
      ],
      edges: [['a', 'b'], ['b', 'c', 'index'], ['e', 'f'], ['f', 'g'], ['c', 'g', 'retrieve'], ['g', 'h'], ['h', 'i'], ['i', 'j']],
    },
  },
  {
    n: '04', name: 'Drone Fleet AI', year: '2025', role: 'Multi-Agent · Python',
    note: 'LangGraph agents — perception, planning and execution in one fleet',
    url: 'https://github.com/rajj28/Autonomous-Drone-Fleet-Coordinator-Multi-Agent-System',
    tagline: 'A multi-agent drone fleet coordinator where model confidence never gates autonomy on its own.',
    summary: 'Specialised agents — perception, planning and execution — share one state graph in LangGraph. Every plan is checked against deterministic safety rules, relevant operating procedures are retrieved for the planner, and anything unsafe is routed to a human before a drone moves. A precision-spray module plans variable-rate fertiliser runs with serpentine flight paths.',
    why: 'A real LLM planner (Llama 3.3 70B) returned confident, well-formed JSON for plainly unsafe missions — 14% battery, anomalies near restricted zones — and no schema validation caught it. So safety is evaluated outside the planner, on the telemetry itself, and it can only ever lower confidence.',
    where: [
      'Coordinating autonomous drone fleets where an unsafe plan must never execute unchecked',
      'Precision agricultural spraying on Maharashtra 7/12 land-record plots',
      'Any agentic system that needs a human-in-the-loop gate for low-confidence actions',
    ],
    how: [
      'Telemetry flows into the perception agent.',
      'The planner (Llama 3.3 70B on Groq, or gpt-4o-mini) drafts a mission with SOP context from a TF-IDF store.',
      'A deterministic safety envelope re-scores it against the telemetry and clamps confidence.',
      'At 0.6 or above it executes; below that, a human reviews it first.',
    ],
    results: [
      { v: '57.4%', l: 'Fertiliser saved vs uniform spraying' },
      { v: '57.8%', l: 'Saved on the second 3-acre plot' },
    ],
    stack: ['LangGraph', 'Python', 'Llama 3.3 70B · Groq', 'gpt-4o-mini', 'TF-IDF', 'Flask', 'Fly.io'],
    diagram: {
      alt: 'Telemetry feeds perception, then an LLM planner that also reads operating procedures. A deterministic safety envelope sends confident plans straight to execution and low-confidence ones to human review first.',
      nodes: [
        ['a', 'Telemetry', 'battery · position', 'io', 0, 0],
        ['b', 'Perception', 'agent', 'step', 1, 0],
        ['c', 'Planner', 'Llama 3.3 70B', 'model', 2, 0],
        ['d', 'Safety envelope', 'deterministic rules', 'step', 3, 0],
        ['e', 'Execution', 'agent', 'io', 4, 0],
        ['f', 'SOP store', 'TF-IDF retrieval', 'store', 2, 1],
        ['g', 'Human review', 'low confidence', 'step', 4, 1],
      ],
      edges: [['a', 'b'], ['b', 'c'], ['f', 'c', 'SOPs'], ['c', 'd'], ['d', 'e', '≥ 0.6'], ['d', 'g', '< 0.6'], ['g', 'e', 'approve']],
    },
  },
  {
    n: '05', name: 'DocPilot', year: '2026', role: 'LangGraph · RAG',
    note: 'RAG browser extension — streaming summaries and semantic follow-ups',
    url: 'https://github.com/rajj28/DocPilot',
    tagline: 'A browser extension that summarises documentation pages and answers follow-ups with RAG.',
    summary: 'DocPilot is a Chrome extension that summarises the page you are reading in real time, streaming the answer as it is written. It classifies the page (docs, API reference, blog, README), chunks it by headings, embeds the chunks for semantic search, and answers follow-up questions from the page’s own content — on a local LLM, so the page never leaves your machine.',
    why: 'Documentation is long, and the one answer you need is usually three headings deep. DocPilot brings that answer to the page you are already on, instead of a separate chat window that has no idea what you are reading.',
    where: [
      'Developers working through API references and library docs',
      'Onboarding onto an unfamiliar codebase through its READMEs',
      'Anyone skimming a long technical post for the part that matters',
    ],
    how: [
      'A content script captures the page and opens the React overlay.',
      'The extension streams to a FastAPI backend over SSE, where a LangGraph agent classifies the page and chunks it by headings.',
      'Chunks are embedded with HuggingFace and stored in Pinecone.',
      'Ollama summarises each chunk and merges the result, streaming tokens back; follow-ups use semantic search.',
    ],
    results: [],
    stack: ['FastAPI', 'LangGraph', 'Ollama', 'HuggingFace embeddings', 'Pinecone', 'React', 'TypeScript', 'Chrome extension'],
    diagram: {
      alt: 'A documentation page is captured by the extension and streamed over SSE to FastAPI. The agent classifies and chunks it, embeds the chunks into Pinecone, summarises with a local Ollama model, merges, and streams the answer back into the overlay.',
      nodes: [
        ['a', 'Docs page', 'any site', 'io', 0, 0],
        ['b', 'Extension', 'content script', 'step', 1, 0],
        ['c', 'FastAPI', 'LangGraph agent', 'step', 2, 0],
        ['d', 'Classify', 'docs · API · blog', 'step', 3, 0],
        ['e', 'Chunk', 'by headings', 'step', 4, 0],
        ['f', 'Embed & store', 'HF · Pinecone', 'store', 4, 1],
        ['g', 'Summarise', 'Ollama · local', 'model', 3, 1],
        ['h', 'Merge', 'one summary', 'step', 2, 1],
        ['i', 'Overlay', 'streamed answer', 'io', 1, 1],
      ],
      edges: [['a', 'b'], ['b', 'c', 'SSE'], ['c', 'd'], ['d', 'e'], ['e', 'f'], ['f', 'g'], ['g', 'h'], ['h', 'i']],
    },
  },
  {
    n: '06', name: 'RaceLab', year: '2026', role: 'CockroachDB · Agents',
    note: 'Memory-aware replies to DB serialization conflicts for AI agents',
    url: 'https://github.com/rajj28/racelab',
    live: 'https://racelab.fly.dev',
    extra: [{ label: 'Recorded demo', url: 'https://rajj28.github.io/racelab/' }],
    tagline: 'A conflict-aware transaction wrapper for AI agents — and the benchmark that is its evidence.',
    summary: 'When an agent reads state, reasons over it and writes a result, a concurrent transaction can change that state in between. RaceLab treats a serialisation failure as a sign that the agent’s reasoning went stale: it re-reads operational state and semantic memory, re-reasons, and retries. It is validated on CockroachDB across five experimental arms, 250 runs and 5,000 decisions.',
    why: 'READ COMMITTED lets invariants break silently. SERIALIZABLE catches the conflict with a 40001 error but says nothing about why the reasoning is stale — so agents simply replay the same decision. RaceLab makes the retry re-think instead of repeat.',
    where: [
      'Authorisation and allocation agents — refund caps, spending limits, resource quotas',
      'Multi-agent systems sharing state under concurrent writes',
      'Policy-constrained decisions where the limit lives both in a column and in retrieved text',
    ],
    how: [
      'The agent retrieves the relevant policy from a vector index — its semantic memory.',
      'It reads the operational state it must stay within.',
      'Claude Sonnet 4.5 on Bedrock proposes an action; the write runs with a guardrail inside the transaction.',
      'On a 40001 the wrapper re-reads memory and state and the agent reasons again.',
    ],
    results: [
      { v: '0 / 50', l: 'Runs over the hard limit — vs 45/50 and 48/50 for naive agents' },
      { v: '95%', l: 'Agreement with the deterministic reference (57/60)' },
      { v: '5,000', l: 'Decisions across 250 runs' },
    ],
    stack: ['CockroachDB', 'PostgreSQL', 'Python', 'Claude Sonnet 4.5 · Bedrock', 'Titan Embeddings V2', 'AWS Lambda', 'Hypothesis'],
    diagram: {
      alt: 'An agent reads policy memory and operational state, reasons with Claude, and writes inside a guarded CockroachDB transaction. A successful write commits; a 40001 conflict sends it through the conflict wrapper to re-read state and reason again.',
      nodes: [
        ['a', 'Agent', 'allocation request', 'io', 0, 0],
        ['b', 'Policy memory', 'vector index', 'store', 1, 0],
        ['c', 'State read', 'aggregate spend', 'step', 2, 0],
        ['d', 'Reason', 'Claude Sonnet 4.5', 'model', 3, 0],
        ['e', 'Guarded write', 'CockroachDB txn', 'store', 4, 0],
        ['g', 'Conflict wrapper', 'on 40001', 'step', 2, 1],
        ['f', 'Commit', 'invariant holds', 'io', 4, 1],
      ],
      edges: [['a', 'b'], ['b', 'c'], ['c', 'd'], ['d', 'e'], ['e', 'f', 'ok'], ['e', 'g', '40001'], ['g', 'c', 're-read']],
    },
  },
  {
    n: '07', name: 'AWS Fraud Shield', year: '2025', role: 'AWS · Next.js',
    note: 'Multi-modal call, vKYC and transaction fraud detection',
    url: 'https://github.com/rajj28/I-hack-esummit-2025',
    tagline: 'Real-time fraud detection across calls, video KYC and transactions.',
    summary: 'Three detectors behind one alerting pipeline on AWS. Suspicious calls are flagged from their transcripts with NLP, manipulated faces are caught in video KYC, and transaction streams are watched for anomalies — all on managed services, so it scales and stays privacy-compliant.',
    why: 'Financial fraud rarely arrives through one channel: a scam call, a spoofed video verification and an odd transaction can be the same attack. Watching all three in one system catches what a single-channel detector misses.',
    where: [
      'Bank and fintech contact centres screening inbound calls',
      'Video KYC onboarding flows',
      'Transaction-monitoring teams',
    ],
    how: [
      'Calls arrive through Amazon Connect and Lambda runs the call analysis.',
      'Transcribe turns speech to text and Comprehend scores it for fraud signals.',
      'Rekognition checks video KYC for manipulated faces.',
      'Transactions run through anomaly-detection models; findings land in DynamoDB and raise alerts in CloudWatch.',
    ],
    results: [],
    stack: ['Python', 'AWS Lambda', 'Amazon Connect', 'Transcribe', 'Comprehend', 'Rekognition', 'DynamoDB', 'CloudFormation'],
    diagram: {
      alt: 'Calls go through Amazon Connect, Transcribe and Comprehend; video KYC through Rekognition; transactions through an anomaly model. All three feed a Lambda and DynamoDB fraud engine that raises alerts.',
      nodes: [
        ['a', 'Incoming call', 'voice', 'io', 0, 0],
        ['b', 'Amazon Connect', 'Lambda', 'step', 1, 0],
        ['c', 'Transcribe', 'speech → text', 'step', 2, 0],
        ['d', 'Comprehend', 'NLP signals', 'model', 3, 0],
        ['e', 'Video KYC', 'onboarding', 'io', 0, 1],
        ['f', 'Rekognition', 'face checks', 'model', 1, 1],
        ['i', 'Fraud engine', 'Lambda · DynamoDB', 'store', 3, 1],
        ['x', 'Alerts', 'CloudWatch', 'io', 4, 1],
        ['g', 'Transactions', 'stream', 'io', 0, 2],
        ['h', 'Anomaly model', 'ML', 'model', 1, 2],
      ],
      edges: [['a', 'b'], ['b', 'c'], ['c', 'd'], ['d', 'i'], ['e', 'f'], ['f', 'i'], ['g', 'h'], ['h', 'i'], ['i', 'x']],
    },
  },
  {
    n: '08', name: 'Drone Sentry', year: '2026', role: 'FastAPI · Gemini',
    note: 'Drone surveillance video to threat alerts — FastAPI API and React dashboard',
    url: 'https://github.com/rajj28/drone-security-agent',
    live: 'https://drone-security-agent.fly.dev/',
    extra: [{ label: 'API docs', url: 'https://drone-security-agent.fly.dev/docs' }],
    tagline: 'Drone surveillance video in — threat alerts and answers out.',
    summary: 'An autonomous security analyst for drone footage. It extracts the frames that matter, analyses them with Gemini vision, classifies threats on a five-level severity scale with rule-based escalation, and indexes every frame so the footage can be questioned in plain language. All of it is exposed through a REST API and a React dashboard.',
    why: 'Hours of drone footage are more than any security team can watch. Picking out the frames worth looking at — and letting people question the footage directly — turns video into alerts and answers instead of a backlog.',
    where: [
      'Security operations centres reviewing drone patrols',
      'Facility and perimeter monitoring',
      'Physical-security teams that need searchable footage',
    ],
    how: [
      'Hybrid frame extraction — motion, scene change and uniform sampling.',
      'Two-stage Gemini 2.5 analysis, Flash then Pro, describes each frame.',
      'The alert engine classifies threats on a five-level scale and escalates by rule.',
      'Frames are embedded into Pinecone and a Q&A agent answers questions, with session context kept in MongoDB.',
    ],
    results: [],
    stack: ['FastAPI', 'OpenCV', 'FFmpeg', 'Gemini 2.5', 'CLIP · BLIP', 'Pinecone', 'MongoDB', 'React 19'],
    diagram: {
      alt: 'Drone video is reduced to key frames, analysed by Gemini, and scored by an alert engine for the dashboard. Frames are also indexed in Pinecone so a Q&A agent can answer questions about the footage.',
      nodes: [
        ['a', 'Drone video', 'upload', 'io', 0, 0],
        ['b', 'Frame extractor', 'motion · scene', 'step', 1, 0],
        ['c', 'Gemini vision', '2.5 Flash → Pro', 'model', 2, 0],
        ['d', 'Alert engine', '5-level severity', 'step', 3, 0],
        ['e', 'Dashboard', 'React · REST', 'io', 4, 0],
        ['f', 'Frame index', 'Pinecone', 'store', 2, 1],
        ['g', 'Q&A agent', 'session memory', 'model', 3, 1],
        ['h', 'Your question', 'plain language', 'io', 3, 2],
      ],
      edges: [['a', 'b'], ['b', 'c'], ['c', 'd'], ['d', 'e', 'alerts'], ['c', 'f', 'embed'], ['f', 'g'], ['h', 'g', 'ask'], ['g', 'e', 'answer']],
    },
  },
  {
    n: '09', name: 'Tables that Read', year: '2024', role: 'Fine-Tuning · Docs',
    note: 'Fine-tuning LayoutLMv3 on 10-K filings and invoices',
    url: 'https://github.com/rajj28/Fine-tuning-LayoutLMv3-for-Financial-Document-Table-Structure-Recognition',
    tagline: 'Fine-tuning LayoutLMv3 to read the structure of financial tables.',
    summary: 'Fine-tunes microsoft/layoutlmv3-base to classify cell-level structure in 10-K filings and invoices — cells, merged headers, row groups and numeric fields. It reads the text, the layout and the page image together, trained in two stages: vision frozen first so text and layout converge, then every stream refined jointly.',
    why: 'Financial tables break the assumptions of sequence labelling: a merged header governs a rectangle of the grid, not a span of text, and the same “1,234” means different things in different cells. A text-only model cannot see the geometry that settles it; a layout-aware one can.',
    where: [
      'Processing SEC 10-K filings at scale',
      'Invoice extraction and accounts-payable automation',
      'Any pipeline that has to turn financial tables into structured data',
    ],
    how: [
      'The page image becomes patch embeddings — the vision stream.',
      'OCR words are tokenised (text stream) and their boxes become 2-D positions (layout stream).',
      'A 12-layer multimodal transformer fuses all three.',
      'A token-classification head emits BIO structure labels for every token.',
    ],
    results: [
      { v: '91.2%', l: 'Token accuracy — vs 41.3% OCR baseline' },
      { v: '0.93', l: 'Macro F1 — vs 0.12 baseline' },
    ],
    stack: ['LayoutLMv3', 'PyTorch', 'Hugging Face Transformers', 'Python', 'Arrow · Parquet'],
    diagram: {
      alt: 'The page image, OCR words and bounding boxes become vision, text and layout streams that a 12-layer LayoutLMv3 transformer fuses; a token classifier then emits BIO structure labels.',
      nodes: [
        ['a', 'Page image', '10-K · invoice', 'io', 0, 0],
        ['b', 'Vision stream', 'patch embeddings', 'step', 1, 0],
        ['c', 'OCR words', 'text', 'io', 0, 1],
        ['d', 'Text stream', 'WordPiece', 'step', 1, 1],
        ['e', 'Bounding boxes', 'geometry', 'io', 0, 2],
        ['f', 'Layout stream', '2-D positions', 'step', 1, 2],
        ['m', 'LayoutLMv3', '12 layers · 768', 'model', 2, 1],
        ['k', 'Token classifier', 'fine-tuned head', 'step', 3, 1],
        ['l', 'Structure labels', 'BIO · 9 classes', 'io', 4, 1],
      ],
      edges: [['a', 'b'], ['c', 'd'], ['e', 'f'], ['b', 'm'], ['d', 'm'], ['f', 'm'], ['m', 'k'], ['k', 'l']],
    },
  },
]

/* Oldest first, so the glint that runs down the timeline arrives at Now.
   `project` links an entry to its case study on the laptop (a PROJECTS index). */
const EXPERIENCE = [
  {
    company: 'NPCI', role: 'Intern — SafePay AI, agentic fraud detection', years: '2024 — 2025', kind: 'Internship',
    desc: 'GAN-augmented fraud detection for UPI-scale payments — 97.09% test accuracy, and first place at DigiPay Pro (NPCI), IIT Bombay Techfest 2024.',
    project: 0,
  },
  {
    company: 'Concentrix', role: 'Associate, Agentic AI', years: '2025 — Now', kind: 'Industry', now: true,
    desc: 'Building agentic AI systems — the point where models stop being demos and become product.',
  },
]

/* The selected work, shown as short paragraphs in the empty right of the
   statue's frame in both the desk and the eat sections — each one a real
   project with a real video, running on their own scroll so the rail reads
   one at a time, never together. The desk gets the first pair, the eat gets
   the second; Provenance is the ongoing one. */
const SELECTED_WORK = [
  {
    title: 'Dependency blast-radius simulator',
    summary:
      'Simulating the blast radius of any package upgrade — shortest paths through an ecosystem graph, so one version bump never silently takes down the tree downstream.',
    yt: 'hyqz20b1COI',
    duration: '12:42',
    github: 'https://github.com/rajj28/dependency-blast-radius-simulator',
  },
  {
    title: 'Flytbase — autonomous drone flights',
    summary:
      'Autonomous flights that route, run and recover on their own — a fleet deciding in minutes instead of meetings, no pilot in the loop.',
    yt: 'OA2W3X6HQvo',
    duration: '5:00',
    github: 'https://github.com/rajj28/Autonomous-Drone-Fleet-Coordinator-Multi-Agent-System',
  },
  {
    title: 'Zerve AI — what is long-term success?',
    summary:
      'Why an AI company compounds from systems, not launches — a thinking-in-public walk through what actually outlives the demo.',
    yt: 'pumh8hjkHUc',
    duration: '5:47',
    github: 'https://github.com/rajj28/racelab',
  },
  {
    title: 'Provenance',
    ongoing: true,
    summary:
      'A portfolio that keeps itself current from verifiable evidence. No invented metrics.',
    github: 'https://github.com/rajj28/provenance',
  },
]

/* One entry per project: a video preview, a proper title, a couple of lines
   of summary and plain links. Shared by the desk and eat rails so both read
   the same way. The drivers run the pieces one at a time — each brief fades
   in on its own stretch of scroll, vanishes as the next fades in to take its
   place — so `data-step` runs 0, 1, … inside each rail. */
function WorksList({ items }) {
  return (
    <>
<div className="eat__works-head" data-step="head">
        <p className="eat__works-eyebrow">Selected work</p>
        <h3 className="eat__works-title">Watch it running.</h3>
        <div className="eat__works-rule" aria-hidden="true">
          <i className="eat__works-prog" />
        </div>
      </div>
      <div className="works">
        {items.map((w, i) => (
          <article className="works__item" key={w.title} data-step={i}>
            {w.yt && (
              <a
                className="works__preview"
                data-cursor="Play"
                href={`https://www.youtube.com/watch?v=${w.yt}`}
                target="_blank"
                rel="noreferrer"
                aria-label={'Watch ' + w.title}
              >
                <img
                  src={`https://i.ytimg.com/vi/${w.yt}/hqdefault.jpg`}
                  alt=""
                  loading="lazy"
                />
                <span className="works__play" aria-hidden="true">&#9654;</span>
                {w.duration && <span className="works__len">{w.duration}</span>}
              </a>
            )}
            <p className="works__no">No. {String(i + 1).padStart(2, '0')}</p>
            <h4 className="works__item-title">{w.title}</h4>
          <p className="works__item-summary">{w.summary}</p>
          <p className="works__item-links">
            {w.yt && (
              <a
                href={`https://www.youtube.com/watch?v=${w.yt}`}
                target="_blank"
                rel="noreferrer"
              >
                Watch video <span aria-hidden="true">&#8599;</span>
              </a>
            )}
            <a href={w.github} target="_blank" rel="noreferrer">
              GitHub <span aria-hidden="true">&#8599;</span>
            </a>
            {w.ongoing && <span className="works__tag">ongoing</span>}
          </p>
        </article>
        ))}
      </div>
    </>
  )
}

/* A system diagram, drawn from a project's small grid spec so every case
   study shares one visual grammar: boxes on a grid, curved wires between
   them, a dot of blue travelling each wire in the direction data moves.
   Kinds read at a glance — dashed for what goes in and comes out, blue for
   models, gold for stores, plain for services. */
/* The gap between columns is wider than the longest wire label, so a label
   never has to sit on top of a box. */
const DG = { col: 168, row: 88, w: 124, h: 52, pad: 16 }

function Diagram({ spec }) {
  const nodes = spec.nodes.map(([id, label, sub, kind, c, r]) => ({
    id, label, sub, kind, c, r, x: DG.pad + c * DG.col, y: DG.pad + r * DG.row,
  }))
  const at = Object.fromEntries(nodes.map((n) => [n.id, n]))
  const cols = Math.max(...nodes.map((n) => n.c)) + 1
  const rows = Math.max(...nodes.map((n) => n.r)) + 1
  const W = DG.pad * 2 + (cols - 1) * DG.col + DG.w
  const H = DG.pad * 2 + (rows - 1) * DG.row + DG.h

  /* Each wire leaves the side of its box that faces the target: across for a
     change of column, down or up within one. */
  const wires = spec.edges.map(([a, b, label]) => {
    const s = at[a]
    const t = at[b]
    if (s.c === t.c) {
      const down = t.r > s.r
      const x1 = s.x + DG.w / 2
      const x2 = t.x + DG.w / 2
      const y1 = down ? s.y + DG.h : s.y
      const y2 = down ? t.y : t.y + DG.h
      const my = (y1 + y2) / 2
      return {
        label, lx: x1 + 6, ly: my + 3, anchor: 'start',
        d: `M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2 + (down ? -3 : 3)}`,
      }
    }
    const right = t.c > s.c
    const x1 = right ? s.x + DG.w : s.x
    const x2 = right ? t.x : t.x + DG.w
    const y1 = s.y + DG.h / 2
    const y2 = t.y + DG.h / 2
    const mx = (x1 + x2) / 2
    return {
      label, lx: mx, ly: (y1 + y2) / 2 - 7, anchor: 'middle',
      d: `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2 + (right ? -3 : 3)},${y2}`,
    }
  })

  return (
    <figure className="dg">
      <div className="dg__scroll">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={spec.alt} style={{ width: '100%', maxWidth: W * 1.1, minWidth: W * 0.74 }}>
          <defs>
            <marker id="dg-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L8,4 L0,8 Z" />
            </marker>
          </defs>
          {wires.map((w, i) => (
            <g key={i}>
              <path d={w.d} className="dg__wire" markerEnd="url(#dg-arrow)" />
              <path d={w.d} className="dg__flow" style={{ animationDelay: -(i * 0.37) + 's' }} />
            </g>
          ))}
          {nodes.map((n) => (
            <g key={n.id} className={'dg__node dg__node--' + n.kind} transform={`translate(${n.x},${n.y})`}>
              <rect width={DG.w} height={DG.h} rx="11" />
              {n.kind === 'store' && <path d={`M12,9 H${DG.w - 12}`} className="dg__store-line" />}
              <text x={DG.w / 2} y={n.sub ? 23 : 30} className="dg__label">{n.label}</text>
              {n.sub && <text x={DG.w / 2} y={39} className="dg__sub">{n.sub}</text>}
            </g>
          ))}
          {/* labels last, so nothing is ever drawn over them */}
          {wires.map((w, i) => w.label && (
            <text key={i} x={w.lx} y={w.ly} className="dg__elabel" style={{ textAnchor: w.anchor }}>{w.label}</text>
          ))}
        </svg>
      </div>
      <figcaption className="dg__legend">
        <span><i className="k-io" /> In / out</span>
        <span><i className="k-model" /> Model</span>
        <span><i className="k-store" /> Data store</span>
        <span><i /> Service</span>
        <span className="dg__hint">Swipe the diagram &rarr;</span>
      </figcaption>
    </figure>
  )
}

/* The window a folder opens: a full case study. All three lights work —
   red and yellow put it away, green zooms it — the arrows (or ← →) page
   through the projects, and Esc closes. Its body scrolls on its own; the
   data-lenis-prevent keeps the wheel from also driving the page. */
function CaseStudy({ index, onClose, onStep }) {
  const p = PROJECTS[index]
  const win = useRef(null)
  const [max, setMax] = useState(false)

  useEffect(() => { win.current?.focus({ preventScroll: true }) }, [])

  useEffect(() => {
    const key = (e) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') onStep(1)
      else if (e.key === 'ArrowLeft') onStep(-1)
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [onClose, onStep])

  return (
    <div
      className={'win' + (max ? ' is-max' : '')}
      role="dialog"
      aria-labelledby="cs-title"
      tabIndex={-1}
      ref={win}
    >
      <div className="win__bar">
        <div className="win__dots">
          <button type="button" className="win__close" aria-label="Close" onClick={onClose} />
          <button type="button" className="win__min" aria-label="Minimise" onClick={onClose} />
          <button type="button" className="win__max" aria-label={max ? 'Restore size' : 'Zoom'} onClick={() => setMax((m) => !m)} />
        </div>
        <div className="win__title">{p.name} — case study</div>
        <div className="win__nav">
          <button type="button" aria-label="Previous project" onClick={() => onStep(-1)}>&#8249;</button>
          <span>{p.n} / {String(PROJECTS.length).padStart(2, '0')}</span>
          <button type="button" aria-label="Next project" onClick={() => onStep(1)}>&#8250;</button>
        </div>
      </div>

      <div className="win__scroll" data-lenis-prevent>
        <header className="cs__head">
          <div>
            <p className="cs__kicker">No. {p.n} &middot; {p.year}</p>
            <h3 className="cs__title" id="cs-title">{p.name}</h3>
            <p className="cs__tagline">{p.tagline}</p>
          </div>
          <div className="cs__links">
            {p.live && (
              <a className="cs__btn cs__btn--primary" href={p.live} target="_blank" rel="noreferrer" data-cursor="Visit">
                Live demo <span aria-hidden="true">&#8599;</span>
              </a>
            )}
            {p.extra?.map((x) => (
              <a key={x.url} className="cs__btn" href={x.url} target="_blank" rel="noreferrer" data-cursor="Visit">
                {x.label} <span aria-hidden="true">&#8599;</span>
              </a>
            ))}
            <a
              className={'cs__btn' + (p.live ? '' : ' cs__btn--primary')}
              href={p.url}
              target="_blank"
              rel="noreferrer"
              data-cursor="Code"
            >
              GitHub <span aria-hidden="true">&#8599;</span>
            </a>
          </div>
        </header>

        <section className="cs__how" aria-label="How it works">
          <p className="cs__label">How it works</p>
          <Diagram spec={p.diagram} />
          <ol className="cs__steps">
            {p.how.map((s) => <li key={s}>{s}</li>)}
          </ol>
        </section>

        <div className="cs__grid">
          <section>
            <p className="cs__label">What it is</p>
            <p>{p.summary}</p>
          </section>
          <section>
            <p className="cs__label">Why it exists</p>
            <p>{p.why}</p>
          </section>
          <section>
            <p className="cs__label">Where it&rsquo;s used</p>
            <ul>{p.where.map((w) => <li key={w}>{w}</li>)}</ul>
          </section>
        </div>

        <div className={'cs__foot' + (p.results.length ? '' : ' cs__foot--solo')}>
          {p.results.length > 0 && (
            <section className="cs__proof">
              <p className="cs__label">Proof</p>
              <ul>
                {p.results.map((r) => (
                  <li key={r.l}><strong>{r.v}</strong><span>{r.l}</span></li>
                ))}
              </ul>
            </section>
          )}
          <section className="cs__stack">
            <p className="cs__label">Stack</p>
            <ul>{p.stack.map((s) => <li key={s}>{s}</li>)}</ul>
          </section>
        </div>
      </div>
    </div>
  )
}

/* The laptop's menu-bar clock — his, in Pune, not a stock 9:41. */
function MenuClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 20000)
    return () => clearInterval(id)
  }, [])
  return (
    <span className="mac__menu-end">
      {now.toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })}
    </span>
  )
}

/* `closed` is owned by App rather than by Desk: the button sets it, but the
   scroll driver is what clears it again when you leave the screen, so that
   coming back down a second time does not find the window already gone. */
function Desk() {
  const [sel, setSel] = useState(null)

  /* Other chapters can open a case study here — the experience timeline's
     "Read the case study" does, as the page cuts to the laptop. */
  useEffect(() => {
    const open = (e) => setSel(e.detail)
    window.addEventListener('open-project', open)
    return () => window.removeEventListener('open-project', open)
  }, [])
  return (
    <section className="desk" data-tone="light">
      <div className="desk__pin">
        <div className="god">
          <video
            className="god__video"
            src={godSrc}
            muted
            playsInline
            preload="auto"
            aria-label="A seated statue catches the falling apple in an open hand, and the camera moves around behind him to look down at his laptop"
          />
        </div>

        {/* The selected work, in the empty right of the statue's frame the
            same way the eat section uses it. A dark glass panel so it holds its
            reading on the bone of the statue and on the blue of the desktop,
            before and after the camera moves in; each piece arrives on its own
            stretch of the section's scroll. */}
        <div className="desk__works" aria-label="Selected work">
          <WorksList items={SELECTED_WORK.slice(0, 2)} />
        </div>

        {/* The screen. It starts life pinned exactly over the glass in the
            video above and dead dark, the way the footage leaves it. The
            camera arrives, the machine wakes, and only then does the driver
            grow that rectangle out to fill the page. */}
        <div className="mac">
          <div className="mac__frame">
            <div className="mac__desk">
              {/* Everything the machine shows once it is awake. Wrapped so the
                  reveal can fade it without fading the boot screen sitting on
                  top of it — they live in the same box, which is what keeps
                  the mark centred on the glass and not on the viewport. */}
              <div className="mac__screen">
              <div className="mac__wall" />

              <div className="mac__menu">
                <span className="mac__logo" aria-hidden="true"></span>
                <strong>Finder</strong>
                <span>File</span><span>Edit</span><span>View</span><span>Go</span>
                <MenuClock />
              </div>

              {/* Finder-style desktop: every project is a folder. Clicking one
                  opens its detail window. */}
              <div className="folders" aria-label="Projects">
                {PROJECTS.map((p, i) => (
                  <button
                    key={p.n}
                    type="button"
                    className="folder"
                    data-cursor="Open"
                    aria-label={p.name + ' — ' + p.note}
                    onClick={() => setSel(i)}
                  >
                    <span className="folder__icon" aria-hidden="true">
                      <i className="folder__tab" />
                      <i className="folder__body" />
                    </span>
                    <span className="folder__name">{p.name}</span>
                  </button>
                ))}
              </div>

              {sel !== null && (
                <CaseStudy
                  key={sel}
                  index={sel}
                  onClose={() => setSel(null)}
                  onStep={(d) => setSel((s) => (s + d + PROJECTS.length) % PROJECTS.length)}
                />
              )}
              </div>

              {/* The wake. Sits over the desktop and hides it until the
                  machine has finished starting: dark glass, then a mark, then
                  the bar under it, then the bloom as the backlight comes up.

                  The mark is the site's own, not Apple's. This is his machine
                  and it is the same seed the page opened on — borrowing another
                  company's logo here would say less and mean less. */}
              <div className="mac__boot" aria-hidden="true">
                <img className="mac__boot-mark" src={treeSrc} alt="" />
                <div className="mac__boot-bar"><i /></div>
                <div className="mac__boot-flash" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* He eats it.

   The clip is the generated one trimmed at frame 122 — the whole arm-fold and
   the bite, stopping one frame before the render's own sparkles start. Its
   first frame is the frame the desk retreats to, so the two dissolve into each
   other as the same picture.

   The sparkles are not in the footage. The render threw them sideways into the
   empty right of the frame, which is both wrong and unfixable in post, and
   they are exactly the sort of thing code should own anyway: they have to fall
   from a particular point, at a particular speed, and run backwards when you
   scroll back up. They are drawn as the site's own four-point glint — the same
   path the hero and the reel use at their grid crossings. */
function Eat() {
  return (
    <section className="eat" data-tone="light">
      <div className="eat__pin">
        <video
          className="eat__video"
          src={eatSrc}
          muted
          playsInline
          preload="auto"
          aria-label="The statue brings the apple to his mouth and bites it, still without looking up from the laptop"
        />
        <canvas className="eat__sparks" aria-hidden="true" />

        {/* The bite plays on the left of the frame; the right of the picture
            is empty space, and that is where the selected work lives — each
            card taking the section's own scroll as its cue to arrive, one
            after the other, so the rail fills as the bit plays on. */}
        <div className="eat__works" aria-label="Selected work">
          <WorksList items={SELECTED_WORK.slice(2)} />
        </div>
      </div>
    </section>
  )
}

/* The sky the sparkles fall through. A return to the blue the site opened
   on — the same dithered canvas — but this time with clouds that rise up out
   of the bottom as you scroll: one on the right, then another on the left,
   carrying the sparkles onward toward the ground the tree grows in. */
function Sky({ riseRef, onOpenProject }) {
  const list = useRef(null)
  const spine = useRef(null)

  /* The places are different heights, so an evenly spaced guess puts the
     glint between nodes. Measure instead: the spine runs from the first node
     to the last, and each place's --at is where its node actually sits along
     it — so the glint lights each one exactly as it arrives and comes to rest
     on Now. Re-measured whenever the list reflows (resize, fonts landing). */
  useEffect(() => {
    const ol = list.current
    const sp = spine.current
    if (!ol || !sp) return
    const place = () => {
      const items = [...ol.children]
      const ys = items.map((li) => {
        const node = li.querySelector('.xp__node')
        return li.offsetTop + (node ? node.offsetTop + node.offsetHeight / 2 : 0)
      })
      if (ys.length < 2) return
      const a = ys[0]
      const b = ys[ys.length - 1]
      sp.style.top = a + 'px'
      sp.style.bottom = 'auto'
      sp.style.height = Math.max(b - a, 1) + 'px'
      items.forEach((li, i) => li.style.setProperty('--at', String(b > a ? (ys[i] - a) / (b - a) : 0)))
    }
    place()
    const ro = new ResizeObserver(place)
    ro.observe(ol)
    return () => ro.disconnect()
  }, [])

  return (
    <section className="sky" data-tone="dark">
      <div className="sky__pin">
        <DitherSky riseRef={riseRef} />
        <div className="grid" aria-hidden="true">
          <i className="gv gv--l" />
          <i className="gv gv--r" />
          <i className="gh gh--t" />
          <i className="gh gh--b" />
          <span className="gx gx--bl"><Spark /></span>
          <span className="gx gx--br"><Spark /></span>
        </div>

        {/* The experience, set on the sky's own grid: the heading on the left,
            and on the right a timeline in a band of deeper blue, so the clouds
            rising behind it dim rather than fight the type. A glint runs down
            its spine and lights each place as it arrives, ending on Now. The
            driver writes --enter and --g on .xp from the clouds' rise. */}
        <div className="xp" aria-label="Experience">
          <div className="xp__head">
            <p className="xp__kicker rv" style={{ '--d': 0 }}>Experience</p>
            <h2 className="xp__title">
              <span className="rv-line"><span className="rvm" style={{ '--d': 0.04 }}>Where the work</span></span>
              <span className="rv-line"><em className="rvm" style={{ '--d': 0.09 }}>happened.</em></span>
            </h2>
            <p className="xp__intro rv" style={{ '--d': 0.14 }}>
              An internship in payments at NPCI, then agentic AI in production at Concentrix.
            </p>
            <dl className="xp__meta rv" style={{ '--d': 0.18 }}>
              <div><dt>Roles</dt><dd>{String(EXPERIENCE.length).padStart(2, '0')}</dd></div>
              <div><dt>Since</dt><dd>{EXPERIENCE[0].years.slice(0, 4)}</dd></div>
            </dl>
          </div>

          <div className="xp__panel">
            <div className="xp__track">
              <span className="xp__spine" aria-hidden="true" ref={spine}>
                <span className="xp__glint"><Spark /></span>
              </span>
              <ol className="xp__list" ref={list}>
                {EXPERIENCE.map((e, i) => (
                  <li
                    key={e.company}
                    className="xp__item rv"
                    style={{ '--d': 0.22 + i * 0.13, '--at': i / (EXPERIENCE.length - 1) }}
                  >
                    <i className="xp__node" aria-hidden="true" />
                    <p className="xp__years">
                      {e.now && <i className="fc__dot" aria-hidden="true" />}
                      {e.years}
                    </p>
                    <h3 className="xp__co">
                      <strong>{e.company}</strong>
                      <span className="xp__tag">{e.kind}</span>
                    </h3>
                    <p className="xp__role">{e.role}</p>
                    <p className="xp__desc">{e.desc}</p>
                    {e.project != null && (
                      <button type="button" className="xp__link" data-cursor="Open" onClick={() => onOpenProject(e.project)}>
                        Read the case study <span aria-hidden="true">&rarr;</span>
                      </button>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* The contact footer, typeset straight onto the bone.

   No card. The last page stands on the same hairline grid the first page
   draws — the gutter rules, the top rule, and the ground line the plant
   grows out of serving as the lower rule, with the site's four-point markers
   at its crossings. The contact column hangs off that grid the way the hero
   does, and the name is set once, enormous, under the ground: it rises out
   of it as the plant flowers, and thickens under the cursor (Fraunces is a
   variable font, so each letter's weight can follow the pointer).

   The driver owns the choreography. It sets `--frame` (the rules drawing
   in) and `--enter` (everything else) on `.fc` from the footer's scroll, and
   each piece staggers itself off `--enter` in CSS by its own `--d`. */
const CONTACT_EMAIL = 'ruturajsonkamble29@gmail.com'
const WORDMARK = ['Ruturaj', 'Sonkamble']

const wordmarkLine = (k) => {
  const offset = WORDMARK.slice(0, k).join('').length
  return [...WORDMARK[k]].map((ch, j) => (
    <span key={j} className="fc__ch rise" style={{ '--d': 0.3 + (offset + j) * 0.016 }}>{ch}</span>
  ))
}

function LocalTime() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 20000)
    return () => clearInterval(id)
  }, [])
  return (
    <>
      {now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })}
      <span className="fc__faint">IST</span>
    </>
  )
}

function Contact() {
  const band = useRef(null)
  const word = useRef(null)
  const copiedT = useRef(0)
  const [copied, setCopied] = useState(false)

  /* Fit the name to the band — measured rather than guessed, so it holds
     whatever the font, the width, or whether it breaks onto two lines (it
     does on a phone). A little headroom is left so the hover swell, which
     widens the letters it thickens, never pushes past the gutter rule. */
  useEffect(() => {
    const box = band.current
    const w = word.current
    if (!box || !w) return
    const fit = () => {
      w.style.fontSize = '100px'
      const r = w.getBoundingClientRect()
      if (r.width <= 0) return
      /* As wide as the band allows, but never taller than it, less the strip
         along its top — that binds on an ultrawide. The glyphs stand the CSS
         --lift (in em) above their line box, so that counts toward height. */
      const lift = parseFloat(getComputedStyle(w).getPropertyValue('--lift')) || 0
      const byWidth = (97 * box.clientWidth) / r.width
      const byHeight = (100 * (box.clientHeight - 40)) / (r.height + lift * 100)
      w.style.fontSize = Math.min(byWidth, byHeight) + 'px'
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(box)
    if (document.fonts) document.fonts.ready.then(fit)
    return () => ro.disconnect()
  }, [])

  /* The weight wave: letters near the pointer swell toward bold, falling
     off with distance, and ease back when it leaves. Every rect is read
     before any weight is written, so it never thrashes layout. */
  useEffect(() => {
    const el = word.current
    if (!el || !window.matchMedia('(hover: hover)').matches) return
    const chars = [...el.querySelectorAll('.fc__ch')]
    let raf = 0
    let px = 0
    const paint = () => {
      raf = 0
      const rects = chars.map((c) => c.getBoundingClientRect())
      rects.forEach((r, i) => {
        const d = (px - (r.left + r.width / 2)) / (r.height * 0.8)
        chars[i].style.fontVariationSettings = "'wght' " + Math.round(300 + 320 * Math.exp(-d * d))
      })
    }
    const move = (e) => {
      px = e.clientX
      if (!raf) raf = requestAnimationFrame(paint)
    }
    const leave = () => {
      cancelAnimationFrame(raf)
      raf = 0
      chars.forEach((c) => { c.style.fontVariationSettings = '' })
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerleave', leave)
    return () => {
      cancelAnimationFrame(raf)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerleave', leave)
    }
  }, [])

  useEffect(() => () => clearTimeout(copiedT.current), [])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL)
      setCopied(true)
      clearTimeout(copiedT.current)
      copiedT.current = setTimeout(() => setCopied(false), 1800)
    } catch {
      /* no clipboard access — the address itself is still a mailto link */
    }
  }

  return (
    <div className="fc">
      <div className="fc__frame" aria-hidden="true">
        <i className="fc__rule fc__rule--t" />
        <i className="fc__rule fc__rule--l" />
        <i className="fc__rule fc__rule--r" />
        <span className="fc__x fc__x--l"><Spark /></span>
        <span className="fc__x fc__x--r"><Spark /></span>
      </div>

      <div className="fc__col">
        <p className="fc__kicker in" style={{ '--d': 0 }}>Get in touch</p>

        <h2 className="fc__title">
          <span className="fc__line">
            <span className="w rise" style={{ '--d': 0.04 }}>Let&rsquo;s</span>{' '}
            <span className="w rise" style={{ '--d': 0.08 }}>grow</span>
          </span>
          <span className="fc__line">
            <em className="w rise" style={{ '--d': 0.12 }}>something.</em>
          </span>
        </h2>

        <p className="fc__lede in" style={{ '--d': 0.2 }}>
          A product, a role, or a hard problem worth solving &mdash; tell me about it.
        </p>

        <div className="fc__mail-row in" style={{ '--d': 0.27 }}>
          <a className="fc__mail" href={'mailto:' + CONTACT_EMAIL} data-cursor="Write">
            {CONTACT_EMAIL}
            <span aria-hidden="true">&#8599;</span>
          </a>
          <button
            type="button"
            className={'fc__copy' + (copied ? ' is-done' : '')}
            data-cursor="Copy"
            onClick={copy}
            aria-live="polite"
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        <dl className="fc__meta">
          <div className="in" style={{ '--d': 0.33 }}>
            <dt>Based in</dt>
            <dd>Pune, India</dd>
          </div>
          <div className="in" style={{ '--d': 0.36 }}>
            <dt>Local time</dt>
            <dd><LocalTime /></dd>
          </div>
          <div className="in" style={{ '--d': 0.39 }}>
            <dt>Status</dt>
            <dd><i className="fc__dot" aria-hidden="true" />Available 2026</dd>
          </div>
          <div className="in" style={{ '--d': 0.42 }}>
            <dt>Elsewhere</dt>
            <dd>
              <a href="https://github.com/rajj28" target="_blank" rel="noreferrer">GitHub</a>
              <a href="https://www.linkedin.com/in/ruturaj-sonkamble-106246304/" target="_blank" rel="noreferrer">LinkedIn</a>
            </dd>
          </div>
        </dl>
      </div>

      <footer className="fc__strip in" style={{ '--d': 0.46 }}>
        <span>&copy; 2026 Ruturaj Sonkamble</span>
        <span>AI Engineer &mdash; Pune, India</span>
      </footer>

      <div className="fc__band" ref={band} aria-hidden="true">
        <span className="fc__word" ref={word}>
          <span className="fc__word-line">{wordmarkLine(0)}</span>{' '}
          <span className="fc__word-line is-it">{wordmarkLine(1)}</span>
        </span>
      </div>
    </div>
  )
}

/* The chapter menu the four dots open: every chapter, large, one click from
   anywhere on the page, with the ways to reach him underneath. While it is
   open the page stands still (the driver stops Lenis), Esc closes it, and
   focus goes back to the dots. `inert` takes it out of the tab order and the
   accessibility tree whenever it is closed. */
function Menu({ open, active, onGo }) {
  const list = useRef(null)
  const wasOpen = useRef(false)

  useEffect(() => {
    if (open) list.current?.querySelector('button')?.focus({ preventScroll: true })
    else if (wasOpen.current) document.querySelector('.chrome .dots')?.focus({ preventScroll: true })
    wasOpen.current = open
  }, [open])

  return (
    <div
      id="site-menu"
      className={'menu' + (open ? ' is-open' : '')}
      role="dialog"
      aria-modal="true"
      aria-label="Chapters"
      inert={!open}
    >
      <nav className="menu__list" ref={list} aria-label="Chapters">
        {CHAPTERS.map(([n, label], i) => (
          <button
            key={n}
            type="button"
            className={'menu__item' + (i === active ? ' is-on' : '')}
            style={{ '--i': i }}
            aria-current={i === active ? 'true' : undefined}
            onClick={() => onGo(i)}
          >
            <span className="menu__n">{n}</span>
            <span className="menu__label">{label}</span>
            <span className="menu__arrow" aria-hidden="true">&rarr;</span>
          </button>
        ))}
      </nav>
      <div className="menu__foot">
        <a href={'mailto:' + CONTACT_EMAIL}>{CONTACT_EMAIL}</a>
        <span className="menu__social">
          <a href="https://github.com/rajj28" target="_blank" rel="noreferrer">GitHub &#8599;</a>
          <a href="https://www.linkedin.com/in/ruturaj-sonkamble-106246304/" target="_blank" rel="noreferrer">LinkedIn &#8599;</a>
        </span>
        <span>Pune, India &middot; <LocalTime /></span>
      </div>
    </div>
  )
}

const CHAPTERS = [
  ['Ch. 1', 'Intro'],
  ['Ch. 2', 'About'],
  ['Ch. 3', 'Projects'],
  ['Ch. 4', 'Work'],
  ['Ch. 5', 'Experience'],
  ['Ch. 6', 'Contact'],
]

/* The colour each chapter opens on — the curtain for a long jump drops in the
   destination's own ground and ink, so the cut lands rather than flashes. */
const CHAPTER_TONE = [
  ['#0158a1', '#f2f7ff'],   // the sky the page opens on
  ['#2a2219', '#f2f7ff'],   // the orchard, dark
  ['#dedfd4', '#1b1d18'],   // bone — the desk
  ['#dedfd4', '#1b1d18'],   // bone — he eats it
  ['#0364ac', '#f2f7ff'],   // the sky again
  ['#dedfd4', '#1b1d18'],   // bone — the ground
]

export default function App() {
  const [active, setActive] = useState(0)
  const [light, setLight] = useState(false)
  const [menu, setMenu] = useState(false)
  const scroller = useRef(null)
  /* The sky's DitherSky reads this every frame to scrub its clouds up out of
     the bottom as the section scrolls. A ref keeps it plumbed between the
     driver in the rAF loop and the WebGL instance without re-renders. */
  const skyRise = useRef(1)
  /* Chapter jumps, filled in by the scroll effect (it owns Lenis and knows
     where each chapter reads best). The rail and the CTA call it. */
  const nav = useRef(null)

  /* The active chapter's label decodes in rather than simply appearing —
     scrambled glyphs resolving left to right, the way a terminal settles.
     The rail label is a CSS attr(), so it is the attribute that is animated. */
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const link = document.querySelectorAll('.rail a')[active]
    if (!link) return
    const [n, name] = CHAPTERS[active]
    const final = n + ' — ' + name
    const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/#+*'
    const t0 = performance.now()
    let raf = 0
    const step = (now) => {
      const p = Math.min((now - t0) / 560, 1)
      const solved = Math.floor(p * final.length)
      let s = ''
      for (let i = 0; i < final.length; i++) {
        const c = final[i]
        s += i < solved || c === ' ' || c === '—' || c === '.'
          ? c
          : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
      }
      link.setAttribute('data-label', s)
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => {
      cancelAnimationFrame(raf)
      link.setAttribute('data-label', final)
    }
  }, [active])

  /* The menu holds the page still while it is open, and Esc closes it. */
  useEffect(() => {
    nav.current?.lock(menu)
    if (!menu) return
    const key = (e) => { if (e.key === 'Escape') setMenu(false) }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [menu])

  /* Smooth scrolling: the native scrollbar still drives everything, but the
     content chases it with easing instead of snapping to it. body height is
     mirrored from the content so the scrollbar keeps its real range.

     The easing is Lenis's now rather than the hand-rolled lerp that was here,
     which buys the things a lerp cannot be bothered to do properly: wheel and
     trackpad deltas normalised across browsers, touch handled, momentum that
     decays instead of stopping dead, and anchor links that ease rather than
     jump.

     What has NOT changed is that there is exactly one loop. Lenis owns the
     rAF; everything downstream of it — the scroller transform, the two video
     scrubs, the pin, the zoom, the fades — is called synchronously from inside
     that same tick. Two loops is what made the pin shake the first time, and
     it would do it again: the pin has to be computed from the very same value
     of `cur` that the frame is drawn with, not from one a frame behind it.

     The rail and tone are driven from the EASED position, not window.scrollY,
     otherwise the sidebar would change before the page visually got there. */
  useEffect(() => {
    const el = scroller.current
    if (!el) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let cur = window.scrollY

    let pageMax = 1
    const syncHeight = () => {
      document.body.style.height = el.scrollHeight + 'px'
      pageMax = Math.max(el.scrollHeight - window.innerHeight, 1)
    }

    const apply = (y) => {
      const secs = [...el.querySelectorAll('[data-tone]')]
      const mid = y + window.innerHeight * 0.45
      let i = 0
      secs.forEach((sec, n) => { if (sec.offsetTop <= mid) i = n })
      setActive(i)

      const probe = y + 90
      const over = secs.find(sec => probe >= sec.offsetTop && probe < sec.offsetTop + sec.offsetHeight)
      setLight(over ? over.dataset.tone === 'light' : false)
    }

    /* The reel is driven from THIS loop, not its own.

       Two separate rAF loops have no guaranteed order within a frame, so a
       pin that measured the scroller with getBoundingClientRect would read a
       one-frame-stale transform whenever the order flipped — which is exactly
       what makes a pinned section shake.

       Driven from the same `cur`, the two transforms cancel algebraically:
       the scroller moves -cur, the pin moves +(cur - reelTop), so the stage
       sits at a constant -reelTop no matter what fractional value cur holds. */
    /* Scroll progress -> video time, weighted by how much the picture
       actually changes.

       Measured frame-by-frame, the two halves are wildly uneven: the ripening
       runs 1.8-8.5 change per frame, the fall only 0.1-0.75. Any even mapping
       therefore spends most of the scroll on the half where almost nothing
       moves, which is the dead air.

       This table is the inverse cumulative distribution of that measured
       change (softened with a square root, so quiet passages stay present
       instead of being rushed past). Equal scroll now buys roughly equal
       visible change. */
    const KEYS = [
      [0.0000,  0.000], [0.0400,  0.370], [0.0800,  0.740], [0.1200,  1.043],
      [0.1600,  1.279], [0.2000,  1.534], [0.2400,  1.759], [0.2800,  1.972],
      [0.3200,  2.194], [0.3600,  2.417], [0.4000,  2.639], [0.4400,  2.850],
      [0.4800,  3.041], [0.5200,  3.252], [0.5600,  3.457], [0.6000,  3.715],
      [0.6400,  4.042], [0.6800,  4.444], [0.7200,  4.978], [0.7600,  5.536],
      [0.8000,  6.465], [0.8400,  7.277], [0.8800,  8.047], [0.9200,  8.787],
      [0.9600,  9.363], [1.0000, 10.020],
    ]

    const timeFor = (prog) => {
      for (let i = 1; i < KEYS.length; i++) {
        const [p1, t1] = KEYS[i]
        if (prog <= p1) {
          const [p0, t0] = KEYS[i - 1]
          return t0 + ((prog - p0) / (p1 - p0)) * (t1 - t0)
        }
      }
      return KEYS[KEYS.length - 1][1]
    }

    let shown = 0
    let godT = 0
    let godIn = 0
    let eatT = 0
    /* the about copy's and the experience's last-written reveal values */
    let reelEnter = -1
    let xpEnter = -1
    /* the frame each element is parked on, so a seek is only ever issued when
       it needs to change */
    let shownF = -1
    let godF = -1
    let eatF = -1
    /* the grow the footer plant was last drawn at (-1: canvas is empty) */
    let plantG = -1
    /* the contact layer's last-written reveal values */
    let fcFrame = -1
    let fcEnter = -1
    /* On a phone or tablet the contact column stacks above the plant, so the
       plant may only be as tall as the ground minus that column. Measured by
       a ResizeObserver (set up below), never per frame. */
    let plantCap = Infinity
    const chrome = document.querySelector('.chrome')

    const reel = () => {
      const track = el.querySelector('.reel')
      const pin = el.querySelector('.reel__pin')
      const vid = el.querySelector('.reel__video')
      if (!track || !pin) return

      const travel = track.offsetHeight - window.innerHeight
      const local = cur - track.offsetTop

      const pinY = Math.min(Math.max(local, 0), Math.max(travel, 0))
      pin.style.transform = 'translate3d(0,' + pinY + 'px,0)'

      /* The about copy and the figures under the rule assemble over the
         first part of the ripening (see .rv in App.css), and the counters run
         with their own entrances. Written only when the value moves. */
      const vh = window.innerHeight
      const enter = Math.round(clamp01((local + vh * 0.2) / (travel * 0.55 + vh * 0.2)) * 1000) / 1000
      if (enter !== reelEnter) {
        reelEnter = enter
        pin.style.setProperty('--enter', String(enter))
        pin.querySelectorAll('[data-count]').forEach((c) => {
          const t = clamp01((enter - Number(c.dataset.d)) / 0.4)
          const v = String(Math.round(Number(c.dataset.count) * (1 - Math.pow(1 - t, 3))))
          if (c.textContent !== v) c.textContent = v
        })
      }

      if (vid && vid.readyState >= 2 && isFinite(vid.duration)) {
        const prog = travel > 0 ? Math.min(Math.max(local / travel, 0), 1) : 0
        const want = timeFor(prog)
        shown += (want - shown) * 0.18
        shownF = seekTo(vid, shown, shownF)
      }
    }

    const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x)

    /* The selected-work rails rotate one entry at a time — each brief fades in
       on its own stretch of the section's scroll, holds to be read, then fades
       out exactly as the next one is taking its place. No sliding: the entries
       are stacked in the same spot, so the next one reads where the last one
       was. `q` is the rail's place in the run (0–1). The last piece never falls
       away: it waits out the rest of the section and rides the rail's own fade
       on the way out. */
    const sm = (r) => r * r * (3 - 2 * r)
    const railPiece = (el, q) => {
      const steps = el.querySelectorAll('[data-step]')
      const n = steps.length
      steps.forEach((node) => {
        const i = node.dataset.step
        const head = i === 'head'
        const k = head ? 0 : Number(i)
        const a = head ? 0.03 : 0.08 + k * 0.30
        const rise = sm(clamp01((q - a) / 0.10))
        const falls = !head && k < n - 2
        const fall = falls ? 1 - sm(clamp01((q - (a + 0.18)) / 0.10)) : 1
        node.style.opacity = String(rise * fall)
      })
      /* the hairline under the heading: how far through the rail's reading you
         are, so the line makes the rotation legible before it happens */
      const prog = el.querySelector('.eat__works-prog')
      if (prog) prog.style.width = String(Math.round(clamp01(q) * 100)) + '%'
    }

    /* Seeking a video is not free, and there is no point asking for a moment
       in time that lands on a frame you are already showing. Every clip here is
       24fps, so scroll progress is snapped to a whole frame and a seek is only
       issued when that frame number actually changes.

       Without it the eased time was written on every animation frame — sixty
       requests a second at a file with twenty-four frames in it, each one
       landing while the last was still in flight. Measured over a real wheel
       scroll, the element was in a seeking state 79% of the time and one frame
       stayed on screen for 65 consecutive ticks. That is the stutter.

       The seek aims at the MIDDLE of the frame's span rather than its edge, so
       floating point rounding cannot drop it into the neighbouring frame. */
    const FPS = 24
    const frameAt = (t, duration) =>
      Math.max(0, Math.min(Math.floor(t * FPS), Math.floor((duration - 0.001) * FPS)))

    const seekTo = (vid, want, held) => {
      const f = frameAt(want, vid.duration)
      if (f === held || vid.seeking) return held
      vid.currentTime = (f + 0.5) / FPS
      return f
    }

    /* The desk runs its beats back to back. They used to be expressed as
       fractions of the track, which was fine while the track had one job, but
       a fraction silently changes length every time the track does — the 0.09
       lead-in that was right over 720svh became 120svh of dead scroll the
       moment the clip got longer. So each beat owns a budget in real pixels
       and the scrub simply takes whatever is left over.

       In, and then back out again. The last three are the way out: the screen
       retreats into the machine it came from, the machine goes to sleep, and
       the camera retraces the move that brought it here. All three are the
       forward beats run in reverse, which is why none of them needs any
       footage that does not already exist. */
    /* Tightened by about 40% across the board: every beat is still here,
       none of them lingers. */
    const LEAD  = () => window.innerHeight * 0.3   // statue dissolves up
    const BOOT  = () => window.innerHeight * 1.1   // camera at rest, machine wakes
    const ZOOM  = () => window.innerHeight * 1.6   // glass grows to fill the page
    const HOLD  = () => window.innerHeight * 0.8   // screen sits open, clickable
    const BACK  = () => window.innerHeight * 1.0   // and shrinks into the laptop again
    const SLEEP = () => window.innerHeight * 0.3   // the glass goes dark
    /* Still quicker than the way in, but no longer nearly twice as quick. The
       pull-back runs the footage BACKWARDS, and a backward seek costs more than
       a forward one, so there is a limit to how hard this beat can be pushed
       before the decoder starts falling behind the scroll. */
    const AWAY  = () => window.innerHeight * 1.5   // the camera retreats to the side

    /* Where the camera move begins in the trimmed clip. Original frame 194 is
       the last frame before it — the profile, apple resting in the open palm —
       and it is also the frame the eating shot is generated from, so running
       the scrub back to exactly here means the two meet without a join. */
    const EAT_IN = 103 / 24

    const desk = () => {
      const track = el.querySelector('.desk')
      const pin = el.querySelector('.desk__pin')
      if (!track || !pin) return

      const travel = track.offsetHeight - window.innerHeight

      /* The pin is held for one viewport PAST the end of the track, which is
         exactly the viewport the eat section's own track overlaps into.

         Without it the two sections cross-fade while one of them is sliding
         away and the other is standing still, and since they are showing the
         same frame of the same statue what you see is that statue twice, a
         hundred and twenty pixels apart, both at half opacity. Holding this one
         still through the overlap puts the two pictures exactly on top of each
         other, which is the only arrangement in which a dissolve between them
         is invisible. It costs nothing: the clip has already stopped by here. */
      const local = cur - track.offsetTop
      const pinY = Math.min(Math.max(local, 0), Math.max(travel + window.innerHeight, 0))
      pin.style.transform = 'translate3d(0,' + pinY + 'px,0)'

      const lead = LEAD()
      const boot = BOOT()
      const zoom = ZOOM()
      const hold = HOLD()
      const back = BACK()
      const sleep = SLEEP()
      const away = AWAY()
      const scrub = Math.max(travel - lead - boot - zoom - hold - back - sleep - away, 1)

      /* Walk the budgets in order rather than re-deriving each offset, so
         inserting or retiming a beat cannot leave a stale sum behind. */
      let o = local - lead
      const s = clamp01(o / scrub); o -= scrub          // through the clip
      const b = clamp01(o / boot); o -= boot            // the machine wakes
      const zi = clamp01(o / zoom); o -= zoom           // into the screen
      o -= hold                                         // …which sits open
      const zo = clamp01(o / back); o -= back           // and retreats again
      const sl = clamp01(o / sleep); o -= sleep         // the glass goes dark
      const aw = clamp01(o / away)                      // the camera pulls back

      /* One number for how far into the screen we are, whichever direction we
         are travelling. `zo` only ever runs after `zi` has reached 1. */
      const z = zi * (1 - zo)

      /* Unlike the reel, this clip moves continuously from its first frame to
         its last — the arm is rising, or the apple is falling, or the camera
         is travelling, the whole way — so an even mapping already buys even
         change and needs no activity weighting. The lerp is only there to
         take the stair-step off a currentTime that would otherwise land on
         the same frame twice. */
      const vid = el.querySelector('.god__video')
      if (vid && vid.readyState >= 2 && isFinite(vid.duration)) {
        const end = vid.duration - 0.05
        /* Forward through the clip on the way in; on the way out the same
           footage runs backwards, from the last frame to the profile it left,
           at a little under twice the pace. Retreating is quicker than
           arriving — and there is nothing left to discover on the way. */
        const want = aw > 0 ? end + (EAT_IN - end) * aw : s * end
        godT += (want - godT) * 0.18
        godF = seekTo(vid, godT, godF)
      }

      /* The statue dissolves up out of the bone before anything moves. There
         is no matching dissolve at the end: the zoom disposes of him by
         covering him, which is both truer to what is happening and one less
         thing that can be caught mid-fade. */
      const box = el.querySelector('.god')
      godIn = clamp01((local - lead * 0.1) / (lead * 0.8))
      if (box && z <= 0) box.style.opacity = String(godIn)

      deskScreen(pin, box, z, aw)
      deskBoot(pin, b, sl)

      /* Once the track runs out the pin is released and the whole section
         scrolls away normally. Both of the things below key off that, because
         `z` alone cannot tell the difference between the screen filling the
         viewport and the screen having already left it. */
      const out = clamp01((local - travel) / (window.innerHeight * 0.2))

      /* The site's own furniture — mark, CTA, dot marker, chapter rail — has
         to go. It is fixed to the viewport, so the moment the screen fills the
         viewport the chapter rail ends up printed across the desktop wallpaper
         and the illusion dies on the spot. It comes back as the desk leaves. */
      if (chrome) {
        const o = 1 - clamp01((z - 0.12) / 0.28) * (1 - out)
        chrome.style.opacity = String(o)
        chrome.style.visibility = o < 0.02 ? 'hidden' : ''
      }

      /* And the desk dissolves on its way out rather than wiping, so the seam
         into the next section is the same dissolve every other seam is. */
      pin.style.opacity = String(1 - out)

      /* The selected-work rail in the empty right of the frame. One entry at a
         time — Dependency blast radius first, then Flytbase slides in as it
         lifts away, so the reading moves with the run instead of stacking.

         It stands aside for the zoom itself: once the camera is travelling into
         the screen the rail fades out so the desktop arrives clean, and the
         last piece is back waiting the moment the camera retreats out of it.
         `z` is how far into the screen we are, so the same ramp covers both
         directions. */
      const rw = pin.querySelector('.desk__works')
      if (rw) {
        const workHide = clamp01((z - 0.10) / 0.25)
        const wp = clamp01((local - lead * 0.6) / Math.max(travel - lead * 0.9, 1))
        railPiece(rw, wp)
        rw.style.opacity = String((1 - workHide) * (1 - out))
      }
    }

    /* Waking the machine.

       This runs with the camera stopped, square on the laptop, before any of
       the zoom happens — the screen is dead dark for the whole approach and
       the wake is the reward for arriving.

       Nothing here paints black. The laptop in the footage already has a
       switched-off screen and this all happens inside that rectangle, so the
       dark is the video's own the whole way through and there is no coded
       black that could come out a shade wrong against it.

       Five overlapping stages, all driven off the same scroll progress so it
       runs backwards as cleanly as it runs forwards:

         .00-.10  nothing. Still the same dark glass the footage ended on, so
                  the first thing you scroll into is not a change.
         .10-.30  the mark comes up, dim, the way a backlight does.
         .26-.84  the bar fills underneath it.
         .84-.94  the bloom: backlight to full, mark and bar gone.
         .88-1.0  the desktop underneath is revealed.

       The overlaps are the point. Nothing here starts on the frame the thing
       before it finished, because a real machine does not hand over cleanly
       between stages either. */
    const deskBoot = (pin, b, sl) => {
      const boot = pin.querySelector('.mac__boot')
      const mark = pin.querySelector('.mac__boot-mark')
      const bar = pin.querySelector('.mac__boot-bar i')
      const flash = pin.querySelector('.mac__boot-flash')
      const screen = pin.querySelector('.mac__screen')
      if (!boot || !screen) return

      const seg = (a, z2) => clamp01((b - a) / (z2 - a))
      const ease = (t) => 1 - Math.pow(1 - t, 3)

      /* Every part of this is transparent until the wake actually starts.

         It used to be the layer that was opaque and the parts inside it that
         faded, back when the layer painted its own black. With the black gone
         the layer is see-through, and the bar's TRACK — a sixteen-percent-white
         sliver — went on being painted the whole way down the section. The
         coded frame sits where the laptop's screen ENDS UP, not where the
         laptop currently is, so what you got was a faint white line hanging in
         the middle of the page from the moment the desk began. Nothing here
         paints before the wake now. */
      boot.style.opacity = String(1 - seg(0.92, 1.0))

      const lit = 1 - seg(0.84, 0.92)
      if (mark) mark.style.opacity = String(seg(0.10, 0.30) * lit)
      if (bar) {
        bar.parentNode.style.opacity = String(seg(0.20, 0.32) * lit)
        bar.style.transform = 'scaleX(' + ease(seg(0.26, 0.84)) + ')'
      }
      if (flash) {
        /* Up fast, down slow: a backlight overshooting to full and settling. */
        const up = seg(0.84, 0.90)
        const down = seg(0.90, 1.0)
        flash.style.opacity = String(Math.min(up, 1 - down) * 0.85)
      }

      /* The desktop is not painted at all until the bloom is covering it, so
         what shows through while it fades up is the dark glass in the video
         rather than half a wallpaper.

         `sl` takes it away again on the way out. A Mac going to sleep is just
         a fade to black — no logo, no bar, nothing to run in reverse — and by
         the time the camera starts pulling back the glass is as dark as the
         footage behind it, which is what lets the coded rectangle simply stop
         existing instead of having to track a laptop that is moving away. */
      screen.style.opacity = String(seg(0.88, 1.0) * (1 - sl))
    }

    /* The sparkles.

       Where they come from, measured off frame 122: the apple sits at his lips
       at (0.318, 0.222) of the picture. Everything below is expressed as a
       fraction of the video's displayed size, so the fall lands on the same
       point on his mouth whatever shape the window is — the same letterbox
       arithmetic the laptop screen needed.

       They fall. That is the whole note: straight down out of the bottom of
       the frame, directly under the mouth, and not off sideways into the empty
       half of the picture. A little horizontal drift and a slow spin so they
       are not a column of identical dots, and gravity so they accelerate away
       rather than sinking at a constant rate. */
    /* Where the sparkles leave his mouth, as a fraction of the letterboxed
   16:9 picture. Every later section inherits the SAME screen point — the
   sky keeps them falling from exactly here, and the ground in the footer
   catches them under the same x — so the fall reads as one continuous
   thing from the bite to the tree, never jumping sideways to the middle
   of the frame. */
const BITE = { x: 0.318, y: 0.222 }

/* Converts the bite fraction to stage coordinates for one pinned stage,
   undoing the letterboxing exactly the way the video renderers do. */
const biteOrigin = (stage) => {
  const w = stage.offsetWidth
  const h = stage.offsetHeight
  const fit = Math.min(w / 16, h / 9)
  const dw = 16 * fit
  const dh = 9 * fit
  const ox = (w - dw) / 2
  const oy = (h - dh) / 2
  return { x: ox + dw * BITE.x, y: oy + dh * BITE.y }
}

const SPARK_N = 74
const SPARK_PATH = new Path2D(
  'M8 0c.55 4.35 3.1 6.9 8 8-4.9 1.1-7.45 3.65-8 8-.55-4.35-3.1-6.9-8-8 4.9-1.1 7.45-3.65 8-8Z'
)

    /* Seeded, so the scatter is the same on every load and — more to the point
       — identical frame for frame when you scroll back up through it. */
    const SPARKS = (() => {
      let seed = 0x9e3779b9
      const rnd = () => {
        seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5
        return ((seed >>> 0) % 100000) / 100000
      }
      return Array.from({ length: SPARK_N }, () => ({
        /* Tight enough a stagger, and heavy enough a fall, that even the last
           one to leave his mouth still reaches the bottom of the picture before
           the beat runs out. They are supposed to drip off the bottom edge, not
           stall halfway down his lap. */
        t: Math.pow(rnd(), 1.4) * 0.30,
        drift: (rnd() - 0.5) * 0.085,          // sideways wander, small
        v0: 0.06 + rnd() * 0.10,               // it is a bite, not an explosion
        g: 1.6 + rnd() * 1.1,
        size: 0.008 + Math.pow(rnd(), 2) * 0.026,
        spin: (rnd() - 0.5) * 5,
        phase: rnd() * 6.283,
        warm: rnd(),
      }))
    })()

    const eatSparks = (canvas, stage, sp) => {
      const w = stage.offsetWidth
      const h = stage.offsetHeight
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr)
        canvas.height = Math.round(h * dpr)
        canvas.style.width = w + 'px'
        canvas.style.height = h + 'px'
      }
      const ctx = canvas.getContext('2d')
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      if (sp <= 0) return

      // where the 16:9 video actually lands inside the stage
      const fit = Math.min(w / 16, h / 9)
      const dw = 16 * fit
      const dh = 9 * fit
      const oy = (h - dh) / 2
      const { x: bx, y: by } = biteOrigin(stage)

      /* The whole field dissolves at the end rather than freezing, so the ones
         still falling when the section runs out are not left hanging. */
      const fade = 1 - clamp01((sp - 0.92) / 0.08)

      for (let i = 0; i < SPARK_N; i++) {
        const p = SPARKS[i]
        const t = sp - p.t
        if (t <= 0) continue

        const y = by + dh * (p.v0 * t + 0.5 * p.g * t * t)
        if (y > h + 40) continue
        const x = bx + dw * p.drift * t

        // up quickly at the bite, then a slow twinkle, then out at the floor
        const born = clamp01(t / 0.07)
        /* They only go out at the picture's own bottom edge, not before it —
           the whole note was that they leave the frame rather than dissolving
           somewhere over his knee. */
        const gone = 1 - clamp01((y - (oy + dh * 0.97)) / (dh * 0.06))
        const twinkle = 0.72 + 0.28 * Math.sin(p.phase + t * 9)
        const a = born * gone * twinkle * fade
        if (a <= 0.01) continue

        const s = dh * p.size * (0.75 + 0.25 * twinkle)
        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(p.spin * t)
        ctx.scale(s / 16, s / 16)
        ctx.translate(-8, -8)
        ctx.globalAlpha = a
        ctx.fillStyle = p.warm > 0.45 ? '#ffe6a8' : '#fff6e2'
        ctx.fill(SPARK_PATH)
        ctx.restore()
      }
    }

    /* Only wide enough for the dissolve from the desk to finish. It used to be
       0.6, of which 0.4 was spent holding on a frame the section before had
       already been showing. */
    const FADE_IN = () => window.innerHeight * 0.25
    const SPARK = () => window.innerHeight * 1.2

    const eat = () => {
      const track = el.querySelector('.eat')
      const pin = el.querySelector('.eat__pin')
      if (!track || !pin) return

      const travel = track.offsetHeight - window.innerHeight
      const local = cur - track.offsetTop
      pin.style.transform =
        'translate3d(0,' + Math.min(Math.max(local, 0), Math.max(travel, 0)) + 'px,0)'

      const lead = FADE_IN()
      const spark = SPARK()
      const scrub = Math.max(travel - lead - spark, 1)

      /* The desk hands over on the very frame this clip opens on. The track is
         pulled up a viewport so the two pins coincide exactly here, which makes
         the cross-fade a dissolve between two copies of the same picture in the
         same place — nothing to see, which is the point. */
      pin.style.opacity = String(
        Math.min(clamp01(local / (window.innerHeight * 0.2)),
                 1 - clamp01((local - travel) / (window.innerHeight * 0.6)))
      )

      const q = clamp01((local - lead) / scrub)
      const vid = pin.querySelector('.eat__video')
      if (vid && vid.readyState >= 2 && isFinite(vid.duration)) {
        const want = q * (vid.duration - 0.05)
        eatT += (want - eatT) * 0.18
        eatF = seekTo(vid, eatT, eatF)
      }

      /* The first ones leave his mouth while the jaw is still closing — the
         clip is 88% through by then — and the rest run on into their own beat
         after the footage has stopped. */
      const canvas = pin.querySelector('.eat__sparks')
      if (canvas) {
        eatSparks(canvas, pin, clamp01((local - lead - scrub * 0.88) / (scrub * 0.12 + spark)))
      }

      /* The selected work lives in the empty right of the frame. One entry at
         a time: Zerve's brief slides in and lifts away as Provenance slides in
         after it, so the rail is never a stack — only one piece reading at a
         time, riding the whole length of the run from the desk's handover to
         the sky. */
      const works = pin.querySelector('.eat__works')
      if (works) {
        const seq = clamp01(local / travel)
        railPiece(works, seq)
      }
    }

    /* The sky a return to the blue. The clouds are the SAME dithered field the
       hero opened on — DitherSky renders them — but pushed below the frame and
       risen by scroll: on the way in they come up out of the bottom, the right
       one first and the left one behind, ride to their resting heights, and go
       on drifting up off the top of the viewport. The rise is fed to the sky's
       DitherSky instance through `skyRise.current`, so the exact field texture
       and its halftone screen make the clouds, never a look-alike.

       No sparkles here: the bite's stream picks up again only in the footer,
       where it lands on the ground and becomes the seed the tree grows from.
       The sky stays clean blue, the clouds carrying up and away. */
    const CLOUD = () => window.innerHeight * 2.2   // the two clouds rise

    const sky = () => {
      const track = el.querySelector('.sky')
      const pin = el.querySelector('.sky__pin')
      if (!track || !pin) return

      const travel = track.offsetHeight - window.innerHeight
      const local = cur - track.offsetTop
      pin.style.transform =
        'translate3d(0,' + Math.min(Math.max(local, 0), Math.max(travel, 0)) + 'px,0)'

      /* Fade in as the eat section leaves, fade out toward the footer. */
      const vh = window.innerHeight
      pin.style.opacity = String(
        Math.min(clamp01(local / (vh * 0.2)),
                 1 - clamp01((local - travel) / (vh * 0.5)))
      )

      /* The rise the sky's clouds scrub against. Starts with the field pushed
         clear of the bottom, rides through the resting heights, and keeps on
         going up clear of the top as the section leaves. */
      const cloudsP = clamp01(local / CLOUD())
      skyRise.current = cloudsP

      /* The experience assembles as the clouds come up to their resting
         heights (cloudsP = uRise ~ 0.5): the heading first, then each place in
         turn (see .rv in App.css). `--g` is the glint's run down the spine —
         it starts once the first place is in and reaches Now as the last one
         settles, lighting each node on the way. */
      const xp = pin.querySelector('.xp')
      if (xp) {
        const e = Math.round(clamp01((cloudsP - 0.08) / 0.62) * 1000) / 1000
        if (e !== xpEnter) {
          xpEnter = e
          xp.style.setProperty('--enter', String(e))
          xp.style.setProperty('--g', String(Math.round(clamp01((e - 0.2) / 0.62) * 1000) / 1000))
        }
      }
    }

    /* The final beat: the sparkles that the bite set free keep streaming down
       onto the next ground, land on it, and settle into a scatter of seeds —
       and from that scatter a tree grows.

       The sparkles live in the FOOTER's own coordinate space, driven by its
       own scroll progress, so they fall with the same kind of physics the
       eat section used but heavier: they accelerate under gravity, drift and
       spin as they drop, and the first ones to reach the ground line stop and
       settle there while the rest keep raining onto the same mound. The seed
       is the site's own four-point glint.

       ``rain`` animates the fall and the landing. ``treeGrow`` grows the
       plant out of the seed — drawn from the progress, not scrubbed from
       footage (see components/plant.js). ``reveal`` brings the contact card
       up over the settled seed. */
    /* The ground line, as a fraction of the stage height. On a desktop it
       sits on the landing page's lower rule (233px up at 900 tall), which
       leaves a band beneath it tall enough for the name; on a phone it drops
       lower so the contact column above has room. Mirrors --ground in
       App.css. */
    const footGround = () => (window.innerWidth <= 860 ? 0.8 : 0.74)
    const SEED_N = 64
    const SEED_PATH = new Path2D(
      'M8 0c.55 4.35 3.1 6.9 8 8-4.9 1.1-7.45 3.65-8 8-.55-4.35-3.1-6.9-8-8 4.9-1.1 7.45-3.65 8-8Z'
    )

    /* Seeded like the eat sparkles, so the scatter is identical frame for
       frame when you scroll back up through the fall. */
    const SEEDS = (() => {
      let seed = 0x85e56f3b
      const rnd = () => {
        seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5
        return ((seed >>> 0) % 100000) / 100000
      }
      return Array.from({ length: SEED_N }, () => ({
        t: Math.pow(rnd(), 1.6) * 0.55,        /* release delay, so they stream */
        x0: (rnd() - 0.5) * 0.16,              /* spread around the centre */
        vx: (rnd() - 0.5) * 0.035,             /* sideways wander */
        v0: 0.02 + rnd() * 0.06,               /* gentle initial drop */
        g: 0.65 + rnd() * 0.5,                 /* gravity — they fall fast */
        size: 0.010 + Math.pow(rnd(), 2) * 0.030,
        spin: (rnd() - 0.5) * 5,
        phase: rnd() * 6.283,
        warm: rnd(),
      }))
    })()

    const footerSparks = (canvas, stage, rain) => {
      const w = stage.offsetWidth
      const h = stage.offsetHeight
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr)
        canvas.height = Math.round(h * dpr)
        canvas.style.width = w + 'px'
        canvas.style.height = h + 'px'
      }
      const ctx = canvas.getContext('2d')
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      if (rain <= 0) return

      const groundY = h * footGround()
      const fit = Math.min(w / 16, h / 9)
      const dh = 9 * fit
      const { x: bx, y: by } = biteOrigin(stage)
      /* Fade the mound out a hair past the end of the fall, so the last of
         the settled sparkles are still glinting as the sprout breaks the
         ground instead of vanishing a frame before it appears. */
      const fade = 1 - clamp01((rain - 0.95) / 0.10)

      for (let i = 0; i < SEED_N; i++) {
        const p = SEEDS[i]
        const t = rain - p.t
        if (t <= 0) continue

        /* Same on-screen origin as the bite and the sky — the stream lands
           under the same x it has fallen at the whole way down. */
        const x = bx + w * (p.x0 + p.vx * t)
        let y = by + dh * (p.v0 * t + 0.5 * p.g * t * t)
        const settled = y >= groundY
        if (settled) y = groundY

        const born = clamp01(t / 0.10)
        const twinkle = 0.72 + 0.28 * Math.sin(p.phase + t * 9)
        const a = born * (settled ? 0.7 : twinkle) * fade
        if (a <= 0.01) continue

        const s = h * p.size * (0.75 + 0.25 * twinkle)
        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(settled ? p.phase : p.spin * t)
        ctx.scale(s / 16, s / 16)
        ctx.translate(-8, -8)
        ctx.globalAlpha = a
        ctx.fillStyle = p.warm > 0.45 ? '#ffe6a8' : '#fff6e2'
        ctx.fill(SEED_PATH)
        ctx.restore()
      }
    }

    /* Budgets, in real pixels, the same way the desk budgets its beats. The
       sparkles fall and land, then the tree grows out of the seed, and the
       contact card settles in over it. */
    const FALL  = () => window.innerHeight * 1.8   // sparkles rain down and land
    const GROW  = () => window.innerHeight * 2.6   // the tree grows from the seed

    const footerFn = () => {
      const track = el.querySelector('.footer')
      const pin = el.querySelector('.footer__pin')
      if (!track || !pin) return

      const travel = track.offsetHeight - window.innerHeight
      const local = cur - track.offsetTop
      pin.style.transform =
        'translate3d(0,' + Math.min(Math.max(local, 0), Math.max(travel, 0)) + 'px,0)'

      const rain = Math.min(Math.max(local / FALL(), 0), 1.1)
      const treeGrow = clamp01((local - FALL()) / GROW())

      const vh = window.innerHeight
      /* Fade in from the eat section above and out at the very end, so no
         seam is hard. */
      pin.style.opacity = String(
        Math.min(clamp01(local / (vh * 0.2)),
                 1 - clamp01((local - travel) / (vh * 0.4)))
      )

      /* The falling seeds. The rain runs a little past the end of the fall
         (unclamped to 1.1) so the mound's fade — 0.95 to 1.05 — actually
         finishes as the sprout breaks the ground; clamped at 1 it stalled at
         half strength and left the last sparkles frozen in mid-air around
         the grown plant. */
      const canvas = pin.querySelector('.footer__sparks')
      if (canvas) footerSparks(canvas, pin, rain)

      /* The plant. Drawn straight from the grow progress every frame — there
         is no footage to seek, so it is exactly as smooth as the scroll — and
         rooted where the stream lands: under the bite's x, on the ground line.
         The seed glint is moved there too, so the sprout comes out of it. */
      const plant = pin.querySelector('.footer__tree')
      if (plant) {
        const w = pin.offsetWidth
        const h = pin.offsetHeight
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        const bw = Math.round(w * dpr)
        const bh = Math.round(h * dpr)
        const resized = plant.width !== bw || plant.height !== bh
        if (resized) { plant.width = bw; plant.height = bh }
        const rootX = biteOrigin(pin).x

        const seedEl = pin.querySelector('.footer__ground-seed')
        const left = rootX + 'px'
        if (seedEl && seedEl.style.left !== left) seedEl.style.left = left

        /* A still plant only needs drawing when it changes; the breeze needs
           every frame while the plant is on screen. */
        const live = treeGrow > 0 && local > -vh && local < travel + vh
        if (live && (resized || !reduced || treeGrow !== plantG)) {
          const ctx = plant.getContext('2d')
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
          ctx.clearRect(0, 0, w, h)
          drawPlant(ctx, rootX, h * footGround(), Math.min(Math.min(h, w) * (w <= 860 ? 0.5 : 0.56), plantCap), treeGrow,
                    reduced ? 0 : performance.now() / 1000)
          plantG = treeGrow
        } else if (!live && plantG !== -1) {
          plant.getContext('2d').clearRect(0, 0, plant.width, plant.height)
          plantG = -1
        }
      }

      /* The contact layer reads its whole choreography from two numbers set
         here: `--frame`, the hairline grid drawing in as the footer arrives,
         and `--enter`, the type rising in from the back half of the fall
         until the plant flowers. CSS staggers every piece off them. */
      const fc = pin.querySelector('.fc')
      if (fc) {
        const frame = Math.round(clamp01(local / (vh * 1.1)) * 1000) / 1000
        const enter = Math.round(
          clamp01((local - FALL() * 0.55) / (FALL() * 0.45 + GROW() * 0.8)) * 1000
        ) / 1000
        if (frame !== fcFrame) { fc.style.setProperty('--frame', String(frame)); fcFrame = frame }
        if (enter !== fcEnter) { fc.style.setProperty('--enter', String(enter)); fcEnter = enter }
      }
    }

    /* Growing the glass into the page.

       The overlay is laid out at full pin size and then squeezed back down
       onto the rectangle the glass occupies in the video — which means the
       video's own letterboxing has to be undone first, since `contain` leaves
       bars whose size depends on the viewport shape. Everything below is that
       one piece of arithmetic, and then a straight interpolation from the
       glass rectangle to the whole pin.

       The desktop inside is scaled to COVER its frame rather than fit it,
       because a 16:10 laptop screen is squarer than any real viewport: fitting
       would leave two bands of nothing inside the glass for the whole first
       half of the move.

       The video is pushed in by the same factor at the same time, about the
       centre of its own glass. Without that the screen would simply inflate
       over a statue standing still, which reads as a rectangle growing. With
       it, the bezel and the hands rush outward past the edges of the picture
       and it reads as the camera still travelling — the last three seconds of
       the clip continuing by other means.

       The width grows EXPONENTIALLY, not linearly. Apparent size under a dolly
       is a ratio, not a difference: 404px to 450px is a far bigger visual
       event than 1300px to 1350px, so a linear ramp crawls for the first half
       and then lunges. Raising the ratio to the power of progress is what
       makes the approach feel like one steady speed. Everything else — the
       corner, the height, the aspect — is then lerped off the width it
       produces, so nothing can drift out of step with it. */

    const deskScreen = (pin, god, z, aw) => {
      const frame = pin.querySelector('.mac__frame')
      const desktop = pin.querySelector('.mac__desk')
      const mac = pin.querySelector('.mac')
      if (!frame || !desktop || !mac) return

      const pw = pin.offsetWidth
      const ph = pin.offsetHeight

      // where the 16:9 video actually lands inside the pin, given object-fit: contain
      const fit = Math.min(pw / 16, ph / 9)
      const dw = 16 * fit
      const dh = 9 * fit
      const ox = (pw - dw) / 2
      const oy = (ph - dh) / 2

      const gx = ox + dw * GLASS.x0
      const gy = oy + dh * GLASS.y0
      const gw = dw * (GLASS.x1 - GLASS.x0)
      const gh = dh * (GLASS.y1 - GLASS.y0)

      const t = z * z * (3 - 2 * z)                  // smoothstep, to soften both ends
      const w = gw * Math.pow(pw / gw, t)            // the dolly
      const k = (w - gw) / (pw - gw)                 // …expressed as plain progress
      const x = gx * (1 - k)
      const y = gy * (1 - k)
      const h = gh + (ph - gh) * k

      /* The corner follows the lid's as the camera closes on it — it is a real
         radius on a real object, so it grows with everything else — and then
         retires as the frame stops being a laptop screen and becomes the page. */
      const r = GLASS_INNER_R * dw * (w / gw) * (1 - k)
      frame.style.clipPath =
        'inset(' + y + 'px ' + (pw - x - w) + 'px ' + (ph - y - h) + 'px ' + x +
        'px round ' + r + 'px)'

      if (desktop.style.width !== pw + 'px') {
        desktop.style.width = pw + 'px'
        desktop.style.height = ph + 'px'
      }
      desktop.style.transform =
        'translate(' + (x + w / 2) + 'px,' + (y + h / 2) + 'px) translate(-50%,-50%) ' +
        'scale(' + Math.max(w / pw, h / ph) + ')'

      /* Take the video with it, so the screen baked into the footage stays
         under the live one for the whole move rather than only at the start.

         It has to follow the frame's centre, not the glass's. The frame grows
         towards the middle of the page, and the glass is above the middle, so
         the two centres drift apart as it opens — scaling the video about the
         glass left the baked desktop sitting a few pixels high and you could
         see its menu bar peering over the top of the live one.

         `max` rather than width alone for the same class of reason: once the
         panel's shape and the window's shape have diverged, matching only the
         width lets a sliver of bezel show along the top and bottom. */
      if (god) {
        const gcx = gx + gw / 2
        const gcy = gy + gh / 2
        god.style.transformOrigin = (gcx / pw) * 100 + '% ' + (gcy / ph) * 100 + '%'
        god.style.transform =
          'translate(' + (x + w / 2 - gcx) + 'px,' + (y + h / 2 - gcy) + 'px) ' +
          'scale(' + Math.max(w / gw, h / gh) + ')'

        /* And it retires as it gets soft. The footage is 1280 wide; by the end
           of the move it is being blown up three and a half times, which is
           where the aluminium and the marble start to look like a photograph
           of a photograph. The ring of it still showing outside the screen is
           thin by then and getting thinner, so fading it out over the back
           half costs nothing and takes the mush with it. */
        god.style.opacity = String(godIn * (1 - clamp01((z - 0.52) / 0.34)))
      }


      /* Only clickable once it is essentially the whole page. Before that the
         close button is a four-pixel target sitting on top of a statue. */
      mac.style.pointerEvents = z > 0.92 ? 'auto' : 'none'

      /* Once the camera is retreating the laptop is no longer where this
         rectangle thinks it is, so the rectangle stops. It is already blank by
         then — the screen slept through the beat before — but hiding it means
         a rounding error cannot leave a stray edge hanging in the air. */
      mac.style.visibility = aw > 0 ? 'hidden' : ''

    }

    /* Nothing is allowed a hard edge. Each full-bleed section fades out as it
       leaves and the next fades in as it arrives, overlapping across the
       boundary, so the eye never catches a seam — only a dissolve. */
    const fades = () => {
      const vh = window.innerHeight

      const screen = el.querySelector('.screen')
      if (screen) {
        const out = clamp01((cur - screen.offsetHeight * 0.55) / (screen.offsetHeight * 0.45))
        screen.style.opacity = String(1 - out)
      }

      const reel = el.querySelector('.reel')
      if (reel) {
        const local = cur - reel.offsetTop
        const inFade = clamp01((local + vh * 0.45) / (vh * 0.45))
        /* The reel now reaches zero exactly ON the desk boundary rather than
           0.8vh early. It used to finish first and leave a hole of bare bone
           before the next section had anything to show. */
        const outFade = clamp01((local - (reel.offsetHeight - vh * 1.35)) / (vh * 1.35))
        reel.style.opacity = String(Math.min(inFade, 1 - outFade))
      }
    }

    /* The page's spine: the gutter rule is drawn over again in full ink as
       you read, and the readout at its foot counts the percentage. Both live
       in the chrome, so they step aside with it inside the laptop. */
    const progLine = document.querySelector('.progress__line')
    const progNum = document.querySelector('.progress__num')
    let progShown = -1
    const progress = () => {
      const p = clamp01(cur / pageMax)
      if (progLine) progLine.style.transform = 'scaleY(' + p.toFixed(4) + ')'
      const pct = Math.round(p * 100)
      if (progNum && pct !== progShown) {
        progShown = pct
        progNum.textContent = String(pct).padStart(3, '0')
      }
    }

    /* Everything the frame needs, in the order it needs it. Called from
       Lenis's tick, never from a rAF of its own. */
    const draw = () => {
      el.style.transform = 'translate3d(0,' + (-cur) + 'px,0)'
      reel()
      desk()
      eat()
      sky()
      footerFn()
      fades()
      progress()
      apply(cur)
    }

    syncHeight()
    const ro = new ResizeObserver(syncHeight)
    ro.observe(el)
    window.addEventListener('resize', syncHeight)

    /* the plant's ceiling under the stacked contact column (see plantCap) */
    const capRO = new ResizeObserver(() => {
      const pin = el.querySelector('.footer__pin')
      const col = el.querySelector('.fc__col')
      if (!pin || !col) return
      const h = pin.offsetHeight
      plantCap = window.innerWidth <= 860
        ? Math.max(h * footGround() - (col.offsetTop + col.offsetHeight) - 28, h * 0.12)
        : Infinity
      plantG = NaN   // force a redraw at the new size, even when motion is reduced
    })
    const capPin = el.querySelector('.footer__pin')
    const capCol = el.querySelector('.fc__col')
    if (capPin) capRO.observe(capPin)
    if (capCol) capRO.observe(capCol)

    /* 1.1s and this easing is the same weight the old 0.06 lerp settled at,
       measured rather than guessed: both take about a second to close the last
       few pixels. `syncTouch` because on a touch screen the page should track
       the finger exactly and ease only once it is let go. */
    const lenis = new Lenis(reduced ? { smoothWheel: false, syncTouch: false } : {
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      syncTouch: true,
    })

    lenis.on('scroll', ({ scroll }) => { cur = scroll })

    /* Chapter jumps for the rail and the CTA. Each lands where its chapter
       reads best — the about fully assembled, the laptop open on the desktop,
       the timeline drawn, the plant in flower — not merely at the top of its
       track, and glides there through everything in between. */
    const trackAt = (sel, f) => {
      const t = el.querySelector(sel)
      return t ? t.offsetTop + Math.max(t.offsetHeight - window.innerHeight, 0) * f : 0
    }
    const chapterY = [
      () => 0,
      () => trackAt('.reel', 0.6),
      () => {
        const t = el.querySelector('.desk')
        if (!t) return 0
        const beats = LEAD() + BOOT() + ZOOM() + HOLD() + BACK() + SLEEP() + AWAY()
        const scrub = Math.max(t.offsetHeight - window.innerHeight - beats, 1)
        return t.offsetTop + LEAD() + scrub + BOOT() + ZOOM() + HOLD() * 0.5
      },
      () => trackAt('.eat', 0.5),
      () => {
        const t = el.querySelector('.sky')
        return t ? t.offsetTop + CLOUD() * 0.9 : 0
      },
      () => trackAt('.footer', 1),
    ]
    /* Near: glide there. Far: a cut. Gliding twenty screens scrubs every
       video on the way — slow, heavy, and it reads as the button doing
       nothing — so instead the curtain drops in the destination's own
       colour with the chapter's name on it, the page jumps underneath, and
       it lifts on the new chapter. `force` because the menu may have Lenis
       stopped at the moment a jump is asked for. */
    const curtain = document.querySelector('.curtain')
    let curtainT = 0
    let jumping = false
    const go = (i) => {
      const y = Math.round(chapterY[i] ? chapterY[i]() : 0)
      const far = Math.abs(y - cur) / window.innerHeight
      if (reduced) {
        lenis.scrollTo(y, { immediate: true, force: true })
        return
      }
      if (far <= 3 || !curtain) {
        lenis.scrollTo(y, { duration: 0.7 + far * 0.15, easing: (t) => 1 - Math.pow(1 - t, 4), force: true })
        return
      }
      if (jumping) return
      jumping = true
      const [bg, ink] = CHAPTER_TONE[i] || CHAPTER_TONE[0]
      curtain.style.setProperty('--curtain', bg)
      curtain.style.setProperty('--curtain-ink', ink)
      curtain.setAttribute('data-label', CHAPTERS[i][0] + ' — ' + CHAPTERS[i][1])
      curtain.classList.add('is-in')
      curtainT = window.setTimeout(() => {
        lenis.scrollTo(y, { immediate: true, force: true })
        /* a few frames for the destination to draw (and its video to seek)
           before the curtain lifts off it */
        curtainT = window.setTimeout(() => {
          curtain.classList.remove('is-in')
          jumping = false
        }, 200)
      }, 400)
    }
    nav.current = {
      go,
      lock: (on) => (on ? lenis.stop() : lenis.start()),
    }

    let raf = 0
    const loop = (time) => {
      lenis.raf(time)
      draw()
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      lenis.destroy()
      ro.disconnect()
      capRO.disconnect()
      nav.current = null
      clearTimeout(curtainT)
      window.removeEventListener('resize', syncHeight)
      document.body.style.height = ''
    }
  }, [])

  const gridRules = (
    <>
      <i className="gv gv--l" />
      <i className="gv gv--r" />
      <i className="gh gh--t" />
      <i className="gh gh--b" />
    </>
  )

  return (
    <>
      {/* film grain over everything, and the pointer above that */}
      <div className="grain" aria-hidden="true" />
      <Cursor />
      {/* the cut a long chapter jump hides behind (see `go` in the driver) */}
      <div className="curtain" aria-hidden="true" />

      {/* one persistent chrome layer: mark, CTA, dot marker and chapter rail */}
      <div className={'chrome' + (light && !menu ? ' chrome--light' : '') + (menu ? ' is-menu' : '')}>
        <header className="bar">
          <a
            className="mark"
            href="#top"
            aria-label="Back to the top"
            onClick={(e) => {
              e.preventDefault()
              setMenu(false)
              if (nav.current) nav.current.go(0)
              else window.scrollTo(0, 0)
            }}
          >
            <img src={treeSrc} alt="" width="38" height="38" />
          </a>

          <a
            className="cta"
            href="#contact"
            onClick={(e) => {
              e.preventDefault()
              setMenu(false)
              if (nav.current) nav.current.go(CHAPTERS.length - 1)
              else window.scrollTo(0, document.body.scrollHeight)
            }}
          >
            Get in touch
            <span aria-hidden="true">→</span>
          </a>
        </header>

        <button
          type="button"
          className="dots"
          aria-label={menu ? 'Close the chapter menu' : 'Open the chapter menu'}
          aria-expanded={menu}
          aria-controls="site-menu"
          onClick={() => setMenu((m) => !m)}
        >
          <i /><i /><i /><i />
        </button>

        <nav className="rail" aria-label="Chapters">
          {CHAPTERS.map(([n, label], i) => (
            <a
              key={n}
              href={`#ch-${i + 1}`}
              aria-label={`${n} — ${label}`}
              aria-current={i === active ? 'true' : undefined}
              data-label={`${n} — ${label}`}
              className={i === active ? 'is-on' : ''}
              onClick={(e) => { e.preventDefault(); nav.current?.go(i) }}
            />
          ))}
        </nav>

        <div className="progress" aria-hidden="true">
          <i className="progress__line" />
          <span className="progress__num">000</span>
        </div>

        <Menu
          open={menu}
          active={active}
          onGo={(i) => { setMenu(false); nav.current?.go(i) }}
        />
      </div>

      {/* One continuous surface behind every section. Sections no longer
          paint their own background, so there is no edge where two meet —
          they cross-fade over this instead. */}
      <div className="backdrop" aria-hidden="true" />

      <div className="scroller" ref={scroller}>
      <section className="screen" data-tone="dark">
        <DitherSky />

        {/* hairline layout grid, with a marker at every crossing */}
        <div className="grid" aria-hidden="true">
          {gridRules}
          <span className="gx gx--bl"><Spark /></span>
          <span className="gx gx--br"><Spark /></span>
        </div>

      <div className="page">
        <main className="hero">
          <p className="kicker">AI Engineer — Ruturaj Sonkamble</p>

          <h1>
            <Line from={0}>Intelligence,</Line>
            <Line from={2}>made to be used.</Line>
          </h1>

          <p className="lede">
            I turn models into products people can trust — from latency budgets
            to the last pixel of the prompt box.
          </p>
        </main>

        <footer className="meta">
          <span>Pune, India</span>
          <div className="meta__mid">
            <span>Available 2026</span>
            <span>Design &amp; Frontend</span>
          </div>
          <div className="scroll">
            <i />
            <span>Scroll</span>
          </div>
        </footer>
      </div>
      </section>

      <Reel />

      <Desk />

      <Eat />

      <Sky
        riseRef={skyRise}
        onOpenProject={(i) => {
          window.dispatchEvent(new CustomEvent('open-project', { detail: i }))
          nav.current?.go(2)
        }}
      />

      <section className="footer" data-tone="light">
        <div className="footer__pin">
          {/* Sparkles that have streamed all the way from the bite. They land
              on the ground here and become the seed the tree grows from. */}
          <canvas className="footer__sparks" aria-hidden="true" />

          {/* The ground the sparkles fall to and the tree takes root in. */}
          <div className="footer__ground" aria-hidden="true">
            <i className="footer__ground-line" />
            <span className="footer__ground-seed"><Spark /></span>
          </div>

          {/* Where the plant grows — drawn on scroll by the driver, rooted
              where the sparkles land (components/plant.js). */}
          <canvas
            className="footer__tree"
            role="img"
            aria-label="A plant grows out of the ground where the sparkles landed and comes into flower"
          />

          <Contact />
        </div>
      </section>
      </div>
    </>
  )
}
