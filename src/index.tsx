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
  )
}

render(() => <App />, root!);
