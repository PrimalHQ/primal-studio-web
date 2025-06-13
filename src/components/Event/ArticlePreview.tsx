import { Component, createEffect, createSignal, Show } from 'solid-js';
import { PrimalArticle, PrimalUser } from '../../primal';

import styles from './Event.module.scss';
import { userName } from '../../utils/profile';
import { getMediaUrl, getUsersBlossomUrls } from 'src/stores/MediaStore';
import Avatar from '../Avatar/Avatar';
import { longDate } from 'src/utils/date';

import missingImage from 'assets/images/missing_image.svg';
import { logError } from 'src/utils/logger';
import { getUsers } from 'src/primal_api/profile';
import { emptyUser } from 'src/utils/feeds';

export const renderArticlePreview = (config: any) => {
  return (<div>ARTICLE</div> as HTMLDivElement).innerHTML;
}

const ArticlePreview: Component<{
  article: PrimalArticle,
  hideTime?: boolean,
  onClick?: (article: PrimalArticle) => void,
}> = (props) => {

  const article = () => props.article;

  const [author, setAuthor] = createSignal<PrimalUser>({ ...emptyUser(props.article.pubkey) });

  const getAuthor = async () => {
    if (!props.article) return;
    let user = props.article?.user;

    if (!user || user.name.length === 0) {
      const users = await getUsers([props.article?.pubkey]);

      user = users.length > 0 ? users[0] : user;
    }

    setAuthor(user);
  }

  const published = () => ((article()?.tags || []).find(t => t[0] === 'published_at') || ['published_at', 0])[1];

  const image = () => ((article()?.tags || []).find(t => t[0] === 'image') || ['image', missingImage])[1];

  const title = () => ((article()?.tags || []).find(t => t[0] === 'title') || ['title', ''])[1];

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

  createEffect(() => {
    if (props.article) {
      getAuthor();
    } else {
      logError('Missing Article')
    }
  });

  return (
    <div
      class={styles.eventHolder}
      onClick={() => props.onClick && props.onClick(props.article)}
    >
      <div class={styles.userAvatar}>
        <Avatar
          user={author()}
          size={20}
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
              {longDate(parseInt(`${published() || article()?.created_at || 0}`))}
            </div>
          </Show>
        </div>
        <div class={styles.content}>
          <Show
            when={image().length > 0}
            fallback={
              <img class={styles.image} src={author().picture} onerror={onImgError} />
            }
          >
            {renderImage(image())}
          </Show>

          <div class={styles.title}>
            {title()}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ArticlePreview;
