import { Component, onCleanup, onMount, Show } from 'solid-js';

import styles from './App.module.scss';
import { AppProvider } from './context/AppContext';
import { PrimalWindow } from './primal';
import AppRouter from './Router';
import { connect, disconnect } from './utils/socket';
import Toaster from './context/ToastContext/ToastContext';
import NoteContextMenu from './components/NoteContextMenu/NoteContexMenu';
import { appStore, closeContextMenu, updateAppStore } from './stores/AppStore';
import { accountStore } from './stores/AccountStore';
import { eventStore } from './stores/EventStore';
import { pageStore } from './stores/PageStore';
import { mediaStore } from './stores/MediaStore';
import { relayStore } from './stores/RelayStore';
import { settingsStore } from './stores/SettingsStore';
import ConfirmDialog from './components/Dialogs/ConfirmDialog';
import NewNoteDialog from './components/NoteEditor/NewNoteDialog';

export const version = import.meta.env.PRIMAL_VERSION;
export const APP_ID = `web_studio_${version}_${Math.floor(Math.random()*10_000_000_000)}`;
export const LANG = 'en';

const App: Component = () => {

  onMount(() => {
    connect();
  });

  onCleanup(() => {
    disconnect();
  });


  const primalWindow = window as PrimalWindow;

  primalWindow.eventStore = eventStore;
  primalWindow.pageStore = pageStore;
  primalWindow.accountStore = accountStore;
  primalWindow.mediaStore = mediaStore;
  primalWindow.appStore = appStore;
  primalWindow.relayStore = relayStore;
  primalWindow.settingsStore = settingsStore;


  return (
    <div class={styles.App}>
      <AppProvider>
        <Toaster>
          <Show when={accountStore.accountIsReady}>
            <AppRouter />
          </Show>

          <NoteContextMenu
            open={appStore.showNoteContextMenu}
            onClose={closeContextMenu}
            data={appStore.noteContextMenuInfo}
          />

          <ConfirmDialog
            open={appStore.showConfirmDialog}
            setOpen={(v) => updateAppStore('showConfirmDialog', v)}
            title={appStore.confirmDialogInfo?.title}
            description={appStore.confirmDialogInfo?.description}
            confirmLabel={appStore.confirmDialogInfo?.confirmLabel}
            onConfirm={appStore.confirmDialogInfo?.onConfirm}
            abortLabel={appStore.confirmDialogInfo?.abortLabel}
            onAbort={appStore.confirmDialogInfo?.onAbort}
          />

          <NewNoteDialog
            open={appStore.showNewNoteEditor}
            setOpen={(v) => updateAppStore('showNewNoteEditor', v)}
          />
        </Toaster>
      </AppProvider>
    </div>
  );
};

export default App;
