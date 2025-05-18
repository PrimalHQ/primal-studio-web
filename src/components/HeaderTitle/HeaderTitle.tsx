import { Component, Show } from 'solid-js';

import styles from './HeaderTitle.module.scss';
import { A } from '@solidjs/router';

const HeaderTitle: Component<{ title: string, subTitle?: string }> = (props) => {


  return (
    <div class={styles.headerTitle}>
      <Show
        when={props.subTitle}
        fallback={<>{props.title}</>}
      >
        <A class={styles.linkBack} href="/settings">{props.title}</A>
        : {props.subTitle}
      </Show>
    </div>
  );
}

export default HeaderTitle;
