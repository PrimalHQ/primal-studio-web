import { Component, createEffect, createSignal } from 'solid-js';

import styles from './NoteContext.module.scss';
import PrimalMenu from '../PrimalMenu/PrimalMenu';
import { PrimalNote, PrimalArticle, PrimalDraft } from 'src/primal';
import { accountStore } from 'src/stores/AccountStore';
import { appStore, openConfirmDialog, openScoreBreakdown } from 'src/stores/AppStore';
import { nip19 } from 'src/utils/nTools';
import { getEventFromStore } from 'src/stores/EventStore';
import { Kind } from 'src/constants';
import { doRequestDelete } from 'src/primal_api/events';
import { globalNavigate } from 'src/App';
import { useToastContext } from 'src/context/ToastContext/ToastContext';

export type NoteContextMenuInfo = {
  note: PrimalNote | PrimalArticle | PrimalDraft,
  position: DOMRect | undefined,
  openCustomZap?: () => void,
  openReactions?: () => void,
  onDelete?: (id: string) => void,
};

export type MenuItem = {
  action: () => void,
  label: string,
  icon?: string,
  warning?: boolean,
  separator?: boolean,
};

const NoteContextMenu: Component<{
  data: NoteContextMenuInfo | undefined,
  open: boolean,
  onClose: () => void,
  onDelete?: (eventId: string) => void,
  id?: string,
}> = (props) => {

  const toaster = useToastContext();

  const [orientation, setOrientation] = createSignal<'down' | 'up'>('down')

  const note = () => props.data?.note;
  const position = () => {
    return props.data?.position;
  };

  createEffect(() => {
    if (!props.open) {
      setTimeout(() => {
        context?.setAttribute('style',`top: -1024px; left: -1034px;`);
      }, 200)
      return;
    }

    const docRect = document.documentElement.getBoundingClientRect();
    const pos = {
      top: (Math.floor(position()?.top || 0) - docRect.top),
      left: (Math.floor(position()?.left || 0)),
    }

    context?.setAttribute('style',`top: ${pos.top + 6}px; left: ${pos.left + 12}px;`);

    const height = 440;
    const orient = Math.floor(position()?.bottom || 0) + height < window.innerHeight ? 'down' : 'up';

    setOrientation(() => orient);
  });

  const noteLinkId = () => {
    try {
      return `e/${note()?.nId}`;
    } catch(e) {
      return '404';
    }
  };

  const openInPrimal = () => {
    if (!props.data) return;

    let link = noteLinkId();

    const n = note();

    if (n?.nId.startsWith('naddr')) {
      const vanityName = appStore.verifiedUsers[n.pubkey];

      if (vanityName) {
        const decoded = nip19.decode(n.nId);

        const data = decoded.data as nip19.AddressPointer;

        link = `${vanityName}/${encodeURIComponent(data.identifier)}`;
      }
    }

    props.onClose();
    window.open(`https://primal.net/${link}`, '_blank')?.focus();
  }

  const copyNoteLink = () => {
    if (!props.data) return;

    let link = noteLinkId();
    const n = note();

    if (n?.nId.startsWith('naddr')) {
      const vanityName = appStore.verifiedUsers[n.pubkey];

      if (vanityName) {
        const decoded = nip19.decode(n.nId);

        const data = decoded.data as nip19.AddressPointer;

        link = `${vanityName}/${encodeURIComponent(data.identifier)}`;
      }
    }

    navigator.clipboard.writeText(`${window.location.origin}/${link}`);
    props.onClose()
    toaster?.sendSuccess('Note link copied');
  };

  const copyNoteText = () => {
    if (!props.data) return;
    navigator.clipboard.writeText(`${note()?.content || ''}`);
    props.onClose()
    toaster?.sendSuccess('Note text copied');
  };

  const copyNoteId = () => {
    if (!props.data) return;
    navigator.clipboard.writeText(`nostr:${note()?.nId}`);
    props.onClose()
    toaster?.sendSuccess('Note id copied');
  };

  const copyRawData = async () => {
    if (!props.data) return;
    const event = await getEventFromStore(note()?.id || '');
    navigator.clipboard.writeText(`${JSON.stringify(event)}`);
    props.onClose()
    toaster?.sendSuccess('Note raw data copied');
  };

  const openScore = () => {
    if (!props.data) return;
    openScoreBreakdown(props.data.note)
    props.onClose()
  };

  const onClickOutside = (e: MouseEvent) => {
    if (
      !props.data ||
      !document?.getElementById(`note_context_${note()?.id}`)?.contains(e.target as Node)
    ) {
      props.onClose()
    }
  }

  createEffect(() => {
    if (props.open) {
      document.addEventListener('click', onClickOutside);
    }
    else {
      document.removeEventListener('click', onClickOutside);
    }
  });

  const noteContextForEveryone: () => MenuItem[] = () => {

    let labels = {
      open: 'Open in Primal',
      copyLink: 'Copy Note Link',
      copyText: 'Copy Note Text',
      copyId: 'Copy Note ID',
      copyRaw: 'Copy Raw Data',
      score: 'Score BreakDown',
    }

    let kindSpecificItems: MenuItem[] = [];

    if (props.data?.note.kind === Kind.LongForm) {
      labels = {
        ...labels,
        copyLink: 'Copy Article Link',
        copyText: 'Copy Article Text',
        copyId: 'Copy Article ID',
      };

      kindSpecificItems = [
        {
          label: "Edit Article",
          action: () => {
            const navigate = globalNavigate();
            navigate && navigate(`/edit/article/${props.data?.note.nId}`);
            props.onClose();
          },
          icon: 'edit',
        },
      ]
    }

    return [
      ...kindSpecificItems,
      {
        label: labels.open,
        action: openInPrimal,
        icon: 'new_tab',
      },
      {
        label: labels.copyLink,
        action: copyNoteLink,
        icon: 'copy_note_link',
      },
      {
        label: labels.copyText,
        action: copyNoteText,
        icon: 'copy_note_text',
      },
      {
        label: labels.copyId,
        action: copyNoteId,
        icon: 'copy_note_id',
      },
      {
        label: labels.copyRaw,
        action: copyRawData,
        icon: 'copy_raw_data',
      },
      {
        label: labels.score,
        action: openScore,
        icon: 'content_score',
      },
    ];
  };

  const noteContextForOtherPeople: () => MenuItem[] = () => {
    return [];
  };

  const noteContextForMe: () => MenuItem[] = () => {
    if (!(note()?.nId || '').startsWith('naddr1')) return [];

    return [
      // {
      //   label: intl.formatMessage(tActions.noteContext.editArticle),
      //   action: () => {
      //     props.onClose();
      //     navigate(`/reads/edit/${note().noteId}`);
      //   },
      //   icon: 'edit',
      // },
    ];
  };


  const requestDeleteContextMenu: () => MenuItem[] = () => {
    return [
      {
        label: "Request Delete",
        action: () => {
          openConfirmDialog({
            title: "Delete note?",
            description: "This will issue a “request delete” command to the relays where the note was published. Do you want to continue?",
            onConfirm: async () => {
              const n = note();
              if (!n) return;

              const isDeleted = await doRequestDelete(accountStore.pubkey, n.id, n.kind);

              if (!isDeleted) return;

              props.data?.onDelete && props.data?.onDelete(n.id);

            },
            onAbort: () => {},
          });
          props.onClose();
        },
        icon: 'delete',
        warning: true,
      },
    ];
  };

  const noteContext = () => accountStore.pubkey !== note()?.pubkey ?
      [ ...noteContextForEveryone(), ...noteContextForOtherPeople()] :
      [ ...noteContextForMe(), ...noteContextForEveryone(), ...requestDeleteContextMenu()];

  let context: HTMLDivElement | undefined;

  return (
    <div class={styles.contextMenu} ref={context}>
      <PrimalMenu
        id={`note_context_${note()?.id}`}
        items={noteContext()}
        hidden={!props.open}
        position="note_context"
        orientation={orientation()}
      />
    </div>
  )
}

export default NoteContextMenu;
