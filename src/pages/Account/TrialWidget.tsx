import { Component } from 'solid-js';

import styles from './Account.module.scss';
import ButtonPremium from 'src/components/Buttons/ButtonPremium';

import dayjs from 'dayjs';
import { date } from 'src/utils/date';

const TrialWidget: Component<{
  onBuy: () => void,
  expiresIn: number,
}> = (props) => {

  const daysLeft = () =>{
    const now = dayjs();
    const then = now.add(props.expiresIn || 0, 'seconds');

    const diff = then.diff(now, 'days');

    if (diff === 0) {
      const diffH = then.diff(now, 'hours');

      if (diffH === 0) return 'in less then 1 hour'
      if (diffH === 1) return 'in 1 hour';

      return `in ${diffH} hours`;
    }

    if (diff === 1) return 'in 1 day';

    return `in ${diff} days`;
  }

  return (
    <div class={styles.accountTrialWidget}>
      <div class={styles.labels}>
        <div class={styles.caption}>Primal Studio Free Trial</div>
        <div class={styles.expire}>Your free trial ends {daysLeft()}.</div>
      </div>

      <ButtonPremium onClick={props.onBuy}>Subscribe to Primal Pro</ButtonPremium>
    </div>
  );
}

export default TrialWidget;

