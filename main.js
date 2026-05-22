const VERSION = '1.0.0';
document.getElementById('version').textContent = VERSION;

// THEME HANDLING
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

// LADEBALKEN: Nur anzeigen, wenn Lade-Vorgänge wirklich nötig (z.B. Update)
function showLoader(duration = 1000) {
  const loader = document.getElementById('loader');
  loader.classList.remove('hidden');
  const progress = loader.querySelector('.loader-progress');
  const status = document.getElementById('loader-status');
  let percent = 0;
  status.textContent = "0%";
  progress.style.width = "0%";
  const step = duration/100;
  let interval = setInterval(()=>{
    percent++;
    progress.style.width = percent + "%";
    status.textContent = percent + "%";
    if(percent >= 100) {
      clearInterval(interval);
      setTimeout(()=>loader.classList.add('hidden'), 200);
    }
  }, step);
}

// PWA UPDATE-MECHANIK modern (nur wenn wirklich neue Version!)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').then(reg => {
    reg.addEventListener('updatefound', () => {
      const newSW = reg.installing;
      newSW.addEventListener('statechange', () => {
        if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
          document.getElementById('update-section').classList.remove('hidden');
        }
      });
    });
    // Option: Wenn der ServiceWorker bereits ein Update hat, direkt zeigen
    if (reg.waiting) {
      document.getElementById('update-section').classList.remove('hidden');
    }
  });
}
document.getElementById('update-btn').onclick = function () {
  showLoader(1200);
  setTimeout(() => window.location.reload(true), 1300);
};
