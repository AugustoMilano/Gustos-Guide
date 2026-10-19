import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { Footer } from './components/Footer.tsx'
import { Header } from './components/Header.tsx'
import { ImportLocalSheet } from './components/ImportLocalSheet.tsx'
import { Modal } from './components/Modal.tsx'
import { GuidePage } from './pages/GuidePage.tsx'
import { HomePage } from './pages/HomePage.tsx'
import { LegalPage } from './pages/LegalPage.tsx'
import { NotFoundPage } from './pages/NotFoundPage.tsx'
import { PlacePage } from './pages/PlacePage.tsx'
import { InstallHint } from './components/InstallHint.tsx'
import { barePath } from './lib/city.ts'
import { directLegalSlug } from './lib/site.ts'
import { useApp } from './state/AppState.tsx'

const GuideIndexPage = lazy(() => import('./pages/GuideIndexPage.tsx').then((module) => ({ default: module.GuideIndexPage })))
const SearchPage = lazy(() => import('./pages/SearchPage.tsx').then((module) => ({ default: module.SearchPage })))
const FeedPage = lazy(() => import('./pages/FeedPage.tsx').then((module) => ({ default: module.FeedPage })))
const PlansPage = lazy(() => import('./pages/PlanPage.tsx').then((module) => ({ default: module.PlansPage })))
const PlanDetailPage = lazy(() => import('./pages/PlanPage.tsx').then((module) => ({ default: module.PlanDetailPage })))
const RankPage = lazy(() => import('./pages/RankPage.tsx').then((module) => ({ default: module.RankPage })))
const MyGuidesPage = lazy(() => import('./pages/MyGuidesPage.tsx').then((module) => ({ default: module.MyGuidesPage })))
const ProfilePage = lazy(() => import('./pages/ProfilePage.tsx').then((module) => ({ default: module.ProfilePage })))
const ExplorePage = lazy(() => import('./pages/ExplorePage.tsx').then((module) => ({ default: module.ExplorePage })))
const PlanWizardPage = lazy(() => import('./pages/PlanPage.tsx').then((module) => ({ default: module.PlanWizardPage })))
const ListPage = lazy(() => import('./pages/ListPage.tsx').then((module) => ({ default: module.ListPage })))
const JoinPage = lazy(() => import('./pages/JoinPage.tsx').then((module) => ({ default: module.JoinPage })))
const TonightPage = lazy(() => import('./pages/TonightPage.tsx').then((module) => ({ default: module.TonightPage })))
const ScoreQueuePage = lazy(() => import('./pages/ScoreQueuePage.tsx').then((module) => ({ default: module.ScoreQueuePage })))

function ScrollManager() {
  const location = useLocation()
  const positions = useRef(new Map<string, number>())
  useEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
  }, [])
  useEffect(() => {
    const key = location.key
    const saved = positions.current.get(key) ?? 0
    let last = saved
    window.scrollTo(0, saved)
    const save = () => {
      last = window.scrollY
      positions.current.set(key, last)
    }
    window.addEventListener('scroll', save, { passive: true })
    document.addEventListener('scroll', save, { passive: true })
    return () => {
      // WebKit can jump back to 0 before cleanup, without a scroll event.
      const y = window.scrollY
      positions.current.set(key, y > 0 ? y : last)
      window.removeEventListener('scroll', save)
      document.removeEventListener('scroll', save)
    }
  }, [location.key])
  return null
}

function BackToTop() {
  const { pathname } = useLocation()
  const [show, setShow] = useState(false)
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 700)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [pathname])
  if (!show || barePath(pathname) === '/explore') return null
  return (
    <button
      type="button"
      className="back-to-top"
      onClick={() => {
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
      }}
    >
      Top
    </button>
  )
}

