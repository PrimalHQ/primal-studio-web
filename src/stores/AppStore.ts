import { createStore, reconcile } from "solid-js/store";
import { ConfirmDialogInfo } from "src/components/Dialogs/ConfirmDialog";
import { NoteContextMenuInfo } from "src/components/NoteContextMenu/NoteContexMenu";
import { PrimalArticle, PrimalDraft, PrimalNote } from "src/primal";
import { reset } from "src/utils/socket";

export type AppStore = {
  isInactive: boolean,
  appState: 'sleep' | 'waking' | 'woke',
  verifiedUsers: Record<string, string>,
  showNoteContextMenu: boolean,
  noteContextMenuInfo: NoteContextMenuInfo | undefined,
  showConfirmDialog: boolean,
  confirmDialogInfo: ConfirmDialogInfo | undefined,
};

export const emptyAppStore = (): AppStore => ({
  isInactive: false,
  appState: 'woke',
  verifiedUsers: {},
  showNoteContextMenu: false,
  noteContextMenuInfo: undefined,
  showConfirmDialog: false,
  confirmDialogInfo: undefined,
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

export const openNoteContextMenu = (
  note: PrimalNote | PrimalArticle | PrimalDraft,
  position: DOMRect | undefined,
  openReactions: () => void,
  onDelete: (id: string) => void,
) => {
  updateAppStore('noteContextMenuInfo', reconcile({
    note,
    position,
    openReactions,
    onDelete,
  }))
  updateAppStore('showNoteContextMenu', () => true);
};

export const closeContextMenu = () => {
  updateAppStore('showNoteContextMenu', () => false);
};

export const openConfirmDialog = (config: ConfirmDialogInfo) => {
  updateAppStore('confirmDialogInfo', reconcile({ ...config }));
  updateAppStore('showConfirmDialog', () => true);
};

export const closeConfirmDialog = () => {
  updateAppStore('showConfirmDialog', () => false);
};

export const addVerifiedUsers = (newVU: Record<string, string>) => {
  updateAppStore('verifiedUsers', (vu) => ({
    ...vu,
    ...newVU,
  }))
}
