import { Component, createEffect, createSignal, For, onMount, Show } from 'solid-js';
import { noteRegexG, profileRegexG } from '../../constants';
import { EventDisplayVariant, NostrEventContent, PrimalArticle, PrimalNote, PrimalUser } from '../../primal';

import styles from './Event.module.scss';
import { userName } from '../../utils/profile';
import { nip19 } from 'nostr-tools';
import { eventStore } from '../../stores/EventStore';
import { isYouTube, NoteAST, parseTextToAST } from 'src/utils/parser';
import { FeedEvent } from './FeedPage';
import { getMediaUrl, getUsersBlossomUrls } from 'src/stores/MediaStore';
import { createStore } from 'solid-js/store';
import Avatar from '../Avatar/Avatar';
import { longDate } from 'src/utils/date';

import missingImage from 'assets/images/missing_image.svg';
import { appStore, openNoteContextMenu } from 'src/stores/AppStore';
import NoteContextTrigger from '../NoteContextMenu/NoteContextTrigger';
import { humanizeNumber } from 'src/utils/ui';
import { logError } from 'src/utils/logger';
import { getUsers } from 'src/primal_api/profile';
import { emptyUser } from 'src/utils/feeds';

const NotePreview: Component<{
  id?: string,
  note: PrimalNote,
  hideTime?: boolean,
  onClick?: (note: PrimalNote) => void,
}> = (props) => {

  const [noteAst, setNoteAst] = createSignal<NoteAST[]>([{ type: 'text', value: ''}])
  const [author, setAuthor] = createSignal<PrimalUser>({ ...emptyUser(props.note.pubkey) });

  const getAuthor = async () => {
    if (!props.note) return;
    let user = props.note?.user;

    if (!user || user.name.length === 0) {
      const users = await getUsers([props.note?.pubkey]);

      user = users.length > 0 ? users[0] : user;
    }

    setAuthor(user);
  }

  createEffect(() => {
    if (props.note) {
      parseNote(props.note);
      getAuthor();
    } else {
      logError('Missing Note: ', props.id)
    }
  });

  const note = () => props.note;


  const user = (pubkey?: string) => ({
    pubkey: pubkey || '',
    name: userName(pubkey),
    metadata: eventStore.get(pubkey || ''),
  });

  const parseNote = (note: PrimalNote) => {
    let asts = parseTextToAST(note.content || '');

    setNoteAst(() => asts);
  };

  const [images, setImages] = createStore<NoteAST[]>([]);

  const renderAst = (ast: NoteAST) => {
    switch (ast.type) {
      case 'image':
        setImages(images.length, () => ast);
        return '';
      // case 'video':
      //   return renderImage(ast);
      // case 'youtube':
      //   return renderImage(ast);
      // case 'link':
      //   return renderText(ast);
      // case 'emoji':
      //   return renderImage(ast);
      // case 'hashtag':
      //   return renderImage(ast);
      // case 'nostrEvent':
      //   return renderImage(ast);
      case 'nostrProfile':
        return renderNprofile(ast);
      case 'nostrNpub':
        return renderNprofile(ast);
      // case 'nostrReplacable':
      //   return renderImage(ast);
      case 'text':
        return renderText(ast);
    }

    return renderText(ast);
  };

  const renderNprofile = (ast: NoteAST) => {
    const nprofile = ast?.value?.split(':')[1] || '';

    try {
      const decoded = nip19.decode(nprofile);

      if (decoded.type === 'nprofile') {
        const pubkey = decoded.data.pubkey;

        return <span>@{userName(pubkey)}</span>
      }

      if (decoded.type === 'npub') {
        const pubkey = decoded.data;

        return <span>@{userName(pubkey)}</span>
      }

      throw('not-found');
    } catch (e) {
      return `@UNKNOWN`
    }
  }

  const onImgError = async (event: any) => {
    const image = event.target;

    // list of user's blossom servers from kind 10_063
    const userBlossoms = getUsersBlossomUrls(props.note.pubkey || '') || [];

    // Image url from a Note
    const originalSrc = image.src || '';

    // extract the file hash
    const fileHash = originalSrc.slice(originalSrc.lastIndexOf('/') + 1)

    // Send HEAD requests to each blossom server to check if the resource is there
    const reqs = userBlossoms.map(url =>
      new Promise<string>((resolve, reject) => {
        const separator = url.endsWith('/') ? '' : '/';
        const resourceUrl = `${url}${separator}${fileHash}`;

        fetch(resourceUrl, { method: 'HEAD' }).
          then(response => {
            // Check to see if there is an image there
            if (response.status === 200) {
              resolve(resourceUrl);
            } else {
              reject('')
            }
          }).
          catch((e) => {
            reject('');
          });
      })
    );

    try {
      // Wait for at least one req to succeed
      const blossomUrl = await Promise.any(reqs);

      // If found, set image src to the blossom url
      if (blossomUrl.length > 0) {
        image.onerror = "";
        image.src = blossomUrl;
        return true;
      }

      image.onerror = "";
      image.src = missingImage;
      return true;

    } catch {
      image.onerror = "";
      image.src = missingImage;
      return true;
    }
  };

  const renderImage = (ast: NoteAST) => {
    const url = ast?.value || '';

    const src = getMediaUrl(url, 's') || url;

    return <img class={styles.image} src={src} onerror={onImgError} />;
  }

  const renderText = (ast: NoteAST) => {
    return <>{ast.value || ''}</>
  }

  return (
    <div
      class={styles.eventHolder}
      onClick={() => props.onClick && props.onClick(props.note)}
    >
      <div class={styles.userAvatar}>
        <Avatar
          user={author()}
          size={24}
        />
      </div>
      <div class={styles.noteInfo}>
        <div class={styles.header}>
          <div class={styles.userName}>
            {userName(author().pubkey)}
          </div>
          <Show when={!props.hideTime}>
            <div class={styles.separator}>•</div>
            <div class={styles.noteDate}>
              {longDate(note()?.created_at)}
            </div>
          </Show>
        </div>
        <div class={styles.content}>
          <Show
            when={images.length > 0}
          >
            {renderImage(images[0])}
          </Show>

          <div class={styles.text}>
            <For each={noteAst()}>
              {ast => renderAst(ast)}
            </For>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NotePreview;
