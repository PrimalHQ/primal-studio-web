import { Component, JSXElement } from 'solid-js';
import { Button } from "@kobalte/core";

import styles from './Buttons.module.scss';

const ButtonPremium: Component<{
  id?: string,
  onClick?: (e: MouseEvent) => void,
  children?: JSXElement,
  disabled?: boolean,
  type?: 'button' | 'submit' | 'reset' | undefined,
}> = (props) => {
  return (
    <Button.Root
      id={props.id}
      class={styles.premium}
      onClick={props.onClick}
      disabled={props.disabled}
      type={props.type}
    >
      {props.children}
    </Button.Root>
  )
}

export default ButtonPremium;
