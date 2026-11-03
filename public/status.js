;(function () {
  var path = (location.hash.replace(/^#/, '') || '/').split('?')[0].replace(/\/$/, '') || '/'
  var homes = { '/': 1, '/seattle': 1, '/eastside': 1, '/la': 1, '/sf': 1, '/eastbay': 1, '/peninsula': 1, '/northbay': 1, '/sandiego': 1 }
  var navy = homes[path] === 1
  // The landing heading ships as static HTML in index.html; it only shows on the landing route.
  if (path === '/') document.documentElement.dataset.prerender = '1'
  // Top 25 deep links: show the static intro shipped in index.html (fix77) until React replaces it.
  var cityM = path.match(/^\/(seattle|eastside|la|sf|eastbay|peninsula|northbay|sandiego)(?=\/|$)/)
  var cityId = cityM ? cityM[1] : 'seattle'
  if ((path.replace(/^\/[a-z]+(?=\/top$)/, '')) === '/top') {
    var region = { la: 'la', sandiego: 'sandiego', sf: 'sf', eastbay: 'sf', peninsula: 'sf', northbay: 'sf' }[cityId] || 'seattle'
    var de = document.documentElement
    de.dataset.prerender = 'top'
    de.dataset.preRegion = region
    de.dataset.header = region === 'la' || region === 'sandiego' ? 'single' : 'areas'
    document.addEventListener('DOMContentLoaded', function () {
      var areas = { seattle: 'Seattle', eastside: 'Seattle\u2019s Eastside', la: 'Los Angeles', sf: 'San Francisco', eastbay: 'The East Bay', peninsula: 'The Peninsula', northbay: 'The North Bay', sandiego: 'San Diego' }
      var kicker = document.querySelector('.pre-top-area')
      if (kicker) kicker.textContent = areas[cityId]
      var ranks = document.querySelectorAll('.pre-top-rank')
      for (var k = 0; k < ranks.length; k++) ranks[k].setAttribute('href', cityM ? '#/' + cityId + '/rank' : '#/rank')
    })
  }
  var color = navy ? '#141F4D' : '#FFFAF3'
  document.documentElement.dataset.status = navy ? 'navy' : 'cream'
  document.documentElement.style.setProperty('--status-bar', color)
  document.documentElement.style.backgroundColor = color
  var nodes = document.querySelectorAll('meta[name="theme-color"]')
  for (var i = 0; i < nodes.length; i++) nodes[i].setAttribute('content', color)
  // Deep links to heavy routes: fetch their chunks alongside the entry bundle (list stamped at build).
  var routes = /*ROUTE_PRELOADS*/{}
  var bare = path.replace(/^\/(seattle|eastside|la|sf|eastbay|peninsula|northbay|sandiego)(?=\/|$)/, '') || '/'
  var want = bare === '/top' ? routes.top : null
  if (want) {
    for (var j = 0; j < want.length; j++) {
      var link = document.createElement('link')
      link.rel = 'modulepreload'
      link.href = '/' + want[j]
      document.head.appendChild(link)
    }
  }
  // Place deep links: preload the hero photo (same srcset and sizes as PhotoFrame) in parallel
  // with the app instead of after the catalog. Only a hint; the page still picks its own photo.
  var placeId = bare.indexOf('/place/') === 0 ? bare.slice(7).split('/')[0] : ''
  if (placeId && window.fetch) {
    fetch('/heroes.json', { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.json() : {} }).then(function (map) {
      var set = map[decodeURIComponent(placeId)]
      if (!set) return
      var hint = document.createElement('link')
      hint.rel = 'preload'
      hint.as = 'image'
      hint.type = 'image/webp'
      hint.setAttribute('imagesrcset', set)
      hint.setAttribute('imagesizes', '(min-width: 1024px) 36rem, calc(100vw - 2rem)')
      hint.setAttribute('fetchpriority', 'high')
      document.head.appendChild(hint)
    }).catch(function () {})
  }
})()
