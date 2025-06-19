import { Component, createSignal, Show } from 'solid-js';

import styles from './Landing.module.scss';
import Dialog from 'src/components/Dialogs/Dialog';

import branding from 'src/assets/images/primal_studio_dark.svg';
import { useNavigate } from '@solidjs/router';

import { isIPhone, isAndroid } from '@kobalte/utils';
import { RadioGroup } from '@kobalte/core/radio-group';

const BuyProDialog: Component<{
  id?: string,
  open: boolean,
  setOpen?: (v: boolean) => void,
}> = (props) => {
  const navigate = useNavigate();

  const [selection, setSelection] = createSignal('https://buy.stripe.com/eVqeVd7W31c25pJ9dV28801');

  return (
    <Dialog
      triggerClass="displayNone"
      open={props.open}
      setOpen={props.setOpen}
      title={<img src={branding} width={140} height={34} />}
    >
      <div class={styles.buyProDialog}>
        <div class={styles.message}>
          We will now redirect you to Stripe so you can complete your purchase via credit card:
        </div>

        <div class={styles.choices}>
          <RadioGroup
            class={styles.radioGroup}
            value={selection()}
            onChange={setSelection}
          >
            <div class={styles.radioItems} role="presentation">
              <RadioGroup.Item value={'https://buy.stripe.com/eVqeVd7W31c25pJ9dV28801'} class={styles.radio}>
                <RadioGroup.ItemInput class={styles.radioInput} />
                <RadioGroup.ItemControl class={styles.radioControl}>
                  <RadioGroup.ItemIndicator class={styles.radioIndicator} />
                </RadioGroup.ItemControl>
                <RadioGroup.ItemLabel class={styles.radioLabel}>Primal Pro Monthly Subscription - $69.99/month</RadioGroup.ItemLabel>
              </RadioGroup.Item>

              <RadioGroup.Item value={'https://buy.stripe.com/eVqeVd3FNbQG05pcq728803'} class={styles.radio}>
                <RadioGroup.ItemInput class={styles.radioInput} />
                <RadioGroup.ItemControl class={styles.radioControl}>
                  <RadioGroup.ItemIndicator class={styles.radioIndicator} />
                </RadioGroup.ItemControl>
                <RadioGroup.ItemLabel class={styles.radioLabel}>Primal Pro Yearly Subscription - $750/year <span>(save one month)</span></RadioGroup.ItemLabel>
              </RadioGroup.Item>
            </div>
          </RadioGroup>
        </div>

        <div class={styles.actions}>
          <div class={styles.newToNostr}>
            Want to pay with bitcoin? <a href="https://primal.net/join" target="_blank">Login to primal.net</a>.
          </div>
          <button onClick={() => window.open(selection(), '_blank')}>Buy Now via Stripe</button>
        </div>
      </div>
    </Dialog>
  );
}

export default BuyProDialog;
