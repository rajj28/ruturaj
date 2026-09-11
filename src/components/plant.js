/* The footer plant — drawn, not filmed.

   The generated clip this replaces could not be made to behave. It was one
   keyframe for all 144 frames, so every scroll seek decoded forward from
   frame 0 (and every seek back up was worse). Its camera zoomed and its
   background drifted from grey to cream, so the per-frame key chewed the pale
   leaves and flowers into holes. And all of its growing happened in the first
   40% of the clip, so most of the scroll showed a plant standing still.

   Drawn, none of that applies. The plant is a pure function of the scroll
   progress, so it is exactly as smooth as the scroll; it sits on a
   transparent canvas over the page's own bone, so nothing is keyed; and it
   roots on the ground line to the pixel at any size or pixel density.

   It is the same wild angelica the footage grew: a gently S-curved stem, a
   side branch, serrated pinnate leaves that unfurl as the tip passes their
   node, and two compound umbels that swell as green buds, open their rays,
   and bloom cream from the outside in. Everything is built once from a seeded
   random, so scrolling back up retraces it exactly. */

const TAU = Math.PI * 2
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x)
const lerp = (a, b, t) => a + (b - a) * t
const ramp = (a, b, x) => clamp01((x - a) / (b - a))
const smooth = (a, b, x) => { const t = ramp(a, b, x); return t * t * (3 - 2 * t) }
const easeOut = (t) => 1 - (1 - t) * (1 - t) * (1 - t)
const mixc = (c0, c1, t) => [lerp(c0[0], c1[0], t), lerp(c0[1], c1[1], t), lerp(c0[2], c1[2], t)]
const rgb = (c, a = 1) =>
  'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + a + ')'

/* Muted botanical greens that sit on the page's bone (#dedfd4) without
   shouting, and a cream for the flowers that still reads against it. Light
   comes from the upper right: every stem and leaflet is lit on that side. */
const STEM = [118, 140, 64]
const STEM_DARK = [74, 94, 40]
const STEM_LIGHT = [172, 190, 112]
const LEAF_DARK = [54, 94, 48]
const LEAF_MID = [84, 130, 64]
const LEAF_LIGHT = [152, 186, 114]
const BUD = [132, 156, 80]
const FLOWER = [247, 244, 230]
const EDGE = 'rgba(36, 54, 24, 0.5)'
const VEIN = 'rgba(228, 236, 198, 0.55)'
const RAY = rgb([128, 150, 76])
const PEDICEL = rgb([150, 170, 98])
const SHADE = 'rgba(66, 84, 38, 0.3)'
const TONES = 5
const FLOWER_TONES = Array.from({ length: TONES + 1 }, (_, i) => rgb(mixc(BUD, FLOWER, i / TONES)))

/* Same xorshift the page seeds its sparkles with. */
const R = (() => {
  let seed = 0x5eed7a11
  return () => {
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5
    return ((seed >>> 0) % 100000) / 100000
  }
})()

/* ---------- shapes, in their own unit space ---------- */

/* One serrated leaflet: base at the origin, tip at (1, 0). Drawn through a
   transform, so every leaf on the plant shares the same three paths. The
   teeth are raked toward the tip and fade out near the base, the way an
   angelica leaflet's are. */
const halfWidth = (x) => 0.23 * Math.pow(Math.sin(Math.PI * Math.pow(x, 0.75)), 0.85)
const LEAFLET = new Path2D()
const LEAFLET_LIT = new Path2D()
const VEINS = new Path2D()
{
  const TEETH = 9
  const edge = []
  for (let i = 0; i < TEETH; i++) {
    const xv = (i + 0.25) / TEETH
    const xt = (i + 0.9) / TEETH
    edge.push([xv, halfWidth(xv) * 0.9])
    edge.push([xt, halfWidth(xt) + 0.032 * smooth(0.08, 0.3, xt) * Math.sin(Math.PI * Math.min(xt * 1.05, 1))])
  }
  LEAFLET.moveTo(0, 0)
  LEAFLET_LIT.moveTo(0, 0)
  for (const [x, y] of edge) { LEAFLET.lineTo(x, y); LEAFLET_LIT.lineTo(x, y) }
  LEAFLET.lineTo(1, 0)
  LEAFLET_LIT.lineTo(1, 0)
  LEAFLET_LIT.closePath()
  for (let i = edge.length - 1; i >= 0; i--) LEAFLET.lineTo(edge[i][0], -edge[i][1] * 0.94)
  LEAFLET.closePath()

  VEINS.moveTo(0.03, 0)
  VEINS.lineTo(0.94, 0)
  for (const x of [0.16, 0.3, 0.44, 0.58, 0.72]) {
    VEINS.moveTo(x, 0); VEINS.lineTo(x + 0.13, halfWidth(x + 0.13) * 0.72)
    VEINS.moveTo(x, 0); VEINS.lineTo(x + 0.13, -halfWidth(x + 0.13) * 0.68)
  }
}

