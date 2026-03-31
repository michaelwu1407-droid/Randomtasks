'use client';

import { useEffect, useRef, useState } from 'react';
import type React from 'react';

// ─── Config ──────────────────────────────────────────────────────────────────

const RING_RADIUS = 225;
const CARDS_PER_RING = 6;
const CARD_SIZE = 50;
const CONTAINER = 640;
const RIBBON_WIDTH = 36;

interface RingConfig {
  tiltX: number;
  tiltY: number;
  speed: number;
}

// 3 rings: one horizontal, two steep at ~120° apart
const RINGS: RingConfig[] = [
  { tiltX: 22, tiltY: 0,   speed: 0.62 },
  { tiltX: 70, tiltY: -25, speed: 0.52 },
  { tiltX: 70, tiltY: 105, speed: 0.72 },
];

// ─── Brands with logo slugs ─────────────────────────────────────────────────

interface Brand {
  name: string;
  slug: string | null;    // Simple Icons CDN slug (null = text fallback)
  color: string;          // hex colour (no #) for icon + glow
  abbr: string;           // fallback abbreviation
}

const BRANDS: Brand[][] = [
  // Ring 0 — AI model providers
  [
    { name: 'OpenAI',    slug: 'openai',    color: '412991', abbr: 'OAI'  },
    { name: 'Anthropic', slug: 'anthropic', color: 'C96442', abbr: 'ANT'  },
    { name: 'Google',    slug: 'google',    color: '4285F4', abbr: 'G'    },
    { name: 'Meta',      slug: 'meta',      color: '0467DF', abbr: 'META' },
    { name: 'Mistral',   slug: 'mistral',   color: 'FF7000', abbr: 'MIS'  },
    { name: 'DeepSeek',  slug: null,         color: '4D6BFE', abbr: 'DS'   },
  ],
  // Ring 1 — GPU / silicon
  [
    { name: 'NVIDIA',    slug: 'nvidia',    color: '76B900', abbr: 'NV'   },
    { name: 'AMD',       slug: 'amd',       color: 'ED1C24', abbr: 'AMD'  },
    { name: 'Intel',     slug: 'intel',     color: '0071C5', abbr: 'INT'  },
    { name: 'Qualcomm',  slug: 'qualcomm',  color: '3253DC', abbr: 'QLM'  },
    { name: 'Apple',     slug: 'apple',     color: '555555', abbr: 'APL'  },
    { name: 'Samsung',   slug: 'samsung',   color: '1428A0', abbr: 'SAM'  },
  ],
  // Ring 2 — Cloud + tools
  [
    { name: 'AWS',         slug: 'amazonwebservices', color: 'FF9900', abbr: 'AWS' },
    { name: 'Azure',       slug: 'microsoftazure',   color: '0078D4', abbr: 'AZ'  },
    { name: 'GCP',         slug: 'googlecloud',       color: '4285F4', abbr: 'GCP' },
    { name: 'Hugging Face',slug: 'huggingface',       color: 'FF9D00', abbr: 'HF'  },
    { name: 'Microsoft',   slug: 'microsoft',          color: '5E5E5E', abbr: 'MS'  },
    { name: 'Cohere',      slug: null,                  color: '39594D', abbr: 'COH' },
  ],
];

// ─── Brand logo component with fallback ─────────────────────────────────────

function BrandIcon({ brand }: { brand: Brand }) {
  const [failed, setFailed] = useState(false);

  const logoUrl = brand.slug
    ? `https://cdn.simpleicons.org/${brand.slug}/${brand.color}`
    : null;

  return (
    <div className="flex flex-col items-center justify-center w-full h-full gap-1">
      <div className="relative flex items-center justify-center" style={{ width: 24, height: 24 }}>
        {logoUrl && !failed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt=""
            width={22}
            height={22}
            className="object-contain"
            loading="eager"
            onError={() => setFailed(true)}
          />
        ) : (
          <span
            className="text-[13px] font-extrabold leading-none"
            style={{ color: `#${brand.color}` }}
          >
            {brand.abbr}
          </span>
        )}
      </div>
      <span className="text-[6px] text-slate-400 leading-none font-semibold tracking-wide uppercase">
        {brand.name}
      </span>
    </div>
  );
}

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

