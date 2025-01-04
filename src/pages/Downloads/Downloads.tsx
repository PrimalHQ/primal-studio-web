import { Component } from 'solid-js';
import Wormhole from '../../helpers/Wormhole/Wormhole';
import { translate } from '../../translations/translate';

import styles from './Explore.module.scss';

const Downloads: Component = () => {

  return (
    <>
    <Wormhole to="header">Downloads header</Wormhole>
    <Wormhole to="sidebar">Downloads Sidebar</Wormhole>
    <h1>{translate('downloads', 'title')}</h1>

    <Wormhole to="footer">Downloads Footer</Wormhole>
    </>
  );
}

export default Downloads;