/* A smooth oval — the seed leaves, and the shoot tip while it is growing. */
const OVAL = new Path2D()
const OVAL_LIT = new Path2D()
OVAL.moveTo(0, 0)
OVAL.bezierCurveTo(0.2, 0.44, 0.78, 0.38, 1, 0)
OVAL.bezierCurveTo(0.78, -0.38, 0.2, -0.44, 0, 0)
OVAL_LIT.moveTo(0, 0)
OVAL_LIT.bezierCurveTo(0.2, 0.44, 0.78, 0.38, 1, 0)
OVAL_LIT.closePath()

/* ---------- the plant, built once ---------- */

/* Headings are radians off vertical, + leaning right. `bend(s)` is a stem's
   heading at fraction s of its full length; lengths and widths are in plant
   heights. The side branch's bend is relative to the main stem's heading at
   the node it leaves from. */
const MAIN = { len: 0.8, w0: 0.0165, w1: 0.0085, bend: (s) => 0.05 + 0.15 * Math.sin(s * 5 + 0.5) - 0.08 * s }
const SIDE = { at: 0.3, len: 0.34, w0: 0.0095, w1: 0.0055, bend: (s) => -0.85 + 0.6 * s }

/* on: 0 main stem, 1 side branch. Lower leaves are the big, dark, spreading
   ones; they get smaller, lighter and more upright toward the flowers. Every
   leaf on the side branch faces outward, so nothing crosses between the two
   stems. */
const LEAVES = [
  { on: 0, s: 0.17, side: -1, angle: 1.12, len: 0.2, pairs: 2, leaflet: 0.085, droop: 0.55, spread: 0.95, tone: 0.1 },
  { on: 0, s: 0.29, side: 1, angle: 1.0, len: 0.22, pairs: 2, leaflet: 0.09, droop: 0.5, spread: 0.9, tone: 0.3 },
  { on: 0, s: 0.5, side: 1, angle: 0.85, len: 0.17, pairs: 1, leaflet: 0.085, droop: 0.4, spread: 0.85, tone: 0.55 },
  { on: 0, s: 0.72, side: 1, angle: 0.52, len: 0.05, pairs: 0, leaflet: 0.13, droop: 0.12, spread: 0, tone: 0.95, narrow: 0.72 },
  { on: 1, s: 0.22, side: -1, angle: 1.05, len: 0.15, pairs: 2, leaflet: 0.068, droop: 0.5, spread: 0.9, tone: 0.2 },
  { on: 1, s: 0.55, side: -1, angle: 0.8, len: 0.08, pairs: 1, leaflet: 0.05, droop: 0.3, spread: 0.85, tone: 0.6 },
].map((l) => ({
  narrow: 1,
  back: false,
  ...l,
  phase: R() * TAU,
  fill: rgb(mixc(LEAF_DARK, LEAF_MID, l.tone)),
  lit: rgb(mixc(LEAF_MID, LEAF_LIGHT, l.tone), 0.6),
}))

/* A compound umbel: rays from one point whose tips make a flat-topped dome,
   each ray carrying its own small umbel of flowers. Every third ray (and
   flower) points at the viewer, so it is drawn foreshortened and in front —
   that is what makes the dome read round rather than a flat fan. Outer
   umbellets, and the outer flowers of each, bloom first. */
