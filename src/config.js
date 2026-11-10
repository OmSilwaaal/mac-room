// Shared world-space layout (metres). Desk surface sits at y = DESK_Y.
export const DESK_Y = 0.75

// Compact Macintosh case, measured from the base centre.
export const MAC = {
  pos: [0, DESK_Y, -0.05],
  w: 0.246,
  h: 0.345,
  d: 0.276,
}

// Visible CRT area that the HTML desktop is mapped onto (3:2, like 512×342).
export const SCREEN = {
  width: 0.176,
  height: 0.1176,
  // centre of the active area relative to the Mac base
  y: 0.232,
  // z offset of the DOM plane from the case front face
  z: 0.0095,
}

// Logical pixel size of the on-screen desktop (2× the original 512×342).
export const SCREEN_PX = { w: 1024, h: 684 }

export const SCREEN_WORLD = [
  MAC.pos[0],
  MAC.pos[1] + SCREEN.y,
  MAC.pos[2] + MAC.d / 2 + SCREEN.z,
]

// Centre of the window blinds on the back wall (used by the Clean Up secret).
export const WINDOW_WORLD = [-1.0, 1.42, -1.53]
