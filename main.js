const VERSION = '1.0.3'; // Hochzählen bei jedem echten Update!
document.getElementById('version').textContent = VERSION;

// THEME HANDLING unverändert (wie bisher)

window.addEventListener('DOMContentLoaded', () => {
  // PWA Auto-Update
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(reg => {
      function updateIfNew() {
        // Prüfe ob neuer SW da ist:
        if (reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      }
      reg.addEventListener('updatefound', () => {
        const newSW = reg.installing;
        newSW.addEventListener('statechange', () => {
          if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
            updateIfNew();
          }
        });
      });
      if (reg.waiting) updateIfNew();
    });

    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      // Update Zeit merken
      const d = new Date();
      localStorage.setItem('arcade_last_update', d.toLocaleString());
      window.location.reload();
    });
  }

  // Zuletzt-aktualisiert Hinweis ggf. anzeigen
  const last = localStorage.getItem('arcade_last_update');
  if (last) {
    let updatediv = document.createElement('div');
    updatediv.id = "lastupdate-hinweis";
    updatediv.style = "position:fixed;right:9px;bottom:9px;padding:0.3em 1em;border-radius:0.7em;background:#2a2b38cc;color:#fff;font-size:0.93em;z-index:999;opacity:.77";
    updatediv.innerText = "Zuletzt aktualisiert: " + last;
    document.body.appendChild(updatediv);
  }
});
