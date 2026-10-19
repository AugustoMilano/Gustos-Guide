const key = process.env.FOURSQUARE_API_KEY
if (!key) {
  console.log(
    'FOURSQUARE_API_KEY is not set. Skipping Foursquare photo fetch. Owner uploads, Wikimedia files, and labeled illustrations cover photos until a key exists.',
  )
  process.exit(0)
}

console.log(
  'FOURSQUARE_API_KEY is set, but this script is still a no-op. Photo IDs are not fetched yet. Use owner uploads or scripts/fetch-wikimedia.mjs.',
)
process.exit(0)
