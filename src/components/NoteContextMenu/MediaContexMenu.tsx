import { Component, createEffect, createSignal } from 'solid-js';

import styles from './NoteContext.module.scss';
import ConfirmDialog from '../Dialogs/ConfirmDialog';
import PrimalMenu from '../PrimalMenu/PrimalMenu';
import { PrimalNote, PrimalArticle, PrimalDraft } from 'src/primal';
import account from 'src/translations/en/account';
import { accountStore, activeUser } from 'src/stores/AccountStore';
import { appStore, openConfirmDialog, setMediaUsageUrl } from 'src/stores/AppStore';
import { nip19 } from 'src/utils/nTools';
import { getEventFromStore } from 'src/stores/EventStore';
import { Kind } from 'src/constants';
import { sendDeleteEvent } from 'src/primal_api/nostr';
import { doRequestDelete, triggerImportEvents } from 'src/primal_api/events';
import { APP_ID } from 'src/App';
import { useToastContext } from 'src/context/ToastContext/ToastContext';
import { BlobDescriptor } from 'blossom-client-sdk';
import { MenuItem } from './NoteContexMenu';

export type MediaContextMenuInfo = {
  blob: BlobDescriptor,
  position: DOMRect | undefined,
  openCustomZap?: () => void,
  openReactions?: () => void,
  onDelete?: (id: string) => void,
};

const MediaContextMenu: Component<{
  data: MediaContextMenuInfo | undefined,
  open: boolean,
  onClose: () => void,
  onDelete?: (eventId: string) => void,
  id?: string,
}> = (props) => {

  const toaster = useToastContext();

  const [orientation, setOrientation] = createSignal<'down' | 'up'>('down')

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

    context?.setAttribute('style',`top: ${pos.top + 12}px; left: ${pos.left + 8}px;`);

    const height = 440;
    const orient = Math.floor(position()?.bottom || 0) + height < window.innerHeight ? 'down' : 'up';

    setOrientation(() => orient);
  });

  const openFile = () => {
    if (!props.data) return;


    window.open(props.data.blob.url, '_blank')?.focus();
    props.onClose();
  }

  const downloadFile = async () => {
    if (!props.data) return;
    const url = props.data.blob.url;
    const filepath = url.split('/');
    const fileName = filepath[filepath.length - 1];

    props.onClose();
    const response = await fetch(url)

    const b = await response.blob()

    const link = document.createElement("a");
    link.href = URL.createObjectURL(b);
    link.download = fileName;
    link.click();

    // const downloadLink = document.createElement('a');
    // downloadLink.href = props.data.blob.url;
    // downloadLink.download = fileName;
    // document.body.appendChild(downloadLink);
    // downloadLink.click();
    // document.body.removeChild(downloadLink);
  }

  const copyFileLink = () => {
    if (!props.data) return;

    navigator.clipboard.writeText(props.data.blob.url);
    props.onClose()
    toaster?.sendSuccess('File link copied');
  };

  const copyFileHash = () => {
    if (!props.data) return;
    navigator.clipboard.writeText(props.data.blob.sha256);
    props.onClose()
    toaster?.sendSuccess('File hash copied');
  };

  const updateThumbnail = () => {
    if (!props.data) return;
    props.onClose()
  };

  const onClickOutside = (e: MouseEvent) => {
    if (
      !props.data ||
      !document?.getElementById(`note_context_${props.data.blob.sha256}`)?.contains(e.target as Node)
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

    return [
      {
        label: "Open File",
        action: openFile,
        icon: 'new_tab',
      },
      {
        label: "Download File",
        action: downloadFile,
        icon: 'download',
      },
      {
        label: "Copy File Link",
        action: copyFileLink,
        icon: 'copy_note_link',
      },
      {
        label: "Copy File Hash",
        action: copyFileHash,
        icon: 'copy_note_text',
      },
      {
        label: "Show Uses",
        action: () => setMediaUsageUrl(props.data?.blob.url),
        icon: 'uses',
      },
      // {
      //   label: "Update Thumbnail",
      //   action: updateThumbnail,
      //   icon: 'image_icon',
      // },
    ];
  };

  const noteContextForOtherPeople: () => MenuItem[] = () => {
    return [];
  };

  const noteContextForMe: () => MenuItem[] = () => {
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
        label: "Delete File",
        action: () => {
          const data = props.data;
          openConfirmDialog({
            title: "Delete file?",
            description: "This will issue a “delete” command to the blossom server where this file is located. Do you want to continue?",
            onConfirm: () => {
              data?.onDelete && data.onDelete(data.blob.sha256);
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

  const noteContext = () =>
    [ ...noteContextForMe(), ...noteContextForEveryone(), ...requestDeleteContextMenu()];

  let context: HTMLDivElement | undefined;

  return (
    <div class={styles.contextMenu} ref={context}>
      <PrimalMenu
        id={`media_context_${props.data?.blob.sha256}`}
        items={noteContext()}
        hidden={!props.open}
        position="media_context"
        orientation={orientation()}
      />
    </div>
  )
}

export default MediaContextMenu;
