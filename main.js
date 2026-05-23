const VERSION = '1.0.0';

document.getElementById('version').textContent = VERSION;

if ('serviceWorker' in navigator) {

  window.addEventListener('load', () => {

    navigator.serviceWorker.register('/OfflineArcade/sw.js')
      .then(() => {
        console.log('Service Worker geladen');
      });

  });

}
