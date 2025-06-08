import { A } from '@solidjs/router';
import { Component, createEffect, createSignal, Show } from 'solid-js';
import { createStore } from 'solid-js/store';
import { wordsPerMinute } from '../../constants';
import VerificationCheck from '../VerificationCheck/VerificationCheck';

import defaultAvatarDark from '../../assets/images/reads_image_dark.png';
import defaultAvatarLight from '../../assets/images/reads_image_light.png';

import styles from './ArticleReviewPreview.module.scss';
import { nip19 } from 'src/utils/nTools';
import { PrimalArticle, NoteReactionsState } from 'src/primal';
import { shortDate } from 'src/utils/date';
import { userName } from 'src/utils/profile';
import Avatar from '../Avatar/Avatar';
import NoteContextTrigger from '../NoteContextMenu/NoteContextTrigger';
import ArticleFooter from './ArticleFooter';
import { getMediaUrl } from 'src/stores/MediaStore';

const isDev = localStorage.getItem('devMode') === 'true';

const ArticlePhoneReviewPreview: Component<{
  id?: string,
  article: PrimalArticle,
  height?: number,
  onRender?: (article: PrimalArticle, el: HTMLDivElement | undefined) => void,
  hideFooter?: boolean,
  hideContext?: boolean,
  bordered?: boolean,
  noBorder?: boolean,
  onRemove?: (id: string) => void,
}> = (props) => {

  const [reactionsState, updateReactionsState] = createStore<NoteReactionsState>({
    likes: 0,
    liked: false,
    reposts: 0,
    reposted: false,
    replies: 0,
    replied: false,
    zapCount: 0,
    satsZapped: 0,
    zapped: false,
    zappedAmount: 0,
    zappedNow: false,
    isZapping: false,
    showZapAnim: false,
    hideZapIcon: false,
    moreZapsAvailable: false,
    isRepostMenuVisible: false,
    topZaps: [],
    topZapsFeed: [],
    quoteCount: 0,
  });

  let articleContextMenu: HTMLDivElement | undefined;

  let articlePreview: HTMLDivElement | undefined;

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

  const onImageLoaded = () => {
    props.onRender && props.onRender(props.article, articlePreview);
  };

  const onImageError = (event: any) => {
    const image = event.target;

    let src: string = authorAvatar();

    image.onerror = "";
    image.src = src;
    return true;
  };

  const countLines = (el: Element) => {

    // @ts-ignore
    var divHeight = el.offsetHeight

    // @ts-ignore
    var lineHeight = el.computedStyleMap ?
      (el.computedStyleMap().get('line-height')?.toString() || '0') :
      window.getComputedStyle(el).getPropertyValue('line-height').valueOf();

    var lines = divHeight / parseInt(lineHeight);

    return lines;
  }


  const [contentStyle, setContentStyle] = createSignal('T3');

  createEffect(() => {
    const t = props.article.title;
    const s = props.article.summary;

    const tt = articlePreview?.querySelector(`.${styles.title}`);
    const ss = articlePreview?.querySelector(`.${styles.summary}`);

    if (!tt || !ss) return;

    const titleLines = countLines(tt);
    const summaryLines = countLines(ss);

    if (titleLines === 1) setContentStyle('T1');

    if (titleLines === 2) setContentStyle('T2');

    if (titleLines === 3) setContentStyle('T3');
  });

  const conetntStyles = () => {
    if (contentStyle() === 'T1') return styles.t1;
    if (contentStyle() === 'T2') return styles.t2;

    return ''
  }

  return (
    <div
      ref={articlePreview}
      class={`${styles.articlePhone} ${props.bordered ? styles.bordered : ''} ${props.noBorder ? styles.noBorder : ''}`}
      style={props.height ? `height: ${props.height}px` : ''}
    >
      <Show when={!props.hideContext}>
        <div class={styles.upRightFloater}>
          <NoteContextTrigger
            ref={articleContextMenu}
          />
        </div>
      </Show>

      <div class={styles.header}>
        <div class={styles.userInfo}>
          <Avatar user={props.article.user} size={22}/>
          <div class={styles.userName}>{userName(props.article.user.pubkey)}</div>
          <VerificationCheck user={props.article.user} />
        </div>
        <div class={styles.time}>
          {shortDate(props.article.published_at)}
        </div>
      </div>

      <div class={styles.body}>
        <div class={styles.text}>
          <div class={`${styles.content} ${conetntStyles()}`}>
            <div class={styles.title}>
              {props.article.title}
            </div>
          </div>
        </div>

        <div class={styles.image}>
          <Show
            when={props.article.image}
            fallback={
              <Show
                when={authorAvatar()}
                fallback={<div class={styles.placeholderImage}></div>}
              >
                <img src={props.article.user.picture} onload={onImageLoaded} onerror={onImageError} />
              </Show>
            }
          >
            <img
              src={articleImage()}
              onload={onImageLoaded}
              onerror={onImageError}
            />
          </Show>
        </div>
      </div>

      <div class={styles.stats}>
        <div class={styles.estimates}>
          <div class={styles.estimate}>
            {Math.ceil((props.article.wordCount || 0) / wordsPerMinute)} minute read
          </div>
          <div class={styles.estimate}>
            <div class={styles.commentIcon}></div>
            {Math.ceil(props.article.stats.replies)} comments
          </div>
        </div>
      </div>

      <Show when={!props.hideFooter}>
        <div class={styles.footer}>
          <ArticleFooter
            note={props.article}
            size="very_short"
          />
        </div>
      </Show>

    </div>
  );
}

export default ArticlePhoneReviewPreview;
