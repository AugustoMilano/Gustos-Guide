import { legalDocs, type LegalDoc } from '../content/legal.ts'
import { SITE_ORIGIN } from '../lib/site.ts'
import { usePageMeta } from '../lib/meta.ts'

function RichText({ text }: { text: string }) {
  const parts = text.split(/(hello@gustosguide\.com|\/privacy|\/terms)/g)
  return (
    <p>
      {parts.map((part, index) => {
        if (part === 'hello@gustosguide.com') {
          return <a key={index} href="mailto:hello@gustosguide.com">{part}</a>
        }
        if (part === '/privacy' || part === '/terms') {
          return <a key={index} href={`${part}/`}>{part}/</a>
        }
        return part
      })}
    </p>
  )
}

export function LegalPage({ slug }: { slug: LegalDoc['slug'] }) {
  const doc = legalDocs.find((item) => item.slug === slug) ?? legalDocs[0]
  usePageMeta(`${doc.title} · Gusto's Guide`, doc.description, './og/og.png', `${SITE_ORIGIN}/${doc.slug}/`)
  return (
    <main id="main" tabIndex={-1} className="mx-auto max-w-2xl px-4 pt-28 pb-8 outline-none">
      <p className="text-xs font-bold tracking-[0.14em] uppercase">Gusto's Guide</p>
      <h1 className="mt-2 font-serif text-5xl italic">{doc.title}</h1>
      <div className="mt-6 space-y-4 text-base leading-relaxed">
        {doc.paragraphs.map((paragraph) => <RichText key={paragraph} text={paragraph} />)}
      </div>
    </main>
  )
}