const makeUmbel = ({ rays, rw, hd, pedicels, r, fr, bracts }) => {
  const list = []
  let count = 0
  for (let i = 0; i < rays; i++) {
    const u = Math.max(-1, Math.min(1, -1 + (2 * i) / (rays - 1) + (R() - 0.5) * (0.9 / rays)))
    const near = i % 3 === 1
    const m = pedicels + Math.floor(R() * 4)
    const flowers = []
    for (let j = 0; j < m; j++) {
      const v = Math.max(-1, Math.min(1, -1 + (2 * j) / (m - 1) + (R() - 0.5) * (1 / m)))
      const nearF = j % 3 === 1
      flowers.push({
        x: v * (nearF ? 0.5 : 1),
        y: (1 - 0.38 * v * v) * (nearF ? 0.8 : 1) * (0.9 + R() * 0.15),
        order: 0.5 * (1 - Math.abs(u)) + 0.25 * (1 - Math.abs(v)) + 0.25 * R(),
      })
    }
    count += m
    list.push({
      near,
      x: rw * u * (near ? 0.5 : 1),
      y: hd * (1 - 0.42 * u * u) * (near ? 0.72 : 1) * (0.92 + R() * 0.12),
      flowers,
    })
  }
  list.sort((a, b) => a.near - b.near)
  const br = []
  for (let i = 0; i < bracts; i++) {
    const u = -1 + (2 * i) / Math.max(1, bracts - 1)
    br.push({ a: u * 1.15 + (R() - 0.5) * 0.25, len: 0.02 + R() * 0.016 })
  }
  return {
    list, rw, hd, r, fr, bracts: br,
    /* per-frame scratch: ray tips, and each flower's x, y, radius, tone */
    tips: new Float32Array(rays * 2),
    fl: new Float32Array(count * 4),
  }
}

const MAIN_UMBEL = makeUmbel({ rays: 16, rw: 0.2, hd: 0.15, pedicels: 12, r: 0.042, fr: 0.006, bracts: 7 })
const SIDE_UMBEL = makeUmbel({ rays: 9, rw: 0.1, hd: 0.085, pedicels: 10, r: 0.03, fr: 0.0052, bracts: 0 })

/* ---------- drawing ---------- */

const N = 36
const trMain = new Float32Array((N + 1) * 3)
const trSide = new Float32Array((N + 1) * 3)
const SX = new Float32Array(N + 2)
const SY = new Float32Array(N + 2)
const SA = new Float32Array(N + 2)
const SW = new Float32Array(N + 2)
const RP = new Float32Array(7 * 3)
const P = { x: 0, y: 0, a: 0 }

/* Walks a stem out along its heading, the full length, whether or not it
   has grown that far yet — the visible part is always a prefix of it, so a
   leaf's node never moves as the stem above it lengthens. */
const trace = (tr, stem, x0, y0, base, L, sway) => {
  let x = x0
  let y = y0
  const ds = L / N
  for (let i = 0; i <= N; i++) {
    const s = i / N
    const a = base + stem.bend(s) + sway * s
    tr[i * 3] = x; tr[i * 3 + 1] = y; tr[i * 3 + 2] = a
    x += Math.sin(a) * ds
    y -= Math.cos(a) * ds
  }
}

const at = (tr, s, o) => {
  const f = clamp01(s) * N
  const i = Math.min(N - 1, Math.floor(f))
  const t = f - i
  o.x = lerp(tr[i * 3], tr[i * 3 + 3], t)
  o.y = lerp(tr[i * 3 + 1], tr[i * 3 + 4], t)
  o.a = lerp(tr[i * 3 + 2], tr[i * 3 + 5], t)
  return o
}

/* The band between two offsets across the stem (-1 left edge, 1 right). */
const band = (ctx, n, lo, hi) => {
  ctx.beginPath()
  for (let i = 0; i < n; i++) {
    const nx = Math.cos(SA[i]), ny = Math.sin(SA[i])
    ctx.lineTo(SX[i] + nx * SW[i] * lo, SY[i] + ny * SW[i] * lo)
  }
  for (let i = n - 1; i >= 0; i--) {
    const nx = Math.cos(SA[i]), ny = Math.sin(SA[i])
    ctx.lineTo(SX[i] + nx * SW[i] * hi, SY[i] + ny * SW[i] * hi)
  }
  ctx.closePath()
}

