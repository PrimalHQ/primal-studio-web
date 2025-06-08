import { batch, Component, createEffect, Show } from 'solid-js';

import styles from './Footers.module.scss';
import { PrimalArticle } from 'src/primal';
import ArticleFooterActionButton from './ArticleFooterActionButton';


const ArticleFooter: Component<{
  note: PrimalArticle,
  size?: 'xwide' | 'wide' | 'normal' | 'short' | 'very_short',
  id?: string,
  isPhoneView?: boolean,
}> = (props) => {

  let footerDiv: HTMLDivElement | undefined;
  let repostMenu: HTMLDivElement | undefined;

  const size = () => props.size ?? 'normal';

  const buttonTypeClasses: Record<string, string> = {
    zap: styles.zapType,
    like: styles.likeType,
    reply: styles.replyType,
    repost: styles.repostType,
  };

  return (
    <div
      id={props.id}
      class={`${styles.footer} ${styles[size()]} ${props.isPhoneView ? styles.phoneView : ''}`}
      ref={footerDiv}
      onClick={(e) => {e.preventDefault();}}
    >
      <ArticleFooterActionButton
        note={props.note}
        type="reply"
        label={''}
      />

      <ArticleFooterActionButton
        note={props.note}
        type="zap"
        label={''}
      />

      <ArticleFooterActionButton
        note={props.note}
        type="like"
        label={''}
      />

      <ArticleFooterActionButton
        note={props.note}
        type="repost"
        label={''}
      />

      <div class={styles.bookmarkFoot}>
        <ArticleFooterActionButton
          note={props.note}
          type="bookmark"
          label={''}
        />
      </div>

    </div>
  )
}

export default ArticleFooter;
