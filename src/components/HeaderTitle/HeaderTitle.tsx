import { Component, JSXElement, Show } from 'solid-js';

import styles from './HeaderTitle.module.scss';
import { A } from '@solidjs/router';

const HeaderTitle: Component<{
  title: string,
  subTitle?: string,
  children?: JSXElement,
 }> = (props) => {


  return (
    <div class={styles.headerTitle}>
      <Show
        when={props.subTitle}
        fallback={<div>{props.title}</div>}
      >
        <div>
          <A class={styles.linkBack} href="/settings">{props.title}</A>
          : {props.subTitle}
        </div>
      </Show>
      {props.children}
    </div>
  );
}

export default HeaderTitle;