/* A stem grown to `reach`: a tapered ribbon, shaded as a cylinder. While it
   is still growing the tip narrows to a point; once its umbel has set
   (`capped`) it holds its width to the top. */
const drawStem = (ctx, tr, stem, reach, H, capped) => {
  if (reach <= 0.001) return
  const last = reach * N
  const whole = Math.floor(last)
  let n = 0
  const push = (x, y, a, s) => {
    const tip = 0.28 + 0.72 * smooth(0, 0.07, reach - s)
    SX[n] = x; SY[n] = y; SA[n] = a
    SW[n] = 0.5 * H * lerp(stem.w0, stem.w1, s) * lerp(tip, 1, capped)
    n++
  }
  for (let i = 0; i <= whole && i <= N; i++) push(tr[i * 3], tr[i * 3 + 1], tr[i * 3 + 2], i / N)
  if (last > whole) { at(tr, reach, P); push(P.x, P.y, P.a, reach) }
  if (n < 2) return

  band(ctx, n, -1, 1)
  ctx.fillStyle = rgb(STEM)
  ctx.fill()
  ctx.lineWidth = 0.8
  ctx.strokeStyle = EDGE
  ctx.stroke()
  band(ctx, n, -1, -0.4)
  ctx.fillStyle = rgb(STEM_DARK, 0.55)
  ctx.fill()
  band(ctx, n, 0.12, 0.5)
  ctx.fillStyle = rgb(STEM_LIGHT, 0.45)
  ctx.fill()
}

/* The ring a leaf or branch leaves on the stem. */
const drawNode = (ctx, tr, stem, s, H) => {
  at(tr, s, P)
  const hw = 0.5 * H * lerp(stem.w0, stem.w1, s) * 1.15
  const nx = Math.cos(P.a), ny = Math.sin(P.a)
  ctx.moveTo(P.x - nx * hw, P.y - ny * hw)
  ctx.lineTo(P.x + nx * hw, P.y + ny * hw)
}

const blade = (ctx, path, lit, x, y, a, len, wf, fill, litFill, veins) => {
  if (len < 0.6) return
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(a - Math.PI / 2)
  ctx.scale(len, len * wf)
  ctx.fillStyle = fill
  ctx.fill(path)
  ctx.fillStyle = litFill
  ctx.fill(lit)
  ctx.lineWidth = 0.8 / len
  ctx.strokeStyle = EDGE
  ctx.stroke(path)
  if (veins && len > 14) {
    ctx.lineWidth = 0.6 / len
    ctx.strokeStyle = VEIN
    ctx.stroke(VEINS)
  }
  ctx.restore()
}

/* A pinnate leaf unfurling. It leaves the node pressed against the stem and
   swings out to its angle as the rachis lengthens and droops; the terminal
   leaflet leads, and each pair opens out of a fold along its midrib. */
