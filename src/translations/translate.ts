import { LANG } from "../App";
import translations, { NestedRecord } from './index';

// export const translate = (scope: string, message: string, opts?: any) => {
//   const scopes = scope.split('.');

//   let lang = translations[LANG];
//   let trans;

//   for (let i=0;i<scopes.length;i++) {
//     const s = scopes[i];
//     trans = trans ? trans[s] : lang[s];
//   }

//   const t = (trans || {[message]: ''})[message]

//   if (typeof t === 'string') return t;

//   if (typeof t === 'function') return t(opts);

//   return '';

//   // trans = (translations[LANG] || {})[scope] || { [message]: ''};

// }

interface Options {
  [key: string]: any;
}

export const translate = (...args: (string | Options)[]): string => {
  let options: Options | undefined;
  const path: string[] = [];

  let lang = translations[LANG];
  let trans: string | Function | NestedRecord | undefined;

  for (const arg of args) {
    if (typeof arg === 'string') {
      path.push(arg);

      if (typeof trans === 'undefined') {
        trans = lang[arg];
        continue;
      }

      if (typeof trans === 'string' || typeof trans === 'function') break;

      trans = trans ? trans[arg] : lang[arg];
    }
    else if (typeof arg === 'object' && arg !== null) {
      options = arg as Options;
    }
  }

  if (typeof trans === 'string') return trans;

  if (typeof trans === 'function') return trans(options);

  return '';
}
