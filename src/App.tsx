import { useLocation, useNavigate, useParams, type Location } from 'react-router-dom'
import { Route, Routes } from 'react-router-dom'
import { AddCitySheet, AddPlaceSheet, CreateGuideSheet, SaveSheet, SignInSheet } from './components/EditorSheets.tsx'
import { Footer } from './components/Footer.tsx'
import { Header } from './components/Header.tsx'
import { PlaceDetail } from './components/PlaceDetail.tsx'
import { GuidePage } from './pages/GuidePage.tsx'
import { HomePage } from './pages/HomePage.tsx'
import { MyGuidesPage } from './pages/MyGuidesPage.tsx'
import { SearchPage } from './pages/SearchPage.tsx'
import { useGuide } from './state/GuideContext.tsx'

function NotFound() {
  return (
    <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-4 pt-28 outline-none">
      <h1 className="font-serif text-5xl italic">That page wandered off.</h1>
      <a href="#/" className="btn mt-6 inline-flex">
        Back to the guides
      </a>
    </main>
  )
}

function PlaceFallback() {
  const { slug = '' } = useParams()
  const { placeBySlug, guidesForPlace } = useGuide()
  const place = placeBySlug(slug)
  if (!place) return <NotFound />
  const guides = guidesForPlace(place.id)
  const guide = guides.find((item) => item.kind === 'house') ?? guides[0]
  if (!guide) return <HomePage />
  if (guide.kind === 'house') return <GuidePage slugOverride={guide.slug} />
  return <GuidePage idOverride={guide.id} />
}

function PlaceRoute() {
  const { pathname } = useLocation()
  const { placeBySlug } = useGuide()
  const slug = decodeURIComponent(pathname.match(/^\/place\/([^/]+)/)?.[1] ?? '')
  const place = slug ? placeBySlug(slug) : undefined
  if (!place) return null
  return <PlaceDetail place={place} />
}

function Shell() {
  const location = useLocation()
  const navigate = useNavigate()
  const { announcement } = useGuide()
  const state = location.state as { background?: Location } | null
  const background = state?.background
  const showingPlace = location.pathname.startsWith('/place/')

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
      <Routes location={showingPlace && background ? background : location}>
        <Route path="/" element={<HomePage />} />
        <Route path="/city/:slug" element={<HomePage />} />
        <Route path="/guide/:slug" element={<GuidePage />} />
        <Route path="/my" element={<MyGuidesPage />} />
        <Route path="/my/:guideId" element={<GuidePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/place/:slug" element={<PlaceFallback />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      {showingPlace ? <PlaceRoute /> : null}
      <Footer />
      <SignInSheet />
      <AddCitySheet onCreated={(slug) => navigate(slug === 'seattle' ? '/' : `/city/${slug}`)} />
      <CreateGuideSheet onCreated={(id) => navigate(`/my/${id}`)} />
      <SaveSheet />
      <AddPlaceSheet />
      <div className="sr-only" aria-live="polite">
        {announcement}
      </div>
    </>
  )
}

export function App() {
  return <Shell />
}
