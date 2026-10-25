import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const file = JSON.parse(readFileSync(join(root, 'data/permanent-exclusions.json'), 'utf8'))

export const permanentExclusions = file.places

function normName(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function slugify(value) {
  const slug = String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'place'
}

const ids = new Set(permanentExclusions.map((place) => place.id))
const names = new Set(permanentExclusions.map((place) => normName(place.name)))

export function exclusionIds() {
  return ids
}

export function permanentlyExcluded(place) {
  if (!place) return false
  if (place.id && ids.has(place.id)) return true
  if (place.placeId && ids.has(place.placeId)) return true
  if (place.name && names.has(normName(place.name))) return true
  if (place.name && ids.has(slugify(place.name))) return true
  return false
}
