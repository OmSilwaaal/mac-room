import { Suspense, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import Experience from './scene/Experience'
import { readScroll, scrollToEnd } from './scrollState'

const SECTIONS = ['about', 'projects', 'work', 'contact']

export default function App() {
  const [arrived, setArrived] = useState(false)
  const [dpr, setDpr] = useState([1, 1.75])
  const hintRef = useRef(null)
  // fixed DOM target for drei <Html>; without it the portal root is rebuilt and left empty
  const portalRef = useRef(null)

  useEffect(() => {
    const onScroll = () => {
      const p = readScroll()
      if (hintRef.current) hintRef.current.style.opacity = String(Math.max(0, 1 - p * 6))
    }
    // deep link straight to the screen
    if (SECTIONS.includes(window.location.hash.slice(1))) requestAnimationFrame(() => scrollToEnd(false))
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  return (
    <>
      <div ref={portalRef} className={`stage ${arrived ? 'is-arrived' : ''}`}>
        <Canvas
          shadows="soft"
          dpr={dpr}
          camera={{ fov: 35, near: 0.02, far: 20, position: [0.2, 1.07, 1.08] }}
          gl={{ antialias: false, powerPreference: 'high-performance', toneMapping: THREE.NoToneMapping }}
        >
          <Suspense fallback={null}>
            <Experience arrived={arrived} onArrivedChange={setArrived} onApproach={() => scrollToEnd()} setDpr={setDpr} portal={portalRef} />
          </Suspense>
        </Canvas>
      </div>

      <div className="hint" ref={hintRef} aria-hidden={arrived}>
        <span>Scroll to sit down</span>
        <span className="hint-line" />
      </div>

      {/* the page itself is just scroll distance for the camera */}
      <div className="track" aria-hidden="true" />
    </>
  )
}
