import { LANG } from "../App";
import translations, { NestedRecord } from './index';

export const translate = (scope: string, message: string) => {
  const scopes = scope.split('.');

  let lang = translations[LANG];
  let trans;

  for (let i=0;i<scopes.length;i++) {
    const s = scopes[i];
    trans = trans ? trans[s] : lang[s];
  }

  const t = (trans || {[message]: ''})[message]

  if (typeof t === 'string') return t;

  return '';

  // trans = (translations[LANG] || {})[scope] || { [message]: ''};

}
