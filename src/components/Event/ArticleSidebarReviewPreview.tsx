import { Component, Show } from 'solid-js';
import { wordsPerMinute } from '../../constants';

import styles from './ArticleReviewPreview.module.scss';
import { PrimalArticle } from 'src/primal';
import { getMediaUrl } from 'src/stores/MediaStore';
import { date } from 'src/utils/date';
import { userName } from 'src/utils/profile';
import Avatar from '../Avatar/Avatar';

const ArticleSidebarReviewPreview: Component<{
  id?: string,
  article: PrimalArticle,
  short?: boolean,
  shorter?: boolean,
  noBorder?: boolean,
}> = (props) => {

  const articleImage = () => {
    const url = props.article.image;

    let m = getMediaUrl(url, 's');

    if (!m) {
      m = getMediaUrl(url, 'm');
    }

    if (!m) {
      m = getMediaUrl(url, 'o');
    }

    if (!m) {
      m = url;
    }

    return m;
  }

  const authorAvatar = () => {
    const url = props.article.user.picture;

    let m = getMediaUrl(url, 's');

    if (!m) {
      m = getMediaUrl(url, 'm');
    }

    if (!m) {
      m = getMediaUrl(url, 'o');
    }

    if (!m) {
      m = url;
    }

    return m;
  }

  const onImageError = (event: any) => {
    const image = event.target;

    let src: string = authorAvatar();

    image.onerror = "";
    image.src = src;
    return true;
  };

  return (
    <div
      class={`${styles.articleShort} ${props.noBorder ? styles.noBorder : ''}`}
      data-event={props.article.id}
    >
      <div class={styles.header}>
        <Avatar user={props.article.user} size={22} />
        <div class={styles.userName}>{userName(props.article.user.pubkey)}</div>
        <div class={styles.time}>
          &bull;&nbsp;
          {date(props.article.published_at).label}
        </div>
      </div>

      <div class={styles.body}>
        <div class={`${styles.text} ${props.short ? styles.short : ''} ${props.shorter ? styles.shorter : ''}`}>
          <div class={styles.title}>
            {props.article.title}
          </div>
          <div class={styles.estimate}>
            {Math.ceil((props.article.wordCount || 0) / wordsPerMinute)} minutes
          </div>
        </div>
        <div class={styles.image}>
          <Show
            when={props.article.image}
            fallback={
              <img
                src={authorAvatar()}
              />
            }
          >
            <img
              src={articleImage()}
              onerror={onImageError}
            />
          </Show>
        </div>
      </div>
    </div>
  );
}

export default ArticleSidebarReviewPreview;
