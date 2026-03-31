'use client';

import { useEffect, useRef } from 'react';
import type React from 'react';

// ─── Config ──────────────────────────────────────────────────────────────────

const RING_RADIUS = 220;
const CARDS_PER_RING = 6;
const CARD_SIZE = 44;
const CONTAINER = 620;

interface RingConfig {
  tiltX: number; // degrees — tilt from horizontal
  tiltY: number; // degrees — rotation around vertical axis
  speed: number; // radians / second
}

// Real atom feel: rings at genuinely different angles so they fan out in
// all directions — some nearly horizontal, some diagonal, some steep.
const RINGS: RingConfig[] = [
  { tiltX: 20,  tiltY: 90,  speed: 0.42 },   // nearly horizontal
  { tiltX: 55,  tiltY: 0,   speed: 0.38 },   // moderate tilt forward
  { tiltX: 55,  tiltY: 120, speed: 0.48 },   // moderate tilt, rotated
  { tiltX: 80,  tiltY: 50,  speed: 0.35 },   // steep, angled
  { tiltX: 80,  tiltY: 155, speed: 0.45 },   // steep, opposite side
];

const RING_COLOR = 'rgba(99, 130, 220, 0.28)';

// ─── Model data — uniform white cards ────────────────────────────────────────

interface Model { name: string; abbr: string }

const MODELS: Model[][] = [
  // Ring 0 — AI Labs
  [
    { name: 'OpenAI',     abbr: 'OAI'  },
    { name: 'Anthropic',  abbr: 'ANT'  },
    { name: 'Gemini',     abbr: 'GEM'  },
    { name: 'Meta',       abbr: 'META' },
    { name: 'Mistral',    abbr: 'MIS'  },
    { name: 'Cohere',     abbr: 'COH'  },
  ],
  // Ring 1 — GPU / Silicon
  [
    { name: 'NVIDIA',     abbr: 'NV'   },
    { name: 'AMD',        abbr: 'AMD'  },
    { name: 'Intel',      abbr: 'INT'  },
    { name: 'Qualcomm',   abbr: 'QLM'  },
    { name: 'Apple',      abbr: 'APL'  },
    { name: 'Samsung',    abbr: 'SAM'  },
  ],
  // Ring 2 — Cloud
  [
    { name: 'AWS',        abbr: 'AWS'  },
    { name: 'Azure',      abbr: 'AZ'   },
    { name: 'GCP',        abbr: 'GCP'  },
    { name: 'IBM',        abbr: 'IBM'  },
    { name: 'Oracle',     abbr: 'ORA'  },
    { name: 'HuggFace',   abbr: 'HF'   },
  ],
  // Ring 3 — Open Source
  [
    { name: 'DeepSeek',   abbr: 'DS'   },
    { name: 'Stability',  abbr: 'STB'  },
    { name: 'xAI',        abbr: 'xAI'  },
    { name: 'Perplexity', abbr: 'PPX'  },
    { name: 'Qwen',       abbr: 'QWN'  },
    { name: 'Baidu',      abbr: 'BAI'  },
  ],
  // Ring 4 — More
  [
    { name: 'Microsoft',  abbr: 'MS'   },
    { name: 'Falcon',     abbr: 'FAL'  },
    { name: 'Gemma',      abbr: 'GMM'  },
    { name: 'LLaMA',      abbr: 'LLA'  },
    { name: 'Runway',     abbr: 'RWY'  },
    { name: 'MediaTek',   abbr: 'MTK'  },
  ],
];

// ─── 3-D projection ─────────────────────────────────────────────────────────
//
// Point on a flat ring in XZ → rotateX(tiltX) → rotateY(tiltY)
// Then project to screen: x → screen-x, y → screen-y, z → depth / z-index.

function project3D(theta: number, radius: number, tiltX: number, tiltY: number) {
  const ax = (tiltX * Math.PI) / 180;
  const ay = (tiltY * Math.PI) / 180;

  const x0 = radius * Math.cos(theta);
  const z0 = radius * Math.sin(theta);

  // RotateX (y was 0)
  const y1 = -z0 * Math.sin(ax);
  const z1 =  z0 * Math.cos(ax);

  // RotateY
  const x2 =  x0 * Math.cos(ay) + z1 * Math.sin(ay);
  const y2 = y1;
  const z2 = -x0 * Math.sin(ay) + z1 * Math.cos(ay);

  return { x: x2, y: y2, z: z2 };
}

