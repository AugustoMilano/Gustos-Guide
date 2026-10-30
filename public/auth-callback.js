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
      if (saved.indexOf('#/') === 0 && saved.indexOf('://') === -1) route = saved
    } catch (e) {}
  }
  loc.replace(url.origin + '/' + url.search + (route || ''))
})()
