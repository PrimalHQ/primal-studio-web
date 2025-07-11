import { Component, createEffect, createSignal, lazy, on, onCleanup, onMount, Show } from 'solid-js';

import styles from './App.module.scss';
import { AppProvider } from './context/AppContext';
import { PrimalWindow } from './primal';
import AppRouter from './Router';
import { connect, disconnect } from './utils/socket';
import Toaster from './context/ToastContext/ToastContext';
import NoteContextMenu from './components/NoteContextMenu/NoteContexMenu';
import { appStore, closeNoteContextMenu, closeEditNote, openEditNote, updateAppStore, closeMediaContextMenu, setMediaUsageUrl } from './stores/AppStore';
import { accountStore, updateAccountStore } from './stores/AccountStore';
import { eventStore } from './stores/EventStore';
import { pageStore } from './stores/PageStore';
import { mediaStore } from './stores/MediaStore';
import { relayStore } from './stores/RelayStore';
import { settingsStore } from './stores/SettingsStore';
import ConfirmDialog from './components/Dialogs/ConfirmDialog';
import NewNoteDialog from './components/NoteEditor/NewNoteDialog';
import MediaContextMenu from './components/NoteContextMenu/MediaContexMenu';
import ContentScoreBreakdownDialog from './components/Dialogs/ContentScoreBreakdownDialog';
import MediaUsesDialog from './pages/Media/MediaUsesDialog';
import { Navigator, Route, Router } from "@solidjs/router";
import FirstTimeDialog from './components/Dialogs/FirstTimeDialog';
import TrialExpiredDialog from './components/Dialogs/TrialExpiredDialog';
import { isPhone } from './utils/ui';
import GetStartedDialog from './pages/Landing/GetStartedDialog';

export const version = import.meta.env.PRIMAL_VERSION;
export const APP_ID = `web_studio_${version}_${Math.floor(Math.random()*10_000_000_000)}`;
export const LANG = 'en';

export const [globalNavigate, setGlobalNavigate] = createSignal<Navigator>();

const App: Component = () => {

  onMount(() => {
    connect();
  });

  onCleanup(() => {
    disconnect();
  });

  createEffect(on(() => accountStore.accountIsReady, (ready, prev) => {
    if (window.location.pathname === '/') return;

    if (ready === false && prev === undefined) {
      window.open('/', '_self');
    }

  }));


  const primalWindow = window as PrimalWindow;

  primalWindow.eventStore = eventStore;
  primalWindow.pageStore = pageStore;
  primalWindow.accountStore = accountStore;
  primalWindow.mediaStore = mediaStore;
  primalWindow.appStore = appStore;
  primalWindow.relayStore = relayStore;
  primalWindow.settingsStore = settingsStore;

  const Landing = lazy(() => import('./pages/Landing/Landing'));

  return (
    <div class={styles.App}>
      <AppProvider>
        <Toaster>
          <Show
            when={accountStore.accountIsReady}
            fallback={
              <Router preload={true}>
                <Route path="/" component={Landing} />
              </Router>
            }
          >
            <AppRouter />
          </Show>

          <NoteContextMenu
            open={appStore.showNoteContextMenu}
            onClose={closeNoteContextMenu}
            data={appStore.noteContextMenuInfo}
          />

          <MediaContextMenu
            open={appStore.showMediaContextMenu}
            onClose={closeMediaContextMenu}
            data={appStore.mediaContextMenuInfo}
          />

          <ContentScoreBreakdownDialog
            open={appStore.showContentScoreBreakdown}
            setOpen={(v) => updateAppStore('showContentScoreBreakdown', v)}
            event={appStore.scoreBrakdownEvent}
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
            setOpen={(v) => v ? openEditNote() : closeEditNote()}
            note={appStore.editNote}
            draft={appStore.editNoteDraft}
          />

          <MediaUsesDialog
            open={!!appStore.mediaUsageUrl}
            setOpen={v => !v && setMediaUsageUrl(undefined)}
            url={appStore.mediaUsageUrl}
          />

          <FirstTimeDialog
            open={accountStore.licenseStatus.first_access && !isPhone()}
            setOpen={(v) => updateAccountStore('licenseStatus', 'first_access', false)}
            freeTrial={!accountStore.licenseStatus.licensed && !isPhone()}
          />

          <TrialExpiredDialog
            open={appStore.showTrialExpiredDialog && !isPhone()}
          />

          <GetStartedDialog
            open={appStore.showNoPhoneDialog}
            setOpen={(v) => updateAppStore('showNoPhoneDialog', v)}
          />
        </Toaster>
      </AppProvider>
    </div>
  );
};

export default App;
