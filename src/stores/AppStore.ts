import { BlobDescriptor } from "blossom-client-sdk";
import { batch } from "solid-js";
import { createStore, reconcile } from "solid-js/store";
import { ConfirmDialogInfo } from "src/components/Dialogs/ConfirmDialog";
import { MediaContextMenuInfo } from "src/components/NoteContextMenu/MediaContexMenu";
import { NoteContextMenuInfo } from "src/components/NoteContextMenu/NoteContexMenu";
import { PrimalArticle, PrimalDraft, PrimalNote } from "src/primal";
import { reset } from "src/utils/socket";

export type AppStore = {
  isInactive: boolean,
  appState: 'sleep' | 'waking' | 'woke',
  verifiedUsers: Record<string, string>,
  showNoteContextMenu: boolean,
  noteContextMenuInfo: NoteContextMenuInfo | undefined,
  showMediaContextMenu: boolean,
  mediaContextMenuInfo: MediaContextMenuInfo | undefined,
  showConfirmDialog: boolean,
  confirmDialogInfo: ConfirmDialogInfo | undefined,
  showContentScoreBreakdown: boolean,
  scoreBrakdownEvent: PrimalNote | PrimalArticle | PrimalDraft | undefined,
  showNewNoteEditor: boolean,
  editNote: PrimalNote | undefined,
  editNoteDraft: PrimalDraft | undefined,
  mediaUsageUrl: string | undefined,
  showTrialExpiredDialog: boolean,
  showNoPhoneDialog: boolean,
};

export const emptyAppStore = (): AppStore => ({
  isInactive: false,
  appState: 'woke',
  verifiedUsers: {},
  showNoteContextMenu: false,
  noteContextMenuInfo: undefined,
  showMediaContextMenu: false,
  mediaContextMenuInfo: undefined,
  showConfirmDialog: false,
  confirmDialogInfo: undefined,
  showContentScoreBreakdown: false,
  scoreBrakdownEvent: undefined,
  showNewNoteEditor: false,
  editNote: undefined,
  editNoteDraft: undefined,
  mediaUsageUrl: undefined,
  showTrialExpiredDialog: false,
  showNoPhoneDialog: false,
});


export const [appStore, updateAppStore] = createStore<AppStore>(emptyAppStore());


export const profileLink = (pubkey: string | undefined) => {
  if (!pubkey) return '/';

  return `/p/${pubkey}`

  // let pk = `${pubkey}`;

  // if (pk.startsWith('npub')) {
  //   // @ts-ignore
  //   pk = nip19.decode(pk).data;
  // }

  // const verifiedUser: string = store.verifiedUsers[pk];

  // if (verifiedUser) return `/${verifiedUser}`;

  // try {
  //   const npub = nip19.nprofileEncode({ pubkey: pk });
  //   return `/p/${npub}`;
  // } catch (e) {
  //   return `/p/${pk}`;
  // }

}

export const changeCachingService = (url?: string) => {
  if (!url) {
    localStorage.removeItem('cacheServer');
  }
  else {
    localStorage.setItem('cacheServer', url);
  }

  reset();
};

export const openMediaContextMenu = (
  blob: BlobDescriptor,
  position: DOMRect | undefined,
  openReactions: () => void,
  onDelete: (id: string) => void,
) => {
  if (appStore.showMediaContextMenu) return;

  updateAppStore('mediaContextMenuInfo', reconcile({
    blob,
    position,
    openReactions,
    onDelete,
  }))
  updateAppStore('showMediaContextMenu', () => true);
};

export const closeMediaContextMenu = () => {
  updateAppStore('mediaContextMenuInfo', () => undefined);
  updateAppStore('showMediaContextMenu', () => false);
};

export const openNoteContextMenu = (
  note: PrimalNote | PrimalArticle | PrimalDraft,
  position: DOMRect | undefined,
  openReactions: () => void,
  onDelete: (id: string) => void,
) => {
  if (appStore.showNoteContextMenu) return;

  updateAppStore('noteContextMenuInfo', reconcile({
    note,
    position,
    openReactions,
    onDelete,
  }))
  updateAppStore('showNoteContextMenu', () => true);
};

export const closeNoteContextMenu = () => {
  updateAppStore('noteContextMenuInfo', undefined);
  updateAppStore('showNoteContextMenu', () => false);
};

export const openConfirmDialog = (config: ConfirmDialogInfo) => {
  updateAppStore('confirmDialogInfo', reconcile({ ...config }));
  updateAppStore('showConfirmDialog', () => true);
};

export const closeConfirmDialog = () => {
  updateAppStore('showConfirmDialog', () => false);
};

export const openScoreBreakdown = (event: PrimalNote | PrimalArticle | PrimalDraft | undefined) => {
  updateAppStore('scoreBrakdownEvent', () => ({ ...event }));
  updateAppStore('showContentScoreBreakdown', () => true);
};

export const closeScoreBreakdown = () => {
  updateAppStore('scoreBrakdownEvent', () => undefined);
  updateAppStore('showContentScoreBreakdown', () => false);
};

export const addVerifiedUsers = (newVU: Record<string, string>) => {
  updateAppStore('verifiedUsers', (vu) => ({
    ...vu,
    ...newVU,
  }))
}

export const openEditNote = (note?: PrimalNote, draft?: PrimalDraft) => {
  batch(() => {
    updateAppStore('editNote', () => note);
    updateAppStore('editNoteDraft', () => draft);
    updateAppStore('showNewNoteEditor', true);
  });
}

export const closeEditNote = () => {
  batch(() => {
    updateAppStore('editNote', () => undefined);
    updateAppStore('editNoteDraft', () => undefined);
    updateAppStore('showNewNoteEditor', false);
  });
}

export const setMediaUsageUrl = (url: string | undefined) => {
  updateAppStore('mediaUsageUrl', () => url);
}
