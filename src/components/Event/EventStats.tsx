import { Component, createEffect } from 'solid-js';
import { PrimalArticle, PrimalNote } from '../../primal';

import styles from './Event.module.scss';
import { humanizeNumber } from 'src/utils/ui';


const EventStats: Component<{
  event: PrimalNote | PrimalArticle,
}> = (props) => {

  return (
    <div class={styles.eventStats}>
      <div class={styles.statsSection}>
        <div class={styles.stat}>
          <div class={styles.number}>{humanizeNumber(props.event.stats.zaps)}</div>
          <div class={styles.unit}>Zaps</div>
        </div>
        <div class={styles.stat}>
          <div class={styles.number}>{humanizeNumber(props.event.stats.satszapped)}</div>
          <div class={styles.unit}>Sats</div>
        </div>
      </div>

      <div class={styles.statsSection}>
        <div class={styles.stat}>
          <div class={styles.number}>{humanizeNumber(props.event.stats.replies)}</div>
          <div class={styles.unit}>Replies</div>
        </div>
        <div class={styles.stat}>
          <div class={styles.number}>{humanizeNumber(props.event.stats.likes)}</div>
          <div class={styles.unit}>Reactions</div>
        </div>
      </div>

      <div class={styles.statsSection}>
        <div class={styles.stat}>
          <div class={styles.number}>{humanizeNumber(props.event.stats.reposts)}</div>
          <div class={styles.unit}>Reposts</div>
        </div>
        <div class={styles.stat}>
          <div class={styles.number}>{humanizeNumber(props.event.studioStats.bookmarks)}</div>
          <div class={styles.unit}>Bookmarks</div>
        </div>
      </div>

      <div class={styles.statsSection}>
        <div class={styles.stat}>
          <div class={styles.number}>{humanizeNumber(props.event.stats.mentions)}</div>
          <div class={styles.unit}>Quotes</div>
        </div>
        <div class={styles.stat}>
          <div class={styles.number}>
            <div class={styles[`sentiment_${props.event.studioStats?.sentiment || 'neutral'}`]}></div>
          </div>
          <div class={styles.unit}>Sentiment</div>
        </div>
      </div>

      <div class={styles.bigStat}>
        <div class={styles.number}>{humanizeNumber(props.event.studioStats?.score || 0)}</div>
        <div class={styles.unit}>Score</div>
      </div>

    </div>
  );
}

export default EventStats;
