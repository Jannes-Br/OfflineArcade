const VERSION = '1.0.0';
document.getElementById('version').textContent = VERSION;

// THEME
function setTheme(theme) {
  document.body.classList.remove('light', 'dark');
  if (theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.body.classList.add('dark');
  }
  if (theme === 'light' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: light)').matches)) {
    document.body.classList.add('light');
  }
  localStorage.setItem('theme', theme);
  document.querySelectorAll('.theme-toggle button').forEach(btn => btn.classList.remove('selected'));
  if (theme === 'auto') document.getElementById('theme-auto').classList.add('selected');
  if (theme === 'light') document.getElementById('theme-light').classList.add('selected');
  if (theme === 'dark') document.getElementById('theme-dark').classList.add('selected');
}
const initialTheme = localStorage.getItem('theme') || 'auto';
setTheme(initialTheme);
document.getElementById('theme-auto').onclick = () => setTheme('auto');
document.getElementById('theme-light').onclick = () => setTheme('light');
document.getElementById('theme-dark').onclick = () => setTheme('dark');

// LADEBILDSCHIRM
function showLoader(status = 'Lade…', cb) {
  const loader = document.getElementById('loader');
  loader.classList.remove('hidden');
  document.getElementById('loader-status').innerText = status;
  setTimeout(() => {
    loader.classList.add('hidden');
    if (cb) cb();
  }, 2600);
}

// PWA UPDATE-MECHANIK
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').then(reg => {
    reg.onupdatefound = () => {
      const installing = reg.installing;
      installing.onstatechange = () => {
        if (installing.state === 'installed') {
          // Neue Version gefunden!
          if (navigator.serviceWorker.controller) {
            document.getElementById('update-section').classList.remove('hidden');
          }
        }
      };
    };
  });
}
document.getElementById('update-btn').onclick = function () {
  showLoader('Update wird eingespielt…', () => {
    window.location.reload();
  });
};

// LADEBILDSCHIRM aufrufen beim initialen Laden
window.addEventListener('DOMContentLoaded', () => {
  showLoader('Starte OfflineArcade…');
});
