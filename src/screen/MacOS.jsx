import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import './screen.css'
import { SCREEN_PX } from '../config'
import { about, contact, projects, site, social } from '../content'
import { scrollToStart } from '../scrollState'
import { triggerSecret, useSecretActive, TL } from '../secret'
import { setThunderSound, storm } from '../storm'
import pfpUrl from '../assets/pfp.jpg'
import wallpaperUrl from '../assets/wallpaper.jpg'
import { ditherImage } from './dither'
import {
  AlertIcon,
  AppIcon,
  DiskIcon,
  DocIcon,
  FolderIcon,
  GitHubIcon,
  InstagramIcon,
  LinkedInIcon,
  MailIcon,
  MenuGlyph,
  PentagramIcon,
  PersonIcon,
  TrashIcon,
} from './icons'

const MENUBAR_H = 38
const SECTIONS = ['about', 'projects', 'contact']
// the four things people come for sit in the middle of the desktop
const CENTER = ['about', 'projects', 'instagram', 'linkedin']

const DEFAULTS = {
  disk: { title: site.diskName, x: 60, y: 64, w: 520, h: 300 },
  about: { title: about.title, x: 50, y: 52, w: 700, h: 580 },
  projects: { title: 'Projects', x: 96, y: 86, w: 650, h: 440 },
  contact: { title: 'Contact', x: 190, y: 140, w: 520, h: 330 },
  site: { title: 'About This Desktop', x: 290, y: 190, w: 440, h: 250 },
  folder: { x: 150, y: 110, w: 640, h: 300 },
  video: { x: 80, y: 50, w: 820, h: 590 },
  image: { x: 180, y: 80, w: 620, h: 470 },
}

const SECTION_ICON = { about: PersonIcon, projects: FolderIcon, contact: MailIcon }
const SOCIAL_ICON = { instagram: InstagramIcon, linkedin: LinkedInIcon, github: GitHubIcon }

const openLink = (href) => window.open(href, '_blank', 'noopener,noreferrer')

// Dither the profile photo once, at the screen's native resolution (2× CSS px).
let pfpPromise
function useDitheredPfp() {
  const [src, setSrc] = useState(null)
  useEffect(() => {
    pfpPromise ||= ditherImage(pfpUrl, { w: 88, h: 104, focusX: 0.6, focusY: 0.58, zoom: 1.35, contrast: 1.35, gamma: 0.95 })
    let live = true
    pfpPromise.then((u) => live && setSrc(u)).catch(() => {})
    return () => {
      live = false
    }
  }, [])
  return src
}

// The desktop picture: a 1-bit Atkinson dither at the screen's native 512×323.
let wallPromise
function useWallpaper() {
  const [src, setSrc] = useState(null)
  useEffect(() => {
    wallPromise ||= ditherImage(wallpaperUrl, { w: 512, h: 323, focusY: 0.5, contrast: 1.35, gamma: 0.8, weights: [0.62, 0.33, 0.05] })
    let live = true
    wallPromise.then((u) => live && setSrc(u)).catch(() => {})
    return () => {
      live = false
    }
  }, [])
  return src
}

// A file whose icon is a small looping GIF. Opens on a single click.
function GifIcon({ label, sub, src, selected, folder, onSelect, onOpen, hover }) {
  return (
    <button
      {...hover}
      type="button"
      className={`gif-icon ${selected ? 'is-selected' : ''} ${folder ? 'is-folder' : ''}`}
      onPointerDown={(e) => {
        e.stopPropagation()
        onSelect?.()
      }}
      onClick={onOpen}
      onKeyDown={(e) => e.key === 'Enter' && onOpen?.()}
    >
      <span className="gif-frame">
        <img src={src} alt="" width="128" height="80" draggable="false" />
      </span>
      <span className="icon-label">{label}</span>
      {sub && <span className="gif-sub">{sub}</span>}
    </button>
  )
}

