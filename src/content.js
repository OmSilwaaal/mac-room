// Everything the on-screen desktop shows lives here. Edit freely.

// files in /public/media (1-bit looping GIF thumbnails + the full videos)
const media = (f) => `${import.meta.env.BASE_URL}media/${f}`
const gif = (id) => media(`gifs/${id}.gif`)

export const site = {
  name: 'Om',
  diskName: 'Om HD',
  quote: 'devil is on my shoulder',
}

export const social = {
  instagram: { label: 'Instagram', handle: '@silwal.om', href: 'https://www.instagram.com/silwal.om/' },
  linkedin: { label: 'LinkedIn', handle: 'Om', href: 'https://www.linkedin.com/in/om-silwal-a7a9683b7/' },
  github: { label: 'GitHub', handle: '@OmSilwaaal', href: 'https://github.com/OmSilwaaal' },
}

export const about = {
  title: 'About Om',
  paragraphs: [
    "I've worked in UI/UX for over three years, taking interfaces from the first sketch to something people actually use.",
    'I worked on the MMSD West High app, the iOS app for Madison West High School.',
    "Beyond that: Travauxus, a paper-trading terminal for Solana memecoins; Vitalis, an iOS nutrition tracker; a5 Consulting's website and business card; TennisBot, a Kalshi tennis-prediction bot; my OM constellation site; Pusto, a snowbound Soviet block built from my love of Russian music; and ket-ovrdse.com, a Y2K pop-up parody.",
  ],
  facts: [
    ['UI/UX', '3+ years'],
    ['Shipped', 'MMSD West High app'],
    ['GitHub', '@OmSilwaaal'],
    ['Instagram', '@silwal.om'],
  ],
}

