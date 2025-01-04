import { Component } from 'solid-js';
import Wormhole from '../../helpers/Wormhole/Wormhole';
import { translate } from '../../translations/translate';

import styles from './Explore.module.scss';

const Reads: Component = () => {

  return (
    <>
    <Wormhole to="header">Reads header</Wormhole>
    <Wormhole to="sidebar">Reads Sidebar</Wormhole>
    <h1>{translate('reads', 'title')}</h1>

    <Wormhole to="footer">Reads Footer</Wormhole>
    </>
  );
}

export default Reads;
