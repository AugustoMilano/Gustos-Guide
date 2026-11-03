;(function () {
  var loc = window.location
  if (loc.hostname === 'www.gustosguide.com') {
    var apex = new URL(loc.href)
    apex.hostname = 'gustosguide.com'
    loc.replace(apex.toString())
    return
  }
  var url = new URL(loc.href)
  var hash = url.hash.charAt(0) === '#' ? url.hash.slice(1) : ''
  var route = ''
  if (hash.charAt(0) === '/' || hash.charAt(0) === '!') {
    route = url.hash
  } else if (hash) {
    var params = new URLSearchParams(hash)
    params.forEach(function (value, key) {
      if (!url.searchParams.has(key)) url.searchParams.set(key, value)
    })
  }
  if (!route) {
    try {
      var saved = sessionStorage.getItem('gusto.auth.return') || ''
      if (!saved) {
        // A magic link opened in a new tab: use the page saved in localStorage within the last hour.
        var stored = JSON.parse(localStorage.getItem('gusto.auth.return') || 'null')
        if (stored && stored.route && Date.now() - stored.at < 3600000) saved = stored.route
      }
      if (saved.indexOf('#/') === 0 && saved.indexOf('://') === -1 && saved !== '#/' && saved !== '#/cities') route = saved
    } catch (e) {}
    if (!route) {
      // Never land on the city picker after sign-in: open the last city home.
      try {
        var area = (JSON.parse(localStorage.getItem('gusto.region.v1') || '{}') || {}).area
        route = '#/' + (/^[a-z]+$/.test(area || '') ? area : 'seattle')
      } catch (e) { route = '#/seattle' }
    }
  }
  loc.replace(url.origin + '/' + url.search + (route || ''))
})()