function OfflineBanner() {
  const [offline, setOffline] = useState(() => typeof navigator !== 'undefined' && !navigator.onLine)
  useEffect(() => {
    const on = () => setOffline(false)
    const off = () => setOffline(true)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  if (!offline) return null
  return <p className="offline-banner" role="status">You are offline. Pages you already opened still work. New ones wait for a connection.</p>
}

function PageSkeleton() {
  return (
    <main id="main" className="mx-auto max-w-6xl px-4 pt-24" aria-busy="true" aria-live="polite">
      <p className="sr-only">Loading</p>
      <div className="skeleton h-12 w-2/3 max-w-md" />
      <div className="skeleton mt-4 h-6 w-1/2 max-w-sm" />
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="skeleton h-40" />
        <div className="skeleton h-40" />
      </div>
    </main>
  )
}

function AuthErrorSheet() {
  const { authError, clearAuthError } = useApp()
  if (!authError) return null
  return (
    <Modal onClose={clearAuthError} label="Sign-in problem">
      <div className="p-5">
        <h2 className="font-serif text-4xl italic">Couldn't sign in</h2>
        <p className="mt-3 text-sm">The link came back without a session. This is the note from sign-in, so it can be matched to the auth log:</p>
        <p className="mt-3 break-words border-2 border-ink bg-cream p-3 text-sm">{authError}</p>
        <button type="button" className="btn btn-coral mt-4" onClick={clearAuthError}>
          Close
        </button>
      </div>
    </Modal>
  )
}

function Shell() {
  const { announcement, importOffer, acceptImport, dismissImport } = useApp()
  const { pathname } = useLocation()
  const legal = directLegalSlug()
  return (
    <>
      <ScrollManager />
      <OfflineBanner />
      <button
        type="button"
        className="skip"
        onClick={() => {
          const main = document.getElementById('main')
          main?.focus()
          main?.scrollIntoView()
        }}
      >
        Skip to content
      </button>
      <Header />
      <Suspense fallback={<PageSkeleton />}>
        {legal ? (
          <LegalPage slug={legal} />
        ) : (
        <Routes>
          {['', '/seattle'].flatMap((prefix) => [
            <Route key={`${prefix}-home`} path={prefix || '/'} element={<HomePage />} />,
            <Route key={`${prefix}-explore`} path={`${prefix}/explore`} element={<ExplorePage />} />,
            <Route key={`${prefix}-guides`} path={`${prefix}/guides`} element={<GuideIndexPage />} />,
            <Route key={`${prefix}-guide`} path={`${prefix}/guide/:slug`} element={<GuidePage />} />,
            <Route key={`${prefix}-place`} path={`${prefix}/place/:slug`} element={<PlacePage />} />,
            <Route key={`${prefix}-search`} path={`${prefix}/search`} element={<SearchPage />} />,
            <Route key={`${prefix}-feed`} path={`${prefix}/feed`} element={<FeedPage />} />,
            <Route key={`${prefix}-tonight`} path={`${prefix}/tonight`} element={<TonightPage />} />,
            <Route key={`${prefix}-score`} path={`${prefix}/score`} element={<ScoreQueuePage />} />,
            <Route key={`${prefix}-plans`} path={`${prefix}/plans`} element={<PlansPage />} />,
            <Route key={`${prefix}-wizard`} path={`${prefix}/plans/wizard`} element={<PlanWizardPage />} />,
            <Route key={`${prefix}-plan`} path={`${prefix}/plan/:id`} element={<PlanDetailPage />} />,
            <Route key={`${prefix}-list`} path={`${prefix}/list/:id`} element={<ListPage />} />,
            <Route key={`${prefix}-join`} path={`${prefix}/join/:token`} element={<JoinPage />} />,
            <Route key={`${prefix}-rank`} path={`${prefix}/rank`} element={<RankPage />} />,
            <Route key={`${prefix}-my`} path={`${prefix}/my`} element={<MyGuidesPage />} />,
            <Route key={`${prefix}-profile`} path={`${prefix}/u/:handle`} element={<ProfilePage />} />,
          ])}
          <Route path="/terms" element={<LegalPage slug="terms" />} />
          <Route path="/privacy" element={<LegalPage slug="privacy" />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        )}
      </Suspense>
      {barePath(pathname) === '/explore' ? null : <Footer />}
      <InstallHint />
      <BackToTop />
      {importOffer ? <ImportLocalSheet offer={importOffer} onAccept={() => void acceptImport()} onDismiss={dismissImport} /> : null}
      <AuthErrorSheet />
      <div className="sr-only" aria-live="polite">{announcement}</div>
    </>
  )
}

export function App() {
  return <Shell />
}
