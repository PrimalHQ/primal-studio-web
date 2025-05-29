import { Checkbox } from '@kobalte/core/checkbox';
import { Component, createEffect, createSignal, JSXElement, Match, on, Switch } from 'solid-js';

import styles from './CheckBox.module.scss';

const CheckBox: Component<{
  id?: string,
  onChange: (checked: boolean) => void,
  checked?: boolean,
  label?: string,
  icon?: string,
  children?: JSXElement,
  disabled?: boolean,
}> = (props) => {

  const [isChecked, setIsChecked] = createSignal(false);

  createEffect(on(() => props.checked, (checked, prev) => {
    if (checked === prev) return;

    setIsChecked(checked || false);
  }))

  return (
    <Checkbox
      class={styles.checkbox}
      checked={isChecked()}
      onChange={props.onChange}
      disabled={props.disabled}
    >
      <Checkbox.Input class={styles.input} />
      <Checkbox.Control class={styles.control}>
        <Checkbox.Indicator>
          <div class={styles.checkIcon} />
        </Checkbox.Indicator>
      </Checkbox.Control>
      <Checkbox.Label class={styles.label}>
        <Switch>
          <Match when={props.children}>
            {props.children}
          </Match>
          <Match when={props.label}>
            {props.label}
          </Match>
        </Switch>
      </Checkbox.Label>
    </Checkbox>
  )

}

export default CheckBox;
