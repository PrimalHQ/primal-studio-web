
import { Component, Match, Show, Switch } from 'solid-js';


import styles from './Account.module.scss';
import ButtonLink from '../../components/Buttons/ButtonLink';
import { PrimalUser } from 'src/primal';
import { accountStore } from 'src/stores/AccountStore';
import { userName } from 'src/utils/profile';

import dayjs from 'dayjs';


const AccountSummary: Component<{
  user?: PrimalUser
}> = (props) => {

  const name = () => accountStore.premiumStatus.name;

  const status = () => accountStore.membershipStatus;

  const isLud16Primal = () => {
    return props.user?.lud16.endsWith('@primal.net');
  }

  const freeTime = () => accountStore.licenseStatus.trial_remaining_sec;

  const licenseTime = () => {
    const validUntil = accountStore.licenseStatus.valid_until;

    if (validUntil === null) return 'Never';

    const now = dayjs().unix();

    if (validUntil > now) return dayjs.unix(validUntil).format('MMMM DD, YYYY');

    return 'Expired';
  }

  return (
    <div class={styles.premiumSummary}>
      <div class={styles.summaryItem}>
        <div class={styles.summaryName}>
          <div class={styles.verifIcon}></div>
          <div>Verified nostr address</div>
        </div>
        <div class={styles.summaryValueHolder}>
          <div class={styles.summaryValue}>
            {props.user?.nip05}
          </div>
        </div>
      </div>

      <div class={styles.summaryItem}>
        <div class={styles.summaryName}>
          <div class={styles.zapIcon}></div>
          <div>Bitcoin lightning address</div>
        </div>
        <div class={styles.summaryValueHolder}>
          <div class={styles.summaryValue}>
            {props.user?.lud16}
          </div>
        </div>
      </div>

      <div class={styles.summaryItem}>
        <div class={styles.summaryName}>
          <div class={styles.linkIcon}></div>
          <div>VIP profile on primal.net</div>
        </div>
        <div>
          <span class={styles.summaryValue}>
            {name() ? `primal.net/${name()}` : ''}
          </span>
        </div>
      </div>

      <Switch>
        <Match when={accountStore.licenseStatus.licensed}>
          <div class={styles.summaryItem}>
            <div class={styles.summaryName}>
              <div class={styles.calendarIcon}></div>
              <div>Primal Pro renews on</div>
            </div>
            <div>
              <span class={styles.summaryValue}>
                {licenseTime()}
              </span>
            </div>
          </div>
        </Match>
        <Match when={true}>
          <div class={styles.summaryItem}>
            <div class={styles.summaryName}>
              <div class={styles.calendarIcon}></div>
              <div>Primal Free Trial expires on</div>
            </div>
            <div>
              <span class={styles.summaryValue}>
                {freeTime() > 0 ? dayjs().add(freeTime(), 'seconds').format('MMMM DD, YYYY') : 'Expired'}
              </span>
            </div>
          </div>
        </Match>
      </Switch>
    </div>
  );
}

export default AccountSummary;
