import { Component } from 'solid-js';

import styles from './Footers.module.scss';
import { PrimalArticle } from 'src/primal';

const buttonTypeClasses: Record<string, string> = {
  zap: styles.zapType,
  like: styles.likeType,
  reply: styles.replyType,
  repost: styles.repostType,
  bookmark: styles.bookmarkType,
};

const ArticleFooterActionButton: Component<{
  type: 'zap' | 'like' | 'reply' | 'repost' | 'bookmark',
  note: PrimalArticle,
  disabled?: boolean,
  highlighted?: boolean,
  onClick?: (e: MouseEvent) => void,
  onMouseDown?: (e: MouseEvent) => void,
  onMouseUp?: (e: MouseEvent) => void,
  onTouchStart?: (e: TouchEvent) => void,
  onTouchEnd?: (e: TouchEvent) => void,
  label: string | number,
  hidden?: boolean,
  title?: string,
  large?: boolean,
}> = (props) => {

  return (
    <button
      id={`btn_${props.type}_${props.note.id}`}
      class={`${styles.stat} ${props.highlighted ? styles.highlighted : ''}`}
      onClick={props.onClick ?? (() => {})}
      onMouseDown={props.onMouseDown ?? (() => {})}
      onMouseUp={props.onMouseUp ?? (() => {})}
      onTouchStart={props.onTouchStart ?? (() => {})}
      onTouchEnd={props.onTouchEnd ?? (() => {})}
      disabled={props.disabled}
    >
      <div class={`${buttonTypeClasses[props.type]} ${props.large ? styles.large : ''}`}>
        <div
          class={`${styles.icon} ${props.large ? styles.large : ''}`}
          style={props.hidden ? 'visibility: hidden': 'visibility: visible'}
        ></div>
        <div class={styles.statNumber}>{props.label || ''}</div>
      </div>
    </button>
  )
}

export default ArticleFooterActionButton;
