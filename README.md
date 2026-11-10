# Om — desk

An interactive 3D portfolio: a room at blue hour, a vintage compact computer on the desk,
and a scroll that walks you up to it. The green-phosphor screen is the whole website.

Built with React, Three.js, React Three Fiber, Drei and Vite. Every texture and sound is
generated in code; the only files are the photos, GIFs and screen recordings in `public/media`.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build into dist/
```

## Edit the content

All text, projects, links and media paths live in `src/content.js`.

## Deploy on Vercel

1. Go to https://vercel.com/new and sign in with GitHub.
2. Import this repository.
3. Leave the defaults (Vercel reads `vercel.json`: framework Vite, build `npm run build`, output `dist`).
4. Click **Deploy**. Every push to `main` redeploys automatically.

## Secrets

Special → Clean Up.
