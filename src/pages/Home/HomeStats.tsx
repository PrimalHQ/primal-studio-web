
import { Component } from 'solid-js';

import styles from './Home.module.scss';
import { homeStore } from 'src/pages/Home/Home.data';
import { humanizeNumber } from 'src/utils/ui';
import { StudioGraph } from 'src/primal_api/studio';

const HomeStats: Component<{
  id?: string,
  onToggleKey: (key: keyof StudioGraph) => void,
}> = (props) => {

  const satsDiff = () =>
    homeStore.totals.satszapped_received - homeStore.totals.satszapped_sent;


  return (
    <div class={styles.numbersHolder}>
      <div class={styles.variousStats}>
        <button
          class={`${styles.statPod} ${homeStore.graphKey == 'replies' ? styles.active : ''}`}
          onClick={() => props.onToggleKey('replies')}
        >
          <div class={styles.label}>Replies</div>
          <div class={styles.value}>
            {humanizeNumber(homeStore.totals.replies)}
          </div>
        </button>

        <button
          class={`${styles.statPod} ${homeStore.graphKey == 'reposts' ? styles.active : ''}`}
          onClick={() => props.onToggleKey('reposts')}
        >
          <div class={styles.label}>Reposts</div>
          <div class={styles.value}>
            {humanizeNumber(homeStore.totals.reposts)}
          </div>
        </button>

        <button
          class={`${styles.statPod} ${homeStore.graphKey == 'reactions' ? styles.active : ''}`}
          onClick={() => props.onToggleKey('reactions')}
        >
          <div class={styles.label}>Reactions</div>
          <div class={styles.value}>
            {humanizeNumber(homeStore.totals.reactions)}
          </div>
        </button>

        <button
          class={`${styles.statPod} ${homeStore.graphKey == 'bookmarks' ? styles.active : ''}`}
          onClick={() => props.onToggleKey('bookmarks')}
        >
          <div class={styles.label}>Bookmarks</div>
          <div class={styles.value}>
            {humanizeNumber(homeStore.totals.bookmarks)}
          </div>
        </button>

        <button
          class={`${styles.statPod} ${homeStore.graphKey == 'quotes' ? styles.active : ''}`}
          onClick={() => props.onToggleKey('quotes')}
        >
          <div class={styles.label}>Quotes</div>
          <div class={styles.value}>
            {humanizeNumber(homeStore.totals.quotes)}
          </div>
        </button>

        <button
          class={`${styles.statPod} ${homeStore.graphKey == 'mentions' ? styles.active : ''}`}
          onClick={() => props.onToggleKey('mentions')}
        >
          <div class={styles.label}>Mentions</div>
          <div class={styles.value}>
            {humanizeNumber(homeStore.totals.mentions)}
          </div>
        </button>
      </div>

      <div class={styles.zapStats}>
        <div
          class={styles.zapStat}
        >
          <div class={styles.label}>Zaps Received</div>
          <div class={styles.zapNumbers}>
            <div class={styles.value}>
              {humanizeNumber(homeStore.totals.zaps_received)}
            </div>
            <div class={styles.valueMore}>
              {humanizeNumber(homeStore.totals.satszapped_received)}<span>sats</span>
            </div>
          </div>
        </div>

        <div
          class={styles.zapStat}
        >
          <div class={styles.label}>Zaps Sent</div>
          <div class={styles.zapNumbers}>
            <div class={styles.value}>
              {humanizeNumber(homeStore.totals.zaps_sent)}
            </div>
            <div class={styles.valueMore}>
              {humanizeNumber(homeStore.totals.satszapped_sent)}
              <span>sats</span>
            </div>
          </div>
        </div>

        <div class={styles.zapStat}>
          <div class={styles.label}>Zaps Delta</div>
          <div class={styles.zapNumbers}>
            <div class={styles.value}>
              {humanizeNumber(homeStore.totals.zaps_received - homeStore.totals.zaps_sent)}
            </div>
            <div class={`${styles.valueMore} ${satsDiff() >= 0 ? styles.positive : styles.negative}`}>
              {satsDiff() >= 0 ? '+' : '-'}{humanizeNumber(Math.abs(satsDiff()))}
              <span>sats</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

}

export default HomeStats;
