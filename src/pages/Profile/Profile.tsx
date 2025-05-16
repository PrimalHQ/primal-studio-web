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
      <Wormhole to="header">{translate('profile', 'header')}</Wormhole>
      <h1>{translate('profile', 'title')}</h1>

      <div>{userName(params.id)}</div>
    </>
  );
}

export default Profile;
