import { Component, createSignal, onCleanup, onMount, Show } from 'solid-js';
import Wormhole from '../../helpers/Wormhole/Wormhole';
import { translate } from '../../translations/translate';

import styles from './Account.module.scss';
import HeaderTitle from 'src/components/HeaderTitle/HeaderTitle';
import { accountStore, activeUser } from 'src/stores/AccountStore';
import PrimalUserInfo from './PrimalUserInfo';
import AccountSummary from './AccountSummary';
import ButtonPremium from 'src/components/Buttons/ButtonPremium';
import BuyProDialog from '../Landing/BuyProDialog';
import StickySidebar from 'src/components/StickySidebar/StickySidebar';
import TrialWidget from './TrialWidget';

const Account: Component = () => {

  const [showBuyPro, setShowBuyPro] = createSignal(false);

  const isLegend = () => accountStore.membershipStatus.tier === 'premium-legend';

  const isExpired = () => {
    if (isLegend()) return false;

    const expiration = accountStore.membershipStatus.expires_on || 0;
    const now = (new Date()).getTime() / 1_000;

    return now > expiration;
  };


  onMount(() => {
    const el = document.querySelector('header');

    if (el) el.style = 'display: none';
  });

  onCleanup(() => {
    const el = document.querySelector('header');

    if (el) el.style = '';
  })

  return (
    <div class={styles.accountPageLayout}>
      <div class={styles.mainContent}>
        <div class={styles.accountHeader}>
          <div>
            <HeaderTitle
              title={translate('account', 'header')}
            />
          </div>
        </div>
        <div class={styles.accountPageContent}>
          <PrimalUserInfo user={activeUser()} />
          <AccountSummary user={activeUser()} />

          <Show when={!accountStore.licenseStatus.licensed}>
            <ButtonPremium onClick={() => setShowBuyPro(true)}>Subscribe to Primal Pro</ButtonPremium>
          </Show>
        </div>
      </div>

      <div class={styles.sidebar}>
        <StickySidebar noWormhole={true}>
          <Show when={accountStore.licenseStatus.trial_remaining_sec > 0 && !accountStore.licenseStatus.licensed}>
            <TrialWidget
              expiresIn={accountStore.licenseStatus.trial_remaining_sec}
              onBuy={() => setShowBuyPro(true)}
            />
          </Show>
        </StickySidebar>
      </div>

      <BuyProDialog
        open={showBuyPro()}
        setOpen={setShowBuyPro}
      />
    </div>
  );
}

export default Account;

