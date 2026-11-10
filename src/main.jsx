import { createRoot } from 'react-dom/client'
import '@fontsource/pixelify-sans/400.css'
import '@fontsource/pixelify-sans/600.css'
import '@fontsource/pixelify-sans/700.css'
import './styles.css'
import App from './App'

createRoot(document.getElementById('root')).render(
  // StrictMode is intentionally off: its double-mount empties drei's <Html> portal root.
  <App />,
)
