import { LANG } from "../App";
import translations from './index';

export const translate = (scope: string, message: string) => {
  const trans = (translations[LANG] || {})[scope] || { [message]: ''};

  return trans[message];
}
