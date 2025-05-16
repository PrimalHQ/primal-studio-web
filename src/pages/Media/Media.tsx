import { Component } from 'solid-js';
import Wormhole from '../../helpers/Wormhole/Wormhole';
import { translate } from '../../translations/translate';

import styles from './Media.module.scss';
import HeaderTitle from 'src/components/HeaderTitle/HeaderTitle';

const Media: Component = () => {

  return (
    <>
      <Wormhole to="header">
        <HeaderTitle title={translate('media', 'header')}/>
      </Wormhole>
      <h1>{translate('media', 'title')}</h1>
    </>
  );
}

export default Media;
