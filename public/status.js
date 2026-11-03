;(function () {
  var path = (location.hash.replace(/^#/, '') || '/').split('?')[0].replace(/\/$/, '') || '/'
  var homes = { '/': 1, '/seattle': 1, '/eastside': 1, '/la': 1, '/sf': 1, '/eastbay': 1, '/peninsula': 1, '/northbay': 1, '/sandiego': 1, '/vancouver': 1, '/portland': 1, '/nyc': 1, '/pullman': 1, '/moscow': 1 }
  var navy = homes[path] === 1
  // The landing heading ships as static HTML in index.html; it only shows on the landing route.
  if (path === '/') document.documentElement.dataset.prerender = '1'
  // Top 25 deep links: show the static intro shipped in index.html (fix77) until React replaces it.
  var cityM = path.match(/^\/(seattle|eastside|la|sf|eastbay|peninsula|northbay|sandiego|vancouver|portland|nyc|pullman|moscow)(?=\/|$)/)
  var cityId = cityM ? cityM[1] : 'seattle'
  if ((path.replace(/^\/[a-z]+(?=\/top$)/, '')) === '/top') {
    var region = { la: 'la', sandiego: 'sandiego', vancouver: 'vancouver', portland: 'portland', nyc: 'nyc', pullman: 'pullman', moscow: 'pullman', sf: 'sf', eastbay: 'sf', peninsula: 'sf', northbay: 'sf' }[cityId] || 'seattle'
    var de = document.documentElement
    de.dataset.prerender = 'top'
    de.dataset.preRegion = region
    de.dataset.header = region === 'la' || region === 'sandiego' || region === 'vancouver' || region === 'portland' || region === 'nyc' ? 'single' : 'areas'
    document.addEventListener('DOMContentLoaded', function () {
      var areas = { seattle: 'Seattle', eastside: 'Seattle\u2019s Eastside', la: 'Los Angeles', sf: 'San Francisco', eastbay: 'The East Bay', peninsula: 'The Peninsula', northbay: 'The North Bay', sandiego: 'San Diego', vancouver: 'Vancouver', portland: 'Portland', nyc: 'New York', pullman: 'Pullman, WA', moscow: 'Moscow, ID' }
      var kicker = document.querySelector('.pre-top-area')
      if (kicker) kicker.textContent = areas[cityId]
      var ranks = document.querySelectorAll('.pre-top-rank')
      for (var k = 0; k < ranks.length; k++) ranks[k].setAttribute('href', cityM ? '#/' + cityId + '/rank' : '#/rank')
    })
  }
  document.documentElement.dataset.area = cityM ? cityId : ''
  var color = navy ? (cityId === 'pullman' && cityM ? '#981E32' : '#141F4D') : '#FFFAF3'
  document.documentElement.dataset.status = navy ? 'navy' : 'cream'
  document.documentElement.style.setProperty('--status-bar', color)
  document.documentElement.style.backgroundColor = color
  var nodes = document.querySelectorAll('meta[name="theme-color"]')
  for (var i = 0; i < nodes.length; i++) nodes[i].setAttribute('content', color)
  var paint = function () {
    document.body.style.backgroundColor = color
    var bar = document.getElementById('top-chrome')
    if (!bar) return
    bar.dataset.color = color
    bar.style.backgroundColor = color
  }
  if (document.body) paint()
  else document.addEventListener('DOMContentLoaded', paint)
  // Deep links to heavy routes: fetch their chunks alongside the entry bundle (list stamped at build).
  var routes = /*ROUTE_PRELOADS*/{}
  var bare = path.replace(/^\/(seattle|eastside|la|sf|eastbay|peninsula|northbay|sandiego|vancouver|portland|nyc|pullman|moscow)(?=\/|$)/, '') || '/'
  // Place deep links skip chunk preloads: the static hero is the first paint there, and its photo
  // needs the bandwidth more than code the app fetches a moment later anyway (C1).
  var want = bare === '/top' ? routes.top : null
  if (want) {
    for (var j = 0; j < want.length; j++) {
      var link = document.createElement('link')
      link.rel = 'modulepreload'
      link.href = '/' + want[j]
      document.head.appendChild(link)
    }
  }
  // Place deep links (C1): fetch the place's own small record so the page renders before the
  // catalog and region data, and preload its hero photo the moment the record lands.
  var placeId = bare.indexOf('/place/') === 0 ? bare.slice(7).split('/')[0] : ''
  // D2: start the app (stamped at build: entry script and its modulepreloads). A module script
  // added during parsing could run before #root exists, so the script waits for the document.
  var bootFiles = /*BOOT*/null
  var booted = false
  var startApp = function () {
    if (booted || !bootFiles) return
    booted = true
    var addScript = function () {
      var script = document.createElement('script')
      script.type = 'module'
      script.crossOrigin = 'anonymous'
      script.src = '/' + bootFiles.entry
      document.head.appendChild(script)
    }
    for (var k = 0; k < bootFiles.preloads.length; k++) {
      var mod = document.createElement('link')
      mod.rel = 'modulepreload'
      mod.crossOrigin = 'anonymous'
      mod.href = '/' + bootFiles.preloads[k]
      document.head.appendChild(mod)
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addScript)
    else addScript()
  }
  window.__gustoStartApp = startApp
  // Safety net: the app starts within 2.5 s even if anything below throws.
  setTimeout(startApp, 2500)
  var waitForHero = false
  var catalogHref = /*CATALOG*/''
  if (catalogHref && !placeId) {
    var pre = document.createElement('link')
    pre.rel = 'preload'
    pre.as = 'fetch'
    pre.href = catalogHref
    pre.crossOrigin = 'anonymous'
    pre.setAttribute('fetchpriority', 'low')
    document.head.appendChild(pre)
  }
  if (placeId && window.fetch && /^[a-z0-9-]+$/.test(placeId)) {
    var placeRegion = { la: 'la', sandiego: 'sandiego', vancouver: 'vancouver', portland: 'portland', nyc: 'nyc', pullman: 'pullman', moscow: 'pullman', sf: 'sf', eastbay: 'sf', peninsula: 'sf', northbay: 'sf' }[cityId] || 'seattle'
    var root = document.documentElement
    root.dataset.preRegion = placeRegion
    root.dataset.header = placeRegion === 'la' || placeRegion === 'sandiego' || placeRegion === 'vancouver' || placeRegion === 'portland' || placeRegion === 'nyc' ? 'single' : 'areas'
    var heroes = /*HEROES*/{}
    // Entry: 1 = the standard /photos/<id>.<w>.webp set; 2 = the same with .avif files too; else
    // [webp srcset, avif srcset or '']. AVIF only where the browser decodes it (Safari 16+, Chrome 85+, Firefox 93+).
    var ua = navigator.userAgent
    var avifOk = /Chrome\/(8[5-9]|9\d|\d{3})/.test(ua) || /Firefox\/(9[3-9]|\d{3})/.test(ua) || (/Version\/(1[6-9]|[2-9]\d)/.test(ua) && /Safari/.test(ua)) || /(iPhone|iPad); CPU( iPhone)? OS (1[6-9]|[2-9]\d)_/.test(ua)
    var entry = heroes[placeId]
    var std = function (ext) { return [200, 400, 720, 960].map(function (w) { return '/photos/' + placeId + '.' + w + '.' + ext + ' ' + w + 'w' }).join(', ') }
    var webpSet = entry === 1 || entry === 2 ? std('webp') : entry ? entry[0] : ''
    var avifSet = entry === 2 ? std('avif') : entry && entry !== 1 ? entry[1] : ''
    var useAvif = avifOk && !!avifSet
    var hero = useAvif ? avifSet : webpSet
    if (hero) {
      // Same srcset and sizes as PhotoFrame, so the page reuses this download.
      var hint = document.createElement('link')
      hint.rel = 'preload'
      hint.as = 'image'
      hint.type = useAvif ? 'image/avif' : 'image/webp'
      hint.setAttribute('imagesrcset', hero)
      hint.setAttribute('imagesizes', '(min-width: 1024px) 36rem, calc(100vw - 2rem)')
      hint.setAttribute('fetchpriority', 'high')
      // The app's code waits for this photo (or the 2.5 s safety net).
      waitForHero = true
      hint.onload = startApp
      hint.onerror = startApp
      document.head.appendChild(hint)
      // Paint the hero from static HTML in the exact box the gallery will use; the app replaces it.
      // Nothing sits above the photo on this route, so nothing can shift.
      // DOMContentLoaded waits for the app's module script, so watch for the static markup instead.
      var tries = 0
      var showHero = function () {
        var img = document.querySelector('.pre-place-img')
        if (!img) {
          if (++tries < 600 && !document.querySelector('#root [data-reactroot], #root > :not(.pre-landing):not(.pre-top):not(.pre-place)')) setTimeout(showHero, 16)
          return
        }
        if (!document.querySelector('#root > main.pre-place')) return
        img.setAttribute('sizes', '(min-width: 1024px) 37rem, calc(100vw - 1.5rem)')
        img.setAttribute('srcset', hero)
        root.dataset.prerender = 'place'
      }
      showHero()
    }
    var placeBoot = { id: placeId, done: false, value: null }
    placeBoot.data = fetch('/pd/' + placeId + '.json', { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null })
      .catch(function () { return null })
      .then(function (file) {
        var v = file && file.place ? file.place : null
        placeBoot.value = v
        placeBoot.done = true
        return v
      })
    window.__placeBoot = placeBoot
  }
  if (!waitForHero) startApp()
})()
