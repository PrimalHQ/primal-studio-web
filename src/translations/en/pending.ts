export default {
  title: 'Pending Queue Page',
  header: (opts: { num: number }) => `Publish Pending (${opts.num})`,
  empty: 'No events pending',
  label: 'These actions failed to publish:',
  retring: 'Retrying...',
  retry: (opts: { seconds: number }) => `Retrying in ${opts.seconds} seconds...`,
  abortSelected: 'Abort Selected',
  retrySelected: 'Retry Selected',
}
