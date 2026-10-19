import { useEffect } from 'react'
import { canonicalUrl } from './site.ts'

function upsert(attr: 'name' | 'property', key: string, content: string) {
  let node = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (!node) {
    node = document.createElement('meta')
    node.setAttribute(attr, key)
    document.head.appendChild(node)
  }
  node.setAttribute('content', content)
}

export function usePageMeta(title: string, description: string, image?: string, canonicalOverride?: string) {
  useEffect(() => {
    document.title = title
    const node = document.querySelector('meta[name="description"]')
    const previous = node?.getAttribute('content') ?? ''
    node?.setAttribute('content', description)
    const picture = image ? new URL(image, window.location.href).href : ''
    const canonical = canonicalOverride || canonicalUrl()
    let link = document.head.querySelector('link[rel="canonical"]')
    if (!link) {
      link = document.createElement('link')
      link.setAttribute('rel', 'canonical')
      document.head.appendChild(link)
    }
    link.setAttribute('href', canonical)
    upsert('property', 'og:title', title)
    upsert('property', 'og:description', description)
    upsert('property', 'og:type', 'website')
    upsert('property', 'og:url', canonical)
    upsert('name', 'twitter:title', title)
    upsert('name', 'twitter:description', description)
    if (picture) {
      upsert('property', 'og:image', picture)
      upsert('name', 'twitter:image', picture)
    }
    return () => {
      document.title = "Gusto's Guide"
      node?.setAttribute('content', previous)
    }
  }, [title, description, image, canonicalOverride])
}
