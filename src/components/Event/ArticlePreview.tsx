import { Component, createEffect, createSignal, For, onMount, Show } from 'solid-js';
import { noteRegexG, profileRegexG } from '../../constants';
import { EventDisplayVariant, NostrEventContent, PrimalArticle } from '../../primal';

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

const ArticlePreview: Component<{
  article: PrimalArticle,
  embedded?: boolean,
  variant?: EventDisplayVariant,
}> = (props) => {

  const article = () => props.article;

  const published = () => ((article()?.tags || []).find(t => t[0] === 'published_at') || ['0'])[1];

  const image = () => ((article()?.tags || []).find(t => t[0] === 'image') || ['image', missingImage])[1];

  const title = () => ((article()?.tags || []).find(t => t[0] === 'title') || ['title', ''])[1];

  const author = () => article()?.user;

  const user = (pubkey?: string) => ({
    pubkey: pubkey || '',
    name: userName(pubkey),
    metadata: eventStore.get(pubkey || ''),
  });

  const onImgError = async (event: any) => {
    const image = event.target;

    // list of user's blossom servers from kind 10_063
    const userBlossoms = getUsersBlossomUrls(props.article.pubkey || '') || [];

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

  const renderImage = (url: string) => {
    const src = getMediaUrl(url, 's') || url;

    return <img class={styles.image} src={src} onerror={onImgError} />;
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
      article(),
      contextMenu?.getBoundingClientRect(),
      openReactionModal,
      () => {

      },
    );
  };

  const openInPrimal = () => {
    let link = `e/${article()?.nId}`;

    if (article().nId.startsWith('naddr')) {
      const vanityName = appStore.verifiedUsers[article().pubkey];

      if (vanityName) {
        const decoded = nip19.decode(article().nId);

        const data = decoded.data as nip19.AddressPointer;

        link = `${vanityName}/${encodeURIComponent(data.identifier)}`;
      }
    }

    return `https://primal.net/${link}`;
  };

  return (
    <a
      class={`${styles.notePreview}`}
      data-event-id={props.article.id}
      href={openInPrimal()}
      target='_blank'
    >
      <div class={styles.holder}>
        <div class={styles.contextMenuTrigger}>
          <NoteContextTrigger
            ref={contextMenu}
            onClick={onContextMenuTrigger}
          />
        </div>

        <div class={styles.userAvatar}>
          <Avatar
            user={author()}
            size={24}
          />
        </div>
        <div class={styles.noteInfo}>
          <div class={styles.header}>
            <div class={styles.userName}>
              {author().name}
            </div>
            <div class={styles.separator}>•</div>
            <div class={styles.noteDate}>
             {longDate(parseInt(published()))}
            </div>
          </div>
          <div class={styles.content}>
            <Show when={image().length > 0}>
              {renderImage(image())}
            </Show>

            <div class={styles.text}>
              {title()}
            </div>
          </div>
        </div>

        <div class={styles.noteStats}>
          <div class={styles.stat}>
            <div class={styles.number}>
              {humanizeNumber(Math.ceil(article()?.studioStats?.satszapped || 0))}
            </div>
            <div class={styles.unit}>Sats</div>
          </div>

          <div class={styles.stat}>
            <div class={styles.number}>{humanizeNumber(Math.ceil(article()?.studioStats?.score || 0))}</div>
            <div class={styles.unit}>Score</div>
          </div>

          <div class={styles.stat}>
            <div class={styles.number}>
              <div class={styles[`sentiment_${article()?.studioStats?.sentiment || 'neutral'}`]}></div>
            </div>
            <div class={styles.unit}>Sentiment</div>
          </div>
        </div>
      </div>
    </a>
  );
}

export default ArticlePreview;
