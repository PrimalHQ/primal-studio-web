import { Component } from 'solid-js';
import { PrimalArticle, PrimalNote } from '../../primal';

import styles from './Event.module.scss';
import { longDate } from 'src/utils/date';


const ScheduledInfo: Component<{
  event: PrimalNote | PrimalArticle,
  onEdit?: () => void,
}> = (props) => {

  return (
    <div class={styles.scheduledInfo}>
      <div class={styles.editSection}>
        <button class={styles.draftAction}>Edit</button>
      </div>
      <div class={styles.calendarIconBig}></div>
      <div class={styles.publishInfo}>
        <div class={styles.label}>Scheduled to publish on:</div>
        <div class={styles.publishTime}>
          <div class={styles.time}>{longDate(props.event.created_at)}</div>
          <button class={styles.draftAction}>Edit Time</button>
        </div>
      </div>
    </div>
  );
}

export default ScheduledInfo;
