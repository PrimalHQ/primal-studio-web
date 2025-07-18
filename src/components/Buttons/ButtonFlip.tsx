import { Component, JSXElement, Show } from 'solid-js';
import { Button } from "@kobalte/core/button";

import styles from './Buttons.module.scss';

const ButtonFlip: Component<{
  id?: string,
  onClick?: (e: MouseEvent) => void,
  when?: boolean,
  children?: JSXElement,
  fallback?: JSXElement,
  disabled?: boolean,
  light?: boolean,
  type?: 'button' | 'submit' | 'reset' | undefined,
  dark?: boolean,
}> = (props) => {
  const klass = () => {
    let k = props.when ? styles.flipActive : styles.flipInactive;

    if (props.light) {
      k += ` ${styles.light}`;
    }
    k += props.dark ? ` ${styles.dark}` : '';

    return k;
  }

  const fallback = () => props.fallback || props.children

  return (
    <Button
      id={props.id}
      class={klass()}
      onClick={props.onClick}
      disabled={props.disabled}
      type={props.type}
    >
      <span>
        <Show
          when={props.when}
          fallback={fallback()}
        >
          {props.children}
        </Show>
      </span>
    </Button>
  )
}

export default ButtonFlip;
