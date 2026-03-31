import AtomAnimation from './AtomAnimation';

const FEATURES = [
  'Simple one-command installation or Docker deployment',
  'Works on existing infrastructure—cloud, on-premise, or hybrid',
  'Mix & match models to optimize workload, cost, or performance',
];

const STATS = [
  { value: '9k',    label: 'GitHub Stars'      },
  { value: '6M+',   label: 'Downloads'         },
  { value: '300+',  label: 'Enterprise Users'  },
  { value: '$100M', label: 'Savings'           },
];

const NAV_LINKS = ['Product', 'Pricing', 'Company'];

function CheckCircleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0 mt-0.5">
      <circle cx="9" cy="9" r="8.25" stroke="#3b82f6" strokeWidth="1.5" />
      <path
        d="M5.5 9L7.8 11.3L12.5 6.5"
        stroke="#3b82f6"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function XLogo({ size = 28 }: { size?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-lg"
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 45%, #3b82f6 100%)',
        boxShadow: '0 2px 8px rgba(59,130,246,0.4)',
      }}
    >
      <span
        className="text-white font-black leading-none select-none"
        style={{ fontSize: size * 0.48, letterSpacing: '-0.04em' }}
      >
        X
      </span>
    </div>
  );
}

export default function Hero() {
  return (
    <div className="min-h-screen bg-[#fafafa] relative overflow-hidden">

      {/* ── Background: orbs + particle field ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        {/* Soft orbs */}
        <div className="absolute" style={{ width: 800, height: 800, top: -320, right: -150, background: 'radial-gradient(circle, rgba(99,120,255,0.07) 0%, rgba(59,130,246,0.03) 50%, transparent 72%)', borderRadius: '50%' }} />
        <div className="absolute" style={{ width: 500, height: 500, bottom: -100, left: '20%', background: 'radial-gradient(circle, rgba(139,92,246,0.05) 0%, transparent 65%)', borderRadius: '50%' }} />
        {/* Floating particle dots */}
        {[
          { size: 3, top: '12%', left: '8%',  dur: '18s', delay: '0s'   },
          { size: 2, top: '28%', left: '15%', dur: '24s', delay: '-6s'  },
          { size: 4, top: '65%', left: '5%',  dur: '20s', delay: '-3s'  },
          { size: 2, top: '80%', left: '22%', dur: '22s', delay: '-9s'  },
          { size: 3, top: '18%', left: '38%', dur: '26s', delay: '-4s'  },
          { size: 2, top: '75%', left: '42%', dur: '19s', delay: '-12s' },
          { size: 4, top: '40%', left: '92%', dur: '21s', delay: '-2s'  },
          { size: 3, top: '10%', left: '82%', dur: '25s', delay: '-7s'  },
          { size: 2, top: '88%', left: '75%', dur: '17s', delay: '-15s' },
          { size: 3, top: '55%', left: '88%', dur: '23s', delay: '-5s'  },
        ].map((p, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: p.size,
              height: p.size,
              top: p.top,
              left: p.left,
              background: 'rgba(99,120,255,0.35)',
              animation: `floatParticle ${p.dur} ease-in-out infinite`,
              animationDelay: p.delay,
            }}
          />
        ))}
      </div>

      {/* ── Navbar ── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-3.5"
        style={{
          background: 'rgba(250,250,250,0.88)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          borderBottom: '1px solid rgba(0,0,0,0.07)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <XLogo size={32} />
          <span className="font-bold text-gray-900" style={{ fontSize: '1.1rem' }}>
            Xinference
          </span>
        </div>

        {/* Links */}
        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((item) => (
            <a
              key={item}
              href="#"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              {item}
            </a>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex items-center gap-3">
          <a href="#" className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
            Book a Demo
          </a>
          <a
            href="#"
            className="text-sm font-medium text-gray-700 px-4 py-2 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-white transition-all"
          >
            Sign In
          </a>
          <a
            href="#"
            className="text-sm font-semibold text-white px-4 py-2 rounded-lg transition-all hover:opacity-90"
            style={{
              background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)',
              boxShadow: '0 2px 10px rgba(59,130,246,0.35)',
            }}
          >
            Get Started
          </a>
        </div>
      </nav>

      {/* ── Hero ── */}
      <div className="max-w-7xl mx-auto px-8 flex items-center min-h-screen pt-20">
        <div className="grid grid-cols-1 lg:grid-cols-[46%_54%] gap-4 items-center w-full py-16">

          {/* ─ Left column ─ */}
          <div className="flex flex-col gap-6">

            {/* Badge */}
            <div className="inline-flex self-start">
              <span
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-semibold"
                style={{
                  background: 'rgba(59,130,246,0.08)',
                  color: '#2563eb',
                  border: '1px solid rgba(59,130,246,0.22)',
                }}
              >
                <span
                  className="w-2 h-2 rounded-full bg-blue-500"
                  style={{ animation: 'badgePulse 2s ease-in-out infinite' }}
                />
                Universal compatibility
              </span>
            </div>

            {/* Heading */}
            <h1
              className="font-extrabold leading-[1.08] tracking-tight text-gray-900"
              style={{ fontSize: 'clamp(2.3rem, 3.4vw, 3.5rem)' }}
            >
              Inferencing made better.{' '}
              <span
                style={{
                  background: 'linear-gradient(135deg, #1d4ed8, #3b82f6, #6366f1)',
                  backgroundSize: '200% 200%',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  animation: 'gradientText 5s ease infinite',
                }}
              >
                Run any model
              </span>{' '}
              with total control
            </h1>

            {/* Description */}
            <p className="text-[1.05rem] text-gray-500 leading-relaxed max-w-[520px]">
              Effortlessly deploy any or your own models with one command. Whether you are
              a researcher, developer, or data scientist, Xinference empowers you to
              unleash the full potential of AI today.
            </p>

            {/* Feature pills */}
            <ul className="flex flex-col gap-3">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <CheckCircleIcon />
                  <span className="text-sm font-medium text-gray-700 leading-snug">{f}</span>
                </li>
              ))}
            </ul>

            {/* Buttons */}
            <div className="flex items-center gap-4 mt-1">
              <a
                href="#"
                className="px-6 py-3 rounded-xl text-white font-semibold text-sm transition-all hover:opacity-90 hover:scale-[1.02]"
                style={{
                  background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)',
                  boxShadow: '0 4px 22px rgba(59,130,246,0.45)',
                }}
              >
                Get started
              </a>
              <a
                href="#"
                className="px-6 py-3 rounded-xl font-semibold text-sm text-gray-700 border border-gray-200 hover:border-gray-300 hover:bg-white transition-all"
              >
                Contact us
              </a>
            </div>

            {/* Stats */}
            <div
              className="flex items-center gap-7 pt-5 mt-1 border-t"
              style={{ borderColor: 'rgba(0,0,0,0.07)' }}
            >
              {STATS.map((s) => (
                <div key={s.label} className="flex flex-col">
                  <span className="text-xl font-bold text-gray-900">{s.value}</span>
                  <span className="text-xs font-medium text-gray-400 mt-0.5">{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ─ Right column — Atom ─ */}
          <div className="flex items-center justify-center">
            <AtomAnimation />
          </div>

        </div>
      </div>
    </div>
  );
}
