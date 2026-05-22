const VERSION = '1.0.1'; // Bei jedem „echten“ Update increments erhöhen!
document.getElementById('version').textContent = VERSION;

// THEME HANDLING (wie gehabt)
function setTheme(theme) {
  document.body.classList.remove('light','dark');
  if (theme==='dark'||(theme==='auto'&&window.matchMedia('(prefers-color-scheme: dark)').matches)) document.body.classList.add('dark');
  if (theme==='light'||(theme==='auto'&&window.matchMedia('(prefers-color-scheme: light)').matches)) document.body.classList.add('light');
  localStorage.setItem('theme',theme);
  document.querySelectorAll('.theme-toggle button').forEach(btn=>btn.classList.remove('selected'));
  if(theme==='auto') document.getElementById('theme-auto').classList.add('selected');
  if(theme==='light') document.getElementById('theme-light').classList.add('selected');
  if(theme==='dark') document.getElementById('theme-dark').classList.add('selected');
}
const initialTheme = localStorage.getItem('theme')||'auto';
setTheme(initialTheme);
document.getElementById('theme-auto').onclick=()=>setTheme('auto');
document.getElementById('theme-light').onclick=()=>setTheme('light');
document.getElementById('theme-dark').onclick=()=>setTheme('dark');

// LADEBALKEN (nur bei echtem Update oder langem Ladevorgang)
// Nutze showLoader(zeitInMs, callback)
function showLoader(duration=1100,onDone){
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
    if(percent>=100) {
      clearInterval(interval);
      setTimeout(()=>{
        loader.classList.add('hidden');
        onDone && onDone();
      },180);
    }
  },step);
}

// PWA UPDATE-MECHANIK – Version wirklich vergleichen!
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').then(reg => {
    if (reg.waiting) {
      showUpdateAvailable();
    }
    reg.addEventListener('updatefound', () => {
      const newSW = reg.installing;
      newSW.addEventListener('statechange', () => {
        if (newSW.state==='installed' && navigator.serviceWorker.controller) {
          showUpdateAvailable();
        }
      });
    });
  });
}

// Hilfsfunktion: Update-Button sichtbar machen nur bei Versionswechsel!
function showUpdateAvailable() {
  let lastVersion = localStorage.getItem('arcade_version');
  if (lastVersion !== VERSION) {
    document.getElementById('update-section').classList.remove('hidden');
  }
}

document.getElementById('update-btn').onclick = function () {
  showLoader(1300,()=> {
    // Update Service Worker, dann Reload!
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(reg => {
        if (reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      });
    }
    // Merke aktuelle Version als "installiert"
    localStorage.setItem('arcade_version', VERSION);
    window.location.reload(true);
  });
};

// Ladebalken wirklich nur bei Update-Button oder langem Ladevorgang anzeigen (nicht automatisch!)