const drawLeaf = (ctx, leaf, x0, y0, stemA, lp, H, flutter) => {
  if (lp <= 0.001) return
  const e = easeOut(lp)
  const side = leaf.side
  const a0 = stemA + side * lerp(0.12, leaf.angle, e) + flutter
  const L = leaf.len * H * (0.15 + 0.85 * e)
  const bend = side * leaf.droop * e
  const n = 6

  let x = x0
  let y = y0
  ctx.beginPath()
  ctx.moveTo(x, y)
  for (let i = 0; i <= n; i++) {
    const a = a0 + bend * (i / n)
    RP[i * 3] = x; RP[i * 3 + 1] = y; RP[i * 3 + 2] = a
    if (i < n) {
      x += (Math.sin(a) * L) / n
      y -= (Math.cos(a) * L) / n
      ctx.lineTo(x, y)
    }
  }
  ctx.lineWidth = Math.max(0.8, H * 0.0034 * (0.5 + 0.5 * e))
  ctx.strokeStyle = rgb(STEM)
  ctx.stroke()

  const lt = easeOut(ramp(0.05, 0.7, lp))
  blade(
    ctx, LEAFLET, LEAFLET_LIT, RP[n * 3], RP[n * 3 + 1], RP[n * 3 + 2],
    leaf.leaflet * H * (leaf.pairs ? 1.1 : 1) * (0.2 + 0.8 * lt),
    (0.3 + 0.7 * lt) * leaf.narrow, leaf.fill, leaf.lit, true,
  )

  for (let j = leaf.pairs - 1; j >= 0; j--) {
    const u = leaf.pairs === 1 ? 0.5 : 0.32 + 0.38 * j
    const f = u * n
    const i = Math.min(n - 1, Math.floor(f))
    const t = f - i
    const px = lerp(RP[i * 3], RP[i * 3 + 3], t)
    const py = lerp(RP[i * 3 + 1], RP[i * 3 + 4], t)
    const pa = lerp(RP[i * 3 + 2], RP[i * 3 + 5], t)
    const lj = easeOut(ramp(0.15 + 0.1 * j, 0.8, lp))
    const len = leaf.leaflet * H * (0.82 + 0.18 * u) * (0.2 + 0.8 * lj)
    const spread = leaf.spread * lerp(0.2, 1, lj)
    const wf = (0.3 + 0.7 * lj) * leaf.narrow
    blade(ctx, LEAFLET, LEAFLET_LIT, px, py, pa - spread, len, wf, leaf.fill, leaf.lit, true)
    blade(ctx, LEAFLET, LEAFLET_LIT, px, py, pa + spread, len, wf, leaf.fill, leaf.lit, true)
  }
}

/* An umbel at a stem tip. `bud` swells it out of the tip as a green knob in
   a sheath; `open` spreads the rays into the dome and the umbellets out of
   their clusters; `bloom` turns the flowers from bud-green to cream. */
