/* @refresh reload */
import { render } from 'solid-js/web';

import './index.scss';
import App from './App';

const root = document.getElementById('root');

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
  throw new Error(
    'Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?',
  );
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register(
    import.meta.env.MODE === 'production' ? '/imageCacheWorker.js' : '/imageCacheWorker.js?dev-sw=1',
    { scope: '/'}
  );
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'SW_ACTIVATED') {
      // New SW just took control — we might be running stale code
      const url = new URL(window.location.href);
      url.searchParams.set('_sw', Date.now().toString());
      window.location.replace(url.toString());
    }
  });
}

render(() => <App />, root!);