// Plays a recording in a window, in full colour.
function VideoPlayer({ src, live, sound = false }) {
  const ref = useRef(null)
  const [playing, setPlaying] = useState(true)
  // recordings with audio start with sound (opening the window is a click); silent ones stay muted
  const [muted, setMuted] = useState(!sound)
  const [t, setT] = useState(0)
  useEffect(() => {
    const v = ref.current
    if (!v) return
    if (live && playing) {
      v.play().catch(() => {
        // the browser refused sound without a fresh gesture: play muted instead
        if (!v.muted) {
          setMuted(true)
          v.muted = true
          v.play().catch(() => {})
        }
      })
    } else v.pause()
  }, [live, playing])
  const seek = (e) => {
    const v = ref.current
    const r = e.currentTarget.getBoundingClientRect()
    if (v?.duration) v.currentTime = ((e.clientX - r.left) / r.width) * v.duration
  }
  return (
    <div className="player">
      <video
        ref={ref}
        src={src}
        muted={muted}
        loop
        playsInline
        autoPlay
        preload="auto"
        onTimeUpdate={(e) => setT(e.currentTarget.duration ? e.currentTarget.currentTime / e.currentTarget.duration : 0)}
        onClick={() => setPlaying((p) => !p)}
      />
      <div className="player-bar">
        <button type="button" className="player-btn" onClick={() => setPlaying((p) => !p)} aria-label={playing ? 'Pause' : 'Play'}>
          <svg viewBox="0 0 10 10" width="14" height="14" shapeRendering="crispEdges" aria-hidden="true">
            {playing ? <path d="M2 1h2v8H2zM6 1h2v8H6z" fill="currentColor" /> : <path d="M2 1v8l7-4z" fill="currentColor" />}
          </svg>
        </button>
        <div className="player-track" onPointerDown={seek}>
          <div className="player-fill" style={{ width: `${t * 100}%` }} />
        </div>
        {sound && (
          <button type="button" className="player-btn" onClick={() => setMuted((m) => !m)} aria-label={muted ? 'Sound on' : 'Sound off'}>
            <svg viewBox="0 0 10 10" width="14" height="14" shapeRendering="crispEdges" aria-hidden="true">
              <path d="M1 3.5h2l3-2.5v8l-3-2.5H1z" fill="currentColor" />
              {muted ? <path d="M7 3.5l2.5 3M9.5 3.5l-2.5 3" stroke="currentColor" strokeWidth="1" fill="none" /> : <path d="M7.2 3.2q1 1.8 0 3.6M8.4 2.2q1.8 2.8 0 5.6" stroke="currentColor" strokeWidth="0.9" fill="none" />}
            </svg>
          </button>
        )}
        <a className="player-btn" href={src} target="_blank" rel="noreferrer" aria-label="Open video in a new tab">
          ↗
        </a>
      </div>
    </div>
  )
}

