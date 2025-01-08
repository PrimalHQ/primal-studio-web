import { Component } from 'solid-js';
import Wormhole from '../../helpers/Wormhole/Wormhole';
import { translate } from '../../translations/translate';

import styles from './Explore.module.scss';
import { useParams } from '@solidjs/router';

const Thread: Component = () => {
  const params = useParams();

  return (
    <>
    <Wormhole to="header">Thread header</Wormhole>
    <Wormhole to="sidebar">Thread Sidebar</Wormhole>
    <h1>{translate('thread', 'title')}</h1>

    <div>{params.note_id}</div>

    <Wormhole to="footer">Thread Footer</Wormhole>
    </>
  );
}

export default Thread;
