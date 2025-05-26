
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
    return `${parseFloat((number/1000).toFixed(1))} k`;
  }

  if (number < 1000000) {
    return `${Math.floor(number/1000)} k`;
  }

  if (number < 100000000) {
    return `${parseFloat((number/1000000).toFixed(1))} m`;
  }

  return `${Math.floor(number/1000000)} m`;
};
