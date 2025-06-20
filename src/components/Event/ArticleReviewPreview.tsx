import { Component, createSignal, createEffect, Show, For } from 'solid-js';
import { wordsPerMinute } from 'src/constants';
import { PrimalArticle } from 'src/primal';
import { shortDate } from 'src/utils/date';
import { userName } from 'src/utils/profile';
import Avatar from '../Avatar/Avatar';
import VerificationCheck from '../VerificationCheck/VerificationCheck';

import styles from './ArticleReviewPreview.module.scss';
import missingImage from 'src/assets/images/missing_image.svg';

export type ArticleProps = {
  id?: string,
  article: PrimalArticle,
  height?: number,
  bordered?: boolean,
  onClick?: () => void,
};

export const renderArticleReviewPreview = (config: ArticleProps) => {
  return (<div><ArticleReviewPreview article={config.article} bordered={config.bordered} /></div> as HTMLDivElement).innerHTML;
}

const ArticleReviewPreview: Component<ArticleProps> = (props) => {

  let articlePreview: HTMLDivElement | undefined;

  const onImageError = (event: any) => {
    const image = event.target;

    let src: string = props.article.user.picture;

    if (image.src === src || image.src.endsWith(src)) {
      src = missingImage;
    }

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
    const ss = articlePreview?.querySelector(`.${styles.summary}`);

    if (!tt || !ss) return;

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
      class={`${styles.article} ${props.bordered ? styles.bordered : ''}`}
      style={props.height ? `height: ${props.height}px` : ''}
      onClick={props.onClick}
    >
      <div class={styles.header}>
        <div
          class={styles.userInfo}
        >
          <Avatar user={props.article?.user} size={22}/>
          <div class={styles.userName}>{userName(props.article?.user.pubkey)}</div>
          <VerificationCheck user={props.article?.user} />
          <div class={styles.nip05}>{props.article?.user?.nip05 || ''}</div>
        </div>
        <div class={styles.time}>
          {shortDate(props.article?.published_at)}
        </div>
      </div>

      <div class={styles.body}>
        <div class={styles.text}>
          <div class={`${styles.content} ${conetntStyles()}`}>
            <div class={styles.title}>
              {props.article?.title || ''}
            </div>
            <div class={styles.summary}>
              {props.article?.summary || ''}
            </div>
          </div>
          <div class={styles.tags}>
            <div class={styles.estimate}>
              {Math.ceil((props.article?.wordCount || 0) / wordsPerMinute)} minute read
            </div>
            <For each={props.article?.keywords?.slice(0, 3) || []}>
              {tag => (
                <div class={styles.tag}>
                  {tag}
                </div>
              )}
            </For>
            <Show when={props.article?.keywords?.length && props.article.keywords.length > 3}>
              <div class={styles.tag}>
                + {props.article.keywords.length - 3}
              </div>
            </Show>
          </div>
        </div>
        <div class={styles.image}>
          <Show
            when={props.article?.image}
            fallback={
              <Show
                when={props.article?.user.picture}
                fallback={<div class={styles.placeholderImage}></div>}
              >
                <img src={props.article?.user.picture} onerror={onImageError} />
              </Show>
            }
          >
            <img
              src={props.article?.image}
              onerror={onImageError}
            />
          </Show>
        </div>
      </div>

        {/* <div class={styles.footer}>
          <ArticleFooter
            note={props.article}
            size="normal"
          />
        </div> */}
    </div>
  );
}

export default ArticleReviewPreview;
