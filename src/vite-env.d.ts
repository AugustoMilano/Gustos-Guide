interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_AUTH_PROVIDERS?: string
}

declare module '*?url' {
  const href: string
  export default href
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
