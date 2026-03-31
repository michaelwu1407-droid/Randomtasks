'use client';

import { useEffect, useRef } from 'react';

// ─── Config ──────────────────────────────────────────────────────────────────

const RING_RADIUS = 148;
const CARDS_PER_RING = 6;
const CARD_SIZE = 52;

interface RingConfig {
  tiltX: number; // degrees — tilt from horizontal plane
  tiltY: number; // degrees — rotation around vertical axis
  speed: number; // radians / second
  color: string;
}

const RINGS: RingConfig[] = [
  { tiltX: 14,  tiltY: 0,   speed:  0.48, color: '#3b82f6' },
  { tiltX: 70,  tiltY: 0,   speed:  0.40, color: '#6366f1' },
  { tiltX: 70,  tiltY: 36,  speed:  0.55, color: '#8b5cf6' },
  { tiltX: 70,  tiltY: 72,  speed:  0.35, color: '#06b6d4' },
  { tiltX: 70,  tiltY: 108, speed:  0.50, color: '#0ea5e9' },
];

// ─── Model data ───────────────────────────────────────────────────────────────

interface Model {
  name: string;
  abbr: string;
  bg: string;
}

const MODELS: Model[][] = [
  // Ring 0 — Major AI Labs
  [
    { name: 'OpenAI',     abbr: 'OAI',  bg: '#1a1a1a' },
    { name: 'Anthropic',  abbr: 'ANT',  bg: '#C46D3F' },
    { name: 'Gemini',     abbr: 'GEM',  bg: '#4285F4' },
    { name: 'Meta',       abbr: 'META', bg: '#0668E1' },
    { name: 'Mistral',    abbr: 'MIS',  bg: '#F97316' },
    { name: 'Cohere',     abbr: 'COH',  bg: '#2D6A4F' },
  ],
  // Ring 1 — GPU / Silicon
  [
    { name: 'NVIDIA',     abbr: 'NV',   bg: '#76B900' },
    { name: 'AMD',        abbr: 'AMD',  bg: '#ED1C24' },
    { name: 'Intel',      abbr: 'INT',  bg: '#0071C5' },
    { name: 'Qualcomm',   abbr: 'QLM',  bg: '#3253DC' },
    { name: 'Apple',      abbr: 'APL',  bg: '#555555' },
    { name: 'Samsung',    abbr: 'SAM',  bg: '#1428A0' },
  ],
  // Ring 2 — Cloud Providers
  [
    { name: 'AWS',        abbr: 'AWS',  bg: '#FF9900' },
    { name: 'Azure',      abbr: 'AZ',   bg: '#0078D4' },
    { name: 'GCP',        abbr: 'GCP',  bg: '#34A853' },
    { name: 'IBM',        abbr: 'IBM',  bg: '#1F70C1' },
    { name: 'Oracle',     abbr: 'ORA',  bg: '#C74634' },
    { name: 'HuggFace',   abbr: 'HF',   bg: '#FF9D00' },
  ],
  // Ring 3 — Open Source & Startups
  [
    { name: 'DeepSeek',   abbr: 'DS',   bg: '#4D6BFE' },
    { name: 'Stability',  abbr: 'STB',  bg: '#7C3AED' },
    { name: 'xAI',        abbr: 'xAI',  bg: '#111111' },
    { name: 'Perplexity', abbr: 'PPX',  bg: '#1CB5C9' },
    { name: 'Qwen',       abbr: 'QWN',  bg: '#F97316' },
    { name: 'Baidu',      abbr: 'BAI',  bg: '#2F54EB' },
  ],
  // Ring 4 — More AI / Hardware
  [
    { name: 'Microsoft',  abbr: 'MS',   bg: '#00A4EF' },
    { name: 'Falcon',     abbr: 'FAL',  bg: '#7B5E3A' },
    { name: 'Gemma',      abbr: 'GMM',  bg: '#EA4335' },
    { name: 'LLaMA',      abbr: 'LLA',  bg: '#0467DF' },
    { name: 'Runway',     abbr: 'RWY',  bg: '#222222' },
    { name: 'MediaTek',   abbr: 'MTK',  bg: '#CC0000' },
  ],
];

