export const shortDate = (timestamp: number | undefined) => {
  if (!timestamp || timestamp < 0) {
    return '';
  }
  const date = new Date(timestamp * 1000);
  const dtf = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium'});

  return dtf.format(date);
};

export const longDate = (timestamp: number | undefined) => {
  if (!timestamp || timestamp < 0) {
    return '';
  }
  const date = new Date(timestamp * 1000);
  const dtf = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short'});

  return dtf.format(date);
};

export const veryLongDate = (timestamp: number | undefined, noTime = false) => {
  if (!timestamp || timestamp < 0) {
    return '';
  }
  const date = new Date(timestamp * 1000);
  const dtf = noTime ?
    new Intl.DateTimeFormat('en-US', { dateStyle: 'long' }) :
    new Intl.DateTimeFormat('en-US', { dateStyle: 'full', timeStyle: 'short'});

  return dtf.format(date);
};
