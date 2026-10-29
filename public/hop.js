;(function () {
  var loc = window.location
  if (loc.hostname === 'www.gustosguide.com') {
    var apex = new URL(loc.href)
    apex.hostname = 'gustosguide.com'
    loc.replace(apex.toString())
    return
  }
  var path = loc.pathname.replace(/\/index\.html$/, '').replace(/\/+$/, '') || '/'
  if (path === '/hop.htm' || path === '/hop.js') {
    loc.replace(loc.origin + '/' + loc.search)
    return
  }
  loc.replace(loc.origin + '/#' + path + loc.search)
})()