// Pre-compute static ring SVG paths
const RING_SVG_PATHS = RINGS.map((ring) => {
  const pts: string[] = [];
  for (let i = 0; i <= 128; i++) {
    const theta = (i / 128) * Math.PI * 2;
    const { x, y } = project3D(theta, RING_RADIUS, ring.tiltX, ring.tiltY);
    pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return `M ${pts.join(' L ')}`;
});

// Pre-compute initial card positions (so there's no flash on first paint)
const INITIAL_STYLES = RINGS.map((ring, ri) =>
  Array.from({ length: CARDS_PER_RING }, (_, ci) => {
    const theta = (ci / CARDS_PER_RING) * Math.PI * 2;
    const { x, y, z } = project3D(theta, RING_RADIUS, ring.tiltX, ring.tiltY);
    const nz = z / RING_RADIUS;
    return {
      transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${(0.55 + (nz + 1) * 0.225).toFixed(3)})`,
      opacity: String(0.35 + (nz + 1) * 0.325),
      zIndex: Math.round(nz * 100 + 100),
    } as React.CSSProperties;
  })
);

// ─── Component ────────────────────────────────────────────────────────────────

export default function AtomAnimation() {
  const containerRef = useRef<HTMLDivElement>(null);
  const tiltRef      = useRef<HTMLDivElement>(null);
  const anglesRef    = useRef<number[]>(RINGS.map(() => 0));
  const cardRefs     = useRef<(HTMLDivElement | null)[][]>(
    RINGS.map(() => new Array(CARDS_PER_RING).fill(null) as null[])
  );

  // ── Animation loop ─────────────────────────────────────────────────────────
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

          const nz    = z / RING_RADIUS;                          // –1 → +1
          const scale = (0.55 + (nz + 1) * 0.225).toFixed(3);    //  0.55 → 1.0
          const alpha = (0.35 + (nz + 1) * 0.325).toFixed(3);    //  0.35 → 1.0
          const zIdx  = Math.round(nz * 100 + 100);               //  0 → 200

          card.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${scale})`;
          card.style.opacity   = alpha;
          card.style.zIndex    = String(zIdx);
        }
      });

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // ── Mouse parallax ─────────────────────────────────────────────────────────
  useEffect(() => {
    const el     = containerRef.current;
    const tiltEl = tiltRef.current;
    if (!el || !tiltEl) return;

    const onMove = (e: MouseEvent) => {
      const r  = el.getBoundingClientRect();
      const mx = (e.clientX - r.left - r.width  / 2) / (r.width  / 2);
      const my = (e.clientY - r.top  - r.height / 2) / (r.height / 2);
      tiltEl.style.transition = 'none';
      tiltEl.style.transform  =
        `perspective(900px) rotateY(${(mx * 10).toFixed(2)}deg) rotateX(${(-my * 10).toFixed(2)}deg)`;
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

  // ── Render ─────────────────────────────────────────────────────────────────
  const half     = CARD_SIZE / 2;
  const halfC    = CONTAINER / 2;
  const svgView  = `-${halfC} -${halfC} ${CONTAINER} ${CONTAINER}`;

  return (
    <div
      ref={containerRef}
      className="relative select-none"
      style={{ width: CONTAINER, height: CONTAINER }}
    >
      <div
        ref={tiltRef}
        className="relative w-full h-full"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Ambient glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 50% 50%, rgba(59,130,246,0.08) 0%, transparent 65%)',
          }}
        />

        {/* SVG ring ellipses */}
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{ overflow: 'visible' }}
          viewBox={svgView}
          width={CONTAINER}
          height={CONTAINER}
        >
          {RINGS.map((_, ri) => (
            <path
              key={ri}
              d={RING_SVG_PATHS[ri]}
              fill="none"
              stroke={RING_COLOR}
              strokeWidth="1"
            />
          ))}
        </svg>

        {/* Model cards */}
        <div className="absolute inset-0" style={{ overflow: 'visible' }}>
          {RINGS.map((_, ri) =>
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
                  ...INITIAL_STYLES[ri][ci],
                }}
              >
                {/* Card — clean uniform white */}
                <div
                  className="w-full h-full rounded-lg flex flex-col items-center justify-center
                             bg-white border border-gray-200/80
                             shadow-[0_2px_8px_rgba(0,0,0,0.08)]
                             transition-transform duration-150
                             group-hover:scale-[1.3] group-hover:shadow-[0_4px_20px_rgba(59,130,246,0.20)]
                             group-hover:border-blue-300"
                >
                  <span className="text-[10px] font-bold text-gray-800 leading-none tracking-tight">
                    {model.abbr}
                  </span>
                  <span className="text-[6.5px] text-gray-400 mt-0.5 leading-none font-medium">
                    {model.name}
                  </span>
                </div>

                {/* Tooltip */}
                <div
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2
                             px-2 py-1 rounded-md text-[10px] font-semibold whitespace-nowrap
                             pointer-events-none opacity-0 group-hover:opacity-100
                             transition-opacity duration-150 bg-gray-900 text-white"
                  style={{ zIndex: 1000 }}
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
              width: 88,
              height: 88,
              borderRadius: '50%',
              background:
                'linear-gradient(135deg, #1e40af 0%, #2563eb 40%, #3b82f6 75%, #60a5fa 100%)',
              animation: 'nucleusPulse 2.8s ease-in-out infinite',
            }}
          >
            {/* Specular highlight */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background:
                  'radial-gradient(ellipse at 38% 32%, rgba(255,255,255,0.30) 0%, rgba(255,255,255,0.05) 55%, transparent 75%)',
              }}
            />
            {/* Outer halo ring */}
            <div
              className="absolute rounded-full"
              style={{
                inset: -8,
                border: '1.5px solid rgba(59,130,246,0.30)',
                borderRadius: '50%',
              }}
            />
            {/* X */}
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
      </div>
    </div>
  );
}