const BALLOON_W = 380
const host = (u) => u.replace(/^https?:\/\//, '').replace(/\/$/, '')

// Classic Balloon Help: the thesis and everything else about a file, on hover.
function Balloon({ b }) {
  const ref = useRef(null)
  const [pos, setPos] = useState(null)
  useLayoutEffect(() => {
    const h = ref.current?.offsetHeight || 0
    const top = Math.min(SCREEN_PX.h - h - 12, Math.max(MENUBAR_H + 8, b.cy - 46))
    // the tail points at the icon's centre, wherever the box ended up
    setPos({ top, tail: Math.min(h - 30, Math.max(18, b.cy - top - 10)) })
  }, [b])
  const d = b.d
  const meta = [d.kind, d.year || d.date].filter(Boolean).join('  ·  ')
  const action = d.items ? `Click to open  ·  ${d.items.length} items` : d.video ? 'Click to play the recording' : d.image ? 'Click to view  ·  PDF inside' : 'Click for details'
  return (
    <aside
      ref={ref}
      className={`balloon balloon-${b.side} ${pos ? 'is-on' : ''}`}
      style={{ left: b.x, top: pos?.top ?? b.cy, width: BALLOON_W, '--tail': `${pos?.tail ?? 30}px` }}
      role="tooltip"
    >
      <header className="balloon-head">
        <strong>{d.name}</strong>
        {meta && <span>{meta}</span>}
      </header>
      {b.parent && <p className="balloon-from">in {b.parent}</p>}
      <p className="balloon-thesis">{d.thesis}</p>
      {(d.detail || (!d.facts && d.body)) && <p className="balloon-body">{d.detail || d.body}</p>}
      {d.facts && (
        <ul className="balloon-facts">
          {d.facts.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      )}
      {(d.site || d.source) && (
        <dl className="balloon-links">
          {d.site && (
            <div>
              <dt>Site</dt>
              <dd>{host(d.site)}</dd>
            </div>
          )}
          {d.source && (
            <div>
              <dt>Code</dt>
              <dd>{host(d.source).replace('github.com/', 'github/')}</dd>
            </div>
          )}
        </dl>
      )}
      <footer className="balloon-foot">{action}</footer>
    </aside>
  )
}

// Picture viewer for images (the business card). Shown in full colour.
function ImageViewer({ src, file }) {
  return (
    <div className="player viewer">
      <div className="viewer-stage">
        <img src={src} alt="" draggable="false" />
      </div>
      <div className="player-bar">
        <span className="viewer-hint">Business card</span>
        <a className="btn viewer-btn" href={file || src} target="_blank" rel="noreferrer">
          Open PDF ↗
        </a>
      </div>
    </div>
  )
}

// Screen state during the Clean Up secret: glitch → dark → glitch → normal.
function useGlitchPhase() {
  const active = useSecretActive()
  const [phase, setPhase] = useState(null)
  useEffect(() => {
    if (!active) {
      setPhase(null)
      return
    }
    setPhase('hard')
    const ms = (s) => s * 1000
    const ids = [
      setTimeout(() => setPhase('dark'), ms(TL.glitchEnd)),
      setTimeout(() => setPhase('hard'), ms(TL.backEnd - 0.5)),
      setTimeout(() => setPhase('soft'), ms(TL.backEnd + 0.25)),
    ]
    return () => ids.forEach(clearTimeout)
  }, [active])
  return phase
}

function useClock() {
  const fmt = () => new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  const [t, setT] = useState(fmt)
  useEffect(() => {
    const i = setInterval(() => setT(fmt()), 10000)
    return () => clearInterval(i)
  }, [])
  return t
}

function Icon({ label, Glyph, selected, onSelect, onOpen, dark }) {
  return (
    <button
      type="button"
      className={`icon ${selected ? 'is-selected' : ''} ${dark ? 'on-pattern' : ''}`}
      onPointerDown={(e) => {
        e.stopPropagation()
        onSelect?.()
      }}
      onClick={(e) => {
        // touch has no reliable double-click: open on tap
        if (e.nativeEvent.pointerType === 'touch') onOpen?.()
      }}
      onDoubleClick={onOpen}
      onKeyDown={(e) => e.key === 'Enter' && onOpen?.()}
    >
      <span className="icon-glyph">
        <Glyph />
      </span>
      <span className="icon-label">{label}</span>
    </button>
  )
}

function Window({ win, active, onFocus, onClose, onMove, scaleRef, children, info }) {
  const drag = useRef(null)
  const onDown = (e) => {
    if (e.button !== 0) return
    e.stopPropagation()
    onFocus()
    drag.current = { px: e.clientX, py: e.clientY, x: win.x, y: win.y }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onMoveEv = (e) => {
    const d = drag.current
    if (!d) return
    const s = scaleRef.current || 1
    const x = Math.min(SCREEN_PX.w - 80, Math.max(80 - win.w, d.x + (e.clientX - d.px) / s))
    const y = Math.min(SCREEN_PX.h - 44, Math.max(MENUBAR_H, d.y + (e.clientY - d.py) / s))
    onMove(x, y)
  }
  const onUp = () => (drag.current = null)

  return (
    <section
      className={`win ${active ? 'is-active' : ''}`}
      style={{ left: win.x, top: win.y, width: win.w, height: win.h, zIndex: win.z }}
      onPointerDown={(e) => {
        e.stopPropagation()
        onFocus()
      }}
      role="dialog"
      aria-label={win.title}
    >
      <header className="win-title" onPointerDown={onDown} onPointerMove={onMoveEv} onPointerUp={onUp} onPointerCancel={onUp}>
        <button
          type="button"
          className="close-box"
          aria-label={`Close ${win.title}`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
        >
          <svg viewBox="0 0 10 10" width="14" height="14" shapeRendering="crispEdges" aria-hidden="true">
            <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.6" fill="none" />
          </svg>
        </button>
        <span className="win-title-text">{win.title}</span>
      </header>
      {info && <div className="win-info">{info}</div>}
      <div className="win-body">{children}</div>
    </section>
  )
}

function Menu({ name, label, items, openMenu, setOpenMenu }) {
  const open = openMenu === name
  return (
    <div className="menu">
      <button
        type="button"
        className={`menu-title ${open ? 'is-open' : ''}`}
        onPointerDown={(e) => {
          e.stopPropagation()
          setOpenMenu(open ? null : name)
        }}
        onPointerEnter={() => openMenu && setOpenMenu(name)}
      >
        {label}
      </button>
      {open && (
        <ul className="menu-drop" onPointerDown={(e) => e.stopPropagation()}>
          {items.map((it, i) =>
            it === '-' ? (
              <li key={i} className="menu-sep" role="separator" />
            ) : (
              <li key={i}>
                <button
                  type="button"
                  className="menu-item"
                  disabled={it.disabled}
                  onClick={() => {
                    setOpenMenu(null)
                    it.action?.()
                  }}
                >
                  <span className="menu-check">{it.checked ? '✓' : ''}</span>
                  {it.label}
                  {it.key && <span className="menu-key">⌘{it.key}</span>}
                </button>
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  )
}

function Table({ cols, rows, selected, onSelect, onOpen, hover }) {
  return (
    <table className="list">
      <thead>
        <tr>
          {cols.map((c) => (
            <th key={c.key} style={{ width: c.width }}>
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr
            key={r.id}
            {...hover?.(r)}
            className={selected === r.id ? 'is-selected' : ''}
            onPointerDown={() => onSelect(r.id)}
            onDoubleClick={() => onOpen(r)}
            onClick={(e) => e.nativeEvent.pointerType === 'touch' && onOpen(r)}
          >
            {cols.map((c, i) => (
              <td key={c.key}>
                {i === 0 && <DocIcon size={28} />}
                {r[c.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default function MacOS({ arrived, near }) {
  const rootRef = useRef(null)
  const scaleRef = useRef(1)
  const [balloon, setBalloon] = useState(null)
  const balloonTimer = useRef(0)
  const hideBalloon = useCallback(() => {
    clearTimeout(balloonTimer.current)
    setBalloon(null)
  }, [])
  // hover handlers for anything that should explain itself
  const hover = (d, parent) => ({
    onPointerEnter: (e) => {
      if (e.pointerType === 'touch' || !d.thesis) return
      const el = e.currentTarget
      clearTimeout(balloonTimer.current)
      balloonTimer.current = setTimeout(() => {
        const root = rootRef.current?.getBoundingClientRect()
        if (!root || !el.isConnected) return
        const k = root.width / SCREEN_PX.w
        const r = el.getBoundingClientRect()
        const left = (r.left - root.left) / k
        const right = (r.right - root.left) / k
        const cy = (r.top + r.height / 2 - root.top) / k
        const fitsRight = right + 16 + BALLOON_W < SCREEN_PX.w - 10
        setBalloon({ d, parent, cy, side: fitsRight ? 'right' : 'left', x: fitsRight ? right + 16 : Math.max(10, left - 16 - BALLOON_W) })
      }, 280)
    },
    onPointerLeave: hideBalloon,
  })
  const zTop = useRef(10)
  const [wins, setWins] = useState(() => [{ id: 'about', kind: 'about', ...DEFAULTS.about, z: 10 }])
  const [selected, setSelected] = useState(null)
  const [listSel, setListSel] = useState(null)
  const [openMenu, setOpenMenu] = useState(null)
  const [alert, setAlert] = useState(null)
  const [boot, setBoot] = useState(null) // null | 'dark' | 'welcome'
  const [viewMode, setViewMode] = useState('icon')
  const clock = useClock()
  const [thunder, setThunder] = useState(storm.sound)
  const pfp = useDitheredPfp()
  const wallpaper = useWallpaper()
  const glitch = useGlitchPhase()

  const active = wins.reduce((a, w) => (!a || w.z > a.z ? w : a), null)

  const focus = useCallback((id) => {
    setWins((ws) => ws.map((w) => (w.id === id ? { ...w, z: ++zTop.current } : w)))
  }, [])

  const open = useCallback((kind, data) => {
    const id = data ? `${kind}:${data.id}` : kind
    setWins((ws) => {
      if (ws.some((w) => w.id === id)) return ws.map((w) => (w.id === id ? { ...w, z: ++zTop.current } : w))
      const n = ws.length
      const cascade = (n % 5) * 24
      const preset = DEFAULTS[kind]
      // videos and folders cascade so several can be open at once
      const base = preset
        ? kind === 'video' || kind === 'folder'
          ? { ...preset, x: preset.x + cascade, y: preset.y + cascade * 0.6 }
          : preset
        : { x: 250 + cascade, y: 80 + cascade * 0.8, w: 520, h: 470 }
      return [...ws, { id, kind, data, title: data?.name || base.title, ...base, ...(data ? { title: data.name } : {}), z: ++zTop.current }]
    })
    if (SECTIONS.includes(kind) && window.location.hash !== `#${kind}`) history.replaceState(null, '', `#${kind}`)
  }, [])

  const close = useCallback((id) => {
    setWins((ws) => ws.filter((w) => w.id !== id))
    if (window.location.hash === `#${id}`) history.replaceState(null, '', window.location.pathname)
  }, [])

  // deep links: #about, #projects, #contact
  useEffect(() => {
    const fromHash = () => {
      const h = window.location.hash.slice(1)
      if (SECTIONS.includes(h)) open(h)
    }
    fromHash()
    window.addEventListener('hashchange', fromHash)
    return () => window.removeEventListener('hashchange', fromHash)
  }, [open])

  useEffect(() => {
    if (!arrived) {
      setOpenMenu(null)
      hideBalloon()
    }
  }, [arrived, hideBalloon])
  useEffect(() => () => clearTimeout(balloonTimer.current), [])

  useEffect(() => {
    const onKey = (e) => {
      if (!arrived) return
      if (e.key === 'Escape') {
        if (alert) setAlert(null)
        else if (openMenu) setOpenMenu(null)
        else if (active) close(active.id)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [arrived, alert, openMenu, active, close])

  const restart = () => {
    setBoot('dark')
    setTimeout(() => setBoot('welcome'), 450)
    setTimeout(() => {
      setBoot(null)
      setWins([])
      setSelected(null)
    }, 2300)
  }

  // tidies the windows... and wakes something up
  const cleanUp = () => {
    setSelected(null)
    setWins((ws) => [...ws].sort((a, b) => a.z - b.z).map((w, i) => ({ ...w, x: 40 + i * 28, y: 56 + i * 26 })))
    triggerSecret()
  }

  // a file in Projects: folders open, recordings play, pictures show, the rest get a page
  const openFile = (f) => {
    if (f.items) open('folder', f)
    else if (f.video) open('video', f)
    else if (f.image) open('image', f)
    else open('doc', f)
  }

  // open a desktop item: a section window, or a social link
  const activate = (id) => {
    if (social[id]) openLink(social[id].href)
    else if (id === 'trash') setAlert('The Trash is already empty.')
    else open(id)
  }

  const menus = [
    { name: 'glyph', label: <MenuGlyph />, items: [{ label: 'About This Desktop…', action: () => open('site') }] },
    {
      name: 'file',
      label: 'File',
      items: [
        { label: 'Open', key: 'O', disabled: !selected, action: () => selected && activate(selected) },
        { label: 'Close Window', key: 'W', disabled: !active, action: () => active && close(active.id) },
        '-',
        { label: 'Print…', disabled: true },
      ],
    },
    {
      name: 'edit',
      label: 'Edit',
      items: [{ label: 'Undo', key: 'Z', disabled: true }, '-', { label: 'Cut', key: 'X', disabled: true }, { label: 'Copy', key: 'C', disabled: true }, { label: 'Paste', key: 'V', disabled: true }],
    },
    {
      name: 'view',
      label: 'View',
      items: [
        { label: 'by Icon', checked: viewMode === 'icon', action: () => setViewMode('icon') },
        { label: 'by Name', checked: viewMode === 'list', action: () => setViewMode('list') },
      ],
    },
    {
      name: 'go',
      label: 'Go',
      items: SECTIONS.map((s) => ({ label: DEFAULTS[s].title, action: () => open(s) })),
    },
    {
      name: 'special',
      label: 'Special',
      items: [
        { label: 'Clean Up', action: cleanUp },
        { label: 'Thunder Sound', checked: thunder, action: () => (setThunderSound(!thunder), setThunder(!thunder)) },
        { label: 'Empty Trash', action: () => setAlert('The Trash is already empty.') },
        '-',
        { label: 'Restart', action: restart },
        { label: 'Leave Desk', action: scrollToStart },
      ],
    },
  ]

  const renderBody = (w) => {
    switch (w.kind) {
      case 'disk':
        return (
          <div className="icon-grid">
            {SECTIONS.map((s) => (
              <Icon key={s} label={DEFAULTS[s].title} Glyph={SECTION_ICON[s]} selected={selected === s} onSelect={() => setSelected(s)} onOpen={() => open(s)} />
            ))}
          </div>
        )
      case 'about':
        return (
          <div className="pad about">
            <div className="about-side">
              <div className="portrait">{pfp ? <img src={pfp} alt="Om's profile picture, dithered" /> : <PersonIcon size={96} />}</div>
              <dl className="facts">
                {about.facts.map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div>
              <h1 className="about-name">{site.name}</h1>
              <p className="quote">“{site.quote}”</p>
              {about.paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </div>
        )
      case 'projects':
        return viewMode === 'icon' ? (
          <div className="icon-grid gif-grid">
            {projects.map((p) => (
              <GifIcon
                key={p.id}
                label={p.name}
                src={p.gif}
                folder={!!p.items}
                hover={hover(p)}
                selected={listSel === p.id}
                onSelect={() => setListSel(p.id)}
                onOpen={() => openFile(p)}
              />
            ))}
          </div>
        ) : (
          <Table
            cols={[
              { key: 'name', label: 'Name', width: '46%' },
              { key: 'kind', label: 'Kind', width: '34%' },
              { key: 'year', label: 'Year' },
            ]}
            rows={projects}
            selected={listSel}
            onSelect={setListSel}
            onOpen={openFile}
            hover={(r) => hover(r)}
          />
        )
      case 'folder':
        return (
          <div className="icon-grid gif-grid">
            {w.data.items.map((it) => (
              <GifIcon
                key={it.id}
                label={it.name}
                sub={it.date}
                src={it.gif}
                hover={hover(it, w.data.name)}
                selected={listSel === it.id}
                onSelect={() => setListSel(it.id)}
                onOpen={() => openFile(it)}
              />
            ))}
          </div>
        )
      case 'video':
        return <VideoPlayer src={w.data.video} live={arrived} sound={!!w.data.sound} />
      case 'image':
        return <ImageViewer src={w.data.image} file={w.data.file} />
      case 'doc': {
        const d = w.data
        return (
          <div className="pad doc">
            {d.gif && (
              <div className="doc-gif">
                <img src={d.gif} alt="" width="256" height="160" draggable="false" />
              </div>
            )}
            <h1>{d.name}</h1>
            <p className="muted">{[d.kind || d.role, d.year || d.years].filter(Boolean).join('  ·  ')}</p>
            <hr />
            <p>{d.body}</p>
            {(d.site || d.source) && (
              <div className="btn-row">
                {d.site && (
                  <a className="btn btn-default" href={d.site} target="_blank" rel="noreferrer">
                    Visit ↗
                  </a>
                )}
                {d.source && (
                  <a className="btn" href={d.source} target="_blank" rel="noreferrer">
                    Source ↗
                  </a>
                )}
              </div>
            )}
          </div>
        )
      }
      case 'contact':
        return (
          <div className="pad contact">
            <p>{contact.intro}</p>
            <ul className="link-rows">
              {contact.links.map((l) => {
                const G = SOCIAL_ICON[Object.keys(social).find((k) => social[k] === l)]
                return (
                  <li key={l.label}>
                    <a href={l.href} target="_blank" rel="noreferrer">
                      <G size={48} />
                      <span className="link-label">{l.label}</span>
                      <span className="link-handle">{l.handle}</span>
                      <span className="link-go">↗</span>
                    </a>
                  </li>
                )
              })}
            </ul>
          </div>
        )
      case 'site':
        return (
          <div className="pad site">
            <div className="site-row">
              <AppIcon />
              <div>
                <h1>{site.diskName}</h1>
                <p className="muted">System 1.0 · 512K</p>
              </div>
            </div>
            <p>Om's desk, built in React Three Fiber. Every object is procedural. Try tidying up.</p>
          </div>
        )
      default:
        return null
    }
  }

  const infoFor = (w) => {
    if (w.kind === 'disk') return `${SECTIONS.length} items   ·   312K in disk   ·   488K available`
    if (w.kind === 'projects') return `${projects.length} items`
    if (w.kind === 'folder') return `${w.data.items.length} items`
    if (w.kind === 'video') return `${w.data.date}  ·  screen recording`
    if (w.kind === 'image') return 'a5 Consulting  ·  business card'
    return null
  }

  return (
    <div
      ref={rootRef}
      className={`mac-screen ${arrived ? 'is-live' : ''} ${near ? 'is-near' : ''} ${glitch ? `glitch glitch-${glitch}` : ''}`}
      style={{ width: SCREEN_PX.w, height: SCREEN_PX.h }}
      onPointerDownCapture={(e) => {
        hideBalloon()
        const r = rootRef.current?.getBoundingClientRect()
        if (r) scaleRef.current = r.width / SCREEN_PX.w
        if (!e.target.closest('.menu')) setOpenMenu(null)
      }}
      onPointerDown={() => setSelected(null)}
    >
      <nav className="menubar">
        {menus.map((m) => (
          <Menu key={m.name} {...m} openMenu={openMenu} setOpenMenu={setOpenMenu} />
        ))}
        <span className="menubar-clock">{clock}</span>
      </nav>

      <div className="desktop" style={wallpaper ? { backgroundImage: `url(${wallpaper})` } : undefined}>
        <div className="desk-icons">
          <Icon dark label={site.diskName} Glyph={DiskIcon} selected={selected === 'disk'} onSelect={() => setSelected('disk')} onOpen={() => open('disk')} />
          <Icon dark label={DEFAULTS.contact.title} Glyph={SECTION_ICON.contact} selected={selected === 'contact'} onSelect={() => setSelected('contact')} onOpen={() => open('contact')} />
          <div className="desk-spacer" />
          <Icon dark label="Trash" Glyph={TrashIcon} selected={selected === 'trash'} onSelect={() => setSelected('trash')} onOpen={() => activate('trash')} />
        </div>
        <div className="desk-center">
          {CENTER.map((k) => (
            <Icon
              dark
              key={k}
              label={social[k] ? social[k].label : DEFAULTS[k].title}
              Glyph={social[k] ? SOCIAL_ICON[k] : SECTION_ICON[k]}
              selected={selected === k}
              onSelect={() => setSelected(k)}
              onOpen={() => activate(k)}
            />
          ))}
        </div>
      </div>

      {wins.map((w) => (
        <Window
          key={w.id}
          win={w}
          active={active?.id === w.id}
          onFocus={() => active?.id !== w.id && focus(w.id)}
          onClose={() => close(w.id)}
          onMove={(x, y) => setWins((ws) => ws.map((o) => (o.id === w.id ? { ...o, x, y } : o)))}
          scaleRef={scaleRef}
          info={infoFor(w)}
        >
          {renderBody(w)}
        </Window>
      ))}

      {balloon && arrived && !glitch && <Balloon b={balloon} />}

      {alert && (
        <div className="modal-scrim" onPointerDown={(e) => e.stopPropagation()}>
          <div className="alert" role="alertdialog">
            <AlertIcon />
            <p>{alert}</p>
            <button type="button" className="btn btn-default" onClick={() => setAlert(null)} autoFocus>
              OK
            </button>
          </div>
        </div>
      )}

      {boot && (
        <div className={`boot boot-${boot}`}>
          {boot === 'welcome' && (
            <div className="boot-box">
              <AppIcon size={96} />
              <p>Welcome.</p>
            </div>
          )}
        </div>
      )}

      {glitch && (
        <div className="glitch-fx" aria-hidden="true">
          <div className="glitch-bars" />
          <div className="glitch-noise" />
          {glitch === 'dark' && (
            <div className="glitch-sigil">
              <PentagramIcon size={150} />
            </div>
          )}
        </div>
      )}

      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <filter id="phosphor" colorInterpolationFilters="sRGB">
          {/* grey in -> green phosphor out: ink #04140a at black, paper #6dff8e at white */}
          <feColorMatrix
            type="matrix"
            values="0.0884 0.2976 0.0300 0 0.016
                    0.1999 0.6724 0.0678 0 0.078
                    0.0975 0.3281 0.0331 0 0.039
                    0 0 0 1 0"
          />
        </filter>
      </svg>

      <div className="crt" aria-hidden="true" />
    </div>
  )
}
