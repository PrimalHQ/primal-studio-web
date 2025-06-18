import { Component, For, Show } from 'solid-js';

import styles from './Landing.module.scss';
import Dialog from 'src/components/Dialogs/Dialog';

import branding from 'src/assets/images/primal_studio_dark.svg';
import { useNavigate } from '@solidjs/router';

import { isIPhone, isAndroid } from '@kobalte/utils';

const PricingCardPro: Component<{
  id?: string,
}> = (props) => {
  const navigate = useNavigate();

  return (
    <div class={styles.pricingCard}>
      <div class={styles.title}>
        Primal <span>Pro</span>
      </div>

      <div class={styles.price}>
        <div class={styles.monthly}>
          $69 <span>/month</span>
        </div>
        <div class={styles.anual}>
          USD$749 billed annually <span>Save One Month</span>
        </div>
      </div>

      <div class={styles.features}>
        <div class={styles.featureItem}>
          <div class={styles.checkIcon}></div>
          <div class={styles.label}>Single user</div>
        </div>
        <div class={styles.featureItem}>
          <div class={styles.checkIcon}></div>
          <div class={styles.label}>Primal Studio</div>
        </div>
        <div class={styles.featureItem}>
          <div class={styles.checkIcon}></div>
          <div class={styles.label}>Legend status on Primal</div>
        </div>
        <div class={styles.featureItem}>
          <div class={styles.checkIcon}></div>
          <div class={styles.label}>100GB media storage</div>
        </div>
        <div class={styles.featureItem}>
          <div class={styles.checkIcon}></div>
          <div class={styles.label}>10GB max file size</div>
        </div>
      </div>

      <button
        class={styles.buyButton}
        onClick={() => {}}
      >
        Buy Now
      </button>
    </div>
  );
}

export default PricingCardPro;
