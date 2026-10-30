// Cloudflare Web Analytics, loaded by hand so the owner's visits are not counted.
// Skips when this device has seen Augusto signed in (gg_owner), or when a stored
// Supabase session belongs to his account.
(function () {
  var TOKEN = '';
  var OWNER = '6b6b61b0-983d-4772-9d80-836d3c43c235';
  if (!TOKEN) return;
  try {
    if (localStorage.getItem('gg_owner') === '1') return;
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && /^sb-.*-auth-token$/.test(k) && (localStorage.getItem(k) || '').indexOf(OWNER) !== -1) {
        localStorage.setItem('gg_owner', '1');
        return;
      }
    }
  } catch (e) { /* storage blocked: count the visit */ }
  var s = document.createElement('script');
  s.defer = true;
  s.src = 'https://static.cloudflareinsights.com/beacon.min.js';
  s.setAttribute('data-cf-beacon', JSON.stringify({ token: TOKEN }));
  document.head.appendChild(s);
})();
