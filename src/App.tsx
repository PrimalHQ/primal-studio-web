import { Component, onCleanup, onMount } from 'solid-js';

import styles from './App.module.scss';
import { AppProvider } from './context/AppContext';
import { PrimalWindow } from './primal';
import AppRouter from './Router';
import { connect, disconnect } from './utils/socket';

export const version = import.meta.env.PRIMAL_VERSION;
export const APP_ID = `web_${version}_${Math.floor(Math.random()*10_000_000_000)}`;
export const LANG = 'en';

const App: Component = () => {

  onMount(() => {
    connect();
  });

  onCleanup(() => {
    disconnect();
  });


  const primalWindow = window as PrimalWindow;

  // primalWindow.eventStore = eventStore;

  return (
    <div class={styles.App}>
      <AppProvider>
        <AppRouter />
      </AppProvider>
    </div>
  );
};

export default App;
