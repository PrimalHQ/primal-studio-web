import { Component, JSXElement, Show } from 'solid-js';
import { Button } from "@kobalte/core/button";

import styles from './Buttons.module.scss';

const ButtonPrimary: Component<{
  id?: string,
  onClick?: (e: MouseEvent) => void,
  children?: JSXElement,
  disabled?: boolean,
  type?: 'button' | 'submit' | 'reset' | undefined,
  loading?: boolean,
}> = (props) => {
  return (
    <Button
      id={props.id}
      class={styles.primary}
      onClick={props.onClick}
      disabled={props.disabled}
      type={props.type}
    >
      <Show
        when={props.loading}
        fallback={props.children}
      >
        <div class={styles.spinner}></div>
      </Show>
    </Button>
  )
}

export default ButtonPrimary;
