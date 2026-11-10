// 1-bit pixel icons on a 32×32 grid. Strokes sit on half-pixels so they render crisp.

const Svg = ({ children, size = 64 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" shapeRendering="crispEdges" aria-hidden="true">
    <g fill="var(--paper)" stroke="var(--ink)" strokeWidth="1">
      {children}
    </g>
  </svg>
)

export const DiskIcon = (p) => (
  <Svg {...p}>
    <path d="M3.5 11.5h25v12h-25z" />
    <path d="M3.5 19.5h25" fill="none" />
    <path d="M6.5 21.5h4" fill="none" />
    <rect x="23" y="21" width="2" height="1" fill="var(--ink)" stroke="none" />
  </Svg>
)

export const FolderIcon = (p) => (
  <Svg {...p}>
    <path d="M2.5 9.5h9l2 2h15.5v15h-26.5z" />
    <path d="M2.5 13.5h26.5" fill="none" />
  </Svg>
)

export const DocIcon = (p) => (
  <Svg {...p}>
    <path d="M7.5 3.5h12l5 5v20h-17z" />
    <path d="M19.5 3.5v5h5" fill="none" />
    <path d="M10.5 13.5h11M10.5 16.5h11M10.5 19.5h11M10.5 22.5h7" fill="none" />
  </Svg>
)

export const AppIcon = (p) => (
  <Svg {...p}>
    <path d="M9.5 3.5h13v19h-13z" />
    <path d="M11.5 5.5h9v8h-9z" />
    <path d="M17.5 17.5h3" fill="none" />
    <path d="M8.5 22.5h15v4h-15z" />
  </Svg>
)

export const MailIcon = (p) => (
  <Svg {...p}>
    <path d="M3.5 8.5h25v16h-25z" />
    <path d="M3.5 8.5l12.5 9 12.5-9" fill="none" />
  </Svg>
)

export const TrashIcon = (p) => (
  <Svg {...p}>
    <path d="M6.5 7.5h19v3h-19z" />
    <path d="M13.5 5.5h5v2h-5z" />
    <path d="M8.5 10.5h15l-1 18h-13z" />
    <path d="M12.5 13.5v12M16.5 13.5v12M20.5 13.5v12" fill="none" />
  </Svg>
)

export const PersonIcon = (p) => (
  <Svg {...p}>
    <path d="M7.5 3.5h12l5 5v20h-17z" />
    <path d="M19.5 3.5v5h5" fill="none" />
    <path d="M13.5 11.5h5v5h-5z" />
    <path d="M11.5 23.5v-3l2-2h5l2 2v3" fill="none" />
  </Svg>
)

// Tiny glyph for the leftmost menu: a little compact computer.
export const MenuGlyph = () => (
  <svg width="28" height="28" viewBox="0 0 14 14" shapeRendering="crispEdges" aria-hidden="true">
    <g fill="none" stroke="currentColor" strokeWidth="1">
      <path d="M3.5 1.5h7v10h-7z" />
      <path d="M4.5 2.5h5v4h-5z" />
      <path d="M2.5 11.5h9v1h-9z" />
    </g>
    <rect x="7" y="9" width="2" height="1" fill="currentColor" />
  </svg>
)

export const AlertIcon = () => (
  <svg width="64" height="64" viewBox="0 0 32 32" shapeRendering="crispEdges" aria-hidden="true">
    <g fill="var(--paper)" stroke="var(--ink)">
      <path d="M16 3.5l13 24h-26z" strokeLinejoin="miter" />
    </g>
    <rect x="15" y="12" width="2" height="9" fill="var(--ink)" />
    <rect x="15" y="23" width="2" height="2" fill="var(--ink)" />
  </svg>
)

export const InstagramIcon = (p) => (
  <Svg {...p}>
    <rect x="5.5" y="5.5" width="21" height="21" rx="6" />
    <circle cx="16" cy="16" r="5" />
    <rect x="21" y="9" width="2" height="2" fill="var(--ink)" stroke="none" />
  </Svg>
)

export const LinkedInIcon = (p) => (
  <Svg {...p}>
    <path d="M5.5 5.5h21v21h-21z" />
    <path d="M9 13h3v9H9zM9 9h3v2.5H9z" fill="var(--ink)" stroke="none" />
    <path d="M14 13h3v1.5c.8-1.2 2-1.8 3.4-1.8 2.4 0 3.6 1.5 3.6 4.4V22h-3v-4.6c0-1.4-.5-2.1-1.6-2.1-1.2 0-2.4.8-2.4 2.4V22h-3z" fill="var(--ink)" stroke="none" />
  </Svg>
)

export const GitHubIcon = (p) => (
  <Svg {...p}>
    <path d="M9.5 6.5h13l3 3v13l-3 3h-13l-3-3v-13z" />
    <path d="M12.5 21.5v-3l-1-1v-3l2-2h5l2 2v3l-1 1v3" fill="none" />
    <path d="M12.5 12.5l-1-3M19.5 12.5l1-3" fill="none" />
  </Svg>
)

// Circle + inverted star, used on the screen during the secret.
export const PentagramIcon = ({ size = 160 }) => {
  const c = 16
  const r = 13
  const v = Array.from({ length: 5 }, (_, k) => {
    const a = Math.PI / 2 + (k * 2 * Math.PI) / 5
    return [c + Math.cos(a) * r, c + Math.sin(a) * r]
  })
  const d = [0, 2, 4, 1, 3, 0].map((i, n) => `${n ? 'L' : 'M'}${v[i][0].toFixed(2)} ${v[i][1].toFixed(2)}`).join(' ')
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="miter">
        <circle cx={c} cy={c} r={r} />
        <path d={d} />
      </g>
    </svg>
  )
}