const drawUmbel = (ctx, U, cx, cy, heading, H, bud, open, bloom) => {
  if (bud <= 0.002) return
  const k = H * easeOut(bud)
  const rx = Math.cos(heading), ry = Math.sin(heading)
  const ux = Math.sin(heading), uy = -Math.cos(heading)
  const X = (x, y) => cx + (rx * x + ux * y) * k
  const Y = (x, y) => cy + (ry * x + uy * y) * k
  const o = open
  const o2 = easeOut(ramp(0.2, 1, open))
  const rr = U.r * (0.3 + 0.7 * o2)

  /* the pointed sheath the bud swells inside, splitting away as the rays
     open — drawn first, so the knot of green flower buds shows through */
  const sheath = 1 - smooth(0.02, 0.3, o)
  if (sheath > 0.01) {
    ctx.globalAlpha = sheath
    blade(ctx, OVAL, OVAL_LIT, cx, cy, heading, U.hd * 0.62 * k, 0.62, rgb(BUD), rgb(STEM_LIGHT, 0.5), false)
    ctx.globalAlpha = 1
  }

  if (U.bracts.length) {
    ctx.beginPath()
    for (const b of U.bracts) {
      const l = b.len * (0.4 + 0.6 * o)
      ctx.moveTo(cx, cy)
      ctx.lineTo(X(Math.sin(b.a) * l, -Math.abs(Math.cos(b.a)) * l * 0.55), Y(Math.sin(b.a) * l, -Math.abs(Math.cos(b.a)) * l * 0.55))
    }
    ctx.lineWidth = Math.max(0.5, H * 0.0014)
    ctx.strokeStyle = RAY
    ctx.stroke()
  }

  /* rays */
  ctx.beginPath()
  for (let i = 0; i < U.list.length; i++) {
    const ray = U.list[i]
    const ex = lerp(ray.x * 0.12, ray.x, o)
    const ey = lerp(U.hd * 0.3, ray.y, o)
    U.tips[i * 2] = ex
    U.tips[i * 2 + 1] = ey
    ctx.moveTo(cx, cy)
    ctx.quadraticCurveTo(X(ex * 0.15, ey * 0.75), Y(ex * 0.15, ey * 0.75), X(ex, ey), Y(ex, ey))
  }
  ctx.lineWidth = Math.max(0.6, H * 0.0024)
  ctx.strokeStyle = RAY
  ctx.stroke()

  /* pedicels, collecting every flower's place as they go */
  let q = 0
  ctx.beginPath()
  for (let i = 0; i < U.list.length; i++) {
    const ex = U.tips[i * 2]
    const ey = U.tips[i * 2 + 1]
    const bx = X(ex, ey), by = Y(ex, ey)
    for (const f of U.list[i].flowers) {
      const fx = ex + f.x * rr
      const fy = ey + f.y * rr
      const px = X(fx, fy), py = Y(fx, fy)
      ctx.moveTo(bx, by)
      ctx.lineTo(px, py)
      const b = smooth(f.order * 0.6, f.order * 0.6 + 0.4, bloom)
      U.fl[q] = px
      U.fl[q + 1] = py
      U.fl[q + 2] = Math.max(0.5, U.fr * k * (0.5 + 0.5 * b) * (0.5 + 0.5 * o2))
      U.fl[q + 3] = Math.round(b * TONES)
      q += 4
    }
  }
  ctx.lineWidth = Math.max(0.45, H * 0.0012)
  ctx.strokeStyle = PEDICEL
  ctx.stroke()

  /* flowers: one soft shadow pass, then one fill per tone */
  ctx.beginPath()
  for (let j = 0; j < q; j += 4) {
    const r = U.fl[j + 2] * 1.3
    ctx.moveTo(U.fl[j] + r, U.fl[j + 1] + U.fl[j + 2] * 0.3)
    ctx.arc(U.fl[j], U.fl[j + 1] + U.fl[j + 2] * 0.3, r, 0, TAU)
  }
  ctx.fillStyle = SHADE
  ctx.fill()
  for (let tone = 0; tone <= TONES; tone++) {
    let any = false
    ctx.beginPath()
    for (let j = 0; j < q; j += 4) {
      if (U.fl[j + 3] !== tone) continue
      const r = U.fl[j + 2]
      ctx.moveTo(U.fl[j] + r, U.fl[j + 1])
      ctx.arc(U.fl[j], U.fl[j + 1], r, 0, TAU)
      any = true
    }
    if (any) { ctx.fillStyle = FLOWER_TONES[tone]; ctx.fill() }
  }
}

/* The growing shoot tip — a closed bud riding the top of a stem until the
   umbel takes its place. */
const drawTip = (ctx, tr, reach, H, size) => {
  if (size <= 0.01 || reach <= 0) return
  at(tr, reach, P)
  blade(ctx, OVAL, OVAL_LIT, P.x, P.y, P.a, 0.026 * H * size, 0.62, rgb(LEAF_MID), rgb(LEAF_LIGHT, 0.6), false)
}

/* Draws the plant rooted at (x, y) — the ground line — `H` pixels tall when
   grown, at growth `g` (0 nothing, 1 in full flower). `time` in seconds
   drives a slow breeze once the plant has some height; hold it constant
   (e.g. 0) and the plant stands perfectly still. */
