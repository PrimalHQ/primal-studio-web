export const isDev = () => localStorage.getItem('devMode') === 'true';

export const logInfo = (...rest: any[]) => {
  if (!isDev()) return;

  console.log(...rest);
};

export const logWarning = (...rest: any[]) => {
  if (!isDev()) return;

  console.warn(...rest);
};

export const logError = (...rest: any[]) => {
  if (!isDev()) return;

  console.error(...rest);
};
