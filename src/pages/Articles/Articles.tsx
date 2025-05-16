import { Component } from 'solid-js';
import Wormhole from '../../helpers/Wormhole/Wormhole';
import { translate } from '../../translations/translate';

import styles from './Articles.module.scss';
import HeaderTitle from 'src/components/HeaderTitle/HeaderTitle';

const Articles: Component = () => {

  return (
    <>
      <Wormhole to="header">
        <HeaderTitle title={translate('articles', 'header')}/>
      </Wormhole>
      <h1>{translate('articles', 'title')}</h1>
    </>
  );
}

export default Articles;
