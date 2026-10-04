// Decorative hero scenery from the dashboard mock: a mountain with a
// winding path up to a flag, plus clouds, a dot grid and a rising arrow.
// Purely presentational - hidden from assistive tech and clicks.
const DOT_COLUMNS = 5
const DOT_ROWS = 4

export function HeroScenery() {
  return (
    <div className="hero-scenery" aria-hidden="true">
      <svg
        viewBox="0 0 640 460"
        preserveAspectRatio="xMaxYMid slice"
        role="presentation"
        focusable="false"
      >
        <defs>
          <linearGradient id="hw-mountain" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#c9d9f2" />
            <stop offset="1" stopColor="#e4eefb" />
          </linearGradient>
        </defs>

        {/* Clouds drifting left of the summit. */}
        <g fill="#dce8f7">
          <ellipse cx="66" cy="86" rx="44" ry="13" />
          <ellipse cx="96" cy="74" rx="28" ry="10" />
          <ellipse cx="188" cy="126" rx="36" ry="11" />
          <ellipse cx="214" cy="116" rx="22" ry="8" />
        </g>

        {/* Mountain with a lighter north face. */}
        <path d="M318 52 L596 460 L40 460 Z" fill="url(#hw-mountain)" />
        <path d="M318 52 L40 460 L318 460 Z" fill="#ffffff" opacity="0.32" />

        {/* Winding path from the base to the summit. */}
        <path
          d="M318 62 C 306 108, 356 128, 336 168 C 320 202, 272 218, 292 262 C 308 298, 362 316, 346 360 C 336 392, 302 408, 308 460"
          fill="none"
          stroke="#ffffff"
          strokeWidth="11"
          strokeLinecap="round"
          opacity="0.9"
        />

        {/* Summit flag. */}
        <rect x="315" y="16" width="3.5" height="42" rx="1.75" fill="#8fa9cf" />
        <path
          d="M318.5 18 C 334 11, 344 24, 362 17 L 357 39 C 341 46, 331 33, 318.5 40 Z"
          fill="#3bbf7f"
        />

        {/* Dot grid near the base. */}
        <g fill="#8ed4ae">
          {Array.from({ length: DOT_COLUMNS * DOT_ROWS }, (_, i) => (
            <circle
              key={i}
              cx={498 + (i % DOT_COLUMNS) * 19}
              cy={330 + Math.floor(i / DOT_COLUMNS) * 19}
              r="3"
            />
          ))}
        </g>

        {/* Rising arrow along the right edge. */}
        <path
          d="M598 452 C 636 380, 628 312, 586 258"
          fill="none"
          stroke="#57cf92"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d="M586 258 L 612 268 M 586 258 L 582 286"
          fill="none"
          stroke="#57cf92"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
    </div>
  )
}
