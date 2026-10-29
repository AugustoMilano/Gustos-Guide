;(function () {
  var path = (location.hash.replace(/^#/, '') || '/').split('?')[0].replace(/\/$/, '') || '/'
  var homes = { '/': 1, '/seattle': 1, '/eastside': 1, '/la': 1, '/sf': 1, '/eastbay': 1, '/peninsula': 1, '/northbay': 1, '/sandiego': 1 }
  var navy = homes[path] === 1
  var color = navy ? '#141F4D' : '#FFFAF3'
  document.documentElement.dataset.status = navy ? 'navy' : 'cream'
  document.documentElement.style.setProperty('--status-bar', color)
  document.documentElement.style.backgroundColor = color
  var nodes = document.querySelectorAll('meta[name="theme-color"]')
  for (var i = 0; i < nodes.length; i++) nodes[i].setAttribute('content', color)
})()
