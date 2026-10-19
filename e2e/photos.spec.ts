import { expect, test } from '@playwright/test'
import { displayPhotos, mergeUploads, type LivePhoto } from '../src/lib/gallery.ts'

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
