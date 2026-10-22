export type LegalDoc = {
  slug: 'terms' | 'privacy'
  title: string
  description: string
  paragraphs: string[]
}

export const terms: LegalDoc = {
  slug: 'terms',
  title: 'Terms',
  description: 'The short terms for using Gusto’s Guide.',
  paragraphs: [
    'Gusto’s Guide is Augusto’s guide to restaurants and places in the cities we cover. These terms cover gustosguide.com and the same site on its pages.dev address.',
    'The writing is personal opinion. A restaurant can close, move, or change its hours. Check before you go.',
    'You can read the guide without an account. If you sign in, with email or with X, you are responsible for the lists, statuses, plans, comments, and photos you add.',
    'Post only words and photos that are yours, or that you have permission to share. Don’t post someone else’s private information.',
    'Don’t copy the guide into another product, scrape it, or present the house lists as your own.',
    'We may remove a comment, a photo, or an account that is abusive, illegal, or unrelated to the guide.',
    'Questions go to hello@gustosguide.com. How the account data is stored is on /privacy.',
  ],
}

export const privacy: LegalDoc = {
  slug: 'privacy',
  title: 'Privacy',
  description: 'What Gusto’s Guide stores, and how to ask for it to be deleted.',
  paragraphs: [
    'Gusto’s Guide does not run ads and does not sell your data.',
    'Browsing the guide does not create an account. A name you type on a phone that never signs in to Supabase stays on that device.',
    'If you sign in, the account is stored with Supabase. We keep the email you used, or your X handle, and the name and avatar that come with that sign-in.',
    'We also keep the lists you make, the statuses you set (such as To go and Been), the plans you host or join, the comments you write, and the photos you upload.',
    'People you invite can see the lists, plans, and comments you share with them. Photos you add to a place are visible to friends.',
    'To delete your account and the lists, statuses, plans, comments, and photos tied to it, email hello@gustosguide.com.',
    'The map is drawn by OpenStreetMap and OpenFreeMap. Those services see the map request from your browser. They do not receive your account.',
    'The rules for using the guide are on /terms.',
  ],
}

export const legalDocs = [terms, privacy]
