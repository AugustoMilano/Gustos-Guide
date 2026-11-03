// Legal pages: send www to the apex (kept out of inline script for the CSP).
if (location.hostname === 'www.gustosguide.com') {
  location.replace(location.href.replace('//www.gustosguide.com', '//gustosguide.com'))
}
