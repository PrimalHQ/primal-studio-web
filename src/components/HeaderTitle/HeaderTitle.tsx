import { Component } from 'solid-js';

import styles from './HeaderTitle.module.scss';

const HeaderTitle: Component<{ title: string }> = (props) => {


  return (
    <div class={styles.headerTitle}>
      {props.title}
    </div>
  );
}

export default HeaderTitle;
