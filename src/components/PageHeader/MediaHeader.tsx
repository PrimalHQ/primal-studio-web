
import { Component, JSXElement, Show } from 'solid-js';

import styles from './PageHeader.module.scss';
import { GraphSpan } from 'src/pages/Home/Home.data';
import HeaderTitle from 'src/components/HeaderTitle/HeaderTitle';
import DatePicker from '@rnwonder/solid-date-picker';
import utils from "@rnwonder/solid-date-picker/utilities";
import dayjs from 'dayjs';

const MediaPageHeader: Component<{
  id?: string,
  title: string,
  children?: JSXElement,
}> = (props) => {

  return (
    <HeaderTitle title={props.title}>
      {props.children}
    </HeaderTitle>
  )

}

export default MediaPageHeader;
