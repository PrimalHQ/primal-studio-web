import { Component, JSXElement } from 'solid-js';
import { Button } from "@kobalte/core/button";

import styles from './Buttons.module.scss';

const ButtonLink: Component<{
  id?: string,
  onClick?: (e: MouseEvent) => void,
  children?: JSXElement,
  disabled?: boolean,
  title?: string,
}> = (props) => {

  return (
    <Button
      id={props.id}
      class={styles.link}
      onClick={props.onClick}
      disabled={props.disabled}
      title={props.title}
    >
      {props.children}
    </Button>
  )
}

export default ButtonLink;
