import type { CityId } from '../lib/city.ts'

export type HomeFeaturedGuide = {
  slug: string
  title: string
  count: number
}

export const HOME_FEATURED: Record<CityId, HomeFeaturedGuide[]> = {
  "seattle": [
    {
      "slug": "pike-place",
      "title": "Pike Place Market Essentials",
      "count": 22
    },
    {
      "slug": "best-bakeries",
      "title": "Best Bakeries & Pastry",
      "count": 25
    },
    {
      "slug": "best-pizza",
      "title": "Best Pizza in Seattle",
      "count": 20
    },
    {
      "slug": "late-night",
      "title": "Late-Night Eats",
      "count": 7
    },
    {
      "slug": "cocktail-bars",
      "title": "Best Cocktail Bars",
      "count": 20
    },
    {
      "slug": "classics",
      "title": "Seattle Classics & Institutions",
      "count": 15
    }
  ],
  "eastside": [
    {
      "slug": "best-of-bellevue",
      "title": "Best of Bellevue",
      "count": 7
    },
    {
      "slug": "bellevue",
      "title": "Bellevue Essentials",
      "count": 17
    },
    {
      "slug": "kirkland",
      "title": "Best of Kirkland",
      "count": 12
    },
    {
      "slug": "best-breakfast-on-the-east-side",
      "title": "Best Breakfast on the Eastside",
      "count": 12
    },
    {
      "slug": "eastside-drinks",
      "title": "Drinks on the Eastside",
      "count": 12
    }
  ],
  "la": [
    {
      "slug": "santa-monica",
      "title": "Santa Monica",
      "count": 22
    },
    {
      "slug": "venice",
      "title": "Venice",
      "count": 11
    },
    {
      "slug": "beverly-grove",
      "title": "Beverly Grove",
      "count": 5
    },
    {
      "slug": "la-sushi",
      "title": "Sushi and Japanese",
      "count": 9
    },
    {
      "slug": "downtown-la",
      "title": "Downtown",
      "count": 14
    }
  ],
  "sf": [
    {
      "slug": "sf-mission-district",
      "title": "Mission District",
      "count": 14
    },
    {
      "slug": "sf-north-beach",
      "title": "North Beach",
      "count": 4
    },
    {
      "slug": "sf-italian",
      "title": "Italian",
      "count": 8
    },
    {
      "slug": "sf-seafood",
      "title": "Seafood",
      "count": 4
    },
    {
      "slug": "sf-embarcadero",
      "title": "Embarcadero",
      "count": 9
    },
    {
      "slug": "sf-new-american",
      "title": "New American",
      "count": 11
    }
  ],
  "eastbay": [
    {
      "slug": "east-bay",
      "title": "East Bay",
      "count": 4
    }
  ],
  "peninsula": [
    {
      "slug": "peninsula",
      "title": "Peninsula",
      "count": 9
    }
  ],
  "northbay": [
    {
      "slug": "north-bay",
      "title": "North Bay",
      "count": 6
    }
  ],
  "vancouver": [
    {
      "slug": "van-granville-island-public-market",
      "title": "Granville Island Public Market",
      "count": 5
    },
    {
      "slug": "van-downtown",
      "title": "Downtown",
      "count": 30
    },
    {
      "slug": "van-coal-harbour",
      "title": "Coal Harbour",
      "count": 14
    },
    {
      "slug": "van-seafood",
      "title": "Seafood",
      "count": 12
    },
    {
      "slug": "van-italian",
      "title": "Italian",
      "count": 10
    },
    {
      "slug": "van-japanese",
      "title": "Japanese",
      "count": 10
    }
  ],
  "portland": [
    {
      "slug": "pdx-downtown",
      "title": "Downtown",
      "count": 7
    },
    {
      "slug": "pdx-pearl-district",
      "title": "Pearl District",
      "count": 5
    },
    {
      "slug": "pdx-new-american",
      "title": "New American",
      "count": 6
    },
    {
      "slug": "pdx-pizza",
      "title": "Pizza",
      "count": 4
    },
    {
      "slug": "pdx-health-food",
      "title": "Health food",
      "count": 4
    }
  ],
  "nyc": [
    {
      "slug": "nyc-tribeca",
      "title": "Tribeca",
      "count": 37
    },
    {
      "slug": "nyc-west-village",
      "title": "West Village",
      "count": 17
    },
    {
      "slug": "nyc-soho",
      "title": "SoHo",
      "count": 17
    },
    {
      "slug": "nyc-italian",
      "title": "Italian",
      "count": 27
    },
    {
      "slug": "nyc-french",
      "title": "French",
      "count": 23
    },
    {
      "slug": "nyc-steak",
      "title": "Steak",
      "count": 13
    }
  ],
  "pullman": [
    {
      "slug": "pul-game-day",
      "title": "Game day in Pullman",
      "count": 13
    },
    {
      "slug": "pul-cafe",
      "title": "Cafe",
      "count": 4
    }
  ],
  "moscow": [
    {
      "slug": "best-of-moscow-id",
      "title": "Best of Moscow, ID",
      "count": 15
    }
  ],
  "sandiego": [
    {
      "slug": "sd-little-italy",
      "title": "Little Italy",
      "count": 7
    },
    {
      "slug": "sd-coronado",
      "title": "Coronado",
      "count": 5
    },
    {
      "slug": "sd-la-jolla",
      "title": "La Jolla",
      "count": 5
    },
    {
      "slug": "sd-seafood",
      "title": "Seafood",
      "count": 4
    },
    {
      "slug": "sd-mexican",
      "title": "Mexican",
      "count": 12
    },
    {
      "slug": "sd-north-park",
      "title": "North Park",
      "count": 5
    }
  ]
}
