import { Component } from 'solid-js';
import Wormhole from '../../helpers/Wormhole/Wormhole';
import { translate } from '../../translations/translate';

import styles from './Explore.module.scss';

const Bookmarks: Component = () => {

  return (
    <>
    <Wormhole to="header">Bookmarks header</Wormhole>
    <Wormhole to="sidebar">Bookmarks Sidebar</Wormhole>
    <h1>{translate('bookmarks', 'title')}</h1>

    <Wormhole to="footer">Bookmarks Footer</Wormhole>
    </>
  );
}

export default Bookmarks;
