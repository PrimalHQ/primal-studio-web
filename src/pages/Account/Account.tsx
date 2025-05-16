import { Component } from 'solid-js';
import Wormhole from '../../helpers/Wormhole/Wormhole';
import { translate } from '../../translations/translate';

import styles from './Account.module.scss';
import HeaderTitle from 'src/components/HeaderTitle/HeaderTitle';

const Account: Component = () => {

  return (
    <>
      <Wormhole to="header">
        <HeaderTitle title={translate('account', 'header')}/>
      </Wormhole>

      <h1>{translate('account', 'title')}</h1>
    </>
  );
}

export default Account;
