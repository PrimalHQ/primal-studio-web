import { Component } from 'solid-js';
import Wormhole from '../../helpers/Wormhole/Wormhole';
import { translate } from '../../translations/translate';

import styles from './Explore.module.scss';

const Premium: Component = () => {

  return (
    <>
    <Wormhole to="header">Premium header</Wormhole>
    <Wormhole to="sidebar">Premium Sidebar</Wormhole>
    <h1>{translate('premium', 'title')}</h1>

    <Wormhole to="footer">Premium Footer</Wormhole>
    </>
  );
}

export default Premium;
