import { useEffect, useRef } from 'react'
import fieldSrc from '../assets/clouds/field.png'

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`

/* Colours sampled from the reference frame:
     sky        rgb(  1, 91,169)
     dot shadow rgb(172,162,152)
     dot light  rgb(217,201,167)

   The cloud silhouette is the exact one keyed out of the source plate —
   no lobes, no approximation. The texture supplies only DENSITY (alpha)
   and SHADING (red); the halftone grid is still evaluated per screen
   pixel, so the dots stay crisp no matter how the field is scaled. */
const FRAG = `
precision highp float;

uniform vec2  uRes;
uniform float uTime;
uniform float uDot;
uniform float uAspect;
uniform float uRise;    // sky: 0 = below frame -> 0.5 = resting -> 1 = above frame
uniform float uPin;     // 1 = clouds sit fixed in place (sky section), 0 = hero drift
uniform vec3  uCloudX;  // left + right resting centre + the small third cloud, per instance
uniform sampler2D uField;

const vec3 SKY_TOP = vec3(  1.0,  88.0, 161.0) / 255.0;
const vec3 SKY_MID = vec3(  3.0, 100.0, 172.0) / 255.0;
const vec3 SKY_LOW = vec3(  1.0, 108.0, 178.0) / 255.0;

const vec3 DOT_DARK = vec3(172.0, 162.0, 152.0) / 255.0;
const vec3 DOT_LIT  = vec3(217.0, 201.0, 167.0) / 255.0;

// 45.7 degrees. Measured by FFT of the reference: its one strong periodic
// component sits at 135.7 deg, which is this grid's other axis.
const float ANGLE = 0.798;

vec3 skyRamp(float y) {
  if (y < 0.45) return mix(SKY_TOP, SKY_MID, y / 0.45);
  return mix(SKY_MID, SKY_LOW, (y - 0.45) / 0.55);
}

/* Samples the keyed field. Motion is a sine inside a fixed band — unless the
   sky pins them, in which case the drift is zeroed. The rise scrubs the field
   vertically: at rest (rise = 0.5) the crown is exactly topY and the sky reads
   the way the hero's does; rise = 0.0 drops the whole cloud clear of the
   bottom edge and rise = 1.0 lifts it clear of the top, so a sky scroll pulls
   each cloud up from below the frame and carries it out above it. */
vec3 cloud(vec2 s, float cx, float topY, float w,
           float amp, float period, float phase, float flip, float opacity,
           float rise) {
  float h = w / uAspect;
  float below = (uRes.y / uRes.x) + 0.15 - (topY + h);
  float top = topY + below * (1.0 - 2.0 * rise);
  float drift = mix(amp * sin(6.2831853 * (uTime / period + phase)), 0.0, uPin);

  vec2 local = (s - vec2(cx - w * 0.5 + drift, top)) / vec2(w, h);
  if (local.x < 0.0 || local.x > 1.0 || local.y < 0.0 || local.y > 1.0) return vec3(0.0);

  vec2 uv = vec2(mix(local.x, 1.0 - local.x, flip), local.y);
  vec4 t = texture2D(uField, uv);
  return vec3(t.a * opacity, t.r, local.y);   // density, shading, height
}

