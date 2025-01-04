import { Component } from 'solid-js';
import { translate } from '../translations/translate';

const NotFound: Component = () => {

  return (
    <h1>{translate('notFound', 'title')}</h1>
  );
}

export default NotFound;
