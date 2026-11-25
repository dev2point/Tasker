(function () {
  if (typeof window === 'undefined') return;
  window.addEventListener('beforeinstallprompt', function (event) {
    event.preventDefault();
    window.__planitDeferredPrompt = event;
    window.__planitAppInstalled = false;
    try {
      localStorage.removeItem('planit_pwa_installed');
    } catch {}
  });
  window.addEventListener('appinstalled', function () {
    window.__planitDeferredPrompt = null;
    window.__planitAppInstalled = true;
    try {
      localStorage.setItem('planit_pwa_installed', 'true');
    } catch {}
  });
})();
