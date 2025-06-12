import { Component, Show } from 'solid-js';
import { PrimalArticle } from '../../primal';

import styles from './Event.module.scss';
import { getMediaUrl, getUsersBlossomUrls } from 'src/stores/MediaStore';

import Avatar from '../Avatar/Avatar';
import { longDate } from 'src/utils/date';

import missingImage from 'assets/images/missing_image.svg';

export const renderArticlePreview = (config: any) => {
  return (<div>ARTICLE</div> as HTMLDivElement).innerHTML;
}

const ArticlePreviewSuggestion: Component<{
  article: PrimalArticle,
  onClick?: () => void,
}> = (props) => {

  const article = () => props.article;

  const published = () => ((article()?.tags || []).find(t => t[0] === 'published_at') || ['0'])[1];

  const image = () => ((article()?.tags || []).find(t => t[0] === 'image') || ['image', missingImage])[1];

  const title = () => ((article()?.tags || []).find(t => t[0] === 'title') || ['title', ''])[1];

  const author = () => article()?.user;

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

  return (
    <div class={styles.eventHolder}>
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

          <div class={styles.title}>
            {title()}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ArticlePreviewSuggestion;


export const ArticlePreviewSuggestionSkeleton: Component<{
  id?: string,
}> = (props) => {
  return (
    <div class={styles.articlePreviewSuggestionSkeleton}>
      <div class={styles.header}>
        <div class={styles.avatar}></div>
        <div class={styles.userInfo}></div>
      </div>
      <div class={styles.body}>
        <div class={styles.text}></div>
        <div class={styles.image}></div>
      </div>
    </div>
  );
}
