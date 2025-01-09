import { Component } from 'solid-js';
import Wormhole from '../../helpers/Wormhole/Wormhole';
import { translate } from '../../translations/translate';

import styles from './Explore.module.scss';
import { useParams } from '@solidjs/router';
import { userName } from '../../utils/profile';

const Profile: Component = () => {
  const params = useParams();

  return (
    <>
    <Wormhole to="header">Profile header</Wormhole>
    <Wormhole to="sidebar">Profile Sidebar</Wormhole>
    <h1>{translate('profile', 'title')}</h1>

    <div>{userName(params.id)}</div>

    <Wormhole to="footer">Profile Footer</Wormhole>
    </>
  );
}

export default Profile;