export const drawPlant = (ctx, x, y, H, g, time) => {
  if (g <= 0 || H <= 0) return

  /* the grow, scheduled on g */
  /* Stems elongate half linearly, half on a smoothstep: soft at both ends
     without the long bare-stick stretch a pure smoothstep leaves early on. */
  const grow = (a, b) => { const t = ramp(a, b, g); return lerp(t, t * t * (3 - 2 * t), 0.5) }
  const cot = easeOut(ramp(0, 0.08, g))
  const reach = grow(0.01, 0.62)
  const sideReach = grow(0.22, 0.6)
  const mBud = ramp(0.5, 0.64, g), mOpen = smooth(0.6, 0.84, g), mBloom = ramp(0.72, 0.97, g)
  const sBud = ramp(0.54, 0.66, g), sOpen = smooth(0.6, 0.8, g), sBloom = ramp(0.7, 0.94, g)

  const air = smooth(0.2, 0.9, g)
  const sway = air * (0.045 * Math.sin(time * 0.7) + 0.016 * Math.sin(time * 1.63 + 1.1))
  const swaySide = air * (0.05 * Math.sin(time * 0.81 + 0.9) + 0.015 * Math.sin(time * 1.9))

  /* the root sits a hair under the ground line, so no cut end shows */
  trace(trMain, MAIN, x, y + H * 0.004, 0, MAIN.len * H, sway)
  at(trMain, SIDE.at, P)
  trace(trSide, SIDE, P.x, P.y, P.a, SIDE.len * H, swaySide)

  /* a soft contact shadow, so it stands on the ground rather than over it */
  ctx.save()
  ctx.translate(x, y + 1)
  ctx.scale(1, 0.14)
  const r = H * 0.075
  const grd = ctx.createRadialGradient(0, 0, 0, 0, 0, r)
  grd.addColorStop(0, 'rgba(27, 29, 24, ' + (0.18 * clamp01(g * 8)) + ')')
  grd.addColorStop(1, 'rgba(27, 29, 24, 0)')
  ctx.fillStyle = grd
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, TAU)
  ctx.fill()
  ctx.restore()

  const leafOn = (leaf) => {
    const tr = leaf.on ? trSide : trMain
    const rch = leaf.on ? sideReach : reach
    const lp = ramp(leaf.s + 0.03, leaf.s + 0.25, rch)
    if (lp <= 0) return
    at(tr, leaf.s, P)
    drawLeaf(ctx, leaf, P.x, P.y, P.a, lp, H, air * 0.05 * Math.sin(time * 1.9 + leaf.phase))
  }

  /* back to front: the side branch and everything on it, the leaves behind
     the main stem, the stem, the leaves in front, the seed leaves, then the
     flower heads */
  if (sideReach > 0) {
    drawStem(ctx, trSide, SIDE, sideReach, H, sBud)
    for (const leaf of LEAVES) if (leaf.on === 1) leafOn(leaf)
    at(trSide, sideReach, P)
    drawUmbel(ctx, SIDE_UMBEL, P.x, P.y, P.a * 0.6, H, sBud, sOpen, sBloom)
    drawTip(ctx, trSide, sideReach, H * 0.75, 1 - smooth(0, 0.5, sBud))
  }

  for (const leaf of LEAVES) if (leaf.on === 0 && leaf.back) leafOn(leaf)

  drawStem(ctx, trMain, MAIN, reach, H, mBud)
  ctx.beginPath()
  for (const leaf of LEAVES) if (leaf.on === 0 && leaf.s < reach - 0.01) drawNode(ctx, trMain, MAIN, leaf.s, H)
  if (sideReach > 0) drawNode(ctx, trMain, MAIN, SIDE.at, H)
  ctx.lineWidth = Math.max(0.8, H * 0.0022)
  ctx.strokeStyle = rgb(STEM_DARK, 0.7)
  ctx.stroke()

  for (const leaf of LEAVES) if (leaf.on === 0 && !leaf.back) leafOn(leaf)

  /* The seed leaves ride the very tip while the sprout is short, then stay
     behind at the base as the stem climbs past them. */
  if (cot > 0) {
    at(trMain, Math.min(reach, 0.04), P)
    const spread = lerp(0.15, 1.15, cot)
    const len = 0.036 * H * (0.3 + 0.7 * cot)
    const wf = lerp(0.5, 0.9, cot)
    const fill = rgb(mixc(LEAF_MID, LEAF_LIGHT, 0.35))
    const lit = rgb(LEAF_LIGHT, 0.55)
    blade(ctx, OVAL, OVAL_LIT, P.x, P.y, P.a - spread, len, wf, fill, lit, false)
    blade(ctx, OVAL, OVAL_LIT, P.x, P.y, P.a + spread, len, wf, fill, lit, false)
  }

  at(trMain, reach, P)
  drawUmbel(ctx, MAIN_UMBEL, P.x, P.y, P.a * 0.6, H, mBud, mOpen, mBloom)
  drawTip(ctx, trMain, reach, H, 1 - smooth(0, 0.5, mBud))
}
