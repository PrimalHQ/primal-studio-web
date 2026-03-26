import { Component, createEffect, createMemo, createSignal } from 'solid-js';
import { PrimalArticle } from 'src/primal';

import styles from './NotePreview.module.scss';
import { userNameFromUser } from 'src/utils/profile';
import Avatar from '../Avatar/Avatar';
import VerificationCheck from 'src/components/VerificationCheck/VerificationCheck';
import { date, longDate, veryLongDate } from 'src/utils/date';
import primalLogo from 'src/assets/icons/logo.png';
import { wordsPerMinute } from 'src/constants';
import { nip05Verification } from 'src/utils/ui';
import { getMediaUrl } from 'src/stores/MediaStore';

const ArticlePreview: Component<{
  article: PrimalArticle,
  highlighted?: boolean,
  dark?: boolean
  onClick?: () => void,
}> = (props) => {

  const [src, setSrc] = createSignal('');

  const getSrc = createMemo(() => {
    const src = props.article.image

    if (!src) {
      return '';
    }

    const url = getMediaUrl(src,'s', true);

    const ret = url ?? src;

    setSrc(ret);
  });

  createEffect(() => {
    getSrc();
  });

  return (
    <div
      class={`${styles.articlePreview} ${props.highlighted ? styles.highlighted : ''} ${props.dark ? styles.dark : ''}`}
      data-event-id={props.article.id}
      onClick={props.onClick}
    >
      <div class={styles.header}>
        <Avatar user={props.article.user} size={20} />
        <div class={styles.userInfo}>
          <div class={styles.userNameInfo}>
            <div class={styles.userName}>{userNameFromUser(props.article.user)}</div>
            <VerificationCheck user={props.article.user} legendConfig={props.article.user.legendConfig} />
            <div class={styles.nip05}>
              {nip05Verification(props.article.user)}
            </div>
          </div>
          <div class={styles.time}>{longDate(props.article.created_at)}</div>
        </div>
      </div>

      <div class={styles.content}>
        <img
          class={styles.image}
          src={src()}
          onerror={(e: ErrorEvent) => {
            const t = e.target as HTMLImageElement;

            t.onerror = null;
            t.src = props.article.user.picture || primalLogo;
          }}
        />
        <div class={styles.readInfo}>
          <div class={styles.title}>{props.article.title}</div>
          <div class={styles.summary}>{props.article.summary}</div>
          <div class={styles.estimate}>
            {Math.ceil((props.article.wordCount || 0) / wordsPerMinute)} minute read
          </div>
        </div>
      </div>
    </div>
  );
}

export default ArticlePreview;


export const ArticlePreviewSkeleton: Component<{
  id?: string,
}> = (props) => {
  return (
    <div class={styles.articlePreviewSkeleton}>
      <div class={styles.avatarSN}></div>
      <div class={styles.shortNote}>
        <div class={styles.headerSN}></div>
        <div class={styles.contentSN}></div>
      </div>
    </div>
  );
}
