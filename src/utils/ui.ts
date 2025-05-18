
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
