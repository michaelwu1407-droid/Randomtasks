'use client';

import { useEffect, useRef } from 'react';
import type React from 'react';

// ─── Config ──────────────────────────────────────────────────────────────────

const RING_RADIUS = 230;
const CARDS_PER_RING = 6;
const CARD_SIZE = 48;
const CONTAINER = 640;
const TRAIL_COUNT = 5;
const TRAIL_SPACING = 0.13; // radians between trail dots

interface RingConfig {
  tiltX: number;
  tiltY: number;
  speed: number;
}

// 3 rings like the reference: one wide horizontal, two steep at ~120° apart
const RINGS: RingConfig[] = [
  { tiltX: 22, tiltY: 0,   speed: 0.38 },  // wide horizontal ellipse
  { tiltX: 70, tiltY: -25, speed: 0.33 },  // steep, tilted left
  { tiltX: 70, tiltY: 105, speed: 0.44 },  // steep, tilted right
];

// ─── Models (18 total) ──────────────────────────────────────────────────────

interface Model { name: string; abbr: string }

const MODELS: Model[][] = [
  [
    { name: 'OpenAI',    abbr: 'OAI'  },
    { name: 'Anthropic', abbr: 'ANT'  },
    { name: 'Gemini',    abbr: 'GEM'  },
    { name: 'Meta',      abbr: 'META' },
    { name: 'Mistral',   abbr: 'MIS'  },
    { name: 'DeepSeek',  abbr: 'DS'   },
  ],
  [
    { name: 'NVIDIA',    abbr: 'NV'   },
    { name: 'AMD',       abbr: 'AMD'  },
    { name: 'Intel',     abbr: 'INT'  },
    { name: 'Qualcomm',  abbr: 'QLM'  },
    { name: 'Apple',     abbr: 'APL'  },
    { name: 'Samsung',   abbr: 'SAM'  },
  ],
  [
    { name: 'AWS',       abbr: 'AWS'  },
    { name: 'Azure',     abbr: 'AZ'   },
    { name: 'GCP',       abbr: 'GCP'  },
    { name: 'HuggFace',  abbr: 'HF'   },
    { name: 'Microsoft', abbr: 'MS'   },
    { name: 'Cohere',    abbr: 'COH'  },
  ],
];

// ─── 3D Projection ──────────────────────────────────────────────────────────

function project3D(theta: number, radius: number, tiltX: number, tiltY: number) {
  const ax = (tiltX * Math.PI) / 180;
  const ay = (tiltY * Math.PI) / 180;
  const x0 = radius * Math.cos(theta);
  const z0 = radius * Math.sin(theta);
  const y1 = -z0 * Math.sin(ax);
  const z1 =  z0 * Math.cos(ax);
  return {
    x:  x0 * Math.cos(ay) + z1 * Math.sin(ay),
    y:  y1,
    z: -x0 * Math.sin(ay) + z1 * Math.cos(ay),
  };
}

// ─── Split each ring into front (z>=0) and back (z<0) halves ────────────────

function splitRing(ring: RingConfig, radius: number) {
  const N = 256;
  const points: { x: number; y: number; z: number }[] = [];
  for (let i = 0; i <= N; i++) {
    points.push(project3D((i / N) * Math.PI * 2, radius, ring.tiltX, ring.tiltY));
  }

  const frontSegs: string[][] = [];
  const backSegs: string[][] = [];
  let seg: string[] = [];
  let wasFront = points[0].z >= 0;
  seg.push(`${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`);

  for (let i = 1; i <= N; i++) {
    const p = points[i];
    const isFront = p.z >= 0;
    const pt = `${p.x.toFixed(1)},${p.y.toFixed(1)}`;

    if (isFront !== wasFront) {
      seg.push(pt);
      (wasFront ? frontSegs : backSegs).push(seg);
      seg = [pt];
      wasFront = isFront;
    } else {
      seg.push(pt);
    }
  }
  if (seg.length > 1) (wasFront ? frontSegs : backSegs).push(seg);

  const toD = (segs: string[][]) => segs.map(s => `M ${s.join(' L ')}`).join(' ');
  return { front: toD(frontSegs), back: toD(backSegs) };
}

const RING_HALVES = RINGS.map(r => splitRing(r, RING_RADIUS));

// ─── Initial card positions (no flash) ──────────────────────────────────────

const half = CARD_SIZE / 2;

