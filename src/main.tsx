import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import 'leaflet/dist/leaflet.css'
import { App } from './App.tsx'
import { GuideProvider } from './state/GuideContext.tsx'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GuideProvider>
      <HashRouter>
        <App />
      </HashRouter>
    </GuideProvider>
  </StrictMode>,
)
