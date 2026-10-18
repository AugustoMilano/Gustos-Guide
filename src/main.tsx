import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import 'leaflet/dist/leaflet.css'
import { App } from './App.tsx'
import { loadGuides, loadPlaces } from './content/load.ts'
import { AppProvider } from './state/AppState.tsx'
import './index.css'

void loadPlaces()
void loadGuides()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider>
      <HashRouter>
        <App />
      </HashRouter>
    </AppProvider>
  </StrictMode>,
)
