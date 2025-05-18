import { Checkbox } from '@kobalte/core/checkbox';
import { Component, JSXElement, Match, Switch } from 'solid-js';

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

  return (
    <Checkbox
      class={styles.checkbox}
      checked={props.checked}
      onChange={(v) => props.onChange}
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