// ─── Split rings into front/back halves for depth ───────────────────────────

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

// ─── Initial card style ─────────────────────────────────────────────────────

const half = CARD_SIZE / 2;
const INITIAL_CARD_STYLE: React.CSSProperties = {
  transform: 'translate(0px, 0px) scale(0)',
  opacity: '0',
  zIndex: 100,
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function AtomAnimation() {
  const containerRef = useRef<HTMLDivElement>(null);
  const tiltRef      = useRef<HTMLDivElement>(null);
  const anglesRef    = useRef(RINGS.map(() => 0));
  const entranceRef  = useRef(0);

  const cardRefs = useRef<(HTMLDivElement | null)[][]>(
    RINGS.map(() => Array(CARDS_PER_RING).fill(null))
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
          const delay = ri * 0.28 + ci * 0.06;
          const t = Math.max(0, Math.min(1, (entranceRef.current - delay) / 0.85));
          const ease = easeOut(t);
          const curRadius = RING_RADIUS * ease;

          const theta = base + (ci / CARDS_PER_RING) * Math.PI * 2;
          const { x, y, z } = project3D(theta, curRadius, ring.tiltX, ring.tiltY);
          const nz = curRadius > 0 ? z / curRadius : 0;

          // Depth-based scale + opacity
          const scale = (0.42 + (nz + 1) * 0.29) * (0.4 + ease * 0.6);
          const alpha = (0.22 + (nz + 1) * 0.39) * ease;
          const zIdx = nz < 0
            ? Math.round(20 + (nz + 1) * 75)
            : Math.round(120 + nz * 80);

          const card = cardRefs.current[ri][ci];
          if (card) {
            card.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${scale.toFixed(3)})`;
            card.style.opacity = alpha.toFixed(3);
            card.style.zIndex = String(zIdx);
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

  // ── SVG helpers ───────────────────────────────────────────────────────────
  const hc = CONTAINER / 2;
  const vb = `-${hc} -${hc} ${CONTAINER} ${CONTAINER}`;

  const svgDefs = (
    <defs>
      {/* Soft outer glow for the ribbon */}
      <filter id="ribbon-glow" x="-15%" y="-15%" width="130%" height="130%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="glow" />
        <feMerge>
          <feMergeNode in="glow" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      {/* Gradient for ribbon glass feel */}
      <linearGradient id="ribbon-fill-front" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="rgba(160,180,255,0.20)" />
        <stop offset="100%" stopColor="rgba(120,150,255,0.08)" />
      </linearGradient>
      <linearGradient id="ribbon-fill-back" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="rgba(160,180,255,0.08)" />
        <stop offset="100%" stopColor="rgba(120,150,255,0.03)" />
      </linearGradient>
    </defs>
  );

  // Render ribbon: wide stroke = band, thin strokes = edges
  const renderRibbon = (d: string, isFront: boolean) => (
    <g>
      {/* Glow bloom behind ribbon */}
      <path
        d={d}
        fill="none"
        stroke={isFront ? 'rgba(110,140,255,0.18)' : 'rgba(110,140,255,0.07)'}
        strokeWidth={RIBBON_WIDTH + 16}
        strokeLinecap="round"
        filter="url(#ribbon-glow)"
      />
      {/* Ribbon band — wide semi-transparent stroke */}
      <path
        d={d}
        fill="none"
        stroke={isFront ? 'rgba(200,215,255,0.18)' : 'rgba(200,215,255,0.08)'}
        strokeWidth={RIBBON_WIDTH}
        strokeLinecap="round"
      />
      {/* Top edge highlight */}
      <path
        d={d}
        fill="none"
        stroke={isFront ? 'rgba(160,180,255,0.30)' : 'rgba(160,180,255,0.12)'}
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeDashoffset={RIBBON_WIDTH / 2}
      />
    </g>
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
        {/* Ambient radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            zIndex: 0,
            background:
              'radial-gradient(ellipse at 50% 50%, rgba(99,120,255,0.08) 0%, rgba(80,100,255,0.03) 50%, transparent 72%)',
          }}
        />

        {/* ── Back ribbon halves ── */}
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{ zIndex: 10, overflow: 'visible' }}
          viewBox={vb}
          width={CONTAINER}
          height={CONTAINER}
        >
          {svgDefs}
          {RINGS.map((_, ri) => (
            <g key={`back-${ri}`}>
              {renderRibbon(RING_HALVES[ri].back, false)}
            </g>
          ))}
        </svg>

        {/* ── Brand cards ── */}
        {RINGS.map((_, ri) =>
          BRANDS[ri].map((brand, ci) => (
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
              {/* Coloured glow aura behind the card */}
              <div
                className="absolute pointer-events-none rounded-full"
                style={{
                  inset: -10,
                  background: `radial-gradient(circle, rgba(${parseInt(brand.color.slice(0,2),16)},${parseInt(brand.color.slice(2,4),16)},${parseInt(brand.color.slice(4,6),16)},0.18) 0%, transparent 70%)`,
                  filter: 'blur(8px)',
                }}
              />
              {/* Card face — glassmorphism */}
              <div
                className="relative w-full h-full rounded-xl flex items-center justify-center
                           transition-all duration-200 group-hover:scale-[1.25]"
                style={{
                  background: 'rgba(255,255,255,0.75)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  border: '1px solid rgba(180,195,255,0.30)',
                  boxShadow:
                    '0 2px 16px rgba(80,100,255,0.08), 0 0 0 0.5px rgba(255,255,255,0.8) inset',
                }}
              >
                <BrandIcon brand={brand} />
              </div>
              {/* Tooltip */}
              <div
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2
                           px-2.5 py-1 rounded-md text-[10px] font-semibold
                           whitespace-nowrap pointer-events-none opacity-0
                           group-hover:opacity-100 transition-opacity duration-150
                           bg-slate-900 text-white shadow-xl"
                style={{ zIndex: 1000 }}
              >
                {brand.name}
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
              width: 92,
              height: 92,
              borderRadius: '50%',
              background:
                'linear-gradient(135deg, #1e40af 0%, #2563eb 35%, #3b82f6 70%, #60a5fa 100%)',
              animation: 'nucleusPulse 2.8s ease-in-out infinite',
            }}
          >
            {/* Specular highlight */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background:
                  'radial-gradient(ellipse at 38% 30%, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.05) 50%, transparent 75%)',
              }}
            />
            {/* Outer halo */}
            <div
              className="absolute rounded-full"
              style={{
                inset: -10,
                border: '1.5px solid rgba(59,130,246,0.22)',
                borderRadius: '50%',
              }}
            />
            {/* Second outer halo — very faint */}
            <div
              className="absolute rounded-full"
              style={{
                inset: -20,
                border: '1px solid rgba(59,130,246,0.10)',
                borderRadius: '50%',
              }}
            />
            {/* X */}
            <span
              className="relative text-white font-black"
              style={{
                fontSize: 44,
                lineHeight: 1,
                fontFamily: 'Inter, sans-serif',
                letterSpacing: '-0.04em',
                textShadow:
                  '0 0 24px rgba(255,255,255,0.9), 0 0 8px rgba(255,255,255,0.5), 0 2px 6px rgba(0,0,0,0.15)',
              }}
            >
              X
            </span>
          </div>
        </div>

        {/* ── Front ribbon halves ── */}
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{ zIndex: 110, overflow: 'visible' }}
          viewBox={vb}
          width={CONTAINER}
          height={CONTAINER}
        >
          {svgDefs}
          {RINGS.map((_, ri) => (
            <g key={`front-${ri}`}>
              {renderRibbon(RING_HALVES[ri].front, true)}
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