float hash21(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

/* Density + shading at any screen point, from all three clouds. */
vec3 fieldAt(vec2 sp) {
  vec2 s = sp / uRes.x;
  // The right cloud leads the rise and the left follows, so the sky repeats
  // the order the grow used — the busy side first. Each traverses the same
  // span, offset on the same uRise. uCloudX carries each instance's own pair
  // of resting centres plus the small third cloud: the sky spreads them left
  // and right with a wisp high between; the hero keeps the composition it
  // opened on.
  float rA = smoothstep(0.0, 1.0, clamp((uRise - 0.48) / 0.52, 0.0, 1.0));
  float rB = smoothstep(0.0, 1.0, clamp((uRise - 0.32) / 0.68, 0.0, 1.0));
  float rC = smoothstep(0.0, 1.0, clamp((uRise - 0.00) / 0.68, 0.0, 1.0));
  //                cx         topY    w      amp   period phase flip opacity rise
  vec3 a = cloud(s, uCloudX.z, -0.30, 0.110, 0.045, 300.0, 0.00, 0.0, 0.42, rA);
  vec3 b = cloud(s, uCloudX.x, -0.012, 0.180, 0.052, 250.0, 0.00, 0.0, 0.78, rB);
  vec3 c = cloud(s, uCloudX.y, 0.004, 0.266, 0.048, 175.0, 0.70, 0.0, 1.00, rC);
  vec3 top = a.x >= b.x && a.x >= c.x ? a : (b.x > c.x ? b : c);
  return vec3(max(max(a.x, b.x), c.x), top.y, top.z);
}

/* A proper halftone screen: ONE dot per cell, sized from the density
   sampled at that cell's centre — not a per-pixel threshold. That is what
   makes the dots regular and round instead of ragged.

   Each cell also gets a hashed offset that grows as density falls, so dots
   in the dense core sit exactly on the grid while dots at the fringe wander
   off it and scatter loose. The offset breathes on a slow sine, which is
   the drift. */
float screen(vec2 p, float pitch, out float outD, out float outL) {
  float ca = cos(ANGLE), sa = sin(ANGLE);
  mat2 rot = mat2(ca, -sa, sa, ca);
  mat2 inv = mat2(ca,  sa, -sa, ca);

  vec2 g = (rot * p) / pitch;
  vec2 gid = floor(g);
  vec2 centre = inv * ((gid + 0.5) * pitch);

  vec3 f0 = fieldAt(centre);

  float r1 = hash21(gid);
  float r2 = hash21(gid + 19.7);
  float breathe = 0.55 + 0.45 * fract(r1 * 7.13);   // fixed per cell, not animated

  // loose at the edge, locked in the core
  float scatter = (1.0 - smoothstep(0.08, 0.72, f0.x)) * pitch * 1.35 * breathe;
  vec2 jit = (vec2(r1, r2) - 0.5) * 2.0 * scatter;

  vec3 f = fieldAt(centre + jit);
  outD = f.x;
  outL = f.y;

  float v = f.z;                       // 0 at the crown, 1 at the base

  // The underside is thin vapour, not solid cloud: dots there shrink AND
  // thin out. Dropping whole cells is what makes it sparse — shrinking
  // alone just gives a uniformly grey base.
  float keep = 1.0 - smoothstep(0.60, 1.0, v) * 0.22;
  if (hash21(gid + 71.3) > keep) return 0.0;

  // Neighbouring dots touch at radius 0.5 in cell units. Anything above
  // that and the grid floods to solid cream — which is what was killing
  // the screen in the cores. Capped at 0.5 the densest dots just kiss,
  // leaving the small diamond of sky between them that makes a halftone
  // read as a halftone.
  float lower = mix(1.0, 0.68, smoothstep(0.50, 1.0, v));   // smaller toward the base
  float jitterTone = 0.80 + 0.40 * hash21(gid + 5.1);       // break up the even grid

  float tone = clamp(f.x * mix(0.50, 1.0, f.y) * lower * jitterTone, 0.0, 1.0);
  float rad = sqrt(tone) * 0.50;
  return smoothstep(rad + 0.09, rad - 0.09, length(fract(g) - 0.5));
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);

  vec3 sky = skyRamp(p.y / uRes.y);

  // two screens: a coarse one carries the body, a finer one takes over at
  // the fringe so the dissolve resolves into much smaller dots
  float dC, lC, dF, lF;
  float mC = screen(p, uDot, dC, lC);
  float mF = screen(p, uDot * 0.48, dF, lF);

  float blend = smoothstep(0.20, 0.66, dC);
  float m = mix(mF, mC, blend);
  float lit = mix(lF, lC, blend);
  float density = max(dC, dF);

  vec3 col = sky;
  if (density > 0.002) {
    col = mix(sky, mix(DOT_DARK, DOT_LIT, lit), m);
  }

  gl_FragColor = vec4(col, 1.0);
}
`

// Pitch as a FRACTION of viewport width, not a fixed pixel count, so a
// cloud always spans the same ~33 dots the reference does regardless of
// screen size. A fixed pixel pitch drifts finer as the window grows.
const DOT_FRAC = 4.6 / 1520
const ASPECT = 1281 / 681   // the extracted cloud field

function compile(gl, type, src) {
  const sh = gl.createShader(type)
  gl.shaderSource(sh, src)
  gl.compileShader(sh)
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh))
  return sh
}

export default function DitherSky({ riseRef }) {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    const gl = canvas.getContext('webgl', { alpha: false, antialias: false })
    if (!gl) return

    const prog = gl.createProgram()
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT))
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog))
    gl.useProgram(prog)

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const aPos = gl.getAttribLocation(prog, 'aPos')
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

    const uRes = gl.getUniformLocation(prog, 'uRes')
    const uTime = gl.getUniformLocation(prog, 'uTime')
    const uDot = gl.getUniformLocation(prog, 'uDot')
    const uAspect = gl.getUniformLocation(prog, 'uAspect')
    const uRise = gl.getUniformLocation(prog, 'uRise')
    const uPin = gl.getUniformLocation(prog, 'uPin')
    const uCloudX = gl.getUniformLocation(prog, 'uCloudX')
    const uField = gl.getUniformLocation(prog, 'uField')

    function makeTexture(src) {
      const t = gl.createTexture()
      gl.bindTexture(gl.TEXTURE_2D, t)
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]))
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      const img = new Image()
      img.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, t)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
      }
      img.src = src
      return t
    }

    const tex = makeTexture(fieldSrc)

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0

    function resize() {
      const w = window.innerWidth
      const h = window.innerHeight
      canvas.width = w
      canvas.height = h
      canvas.style.width = w + 'px'
      canvas.style.height = h + 'px'
      gl.viewport(0, 0, w, h)
    }

    function frame(now) {
      gl.uniform2f(uRes, canvas.width, canvas.height)
      gl.uniform1f(uTime, reduced ? 0 : now / 1000)
      gl.uniform1f(uDot, canvas.width * DOT_FRAC)
      gl.uniform1f(uAspect, ASPECT)
      /* With a riseRef the clouds scrub up from the bottom of the frame and
         pass out above it as the section scrolls, then sit pinned. Without one
         (the hero) rise sits mid-travel so the clouds rest exactly where the
         composition wants them, drifting slowly as they always did. */
      gl.uniform1f(uRise, riseRef ? riseRef.current : 0.5)
      gl.uniform1f(uPin, riseRef ? 1 : 0)
      gl.uniform3f(uCloudX, riseRef ? 0.22 : 0.490, riseRef ? 0.78 : 0.785, riseRef ? 0.50 : 0.30)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, tex)
      gl.uniform1i(uField, 0)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      raf = requestAnimationFrame(frame)
    }

    resize()
    window.addEventListener('resize', resize)
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [riseRef])

  return <canvas ref={ref} className="sky-canvas gl" aria-hidden="true" />
}
