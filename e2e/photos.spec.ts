import { expect, test } from '@playwright/test'
import { displayPhotos, mergeUploads, type LivePhoto } from '../src/lib/gallery.ts'
import { photoQueue, type RankedGuide } from '../src/lib/photo-queue.ts'
import type { SlimPlace } from '../src/types.ts'

const place = {
  id: 'louie-s-deli',
  name: "Louie's Deli",
  cuisine: ['Deli'],
  neighborhood: 'Capitol Hill',
  photo: {
    source: 'wikimedia' as const,
    url: 'https://upload.wikimedia.org/example.jpg',
    alt: 'The counter',
    credit: 'Wikimedia',
  },
}

function shot(partial: Partial<LivePhoto> & Pick<LivePhoto, 'id' | 'owner' | 'url'>): LivePhoto {
  return {
    placeId: 'louie-s-deli',
    userName: partial.owner ? 'Gusto' : 'Sam',
    width: 1,
    height: 1,
    ...partial,
  }
}

test('owner photos lead, and a private signed url does not hide the public one from visitors', () => {
  const house = shot({
    id: 'house',
    owner: true,
    url: 'https://example.supabase.co/storage/v1/object/public/owner-photos/a.webp',
    shareUrl: 'https://example.supabase.co/storage/v1/object/public/owner-photos/a.webp',
  })
  const signed = shot({
    id: 'house',
    owner: true,
    url: 'https://example.supabase.co/storage/v1/object/sign/place-photos/a.webp?token=abc',
    shareUrl: house.shareUrl,
  })
  const friend = shot({ id: 'friend', owner: false, url: 'https://example.supabase.co/storage/v1/object/sign/place-photos/b.webp?token=def' })

  const visitor = mergeUploads([house], [])
  const visitorShots = displayPhotos(place, visitor)
  expect(visitorShots.map((photo) => photo.credit)).toEqual(['Photo by Gusto', 'Wikimedia'])
  expect(visitorShots[0]?.shareUrl).toContain('/object/public/owner-photos/')

  const member = mergeUploads([house], [signed, friend])
  const memberShots = displayPhotos(place, member)
  expect(memberShots.map((photo) => photo.credit)).toEqual(['Photo by Gusto', 'Photo by Sam', 'Wikimedia'])
  expect(memberShots[0]?.url).toContain('token=')
  expect(memberShots[0]?.shareUrl).toContain('/object/public/owner-photos/')

  expect(displayPhotos(place, []).map((photo) => photo.credit)).toEqual(['Wikimedia'])
  expect(displayPhotos({ ...place, photo: undefined }, []).map((photo) => photo.illustration)).toEqual([true])
})

function sample(partial: Partial<SlimPlace> & Pick<SlimPlace, 'id' | 'name'>): SlimPlace {
  return {
    neighborhood: 'Ballard',
    address: '',
    lat: 0,
    lng: 0,
    cuisine: ['Steak'],
    placeType: 'restaurant',
    price: 2,
    oneLiner: '',
    perfectFor: [],
    periods: [],
    gustoScore: null,
    photo: { source: 'illustration', alt: '', credit: 'Illustration' },
    appleMapsUrl: '',
    guideSlugs: [],
    publicRating: { value: 4, count: 10, source: 'Yelp' },
    ...partial,
  }
}

test('photo queue puts ranked guide leaders ahead of the home list', () => {
  const guides = [
    { slug: 'best-pizza', title: 'Best Pizza in Seattle', ranked: true, entries: [{ placeId: 'lupo' }, { placeId: 'dino' }, { placeId: 'pie' }, { placeId: 'rest' }] },
  ] as RankedGuide[]
  const places = [
    sample({ id: 'quiet', name: 'Quiet', guideSlugs: ['a', 'b', 'c'], publicRating: undefined, appleRating: undefined }),
    sample({ id: 'lupo', name: 'Lupo', guideSlugs: ['best-pizza'] }),
    sample({ id: 'wiki', name: 'Wiki', photo: { source: 'wikimedia', url: 'https://example.com/a.jpg', alt: '', credit: 'Wikimedia' } }),
    sample({ id: 'hit', name: 'Hit', neighborhood: 'Fremont', publicRating: { value: 5, count: 20, source: 'Yelp' } }),
    sample({ id: 'owned', name: 'Owned' }),
  ]
  const queue = photoQueue(places, guides, [{ id: 'p', placeId: 'owned', userName: 'Gusto', owner: true, url: 'https://example.com/o.webp', width: 1, height: 1 }])
  expect(queue.map((row) => row.place.id)).toEqual(['lupo', 'hit', 'quiet'])
  expect(queue[0]?.reason).toBe('Best Pizza in Seattle · 1')
  expect(queue[1]?.reason).toBe('Home list')
  expect(queue[2]?.reason).toBe('3 guides')
})
