import { lazy, Suspense } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { Footer } from './components/Footer.tsx'
import { Header } from './components/Header.tsx'
import { GuidePage } from './pages/GuidePage.tsx'
import { HomePage } from './pages/HomePage.tsx'
import { NotFoundPage } from './pages/NotFoundPage.tsx'
import { PlacePage } from './pages/PlacePage.tsx'
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

function Shell() {
  const { announcement } = useApp()
  const { pathname } = useLocation()
  return (
    <>
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
      <Suspense fallback={<main className="px-4 pt-28">Loading…</main>}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/guides" element={<GuideIndexPage />} />
          <Route path="/guide/:slug" element={<GuidePage />} />
          <Route path="/place/:slug" element={<PlacePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/feed" element={<FeedPage />} />
          <Route path="/plans" element={<PlansPage />} />
          <Route path="/plans/wizard" element={<PlanWizardPage />} />
          <Route path="/plan/:id" element={<PlanDetailPage />} />
          <Route path="/list/:id" element={<ListPage />} />
          <Route path="/join/:token" element={<JoinPage />} />
          <Route path="/rank" element={<RankPage />} />
          <Route path="/my" element={<MyGuidesPage />} />
          <Route path="/u/:handle" element={<ProfilePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
      {pathname === '/explore' ? null : <Footer />}
      <div className="sr-only" aria-live="polite">{announcement}</div>
    </>
  )
}

export function App() {
  return <Shell />
}