// Cards start at center with scale 0 (entrance animation brings them out)
const INITIAL_CARD_STYLE: React.CSSProperties = {
  transform: `translate(0px, 0px) scale(0)`,
  opacity: '0',
  zIndex: 100,
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function AtomAnimation() {
  const containerRef = useRef<HTMLDivElement>(null);
  const tiltRef      = useRef<HTMLDivElement>(null);
  const anglesRef    = useRef(RINGS.map(() => 0));
  const entranceRef  = useRef(0); // seconds elapsed since mount

  // Card refs: [ring][card]
  const cardRefs = useRef<(HTMLDivElement | null)[][]>(
    RINGS.map(() => Array(CARDS_PER_RING).fill(null))
  );
  // Trail refs: [ring][card][trailIndex]
  const trailRefs = useRef<(HTMLDivElement | null)[][][](
    RINGS.map(() =>
      Array.from({ length: CARDS_PER_RING }, () => Array(TRAIL_COUNT).fill(null))
    )
  );

  // ── Animation loop ────────────────────────────────────────────────────────
  useEffect(() => {
    let raf: number;
    let last = performance.now();

    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      entranceRef.current += dt;

      RINGS.forEach((ring, ri) => {
        anglesRef.current[ri] += ring.speed * dt;
        const base = anglesRef.current[ri];

        for (let ci = 0; ci < CARDS_PER_RING; ci++) {
          // Entrance: staggered fly-out from center
          const delay = ri * 0.3 + ci * 0.07;
          const t = Math.max(0, Math.min(1, (entranceRef.current - delay) / 0.9));
          const ease = easeOut(t);
          const curRadius = RING_RADIUS * ease;

          const theta = base + (ci / CARDS_PER_RING) * Math.PI * 2;
          const { x, y, z } = project3D(theta, curRadius, ring.tiltX, ring.tiltY);
          const nz = curRadius > 0 ? z / curRadius : 0;

          // Depth-based scale + opacity
          const scale = (0.55 + (nz + 1) * 0.225) * (0.4 + ease * 0.6);
          const alpha = (0.35 + (nz + 1) * 0.325) * ease;
          // z-index: behind cards 20–95, in-front cards 120–200
          const zIdx = nz < 0
            ? Math.round(20 + (nz + 1) * 75)
            : Math.round(120 + nz * 80);

          const card = cardRefs.current[ri][ci];
          if (card) {
            card.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${scale.toFixed(3)})`;
            card.style.opacity = alpha.toFixed(3);
            card.style.zIndex = String(zIdx);
          }

          // Trail dots — only show once entrance is underway
          const trailFade = Math.max(0, (ease - 0.4) / 0.6);
          for (let ti = 0; ti < TRAIL_COUNT; ti++) {
            const trail = trailRefs.current[ri]?.[ci]?.[ti];
            if (!trail) continue;

            const trailTheta = theta - (ti + 1) * TRAIL_SPACING;
            const tp = project3D(trailTheta, curRadius, ring.tiltX, ring.tiltY);
            const tnz = curRadius > 0 ? tp.z / curRadius : 0;
            const falloff = 1 - (ti + 1) / (TRAIL_COUNT + 1);
            const tAlpha = (0.25 + (tnz + 1) * 0.15) * falloff * trailFade;
            const tScale = (0.4 + (tnz + 1) * 0.15) * falloff;
            const tZIdx = (tnz < 0
              ? Math.round(20 + (tnz + 1) * 75)
              : Math.round(120 + tnz * 80)) - 1;

            trail.style.transform = `translate(${tp.x.toFixed(1)}px, ${tp.y.toFixed(1)}px) scale(${tScale.toFixed(3)})`;
            trail.style.opacity = tAlpha.toFixed(3);
            trail.style.zIndex = String(tZIdx);
          }
        }
      });

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // ── Mouse parallax ────────────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    const tiltEl = tiltRef.current;
    if (!el || !tiltEl) return;

    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const mx = (e.clientX - r.left - r.width / 2) / (r.width / 2);
      const my = (e.clientY - r.top - r.height / 2) / (r.height / 2);
      tiltEl.style.transition = 'none';
      tiltEl.style.transform =
        `perspective(900px) rotateY(${(mx * 10).toFixed(2)}deg) rotateX(${(-my * 10).toFixed(2)}deg)`;
    };

    const onLeave = () => {
      tiltEl.style.transition = 'transform 0.6s cubic-bezier(0.23, 1, 0.32, 1)';
      tiltEl.style.transform = 'perspective(900px) rotateY(0deg) rotateX(0deg)';
    };

    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────
  const hc = CONTAINER / 2;
  const vb = `-${hc} -${hc} ${CONTAINER} ${CONTAINER}`;

  const ringStrokeFilter = (
    <filter id="tube" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="1" stdDeviation="1.2" floodColor="rgba(0,0,0,0.18)" />
    </filter>
  );

  return (
    <div
      ref={containerRef}
      className="relative select-none"
      style={{ width: CONTAINER, height: CONTAINER }}
    >
      <div
        ref={tiltRef}
        className="relative w-full h-full"
        style={{ transform: 'perspective(900px)' }}
      >
        {/* Ambient glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            zIndex: 0,
            background:
              'radial-gradient(circle at 50% 50%, rgba(59,130,246,0.06) 0%, transparent 60%)',
          }}
        />

        {/* ── Back ring halves ── */}
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{ zIndex: 10, overflow: 'visible' }}
          viewBox={vb}
          width={CONTAINER}
          height={CONTAINER}
        >
          <defs>{ringStrokeFilter}</defs>
          {RINGS.map((_, ri) => (
            <g key={`back-${ri}`}>
              <path
                d={RING_HALVES[ri].back}
                fill="none"
                stroke="#b0b0b0"
                strokeWidth="3"
                strokeLinecap="round"
                filter="url(#tube)"
              />
              {/* Highlight pass for tube effect */}
              <path
                d={RING_HALVES[ri].back}
                fill="none"
                stroke="rgba(255,255,255,0.35)"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </g>
          ))}
        </svg>

        {/* ── Trail dots ── */}
        {RINGS.map((_, ri) =>
          MODELS[ri].map((_, ci) =>
            Array.from({ length: TRAIL_COUNT }, (_, ti) => (
              <div
                key={`t-${ri}-${ci}-${ti}`}
                ref={(el) => {
                  if (trailRefs.current[ri]?.[ci]) {
                    trailRefs.current[ri][ci][ti] = el;
                  }
                }}
                className="absolute rounded-full pointer-events-none"
                style={{
                  top: '50%',
                  left: '50%',
                  width: 14,
                  height: 14,
                  marginTop: -7,
                  marginLeft: -7,
                  background:
                    'radial-gradient(circle, rgba(59,130,246,0.6) 0%, rgba(59,130,246,0.15) 60%, transparent 100%)',
                  willChange: 'transform, opacity',
                  opacity: 0,
                }}
              />
            ))
          )
        )}

        {/* ── Cards ── */}
        {RINGS.map((_, ri) =>
          MODELS[ri].map((model, ci) => (
            <div
              key={`c-${ri}-${ci}`}
              ref={(el) => { cardRefs.current[ri][ci] = el; }}
              className="absolute group"
              style={{
                top: '50%',
                left: '50%',
                width: CARD_SIZE,
                height: CARD_SIZE,
                marginTop: -half,
                marginLeft: -half,
                willChange: 'transform, opacity',
                cursor: 'default',
                ...INITIAL_CARD_STYLE,
              }}
            >
              <div
                className="w-full h-full rounded-lg flex flex-col items-center justify-center
                           bg-white border border-gray-200/80
                           shadow-[0_2px_10px_rgba(0,0,0,0.08)]
                           transition-transform duration-150
                           group-hover:scale-[1.35]
                           group-hover:shadow-[0_6px_24px_rgba(59,130,246,0.25)]
                           group-hover:border-blue-300"
              >
                <span className="text-[11px] font-bold text-gray-800 leading-none tracking-tight">
                  {model.abbr}
                </span>
                <span className="text-[7px] text-gray-400 mt-0.5 leading-none font-medium">
                  {model.name}
                </span>
              </div>
              {/* Tooltip */}
              <div
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2
                           px-2.5 py-1 rounded-md text-[10px] font-semibold
                           whitespace-nowrap pointer-events-none opacity-0
                           group-hover:opacity-100 transition-opacity duration-150
                           bg-gray-900 text-white shadow-lg"
                style={{ zIndex: 1000 }}
              >
                {model.name}
              </div>
            </div>
          ))
        )}

        {/* ── Nucleus ── */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ zIndex: 100 }}
        >
          <div
            className="relative flex items-center justify-center"
            style={{
              width: 90,
              height: 90,
              borderRadius: '50%',
              background:
                'linear-gradient(135deg, #1e40af 0%, #2563eb 40%, #3b82f6 75%, #60a5fa 100%)',
              animation: 'nucleusPulse 2.8s ease-in-out infinite',
            }}
          >
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background:
                  'radial-gradient(ellipse at 38% 32%, rgba(255,255,255,0.30) 0%, rgba(255,255,255,0.05) 55%, transparent 75%)',
              }}
            />
            <div
              className="absolute rounded-full"
              style={{
                inset: -8,
                border: '1.5px solid rgba(59,130,246,0.28)',
                borderRadius: '50%',
              }}
            />
            <span
              className="relative text-white font-black"
              style={{
                fontSize: 42,
                lineHeight: 1,
                fontFamily: 'Inter, sans-serif',
                letterSpacing: '-0.04em',
                textShadow:
                  '0 0 20px rgba(255,255,255,0.9), 0 0 6px rgba(255,255,255,0.5), 0 2px 6px rgba(0,0,0,0.2)',
              }}
            >
              X
            </span>
          </div>
        </div>

        {/* ── Front ring halves ── */}
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{ zIndex: 110, overflow: 'visible' }}
          viewBox={vb}
          width={CONTAINER}
          height={CONTAINER}
        >
          <defs>{ringStrokeFilter}</defs>
          {RINGS.map((_, ri) => (
            <g key={`front-${ri}`}>
              <path
                d={RING_HALVES[ri].front}
                fill="none"
                stroke="#b0b0b0"
                strokeWidth="3"
                strokeLinecap="round"
                filter="url(#tube)"
              />
              <path
                d={RING_HALVES[ri].front}
                fill="none"
                stroke="rgba(255,255,255,0.35)"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
