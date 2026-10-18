import { useEffect } from 'react'

export function usePageMeta(title: string, description: string) {
  useEffect(() => {
    document.title = title
    const node = document.querySelector('meta[name="description"]')
    const previous = node?.getAttribute('content') ?? ''
    node?.setAttribute('content', description)
    return () => {
      document.title = "Gusto's Guide"
      node?.setAttribute('content', previous)
    }
  }, [title, description])
}
