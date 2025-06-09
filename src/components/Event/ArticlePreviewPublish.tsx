import { Component, createEffect, createSignal, For, Show } from 'solid-js';
import { createStore } from 'solid-js/store';
import Avatar from '../Avatar/Avatar';

import styles from './Event.module.scss';
import { NoteReactionsState, PrimalArticle } from 'src/primal';
import { getMediaUrl } from 'src/stores/MediaStore';
import { shortDate } from 'src/utils/date';
import { userName } from 'src/utils/profile';
import VerificationCheck from '../VerificationCheck/VerificationCheck';
import { wordsPerMinute } from 'src/constants';
import ArticleFooter from './ArticleFooter';

export type ArticleProps = {
  id?: string,
  article: PrimalArticle,
  height?: number,
  onRender?: (article: PrimalArticle, el: HTMLDivElement | undefined) => void,
  hideFooter?: boolean,
  hideContext?: boolean,
  bordered?: boolean,
  noLinks?: boolean,
  onClick?: (url: string) => void,
  onRemove?: (id: string) => void,
  notif?: boolean,
};

export const renderArticlePreview = (props: ArticleProps) => (
  <div>
    <ArticlePreviewPublish {...props} />
  </div> as HTMLDivElement
  ).innerHTML;

const ArticlePreviewPublish: Component<ArticleProps> = (props) => {


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

    const tt = articlePreview?.querySelector(`.${styles.title}`);

    if (!tt) return;

    const titleLines = countLines(tt);

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
      class={`${styles.article} ${props.bordered ? styles.bordered : ''} ${props.notif ? styles.notif : ''}`}
      style={props.height ? `height: ${props.height}px` : ''}
    >
      <div class={styles.header}>
        <div
          class={styles.userInfo}
        >
          <Avatar user={props.article.user} size={22} />
          <div class={styles.userName}>{userName(props.article.pubkey)}</div>
          <VerificationCheck user={props.article.user} />
          <div class={styles.nip05}>{props.article.user?.nip05 || ''}</div>
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
            <div class={styles.summary}>
              {props.article.summary}
            </div>
          </div>
          <div class={styles.tags}>
            <div class={styles.estimate}>
              {Math.ceil((props.article.wordCount || 0) / wordsPerMinute)} minute read
            </div>
            <For each={props.article.tags?.slice(0, 3)}>
              {tag => (
                <div class={styles.tag}>
                  {tag}
                </div>
              )}
            </For>
            <Show when={props.article.tags?.length && props.article.tags.length > 3}>
              <div class={styles.tag}>
                + {props.article.tags.length - 3}
              </div>
            </Show>
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

      <div>Bojan</div>

      {/* <Show when={!props.hideFooter}>
        <div class={`${props.notif ? styles.footerNotif : styles.footer}`}>
          <ArticleFooter
            note={props.article}
          />
        </div>
      </Show> */}

    </div>
  );
}

export default ArticlePreviewPublish;
