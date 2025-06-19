import { Component, Match, Switch } from 'solid-js';

import styles from './Account.module.scss';
import { useIntl } from '@cookbook/solid-intl';
import { useNavigate } from '@solidjs/router';
import Avatar from '../../components/Avatar/Avatar';
import VerificationCheck from '../../components/VerificationCheck/VerificationCheck';
import { PrimalUser } from 'src/primal';
import { accountStore } from 'src/stores/AccountStore';
import { userName } from 'src/utils/profile';
import { shortDate } from 'src/utils/date';


const PrimalUserInfo: Component<{
  user?: PrimalUser,
}> = (props) => {

  const isExpired = () => {
    if (accountStore.membershipStatus.tier === 'premium-legend') return false;

    const expiration = accountStore.membershipStatus.expires_on || 0;
    const now = (new Date()).getTime() / 1_000;

    return now > expiration;
  }

  const isLegend = () => {
    return accountStore.membershipStatus.tier === 'premium-legend';
  }

  return (
    <div class={styles.premiumProfileLayout}>
      <div class={styles.userInfo}>
        <Avatar user={props.user} size={80} />
        <div class={styles.userName}>
          {userName(props.user?.pubkey)}
          <VerificationCheck
            user={props.user}
            large={true}
          />
        </div>
      </div>

      {/* <div class={styles.premiumActive}>
        <Switch
          fallback={
            <div class={styles.activePremium}>
              <div class={styles.caption}>{accountStore.membershipStatus.cohort_1 || ''}</div>
              <div class={styles.date}>
                <div>{accountStore.membershipStatus.cohort_2 || shortDate(accountStore.membershipStatus.expires_on || 0)}</div>
              </div>
            </div>
          }
        >
          <Match when={isExpired()}>
            <div class={styles.expiredPremium}>
              <div class={styles.caption}>Expired</div>
              <div class={styles.date}><div>{shortDate(accountStore.membershipStatus.expires_on || 0)}</div></div>
            </div>
          </Match>
          <Match when={isLegend()}>
            <div class={`${styles.legendPremium}`}>
              <div class={styles.caption}>{accountStore.membershipStatus.cohort_1 || ''}</div>
              <div class={styles.date}>
                <div>{accountStore.membershipStatus.cohort_2 || shortDate(accountStore.membershipStatus.expires_on || 0)}</div>
              </div>
            </div>
          </Match>
        </Switch>
      </div> */}
    </div>
  );
}

export default PrimalUserInfo;
