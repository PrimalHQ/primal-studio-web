import styles from  "./VerificationCheck.module.scss";

import { Component, createSignal, JSXElement, Match, onMount, Show, Switch } from "solid-js";
import { LegendCustomizationConfig, PrimalUser } from "src/primal";
import { membershipStore } from "src/stores/PremiumStore";
import { logError } from "src/utils/logger";
import { nip05, nip19 } from "src/utils/nTools";



const UserCard: Component<{
  id?: string,
  user: PrimalUser | undefined,
}> = (props) => {

  return (
    <div class={styles.userCard}>

    </div>
  )
}

export default UserCard;