// Travauxus first, then every public repo on github.com/OmSilwaaal.
export const projects = [
  {
    id: 'travauxus',
    thesis: 'Practise on the real market before risking a cent.',
    facts: ['Solana memecoins, live from the bonding curve', '1-second candles · live tape · rug flags', 'Paper money: trade the curve, risk nothing', 'Landing page rebuilt 16 times, May to Oct'],
    name: 'Travauxus',
    year: '2026',
    kind: 'Company',
    body: 'My company. A trading platform built around live candles, the tape and risk tooling, where speed and accuracy come first.',
    site: '',
    source: '',
    gif: gif('travauxus-dither'),
    // opens as a folder: one file per landing-page version, click to play
    items: [
      { id: 'tvx-squish', thesis: 'Cards that squish as you scroll, so the page feels physical.', detail: 'Dark landing: THE MARKET, EXPLAINED. Six tools, one platform.', name: 'Squish cards', date: 'May 29', gif: gif('travauxus-squish'), video: media('travauxus-squish.mp4') },
      { id: 'tvx-ascii', thesis: 'If it is a terminal, draw it like one.', detail: 'The whole page in ASCII: curve, candles, tape and flags.', name: 'ASCII terminal', date: 'Oct 15', gif: gif('travauxus-ascii'), video: media('travauxus-ascii.mp4') },
      { id: 'tvx-opening', thesis: 'The intro should happen in the page, not in front of it.', detail: 'No splash screen or scroll lock: the mark assembles while the page stays usable.', name: 'Opening', date: 'Oct 19', gif: gif('travauxus-opening'), video: media('travauxus-opening.mp4') },
      { id: 'tvx-dither', thesis: 'One picture for the whole page.', detail: 'A single dithered field: the mark becomes the curve, the candles and the tape as you scroll.', name: 'Dither stage', date: 'Oct 25', gif: gif('travauxus-dither'), video: media('travauxus-dither.mp4') },
    ],
  },
  {
    id: 'a5',
    thesis: 'A consultancy should look as considered as the software it sells.',
    facts: ['AI & workflow automation', 'Custom software & web apps', 'Business systems integration', 'Blob navigation, oversized type, print card to match'],
    name: 'a5 Consulting',
    year: '2026',
    kind: 'Website + card',
    body: 'Website and business card for a5 Consulting, the AI & software consultancy of Aryaman Saini.',
    site: '',
    source: '',
    gif: gif('a5-site'),
    items: [
      { id: 'a5-site', thesis: 'Navigation should be the most memorable thing on the page.', detail: 'Blob menu, Ari*saini type, contact and case-study pages.', name: 'Website', date: 'Nov 9', gif: gif('a5-site'), video: media('a5-site.mp4') },
      { id: 'a5-card-1', thesis: 'The card should read from across a table.', detail: 'Oversized Ari*saini, QR code, AI & Automation / Custom Software.', name: 'Card front', date: 'PDF', gif: gif('a5-card-1'), image: media('a5-card-1.jpg'), file: media('a5-business-card.pdf') },
      { id: 'a5-card-2', thesis: 'The back does the explaining.', detail: 'a5 mark, role, phone and email, the three services.', name: 'Card back', date: 'PDF', gif: gif('a5-card-2'), image: media('a5-card-2.jpg'), file: media('a5-business-card.pdf') },
    ],
  },
  {
    id: 'tennisbot',
    thesis: 'Prediction markets misprice tennis, and a model can act on the gap faster than a person.',
    facts: ['Gradient boosting + LSTM hybrid', 'Trained on 50+ years of ATP results', 'Trades Kalshi markets autonomously', 'Manages positions while matches are live'],
    gif: gif('tennisbot'),
    name: 'TennisBot',
    year: '2026',
    kind: 'Python · ML',
    body: 'ATP match prediction and live betting on Kalshi. A hybrid gradient-boosting + LSTM model trained on 50+ years of ATP data looks for edges against market-implied odds and manages positions on its own.',
    site: '',
    source: 'https://github.com/OmSilwaaal/TennisBot77',
  },
  {
    id: 'omprojkect',
    thesis: 'A personal site as a constellation: everything at once, nothing in a menu.',
    facts: ['Seven nodes: About, Music, Philosophy, Info, Code, Photography, Gallery', 'Photos surface as you hover the map', 'Click to play the screen recording'],
    gif: gif('om-site'),
    video: media('om-site.mp4'),
    date: 'Nov 8',
    name: 'OM',
    year: '2026',
    kind: 'Personal site',
    body: 'An earlier personal site: about, music and philosophy.',
    site: 'https://om-projkect.vercel.app',
    source: 'https://github.com/OmSilwaaal/OmProjkect',
  },
  {
    id: 'pusto',
    thesis: 'Some music sounds like a place. This is the place Russian music sounds like to me.',
    facts: ['A PS1-style Soviet panel block at night, built in WebGL', 'One warm window lit; ПУСТО ("empty") painted down the facade', 'Low-poly model, pixelated render, fog and heavy snowfall', 'The recording plays with its music'],
    gif: gif('pusto'),
    video: media('pusto.mp4'),
    sound: true,
    date: 'Nov 10',
    name: 'Pusto',
    year: '2026',
    kind: '3D scene · WebGL',
    body: 'An abandoned Soviet apartment block in falling snow, made out of my obsession with Russian music: the cold, the concrete and the loneliness inside it.',
    site: '',
    source: '',
  },
  {
    id: 'newthing',
    thesis: 'The early internet was loud, hostile and funny. This is that, on purpose.',
    facts: ['Fake virus alerts and mail scanners', 'CLAIM NOW pop-ups that multiply', 'A Y2K desktop parody in the browser'],
    gif: gif('newthing'),
    name: 'ket-ovrdse.com',
    year: '2026',
    kind: 'Web parody',
    body: 'A Y2K pop-up spam parody: fake virus alerts, CLAIM NOW buttons, the full early-internet experience.',
    site: 'https://newthing-five.vercel.app',
    source: 'https://github.com/OmSilwaaal/newthing',
  },
  {
    id: 'vitalis',
    thesis: 'Track what you actually eat, down to the micronutrient, without the app feeling like homework.',
    facts: ['Snap a photo or scan a barcode; every food is matched to USDA data', 'Calorie ring, water and Apple Watch daylight on Home', 'Full vitamin and mineral breakdown with 7-day trends', 'Map of nearby butchers, farms and raw-food suppliers', 'Apple Health sync, widgets, friends and streaks'],
    gif: gif('vitalis'),
    name: 'Vitalis',
    year: '2026',
    kind: 'iOS app · SwiftUI',
    body: 'A nutrition tracker for iPhone in monochrome Liquid Glass: log meals by photo or barcode, see every nutrient you hit or miss, and find real food near you.',
    site: '',
    source: 'https://github.com/OmSilwaaal/primal',
  },
]

export const work = [
  {
    id: 'w-travauxus',
    name: 'Travauxus',
    role: 'Founder',
    years: '2026 – Now',
    body: 'Founder and engineer. Building a trading platform with live candles, tape and risk tooling.',
  },
]

export const contact = {
  intro: 'Find me here.',
  links: [social.instagram, social.linkedin, social.github],
}
