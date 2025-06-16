import { Component } from 'solid-js';

import styles from './Landing.module.scss';

import logo from '../../assets/icons/logo_gold.svg';

const Landing: Component = () => {

  return (
    <div class={styles.landing}>
      <img src={logo}></img>
    </div>
  );
}

export default Landing;
