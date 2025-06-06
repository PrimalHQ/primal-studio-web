import { PrimalUser } from "src/primal";

export const runColorMode = (
  callback: (isDarkMode: boolean) => void,
  fallback: () => void,
) => {
  if (!window.matchMedia) {
    fallback();
    return;
  }

  const query = window.matchMedia('(prefers-color-scheme: dark)');

  callback(query.matches);

  query.addEventListener('change', (event) => callback(event.matches));
}


export const humanizeNumber = (number: number, veryShort = false) => {

  const bottomLimit = veryShort ? 1000 : 10000;

  if (number < bottomLimit) {
    return number.toLocaleString();
  }

  if (number < 100000) {
    return `${parseFloat((number/1000).toFixed(1))}k`;
  }

  if (number < 1000000) {
    return `${Math.floor(number/1000)}k`;
  }

  if (number < 100000000) {
    return `${parseFloat((number/1000000).toFixed(1))}m`;
  }

  return `${Math.floor(number/1000000)}m`;
};

export const truncateNumber = (amount: number, from?: 1 | 2 | 3 | 4) => {
  const t = 1_000;
  const s = from || 1;

  const l = Math.pow(t, s);

  if (amount < l) {
    return amount.toLocaleString();
  }

  if (amount < Math.pow(t, 2)) {
    return `${Math.floor(amount / t).toLocaleString()}K`;
  }

  if (amount < Math.pow(t, 3)) {
    return `${Math.floor(amount / Math.pow(t, 2)).toLocaleString()}M`
  }

  if (amount < Math.pow(t, 4)) {
    return `${Math.floor(amount / Math.pow(t, 3)).toLocaleString()}B`
  }

  return `1T+`;
};

export const nip05Verification = (user: PrimalUser | undefined) => {
  if (!user || typeof user.nip05 !== 'string') {
    return '';
  }

  if (user.nip05?.startsWith('_@')) {
    return user.nip05.slice(2);
  }

  return user.nip05;
};

export const debounce = (callback: TimerHandler, time: number) => {
  let debounceTimer: number = 0;

  return () => {
    if (debounceTimer) {
      window.clearTimeout(debounceTimer);
    }

    debounceTimer = window.setTimeout(callback, time);
  }
}

export const previousWord = (input: HTMLInputElement) => {
  const carret = input.selectionStart || 0;
  if (carret === 0) return '';

  const words = input.value.slice(0, carret).split(' ');

  return words.length > 0 ? words[words.length - 1] : '';
}

export const getLang = () => {
  if (navigator.languages !== undefined)
    return navigator.languages[0];
  return navigator.language;
}

export const sha256 = async (file: File) => {
  const obj = await file.arrayBuffer();
  return crypto.subtle.digest('SHA-256', obj).then((hashBuffer) => {
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map((bytes) => bytes.toString(16).padStart(2, '0'))
      .join('');
    return hashHex;
  });
}

export const isVisibleInContainer = (element: Element, container: Element) => {
  const { bottom, height, top } = element.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();

  return top <= containerRect.top ? containerRect.top - top <= height : bottom - containerRect.bottom <= height;
};

export const getScreenCordinates = (obj: any) =>  {
  let p: { x?: number, y?: number } = {};

  p.x = obj.offsetLeft;
  p.y = obj.offsetTop;

  while (obj.offsetParent) {
    p.x = p.x + obj.offsetParent.offsetLeft;
    p.y = p.y + obj.offsetParent.offsetTop;
    if (obj == document.getElementsByTagName("body")[0]) {
      break;
    }
    else {
      obj = obj.offsetParent;
    }
  }
  return p;
}

export const insertIntoTextArea = (
  textarea: HTMLTextAreaElement,
  insertText: string,
  position: number,
) => {
  const value = textarea.value;
  const before = value.substring(0, position);
  const after = value.substring(position);
  textarea.value = before + insertText + after;
  textarea.selectionStart = textarea.selectionEnd = position + 1;
}
