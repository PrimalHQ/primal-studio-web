import { Component } from 'solid-js';

import styles from './Landing.module.scss';

const PricingCardTeam: Component<{
  id?: string,
}> = (props) => {

  return (
    <div class={styles.pricingCard}>
      <div class={styles.title}>
        Primal <span>Team</span>
      </div>

      <div class={styles.price}>
        <div class={styles.monthly}>
          $49 <span>/user/month</span>
        </div>
        <div class={styles.anual}>
          USD$2,695 billed annually <span>Save One Month</span>
        </div>
      </div>

      <div class={styles.features}>
        <div class={styles.featureItem}>
          <div class={styles.checkIcon}></div>
          <div class={styles.label}>5 users <button class={styles.changeUsers} onClick={() => {}}>change</button></div>
        </div>
        <div class={styles.featureItem}>
          <div class={styles.checkIcon}></div>
          <div class={styles.label}>Primal Studio <span>for each user</span></div>
        </div>
        <div class={styles.featureItem}>
          <div class={styles.checkIcon}></div>
          <div class={styles.label}>Legend status on Primal <span>for each user</span></div>
        </div>
        <div class={styles.featureItem}>
          <div class={styles.checkIcon}></div>
          <div class={styles.label}>100GB media storage <span>for each user</span></div>
        </div>
        <div class={styles.featureItem}>
          <div class={styles.checkIcon}></div>
          <div class={styles.label}>10GB max file size <span>for each user</span></div>
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

export default PricingCardTeam;