// ─── 3-D Math ─────────────────────────────────────────────────────────────────
//
// Each ring lies in the XZ plane, centred at origin, radius = RING_RADIUS.
// We first rotate the ring around the X axis (tiltX), then around the Y axis
// (tiltY) to spread the five rings into different orbital planes, just like a
// Bohr model viewed slightly off-axis.

function project3D(
  theta: number,
  radius: number,
  tiltX: number,
  tiltY: number,
): { x: number; y: number; z: number } {
  const ax = (tiltX * Math.PI) / 180;
  const ay = (tiltY * Math.PI) / 180;

  // Point on a flat ring in the XZ plane
  const x0 = radius * Math.cos(theta);
  const z0 = radius * Math.sin(theta);

  // RotateX(ax) — y was 0, so simplifies to:
  const y1 = -z0 * Math.sin(ax);
  const z1 =  z0 * Math.cos(ax);

  // RotateY(ay)
  const x2 =  x0 * Math.cos(ay) + z1 * Math.sin(ay);
  const y2 = y1;
  const z2 = -x0 * Math.sin(ay) + z1 * Math.cos(ay);

  return { x: x2, y: y2, z: z2 };
}

// Pre-compute static ring SVG path strings (shapes never change)
const RING_SVG_PATHS = RINGS.map((ring) => {
  const pts: string[] = [];
  for (let i = 0; i <= 128; i++) {
    const theta = (i / 128) * Math.PI * 2;
    const { x, y } = project3D(theta, RING_RADIUS, ring.tiltX, ring.tiltY);
    pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return `M ${pts.join(' L ')}`;
});

// Pre-compute initial card styles so there is zero layout flash on first paint
const half = CARD_SIZE / 2;
const INITIAL_CARD_STYLES = RINGS.map((ring, ri) =>
  Array.from({ length: CARDS_PER_RING }, (_, ci) => {
    const theta = (ci / CARDS_PER_RING) * Math.PI * 2;
    const { x, y, z } = project3D(theta, RING_RADIUS, ring.tiltX, ring.tiltY);
    const nz = z / RING_RADIUS;
    return {
      transform: `translate(${(x - half).toFixed(1)}px, ${(y - half).toFixed(1)}px) scale(${(0.62 + (nz + 1) * 0.19).toFixed(3)})`,
      opacity: (0.5 + (nz + 1) * 0.25).toFixed(3),
      zIndex: Math.round(nz * 100 + 100),
    } as React.CSSProperties;
  })
);

// Need React for CSSProperties type — import it as a type
import type React from 'react';

// ─── Component ────────────────────────────────────────────────────────────────

export default function AtomAnimation() {
  const containerRef  = useRef<HTMLDivElement>(null);
  const tiltRef       = useRef<HTMLDivElement>(null);
  const anglesRef     = useRef<number[]>(RINGS.map(() => 0));

  // 2-D array of refs: cardRefs[ring][card]
  const cardRefs = useRef<(HTMLDivElement | null)[][]>(
    RINGS.map(() => new Array(CARDS_PER_RING).fill(null) as null[])
  );

  // ── Animation loop ──────────────────────────────────────────────────────────
  useEffect(() => {
    let raf: number;
    let last = performance.now();

    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      RINGS.forEach((ring, ri) => {
        anglesRef.current[ri] += ring.speed * dt;
        const base = anglesRef.current[ri];

        for (let ci = 0; ci < CARDS_PER_RING; ci++) {
          const card = cardRefs.current[ri][ci];
          if (!card) continue;

          const theta = base + (ci / CARDS_PER_RING) * Math.PI * 2;
          const { x, y, z } = project3D(theta, RING_RADIUS, ring.tiltX, ring.tiltY);

          const nz    = z / RING_RADIUS;                      // –1 → +1
          const scale = (0.62 + (nz + 1) * 0.19).toFixed(3); // 0.62 → 1.00
          const alpha = (0.50 + (nz + 1) * 0.25).toFixed(3); // 0.50 → 1.00
          const zIdx  = Math.round(nz * 100 + 100);           //   0 → 200

          // Bypass React — write to DOM directly for 60 fps
          card.style.transform = `translate(${(x - half).toFixed(1)}px, ${(y - half).toFixed(1)}px) scale(${scale})`;
          card.style.opacity   = alpha;
          card.style.zIndex    = String(zIdx);
        }
      });

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // ── Mouse parallax tilt ─────────────────────────────────────────────────────
  useEffect(() => {
    const el     = containerRef.current;
    const tiltEl = tiltRef.current;
    if (!el || !tiltEl) return;

    const onMove = (e: MouseEvent) => {
      const r  = el.getBoundingClientRect();
      const mx = (e.clientX - r.left  - r.width  / 2) / (r.width  / 2);
      const my = (e.clientY - r.top   - r.height / 2) / (r.height / 2);
      tiltEl.style.transition = 'none';
      tiltEl.style.transform  = `perspective(900px) rotateY(${(mx * 12).toFixed(2)}deg) rotateX(${(-my * 12).toFixed(2)}deg)`;
    };

    const onLeave = () => {
      tiltEl.style.transition = 'transform 0.6s cubic-bezier(0.23, 1, 0.32, 1)';
      tiltEl.style.transform  = 'perspective(900px) rotateY(0deg) rotateX(0deg)';
    };

    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className="relative select-none"
      style={{ width: 420, height: 420 }}
    >
      <div
        ref={tiltRef}
        className="relative w-full h-full"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Radial ambient glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 50% 50%, rgba(59,130,246,0.10) 0%, rgba(99,102,241,0.04) 45%, transparent 72%)',
          }}
        />

        {/* SVG orbital ring paths */}
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{ overflow: 'visible' }}
          viewBox="-210 -210 420 420"
          width="420"
          height="420"
        >
          {RINGS.map((ring, ri) => (
            <path
              key={ri}
              d={RING_SVG_PATHS[ri]}
              fill="none"
              stroke={ring.color}
              strokeWidth="1.2"
              strokeOpacity="0.22"
              strokeDasharray="5 4"
            />
          ))}
        </svg>

        {/* Cards — positioned relative to atom centre */}
        <div className="absolute inset-0" style={{ overflow: 'visible' }}>
          {RINGS.map((ring, ri) =>
            MODELS[ri].map((model, ci) => (
              <div
                key={`${ri}-${ci}`}
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
                  ...INITIAL_CARD_STYLES[ri][ci],
                }}
              >
                {/* Card face */}
                <div
                  className="w-full h-full rounded-xl flex flex-col items-center justify-center border border-white/25 transition-transform duration-150 group-hover:scale-125 group-hover:border-white/60"
                  style={{
                    background: `linear-gradient(140deg, ${model.bg}f0 0%, ${model.bg}b0 100%)`,
                    boxShadow: `0 4px 16px ${model.bg}50, 0 1px 3px rgba(0,0,0,0.25)`,
                    backdropFilter: 'blur(6px)',
                  }}
                >
                  <span className="text-white text-[11px] font-bold leading-none tracking-tight">
                    {model.abbr}
                  </span>
                  <span className="text-white/70 text-[7px] mt-1 leading-none font-medium">
                    {model.name}
                  </span>
                </div>

                {/* Hover tooltip */}
                <div
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                  style={{
                    background: 'rgba(15,23,42,0.92)',
                    color: '#f1f5f9',
                    zIndex: 1000,
                    backdropFilter: 'blur(8px)',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  {model.name}
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── Nucleus ── */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ zIndex: 150 }}
        >
          <div
            className="relative flex items-center justify-center"
            style={{
              width: 82,
              height: 82,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 40%, #3b82f6 75%, #60a5fa 100%)',
              animation: 'nucleusPulse 2.8s ease-in-out infinite',
            }}
          >
            {/* Specular inner highlight */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background:
                  'radial-gradient(ellipse at 38% 32%, rgba(255,255,255,0.30) 0%, rgba(255,255,255,0.05) 55%, transparent 75%)',
              }}
            />
            {/* Outer soft ring */}
            <div
              className="absolute rounded-full"
              style={{
                inset: -6,
                border: '1.5px solid rgba(59,130,246,0.35)',
                borderRadius: '50%',
              }}
            />
            {/* The X mark */}
            <span
              className="relative text-white font-black"
              style={{
                fontSize: 38,
                lineHeight: 1,
                fontFamily: 'Inter, sans-serif',
                letterSpacing: '-0.04em',
                textShadow:
                  '0 0 18px rgba(255,255,255,0.95), 0 0 6px rgba(255,255,255,0.6), 0 2px 6px rgba(0,0,0,0.25)',
              }}
            >
              X
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
