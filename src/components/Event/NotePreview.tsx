import { Component, createEffect, createSignal, For, onMount, Show } from 'solid-js';
import { noteRegexG, profileRegexG } from '../../constants';
import { EventDisplayVariant, NostrEventContent, PrimalNote } from '../../primal';

import styles from './Event.module.scss';
import { userName } from '../../utils/profile';
import { nip19 } from '../../utils/nTools';
import { eventStore } from '../../stores/EventStore';
import { isYouTube, NoteAST, parseTextToAST } from 'src/utils/parser';
import { FeedEvent } from './FeedPage';
import { getMediaUrl, getUsersBlossomUrls } from 'src/stores/MediaStore';
import { createStore } from 'solid-js/store';
import Avatar from '../Avatar/Avatar';
import { longDate } from 'src/utils/date';

import missingImage from 'assets/images/missing_image.png';
import { humanizeNumber } from 'src/utils/ui';
import NoteContextTrigger from '../NoteContextMenu/NoteContextTrigger';
import { appStore, openNoteContextMenu } from 'src/stores/AppStore';

const NotePreview: Component<{
  note: PrimalNote,
  embedded?: boolean,
  variant?: EventDisplayVariant,
}> = (props) => {

  const [noteAst, setNoteAst] = createSignal<NoteAST[]>([{ type: 'text', value: ''}])

  createEffect(() => {
    parseNote();
  });

  const note = () => props.note;

  const author = () => props.note?.user;

  const user = (pubkey?: string) => ({
    pubkey: pubkey || '',
    name: userName(pubkey),
    metadata: eventStore.get(pubkey || ''),
  });

  const parseNote = () => {
    const note = props.note;
    let asts = parseTextToAST(note?.content || '');

    setNoteAst(() => asts);
  };

  const [images, setImages] = createStore<NoteAST[]>([]);

  const renderAst = (ast: NoteAST) => {
    switch (ast.type) {
      case 'image':
        setImages(images.length, () => ast);
        break;
      // case 'video':
      //   return renderImage(ast);
      // case 'youtube':
      //   return renderImage(ast);
      // case 'link':
      //   return renderImage(ast);
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
    const url = ast?.url || '';

    const src = getMediaUrl(url, 's') || url;

    return <img class={styles.image} src={src} onerror={onImgError} />;
  }

  const renderText = (ast: NoteAST) => {
    return <>{ast.value || ''}</>
  }

  let contextMenu: HTMLDivElement | undefined;

  const openReactionModal = (openOn = 'likes') =>  {
    // app?.actions.openReactionModal(props.article.naddr, {
    //   likes: reactionsState.likes,
    //   zaps: reactionsState.zapCount,
    //   reposts: reactionsState.reposts,
    //   quotes: reactionsState.quoteCount,
    //   openOn,
    // });
  };

  const onContextMenuTrigger = () => {
    openNoteContextMenu(
      note(),
      contextMenu?.getBoundingClientRect(),
      openReactionModal,
      () => {

      },
    );
  }

  const openInPrimal = () => {
    let link = `e/${note()?.nId}`;

    if (note()?.nId.startsWith('naddr')) {
      const vanityName = appStore.verifiedUsers[note()?.pubkey];

      if (vanityName) {
        const decoded = nip19.decode(note()?.nId);

        const data = decoded.data as nip19.AddressPointer;

        link = `${vanityName}/${encodeURIComponent(data.identifier)}`;
      }
    }

    return `https://primal.net/${link}`;
  };

  let np: HTMLAnchorElement | undefined;

  return (
    <a
      class={`${styles.notePreview}`}
      data-event-id={props.note?.id}
      href={openInPrimal()}
      target='_blank'
      ref={np}
    >
      <div class={styles.contextMenuTrigger}>
        <NoteContextTrigger
          ref={contextMenu}
          onClick={onContextMenuTrigger}
        />
      </div>

      <Show when={props.note?.repost?.user}>
        <div class={styles.reposters}>
          <div>reposted by {props.note.repost?.user?.name}</div>
        </div>
      </Show>

      <div class={styles.holder}>
        <div class={styles.userAvatar}>
          <Avatar
            user={author()}
            size={24}
          />
        </div>
        <div class={styles.noteInfo}>
          <div class={styles.header}>
            <div class={styles.userName}>
              {author()?.name}
            </div>
            <div class={styles.separator}>•</div>
            <div class={styles.noteDate}>
             {longDate(note()?.created_at)}
            </div>
          </div>
          <div class={styles.content}>
            <Show when={images.length > 0}>
              {renderImage(images[0])}
            </Show>

            <div class={styles.text}>
              <For each={noteAst()}>
                {ast => renderAst(ast)}
              </For>
            </div>
          </div>
        </div>

        <div class={styles.noteStats}>

          <Show when={note()?.studioStats?.satszapped}>
            <div class={styles.stat}>
              <div class={styles.number}>
                {humanizeNumber(Math.ceil(note()?.studioStats?.satszapped))}
              </div>
              <div class={styles.unit}>Sats</div>
            </div>
          </Show>

          <Show when={note()?.studioStats?.score}>
            <div class={styles.stat}>
              <div class={styles.number}>{humanizeNumber(Math.ceil(note()?.studioStats?.score))}</div>
              <div class={styles.unit}>Score</div>
            </div>
          </Show>

          <Show when={note()?.studioStats?.sentiment}>
            <div class={styles.stat}>
              <div class={styles.number}>
                <div class={styles[`sentiment_${note()?.studioStats?.sentiment}`]}></div>
              </div>
              <div class={styles.unit}>Sentiment</div>
            </div>
          </Show>
        </div>
      </div>
    </a>
  );
}

export default NotePreview;
