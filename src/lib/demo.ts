import type { Activity, Plan, UserGuide } from '../types.ts'

export type DemoUser = {
  id: string
  name: string
  handle: string
  demo: true
  neighborhood: string
  streak: number
  scores: Record<string, number>
  been: string[]
}

type DemoFile = {
  users: DemoUser[]
  activities: Activity[]
  lists: UserGuide[]
  plans: Plan[]
}

/** Seeded friends stay off unless a dev server is started with VITE_DEMO_FRIENDS=1. Production builds drop this. */
export const demoFriendsEnabled = import.meta.env.DEV && import.meta.env.VITE_DEMO_FRIENDS === '1'

const empty: DemoFile = { users: [], activities: [], lists: [], plans: [] }

export const demo: DemoFile = demoFriendsEnabled
  ? (await import('../content/demo.json')).default as DemoFile
  : empty
